import React, { useState, useEffect, useRef } from 'react'
import { Routes, Route, NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import api from '../../utils/api'
import toast from 'react-hot-toast'
import {
  LayoutDashboard, Users, GraduationCap, MonitorPlay,
  Settings, LogOut, UserPlus, Upload, Key, UserX,
  UserCheck, BarChart2, AlertTriangle, TrendingUp, Clock
} from 'lucide-react'

// ─── Shared styles ────────────────────────────────────────────────────────────
const S = {
  page: { minHeight: '100vh', background: '#070c14', fontFamily: "'DM Sans','Segoe UI',sans-serif", color: '#e2e8f0' },
  sidebar: { width: 220, minHeight: '100vh', background: '#0d1117', borderRight: '1px solid rgba(255,255,255,0.06)', display: 'flex', flexDirection: 'column', flexShrink: 0 },
  main: { flex: 1, overflowY: 'auto', background: '#070c14' },
  card: { background: '#0d1117', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 14, padding: 20 },
  input: { width: '100%', background: '#070c14', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 9, padding: '10px 13px', color: '#e2e8f0', fontSize: 13, outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit' },
  label: { display: 'block', fontSize: 12, fontWeight: 500, color: '#64748b', marginBottom: 6 },
  btn: (variant = 'primary') => ({
    padding: '10px 20px', borderRadius: 9, border: 'none', cursor: 'pointer',
    fontWeight: 600, fontSize: 13, fontFamily: 'inherit',
    background: variant === 'primary' ? '#6366f1' : variant === 'danger' ? '#ef4444' : variant === 'success' ? '#10b981' : 'rgba(255,255,255,0.06)',
    color: variant === 'ghost' ? '#64748b' : '#fff',
    border: variant === 'ghost' ? '1px solid rgba(255,255,255,0.08)' : 'none',
    boxShadow: variant === 'primary' ? '0 4px 14px rgba(99,102,241,0.3)' : 'none',
    display: 'inline-flex', alignItems: 'center', gap: 6, transition: 'all 0.2s',
  }),
  badge: (color) => ({ display: 'inline-flex', alignItems: 'center', padding: '3px 10px', borderRadius: 100, fontSize: 11, fontWeight: 600, background: color === 'green' ? 'rgba(16,185,129,0.12)' : color === 'red' ? 'rgba(239,68,68,0.12)' : color === 'blue' ? 'rgba(99,102,241,0.12)' : 'rgba(245,158,11,0.12)', color: color === 'green' ? '#10b981' : color === 'red' ? '#ef4444' : color === 'blue' ? '#818cf8' : '#f59e0b' }),
  attnColor: (p) => p >= 70 ? '#10b981' : p >= 40 ? '#f59e0b' : '#ef4444',
  slider: { width: '100%', accentColor: '#6366f1', cursor: 'pointer', height: 4 },
  th: { padding: '10px 14px', fontSize: 11, fontWeight: 600, color: '#475569', textAlign: 'left', background: '#070c14', borderBottom: '1px solid rgba(255,255,255,0.05)', whiteSpace: 'nowrap' },
  td: { padding: '12px 14px', fontSize: 13, color: '#94a3b8', borderBottom: '1px solid rgba(255,255,255,0.04)' },
}

// ─── Mini attention line chart ────────────────────────────────────────────────
function MiniLineChart({ students }) {
  const w = 580, h = 220
  const colors = ['#6366f1','#10b981','#f59e0b','#ef4444','#06b6d4','#8b5cf6','#ec4899']
  return (
    <svg width="100%" viewBox={`0 0 ${w} ${h}`} style={{ display: 'block' }}>
      {/* Grid */}
      {[0,20,40,60,80,100].map(v => {
        const y = h - (v / 100) * (h - 20) - 10
        return <g key={v}><line x1={30} y1={y} x2={w} y2={y} stroke="rgba(255,255,255,0.04)" strokeWidth="1"/><text x={24} y={y+4} fill="#334155" fontSize="9" textAnchor="end">{v}</text></g>
      })}
      {/* Lines */}
      {students.map((s, si) => {
        const pts = s.data.map((v, i) => `${30 + (i / (s.data.length-1)) * (w-30)},${h - (v/100)*(h-20) - 10}`).join(' ')
        return <g key={si}>
          <polyline points={pts} fill="none" stroke={colors[si % colors.length]} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" opacity="0.85"/>
          <circle cx={30 + ((s.data.length-1)/(s.data.length-1))*(w-30)} cy={h-(s.data[s.data.length-1]/100)*(h-20)-10} r="3" fill={colors[si % colors.length]}/>
        </g>
      })}
      {/* X labels */}
      {['10:30','11:00','11:30','12:00','12:30','13:00','13:30'].map((t,i) => (
        <text key={t} x={30 + (i/6)*(w-30)} y={h+2} fill="#334155" fontSize="9" textAnchor="middle">{t}</text>
      ))}
      <text x={w/2} y={h+14} fill="#475569" fontSize="9" textAnchor="middle">Time (hours)</text>
    </svg>
  )
}

// ─── Calibration histogram ────────────────────────────────────────────────────
function CalibrationChart({ threshold }) {
  const w = 320, h = 140
  const bars = Array.from({length:24}, (_,i) => {
    const x = i*5
    const h2 = Math.round(15*Math.exp(-0.5*Math.pow((x-30)/12,2)))
    return { x, h: h2 }
  })
  const maxH = Math.max(...bars.map(b=>b.h))
  return (
    <svg width="100%" viewBox={`0 0 ${w} ${h+30}`} style={{ display: 'block' }}>
      {/* Zones */}
      <rect x={0} y={0} width={(threshold*0.6/60)*w} height={h} fill="rgba(239,68,68,0.12)"/>
      <rect x={(threshold*0.6/60)*w} y={0} width={(threshold*0.4/60)*w} height={h} fill="rgba(16,185,129,0.1)"/>
      <rect x={(threshold/60)*w} y={0} width={w-(threshold/60)*w} height={h} fill="rgba(245,158,11,0.1)"/>
      <text x={(threshold*0.3/60)*w} y={14} fill="#ef444488" fontSize="8" textAnchor="middle">Under responsive</text>
      <text x={(threshold*0.75/60)*w} y={14} fill="#10b98188" fontSize="8" textAnchor="middle">Optimal Alerting</text>
      <text x={(threshold*1.2/60)*w} y={14} fill="#f59e0b88" fontSize="8" textAnchor="middle">Over responsive</text>
      {/* Bars */}
      {bars.map((b,i) => (
        <rect key={i} x={i*(w/24)} y={h-(b.h/maxH)*(h-20)} width={w/24-1} height={(b.h/maxH)*(h-20)} fill={b.x < threshold*0.6 ? '#ef444466' : b.x < threshold ? '#10b98166' : '#f59e0b66'} rx="1"/>
      ))}
      {/* Threshold line */}
      <line x1={(threshold/60)*w} y1={0} x2={(threshold/60)*w} y2={h} stroke="#6366f1" strokeWidth="1.5" strokeDasharray="4"/>
      {/* Axis */}
      {[0,10,20,30,40,50,60].map(v => (
        <text key={v} x={(v/60)*w} y={h+14} fill="#475569" fontSize="7" textAnchor="middle">{v}</text>
      ))}
      <text x={w/2} y={h+24} fill="#475569" fontSize="7" textAnchor="middle">Threshold Settings</text>
      <text x={-h/2} y={8} fill="#475569" fontSize="7" textAnchor="middle" transform="rotate(-90)">Alert Frequency</text>
    </svg>
  )
}

// ─── SIDEBAR ──────────────────────────────────────────────────────────────────
function Sidebar() {
  const { logout, user, institution } = useAuth()
  const navigate = useNavigate()
  const links = [
    { to: '/admin', icon: LayoutDashboard, label: 'Overview', end: true },
    { to: '/admin/teachers', icon: GraduationCap, label: 'Teachers' },
    { to: '/admin/students', icon: Users, label: 'Students' },
    { to: '/admin/sessions', icon: MonitorPlay, label: 'Active Sessions' },
    { to: '/admin/settings', icon: Settings, label: 'Settings' },
  ]
  return (
    <aside style={S.sidebar}>
      <div style={{ padding: '18px 16px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
          <div style={{ width: 32, height: 32, borderRadius: 8, overflow: 'hidden', flexShrink: 0, border: '1px solid rgba(255,255,255,0.1)' }}>
            <img src="/logo.jpg" alt="ClassroomIQ" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          </div>
          <div>
            <div style={{ fontWeight: 800, fontSize: 14, color: '#e2e8f0', letterSpacing: '-0.2px' }}>ClassroomIQ</div>
            <div style={{ fontSize: 10, color: '#4a90d9', marginTop: 1 }}>{institution?.name?.slice(0,16) || 'Institution'}</div>
          </div>
        </div>
      </div>
      <nav style={{ flex: 1, padding: '14px 10px' }}>
        {links.map(({ to, icon: Icon, label, end }) => (
          <NavLink key={to} to={to} end={end} style={({ isActive }) => ({
            display: 'flex', alignItems: 'center', gap: 10,
            padding: '10px 13px', borderRadius: 9, marginBottom: 3,
            textDecoration: 'none', fontSize: 13, fontWeight: isActive ? 600 : 400,
            color: isActive ? '#fff' : '#64748b',
            background: isActive ? '#6366f1' : 'transparent',
            transition: 'all 0.15s',
            boxShadow: isActive ? '0 4px 12px rgba(99,102,241,0.3)' : 'none',
          })}>
            <Icon size={15} /> {label}
          </NavLink>
        ))}
      </nav>
      <div style={{ padding: '14px 16px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: '#e2e8f0', marginBottom: 1 }}>{user?.fullName}</div>
        <div style={{ fontSize: 10, color: '#475569', marginBottom: 12 }}>Administrator</div>
        <button onClick={() => { logout(); navigate('/login') }} style={{ ...S.btn('ghost'), width: '100%', justifyContent: 'center', fontSize: 12 }}>
          <LogOut size={13} /> Sign Out
        </button>
      </div>
    </aside>
  )
}

// ─── OVERVIEW ─────────────────────────────────────────────────────────────────
function Overview() {
  const { institution, user } = useAuth()
  const [stats, setStats] = useState({ teachers: 0, students: 0, sessions: 0, active: 0 })
  const [recent, setRecent] = useState([])
  const [liveAttn, setLiveAttn] = useState(73)

  useEffect(() => {
    const load = async () => {
      try {
        const [t, s, sess] = await Promise.all([api.get('/admin/teachers'), api.get('/admin/students'), api.get('/admin/sessions')])
        setStats({ teachers: t.data.count, students: s.data.count, sessions: sess.data.count, active: sess.data.sessions.filter(x => x.isActive).length })
        setRecent(sess.data.sessions.slice(0, 5))
      } catch {}
    }
    load()
    const t = setInterval(() => setLiveAttn(70 + Math.floor(Math.random() * 18)), 2500)
    return () => clearInterval(t)
  }, [])

  const statCards = [
    { label: 'Total Teachers', value: stats.teachers, color: '#6366f1', icon: GraduationCap },
    { label: 'Total Students', value: stats.students, color: '#10b981', icon: Users },
    { label: 'Total Sessions', value: stats.sessions, color: '#4a90d9', icon: MonitorPlay },
    { label: 'Active Sessions', value: stats.active, color: '#f59e0b', icon: BarChart2 },
  ]

  return (
    <div style={{ padding: 28 }}>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 26, fontWeight: 900, color: '#fff', marginBottom: 3 }}>Welcome, {user?.fullName?.toUpperCase()}</h1>
        <p style={{ fontSize: 13, color: '#64748b' }}>{institution?.name} · Admin Overview</p>
      </div>

      {/* Stat cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 14, marginBottom: 24 }}>
        {statCards.map(({ label, value, color, icon: Icon }) => (
          <div key={label} style={{ ...S.card, borderTop: `3px solid ${color}`, padding: 18 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div><div style={{ fontSize: 30, fontWeight: 900, color, lineHeight: 1 }}>{value}</div><div style={{ fontSize: 12, color: '#64748b', marginTop: 4 }}>{label}</div></div>
              <div style={{ width: 38, height: 38, borderRadius: 10, background: `${color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Icon size={18} color={color} /></div>
            </div>
          </div>
        ))}
      </div>

      {/* Live attention + recent sessions */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 14 }}>
        <div style={S.card}>
          <div style={{ fontSize: 14, fontWeight: 700, color: '#e2e8f0', marginBottom: 16 }}>Live Institution Health</div>
          <div style={{ textAlign: 'center', padding: '20px 0' }}>
            <div style={{ fontSize: 52, fontWeight: 900, color: S.attnColor(liveAttn), lineHeight: 1, transition: 'color 0.5s' }}>{liveAttn}%</div>
            <div style={{ fontSize: 12, color: '#64748b', marginTop: 6 }}>Average Attention Score</div>
            <div style={{ marginTop: 16, display: 'flex', justifyContent: 'center' }}>
              <span style={{ ...S.badge('green'), gap: 5 }}><span style={{ width: 6, height: 6, borderRadius: '50%', background: '#10b981', display: 'inline-block', animation: 'pulse 1.5s infinite' }} />{stats.active} sessions live</span>
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 10 }}>
            {[['Avg Attention',`${liveAttn}%`,'#6366f1'],['Active Now',stats.active,'#10b981'],['Teachers Online',Math.min(stats.active,stats.teachers),'#4a90d9'],['Alerts Today',Math.floor(Math.random()*8)+2,'#f59e0b']].map(([l,v,c])=>(
              <div key={l} style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 9, padding: '10px 12px', border: '1px solid rgba(255,255,255,0.05)' }}>
                <div style={{ fontSize: 18, fontWeight: 800, color: c }}>{v}</div>
                <div style={{ fontSize: 10, color: '#475569' }}>{l}</div>
              </div>
            ))}
          </div>
        </div>

        <div style={S.card}>
          <div style={{ fontSize: 14, fontWeight: 700, color: '#e2e8f0', marginBottom: 14 }}>Recent Sessions</div>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead><tr>{['Code','Teacher','Class','Subject','Students','Avg Attn','Status'].map(h=><th key={h} style={S.th}>{h}</th>)}</tr></thead>
            <tbody>
              {recent.length === 0 ? <tr><td colSpan={7} style={{ ...S.td, textAlign: 'center', padding: 30, color: '#334155' }}>No sessions yet</td></tr>
                : recent.map(s => (
                  <tr key={s.sessionCode} style={{ transition: 'background 0.15s' }}>
                    <td style={S.td}><span style={{ fontFamily: 'monospace', color: '#6366f1', fontWeight: 700 }}>{s.sessionCode}</span></td>
                    <td style={S.td}>{s.teacherName}</td>
                    <td style={S.td}>{s.className||'—'}</td>
                    <td style={S.td}>{s.subject||'—'}</td>
                    <td style={{ ...S.td, textAlign: 'center' }}>{s.summary?.totalStudents||0}</td>
                    <td style={S.td}><span style={{ color: S.attnColor(s.summary?.avgAttention||0), fontWeight: 700 }}>{s.summary?.avgAttention||0}%</span></td>
                    <td style={S.td}><span style={S.badge(s.isActive?'green':'blue')}>{s.isActive?'Live':'Ended'}</span></td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

// ─── USER MANAGEMENT ─────────────────────────────────────────────────────────
function UserManagement({ role }) {
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [showBulk, setShowBulk] = useState(false)
  const [form, setForm] = useState({ fullName: '', email: '', department: '', className: '', rollNumber: '', password: '' })
  const [bulkText, setBulkText] = useState('')
  const label = role === 'teacher' ? 'Teacher' : 'Student'

  const load = async () => { try { const { data } = await api.get(`/admin/${role}s`); setUsers(data[`${role}s`]||[]) } catch { toast.error('Failed') } finally { setLoading(false) } }
  useEffect(() => { load() }, [role])

  const handleAdd = async (e) => {
    e.preventDefault()
    try {
      await api.post(`/admin/${role}s`, { ...form, password: form.password || (role === 'teacher' ? 'Teacher@123' : 'Student@123') })
      toast.success(`${label} created!`); setShowAdd(false); setForm({ fullName:'',email:'',department:'',className:'',rollNumber:'',password:'' }); load()
    } catch (err) { toast.error(err.response?.data?.error || 'Failed') }
  }

  const handleBulk = async () => {
    try {
      const rows = bulkText.trim().split('\n').map(r => { const [a,b,c,d]=r.split(',').map(s=>s?.trim()); return role==='teacher'?{fullName:a,email:b,department:c,password:d}:{fullName:a,className:b,rollNumber:c,password:d} }).filter(r=>r.fullName)
      const { data } = await api.post(`/admin/${role}s/bulk`, { [`${role}s`]: rows })
      toast.success(`Created ${data.created.length}, failed ${data.failed.length}`); setShowBulk(false); setBulkText(''); load()
    } catch { toast.error('Bulk import failed') }
  }

  const toggleActive = async (userId, isActive) => {
    try { await api.patch(`/admin/users/${userId}/${isActive?'deactivate':'activate'}`); toast.success(isActive?'Deactivated':'Activated'); load() } catch { toast.error('Failed') }
  }

  const resetPwd = async (userId) => {
    const pwd = prompt('New password (min 6 chars):'); if (!pwd||pwd.length<6) return
    try { await api.patch(`/admin/users/${userId}/reset-password`, { newPassword: pwd }); toast.success('Password reset') } catch { toast.error('Failed') }
  }

  const cols = role === 'teacher'
    ? ['User ID','Name','Email','Department','Status','Actions']
    : ['User ID','Name','Class','Roll No.','Status','Actions']

  return (
    <div style={{ padding: 28 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 900, color: '#fff', marginBottom: 3 }}>{label}s</h1>
          <p style={{ fontSize: 13, color: '#64748b' }}>{users.length} {label.toLowerCase()}s in your institution</p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={() => setShowBulk(!showBulk)} style={S.btn('ghost')}><Upload size={14} /> Bulk Import</button>
          <button onClick={() => setShowAdd(!showAdd)} style={S.btn('primary')}><UserPlus size={14} /> Add {label}</button>
        </div>
      </div>

      {showAdd && (
        <div style={{ ...S.card, marginBottom: 16 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: '#e2e8f0', marginBottom: 16 }}>Add {label}</div>
          <form onSubmit={handleAdd}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 14 }}>
              <div><label style={S.label}>Full Name *</label><input style={S.input} value={form.fullName} onChange={e=>setForm({...form,fullName:e.target.value})} required placeholder="John Smith"/></div>
              {role==='teacher'
                ? <><div><label style={S.label}>Email</label><input style={S.input} type="email" value={form.email} onChange={e=>setForm({...form,email:e.target.value})} placeholder="john@school.edu"/></div>
                    <div><label style={S.label}>Department</label><input style={S.input} value={form.department} onChange={e=>setForm({...form,department:e.target.value})} placeholder="Science"/></div></>
                : <><div><label style={S.label}>Class</label><input style={S.input} value={form.className} onChange={e=>setForm({...form,className:e.target.value})} placeholder="10A"/></div>
                    <div><label style={S.label}>Roll Number</label><input style={S.input} value={form.rollNumber} onChange={e=>setForm({...form,rollNumber:e.target.value})} placeholder="42"/></div></>
              }
              <div><label style={S.label}>Password (default: {role==='teacher'?'Teacher@123':'Student@123'})</label><input style={S.input} value={form.password} onChange={e=>setForm({...form,password:e.target.value})} placeholder="Leave blank for default"/></div>
            </div>
            <div style={{ display: 'flex', gap: 10, marginTop: 14 }}>
              <button type="submit" style={S.btn('primary')}>Add {label}</button>
              <button type="button" onClick={() => setShowAdd(false)} style={S.btn('ghost')}>Cancel</button>
            </div>
          </form>
        </div>
      )}

      {showBulk && (
        <div style={{ ...S.card, marginBottom: 16 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: '#e2e8f0', marginBottom: 6 }}>Bulk Import {label}s</div>
          <p style={{ fontSize: 12, color: '#475569', marginBottom: 10 }}>Format: {role==='teacher'?'FullName, Email, Department, Password':'FullName, ClassName, RollNumber, Password'}</p>
          <textarea rows={5} value={bulkText} onChange={e=>setBulkText(e.target.value)} style={{ ...S.input, resize: 'vertical', marginBottom: 10 }} placeholder={role==='teacher'?'John Smith, john@school.edu, Science, Teacher@123':'Jane Doe, 10A, 42, Student@123'} />
          <div style={{ display: 'flex', gap: 10 }}>
            <button onClick={handleBulk} style={S.btn('primary')}><Upload size={14}/> Import</button>
            <button onClick={() => setShowBulk(false)} style={S.btn('ghost')}>Cancel</button>
          </div>
        </div>
      )}

      <div style={{ ...S.card, padding: 0, overflow: 'hidden' }}>
        {loading ? <div style={{ padding: 40, textAlign: 'center', color: '#475569' }}>Loading...</div> : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead><tr>{cols.map(c => <th key={c} style={S.th}>{c}</th>)}</tr></thead>
            <tbody>
              {users.length === 0
                ? <tr><td colSpan={6} style={{ ...S.td, textAlign: 'center', padding: 40, color: '#334155' }}>No {label.toLowerCase()}s yet. Add your first one above.</td></tr>
                : users.map(u => (
                  <tr key={u.userId}>
                    <td style={S.td}><span style={{ fontFamily: 'monospace', color: '#6366f1', fontSize: 12 }}>{u.userId}</span></td>
                    <td style={{ ...S.td, fontWeight: 600, color: '#e2e8f0' }}>{u.fullName}</td>
                    <td style={S.td}>{role==='teacher'?(u.email||'—'):(u.className||'—')}</td>
                    <td style={S.td}>{role==='teacher'?(u.department||'—'):(u.rollNumber||'—')}</td>
                    <td style={S.td}><span style={S.badge(u.isActive?'green':'red')}>{u.isActive?'Active':'Inactive'}</span></td>
                    <td style={S.td}>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button onClick={()=>resetPwd(u.userId)} style={{ ...S.btn('ghost'), padding: '5px 10px', fontSize: 11 }} title="Reset Password"><Key size={12}/></button>
                        <button onClick={()=>toggleActive(u.userId,u.isActive)} style={{ ...S.btn(u.isActive?'danger':'success'), padding: '5px 10px', fontSize: 11 }} title={u.isActive?'Deactivate':'Activate'}>
                          {u.isActive ? <UserX size={12}/> : <UserCheck size={12}/>}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              }
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}

// ─── ACTIVE SESSIONS (with live chart + end session) ─────────────────────────
function ActiveSessions() {
  const [sessions, setSessions] = useState([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState(null)
  const [ending, setEnding] = useState(null)
  const [insights, setInsights] = useState([
    { time: '16/03/2025 08', msg: 'Drift alert of drift alert' },
    { time: '16/03/2025 00', msg: 'Drift alert of fatigue event' },
    { time: '16/03/2025 30', msg: 'Drift alerts of fatigue events' },
    { time: '16/03/2025 10', msg: 'Drift alerts of fatigue events' },
  ])

  // Simulated multi-student data for the live chart
  const [chartData] = useState(() => {
    const names = ['Nikhil','Pradeep 1','Student 5a','Manekaran B1','Student 1','Student 2','Student 3']
    return names.map(n => ({
      name: n,
      data: Array.from({length: 30}, (_,i) => 20 + Math.random()*70)
    }))
  })

  const load = async () => {
    try { const { data } = await api.get('/admin/sessions'); setSessions(data.sessions||[]) }
    catch { toast.error('Failed to load sessions') }
    finally { setLoading(false) }
  }
  useEffect(() => { load() }, [])

  const endSession = async (code) => {
    if (!confirm(`End session ${code}?`)) return
    setEnding(code)
    try {
      await api.post(`/sessions/${code}/end`)
      toast.success(`Session ${code} ended`)
      load()
      if (selected?.sessionCode === code) setSelected(null)
    } catch (err) { toast.error(err.response?.data?.error || 'Failed to end session') }
    finally { setEnding(null) }
  }

  const activeSessions = sessions.filter(s => s.isActive)
  const past = sessions.filter(s => !s.isActive)

  return (
    <div style={{ padding: 28 }}>
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: 24, fontWeight: 900, color: '#fff', marginBottom: 3 }}>Active Sessions</h1>
        <p style={{ fontSize: 13, color: '#64748b' }}>{activeSessions.length} sessions currently live · {past.length} historical</p>
      </div>

      {/* Live sessions at top */}
      {activeSessions.length > 0 && (
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#10b981', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#10b981', display: 'inline-block', animation: 'pulse 1.5s infinite' }} /> LIVE NOW
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {activeSessions.map(s => (
              <div key={s.sessionCode} style={{ ...S.card, border: '1px solid rgba(16,185,129,0.25)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12, padding: '16px 20px' }}>
                <div style={{ display: 'flex', gap: 20, alignItems: 'center', flexWrap: 'wrap' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
                      <span style={{ fontFamily: 'monospace', color: '#6366f1', fontWeight: 800, fontSize: 18, letterSpacing: 2 }}>{s.sessionCode}</span>
                      <span style={S.badge('green')}>Live</span>
                    </div>
                    <div style={{ fontSize: 12, color: '#64748b' }}>{s.teacherName} · {s.className||'No class'} · {s.subject||'No subject'}</div>
                  </div>
                  <div style={{ display: 'flex', gap: 16 }}>
                    {[['Students', s.summary?.totalStudents||0,'#4a90d9'],['Avg Attn',`${s.summary?.avgAttention||0}%`, S.attnColor(s.summary?.avgAttention||0)],['Started', new Date(s.startedAt).toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'}),'#64748b']].map(([l,v,c])=>(
                      <div key={l} style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: 16, fontWeight: 700, color: c }}>{v}</div>
                        <div style={{ fontSize: 10, color: '#475569' }}>{l}</div>
                      </div>
                    ))}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button onClick={() => setSelected(s)} style={S.btn('primary')}>View Live →</button>
                  <button onClick={() => endSession(s.sessionCode)} disabled={ending === s.sessionCode} style={S.btn('danger')}>
                    {ending === s.sessionCode ? 'Ending...' : '⬛ End Session'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Live session detail view */}
      {selected && (
        <div style={{ ...S.card, marginBottom: 20, border: '1px solid rgba(99,102,241,0.2)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 10 }}>
            <div>
              <h2 style={{ fontSize: 18, fontWeight: 800, color: '#fff', marginBottom: 2 }}>Session Details — {selected.sessionCode}</h2>
              <p style={{ fontSize: 13, color: '#64748b' }}>{selected.className} · {selected.subject} · Teacher: {selected.teacherName}</p>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={() => endSession(selected.sessionCode)} style={S.btn('danger')}>⬛ End Session</button>
              <button onClick={() => setSelected(null)} style={S.btn('ghost')}>Close ✕</button>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: 14 }}>
            {/* Chart */}
            <div style={{ background: 'rgba(255,255,255,0.02)', borderRadius: 10, padding: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: '#e2e8f0' }}>Multi-student Attention</div>
                <div style={{ fontSize: 11, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 6, padding: '4px 10px', color: '#94a3b8' }}>Past last hour ▾</div>
              </div>
              {/* Legend */}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 10 }}>
                {chartData.slice(0,6).map((s, i) => {
                  const cols = ['#6366f1','#10b981','#f59e0b','#ef4444','#06b6d4','#8b5cf6']
                  return <div key={s.name} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 9, color: '#64748b' }}><span style={{ width: 12, height: 2, background: cols[i], display: 'inline-block', borderRadius: 1 }} />{s.name}</div>
                })}
              </div>
              <MiniLineChart students={chartData} />
            </div>

            {/* Students table */}
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#e2e8f0', marginBottom: 10 }}>Participating Students</div>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                <thead><tr>{['Name','Attn%','Head Face','Fatigue','Controls'].map(h=><th key={h} style={{ ...S.th, fontSize: 10, padding: '8px 8px' }}>{h}</th>)}</tr></thead>
                <tbody>
                  {[{n:'Neel',sub:'Mathematics',a:11,h:'Live',f:0},{n:'Priya',sub:'Science',a:68,h:'Live',f:1},{n:'Rahul',sub:'Math',a:45,h:'Away',f:2}].map((s,i)=>(
                    <tr key={i}>
                      <td style={{ ...S.td, padding: '8px 8px' }}><div style={{ fontSize: 11, fontWeight: 600, color: '#e2e8f0' }}>{s.n}</div><div style={{ fontSize: 9, color: '#475569' }}>{s.sub}</div></td>
                      <td style={{ ...S.td, padding: '8px 8px', color: S.attnColor(s.a), fontWeight: 700 }}>{s.a}</td>
                      <td style={{ ...S.td, padding: '8px 8px' }}><span style={S.badge(s.h==='Live'?'green':'red')} >{s.h}</span></td>
                      <td style={{ ...S.td, padding: '8px 8px', textAlign: 'center' }}>{s.f}</td>
                      <td style={{ ...S.td, padding: '8px 8px' }}><span style={{ color: '#475569', fontSize: 16, cursor: 'pointer' }}>···</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Live Insights */}
              <div style={{ marginTop: 14 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: '#e2e8f0' }}>Live Insights</div>
                  <div style={{ fontSize: 10, color: '#475569' }}>16/03/2025</div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 140, overflowY: 'auto' }}>
                  {insights.map((ins, i) => (
                    <div key={i} style={{ display: 'flex', gap: 10, fontSize: 10 }}>
                      <span style={{ color: '#334155', whiteSpace: 'nowrap' }}>{ins.time}</span>
                      <span style={{ color: '#94a3b8' }}>{ins.msg}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Historical sessions */}
      <div style={S.card}>
        <div style={{ fontSize: 14, fontWeight: 700, color: '#e2e8f0', marginBottom: 14 }}>All Sessions History</div>
        {loading ? <div style={{ textAlign: 'center', padding: 30, color: '#475569' }}>Loading...</div> : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead><tr>{['Code','Teacher','Class','Subject','Students','Avg Attn','Duration','Status','Action'].map(h=><th key={h} style={S.th}>{h}</th>)}</tr></thead>
            <tbody>
              {sessions.length === 0
                ? <tr><td colSpan={9} style={{ ...S.td, textAlign: 'center', padding: 30, color: '#334155' }}>No sessions yet</td></tr>
                : sessions.map(s => (
                  <tr key={s.sessionCode}>
                    <td style={S.td}><span style={{ fontFamily: 'monospace', color: '#6366f1', fontWeight: 700 }}>{s.sessionCode}</span></td>
                    <td style={S.td}>{s.teacherName}</td>
                    <td style={S.td}>{s.className||'—'}</td>
                    <td style={S.td}>{s.subject||'—'}</td>
                    <td style={{ ...S.td, textAlign: 'center' }}>{s.summary?.totalStudents||0}</td>
                    <td style={S.td}><span style={{ color: S.attnColor(s.summary?.avgAttention||0), fontWeight: 700 }}>{s.summary?.avgAttention||0}%</span></td>
                    <td style={S.td}>{s.summary?.durationMinutes||0}m</td>
                    <td style={S.td}><span style={S.badge(s.isActive?'green':'blue')}>{s.isActive?'Live':'Ended'}</span></td>
                    <td style={S.td}>
                      {s.isActive && (
                        <button onClick={() => endSession(s.sessionCode)} disabled={ending === s.sessionCode} style={{ ...S.btn('danger'), padding: '5px 12px', fontSize: 11 }}>
                          {ending === s.sessionCode ? '...' : '⬛ End'}
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              }
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}


// ─── SETTINGS ─────────────────────────────────────────────────────────────────
function AdminSettings() {
  const [inst, setInst] = useState(null)
  const [criteria, setCriteria] = useState({ attentionThreshold: 60, faceAbsentLimit: 10, fatigueWarning: 3, driftAlert: 15, alertCooldown: 20 })
  const [perms, setPerms] = useState({ mode: 'partial', attentionMin: 40, attentionMax: 90, faceAbsentMin: 5, faceAbsentMax: 30 })
  const [saving, setSaving] = useState(false)
  const [savedMode, setSavedMode] = useState('partial')

  useEffect(() => {
    api.get('/admin/settings').then(({ data }) => {
      setInst(data.institution)
      if (data.institution.criteria) setCriteria(c => ({ ...c, ...data.institution.criteria }))
      if (data.institution.teacherPermission) {
        setPerms(p => ({ ...p, ...data.institution.teacherPermission }))
        setSavedMode(data.institution.teacherPermission.mode || 'partial')
      }
    }).catch(() => toast.error('Failed to load settings'))
  }, [])

  const saveCriteria = async () => {
    setSaving(true)
    try {
      await api.put('/admin/criteria', criteria)
      await api.put('/admin/teacher-permissions', perms)
      setSavedMode(perms.mode)
      toast.success('Settings saved successfully!')
    } catch { toast.error('Failed to save') }
    finally { setSaving(false) }
  }

  const SliderRow = ({ label: lbl, field, min, max, suffix = '', desc }) => (
    <div style={{ marginBottom: 20 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
        <div>
          <label style={{ fontSize: 13, fontWeight: 600, color: '#94a3b8' }}>{lbl}</label>
          {desc && <div style={{ fontSize: 10, color: '#475569', marginTop: 1 }}>{desc}</div>}
        </div>
        <span style={{ fontWeight: 800, color: '#6366f1', fontSize: 15, background: 'rgba(99,102,241,0.1)', padding: '2px 10px', borderRadius: 6 }}>{criteria[field]}{suffix}</span>
      </div>
      <input type="range" min={min} max={max} value={criteria[field] || 0}
        onChange={e => setCriteria({ ...criteria, [field]: Number(e.target.value) })}
        style={{ width: '100%', accentColor: '#6366f1', cursor: 'pointer', height: 4 }} />
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 9, color: '#334155', marginTop: 2 }}>
        <span>{min}{suffix}</span><span>{max}{suffix}</span>
      </div>
    </div>
  )

  const modeConfig = {
    locked: {
      color: '#ef4444', bg: 'rgba(239,68,68,0.08)', border: 'rgba(239,68,68,0.25)',
      icon: '🔒', title: 'Locked', desc: 'Teachers cannot change any AI thresholds. All values fixed to org defaults.',
      badge: 'Teachers see values but CANNOT edit anything'
    },
    partial: {
      color: '#f59e0b', bg: 'rgba(245,158,11,0.07)', border: 'rgba(245,158,11,0.25)',
      icon: '🛡', title: 'Partial Control', desc: 'Teachers can adjust within the min/max ranges you define below.',
      badge: 'Teachers can edit WITHIN your defined ranges'
    },
    full: {
      color: '#10b981', bg: 'rgba(16,185,129,0.07)', border: 'rgba(16,185,129,0.25)',
      icon: '🔓', title: 'Full Access', desc: 'Teachers have complete freedom to set any threshold values.',
      badge: 'Teachers can set ANY values freely'
    },
  }

  return (
    <div style={{ padding: 28 }}>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 22, fontWeight: 900, color: '#fff', marginBottom: 3 }}>AI Detection Calibration</h1>
        <p style={{ fontSize: 13, color: '#64748b' }}>{inst?.name || 'Loading...'} · Set thresholds and teacher permissions</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, alignItems: 'start' }}>

        {/* LEFT: AI Criteria Sliders */}
        <div style={S.card}>
          <div style={{ fontSize: 15, fontWeight: 700, color: '#e2e8f0', marginBottom: 20 }}>AI Detection Criteria (Org Defaults)</div>
          <SliderRow label="Attention Threshold" field="attentionThreshold" min={20} max={100} suffix="%" desc="Minimum % before warning fires" />
          <SliderRow label="Face Absent Limit" field="faceAbsentLimit" min={2} max={60} suffix="s" desc="Seconds face can be missing" />
          <SliderRow label="Fatigue Warning Count" field="fatigueWarning" min={1} max={20} desc="Drowsiness events before alert" />
          <SliderRow label="Drift Alert Duration" field="driftAlert" min={5} max={120} suffix="s" desc="Seconds looking-away triggers drift" />
          <SliderRow label="Alert Cooldown" field="alertCooldown" min={10} max={120} suffix="s" desc="Gap between consecutive alerts" />
          <div style={{ background: '#070c14', border: '1px solid rgba(255,255,255,0.05)', borderRadius: 10, padding: '12px 14px', marginTop: 4, marginBottom: 16 }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: '#475569', marginBottom: 8 }}>CURRENT ORG VALUES</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: 6 }}>
              {[['Attn',`${criteria.attentionThreshold}%`,'#6366f1'],['Face',`${criteria.faceAbsentLimit}s`,'#4a90d9'],['Fatigue',`${criteria.fatigueWarning}x`,'#f59e0b'],['Drift',`${criteria.driftAlert}s`,'#10b981'],['Cool',`${criteria.alertCooldown}s`,'#8b5cf6']].map(([l,v,c])=>(
                <div key={l} style={{ textAlign:'center', padding:'8px 4px', background:'rgba(255,255,255,0.02)', borderRadius:7 }}>
                  <div style={{ fontSize:15, fontWeight:800, color:c }}>{v}</div>
                  <div style={{ fontSize:9, color:'#475569' }}>{l}</div>
                </div>
              ))}
            </div>
          </div>
          <button onClick={saveCriteria} disabled={saving} style={{ ...S.btn('primary'), width: '100%', justifyContent: 'center' }}>
            {saving ? 'Saving...' : '💾 Save All Settings'}
          </button>
        </div>

        {/* RIGHT: Teacher Permission Control */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={S.card}>
            <div style={{ fontSize: 15, fontWeight: 700, color: '#e2e8f0', marginBottom: 6 }}>Teacher Permission Mode</div>
            <div style={{ fontSize: 12, color: '#64748b', marginBottom: 16 }}>Control how much teachers can customise AI thresholds.</div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 18 }}>
              {Object.entries(modeConfig).map(([mode, cfg]) => (
                <div key={mode} onClick={() => setPerms({ ...perms, mode })}
                  style={{ display:'flex', alignItems:'center', gap:14, padding:'14px 16px', borderRadius:11, cursor:'pointer', border:`2px solid ${perms.mode===mode ? cfg.color : 'rgba(255,255,255,0.06)'}`, background: perms.mode===mode ? cfg.bg : 'rgba(255,255,255,0.02)', transition:'all 0.2s' }}>
                  <div style={{ fontSize: 22, flexShrink: 0 }}>{cfg.icon}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:3 }}>
                      <span style={{ fontSize:14, fontWeight:700, color: perms.mode===mode ? cfg.color : '#e2e8f0' }}>{cfg.title}</span>
                      {savedMode===mode && <span style={{ fontSize:9, background:`${cfg.color}22`, color:cfg.color, padding:'1px 7px', borderRadius:100, fontWeight:700 }}>ACTIVE</span>}
                      {perms.mode===mode && savedMode!==mode && <span style={{ fontSize:9, background:'rgba(99,102,241,0.2)', color:'#818cf8', padding:'1px 7px', borderRadius:100, fontWeight:700 }}>SELECTED</span>}
                    </div>
                    <div style={{ fontSize:11, color:'#64748b', lineHeight:1.4 }}>{cfg.desc}</div>
                    <div style={{ fontSize:10, color:cfg.color, marginTop:4, fontWeight:600 }}>→ {cfg.badge}</div>
                  </div>
                  <div style={{ width:20, height:20, borderRadius:'50%', border:`2px solid ${perms.mode===mode ? cfg.color : 'rgba(255,255,255,0.1)'}`, background: perms.mode===mode ? cfg.color : 'transparent', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                    {perms.mode===mode && <div style={{ width:8, height:8, borderRadius:'50%', background:'#fff' }} />}
                  </div>
                </div>
              ))}
            </div>

            {perms.mode === 'partial' && (
              <div style={{ background:'rgba(245,158,11,0.05)', border:'1px solid rgba(245,158,11,0.2)', borderRadius:10, padding:'14px 16px', marginBottom:14 }}>
                <div style={{ fontSize:12, fontWeight:700, color:'#f59e0b', marginBottom:12 }}>🛡 Define Allowed Ranges for Teachers</div>
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
                  {[['attentionMin','Attention Min %',20,80],['attentionMax','Attention Max %',50,100],['faceAbsentMin','Face Absent Min (s)',2,20],['faceAbsentMax','Face Absent Max (s)',10,60]].map(([k,l,mn,mx])=>(
                    <div key={k}>
                      <label style={{ display:'block', fontSize:11, color:'#94a3b8', marginBottom:5, fontWeight:500 }}>{l}</label>
                      <input type="number" min={mn} max={mx} value={perms[k]||0} onChange={e=>setPerms({...perms,[k]:Number(e.target.value)})}
                        style={{ width:'100%', background:'#070c14', border:'1px solid rgba(245,158,11,0.2)', borderRadius:8, padding:'9px 12px', color:'#e2e8f0', fontSize:13, outline:'none', boxSizing:'border-box', fontFamily:'inherit' }} />
                    </div>
                  ))}
                </div>
                <div style={{ marginTop:10, fontSize:11, color:'#475569', lineHeight:1.5 }}>Teachers will be restricted to these ranges. Values outside will be automatically clamped.</div>
              </div>
            )}
            {perms.mode === 'locked' && (
              <div style={{ background:'rgba(239,68,68,0.06)', border:'1px solid rgba(239,68,68,0.18)', borderRadius:10, padding:'12px 14px', fontSize:12, color:'#94a3b8', lineHeight:1.6, marginBottom:14 }}>
                🔒 <strong style={{ color:'#ef4444' }}>Locked</strong> — Teachers will see the criteria values but cannot change any threshold. Only admins can update values.
              </div>
            )}
            {perms.mode === 'full' && (
              <div style={{ background:'rgba(16,185,129,0.06)', border:'1px solid rgba(16,185,129,0.18)', borderRadius:10, padding:'12px 14px', fontSize:12, color:'#94a3b8', lineHeight:1.6, marginBottom:14 }}>
                🔓 <strong style={{ color:'#10b981' }}>Full Access</strong> — Teachers can freely set any AI threshold values. Org defaults are just the starting point.
              </div>
            )}
            <button onClick={saveCriteria} disabled={saving} style={{ ...S.btn('primary'), width:'100%', justifyContent:'center' }}>
              {saving ? 'Saving...' : '💾 Save All Settings'}
            </button>
          </div>

          <div style={S.card}>
            <div style={{ fontSize:13, fontWeight:700, color:'#e2e8f0', marginBottom:12 }}>What Teachers Will See</div>
            {[['View org thresholds',true],['Change thresholds',perms.mode!=='locked'],['Set any value freely',perms.mode==='full'],['Clamped to admin ranges',perms.mode==='partial']].map(([label,allowed])=>(
              <div key={label} style={{ display:'flex', alignItems:'center', gap:9, fontSize:12, marginBottom:8 }}>
                <div style={{ width:18, height:18, borderRadius:'50%', background: allowed?'rgba(16,185,129,0.15)':'rgba(239,68,68,0.15)', border:`1px solid ${allowed?'#10b981':'#ef4444'}`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:10, flexShrink:0 }}>
                  {allowed ? '✓' : '✗'}
                </div>
                <span style={{ color: allowed?'#94a3b8':'#475569' }}>{label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── MAIN ADMIN DASHBOARD ─────────────────────────────────────────────────────
export default function AdminDashboard() {
  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#070c14', fontFamily: "'DM Sans','Segoe UI',sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600;700;800;900&display=swap');
        @keyframes pulse{0%,100%{opacity:1}50%{opacity:0.4}}
        input::placeholder{color:#334155}
        input:focus,select:focus{border-color:rgba(99,102,241,0.5)!important;outline:none}
        select option{background:#0d1117;color:#e2e8f0}
        tr:hover td{background:rgba(255,255,255,0.015)!important}
        ::-webkit-scrollbar{width:5px}::-webkit-scrollbar-track{background:#0d1117}::-webkit-scrollbar-thumb{background:#1e2a3a;border-radius:3px}
      `}</style>
      <Sidebar />
      <main style={{ flex: 1, overflowY: 'auto' }}>
        <Routes>
          <Route index element={<Overview />} />
          <Route path="teachers" element={<UserManagement role="teacher" />} />
          <Route path="students" element={<UserManagement role="student" />} />
          <Route path="sessions" element={<ActiveSessions />} />
          <Route path="settings" element={<AdminSettings />} />
        </Routes>
      </main>
    </div>
  )
}
