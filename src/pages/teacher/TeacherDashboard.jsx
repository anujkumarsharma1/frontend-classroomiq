import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'
import { Routes, Route } from 'react-router-dom'
import toast from 'react-hot-toast'
import { io } from 'socket.io-client'
import { Bell, Lock, Send } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import api, { errorText, getSocketUrl } from '../../utils/api'
import { AppShell, Empty, Field, Spinner, Stat } from '../../components/ui'
import { attentionTone, attentionWord } from '../../utils/attention'
import ReportModal from '../../components/ReportModal'

const SessionCtx = createContext(null)
const SUBJECTS = ['Mathematics', 'Science', 'English', 'History', 'Physics', 'Chemistry', 'Biology', 'Computer Science']
const HIDDEN_EXPRESSIONS = ['—', 'no_face', 'calibrating']
const expressionText = (e) => (e && !HIDDEN_EXPRESSIONS.includes(e) ? `Looks ${String(e).replace(/_/g, ' ').toLowerCase()}` : 'No expression yet')
const clock = () => new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })

function SessionProvider({ children }) {
  const { user } = useAuth()
  const [session, setSession] = useState(null)
  const [students, setStudents] = useState({})
  const [connected, setConnected] = useState(false)
  const [chatMsgs, setChatMsgs] = useState([])
  const socketRef = useRef(null)
  const timersRef = useRef([])

  useEffect(() => () => {
    socketRef.current?.disconnect()
    timersRef.current.forEach(clearTimeout)
  }, [])

  const patch = (userId, fn) => setStudents((p) => ({ ...p, [userId]: fn(p[userId] || { userId }) }))

  const connectSocket = useCallback((sess) => {
    if (socketRef.current?.connected) return
    const socket = io(getSocketUrl(), { auth: { token: localStorage.getItem('token') }, transports: ['websocket', 'polling'] })
    socketRef.current = socket
    socket.on('connect', () => { setConnected(true); socket.emit('teacher:join-session', { sessionCode: sess.sessionCode }) })
    socket.on('disconnect', () => setConnected(false))
    socket.on('connect_error', () => setConnected(false))
    socket.on('error', ({ message }) => toast.error(message))
    socket.on('session:active-students', ({ students: list }) => {
      const m = {}
      list.forEach((s) => { m[s.userId] = { ...s, isOnline: true } })
      setStudents(m)
    })
    socket.on('student:joined', (s) => { patch(s.userId, (o) => ({ ...o, ...s, isOnline: true })); toast(`${s.fullName} joined`) })
    socket.on('student:left', ({ userId, fullName }) => { patch(userId, (o) => ({ ...o, isOnline: false })); toast(`${fullName} left`) })
    socket.on('student:update', ({ userId, fullName, data }) => patch(userId, (o) => ({ ...o, fullName, data, isOnline: true })))
    socket.on('student:face-lost', ({ userId }) => patch(userId, (o) => ({ ...o, data: { ...o.data, faceVisible: false } })))
    socket.on('student:face-found', ({ userId }) => patch(userId, (o) => ({ ...o, data: { ...o.data, faceVisible: true } })))
    socket.on('student:multi-face', ({ userId }) => {
      patch(userId, (o) => ({ ...o, multiFace: true }))
      timersRef.current.push(setTimeout(() => patch(userId, (o) => ({ ...o, multiFace: false })), 10000))
    })
    socket.on('student:chat', ({ userId, fullName, message }) => {
      setChatMsgs((prev) => [...prev, { id: `${Date.now()}-${userId}`, from: fullName, userId, text: message, time: clock() }])
      toast(`${fullName}: ${message.slice(0, 40)}`, { duration: 5000 })
    })
  }, [])

  useEffect(() => {
    api.get('/sessions/my-sessions').then(({ data }) => {
      const live = (data.sessions || []).find((s) => s.isActive)
      if (live) { setSession(live); connectSocket(live) }
    }).catch(() => {})
  }, [connectSocket])

  const startSession = async (form) => {
    const { data } = await api.post('/sessions/create', form)
    setSession(data.session)
    connectSocket(data.session)
    toast.success(`Session ${data.session.sessionCode} is live`)
  }

  const endSession = async () => {
    if (!session) return
    const { data } = await api.post(`/sessions/${session.sessionCode}/end`)
    socketRef.current?.disconnect()
    socketRef.current = null
    setSession(null); setStudents({}); setConnected(false); setChatMsgs([])
    const avg = data.summary?.avgAttention
    toast.success(avg != null ? `Session ended. Average attention ${avg}%.` : 'Session ended.')
  }

  const nudgeStudent = (targetUserId, name, message) => {
    socketRef.current?.emit('teacher:nudge-student', {
      sessionCode: session?.sessionCode,
      targetUserId,
      message: message?.trim() || `${user?.fullName} is asking for your attention.`,
    })
    toast.success(`Sent to ${name}`)
  }

  return (
    <SessionCtx.Provider value={{ session, students, connected, chatMsgs, startSession, endSession, nudgeStudent }}>
      {children}
    </SessionCtx.Provider>
  )
}

