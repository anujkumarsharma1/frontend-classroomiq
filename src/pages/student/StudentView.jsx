import React, { useState, useEffect, useRef, useCallback } from 'react'
import { useAuth } from '../../context/AuthContext'
import api, { getSocketUrl } from '../../utils/api'
import toast from 'react-hot-toast'
import { io } from 'socket.io-client'
import { LogIn, LogOut, Bell, Wifi, WifiOff, AlertTriangle, Maximize2, X, MessageSquare, PauseCircle } from 'lucide-react'

const ac = (p) => p >= 70 ? '#10b981' : p >= 40 ? '#f59e0b' : '#ef4444'
const acLabel = (p) => p >= 70 ? 'Good' : p >= 40 ? 'Fair' : 'Low'

// ─── Focus tips ───────────────────────────────────────────────────────────────
const ALL_TIPS = [
  'Try a light stretch!', 'Keep your head centered.', 'Deep breath to reset.',
  'Sit up straight!', 'Blink slowly to refresh.', 'Focus on the speaker.',
  'Take a sip of water.', 'Relax your shoulders.', 'Eyes forward!', 'Stay engaged!',
]

// ─── Attention streak counter ─────────────────────────────────────────────────
function useStreak(attention) {
  const [streak, setStreak] = useState(0)
  const [mins, setMins] = useState(0)
  const timerRef = useRef(null)
  useEffect(() => {
    if (attention >= 60) {
      if (!timerRef.current) timerRef.current = setInterval(() => setMins(m => m + 1), 60000)
    } else {
      clearInterval(timerRef.current); timerRef.current = null
    }
    return () => clearInterval(timerRef.current)
  }, [attention >= 60])
  return mins
}

// ─── Mini heatmap for bottom-right ───────────────────────────────────────────
function AttentionHeatmap() {
  const [cells, setCells] = useState(() => Array.from({length: 35}, () => Math.random()))
  useEffect(() => { const t = setInterval(() => setCells(c => c.map(v => Math.max(0,Math.min(1,v+(Math.random()-0.5)*0.15)))), 900); return () => clearInterval(t) }, [])
  const gc = (v) => v > 0.7 ? `rgba(16,185,129,${0.5+v*0.5})` : v > 0.45 ? `rgba(245,158,11,${0.5+v*0.4})` : `rgba(239,68,68,${0.5+v*0.4})`
  return <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 2 }}>{cells.map((v,i) => <div key={i} style={{ height: 10, borderRadius: 2, background: gc(v), transition: 'background 0.9s' }} />)}</div>
}

// ─── Critical alert list ──────────────────────────────────────────────────────
function AlertList() {
  const [items] = useState([
    'Student ID 001 - Head Pose Divergence',
    'Student ID 001 - Head Pose Divergence',
    'Student ID 001 - Head Piece Divergence',
    'Student ID 001 - Head Pose Divergence',
    'Student ID 001 - Head Pose Divergence',
  ])
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      {items.map((a, i) => (
        <div key={i} style={{ background: i === 0 ? 'rgba(99,102,241,0.2)' : 'rgba(255,255,255,0.03)', border: `1px solid ${i === 0 ? 'rgba(99,102,241,0.4)' : 'rgba(255,255,255,0.05)'}`, borderRadius: 7, padding: '7px 10px', fontSize: 11, color: i === 0 ? '#a5b4fc' : '#64748b' }}>{a}</div>
      ))}
    </div>
  )
}

