import { useCallback, useEffect, useState } from 'react'
import { Routes, Route } from 'react-router-dom'
import toast from 'react-hot-toast'
import { Key, Upload, UserPlus } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import api, { errorText } from '../../utils/api'
import ReportModal from '../../components/ReportModal'
import { AppShell, Empty, Field, HeadingLink, Modal, PasswordInput, Spinner, Stat } from '../../components/ui'
import { attentionTone } from '../../utils/attention'

const TABS = [
  { to: '/admin', label: 'Overview', end: true },
  { to: '/admin/teachers', label: 'Teachers' },
  { to: '/admin/students', label: 'Students' },
  { to: '/admin/sessions', label: 'Sessions' },
  { to: '/admin/settings', label: 'Settings' },
]

const fmtDate = (d) => (d ? new Date(d).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' }) : '')

function SessionStatus({ active }) {
  return active ? <span className="pill good"><span className="dot live" /> Live</span> : <span className="pill">Ended</span>
}

function SessionsTable({ sessions, onOpen }) {
  return (
    <div className="table-wrap">
      <table>
        <thead><tr><th>Code</th><th>Teacher</th><th>Class</th><th>Students</th><th>Avg attention</th><th>Started</th><th>Status</th></tr></thead>
        <tbody>
          {sessions.map((s) => {
            const avg = s.summary?.avgAttention
            return (
              <tr key={s.sessionCode}>
                <td>{onOpen ? <button className="code" style={{ color: 'var(--accent)' }} onClick={() => onOpen(s)}>{s.sessionCode}</button> : <span className="code">{s.sessionCode}</span>}</td>
                <td>{s.teacherName}</td>
                <td>{[s.className, s.subject].filter(Boolean).join(', ') || <span className="muted">Not named</span>}</td>
                <td className="num">{s.summary?.totalStudents ?? 0}</td>
                <td>{s.isActive || avg == null ? <span className="muted">After it ends</span> : <span className={`pill ${attentionTone(avg)} num`}>{avg}%</span>}</td>
                <td className="small muted">{fmtDate(s.startedAt)}</td>
                <td><SessionStatus active={s.isActive} /></td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

function Overview() {
  const { institution, user } = useAuth()
  const [data, setData] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    Promise.all([api.get('/admin/teachers'), api.get('/admin/students'), api.get('/admin/sessions')])
      .then(([t, s, sess]) => setData({ teachers: t.data.count, students: s.data.count, sessions: sess.data.sessions || [] }))
      .catch((err) => setError(errorText(err, "Couldn't load the overview.")))
  }, [])

  if (error) return <div className="card"><Empty title="Nothing to show yet">{error}</Empty></div>
  if (!data) return <div className="empty"><Spinner /></div>

  const live = data.sessions.filter((s) => s.isActive).length
  const ended = data.sessions.filter((s) => !s.isActive && s.summary?.avgAttention != null)
  const avg = ended.length ? Math.round(ended.reduce((a, s) => a + s.summary.avgAttention, 0) / ended.length) : null

  return (
    <>
      <div className="page-head">
        <h1>Hello, {user?.fullName?.split(' ')[0]}</h1>
        <p className="muted">{institution?.name}</p>
      </div>
      <div className="grid g-4" style={{ marginBottom: 40 }}>
        <Stat value={data.teachers} label="Teachers" to="/admin/teachers" />
        <Stat value={data.students} label="Students" to="/admin/students" />
        <Stat value={live} label="Live sessions" to="/admin/sessions" />
        <Stat value={avg == null ? '–' : `${avg}%`} label={ended.length ? `Avg attention, last ${ended.length} sessions` : 'Avg attention, once a session ends'} />
      </div>
      <div className="card">
        <div style={{ marginBottom: 12 }}><HeadingLink to="/admin/sessions">Recent sessions</HeadingLink></div>
        {data.sessions.length === 0
          ? <Empty title="No sessions yet">Sessions show up here once a teacher starts one.</Empty>
          : <SessionsTable sessions={data.sessions.slice(0, 5)} />}
      </div>
    </>
  )
}

const BLANK = { fullName: '', email: '', department: '', className: '', rollNumber: '', password: '' }

function UserManagement({ role }) {
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [panel, setPanel] = useState(null)
  const [form, setForm] = useState(BLANK)
  const [bulkText, setBulkText] = useState('')
  const [busy, setBusy] = useState(false)
  const [resetFor, setResetFor] = useState(null)
  const [newPwd, setNewPwd] = useState('')
  const label = role === 'teacher' ? 'Teacher' : 'Student'
  const plural = `${label.toLowerCase()}s`

  const load = useCallback(async () => {
    try {
      const { data } = await api.get(`/admin/${role}s`)
      setUsers(data[`${role}s`] || [])
    } catch (err) {
      toast.error(errorText(err, `Couldn't load ${plural}.`))
    } finally {
      setLoading(false)
    }
  }, [role, plural])

  useEffect(() => { setLoading(true); setPanel(null); load() }, [load])

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value })

  const add = async (e) => {
    e.preventDefault()
    setBusy(true)
    try {
      const { data } = await api.post(`/admin/${role}s`, form)
      const created = data[role]
      toast.success(`Added ${created.fullName}. Their ID is ${created.userId}.`, { duration: 8000 })
      setForm(BLANK)
      setPanel(null)
      load()
    } catch (err) {
      toast.error(errorText(err, `Couldn't add the ${label.toLowerCase()}.`))
    } finally {
      setBusy(false)
    }
  }

  const bulk = async () => {
    const rows = bulkText.trim().split('\n').map((r) => {
      const [a, b, c, d] = r.split(',').map((s) => s?.trim())
      return role === 'teacher' ? { fullName: a, email: b, department: c, password: d } : { fullName: a, className: b, rollNumber: c, password: d }
    }).filter((r) => r.fullName)
    const missing = rows.filter((r) => !r.password || r.password.length < 6).length
    if (!rows.length) return toast.error('Paste at least one row.')
    if (missing) return toast.error(`${missing} row${missing > 1 ? 's need' : ' needs'} a password of 6 or more characters.`)
    setBusy(true)
    try {
      const { data } = await api.post(`/admin/${role}s/bulk`, { [`${role}s`]: rows })
      toast.success(`Added ${data.created.length}${data.failed.length ? `, ${data.failed.length} failed` : ''}.`)
      setBulkText('')
      setPanel(null)
      load()
    } catch (err) {
      toast.error(errorText(err, 'Import failed.'))
    } finally {
      setBusy(false)
    }
  }

  const toggleActive = async (u) => {
    try {
      await api.patch(`/admin/users/${u.userId}/${u.isActive ? 'deactivate' : 'activate'}`)
      toast.success(u.isActive ? `${u.fullName} can no longer sign in` : `${u.fullName} can sign in again`)
      load()
    } catch (err) {
      toast.error(errorText(err, 'That didn’t work.'))
    }
  }

  const resetPwd = async (e) => {
    e.preventDefault()
    try {
      await api.patch(`/admin/users/${resetFor.userId}/reset-password`, { newPassword: newPwd })
      toast.success(`Password changed for ${resetFor.fullName}`)
      setResetFor(null)
      setNewPwd('')
    } catch (err) {
      toast.error(errorText(err, "Couldn't change the password."))
    }
  }

  return (
    <>
      <div className="page-head spread">
        <div>
          <h1>{label}s</h1>
          <p className="muted">{loading ? 'Loading' : `${users.length} in your institution`}</p>
        </div>
        <div className="row">
          <button className="btn btn-quiet" onClick={() => setPanel(panel === 'bulk' ? null : 'bulk')} aria-expanded={panel === 'bulk'}><Upload size={16} aria-hidden="true" /> Import a list</button>
          <button className="btn btn-primary" onClick={() => setPanel(panel === 'add' ? null : 'add')} aria-expanded={panel === 'add'}><UserPlus size={16} aria-hidden="true" /> Add {label.toLowerCase()}</button>
        </div>
      </div>

      {panel === 'add' && (
        <form className="card" onSubmit={add} style={{ marginBottom: 24 }}>
          <h2 style={{ marginBottom: 20 }}>Add a {label.toLowerCase()}</h2>
          <div className="grid g-2" style={{ gap: 18 }}>
            <Field label="Full name" id="u-name"><input id="u-name" className="input" value={form.fullName} onChange={set('fullName')} required /></Field>
            {role === 'teacher' ? (
              <>
                <Field label="Email (optional)" id="u-email"><input id="u-email" className="input" type="email" value={form.email} onChange={set('email')} /></Field>
                <Field label="Department (optional)" id="u-dept"><input id="u-dept" className="input" value={form.department} onChange={set('department')} /></Field>
              </>
            ) : (
              <>
                <Field label="Class (optional)" id="u-class"><input id="u-class" className="input" value={form.className} onChange={set('className')} /></Field>
                <Field label="Roll number (optional)" id="u-roll"><input id="u-roll" className="input" value={form.rollNumber} onChange={set('rollNumber')} /></Field>
              </>
            )}
            <Field label="Starting password" hint="At least 6 characters. Share it with them privately." id="u-pwd">
              <PasswordInput id="u-pwd" value={form.password} onChange={set('password')} autoComplete="new-password" minLength={6} />
            </Field>
          </div>
          <div className="row" style={{ marginTop: 24 }}>
            <button type="submit" className="btn btn-primary" disabled={busy}>{busy && <Spinner />}Add {label.toLowerCase()}</button>
            <button type="button" className="btn btn-quiet" onClick={() => setPanel(null)}>Cancel</button>
          </div>
        </form>
      )}

      {panel === 'bulk' && (
        <div className="card" style={{ marginBottom: 24 }}>
          <h2 style={{ marginBottom: 8 }}>Import a list</h2>
          <p className="small muted" style={{ marginBottom: 16 }}>One {label.toLowerCase()} per line: {role === 'teacher' ? 'name, email, department, password' : 'name, class, roll number, password'}.</p>
          <Field label="Rows" id="u-bulk">
            <textarea id="u-bulk" className="input" rows={6} value={bulkText} onChange={(e) => setBulkText(e.target.value)} />
          </Field>
          <div className="row" style={{ marginTop: 20 }}>
            <button className="btn btn-primary" onClick={bulk} disabled={busy}>{busy && <Spinner />}Import</button>
            <button className="btn btn-quiet" onClick={() => setPanel(null)}>Cancel</button>
          </div>
        </div>
      )}

      <div className="card" style={{ padding: '8px 8px 4px' }}>
        {loading ? <div className="empty"><Spinner /></div> : users.length === 0 ? (
          <Empty title={`No ${plural} yet`}>Add one, or import a list from a spreadsheet.</Empty>
        ) : (
          <div className="table-wrap">
            <table>
              <thead><tr><th>ID</th><th>Name</th><th>{role === 'teacher' ? 'Email' : 'Class'}</th><th>{role === 'teacher' ? 'Department' : 'Roll no.'}</th><th>Status</th><th><span className="sr-only">Actions</span></th></tr></thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.userId}>
                    <td className="code small">{u.userId}</td>
                    <td style={{ fontWeight: 500 }}>{u.fullName}</td>
                    <td className="muted">{(role === 'teacher' ? u.email : u.className) || '–'}</td>
                    <td className="muted">{(role === 'teacher' ? u.department : u.rollNumber) || '–'}</td>
                    <td>{u.isActive ? <span className="pill good">Active</span> : <span className="pill low">Turned off</span>}</td>
                    <td>
                      <div className="row" style={{ gap: 6, justifyContent: 'flex-end', flexWrap: 'nowrap' }}>
                        <button className="icon-btn" onClick={() => setResetFor(u)} aria-label={`Change password for ${u.fullName}`} title="Change password"><Key size={17} /></button>
                        <button className={`btn btn-sm ${u.isActive ? 'btn-danger' : 'btn-quiet'}`} onClick={() => toggleActive(u)}>{u.isActive ? 'Turn off' : 'Turn on'}</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {resetFor && (
        <Modal title="Change password" onClose={() => { setResetFor(null); setNewPwd('') }}>
          <form onSubmit={resetPwd} className="stack" style={{ gap: 18 }}>
            <p className="muted">For {resetFor.fullName} ({resetFor.userId}). They&apos;ll use it next time they sign in.</p>
            <Field label="New password" hint="At least 6 characters." id="reset-pwd">
              <PasswordInput id="reset-pwd" value={newPwd} onChange={(e) => setNewPwd(e.target.value)} autoComplete="new-password" minLength={6} />
            </Field>
            <button type="submit" className="btn btn-primary" disabled={newPwd.length < 6}>Change password</button>
          </form>
        </Modal>
      )}
    </>
  )
}

function Sessions() {
  const [sessions, setSessions] = useState([])
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState(null)

  const openReport = async (s) => {
    try {
      const { data } = await api.get(`/sessions/${s.sessionCode}/report`)
      setOpen(data.session)
    } catch (err) {
      toast.error(errorText(err, "Couldn't open that report."))
    }
  }

  useEffect(() => {
    api.get('/admin/sessions')
      .then(({ data }) => setSessions(data.sessions || []))
      .catch((err) => toast.error(errorText(err, "Couldn't load sessions.")))
      .finally(() => setLoading(false))
  }, [])

  const live = sessions.filter((s) => s.isActive)

  return (
    <>
      <div className="page-head">
        <h1>Sessions</h1>
        <p className="muted">{loading ? 'Loading' : `${live.length} live, ${sessions.length - live.length} ended. Teachers end their own sessions.`}</p>
      </div>
      <div className="card" style={{ padding: '8px 8px 4px' }}>
        {loading ? <div className="empty"><Spinner /></div> : sessions.length === 0
          ? <Empty title="No sessions yet">When a teacher starts a session, it appears here.</Empty>
          : <SessionsTable sessions={sessions} onOpen={openReport} />}
      </div>
      {open && <ReportModal session={open} onClose={() => setOpen(null)} />}
    </>
  )
}

const CRITERIA = [
  { field: 'attentionThreshold', label: 'Attention threshold', min: 20, max: 100, suffix: '%', desc: 'Warn when a student drops below this.' },
  { field: 'faceAbsentLimit', label: 'Face missing for', min: 2, max: 60, suffix: 's', desc: 'How long a face can leave the frame before an alert.' },
  { field: 'fatigueWarning', label: 'Drowsy moments before alert', min: 1, max: 20, suffix: '', desc: 'Count of drowsiness events.' },
  { field: 'driftAlert', label: 'Looking away for', min: 5, max: 120, suffix: 's', desc: 'Sustained looking away before a drift alert.' },
  { field: 'alertCooldown', label: 'Gap between alerts', min: 10, max: 120, suffix: 's', desc: 'Minimum time between alerts for one student.' },
]

function SliderRow({ id, label, desc, min, max, suffix, value, onChange, disabled }) {
  return (
    <div className="field" style={{ gap: 4 }}>
      <div className="spread" style={{ gap: 8 }}>
        <label htmlFor={id} style={{ fontWeight: 500 }}>{label}</label>
        <span className="num" style={{ fontWeight: 600, color: 'var(--accent)' }}>{value}{suffix}</span>
      </div>
      <input id={id} type="range" min={min} max={max} value={value} disabled={disabled} onChange={(e) => onChange(Number(e.target.value))} aria-describedby={`${id}-d`} />
      <span id={`${id}-d`} className="hint">{desc}</span>
    </div>
  )
}

const MODES = {
  locked: { title: 'Locked', desc: 'Teachers see the values but cannot change them.' },
  partial: { title: 'Within a range', desc: 'Teachers can adjust inside the limits you set below.' },
  full: { title: 'Open', desc: 'Teachers can set any value.' },
}

function Settings() {
  const [inst, setInst] = useState(null)
  const [criteria, setCriteria] = useState({ attentionThreshold: 60, faceAbsentLimit: 10, fatigueWarning: 3, driftAlert: 15, alertCooldown: 20 })
  const [perms, setPerms] = useState({ mode: 'partial', attentionMin: 40, attentionMax: 90, faceAbsentMin: 5, faceAbsentMax: 30 })
  const [savedMode, setSavedMode] = useState(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    api.get('/admin/settings').then(({ data }) => {
      setInst(data.institution)
      if (data.institution.criteria) setCriteria((c) => ({ ...c, ...data.institution.criteria }))
      if (data.institution.teacherPermission) {
        setPerms((p) => ({ ...p, ...data.institution.teacherPermission }))
        setSavedMode(data.institution.teacherPermission.mode || 'partial')
      }
    }).catch((err) => toast.error(errorText(err, "Couldn't load settings.")))
  }, [])

  const save = async () => {
    setSaving(true)
    try {
      await api.put('/admin/criteria', criteria)
      await api.put('/admin/teacher-permissions', perms)
      setSavedMode(perms.mode)
      toast.success('Settings saved')
    } catch (err) {
      toast.error(errorText(err, "Couldn't save settings."))
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      <div className="page-head spread">
        <div>
          <h1>Detection settings</h1>
          <p className="muted">{inst?.name ? `Defaults for every class at ${inst.name}.` : 'Loading'}</p>
        </div>
        <button className="btn btn-primary" onClick={save} disabled={saving || !inst}>{saving && <Spinner />}Save settings</button>
      </div>
      <div className="grid g-2" style={{ alignItems: 'start' }}>
        <div className="card stack">
          <h2>Thresholds</h2>
          {CRITERIA.map((c) => (
            <SliderRow key={c.field} id={`c-${c.field}`} {...c} value={criteria[c.field] ?? c.min} onChange={(v) => setCriteria((p) => ({ ...p, [c.field]: v }))} />
          ))}
        </div>
        <div className="card stack">
          <h2>What teachers can change</h2>
          <div className="stack" style={{ gap: 10 }} role="radiogroup" aria-label="Teacher permission">
            {Object.entries(MODES).map(([mode, m]) => (
              <button key={mode} type="button" role="radio" aria-checked={perms.mode === mode} className="choice" onClick={() => setPerms({ ...perms, mode })}>
                <span>
                  <span className="row" style={{ gap: 8 }}>
                    <span style={{ fontWeight: 500 }}>{m.title}</span>
                    {savedMode === mode && <span className="pill good">Current</span>}
                  </span>
                  <span className="small muted">{m.desc}</span>
                </span>
              </button>
            ))}
          </div>
          {perms.mode === 'partial' && (
            <div className="grid g-2" style={{ gap: 16 }}>
              {[['attentionMin', 'Lowest attention %', 20, 80], ['attentionMax', 'Highest attention %', 50, 100], ['faceAbsentMin', 'Shortest face-missing (s)', 2, 20], ['faceAbsentMax', 'Longest face-missing (s)', 10, 60]].map(([k, l, mn, mx]) => (
                <Field key={k} label={l} id={`p-${k}`}>
                  <input id={`p-${k}`} className="input num" type="number" min={mn} max={mx} value={perms[k] ?? ''} onChange={(e) => setPerms({ ...perms, [k]: Number(e.target.value) })} />
                </Field>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  )
}

export default function AdminDashboard() {
  return (
    <AppShell tabs={TABS} roleLabel="Admin">
      <Routes>
        <Route index element={<Overview />} />
        <Route path="teachers" element={<UserManagement role="teacher" />} />
        <Route path="students" element={<UserManagement role="student" />} />
        <Route path="sessions" element={<Sessions />} />
        <Route path="settings" element={<Settings />} />
      </Routes>
    </AppShell>
  )
}