function LiveStrip() {
  const { session, connected, students, endSession } = useContext(SessionCtx)
  const [ending, setEnding] = useState(false)
  const [confirming, setConfirming] = useState(false)
  if (!session) return null
  const online = Object.values(students).filter((s) => s.isOnline).length
  const end = async () => {
    setEnding(true)
    try { await endSession(); setConfirming(false) } catch (err) { toast.error(errorText(err, "Couldn't end the session.")) } finally { setEnding(false) }
  }
  return (
    <section className="live-strip" aria-label="Live session">
      <div className="wrap">
        <span className="row" style={{ gap: 8 }}><span className={`dot${connected ? ' live' : ''}`} />{connected ? 'Live' : 'Reconnecting'}</span>
        <span>Code <strong className="code">{session.sessionCode}</strong></span>
        <span>{online} student{online === 1 ? '' : 's'} in</span>
        <span style={{ marginLeft: 'auto' }}>
          {confirming ? (
            <span className="row" style={{ gap: 8 }}>
              <span>End for everyone?</span>
              <button className="btn btn-danger btn-sm" onClick={end} disabled={ending}>{ending ? 'Ending' : 'Yes, end it'}</button>
              <button className="btn btn-sm" style={{ color: 'inherit' }} onClick={() => setConfirming(false)}>Keep going</button>
            </span>
          ) : <button className="btn btn-danger btn-sm" onClick={() => setConfirming(true)}>End session</button>}
        </span>
      </div>
    </section>
  )
}

function StudentCard({ student, onNudge }) {
  const { userId, fullName, data, isOnline, multiFace } = student
  const attention = data?.attention ?? null
  const faceVisible = data?.faceVisible !== false
  return (
    <div className="card tight stack" style={{ gap: 14 }}>
      <div className="spread" style={{ alignItems: 'flex-start' }}>
        <div>
          <div style={{ fontWeight: 500 }}>{fullName}</div>
          <div className="xs muted">{userId}</div>
        </div>
        <span className={`pill ${isOnline ? 'good' : ''}`}><span className="dot" />{isOnline ? 'In' : 'Left'}</span>
      </div>
      {attention !== null ? (
        <>
          <div className="spread">
            <span className="stat-value" style={{ fontSize: 'var(--t-xl)' }}>{attention}%</span>
            <span className={`pill ${attentionTone(attention)}`}>{attentionWord(attention)}</span>
          </div>
          <div className="bar"><span style={{ transform: `scaleX(${attention / 100})`, background: `var(--${attentionTone(attention)})` }} /></div>
          <div className="small muted">{expressionText(data?.expression)}</div>
        </>
      ) : <p className="small muted">Waiting for the first reading</p>}
      {(multiFace || !faceVisible) && (
        <div className="row" style={{ gap: 6 }}>
          {multiFace && <span className="pill low">More than one face</span>}
          {!faceVisible && <span className="pill fair">Face out of view</span>}
        </div>
      )}
      <button className="btn btn-quiet btn-sm" onClick={() => onNudge(userId, fullName)} disabled={!isOnline}><Bell size={14} aria-hidden="true" /> Nudge</button>
    </div>
  )
}

