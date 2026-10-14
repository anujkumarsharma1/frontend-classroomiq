import { useEffect, useRef, useState } from 'react'
import { NavLink, Link } from 'react-router-dom'
import { LayoutGrid, DoorOpen, Briefcase, Cpu, UserPlus, TrendingUp, LogOut, Radio, ChevronDown, ScanFace } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { useLive } from '../data/LiveContext'

export const reduced = () => typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

// Continuous tween toward the target value (no stop-start jumps).
export function AnimatedNumber({ value, format = (v) => Math.round(v), className }) {
  const [shown, setShown] = useState(value ?? 0)
  const cur = useRef(value ?? 0)
  useEffect(() => {
    if (value == null) return
    if (reduced()) { cur.current = value; setShown(value); return }
    let raf
    const step = () => {
      const d = value - cur.current
      if (Math.abs(d) < 0.01) { cur.current = value; setShown(value); return }
      cur.current += d * 0.12
      setShown(cur.current)
      raf = requestAnimationFrame(step)
    }
    raf = requestAnimationFrame(step)
    return () => cancelAnimationFrame(raf)
  }, [value])
  return <span className={className}>{value == null ? '—' : format(shown)}</span>
}

export function Sparkline({ data, height = 36, label }) {
  if (!data || data.length < 2) return <svg className="spark" height={height} role="img" aria-label={`${label}: not enough data`} />
  const max = Math.max(...data, 1e-6), min = Math.min(...data, 0)
  const pts = data.map((v, i) => `${(i / (data.length - 1)) * 100},${height - ((v - min) / (max - min || 1)) * (height - 4) - 2}`).join(' ')
  return (
    <svg className="spark" viewBox={`0 0 100 ${height}`} preserveAspectRatio="none" height={height} role="img" aria-label={label}>
      <polygon points={`0,${height} ${pts} 100,${height}`} className="spark-fill" />
      <polyline points={pts} className="spark-line" vectorEffect="non-scaling-stroke" />
    </svg>
  )
}

export function Ring({ value, size = 92, label }) {
  const r = size / 2 - 7, c = 2 * Math.PI * r, v = value ?? 0
  return (
    <svg width={size} height={size} className="ring" role="img" aria-label={`${label}: ${value == null ? 'no data' : Math.round(v * 100) + '%'}`}>
      <circle cx={size / 2} cy={size / 2} r={r} className="ring-bg" />
      <circle cx={size / 2} cy={size / 2} r={r} className="ring-fg" strokeDasharray={c} strokeDashoffset={c * (1 - v)} transform={`rotate(-90 ${size / 2} ${size / 2})`} />
      <text x="50%" y="54%" textAnchor="middle" className="ring-text">{value == null ? '—' : `${Math.round(v * 100)}%`}</text>
    </svg>
  )
}

export function Block({ title, icon: Icon, span = '', children, detail, action, className = '' }) {
  const [open, setOpen] = useState(false)
  return (
    <section className={`block ${span} ${open ? 'open' : ''} ${className}`}>
      <header className="block-head">
        <h2 className="block-title">{Icon && <Icon size={16} aria-hidden />}{title}</h2>
        <div className="row-gap">
          {action}
          {detail && (
            <button className="icon-btn" aria-expanded={open} aria-label={`${open ? 'Collapse' : 'Expand'} ${title}`} onClick={() => setOpen(!open)}>
              <ChevronDown size={16} className="chev" />
            </button>
          )}
        </div>
      </header>
      {children}
      {detail && <div className="block-detail" hidden={!open}>{detail}</div>}
    </section>
  )
}

export function DemoBadge() {
  const { kind } = useLive() || {}
  if (kind !== 'demo') return null
  return <span className="demo-badge" title="All numbers on this screen come from a simulated MQTT event stream, not real cameras."><Radio size={13} aria-hidden /> Demo data</span>
}

export function LivePulse({ label = 'Live' }) { return <span className="live-pulse"><span className="pulse-dot" aria-hidden />{label}</span> }

const NAV = [
  ['/console', 'Overview', LayoutGrid, true],
  ['/console/rooms', 'Rooms', DoorOpen],
  ['/console/office', 'Office', Briefcase],
  ['/console/trends', 'Trends', TrendingUp],
  ['/console/devices', 'Devices', Cpu],
  ['/console/enroll', 'Enrollment', UserPlus],
]
export function ConsoleShell({ children }) {
  const { user, logout } = useAuth()
  return (
    <div className="console">
      <a href="#main" className="skip">Skip to content</a>
      <aside className="side">
        <Link to="/console" className="logo"><ScanFace size={22} aria-hidden /> ClassroomIQ</Link>
        <nav aria-label="Console">
          {NAV.map(([to, label, Icon, end]) => (
            <NavLink key={to} to={to} end={end} className="nav-item" aria-label={label}><Icon size={18} aria-hidden /><span>{label}</span></NavLink>
          ))}
        </nav>
        <div className="side-foot">
          <div className="who-mini"><span className="avatar" aria-hidden>{(user?.fullName || '?')[0]}</span><span className="small">{user?.fullName}<br /><span className="muted xs">{user?.demo ? 'Demo admin' : user?.role}</span></span></div>
          <button className="icon-btn" onClick={logout} aria-label="Sign out"><LogOut size={16} /></button>
        </div>
      </aside>
      <main id="main" className="console-main">{children}</main>
    </div>
  )
}

export function PageHead({ title, sub, children }) {
  return (
    <div className="page-top">
      <div><h1 className="h1">{title}</h1>{sub && <p className="muted">{sub}</p>}</div>
      <div className="row-gap wrap-gap">{children}<DemoBadge /></div>
    </div>
  )
}

export const hhmm = (t) => (t ? new Date(t).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: false }) : '—')
export const STATUS = { on_time: 'On time', late: 'Late', early_exit: 'Left early', absent: 'Absent', pending: 'Not yet', present: 'Present' }
