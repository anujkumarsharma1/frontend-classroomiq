import { useCallback, useEffect, useRef, useState } from 'react'
import toast from 'react-hot-toast'
import { io } from 'socket.io-client'
import { Bell, LogOut, Maximize2, Minimize2, Send } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import api, { errorText, getSocketUrl } from '../../utils/api'
import { Brand, Field, Spinner } from '../../components/ui'
import { attentionTone, attentionWord } from '../../utils/attention'
import { detectorsFor } from '../../utils/detectors'

const clock = () => new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
const FOCUS_LINE = 60

const TIPS = ['Sit back and take one slow breath.', 'Look at the speaker for a moment.', 'Roll your shoulders and unclench your jaw.', 'Blink slowly a few times to rest your eyes.', 'A sip of water helps more than you think.']

function useFocusStreak(attention) {
  const startRef = useRef(null)
  const [mins, setMins] = useState(0)
  useEffect(() => {
    if (attention != null && attention >= FOCUS_LINE) {
      if (startRef.current == null) startRef.current = Date.now()
    } else {
      startRef.current = null
      setMins(0)
    }
  }, [attention])
  useEffect(() => {
    const t = setInterval(() => setMins(startRef.current ? Math.floor((Date.now() - startRef.current) / 60000) : 0), 15000)
    return () => clearInterval(t)
  }, [])
  return mins
}

