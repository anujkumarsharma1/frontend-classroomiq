import React, { useState, useEffect, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import api from '../utils/api'
import toast from 'react-hot-toast'
import { Eye, EyeOff, Wifi } from 'lucide-react'

// ─── Hooks ────────────────────────────────────────────────────────────────────
function useCounter(target, duration = 1200) {
  const [val, setVal] = useState(0)
  useEffect(() => {
    let start = 0; const inc = target / (duration / 16)
    const t = setInterval(() => { start += inc; if (start >= target) { setVal(target); clearInterval(t) } else setVal(Math.floor(start)) }, 16)
    return () => clearInterval(t)
  }, [target])
  return val
}

function useLive(base, variance = 5, ms = 2500) {
  const [val, setVal] = useState(base)
  useEffect(() => {
    const t = setInterval(() => setVal(base + Math.floor((Math.random() - 0.5) * variance * 2)), ms)
    return () => clearInterval(t)
  }, [base, variance, ms])
  return val
}

// ─── Sparkline ────────────────────────────────────────────────────────────────
function Sparkline({ data, color = '#4a90d9', w = 160, h = 48 }) {
  const min = Math.min(...data), max = Math.max(...data) + 1
  const pts = data.map((v, i) => `${((i / (data.length - 1)) * w).toFixed(1)},${(h - ((v - min) / (max - min)) * (h - 6) - 3).toFixed(1)}`).join(' ')
  const fill = `0,${h} ${pts} ${w},${h}`
  return (
    <svg width={w} height={h} style={{ display: 'block', overflow: 'visible' }}>
      <defs><linearGradient id="sg" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={color} stopOpacity="0.3" /><stop offset="100%" stopColor={color} stopOpacity="0" /></linearGradient></defs>
      <polygon points={fill} fill="url(#sg)" />
      <polyline points={pts} fill="none" stroke={color} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  )
}

// ─── Radar ────────────────────────────────────────────────────────────────────
function RadarChart() {
  const [a, setA] = useState(0)
  useEffect(() => { const t = setInterval(() => setA(x => (x + 1) % 360), 50); return () => clearInterval(t) }, [])
  const cx = 75, cy = 75, r = 58
  const polyPts = [0, 60, 120, 180, 240, 300].map(deg => {
    const rad = (deg * Math.PI) / 180, rr = 28 + Math.sin((deg + a) * 0.04) * 14
    return `${cx + rr * Math.cos(rad)},${cy + rr * Math.sin(rad)}`
  }).join(' ')
  const dotR = 36, dotRad = (a * Math.PI) / 180
  return (
    <svg width={150} height={150}>
      {[58, 43, 28, 14].map((rr, i) => <circle key={i} cx={cx} cy={cy} r={rr} fill="none" stroke="rgba(74,144,217,0.15)" strokeWidth="1" />)}
      {[0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330].map((deg, i) => {
        const rad = (deg * Math.PI) / 180
        return <line key={i} x1={cx} y1={cy} x2={cx + r * Math.cos(rad)} y2={cy + r * Math.sin(rad)} stroke="rgba(74,144,217,0.1)" strokeWidth="1" />
      })}
      <polygon points={polyPts} fill="rgba(74,144,217,0.18)" stroke="#4a90d9" strokeWidth="1.5" />
      <circle cx={cx + dotR * Math.cos(dotRad)} cy={cy + dotR * Math.sin(dotRad)} r="4.5" fill="#4a90d9" />
      <circle cx={cx + dotR * Math.cos(dotRad)} cy={cy + dotR * Math.sin(dotRad)} r="8" fill="none" stroke="rgba(74,144,217,0.35)" strokeWidth="1.5" />
    </svg>
  )
}

// ─── Heatmap ──────────────────────────────────────────────────────────────────
function Heatmap() {
  const [cells, setCells] = useState(() => Array.from({ length: 80 }, () => Math.random()))
  useEffect(() => { const t = setInterval(() => setCells(c => c.map(v => Math.max(0, Math.min(1, v + (Math.random() - 0.5) * 0.12)))), 900); return () => clearInterval(t) }, [])
  const gc = (v) => v > 0.72 ? `rgba(16,185,129,${0.6 + v * 0.4})` : v > 0.48 ? `rgba(245,158,11,${0.5 + v * 0.4})` : v > 0.25 ? `rgba(249,115,22,${0.5 + v * 0.4})` : `rgba(239,68,68,${0.5 + v * 0.4})`
  return <div style={{ display: 'grid', gridTemplateColumns: 'repeat(10,1fr)', gap: 2, width: 150, height: 104 }}>{cells.map((v, i) => <div key={i} style={{ background: gc(v), borderRadius: 2, transition: 'background 0.9s ease' }} />)}</div>
}

// ─── Expression bars ──────────────────────────────────────────────────────────
function ExprBars() {
  const [e, setE] = useState({ Happy: 70, Focused: 20, Emotion: 65, Gaze: 5, Expression: 22 })
  useEffect(() => { const t = setInterval(() => setE({ Happy: 48 + ~~(Math.random() * 42), Focused: 10 + ~~(Math.random() * 32), Emotion: 38 + ~~(Math.random() * 40), Gaze: ~~(Math.random() * 18), Expression: 12 + ~~(Math.random() * 28) }), 2600); return () => clearInterval(t) }, [])
  const cols = { Happy: '#10b981', Focused: '#4a90d9', Emotion: '#f59e0b', Gaze: '#8b5cf6', Expression: '#06b6d4' }
  return <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>{Object.entries(e).map(([k, v]) => (
    <div key={k} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
      <div style={{ width: 58, fontSize: 10, color: cols[k], fontWeight: 600 }}>{k}</div>
      <div style={{ flex: 1, height: 5, background: 'rgba(255,255,255,0.06)', borderRadius: 3, overflow: 'hidden' }}><div style={{ height: '100%', width: `${v}%`, background: cols[k], borderRadius: 3, transition: 'width 0.9s ease' }} /></div>
      <div style={{ width: 26, fontSize: 10, color: '#64748b', textAlign: 'right' }}>{v}%</div>
    </div>
  ))}</div>
}

// ─── Alert feed ───────────────────────────────────────────────────────────────
function AlertFeed() {
  const [items, setItems] = useState([
    { id: 1, t: 'attention', msg: 'Low Attention', who: 'Student X', hint: 'suggested nudge' },
    { id: 2, t: 'drowsy', msg: 'Drowsiness', who: 'Student Y', hint: 'check on student' },
  ])
  useEffect(() => {
    const ns = ['Student A', 'Student B', 'Student C', 'Student D']
    const ts = [{ t: 'attention', msg: 'Low Attention', hint: 'suggested nudge' }, { t: 'drowsy', msg: 'Drowsiness', hint: 'check student' }, { t: 'multi', msg: 'Multiple Faces', hint: 'send alert' }]
    const t = setInterval(() => { const r = ts[~~(Math.random() * 3)]; setItems(p => [{ id: Date.now(), ...r, who: ns[~~(Math.random() * 4)] }, ...p.slice(0, 3)]) }, 4000)
    return () => clearInterval(t)
  }, [])
  const col = (t) => t === 'attention' ? '#f59e0b' : t === 'drowsy' ? '#ef4444' : '#8b5cf6'
  return <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>{items.slice(0, 3).map(a => (
    <div key={a.id} style={{ background: 'rgba(255,255,255,0.03)', border: `1px solid ${col(a.t)}22`, borderLeft: `3px solid ${col(a.t)}`, borderRadius: 8, padding: '8px 10px', animation: 'fadeIn 0.35s ease' }}>
      <div style={{ fontSize: 11, fontWeight: 600, color: col(a.t), marginBottom: 1 }}>⚠ Alert: {a.msg}</div>
      <div style={{ fontSize: 10, color: '#64748b' }}>{a.who} · {a.hint}</div>
    </div>
  ))}</div>
}

// ─── Blink chart ─────────────────────────────────────────────────────────────
function BlinkChart() {
  const [d, setD] = useState(() => Array.from({ length: 24 }, () => 30 + Math.random() * 60))
  useEffect(() => { const t = setInterval(() => setD(x => [...x.slice(1), 28 + Math.random() * 66]), 1300); return () => clearInterval(t) }, [])
  return <Sparkline data={d} color="#4a90d9" w={155} h={50} />
}

// ─── Multi-face ───────────────────────────────────────────────────────────────
function MultiFace() {
  const [alert, setAlert] = useState(false)
  useEffect(() => { const t = setInterval(() => setAlert(a => !a), 2800); return () => clearInterval(t) }, [])
  return <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 5 }}>
    {[{ f: 1, a: false }, { f: 1, a: false }, { f: 2, a: true }, { f: 1, a: false }].map((x, i) => (
      <div key={i} style={{ background: x.a && alert ? 'rgba(239,68,68,0.12)' : 'rgba(74,144,217,0.06)', border: `1px solid ${x.a && alert ? 'rgba(239,68,68,0.4)' : 'rgba(74,144,217,0.15)'}`, borderRadius: 8, padding: '6px 8px', transition: 'all 0.5s', fontSize: 10, color: x.a && alert ? '#ef4444' : '#64748b' }}>
        <div style={{ fontSize: 16, marginBottom: 2 }}>{x.f === 2 ? '👥' : '👤'}</div>
        <div>faces: {x.f}{x.a && alert ? ' ⚠' : ''}</div>
      </div>
    ))}
  </div>
}

