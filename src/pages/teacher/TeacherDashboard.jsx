import React, { useState, useEffect, useRef, useCallback, createContext, useContext } from 'react'
import { Routes, Route, NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import api, { getSocketUrl } from '../../utils/api'
import toast from 'react-hot-toast'
import { io } from 'socket.io-client'
import {
  BarChart2, LogOut, Play, Square, Bell, History,
  Settings, Users, Wifi, WifiOff, AlertTriangle,
  ChevronDown, Maximize2, MessageSquare, Send,
  Lock, Unlock, ShieldAlert, X
} from 'lucide-react'

const ac = (p) => p >= 70 ? '#10b981' : p >= 40 ? '#f59e0b' : '#ef4444'
const S = {
  sidebar: { width: 220, minHeight: '100vh', background: '#0a0e1a', borderRight: '1px solid rgba(255,255,255,0.05)', display: 'flex', flexDirection: 'column', flexShrink: 0 },
  input: (x = {}) => ({ width: '100%', background: '#070c14', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, padding: '11px 13px', color: '#e2e8f0', fontSize: 13, outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit', ...x }),
  btn: (v = 'primary') => ({ padding: '9px 18px', borderRadius: 9, border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: 13, fontFamily: 'inherit', display: 'inline-flex', alignItems: 'center', gap: 6, transition: 'all 0.2s', background: v === 'primary' ? '#6366f1' : v === 'danger' ? '#ef4444' : v === 'ghost' ? 'rgba(255,255,255,0.05)' : v === 'success' ? '#10b981' : '#334155', color: '#fff', boxShadow: v === 'primary' ? '0 4px 14px rgba(99,102,241,0.25)' : 'none', border: v === 'ghost' ? '1px solid rgba(255,255,255,0.08)' : 'none' }),
  card: (x = {}) => ({ background: '#0d1117', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 14, padding: 18, ...x }),
  label: { display: 'block', fontSize: 12, color: '#64748b', marginBottom: 6, fontWeight: 500 },
  th: { padding: '9px 12px', fontSize: 11, fontWeight: 600, color: '#475569', textAlign: 'left', background: '#070c14', borderBottom: '1px solid rgba(255,255,255,0.05)', whiteSpace: 'nowrap' },
  td: { padding: '11px 12px', fontSize: 13, color: '#94a3b8', borderBottom: '1px solid rgba(255,255,255,0.04)' },
}

// ─── Session Context — keeps session alive across all tab navigations ─────────
const SessionCtx = createContext(null)

function SessionProvider({ children }) {
  const { user } = useAuth()
  const [session, setSession] = useState(null)
  const [students, setStudents] = useState({})
  const [connected, setConnected] = useState(false)
  const [chatMsgs, setChatMsgs] = useState([]) // messages from students
  const socketRef = useRef(null)

  useEffect(() => () => socketRef.current?.disconnect(), [])

  const connectSocket = useCallback((sess) => {
    if (socketRef.current?.connected) return
    const token = localStorage.getItem('token')
    const socket = io(getSocketUrl(), { auth: { token }, transports: ['websocket', 'polling'] })
    socketRef.current = socket

    socket.on('connect', () => {
      setConnected(true)
      socket.emit('teacher:join-session', { sessionCode: sess.sessionCode })
    })
    socket.on('disconnect', () => setConnected(false))
    socket.on('error', ({ message }) => toast.error(message))
    socket.on('session:active-students', ({ students: list }) => {
      const m = {}; list.forEach(s => { m[s.userId] = { ...s, isOnline: true } }); setStudents(m)
    })
    socket.on('student:joined', s => {
      setStudents(p => ({ ...p, [s.userId]: { ...s, isOnline: true } }))
      toast(`${s.fullName} joined`, { icon: '🎓' })
    })
    socket.on('student:left', ({ userId, fullName }) => {
      setStudents(p => ({ ...p, [userId]: { ...p[userId], isOnline: false } }))
      toast(`${fullName} left`, { icon: '👋' })
    })
    socket.on('student:update', ({ userId, fullName, data }) =>
      setStudents(p => ({ ...p, [userId]: { ...p[userId], userId, fullName, data, isOnline: true } }))
    )
    socket.on('student:face-lost', ({ userId }) =>
      setStudents(p => ({ ...p, [userId]: { ...p[userId], data: { ...p[userId]?.data, faceVisible: false } } }))
    )
    socket.on('student:face-found', ({ userId }) =>
      setStudents(p => ({ ...p, [userId]: { ...p[userId], data: { ...p[userId]?.data, faceVisible: true } } }))
    )
    socket.on('student:multi-face', ({ userId }) => {
      setStudents(p => ({ ...p, [userId]: { ...p[userId], multiFace: true } }))
      setTimeout(() => setStudents(p => ({ ...p, [userId]: { ...p[userId], multiFace: false } })), 10000)
    })
    // Student chat messages coming in
    socket.on('student:chat', ({ userId, fullName, message }) => {
      setChatMsgs(prev => [...prev, {
        id: Date.now(), from: fullName, userId, text: message,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }])
      toast(`💬 ${fullName}: ${message.slice(0, 40)}`, { duration: 5000 })
    })
  }, [])

  const startSession = async (form) => {
    const { data } = await api.post('/sessions/create', form)
    setSession(data.session)
    connectSocket(data.session)
    toast.success(`Session ${data.session.sessionCode} started!`)
    return data.session
  }

  const endSession = async () => {
    if (!session) return
    const { data } = await api.post(`/sessions/${session.sessionCode}/end`)
    socketRef.current?.disconnect()
    setSession(null); setStudents({}); setConnected(false); setChatMsgs([])
    toast.success(`Session ended. Avg attention: ${data.summary.avgAttention}%`)
  }

  const nudgeStudent = (targetUserId, name) => {
    socketRef.current?.emit('teacher:nudge-student', {
      sessionCode: session?.sessionCode, targetUserId,
      message: `${user?.fullName} is asking for your attention!`
    })
    toast.success(`Nudged ${name}`)
  }

  return (
    <SessionCtx.Provider value={{ session, students, connected, chatMsgs, startSession, endSession, nudgeStudent }}>
      {children}
    </SessionCtx.Provider>
  )
}

// ─── Live session banner shown on every page when session is active ───────────
function SessionBanner() {
  const { session, connected, students, endSession } = useContext(SessionCtx)
  const [ending, setEnding] = useState(false)
  if (!session) return null
  const list = Object.values(students)
  const withData = list.filter(s => s.data?.attention != null)
  const avg = withData.length > 0 ? Math.round(withData.reduce((a, s) => a + s.data.attention, 0) / withData.length) : null
  const handleEnd = async () => {
    if (!confirm('End this session?')) return
    setEnding(true); try { await endSession() } catch { toast.error('Failed') } finally { setEnding(false) }
  }
  return (
    <div style={{ background: 'rgba(99,102,241,0.1)', borderBottom: '1px solid rgba(99,102,241,0.25)', padding: '8px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ width: 7, height: 7, borderRadius: '50%', background: connected ? '#10b981' : '#ef4444', display: 'inline-block', animation: 'pulse 1.5s infinite' }} />
          <span style={{ fontSize: 12, color: connected ? '#10b981' : '#ef4444', fontWeight: 600 }}>{connected ? 'LIVE' : 'DISCONNECTED'}</span>
        </div>
        <span style={{ fontFamily: 'monospace', fontWeight: 800, color: '#6366f1', fontSize: 15, letterSpacing: 2 }}>{session.sessionCode}</span>
        <span style={{ fontSize: 12, color: '#64748b' }}>{session.className} · {session.subject}</span>
        <span style={{ fontSize: 12, color: '#94a3b8' }}>{list.filter(s => s.isOnline).length} students online</span>
        {avg !== null && <span style={{ fontSize: 13, fontWeight: 700, color: ac(avg) }}>{avg}% avg attention</span>}
      </div>
      <button onClick={handleEnd} disabled={ending} style={{ ...S.btn('danger'), padding: '6px 14px', fontSize: 12 }}>
        <Square size={12} /> {ending ? 'Ending...' : 'End Session'}
      </button>
    </div>
  )
}

// ─── Sidebar ──────────────────────────────────────────────────────────────────
function Sidebar() {
  const { logout, user, institution } = useAuth()
  const { session } = useContext(SessionCtx)
  const navigate = useNavigate()
  return (
    <aside style={S.sidebar}>
      <div style={{ padding: '18px 16px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
          <div style={{ width: 32, height: 32, borderRadius: 8, overflow: 'hidden', border: '1px solid rgba(255,255,255,0.1)' }}>
            <img src="/logo.jpg" alt="ClassroomIQ" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          </div>
          <div>
            <div style={{ fontWeight: 800, fontSize: 14, color: '#e2e8f0' }}>ClassroomIQ</div>
            <div style={{ fontSize: 10, color: '#4a90d9' }}>{institution?.name?.slice(0, 14) || 'Institution'}</div>
          </div>
        </div>
      </div>
      <nav style={{ flex: 1, padding: '14px 10px' }}>
        {[
          { to: '/teacher', icon: BarChart2, label: 'Live Session', end: true },
          { to: '/teacher/messages', icon: MessageSquare, label: 'Messages', badge: true },
          { to: '/teacher/history', icon: History, label: 'History' },
          { to: '/teacher/criteria', icon: Settings, label: 'Criteria' },
        ].map(({ to, icon: Icon, label, end, badge }) => (
          <NavLink key={to} to={to} end={end} style={({ isActive }) => ({
            display: 'flex', alignItems: 'center', gap: 10, padding: '10px 13px',
            borderRadius: 9, marginBottom: 3, textDecoration: 'none', fontSize: 13,
            fontWeight: isActive ? 600 : 400, color: isActive ? '#fff' : '#64748b',
            background: isActive ? '#6366f1' : 'transparent', transition: 'all 0.15s',
            boxShadow: isActive ? '0 4px 12px rgba(99,102,241,0.3)' : 'none',
            position: 'relative',
          })}>
            <Icon size={15} /> {label}
            {badge && session && <span style={{ marginLeft: 'auto', width: 7, height: 7, borderRadius: '50%', background: '#10b981', animation: 'pulse 1.5s infinite' }} />}
          </NavLink>
        ))}
      </nav>
      <div style={{ padding: '14px 16px', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 12 }}>
          <div style={{ width: 30, height: 30, borderRadius: '50%', background: 'linear-gradient(135deg,#6366f1,#4a90d9)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 12 }}>{user?.fullName?.[0] || 'T'}</div>
          <div><div style={{ fontSize: 12, fontWeight: 600, color: '#e2e8f0' }}>{user?.fullName}</div><div style={{ fontSize: 9, color: '#475569' }}>{user?.userId}</div></div>
        </div>
        <button onClick={() => { logout(); navigate('/login') }} style={{ ...S.btn('ghost'), width: '100%', justifyContent: 'center', fontSize: 12 }}>
          <LogOut size={13} /> Sign Out
        </button>
      </div>
    </aside>
  )
}

// ─── Student Card ─────────────────────────────────────────────────────────────
function StudentCard({ student, onNudge }) {
  const { userId, fullName, data, isOnline, multiFace } = student
  const attention = data?.attention ?? null
  const expression = data?.expression || '—'
  const faceVisible = data?.faceVisible !== false
  return (
    <div style={{ background: '#0d1117', border: `1.5px solid ${multiFace ? '#ef4444' : !faceVisible && attention !== null ? '#f59e0b' : 'rgba(255,255,255,0.07)'}`, borderRadius: 12, padding: 14, position: 'relative' }}>
      {multiFace && <div style={{ position: 'absolute', top: -7, right: -7, background: '#ef4444', borderRadius: '50%', width: 20, height: 20, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><AlertTriangle size={11} color="#fff" /></div>}
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
        <div>
          <div style={{ fontWeight: 600, fontSize: 13, color: '#e2e8f0', marginBottom: 1 }}>{fullName}</div>
          <div style={{ fontSize: 10, color: '#475569', fontFamily: 'monospace' }}>{userId}</div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          {attention !== null && <span style={{ fontSize: 16, fontWeight: 900, color: ac(attention) }}>{attention}%</span>}
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: isOnline ? '#10b981' : '#334155', boxShadow: isOnline ? '0 0 6px #10b981' : 'none' }} />
        </div>
      </div>
      {attention !== null ? (
        <>
          <div style={{ height: 5, background: 'rgba(255,255,255,0.05)', borderRadius: 3, overflow: 'hidden', marginBottom: 8 }}>
            <div style={{ height: '100%', width: `${attention}%`, background: `linear-gradient(90deg,${ac(attention)},${ac(attention)}aa)`, borderRadius: 3, transition: 'width 0.6s ease' }} />
          </div>
          <div style={{ fontSize: 11, color: '#64748b' }}>😊 <span style={{ color: '#94a3b8' }}>{expression}</span></div>
          {multiFace && <div style={{ fontSize: 10, color: '#ef4444', marginTop: 4 }}>🚨 Multiple faces</div>}
          {!faceVisible && <div style={{ fontSize: 10, color: '#f59e0b', marginTop: 4 }}>⚠ Face not visible</div>}
        </>
      ) : (
        <div style={{ fontSize: 11, color: '#334155', textAlign: 'center', padding: '6px 0' }}>Waiting...</div>
      )}
      <button onClick={() => onNudge(userId, fullName)} style={{ width: '100%', marginTop: 10, padding: '6px', borderRadius: 7, border: '1px solid rgba(255,255,255,0.07)', background: 'transparent', color: '#64748b', cursor: 'pointer', fontSize: 11, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
        <Bell size={11} /> Nudge
      </button>
    </div>
  )
}

// ─── LIVE SESSION ─────────────────────────────────────────────────────────────
function LiveSession() {
  const { user } = useAuth()
  const { session, students, connected, startSession, nudgeStudent } = useContext(SessionCtx)
  const [form, setForm] = useState({ className: '', subject: '' })
  const [creating, setCreating] = useState(false)
  const [showSubjectDrop, setShowSubjectDrop] = useState(false)
  const subjects = ['Mathematics', 'Science', 'English', 'History', 'Physics', 'Chemistry', 'Biology', 'Computer Science']

  const handleCreate = async (e) => {
    e.preventDefault(); setCreating(true)
    try { await startSession(form) } catch (err) { toast.error(err.response?.data?.error || 'Failed') }
    finally { setCreating(false) }
  }

  const studentList = Object.values(students)
  const online = studentList.filter(s => s.isOnline)
  const withData = studentList.filter(s => s.data?.attention != null)
  const avg = withData.length > 0 ? Math.round(withData.reduce((a, s) => a + s.data.attention, 0) / withData.length) : null
  const low = withData.filter(s => s.data.attention < 40).length

  if (!session) return (
    <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: '#070c14', padding: 24, position: 'relative' }}>
      {/* Recommended tooltips */}
      <div style={{ position: 'absolute', left: 240, top: '38%', maxWidth: 180, background: '#0d1117', border: '1px solid rgba(99,102,241,0.25)', borderRadius: 10, padding: '12px 14px', fontSize: 11, color: '#64748b', lineHeight: 1.6 }}>
        <div style={{ fontWeight: 700, color: '#e2e8f0', marginBottom: 5 }}>Recommended Settings</div>
        Recommended settings for the attention threshold and noise parameters. See Criteria tab to adjust.
      </div>
      <div style={{ position: 'absolute', right: 24, top: '32%', maxWidth: 180, background: '#0d1117', border: '1px solid rgba(99,102,241,0.25)', borderRadius: 10, padding: '12px 14px', fontSize: 11, color: '#64748b', lineHeight: 1.6 }}>
        <div style={{ fontWeight: 700, color: '#e2e8f0', marginBottom: 5 }}>Recommended Settings</div>
        AI thresholds are applied to all students joining this session automatically.
      </div>

      <div style={{ width: '100%', maxWidth: 480 }}>
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <img src="/logo.jpg" style={{ width: 44, height: 44, borderRadius: 10, objectFit: 'cover', marginBottom: 12 }} />
          <h1 style={{ fontSize: 24, fontWeight: 900, color: '#fff', marginBottom: 4 }}>Start a Session</h1>
          <p style={{ fontSize: 13, color: '#64748b' }}>Create a live monitoring session for your class</p>
        </div>
        <form onSubmit={handleCreate} style={{ background: '#0d1117', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 16, padding: 28 }}>
          <div style={{ marginBottom: 16 }}>
            <label style={S.label}>Class Name</label>
            <input placeholder="Grade 10 - Section B" value={form.className} onChange={e => setForm({ ...form, className: e.target.value })} style={S.input()} />
          </div>
          <div style={{ marginBottom: 20, position: 'relative' }}>
            <label style={S.label}>Subject</label>
            <div style={{ position: 'relative' }}>
              <input placeholder="Select or type subject" value={form.subject} onChange={e => setForm({ ...form, subject: e.target.value })} onFocus={() => setShowSubjectDrop(true)} onBlur={() => setTimeout(() => setShowSubjectDrop(false), 150)} style={S.input({ paddingRight: 40 })} />
              <ChevronDown size={16} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', color: '#475569', pointerEvents: 'none' }} />
              {showSubjectDrop && (
                <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: '#0d1117', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, zIndex: 50, overflow: 'hidden', marginTop: 4, boxShadow: '0 8px 24px rgba(0,0,0,0.5)' }}>
                  {subjects.filter(s => s.toLowerCase().includes(form.subject.toLowerCase())).map(s => (
                    <div key={s} onMouseDown={() => { setForm({ ...form, subject: s }); setShowSubjectDrop(false) }} style={{ padding: '10px 14px', fontSize: 13, color: '#94a3b8', cursor: 'pointer' }} onMouseEnter={e => e.currentTarget.style.background = 'rgba(99,102,241,0.1)'} onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>{s}</div>
                  ))}
                </div>
              )}
            </div>
          </div>
          <button type="submit" disabled={creating} style={{ ...S.btn('primary'), width: '100%', justifyContent: 'center', padding: '13px', fontSize: 15 }}>
            {creating ? <span style={{ width: 18, height: 18, border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 0.7s linear infinite', display: 'inline-block' }} /> : <Play size={16} />}
            {creating ? 'Starting...' : 'Start Session'}
          </button>
        </form>
        <div style={{ marginTop: 14, background: '#0d1117', border: '1px solid rgba(255,255,255,0.05)', borderRadius: 12, padding: '14px 16px' }}>
          <div style={{ fontSize: 12, color: '#64748b', marginBottom: 10 }}>Invited students</div>
          <div style={{ display: 'flex', gap: 10 }}>
            {['N', 'P', 'R', 'A'].map((l, i) => (
              <div key={l} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                <div style={{ width: 36, height: 36, borderRadius: '50%', background: ['#6366f1', '#10b981', '#f59e0b', '#4a90d9'][i], display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 13 }}>{l}</div>
                <div style={{ fontSize: 9, color: '#475569' }}>Invited</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
      {/* Stats strip */}
      <div style={{ display: 'flex', gap: 12, padding: '14px 24px', background: '#0a0e1a', borderBottom: '1px solid rgba(255,255,255,0.04)', flexWrap: 'wrap' }}>
        {[
          ['Students Online', `${online.length} / ${studentList.length}`, '#4a90d9'],
          ['Avg Attention', avg !== null ? `${avg}%` : '—', avg !== null ? ac(avg) : '#64748b'],
          ['Low Attention', low, '#ef4444'],
          ['Multi-Face', studentList.filter(s => s.multiFace).length, '#f59e0b'],
        ].map(([l, v, c]) => (
          <div key={l} style={{ background: '#0d1117', border: '1px solid rgba(255,255,255,0.05)', borderRadius: 9, padding: '10px 16px', flex: '1 1 120px' }}>
            <div style={{ fontSize: 20, fontWeight: 800, color: c, lineHeight: 1 }}>{v}</div>
            <div style={{ fontSize: 11, color: '#475569', marginTop: 2 }}>{l}</div>
          </div>
        ))}
      </div>

      {/* Student grid */}
      <div style={{ flex: 1, padding: '18px 24px' }}>
        {studentList.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '80px 24px', background: '#0d1117', border: '1px solid rgba(255,255,255,0.05)', borderRadius: 16 }}>
            <Users size={52} color="#1e2a3a" style={{ margin: '0 auto 14px' }} />
            <p style={{ color: '#334155', fontSize: 16, marginBottom: 6 }}>Waiting for students to join...</p>
            <p style={{ color: '#334155', fontSize: 14 }}>Share code <strong style={{ color: '#6366f1', fontFamily: 'monospace', fontSize: 18, letterSpacing: 3 }}>{session.sessionCode}</strong></p>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(190px,1fr))', gap: 12 }}>
            {studentList.map(s => <StudentCard key={s.userId} student={s} onNudge={nudgeStudent} />)}
          </div>
        )}
      </div>
    </div>
  )
}

// ─── MESSAGES (student → teacher chat) ───────────────────────────────────────
function Messages() {
  const { session, students, chatMsgs, nudgeStudent } = useContext(SessionCtx)
  const [replyTo, setReplyTo] = useState(null)
  const [replyText, setReplyText] = useState('')
  const bottomRef = useRef(null)

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [chatMsgs])

  const sendReply = () => {
    if (!replyTo || !replyText.trim() || !session) return
    nudgeStudent(replyTo.userId, replyTo.name)
    toast.success(`Reply sent to ${replyTo.name}`)
    setReplyText(''); setReplyTo(null)
  }

  const studentList = Object.values(students)

  return (
    <div style={{ padding: 28 }}>
      <h1 style={{ fontSize: 22, fontWeight: 900, color: '#fff', marginBottom: 4 }}>Student Messages</h1>
      <p style={{ fontSize: 13, color: '#64748b', marginBottom: 22 }}>
        {session ? `Session ${session.sessionCode} · Messages from students` : 'No active session — messages appear when a session is running'}
      </p>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: 16 }}>
        {/* Chat messages */}
        <div style={{ background: '#0d1117', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 14, display: 'flex', flexDirection: 'column', minHeight: 500 }}>
          <div style={{ padding: '14px 18px', borderBottom: '1px solid rgba(255,255,255,0.05)', fontSize: 13, fontWeight: 700, color: '#e2e8f0', display: 'flex', alignItems: 'center', gap: 8 }}>
            <MessageSquare size={15} color="#6366f1" /> Incoming Messages
            {chatMsgs.length > 0 && <span style={{ background: '#6366f1', borderRadius: 100, padding: '1px 8px', fontSize: 11, fontWeight: 600 }}>{chatMsgs.length}</span>}
          </div>
          <div style={{ flex: 1, overflowY: 'auto', padding: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
            {chatMsgs.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '60px 24px' }}>
                <MessageSquare size={40} color="#1e2a3a" style={{ margin: '0 auto 12px' }} />
                <p style={{ color: '#334155', fontSize: 14 }}>No messages yet.</p>
                <p style={{ color: '#334155', fontSize: 12, marginTop: 4 }}>When students send messages via the "Pause and Ask" feature, they appear here.</p>
              </div>
            ) : chatMsgs.map(m => (
              <div key={m.id} style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderLeft: '3px solid #6366f1', borderRadius: 10, padding: '12px 14px', animation: 'fadeIn 0.3s ease' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ width: 24, height: 24, borderRadius: '50%', background: 'linear-gradient(135deg,#6366f1,#4a90d9)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 11 }}>{m.from[0]}</div>
                    <span style={{ fontSize: 12, fontWeight: 600, color: '#e2e8f0' }}>{m.from}</span>
                    <span style={{ fontSize: 10, color: '#475569', fontFamily: 'monospace' }}>{m.userId}</span>
                  </div>
                  <span style={{ fontSize: 10, color: '#334155' }}>{m.time}</span>
                </div>
                <p style={{ fontSize: 13, color: '#94a3b8', lineHeight: 1.5, marginBottom: 10 }}>{m.text}</p>
                <button onClick={() => setReplyTo({ userId: m.userId, name: m.from })} style={{ ...S.btn('ghost'), padding: '5px 12px', fontSize: 11 }}>
                  <Bell size={11} /> Nudge Back
                </button>
              </div>
            ))}
            <div ref={bottomRef} />
          </div>

          {/* Reply box */}
          {replyTo && (
            <div style={{ padding: '12px 16px', borderTop: '1px solid rgba(255,255,255,0.05)', background: 'rgba(99,102,241,0.05)' }}>
              <div style={{ fontSize: 11, color: '#64748b', marginBottom: 6 }}>Replying to <strong style={{ color: '#6366f1' }}>{replyTo.name}</strong> (sends as nudge)
                <button onClick={() => setReplyTo(null)} style={{ float: 'right', background: 'none', border: 'none', color: '#475569', cursor: 'pointer' }}><X size={13} /></button>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <input value={replyText} onChange={e => setReplyText(e.target.value)} onKeyDown={e => e.key === 'Enter' && sendReply()} placeholder="Type message..." style={{ ...S.input({ padding: '8px 12px', fontSize: 12 }), flex: 1 }} />
                <button onClick={sendReply} style={{ ...S.btn('primary'), padding: '8px 14px' }}><Send size={13} /></button>
              </div>
            </div>
          )}
        </div>

        {/* Online students list */}
        <div style={{ background: '#0d1117', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 14, padding: 16 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#e2e8f0', marginBottom: 12 }}>Students Online</div>
          {studentList.length === 0 ? (
            <p style={{ fontSize: 12, color: '#334155' }}>No students in session</p>
          ) : studentList.map(s => (
            <div key={s.userId} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '9px 0', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ width: 7, height: 7, borderRadius: '50%', background: s.isOnline ? '#10b981' : '#334155', boxShadow: s.isOnline ? '0 0 5px #10b981' : 'none' }} />
                <div>
                  <div style={{ fontSize: 12, fontWeight: 600, color: '#e2e8f0' }}>{s.fullName}</div>
                  {s.data?.attention != null && <div style={{ fontSize: 10, color: ac(s.data.attention) }}>{s.data.attention}% attention</div>}
                </div>
              </div>
              <button onClick={() => setReplyTo({ userId: s.userId, name: s.fullName })} style={{ ...S.btn('ghost'), padding: '4px 10px', fontSize: 10 }}><Bell size={10} /></button>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ─── HISTORY ─────────────────────────────────────────────────────────────────
function SessionHistory() {
  const [sessions, setSessions] = useState([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState(null)
  useEffect(() => { api.get('/sessions/my-sessions').then(({ data }) => setSessions(data.sessions)).catch(() => {}).finally(() => setLoading(false)) }, [])
  const viewReport = async (code) => { try { const { data } = await api.get(`/sessions/${code}/report`); setSelected(data.session) } catch { toast.error('Failed') } }
  return (
    <div style={{ padding: 28 }}>
      <h1 style={{ fontSize: 22, fontWeight: 900, color: '#fff', marginBottom: 4 }}>Session History</h1>
      <p style={{ fontSize: 13, color: '#64748b', marginBottom: 22 }}>Your last 20 sessions</p>
      {loading ? <div style={{ textAlign: 'center', padding: 40, color: '#475569' }}>Loading...</div> : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {sessions.length === 0
            ? <div style={{ textAlign: 'center', padding: 60, background: '#0d1117', border: '1px solid rgba(255,255,255,0.05)', borderRadius: 14, color: '#334155' }}>No sessions yet.</div>
            : sessions.map(s => (
              <div key={s.sessionCode} style={{ background: '#0d1117', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 13, padding: '16px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
                <div style={{ display: 'flex', gap: 20, alignItems: 'center', flexWrap: 'wrap' }}>
                  <span style={{ fontFamily: 'monospace', fontWeight: 800, color: '#6366f1', fontSize: 17, letterSpacing: 2 }}>{s.sessionCode}</span>
                  <div><div style={{ fontWeight: 600, color: '#e2e8f0', fontSize: 14 }}>{s.className || 'Unnamed'}{s.subject ? ` · ${s.subject}` : ''}</div><div style={{ fontSize: 11, color: '#475569' }}>{new Date(s.startedAt).toLocaleString()}</div></div>
                  {[['Attn', `${s.summary?.avgAttention || 0}%`, ac(s.summary?.avgAttention || 0)], ['Students', s.summary?.totalStudents || 0, '#e2e8f0'], ['Duration', `${s.summary?.durationMinutes || 0}m`, '#e2e8f0']].map(([l, v, c]) => (
                    <div key={l} style={{ textAlign: 'center' }}><div style={{ fontWeight: 700, color: c, fontSize: 15 }}>{v}</div><div style={{ fontSize: 10, color: '#475569' }}>{l}</div></div>
                  ))}
                </div>
                <button onClick={() => viewReport(s.sessionCode)} style={{ ...S.btn('ghost'), fontSize: 12, padding: '8px 16px' }}>View Report →</button>
              </div>
            ))
          }
        </div>
      )}
      {selected && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200, padding: 24 }} onClick={() => setSelected(null)}>
          <div style={{ background: '#0d1117', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 16, padding: 28, maxWidth: 660, width: '100%', maxHeight: '80vh', overflowY: 'auto' }} onClick={e => e.stopPropagation()}>
            <h2 style={{ fontWeight: 800, color: '#fff', marginBottom: 4 }}>Report: {selected.sessionCode}</h2>
            <p style={{ color: '#64748b', marginBottom: 20, fontSize: 13 }}>{selected.className} · {selected.subject}</p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12, marginBottom: 20 }}>
              {[['Students', selected.summary?.totalStudents], ['Avg Attn', `${selected.summary?.avgAttention || 0}%`], ['Duration', `${selected.summary?.durationMinutes || 0}m`], ['Alerts', selected.summary?.totalAlerts || 0]].map(([l, v]) => (
                <div key={l} style={{ background: '#070c14', borderRadius: 10, padding: 14, textAlign: 'center' }}><div style={{ fontSize: 20, fontWeight: 700, color: '#e2e8f0' }}>{v}</div><div style={{ fontSize: 11, color: '#475569', marginTop: 2 }}>{l}</div></div>
              ))}
            </div>
            {selected.students?.map(s => (
              <div key={s.userId} style={{ display: 'flex', justifyContent: 'space-between', padding: '9px 0', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                <div><div style={{ fontWeight: 500, color: '#e2e8f0', fontSize: 13 }}>{s.fullName}</div><div style={{ fontSize: 11, color: '#475569', fontFamily: 'monospace' }}>{s.userId}</div></div>
                <div style={{ display: 'flex', gap: 14, fontSize: 13 }}><span style={{ color: ac(s.avgAttention || 0), fontWeight: 700 }}>{s.avgAttention || 0}%</span><span style={{ color: '#64748b' }}>{s.warningCount} warnings</span></div>
              </div>
            ))}
            <button onClick={() => setSelected(null)} style={{ marginTop: 18, width: '100%', padding: 10, borderRadius: 9, border: '1px solid rgba(255,255,255,0.07)', background: 'transparent', color: '#64748b', cursor: 'pointer', fontFamily: 'inherit' }}>Close</button>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── CRITERIA — full-width, no calibration, with admin lock status ────────────
function TeacherCriteria() {
  const [data, setData] = useState(null)
  const [form, setForm] = useState({})
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    api.get('/teacher/criteria').then(({ data }) => {
      setData(data); setForm({ ...data.effective, ...(data.override || {}) })
    }).catch(() => toast.error('Failed to load criteria'))
  }, [])

  const save = async () => {
    setSaving(true)
    try { await api.put('/teacher/criteria', form); toast.success('Criteria saved!') }
    catch (err) { toast.error(err.response?.data?.error || 'Locked by administrator') }
    finally { setSaving(false) }
  }

  if (!data) return <div style={{ padding: 40, textAlign: 'center', color: '#475569' }}>Loading...</div>

  const isLocked = data.mode === 'locked'
  const isPartial = data.mode === 'partial'
  const isFull = data.mode === 'full'

  const fields = [
    { key: 'attentionThreshold', label: 'Attention Threshold', min: 20, max: 100, suffix: '%', desc: 'Minimum attention % before a warning is triggered for a student.' },
    { key: 'faceAbsentLimit', label: 'Face Absent Limit', min: 2, max: 60, suffix: 's', desc: 'Seconds a student face can be missing from camera before alert.' },
    { key: 'fatigueWarning', label: 'Fatigue Warning Count', min: 1, max: 20, suffix: '', desc: 'Number of drowsiness events before a fatigue alert is sent.' },
    { key: 'driftAlert', label: 'Drift Alert Duration', min: 5, max: 120, suffix: 's', desc: 'Seconds of sustained looking-away before drift alert fires.' },
    { key: 'alertCooldown', label: 'Alert Cooldown', min: 5, max: 120, suffix: 's', desc: 'Minimum gap between consecutive alerts for the same student.' },
  ]

  const modeColors = { locked: '#ef4444', partial: '#f59e0b', full: '#10b981' }
  const modeIcons = { locked: Lock, partial: ShieldAlert, full: Unlock }
  const ModeIcon = modeIcons[data.mode] || ShieldAlert

  return (
    <div style={{ padding: 28 }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 900, color: '#fff', marginBottom: 6 }}>AI Criteria Settings</h1>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <ModeIcon size={15} color={modeColors[data.mode]} />
            <span style={{ fontSize: 13, fontWeight: 600, color: modeColors[data.mode] }}>
              {isLocked ? 'Locked by Administrator — Read Only'
                : isPartial ? 'Partial Access — Values clamped to admin-defined range'
                : 'Full Access — You can set any values'}
            </span>
          </div>
        </div>
        <div style={{ background: '#0d1117', border: `2px solid ${modeColors[data.mode]}44`, borderRadius: 12, padding: '10px 20px', textAlign: 'center' }}>
          <div style={{ fontSize: 11, color: '#64748b', marginBottom: 3 }}>Permission Mode</div>
          <div style={{ fontSize: 18, fontWeight: 900, color: modeColors[data.mode], textTransform: 'uppercase', letterSpacing: 2 }}>{data.mode}</div>
        </div>
      </div>

      {/* Mode banner */}
      {isLocked && (
        <div style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: 12, padding: '12px 18px', marginBottom: 18, display: 'flex', alignItems: 'center', gap: 10 }}>
          <Lock size={16} color="#ef4444" />
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#ef4444', marginBottom: 1 }}>Criteria Locked by Administrator</div>
            <div style={{ fontSize: 12, color: '#94a3b8' }}>All thresholds are frozen. Contact your admin to request changes.</div>
          </div>
        </div>
      )}
      {isPartial && (
        <div style={{ background: 'rgba(245,158,11,0.07)', border: '1px solid rgba(245,158,11,0.25)', borderRadius: 12, padding: '12px 18px', marginBottom: 18, display: 'flex', alignItems: 'center', gap: 10 }}>
          <ShieldAlert size={16} color="#f59e0b" />
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#f59e0b', marginBottom: 1 }}>Partial Access — Admin-Defined Ranges Apply</div>
            <div style={{ fontSize: 12, color: '#94a3b8' }}>Adjust within the ranges your administrator has set. Values outside will be automatically clamped.</div>
          </div>
        </div>
      )}

      {/* FULL-WIDTH 3-COLUMN LAYOUT */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr 1fr', gap: 16, alignItems: 'start' }}>

        {/* COL 1: Sliders */}
        <div style={{ background: '#0d1117', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 14, padding: 22 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: '#e2e8f0', marginBottom: 20 }}>Detection Thresholds</div>
          {fields.map(({ key, label, min, max, suffix, desc }) => {
            const val = form[key] ?? data.effective[key] ?? min
            return (
              <div key={key} style={{ marginBottom: 20 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 7 }}>
                  <label style={{ fontSize: 13, fontWeight: 600, color: '#94a3b8' }}>{label}</label>
                  <span style={{ fontSize: 14, fontWeight: 800, color: isLocked ? '#475569' : '#6366f1', background: isLocked ? 'rgba(255,255,255,0.04)' : 'rgba(99,102,241,0.1)', padding: '2px 10px', borderRadius: 6 }}>{val}{suffix}</span>
                </div>
                <input type="range" min={min} max={max} value={val} disabled={isLocked}
                  onChange={e => setForm({ ...form, [key]: Number(e.target.value) })}
                  style={{ width: '100%', accentColor: isLocked ? '#334155' : '#6366f1', cursor: isLocked ? 'not-allowed' : 'pointer', opacity: isLocked ? 0.4 : 1 }}
                />
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 9, color: '#334155', marginTop: 2 }}>
                  <span>{min}{suffix}</span><span>{max}{suffix}</span>
                </div>
                <div style={{ marginTop: 5, fontSize: 11, color: '#475569', lineHeight: 1.5 }}>{desc}</div>
              </div>
            )
          })}
          <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
            <select disabled={isLocked} style={{ flex: 1, background: '#070c14', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 9, padding: '10px 12px', color: '#64748b', fontSize: 12, outline: 'none', opacity: isLocked ? 0.4 : 1, fontFamily: 'inherit' }}>
              <option>Load Preset</option>
              <option>Conservative</option>
              <option>Moderate</option>
              <option>Aggressive</option>
            </select>
            <button onClick={save} disabled={saving || isLocked} style={{ ...S.btn('primary'), flex: 1, justifyContent: 'center', opacity: isLocked ? 0.4 : 1, cursor: isLocked ? 'not-allowed' : 'pointer' }}>
              {saving ? 'Saving...' : isLocked ? <><Lock size={13} /> Locked</> : 'Save Changes'}
            </button>
          </div>
        </div>

        {/* COL 2: Effective values table */}
        <div style={{ background: '#0d1117', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 14, padding: 20 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: '#e2e8f0', marginBottom: 6 }}>Current Effective Values</div>
          <div style={{ fontSize: 12, color: '#64748b', marginBottom: 14 }}>Applied to every session you create.</div>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th style={S.th}>Parameter</th>
                <th style={S.th}>Org</th>
                <th style={S.th}>Override</th>
                <th style={S.th}>Active</th>
              </tr>
            </thead>
            <tbody>
              {fields.map(({ key, label, suffix }) => {
                const org = data.orgCriteria?.[key] ?? '—'
                const override = data.override?.[key]
                const effective = data.effective?.[key] ?? org
                return (
                  <tr key={key}>
                    <td style={{ ...S.td, fontWeight: 500, color: '#e2e8f0', fontSize: 11 }}>{label}</td>
                    <td style={{ ...S.td, fontFamily: 'monospace', color: '#475569', fontSize: 11 }}>{org}{suffix}</td>
                    <td style={{ ...S.td, fontFamily: 'monospace', color: override !== undefined ? '#f59e0b' : '#334155', fontSize: 11 }}>{override !== undefined ? `${override}${suffix}` : '—'}</td>
                    <td style={{ ...S.td, fontFamily: 'monospace', fontWeight: 700, color: '#6366f1', fontSize: 12 }}>{effective}{suffix}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>

          {/* Partial ranges */}
          {isPartial && (
            <div style={{ marginTop: 16, background: 'rgba(245,158,11,0.05)', border: '1px solid rgba(245,158,11,0.15)', borderRadius: 10, padding: 14 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#f59e0b', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 5 }}>
                <ShieldAlert size={13} /> Admin-Allowed Ranges
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                {[['Attn Min', data.orgCriteria?.attentionMin ?? 40, '%'], ['Attn Max', data.orgCriteria?.attentionMax ?? 90, '%'], ['Face Min', data.orgCriteria?.faceAbsentMin ?? 5, 's'], ['Face Max', data.orgCriteria?.faceAbsentMax ?? 30, 's']].map(([l, v, u]) => (
                  <div key={l} style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 7, padding: '8px 10px' }}>
                    <div style={{ fontSize: 10, color: '#64748b' }}>{l}</div>
                    <div style={{ fontSize: 15, fontWeight: 700, color: '#f59e0b' }}>{v}{u}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* COL 3: Permission modes explained */}
        <div style={{ background: '#0d1117', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 14, padding: 20 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: '#e2e8f0', marginBottom: 16 }}>Permission Modes</div>
          {[
            { mode: 'locked', icon: Lock, color: '#ef4444', title: 'Locked', desc: 'Admin has frozen all thresholds. You can view values but cannot change them. Contact admin to request adjustments.' },
            { mode: 'partial', icon: ShieldAlert, color: '#f59e0b', title: 'Partial', desc: 'You can adjust within admin-defined min/max ranges. Values outside those ranges are clamped automatically.' },
            { mode: 'full', icon: Unlock, color: '#10b981', title: 'Full Access', desc: 'Complete freedom to set any threshold values. You have full control over all AI detection parameters.' },
          ].map(({ mode, icon: Icon, color, title, desc }) => (
            <div key={mode} style={{ display: 'flex', gap: 12, padding: '14px 0', borderBottom: '1px solid rgba(255,255,255,0.04)', alignItems: 'flex-start' }}>
              <div style={{ width: 36, height: 36, borderRadius: 10, background: data.mode === mode ? `${color}20` : 'rgba(255,255,255,0.03)', border: `2px solid ${data.mode === mode ? color : 'rgba(255,255,255,0.06)'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, transition: 'all 0.2s' }}>
                <Icon size={16} color={data.mode === mode ? color : '#475569'} />
              </div>
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: data.mode === mode ? color : '#64748b', marginBottom: 3 }}>
                  {title} {data.mode === mode && <span style={{ fontSize: 11, background: `${color}20`, padding: '1px 7px', borderRadius: 100, marginLeft: 4 }}>Active</span>}
                </div>
                <div style={{ fontSize: 11, color: '#475569', lineHeight: 1.6 }}>{desc}</div>
              </div>
            </div>
          ))}

          {/* Quick tip box */}
          <div style={{ marginTop: 16, background: 'rgba(99,102,241,0.06)', border: '1px solid rgba(99,102,241,0.15)', borderRadius: 10, padding: 14 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#818cf8', marginBottom: 6 }}>💡 How values are applied</div>
            <div style={{ fontSize: 11, color: '#64748b', lineHeight: 1.6 }}>
              When you create a session, your override values are merged with the org defaults based on your permission mode. The <span style={{ color: '#6366f1' }}>Active</span> column shows exactly what will be used.
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── MAIN ─────────────────────────────────────────────────────────────────────
export default function TeacherDashboard() {
  return (
    <SessionProvider>
      <div style={{ display: 'flex', minHeight: '100vh', background: '#070c14', fontFamily: "'DM Sans','Segoe UI',sans-serif" }}>
        <style>{`
          @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600;700;800;900&display=swap');
          @keyframes spin{to{transform:rotate(360deg)}}
          @keyframes pulse{0%,100%{opacity:1}50%{opacity:0.4}}
          @keyframes fadeIn{from{opacity:0;transform:translateY(-5px)}to{opacity:1;transform:none}}
          input::placeholder,textarea::placeholder{color:#334155}
          input:focus,select:focus{border-color:rgba(99,102,241,0.5)!important;outline:none}
          select option{background:#0d1117;color:#e2e8f0}
          ::-webkit-scrollbar{width:5px}::-webkit-scrollbar-track{background:#0d1117}::-webkit-scrollbar-thumb{background:#1e2a3a;border-radius:3px}
        `}</style>
        <Sidebar />
        <main style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
          {/* Session banner visible on ALL pages */}
          <SessionBanner />
          <Routes>
            <Route index element={<LiveSession />} />
            <Route path="messages" element={<Messages />} />
            <Route path="history" element={<SessionHistory />} />
            <Route path="criteria" element={<TeacherCriteria />} />
          </Routes>
        </main>
      </div>
    </SessionProvider>
  )
}