export default function StudentView() {
  const { user, logout } = useAuth()
  const [step, setStep] = useState('join')
  const [sessionCode, setSessionCode] = useState('')
  const [sessionInfo, setSessionInfo] = useState(null)
  const [connected, setConnected] = useState(false)
  const [nudge, setNudge] = useState(null)
  const [aggregatedData, setAggregatedData] = useState({})
  const [maximized, setMaximized] = useState(null)
  const [chatMsg, setChatMsg] = useState('')
  const [chatHistory, setChatHistory] = useState([])
  const [sessionDuration, setSessionDuration] = useState(0)
  const [tips, setTips] = useState(ALL_TIPS.slice(0, 3))
  const [notebookName, setNotebookName] = useState('')
  const [notebookText, setNotebookText] = useState('')
  const socketRef = useRef(null)
  const emitRef = useRef(null)
  const detectorRef = useRef({})
  const aggRef = useRef({})
  const iframesRef = useRef({}) // refs to each iframe DOM element

  // Send ciq-start-camera to all iframes when session becomes active
  useEffect(() => {
    if (step !== 'session') return
    const sendStart = () => {
      Object.values(iframesRef.current).forEach(iframe => {
        try { iframe?.contentWindow?.postMessage({ type: 'ciq-start-camera' }, '*') } catch {}
      })
    }
    // Send repeatedly for 15 seconds to catch slow CDN loads (MediaPipe etc)
    sendStart()
    const times = [500, 1500, 3000, 5000, 8000, 12000, 15000]
    const timers = times.map(t => setTimeout(sendStart, t))
    return () => timers.forEach(clearTimeout)
  }, [step])

  useEffect(() => { aggRef.current = aggregatedData }, [aggregatedData])

  const attention = aggregatedData.attention ?? null
  const attnStreak = useStreak(attention ?? 0)
  const focusScore = attention !== null ? Math.min(100, Math.round(attention * 1.1)) : 0

  // Session timer
  useEffect(() => {
    if (step === 'session') {
      const t = setInterval(() => setSessionDuration(d => d + 1), 60000)
      return () => clearInterval(t)
    }
  }, [step])

  // Rotate tips
  useEffect(() => {
    const t = setInterval(() => {
      const shuffled = [...ALL_TIPS].sort(() => Math.random() - 0.5)
      setTips(shuffled.slice(0, 3))
    }, 8000)
    return () => clearInterval(t)
  }, [])

  // PostMessage from iframes
  useEffect(() => {
    const handle = (event) => {
      const msg = event.data
      if (!msg || msg.type !== 'ciq-detection') return
      const { detectorKey, faceVisible, attention, expression } = msg
      detectorRef.current[detectorKey] = { faceVisible, attention, expression }
      const all = Object.values(detectorRef.current)
      const visible = all.filter(d => d.faceVisible)
      const avg = visible.length > 0 ? Math.round(visible.reduce((s, d) => s + (d.attention || 0), 0) / visible.length) : 0
      const anyFace = visible.length > 0
      const expr = expression || detectorRef.current['microexpr']?.expression || detectorRef.current['dashboard6']?.expression || '—'
      setAggregatedData(prev => {
        if (prev.faceVisible && !anyFace) socketRef.current?.emit('student:face-lost', { sessionCode })
        else if (!prev.faceVisible && anyFace) socketRef.current?.emit('student:face-found', { sessionCode })
        return { ...prev, attention: avg, faceVisible: anyFace, expression: expr }
      })
    }
    window.addEventListener('message', handle)
    return () => window.removeEventListener('message', handle)
  }, [sessionCode])

  const connectSocket = useCallback((code) => {
    const token = localStorage.getItem('token')
    const socket = io(getSocketUrl(), { auth: { token }, transports: ['websocket', 'polling'] })
    socketRef.current = socket
    socket.on('connect', () => { setConnected(true); socket.emit('student:join-session', { sessionCode: code }) })
    socket.on('disconnect', () => setConnected(false))
    socket.on('teacher:nudge', ({ message }) => {
      setNudge(message)
      toast(message, { icon: '🔔', duration: 8000 })
      setChatHistory(h => [...h, { from: 'teacher', text: message, time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }])
      setTimeout(() => setNudge(null), 8000)
    })
    socket.on('session:ended', () => {
      toast('Session ended by teacher.', { icon: '🏁' })
      socket.disconnect(); setStep('join'); setSessionInfo(null); setAggregatedData({})
      clearInterval(emitRef.current)
    })
    emitRef.current = setInterval(() => {
      if (socket.connected) socket.emit('student:data', { sessionCode: code, data: aggRef.current })
    }, 2000)
  }, [])

  useEffect(() => () => { socketRef.current?.disconnect(); clearInterval(emitRef.current) }, [])

  const validateAndJoin = async (e) => {
    e.preventDefault()
    try { const { data } = await api.get(`/sessions/validate/${sessionCode.trim().toUpperCase()}`); setSessionInfo(data.session); setStep('camera') }
    catch (err) { toast.error(err.response?.data?.error || 'Invalid session code') }
  }

  const startSession = () => { setStep('session'); connectSocket(sessionCode.trim().toUpperCase()) }

  const leaveSession = () => {
    socketRef.current?.disconnect(); clearInterval(emitRef.current)
    setStep('join'); setSessionInfo(null); setAggregatedData({})
    logout()
  }

  const sendChat = () => {
    if (!chatMsg.trim()) return
    setChatHistory(h => [...h, { from: 'me', text: chatMsg, time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }])
    socketRef.current?.emit('student:chat', { sessionCode, message: chatMsg })
    setChatMsg('')
  }

  const panels = [
    { key: 'drowsiness', src: '/dashboard2.html',         title: 'Drowsiness & Blink',            icon: '😴' },
    { key: 'headpose',   src: '/dashboard3.html',         title: 'Head Pose Tracking',             icon: '🧠' },
    { key: 'pupil',      src: '/dashboard4.html',         title: 'Pupil & Iris Detection',         icon: '👁' },
    { key: 'microexpr',  src: '/dashboard5.html',         title: 'Micro-Expression Detector',      icon: '😶' },
    { key: 'struggle',   src: '/dashboard_struggle.html', title: 'Productive Struggle Classifier', icon: '🔬' },
  ]

  // ── JOIN ──────────────────────────────────────────────────────────────────
  if (step === 'join') return (
    <div style={{ minHeight: '100vh', background: '#070c14', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, fontFamily: "'DM Sans','Segoe UI',sans-serif" }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800;900&display=swap'); input::placeholder{color:#334155}`}</style>
      <div style={{ maxWidth: 400, width: '100%' }}>
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <img src="/logo.jpg" style={{ width: 48, height: 48, borderRadius: 12, objectFit: 'cover', marginBottom: 12 }} />
          <h1 style={{ fontSize: 24, fontWeight: 900, color: '#fff', marginBottom: 4 }}>ClassroomIQ</h1>
          <p style={{ color: '#64748b', fontSize: 14 }}>Welcome, {user?.fullName}</p>
          <p style={{ color: '#334155', fontSize: 11, fontFamily: 'monospace', marginTop: 3 }}>{user?.userId}</p>
        </div>
        <div style={{ background: '#0d1117', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 16, padding: 28 }}>
          <h2 style={{ fontWeight: 700, color: '#fff', marginBottom: 20, fontSize: 17 }}>Join a Session</h2>
          <form onSubmit={validateAndJoin}>
            <div style={{ marginBottom: 18 }}>
              <label style={{ display: 'block', fontSize: 12, color: '#64748b', marginBottom: 8 }}>Session Code</label>
              <input value={sessionCode} onChange={e => setSessionCode(e.target.value.toUpperCase())} placeholder="XXXXXX" maxLength={6}
                style={{ width: '100%', background: '#070c14', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, padding: '14px', color: '#6366f1', fontSize: 28, fontFamily: 'monospace', letterSpacing: 10, fontWeight: 800, textAlign: 'center', outline: 'none', boxSizing: 'border-box' }} required />
            </div>
            <button type="submit" style={{ width: '100%', padding: 13, borderRadius: 10, border: 'none', background: '#6366f1', color: '#fff', fontWeight: 700, fontSize: 15, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, boxShadow: '0 4px 16px rgba(99,102,241,0.3)', fontFamily: 'inherit' }}>
              <LogIn size={18} /> Validate Code
            </button>
          </form>
        </div>
        <div style={{ textAlign: 'center', marginTop: 14 }}>
          <button onClick={logout} style={{ background: 'none', border: 'none', color: '#334155', cursor: 'pointer', fontSize: 13, display: 'inline-flex', alignItems: 'center', gap: 5, fontFamily: 'inherit' }}><LogOut size={13} /> Sign Out</button>
        </div>
      </div>
    </div>
  )

  // ── CAMERA CONSENT ────────────────────────────────────────────────────────
  if (step === 'camera') return (
    <div style={{ minHeight: '100vh', background: '#070c14', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, fontFamily: "'DM Sans','Segoe UI',sans-serif" }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800;900&display=swap')`}</style>
      <div style={{ maxWidth: 460, width: '100%' }}>
        <div style={{ background: '#0d1117', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 16, padding: 28 }}>
          <div style={{ textAlign: 'center', marginBottom: 20 }}>
            <img src="/logo.jpg" style={{ width: 40, height: 40, borderRadius: 10, objectFit: 'cover', marginBottom: 10 }} />
            <h2 style={{ fontWeight: 800, color: '#fff', marginBottom: 4 }}>Session Found!</h2>
            <p style={{ color: '#64748b', fontSize: 13 }}>{sessionInfo?.className} · {sessionInfo?.subject} · {sessionInfo?.teacherName}</p>
          </div>
          <div style={{ background: '#070c14', borderRadius: 12, padding: 18, marginBottom: 18, textAlign: 'center' }}>
            <div style={{ fontSize: 36, marginBottom: 10 }}>📷</div>
            <p style={{ fontWeight: 600, color: '#e2e8f0', marginBottom: 6 }}>Camera Access Required</p>
            <p style={{ color: '#64748b', fontSize: 12, lineHeight: 1.7 }}>AI models run locally in your browser. <strong style={{ color: '#e2e8f0' }}>No video is ever recorded or sent to any server.</strong></p>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 20 }}>
            {['✅ Video never leaves your device','✅ Only attention metrics shared with teacher','✅ AI runs entirely in your browser'].map(t => <div key={t} style={{ fontSize: 12, color: '#64748b' }}>{t}</div>)}
          </div>
          <button onClick={startSession} style={{ width: '100%', padding: 13, borderRadius: 10, border: 'none', background: '#6366f1', color: '#fff', fontWeight: 700, fontSize: 15, cursor: 'pointer', marginBottom: 10, fontFamily: 'inherit' }}>
            Allow Camera & Join Session
          </button>
          <button onClick={() => setStep('join')} style={{ width: '100%', padding: 11, borderRadius: 10, border: '1px solid rgba(255,255,255,0.07)', background: 'transparent', color: '#64748b', cursor: 'pointer', fontSize: 14, fontFamily: 'inherit' }}>← Back</button>
        </div>
      </div>
    </div>
  )

  // ── ACTIVE SESSION ─────────────────────────────────────────────────────────
  const today = new Date().toLocaleDateString('en-GB').replace(/\//g, '/').split('/').map((p,i)=>i===2?p:p.padStart(2,'0')).join('/')

  return (
    <div style={{ minHeight: '100vh', background: '#070c14', fontFamily: "'DM Sans','Segoe UI',sans-serif", color: '#e2e8f0', display: 'flex', flexDirection: 'column' }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600;700;800;900&display=swap');
        @keyframes glow{0%{background-position:0% 50%}50%{background-position:100% 50%}100%{background-position:0% 50%}}
        @keyframes pulse{0%,100%{opacity:1}50%{opacity:0.4}}
        @keyframes fadeIn{from{opacity:0;transform:translateY(-5px)}to{opacity:1;transform:none}}
        ::-webkit-scrollbar{width:4px}::-webkit-scrollbar-track{background:#0d1117}::-webkit-scrollbar-thumb{background:#1e2a3a;border-radius:2px}
        input::placeholder,textarea::placeholder{color:#334155}
      `}</style>

      {/* TOP BAR — matching screenshot 4 */}
      <div style={{ background: '#0a0e1a', borderBottom: '1px solid rgba(255,255,255,0.05)', padding: '10px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <img src="/logo.jpg" style={{ width: 28, height: 28, borderRadius: 7, objectFit: 'cover' }} />
            <span style={{ fontWeight: 800, fontSize: 15, color: '#e2e8f0' }}>ClassroomIQ</span>
          </div>
          <span style={{ fontFamily: 'monospace', fontWeight: 800, fontSize: 15, color: '#6366f1', background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.25)', padding: '3px 10px', borderRadius: 6, letterSpacing: 2 }}>{sessionCode.toUpperCase()}</span>
          <span style={{ fontSize: 12, color: '#64748b' }}>{sessionInfo?.className?.toUpperCase()} · {sessionInfo?.subject?.toUpperCase()}</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: connected ? '#10b981' : '#ef4444' }}>
            {connected ? <Wifi size={13} /> : <WifiOff size={13} />}
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 20, flexWrap: 'wrap' }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 10, color: '#475569' }}>Goal Plans</div>
            <div style={{ fontSize: 12, fontWeight: 600, color: '#e2e8f0' }}>{today}</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 10, color: '#475569' }}>Class Focus</div>
            <div style={{ fontSize: 12, fontWeight: 600, color: '#e2e8f0' }}>{today}</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 10, color: '#475569' }}>Class Avg Attention</div>
            <div style={{ fontSize: 12, fontWeight: 700, color: attention !== null ? ac(attention) : '#10b981' }}>{attention !== null ? acLabel(attention) : 'Good'}</div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 26, height: 26, borderRadius: '50%', background: 'linear-gradient(135deg,#6366f1,#4a90d9)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 11 }}>{user?.fullName?.[0]||'S'}</div>
            <span style={{ fontSize: 12, color: '#94a3b8' }}>{user?.fullName}</span>
          </div>
          <button onClick={leaveSession} style={{ padding: '7px 16px', borderRadius: 8, border: 'none', background: '#ef4444', color: '#fff', fontWeight: 700, fontSize: 13, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, fontFamily: 'inherit' }}>
            <LogOut size={13} /> Leave
          </button>
        </div>
      </div>

      {/* Nudge banner */}
      {nudge && (
        <div style={{ background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.3)', margin: '10px 20px 0', borderRadius: 10, padding: '10px 16px', display: 'flex', alignItems: 'center', gap: 10, animation: 'fadeIn 0.3s ease' }}>
          <Bell size={16} color="#f59e0b" />
          <span style={{ color: '#f59e0b', fontWeight: 500, fontSize: 13 }}>{nudge}</span>
        </div>
      )}

      {/* MAIN LAYOUT */}
      <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '220px 1fr 220px', gap: 12, padding: '14px 16px', minHeight: 0 }}>

        {/* LEFT PANEL — Personal Companion */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>

          {/* Personal Digital Companion header */}
          <div style={{ background: '#0d1117', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 12, padding: '12px 14px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
              <div style={{ width: 28, height: 28, borderRadius: 7, overflow: 'hidden', border: '1px solid rgba(255,255,255,0.1)' }}>
                <img src="/logo.jpg" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              </div>
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#e2e8f0' }}>Personal digital Companion</div>
                <div style={{ fontSize: 9, color: '#64748b' }}>Instructor</div>
              </div>
            </div>
          </div>

          {/* Focus Score + Streak */}
          <div style={{ background: '#0d1117', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 12, padding: '14px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 12 }}>
              <div>
                <div style={{ fontSize: 10, color: '#64748b', marginBottom: 2 }}>Focus Score</div>
                <div style={{ fontSize: 26, fontWeight: 900, color: ac(focusScore), lineHeight: 1 }}>{focusScore}<span style={{ fontSize: 11, color: '#64748b', fontWeight: 500 }}>/100</span></div>
              </div>
              <div>
                <div style={{ fontSize: 10, color: '#64748b', marginBottom: 2 }}>Attention Streak</div>
                <div style={{ fontSize: 26, fontWeight: 900, color: '#e2e8f0', lineHeight: 1 }}>{Math.max(attnStreak, 12)}<span style={{ fontSize: 11, color: '#64748b', fontWeight: 500 }}> min</span></div>
              </div>
            </div>
            {/* Progress bar */}
            <div style={{ height: 5, background: 'rgba(255,255,255,0.05)', borderRadius: 3, overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${focusScore}%`, background: `linear-gradient(90deg,#6366f1,${ac(focusScore)})`, borderRadius: 3, transition: 'width 0.8s ease' }} />
            </div>
          </div>

          {/* Personal Focus Tips */}
          <div style={{ background: '#0d1117', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 12, padding: '14px', flex: 1 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: '#e2e8f0', marginBottom: 10, display: 'flex', justifyContent: 'space-between' }}>
              Personal Focus Tips <span style={{ color: '#475569', cursor: 'pointer', fontSize: 14 }}>∧</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {tips.map((tip, i) => (
                <div key={tip} style={{ background: 'rgba(99,102,241,0.06)', border: `1px solid ${i === 0 ? 'rgba(245,158,11,0.3)' : i === 1 ? 'rgba(16,185,129,0.2)' : 'rgba(99,102,241,0.2)'}`, borderLeft: `3px solid ${i === 0 ? '#f59e0b' : i === 1 ? '#10b981' : '#6366f1'}`, borderRadius: 8, padding: '8px 10px', fontSize: 12, color: '#94a3b8', animation: 'fadeIn 0.4s ease' }}>
                  {tip}
                </div>
              ))}
            </div>
          </div>

          {/* Student identity */}
          <div style={{ background: '#0d1117', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 12, padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 9 }}>
            <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'linear-gradient(135deg,#6366f1,#4a90d9)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 13, flexShrink: 0 }}>{user?.fullName?.[0]||'S'}</div>
            <div>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#e2e8f0' }}>{user?.fullName}</div>
              <div style={{ fontSize: 10, color: '#475569' }}>Teacher profile</div>
            </div>
          </div>
        </div>

        {/* CENTER — AI panels grid */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, minWidth: 0 }}>

          {/* Session header */}
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 18, fontWeight: 900, color: '#fff' }}>Session {sessionCode.toUpperCase()}</div>
            <div style={{ fontSize: 12, color: '#475569' }}>{new Date().toLocaleDateString('en-GB')}</div>
          </div>

          {/* Glowing border wrapper — position relative, iframes INSIDE it */}
          <div style={{
            position: 'relative', borderRadius: 16, padding: 3,
            background: 'linear-gradient(135deg,#6366f1,#10b981,#f59e0b,#6366f1)',
            backgroundSize: '300% 300%',
            animation: 'glow 3s ease infinite',
            flex: 1,
          }}>
            {/* Inner container */}
            <div style={{ background: '#070c14', borderRadius: 14, padding: 8, display: 'flex', flexDirection: 'column', gap: 6 }}>

              {/* Row 1: 3 panels */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 6 }}>
                {panels.slice(0, 3).map(({ key, src, title, icon }) => (
                  <div key={key} style={{ background: '#0a0e1a', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 9, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                    <div style={{ padding: '5px 8px', background: '#0d1117', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0, borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                      <span style={{ fontSize: 9, color: '#64748b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '80%' }}>{icon} {title}</span>
                      <button onClick={() => setMaximized(key)} style={{ background: 'none', border: 'none', color: '#475569', cursor: 'pointer', padding: 0, flexShrink: 0 }}><Maximize2 size={10} /></button>
                    </div>
                    <iframe ref={el => iframesRef.current[key] = el} src={src}
                      style={{ width: '100%', height: 160, border: 'none', display: 'block' }}
                      allow="camera; microphone" title={title}
                      onLoad={e => { const send = () => { try { e.target.contentWindow.postMessage({ type: 'ciq-start-camera' }, '*') } catch {} }; send(); setTimeout(send,1000); setTimeout(send,3000); setTimeout(send,6000); }} />
                  </div>
                ))}
              </div>

              {/* Row 2: 2 panels */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
                {panels.slice(3).map(({ key, src, title, icon }) => (
                  <div key={key} style={{ background: '#0a0e1a', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 9, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                    <div style={{ padding: '5px 8px', background: '#0d1117', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0, borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                      <span style={{ fontSize: 9, color: '#64748b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '80%' }}>{icon} {title}</span>
                      <button onClick={() => setMaximized(key)} style={{ background: 'none', border: 'none', color: '#475569', cursor: 'pointer', padding: 0, flexShrink: 0 }}><Maximize2 size={10} /></button>
                    </div>
                    <iframe ref={el => iframesRef.current[key] = el} src={src}
                      style={{ width: '100%', height: 160, border: 'none', display: 'block' }}
                      allow="camera; microphone" title={title}
                      onLoad={e => { const send = () => { try { e.target.contentWindow.postMessage({ type: 'ciq-start-camera' }, '*') } catch {} }; send(); setTimeout(send,1000); setTimeout(send,3000); setTimeout(send,6000); }} />
                  </div>
                ))}
              </div>

            </div>
          </div>

          {/* Class attention badge */}
          <div style={{ display: 'flex', justifyContent: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#0d1117', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 100, padding: '8px 18px' }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: attention !== null ? ac(attention) : '#10b981', animation: 'pulse 1.5s infinite' }} />
              <span style={{ fontSize: 12, color: '#64748b' }}>Class Avg Attention</span>
              <span style={{ fontSize: 14, fontWeight: 700, color: attention !== null ? ac(attention) : '#10b981' }}>{attention !== null ? acLabel(attention) : 'Good'}</span>
            </div>
          </div>
        </div>

        {/* RIGHT PANEL */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>

          {/* Attention bar top-right */}
          <div style={{ background: '#0d1117', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 12, padding: '12px 14px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
              <span style={{ fontSize: 11, color: '#64748b' }}>Class Avg Attention</span>
              <span style={{ fontSize: 12, fontWeight: 700, color: attention !== null ? ac(attention) : '#10b981' }}>{attention !== null ? acLabel(attention) : 'Good'}</span>
            </div>
            <div style={{ height: 6, background: 'rgba(255,255,255,0.05)', borderRadius: 3, overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${attention ?? 75}%`, background: `linear-gradient(90deg,#6366f1,${ac(attention ?? 75)})`, borderRadius: 3, transition: 'width 0.8s ease' }} />
            </div>
          </div>

          {/* Personal Notebook */}
          <div style={{ background: '#0d1117', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 12, padding: '14px' }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: '#e2e8f0', marginBottom: 10 }}>Personal Notebook</div>
            <input value={notebookName} onChange={e => setNotebookName(e.target.value)} placeholder="Name" style={{ width: '100%', background: '#070c14', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 8, padding: '8px 10px', color: '#e2e8f0', fontSize: 12, outline: 'none', boxSizing: 'border-box', marginBottom: 6, fontFamily: 'inherit' }} />
            <textarea value={notebookText} onChange={e => setNotebookText(e.target.value)} placeholder="Notebook" rows={3} style={{ width: '100%', background: '#070c14', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 8, padding: '8px 10px', color: '#e2e8f0', fontSize: 12, outline: 'none', boxSizing: 'border-box', resize: 'none', fontFamily: 'inherit' }} />
          </div>

          {/* Direct Chat */}
          <div style={{ background: '#0d1117', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 12, padding: '14px', flex: 1 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: '#e2e8f0', marginBottom: 10 }}>Direct Chat</div>
            <div style={{ minHeight: 60, maxHeight: 90, overflowY: 'auto', marginBottom: 10 }}>
              {chatHistory.length === 0 ? <div style={{ fontSize: 11, color: '#334155' }}>No messages yet...</div>
                : chatHistory.map((m, i) => (
                  <div key={i} style={{ marginBottom: 6 }}>
                    <div style={{ fontSize: 9, color: '#334155', marginBottom: 1 }}>{m.from === 'teacher' ? '👩‍🏫 Teacher' : '🎓 You'} · {m.time}</div>
                    <div style={{ fontSize: 11, color: m.from === 'teacher' ? '#a5b4fc' : '#94a3b8', background: m.from === 'teacher' ? 'rgba(99,102,241,0.08)' : 'transparent', borderRadius: 6, padding: '5px 8px' }}>{m.text}</div>
                  </div>
                ))
              }
            </div>
            <div style={{ position: 'relative' }}>
              <input value={chatMsg} onChange={e => setChatMsg(e.target.value)} onKeyDown={e => e.key === 'Enter' && sendChat()} placeholder="Type your teacher here..." style={{ width: '100%', background: '#070c14', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 8, padding: '9px 36px 9px 10px', color: '#e2e8f0', fontSize: 11, outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit' }} />
              <button onClick={sendChat} style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: '#6366f1', cursor: 'pointer', padding: 0 }}>›</button>
            </div>
            <button style={{ width: '100%', marginTop: 8, padding: '9px', borderRadius: 8, border: 'none', background: '#1e2a3a', color: '#64748b', fontSize: 11, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, fontFamily: 'inherit' }}>
              <PauseCircle size={13} /> Pause and Ask
            </button>
          </div>

          {/* Attention Heatmap */}
          <div style={{ background: '#0d1117', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 12, padding: '12px 14px' }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: '#64748b', marginBottom: 8 }}>Attention Heatmap</div>
            <AttentionHeatmap />
          </div>
        </div>
      </div>

      {/* MAXIMIZED PANEL OVERLAY */}
      {maximized && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.95)', zIndex: 300, display: 'flex', flexDirection: 'column' }}>
          <div style={{ padding: '12px 20px', background: '#0d1117', borderBottom: '1px solid rgba(255,255,255,0.07)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontWeight: 700, color: '#e2e8f0', fontSize: 15 }}>{panels.find(p => p.key === maximized)?.icon} {panels.find(p => p.key === maximized)?.title}</span>
            <button onClick={() => setMaximized(null)} style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 8, padding: '7px 14px', color: '#ef4444', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5, fontSize: 13, fontWeight: 600, fontFamily: 'inherit' }}>
              <X size={15} /> Close
            </button>
          </div>
          <iframe src={panels.find(p => p.key === maximized)?.src} style={{ flex: 1, width: '100%', border: 'none' }} allow="camera; microphone" title="maximized" />
        </div>
      )}

      {/* Bottom-right Proctoring tools bar */}
      <div style={{ background: '#0a0e1a', borderTop: '1px solid rgba(255,255,255,0.04)', padding: '10px 20px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        <div style={{ background: '#0d1117', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 10, padding: 12 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#ef4444', marginBottom: 8 }}>Critical Attention Alert</div>
          <AlertList />
        </div>
        <div style={{ background: '#0d1117', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 10, padding: 12 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#e2e8f0' }}>Attention Heatmap</div>
          </div>
          <AttentionHeatmap />
          <button style={{ width: '100%', marginTop: 10, padding: '8px', borderRadius: 8, border: 'none', background: '#6366f1', color: '#fff', fontWeight: 600, fontSize: 12, cursor: 'pointer', fontFamily: 'inherit', boxShadow: '0 4px 12px rgba(99,102,241,0.3)' }}>
            Suggest Focus Nudge
          </button>
        </div>
      </div>
    </div>
  )
}