// ─── CENTER LOGIN FORM (with real auth) ───────────────────────────────────────
function CenterLogin() {
  const [tab, setTab] = useState('teacher')
  const [form, setForm] = useState({ email: '', userId: '', password: '' })
  const [showPwd, setShowPwd] = useState(false)
  const [loading, setLoading] = useState(false)
  const { login } = useAuth()
  const navigate = useNavigate()

  const doLogin = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      let res
      if (tab === 'admin') {
        res = await api.post('/auth/admin-login', { email: form.email, password: form.password })
      } else {
        res = await api.post('/auth/login', { userId: form.userId.toUpperCase(), password: form.password, role: tab })
      }
      const { token, user, institution } = res.data
      login(token, user, institution)
      toast.success(`Welcome, ${user.fullName}!`)
      if (user.role === 'admin') navigate('/admin')
      else if (user.role === 'teacher') navigate('/teacher')
      else navigate('/student')
    } catch (err) {
      toast.error(err.response?.data?.error || 'Login failed')
    } finally { setLoading(false) }
  }

  return (
    <div style={{ background: 'rgba(10,14,20,0.95)', backdropFilter: 'blur(20px)', border: '1px solid rgba(74,144,217,0.3)', borderRadius: 18, padding: '22px 22px 18px', width: '100%', boxShadow: '0 0 50px rgba(74,144,217,0.12), 0 20px 40px rgba(0,0,0,0.5)' }}>
      {/* Header */}
      <div style={{ textAlign: 'center', marginBottom: 14 }}>
        <div style={{ fontSize: 10, letterSpacing: 3, color: '#4a90d9', fontWeight: 700, marginBottom: 3 }}>CLASSROOM FEED:</div>
        <div style={{ fontSize: 20, fontWeight: 900, color: '#fff', lineHeight: 1.1, marginBottom: 6 }}>All Systems GO.</div>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 5, background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.3)', borderRadius: 100, padding: '3px 10px', fontSize: 10, color: '#10b981' }}>
          <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#10b981', display: 'inline-block', animation: 'pulse 1.5s infinite' }} /> Live AI Demo
        </div>
      </div>

      <div style={{ fontSize: 12, fontWeight: 600, color: '#64748b', textAlign: 'center', marginBottom: 12 }}>Live Classroom Pre-Session</div>

      {/* Tabs */}
      <div style={{ display: 'flex', background: 'rgba(255,255,255,0.04)', borderRadius: 9, padding: 3, marginBottom: 12, gap: 3 }}>
        {['admin', 'teacher', 'student'].map(t => (
          <button key={t} onClick={() => setTab(t)} style={{ flex: 1, padding: '7px 3px', borderRadius: 7, border: 'none', background: tab === t ? '#4a90d9' : 'transparent', color: tab === t ? '#fff' : '#64748b', fontWeight: 600, fontSize: 11, cursor: 'pointer', textTransform: 'capitalize', transition: 'all 0.2s' }}>{t.charAt(0).toUpperCase() + t.slice(1)}</button>
        ))}
      </div>

      <form onSubmit={doLogin}>
        {tab === 'admin'
          ? <input type="email" placeholder="Email Address" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} required style={{ width: '100%', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(74,144,217,0.2)', borderRadius: 8, padding: '10px 12px', color: '#e2e8f0', fontSize: 12, outline: 'none', boxSizing: 'border-box', marginBottom: 9, fontFamily: 'inherit' }} />
          : <input placeholder={tab === 'teacher' ? 'E.G. INST001-TCH-001' : 'E.G. INST001-STD-001'} value={form.userId} onChange={e => setForm({ ...form, userId: e.target.value.toUpperCase() })} required style={{ width: '100%', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(74,144,217,0.2)', borderRadius: 8, padding: '10px 12px', color: '#e2e8f0', fontSize: 12, outline: 'none', boxSizing: 'border-box', marginBottom: 9, textTransform: 'uppercase', fontFamily: 'inherit' }} />
        }
        <div style={{ position: 'relative', marginBottom: 12 }}>
          <input type={showPwd ? 'text' : 'password'} placeholder="Enter password" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} required style={{ width: '100%', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(74,144,217,0.2)', borderRadius: 8, padding: '10px 40px 10px 12px', color: '#e2e8f0', fontSize: 12, outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit' }} />
          <button type="button" onClick={() => setShowPwd(!showPwd)} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: '#475569', cursor: 'pointer', padding: 0 }}>{showPwd ? <EyeOff size={15} /> : <Eye size={15} />}</button>
        </div>
        <button type="submit" disabled={loading} style={{ width: '100%', padding: '11px', borderRadius: 9, border: 'none', background: 'linear-gradient(135deg,#4a90d9,#1d6fbd)', color: '#fff', fontWeight: 700, fontSize: 13, cursor: loading ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7, opacity: loading ? 0.7 : 1, boxShadow: '0 4px 16px rgba(74,144,217,0.35)', fontFamily: 'inherit' }}>
          {loading ? <span style={{ width: 15, height: 15, border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 0.7s linear infinite', display: 'inline-block' }} /> : null}
          {loading ? 'Signing in...' : 'START LIVE SESSION / LOGIN'}
        </button>
      </form>

      {/* How it works steps */}
      <div style={{ marginTop: 14 }}>
        <HowItWorksSteps />
      </div>

      <div style={{ textAlign: 'center', marginTop: 12, fontSize: 11, color: '#334155' }}>
        No account? <Link to="/register" style={{ color: '#4a90d9', textDecoration: 'none', fontWeight: 600 }}>Register Institution →</Link>
      </div>
    </div>
  )
}

function HowItWorksSteps() {
  const [active, setActive] = useState(0)
  useEffect(() => { const t = setInterval(() => setActive(a => (a + 1) % 4), 1800); return () => clearInterval(t) }, [])
  const steps = [{ n: 1, label: 'Pre-session setup' }, { n: 2, label: 'Add testers' }, { n: 3, label: 'Start ElectIQ' }, { n: 4, label: 'Monitor' }]
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'center' }}>
      {steps.map((s, i) => (
        <React.Fragment key={s.n}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5, minWidth: 52 }}>
            <div style={{ width: 28, height: 28, borderRadius: '50%', background: active === i ? '#4a90d9' : 'rgba(74,144,217,0.12)', border: `2px solid ${active === i ? '#4a90d9' : 'rgba(74,144,217,0.25)'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, color: active === i ? '#fff' : '#4a90d9', transition: 'all 0.4s', boxShadow: active === i ? '0 0 10px rgba(74,144,217,0.5)' : 'none' }}>{s.n}</div>
            <div style={{ fontSize: 9, color: active === i ? '#e2e8f0' : '#475569', textAlign: 'center', lineHeight: 1.3, transition: 'color 0.4s' }}>{s.label}</div>
          </div>
          {i < 3 && <div style={{ width: 20, height: 2, background: 'rgba(74,144,217,0.2)', marginTop: 13, flexShrink: 0 }} />}
        </React.Fragment>
      ))}
    </div>
  )
}

// ─── MAIN LANDING ─────────────────────────────────────────────────────────────
export default function LandingPage() {
  const aiModels = useCounter(5)
  const userRoles = useCounter(3, 1100)
  const apiEps = useCounter(24, 1300)
  const liveStudents = useLive(847, 12)
  const liveAttn = useLive(74, 8)

  return (
    <div style={{ minHeight: '100vh', background: '#070c14', fontFamily: "'DM Sans','Segoe UI',sans-serif", color: '#e2e8f0', overflowX: 'hidden' }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600;700;800;900&display=swap');
        @keyframes fadeIn { from{opacity:0;transform:translateY(-6px)} to{opacity:1;transform:none} }
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }
        @keyframes spin { to{transform:rotate(360deg)} }
        .card { background:rgba(13,17,23,0.88); border:1px solid rgba(74,144,217,0.13); border-radius:13px; backdrop-filter:blur(10px); }
        input::placeholder { color:#334155 }
        input:focus { border-color:rgba(74,144,217,0.5)!important; }
        ::-webkit-scrollbar{width:4px} ::-webkit-scrollbar-track{background:#0d1117} ::-webkit-scrollbar-thumb{background:#1e2a3a;border-radius:2px}
      `}</style>

      {/* NAVBAR */}
      <nav style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0 24px', height: 54, borderBottom: '1px solid rgba(74,144,217,0.1)', background: 'rgba(7,12,20,0.97)', backdropFilter: 'blur(20px)', position: 'sticky', top: 0, zIndex: 100 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
          <div style={{ width: 32, height: 32, borderRadius: 8, overflow: 'hidden', border: '1px solid rgba(74,144,217,0.25)', flexShrink: 0 }}>
            <img src="/logo.jpg" alt="ClassroomIQ" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          </div>
          <span style={{ fontWeight: 800, fontSize: 16, color: '#e2e8f0', letterSpacing: '-0.3px' }}>ClassroomIQ</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 7, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 100, padding: '5px 12px', fontSize: 12, color: '#94a3b8' }}>
            <div style={{ width: 24, height: 24, borderRadius: '50%', background: 'linear-gradient(135deg,#4a90d9,#1d6fbd)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700 }}>A</div>
            A. Evans (Teacher)
          </div>
          <Link to="/login"><button style={{ padding: '7px 16px', borderRadius: 8, border: 'none', background: 'linear-gradient(135deg,#4a90d9,#1d6fbd)', color: '#fff', fontWeight: 700, fontSize: 13, cursor: 'pointer', boxShadow: '0 4px 12px rgba(74,144,217,0.3)' }}>Go Live</button></Link>
        </div>
      </nav>

      {/* MAIN GRID: Left | Center | Right */}
      <div style={{ display: 'grid', gridTemplateColumns: '190px 1fr 190px', gap: 10, padding: '10px 12px', maxWidth: 1260, margin: '0 auto', alignItems: 'start' }}>

        {/* ── LEFT ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>

          {/* My Sessions */}
          <div className="card" style={{ padding: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#e2e8f0' }}>My Sessions</div>
              <div style={{ color: '#4a6080', fontSize: 15, cursor: 'pointer' }}>···</div>
            </div>
            {[['Live Classroom 1', '26 minutes ago'], ['Live Classroom 2', '36 minutes ago'], ['Physics Session', '1 hr ago']].map(([n, t]) => (
              <div key={n} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '7px 9px', background: 'rgba(74,144,217,0.05)', border: '1px solid rgba(74,144,217,0.1)', borderRadius: 8, marginBottom: 5, cursor: 'pointer' }}>
                <div><div style={{ fontSize: 11, fontWeight: 600, color: '#c8d8e8', marginBottom: 1 }}>{n}</div><div style={{ fontSize: 9, color: '#475569' }}>{t}</div></div>
                <span style={{ color: '#4a90d9', fontSize: 13 }}>›</span>
              </div>
            ))}
          </div>

          {/* Setup Checklist */}
          <div className="card" style={{ padding: 12 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: '#e2e8f0', marginBottom: 3 }}>Setup Checklist</div>
            <div style={{ fontSize: 9, color: '#475569', marginBottom: 10 }}>Reference your rented account</div>
            {[['Register Your Institution', 'Admins sets up the organization'], ['Add Teachers & Students', 'Bulk import via CSV or create'], ['Start a Session', 'Create & join instantly']].map(([t, d], i) => (
              <div key={t} style={{ display: 'flex', gap: 8, marginBottom: 9 }}>
                <div style={{ minWidth: 20, height: 20, borderRadius: '50%', background: '#4a90d9', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700, flexShrink: 0, marginTop: 1 }}>{i + 1}</div>
                <div><div style={{ fontSize: 11, fontWeight: 600, color: '#e2e8f0', marginBottom: 1 }}>{t}</div><div style={{ fontSize: 9, color: '#475569' }}>{d}</div></div>
              </div>
            ))}
          </div>

          {/* Live numbers */}
          <div className="card" style={{ padding: 12 }}>
            <div style={{ fontSize: 10, fontWeight: 600, color: '#10b981', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 5 }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#10b981', display: 'inline-block', animation: 'pulse 1.5s infinite' }} /> LIVE NOW
            </div>
            <div style={{ marginBottom: 10 }}>
              <div style={{ fontSize: 24, fontWeight: 900, color: '#4a90d9', lineHeight: 1 }}>{liveStudents}</div>
              <div style={{ fontSize: 9, color: '#64748b' }}>Students Online</div>
            </div>
            <div>
              <div style={{ fontSize: 24, fontWeight: 900, color: '#10b981', lineHeight: 1 }}>{liveAttn}%</div>
              <div style={{ fontSize: 9, color: '#64748b' }}>Avg Attention</div>
            </div>
          </div>
        </div>

        {/* ── CENTER ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>

          {/* Top row */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', gap: 8, alignItems: 'start' }}>

            {/* Drowsiness */}
            <div className="card" style={{ padding: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                <div style={{ width: 34, height: 34, borderRadius: 9, background: 'rgba(74,144,217,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>👁</div>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 9, color: '#10b981', fontWeight: 600 }}>
                    <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#10b981', display: 'inline-block', animation: 'pulse 1.5s infinite' }} /> monitoring
                  </div>
                </div>
              </div>
              {/* Gauge */}
              <svg width={100} height={58} style={{ display: 'block', margin: '0 auto 8px' }}>
                <path d="M 15 50 A 35 35 0 0 1 85 50" fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth="10" strokeLinecap="round" />
                <path d="M 15 50 A 35 35 0 0 1 85 50" fill="none" stroke="#4a90d9" strokeWidth="10" strokeLinecap="round" strokeDasharray="110" strokeDashoffset="35" />
                <line x1="50" y1="50" x2="74" y2="22" stroke="#f59e0b" strokeWidth="2.5" strokeLinecap="round" />
                <circle cx="50" cy="50" r="4" fill="#e2e8f0" />
              </svg>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#e2e8f0', marginBottom: 3 }}>Drowsiness</div>
              <div style={{ fontSize: 9, color: '#64748b', lineHeight: 1.5 }}>EAR + PERCLOS + yawn detection and AI thresholds</div>
            </div>

            {/* CENTER LOGIN */}
            <div style={{ width: 290 }}>
              <CenterLogin />
            </div>

            {/* Head Pose */}
            <div className="card" style={{ padding: 12 }}>
              <RadarChart />
              <div style={{ fontSize: 13, fontWeight: 700, color: '#e2e8f0', marginBottom: 3 }}>Head Pose</div>
              <div style={{ fontSize: 9, color: '#64748b', lineHeight: 1.5 }}>Pitch, yaw, roll detection — head pose to looking away</div>
            </div>
          </div>

          {/* Middle row */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            <div className="card" style={{ padding: 12 }}>
              <BlinkChart />
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 8, color: '#334155', marginBottom: 6, marginTop: 3 }}>
                <span>08:00</span><span>12:00</span><span>16:00</span><span>20:00</span>
              </div>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#e2e8f0', marginBottom: 2 }}>Blink Rate</div>
              <div style={{ fontSize: 9, color: '#64748b' }}>Live blink-rate changes over time</div>
            </div>
            <div className="card" style={{ padding: 12 }}>
              <MultiFace />
              <div style={{ fontSize: 13, fontWeight: 700, color: '#e2e8f0', marginTop: 9, marginBottom: 2 }}>Multi-Face</div>
              <div style={{ fontSize: 9, color: '#64748b' }}>Alerts when multiple faces detected in frame</div>
            </div>
          </div>

          {/* Stats bar */}
          <div className="card" style={{ padding: '12px 16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-around' }}>
              {[['5', 'AI Models'], ['2s', 'Update Interval'], ['3', 'User Roles'], ['24', 'API Endpoints']].map(([v, l]) => (
                <div key={l} style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 26, fontWeight: 900, color: '#e2e8f0', lineHeight: 1, letterSpacing: '-1px' }}>{v}</div>
                  <div style={{ fontSize: 9, color: '#475569', marginTop: 2 }}>{l}</div>
                </div>
              ))}
            </div>
            <div style={{ textAlign: 'center', marginTop: 8, fontSize: 9, color: '#1e2a3a' }}>No video stored. No data sent to servers. Privacy-first by design.</div>
          </div>

          {/* CTA */}
          <div style={{ textAlign: 'center' }}>
            <Link to="/register" style={{ textDecoration: 'none' }}>
              <button style={{ padding: '12px 32px', borderRadius: 11, border: 'none', background: 'linear-gradient(135deg,#4a90d9,#1d6fbd)', color: '#fff', fontWeight: 700, fontSize: 14, cursor: 'pointer', boxShadow: '0 5px 20px rgba(74,144,217,0.38)', letterSpacing: 0.3 }}>
                Register Institution →
              </button>
            </Link>
          </div>
        </div>

        {/* ── RIGHT ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>

          {/* Alert Feed */}
          <div className="card" style={{ padding: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#e2e8f0' }}>Alert Feed</div>
              <div style={{ color: '#4a6080', fontSize: 15 }}>···</div>
            </div>
            <AlertFeed />
          </div>

          {/* Heatmap */}
          <div className="card" style={{ padding: 12 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#e2e8f0', marginBottom: 8 }}>Real-time Attention Map</div>
            <Heatmap />
          </div>

          {/* Expression */}
          <div className="card" style={{ padding: 12 }}>
            <div style={{ display: 'flex', gap: 5, marginBottom: 8 }}>
              {['😊', '😐', '😮'].map((e, i) => <div key={i} style={{ width: 32, height: 32, borderRadius: 7, background: 'rgba(74,144,217,0.08)', border: '1px solid rgba(74,144,217,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 }}>{e}</div>)}
            </div>
            <div style={{ fontSize: 9, color: '#64748b', marginBottom: 6 }}>Emotion-score:</div>
            <ExprBars />
            <div style={{ fontSize: 12, fontWeight: 700, color: '#e2e8f0', marginTop: 10, marginBottom: 2 }}>Expression</div>
            <div style={{ fontSize: 9, color: '#64748b', lineHeight: 1.5, marginBottom: 9 }}>7 facial expressions tracked real-time with face-api.js.</div>
            <Link to="/register" style={{ textDecoration: 'none' }}>
              <button style={{ width: '100%', padding: '8px', borderRadius: 7, border: 'none', background: 'linear-gradient(135deg,#4a90d9,#1d6fbd)', color: '#fff', fontWeight: 600, fontSize: 11, cursor: 'pointer' }}>See Demo Feed</button>
            </Link>
          </div>

          {/* Teacher dashboard preview */}
          <div className="card" style={{ padding: 12 }}>
            <div style={{ background: 'rgba(74,144,217,0.06)', borderRadius: 8, padding: 8, marginBottom: 8 }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 3 }}>
                {Array.from({ length: 8 }).map((_, i) => <div key={i} style={{ height: 14, borderRadius: 3, background: `rgba(${i % 3 === 0 ? '239,68,68' : i % 3 === 1 ? '245,158,11' : '16,185,129'},${0.3 + Math.random() * 0.5})` }} />)}
              </div>
            </div>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#e2e8f0', marginBottom: 2 }}>Live Teacher Dashboard</div>
            <div style={{ fontSize: 9, color: '#64748b', lineHeight: 1.5 }}>Real-time student attention grid with nudge controls.</div>
          </div>
        </div>
      </div>
    </div>
  )
}