function LiveSession() {
  const { session, students, startSession, nudgeStudent } = useContext(SessionCtx)
  const [form, setForm] = useState({ className: '', subject: '' })
  const [creating, setCreating] = useState(false)

  const create = async (e) => {
    e.preventDefault()
    setCreating(true)
    try { await startSession(form) } catch (err) { toast.error(errorText(err, "Couldn't start the session.")) } finally { setCreating(false) }
  }

  if (!session) return (
    <div style={{ maxWidth: 520, margin: '0 auto' }}>
      <div className="page-head">
        <h1>Start a session</h1>
        <p className="muted">Students join with the code you get next. Thresholds come from the Criteria tab.</p>
      </div>
      <form className="card stack" onSubmit={create} style={{ gap: 18 }}>
        <Field label="Class" hint="Optional, but it makes history easier to read." id="s-class">
          <input id="s-class" className="input" value={form.className} onChange={(e) => setForm({ ...form, className: e.target.value })} placeholder="SE IT, Division A" />
        </Field>
        <Field label="Subject" id="s-subj">
          <input id="s-subj" className="input" list="subjects" value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} placeholder="Pick or type one" />
          <datalist id="subjects">{SUBJECTS.map((s) => <option key={s} value={s} />)}</datalist>
        </Field>
        <button type="submit" className="btn btn-primary btn-block" disabled={creating}>{creating && <Spinner />}{creating ? 'Starting' : 'Start session'}</button>
      </form>
    </div>
  )

  const list = Object.values(students)
  const withData = list.filter((s) => s.data?.attention != null)
  const avg = withData.length ? Math.round(withData.reduce((a, s) => a + s.data.attention, 0) / withData.length) : null

  return (
    <>
      <div className="page-head">
        <h1>{[session.className, session.subject].filter(Boolean).join(', ') || 'Live session'}</h1>
        <p className="muted">Share the code <strong className="code" style={{ color: 'var(--ink)' }}>{session.sessionCode}</strong> with your students.</p>
      </div>
      <div className="grid g-4" style={{ marginBottom: 32 }}>
        <Stat value={`${list.filter((s) => s.isOnline).length}`} label="Students in" />
        <Stat value={avg == null ? '–' : `${avg}%`} label="Class attention now" />
        <Stat value={withData.filter((s) => s.data.attention < 40).length} label="Below 40%" />
        <Stat value={list.filter((s) => s.multiFace).length} label="Extra faces" />
      </div>
      {list.length === 0 ? (
        <div className="card"><Empty title="No one has joined yet">Students open ClassroomIQ, sign in and enter {session.sessionCode}.</Empty></div>
      ) : (
        <div className="grid g-auto">{list.map((s) => <StudentCard key={s.userId} student={s} onNudge={nudgeStudent} />)}</div>
      )}
    </>
  )
}

function Messages() {
  const { session, students, chatMsgs, nudgeStudent } = useContext(SessionCtx)
  const [to, setTo] = useState('')
  const [text, setText] = useState('')
  const list = Object.values(students)

  const send = (e) => {
    e.preventDefault()
    const s = students[to]
    if (!s || !text.trim()) return
    nudgeStudent(s.userId, s.fullName, text)
    setText('')
  }

  return (
    <>
      <div className="page-head">
        <h1>Messages</h1>
        <p className="muted">{session ? `Session ${session.sessionCode}` : 'Start a session to message students.'}</p>
      </div>
      <div className="grid g-2" style={{ alignItems: 'start' }}>
        <div className="card">
          <h2 style={{ marginBottom: 16 }}>From students</h2>
          {chatMsgs.length === 0 ? (
            <Empty title="No messages yet">Student messages need the backend to relay them. Until then, this stays empty.</Empty>
          ) : (
            <div className="chat-log" style={{ maxHeight: 420 }}>
              {chatMsgs.map((m) => (
                <div key={m.id} className="bubble">
                  <div className="xs muted">{m.from}, {m.time}</div>
                  <div>{m.text}</div>
                  <button className="btn btn-quiet btn-sm" style={{ marginTop: 8 }} onClick={() => setTo(m.userId)}>Reply</button>
                </div>
              ))}
            </div>
          )}
        </div>
        <form className="card stack" onSubmit={send} style={{ gap: 18 }}>
          <h2>Send a message</h2>
          <p className="small muted">It pops up on the student&apos;s screen as a nudge.</p>
          <Field label="To" id="m-to">
            <select id="m-to" className="input" value={to} onChange={(e) => setTo(e.target.value)} disabled={!session || list.length === 0}>
              <option value="">{list.length ? 'Pick a student' : 'No students in the session'}</option>
              {list.map((s) => <option key={s.userId} value={s.userId}>{s.fullName}</option>)}
            </select>
          </Field>
          <Field label="Message" id="m-text">
            <input id="m-text" className="input" value={text} onChange={(e) => setText(e.target.value)} maxLength={200} disabled={!session} />
          </Field>
          <button type="submit" className="btn btn-primary" disabled={!to || !text.trim()}><Send size={15} aria-hidden="true" /> Send</button>
        </form>
      </div>
    </>
  )
}