function Detector({ d, maximized, onToggle, frameRef }) {
  return (
    <section className={`detector${maximized ? ' max' : ''}`} aria-label={d.title}>
      <header>
        <span>{d.title}</span>
        <button className="icon-btn" onClick={onToggle} aria-label={maximized ? `Shrink ${d.title}` : `Expand ${d.title}`}>
          {maximized ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
        </button>
      </header>
      <iframe ref={frameRef} src={d.src} title={d.title} allow="camera; microphone" />
    </section>
  )
}

export default function StudentView() {
  const { user, institution, logout } = useAuth()
  const [step, setStep] = useState('join')
  const [sessionCode, setSessionCode] = useState('')
  const [sessionInfo, setSessionInfo] = useState(null)
  const [checking, setChecking] = useState(false)
  const [codeError, setCodeError] = useState('')
  const [connected, setConnected] = useState(false)
  const [nudge, setNudge] = useState(null)
  const [reading, setReading] = useState({})
  const [maximized, setMaximized] = useState(null)
  const [chatMsg, setChatMsg] = useState('')
  const [chat, setChat] = useState([])
  const [notes, setNotes] = useState('')
  const [joinedAt, setJoinedAt] = useState('')
  const [tip, setTip] = useState(0)

  const socketRef = useRef(null)
  const emitRef = useRef(null)
  const nudgeTimer = useRef(null)
  const detectorRef = useRef({})
  const readingRef = useRef({})
  const framesRef = useRef({})
  const faceRef = useRef(null)

  const detectors = detectorsFor(institution?.enabledFeatures)
  const code = sessionCode.trim().toUpperCase()
  const attention = reading.attention ?? null
  const streak = useFocusStreak(attention)

  useEffect(() => { readingRef.current = reading }, [reading])

  useEffect(() => {
    if (step !== 'session') return
    const saved = localStorage.getItem(`ciq-notes-${code}`)
    if (saved) setNotes(saved)
  }, [step, code])

  useEffect(() => {
    if (step === 'session') localStorage.setItem(`ciq-notes-${code}`, notes)
  }, [notes, step, code])

  useEffect(() => {
    if (step !== 'session') return
    const send = () => Object.values(framesRef.current).forEach((f) => {
      try { f?.contentWindow?.postMessage({ type: 'ciq-start-camera' }, window.location.origin) } catch { /* frame not ready yet */ }
    })
    send()
    const timers = [500, 1500, 3000, 5000, 8000, 12000, 15000].map((t) => setTimeout(send, t))
    return () => timers.forEach(clearTimeout)
  }, [step])

  useEffect(() => {
    if (attention == null || attention >= FOCUS_LINE) return
    const t = setInterval(() => setTip((i) => (i + 1) % TIPS.length), 30000)
    return () => clearInterval(t)
  }, [attention])

  useEffect(() => {
    const handle = (event) => {
      if (event.origin !== window.location.origin) return
      const fromOurFrame = Object.values(framesRef.current).some((f) => f && f.contentWindow === event.source)
      if (!fromOurFrame) return
      const msg = event.data
      if (!msg || msg.type !== 'ciq-detection') return
      const { detectorKey, faceVisible, attention: a, expression } = msg
      detectorRef.current[detectorKey] = { faceVisible, attention: a, expression }
      const visible = Object.values(detectorRef.current).filter((d) => d.faceVisible)
      const avg = visible.length ? Math.round(visible.reduce((s, d) => s + (d.attention || 0), 0) / visible.length) : 0
      const anyFace = visible.length > 0
      const expr = expression || detectorRef.current.microexpr?.expression || '—'
      if (faceRef.current === true && !anyFace) socketRef.current?.emit('student:face-lost', { sessionCode: code })
      if (faceRef.current === false && anyFace) socketRef.current?.emit('student:face-found', { sessionCode: code })
      faceRef.current = anyFace
      setReading({ attention: avg, faceVisible: anyFace, expression: expr })
    }
    window.addEventListener('message', handle)
    return () => window.removeEventListener('message', handle)
  }, [code])

  const stopSocket = useCallback(() => {
    socketRef.current?.disconnect()
    socketRef.current = null
    clearInterval(emitRef.current)
    clearTimeout(nudgeTimer.current)
  }, [])

  const resetSession = useCallback(() => {
    stopSocket()
    detectorRef.current = {}
    faceRef.current = null
    setStep('join'); setSessionInfo(null); setReading({}); setChat([]); setMaximized(null); setConnected(false)
  }, [stopSocket])

  const connectSocket = useCallback((joinCode) => {
    const socket = io(getSocketUrl(), { auth: { token: localStorage.getItem('token') }, transports: ['websocket', 'polling'] })
    socketRef.current = socket
    socket.on('connect', () => { setConnected(true); socket.emit('student:join-session', { sessionCode: joinCode }) })
    socket.on('disconnect', () => setConnected(false))
    socket.on('connect_error', () => setConnected(false))
    socket.on('error', ({ message }) => toast.error(message))
    socket.on('teacher:nudge', ({ message }) => {
      setNudge(message)
      setChat((h) => [...h, { from: 'teacher', text: message, time: clock() }])
      clearTimeout(nudgeTimer.current)
      nudgeTimer.current = setTimeout(() => setNudge(null), 8000)
    })
    socket.on('session:ended', () => {
      toast('Your teacher ended the session.')
      resetSession()
    })
    emitRef.current = setInterval(() => {
      if (socket.connected) socket.emit('student:data', { sessionCode: joinCode, data: readingRef.current })
    }, 2000)
  }, [resetSession])

  useEffect(() => stopSocket, [stopSocket])

  const validate = async (e) => {
    e.preventDefault()
    setChecking(true)
    setCodeError('')
    try {
      const { data } = await api.get(`/sessions/validate/${code}`)
      setSessionInfo(data.session)
      setStep('camera')
    } catch (err) {
      setCodeError(errorText(err, "That code didn't work. Check it with your teacher."))
    } finally {
      setChecking(false)
    }
  }

  const start = () => { setJoinedAt(clock()); setStep('session'); connectSocket(code) }
  const leave = () => { resetSession(); logout() }

  const sendChat = (e) => {
    e.preventDefault()
    if (!chatMsg.trim()) return
    setChat((h) => [...h, { from: 'me', text: chatMsg.trim(), time: clock() }])
    socketRef.current?.emit('student:chat', { sessionCode: code, message: chatMsg.trim() })
    setChatMsg('')
  }

  if (step === 'join') return (
    <main className="auth-page">
      <div className="auth-box">
        <Brand to="/student" />
        <h1 style={{ marginBottom: 8 }}>Join your class</h1>
        <p className="muted" style={{ marginBottom: 28 }}>Hi {user?.fullName?.split(' ')[0]}. Enter the six-character code your teacher shared.</p>
        <form className="card stack" onSubmit={validate} style={{ gap: 18 }}>
          <Field label="Session code" id="join-code">
            <input id="join-code" className="input code-input" value={sessionCode} onChange={(e) => setSessionCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))} maxLength={6} autoComplete="off" autoCapitalize="characters" spellCheck="false" required />
          </Field>
          {codeError && <p className="small" role="alert" style={{ color: 'var(--low)' }}>{codeError}</p>}
          <button type="submit" className="btn btn-primary btn-block" disabled={checking || code.length < 6}>{checking && <Spinner />}{checking ? 'Checking' : 'Continue'}</button>
        </form>
        <div style={{ textAlign: 'center', marginTop: 20 }}>
          <button className="btn btn-quiet btn-sm" onClick={logout}><LogOut size={14} aria-hidden="true" /> Sign out</button>
        </div>
      </div>
    </main>
  )

  if (step === 'camera') return (
    <main className="auth-page">
      <div className="auth-box" style={{ maxWidth: 480 }}>
        <Brand to="/student" />
        <h1 style={{ marginBottom: 8 }}>Your camera, your device</h1>
        <p className="muted" style={{ marginBottom: 28 }}>{[sessionInfo?.className, sessionInfo?.subject, sessionInfo?.teacherName].filter(Boolean).join(', ')}</p>
        <div className="card stack" style={{ gap: 18 }}>
          <p>The detectors run in this browser tab. Your teacher sees an attention score, an expression label and whether your face is in view. No video is recorded or sent.</p>
          <p className="small muted">Your browser will ask for camera access. The struggle detector also asks for the microphone; you can say no to that one.</p>
          <button className="btn btn-primary btn-block" onClick={start}>Allow camera and join</button>
          <button className="btn btn-quiet btn-block" onClick={() => setStep('join')}>Back</button>
        </div>
      </div>
    </main>
  )

  return (
    <>
      <header className="topbar">
        <div className="wrap topbar-inner">
          <Brand to="/student" />
          <span className="row small" style={{ gap: 10 }}>
            <span className="code">{code}</span>
            <span className={`pill ${connected ? 'good' : 'fair'}`}><span className={`dot${connected ? ' live' : ''}`} />{connected ? 'Connected' : 'Connecting'}</span>
          </span>
          <button className="btn btn-danger btn-sm" style={{ marginLeft: 'auto' }} onClick={leave}><LogOut size={14} aria-hidden="true" /> Leave</button>
        </div>
      </header>
      <main className="app-main">
        <div className="wrap stack">
          <div>
            <h1>{[sessionInfo?.className, sessionInfo?.subject].filter(Boolean).join(', ') || `Session ${code}`}</h1>
            <p className="muted">{sessionInfo?.teacherName ? `With ${sessionInfo.teacherName}. ` : ''}Joined at {joinedAt}.</p>
          </div>
          {nudge && <div className="nudge" role="status"><Bell size={18} aria-hidden="true" />{nudge}</div>}
          <div className="session-grid">
            <div className="stack">
              <div className="card tight stack" style={{ gap: 14 }}>
                <p className="small muted">Your attention</p>
                {attention == null ? <p className="muted">Waiting for the camera</p> : (
                  <>
                    <div className="spread">
                      <span className="stat-value">{attention}%</span>
                      <span className={`pill ${attentionTone(attention)}`}>{attentionWord(attention)}</span>
                    </div>
                    <div className="bar"><span style={{ transform: `scaleX(${attention / 100})`, background: `var(--${attentionTone(attention)})` }} /></div>
                    <p className="small muted">{attention >= FOCUS_LINE ? `Focused for ${streak} min` : TIPS[tip]}</p>
                  </>
                )}
                {reading.faceVisible === false && <span className="pill fair">Your face is out of view</span>}
              </div>
              <div className="card tight">
                <Field label="Notes" hint="Saved in this browser only." id="notes">
                  <textarea id="notes" className="input" rows={6} value={notes} onChange={(e) => setNotes(e.target.value)} />
                </Field>
              </div>
            </div>
            <div className="detectors">
              {detectors.map((d) => (
                <Detector key={d.key} d={d} maximized={maximized === d.key} onToggle={() => setMaximized(maximized === d.key ? null : d.key)} frameRef={(el) => { framesRef.current[d.key] = el }} />
              ))}
            </div>
            <form className="card tight stack" onSubmit={sendChat} style={{ gap: 14 }}>
              <h2 style={{ fontSize: 'var(--t-lg)' }}>Your teacher</h2>
              <div className="chat-log" aria-live="polite">
                {chat.length === 0 ? <p className="small muted">Messages from your teacher show up here.</p> : chat.map((m, i) => (
                  <div key={i} className={`bubble${m.from === 'teacher' ? ' them' : ''}`}>
                    <div className="xs muted">{m.from === 'teacher' ? 'Teacher' : 'You'}, {m.time}</div>
                    {m.text}
                  </div>
                ))}
              </div>
              <label htmlFor="chat" className="sr-only">Message your teacher</label>
              <div className="input-wrap">
                <input id="chat" className="input" value={chatMsg} onChange={(e) => setChatMsg(e.target.value)} placeholder="Ask a question" maxLength={200} />
                <button type="submit" className="icon-btn" aria-label="Send message" disabled={!chatMsg.trim()}><Send size={17} /></button>
              </div>
            </form>
          </div>
        </div>
      </main>
    </>
  )
}