function History() {
  const [sessions, setSessions] = useState([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState(null)

  useEffect(() => {
    api.get('/sessions/my-sessions')
      .then(({ data }) => setSessions(data.sessions || []))
      .catch((err) => toast.error(errorText(err, "Couldn't load your sessions.")))
      .finally(() => setLoading(false))
  }, [])

  const open = async (code) => {
    try { const { data } = await api.get(`/sessions/${code}/report`); setSelected(data.session) } catch (err) { toast.error(errorText(err, "Couldn't open that report.")) }
  }

  return (
    <>
      <div className="page-head">
        <h1>History</h1>
        <p className="muted">Your last 20 sessions.</p>
      </div>
      {loading ? <div className="empty"><Spinner /></div> : sessions.length === 0 ? (
        <div className="card"><Empty title="No sessions yet">Finished sessions and their reports show up here.</Empty></div>
      ) : (
        <div className="stack" style={{ gap: 16 }}>
          {sessions.map((s) => (
            <div key={s.sessionCode} className="card tight spread">
              <div>
                <h2 className="h-sm"><button className="h-link" onClick={() => open(s.sessionCode)} style={{ font: 'inherit' }}>{[s.className, s.subject].filter(Boolean).join(', ') || `Session ${s.sessionCode}`}</button></h2>
                <p className="small muted">{new Date(s.startedAt).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}, code {s.sessionCode}</p>
              </div>
              <div className="row" style={{ gap: 24 }}>
                {s.isActive ? <span className="pill good"><span className="dot live" /> Live</span> : (
                  <>
                    <span className="small"><strong className="num">{s.summary?.avgAttention ?? 0}%</strong> <span className="muted">attention</span></span>
                    <span className="small"><strong className="num">{s.summary?.totalStudents ?? 0}</strong> <span className="muted">students</span></span>
                    <span className="small"><strong className="num">{s.summary?.durationMinutes ?? 0}m</strong></span>
                  </>
                )}
                <button className="btn btn-quiet btn-sm" onClick={() => open(s.sessionCode)}>Open report</button>
              </div>
            </div>
          ))}
        </div>
      )}
      {selected && <ReportModal session={selected} onClose={() => setSelected(null)} />}
    </>
  )
}

const FIELDS = [
  { key: 'attentionThreshold', label: 'Attention threshold', min: 20, max: 100, suffix: '%', desc: 'Warn when a student drops below this.' },
  { key: 'faceAbsentLimit', label: 'Face missing for', min: 2, max: 60, suffix: 's', desc: 'How long a face can leave the frame before an alert.' },
  { key: 'fatigueWarning', label: 'Drowsy moments before alert', min: 1, max: 20, suffix: '', desc: 'Count of drowsiness events.' },
  { key: 'driftAlert', label: 'Looking away for', min: 5, max: 120, suffix: 's', desc: 'Sustained looking away before a drift alert.' },
  { key: 'alertCooldown', label: 'Gap between alerts', min: 5, max: 120, suffix: 's', desc: 'Minimum time between alerts for one student.' },
]

const MODE_TEXT = {
  locked: 'Your admin has locked these values. Ask them if you need a change.',
  partial: 'You can adjust within the range your admin set. Values outside it get pulled back in.',
  full: 'You can set any value. It applies to sessions you start from now on.',
}

function Criteria() {
  const [data, setData] = useState(null)
  const [form, setForm] = useState({})
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    api.get('/teacher/criteria').then(({ data }) => {
      setData(data)
      setForm({ ...data.effective, ...(data.override || {}) })
    }).catch((err) => toast.error(errorText(err, "Couldn't load your criteria.")))
  }, [])

  const save = async () => {
    setSaving(true)
    try { await api.put('/teacher/criteria', form); toast.success('Criteria saved') } catch (err) { toast.error(errorText(err, "Couldn't save.")) } finally { setSaving(false) }
  }

  if (!data) return <div className="empty"><Spinner /></div>
  const locked = data.mode === 'locked'

  return (
    <>
      <div className="page-head spread">
        <div>
          <h1>Criteria</h1>
          <p className="muted" style={{ maxWidth: '52ch' }}>{MODE_TEXT[data.mode] || MODE_TEXT.locked}</p>
        </div>
        <button className="btn btn-primary" onClick={save} disabled={saving || locked}>{locked ? <><Lock size={15} aria-hidden="true" /> Locked</> : saving ? 'Saving' : 'Save criteria'}</button>
      </div>
      <div className="grid g-2" style={{ alignItems: 'start' }}>
        <div className="card stack">
          <h2>Thresholds</h2>
          {FIELDS.map(({ key, label, min, max, suffix, desc }) => {
            const val = form[key] ?? data.effective?.[key] ?? min
            return (
              <div key={key} className="field" style={{ gap: 4 }}>
                <div className="spread" style={{ gap: 8 }}>
                  <label htmlFor={`t-${key}`} style={{ fontWeight: 500 }}>{label}</label>
                  <span className="num" style={{ fontWeight: 600, color: 'var(--accent)' }}>{val}{suffix}</span>
                </div>
                <input id={`t-${key}`} type="range" min={min} max={max} value={val} disabled={locked} onChange={(e) => setForm({ ...form, [key]: Number(e.target.value) })} aria-describedby={`t-${key}-d`} />
                <span id={`t-${key}-d`} className="hint">{desc}</span>
              </div>
            )
          })}
        </div>
        <div className="card">
          <h2 style={{ marginBottom: 8 }}>What applies</h2>
          <p className="small muted" style={{ marginBottom: 16 }}>The last column is what your next session uses.</p>
          <div className="table-wrap">
            <table>
              <thead><tr><th>Setting</th><th>School</th><th>Yours</th><th>Used</th></tr></thead>
              <tbody>
                {FIELDS.map(({ key, label, suffix }) => {
                  const org = data.orgCriteria?.[key]
                  const mine = data.override?.[key]
                  const used = data.effective?.[key] ?? org
                  return (
                    <tr key={key}>
                      <td>{label}</td>
                      <td className="num muted">{org != null ? `${org}${suffix}` : '–'}</td>
                      <td className="num muted">{mine != null ? `${mine}${suffix}` : '–'}</td>
                      <td className="num" style={{ fontWeight: 600 }}>{used != null ? `${used}${suffix}` : '–'}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          {data.mode === 'partial' && (
            <p className="small muted" style={{ marginTop: 16 }}>
              Allowed range: attention {data.orgCriteria?.attentionMin ?? '–'}–{data.orgCriteria?.attentionMax ?? '–'}%, face missing {data.orgCriteria?.faceAbsentMin ?? '–'}–{data.orgCriteria?.faceAbsentMax ?? '–'}s.
            </p>
          )}
        </div>
      </div>
    </>
  )
}

function Shell() {
  const { session, chatMsgs } = useContext(SessionCtx)
  const tabs = [
    { to: '/teacher', label: session ? 'Live session' : 'Start', end: true },
    { to: '/teacher/messages', label: 'Messages', badge: chatMsgs.length ? <span className="pill good xs">{chatMsgs.length}</span> : null },
    { to: '/teacher/history', label: 'History' },
    { to: '/teacher/criteria', label: 'Criteria' },
  ]
  return (
    <AppShell tabs={tabs} roleLabel="Teacher" banner={<LiveStrip />}>
      <Routes>
        <Route index element={<LiveSession />} />
        <Route path="messages" element={<Messages />} />
        <Route path="history" element={<History />} />
        <Route path="criteria" element={<Criteria />} />
      </Routes>
    </AppShell>
  )
}

export default function TeacherDashboard() {
  return (
    <SessionProvider>
      <Shell />
    </SessionProvider>
  )
}
