import { useEffect, useId, useState } from 'react'
import { Link, NavLink, useNavigate } from 'react-router-dom'
import { ArrowRight, Eye, EyeOff, LogOut, X } from 'lucide-react'
import { useAuth } from '../context/AuthContext'


export function Brand({ to = '/' }) {
  return (
    <Link to={to} className="brand">
      <img src="/logo.jpg" alt="" width="32" height="32" />
      ClassroomIQ
    </Link>
  )
}

export function HeadingLink({ to, href, children, as: Tag = 'h2', className }) {
  const inner = (
    <>
      {children}
      <ArrowRight size={18} aria-hidden="true" />
    </>
  )
  return (
    <Tag className={className}>
      {to ? <Link to={to} className="h-link">{inner}</Link> : <a href={href} className="h-link">{inner}</a>}
    </Tag>
  )
}

export function Field({ label, hint, children, id }) {
  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      {children}
      {hint && <span className="hint">{hint}</span>}
    </div>
  )
}

export function PasswordInput({ id, value, onChange, placeholder, autoComplete = 'current-password', required = true, minLength }) {
  const [show, setShow] = useState(false)
  return (
    <div className="input-wrap">
      <input id={id} className="input" type={show ? 'text' : 'password'} value={value} onChange={onChange} placeholder={placeholder} autoComplete={autoComplete} required={required} minLength={minLength} />
      <button type="button" className="icon-btn" onClick={() => setShow(!show)} aria-label={show ? 'Hide password' : 'Show password'} aria-pressed={show}>
        {show ? <EyeOff size={18} /> : <Eye size={18} />}
      </button>
    </div>
  )
}

export function Spinner() {
  return <span className="spinner" aria-hidden="true" />
}

export function Empty({ title, children }) {
  return (
    <div className="empty">
      <h2 className="h-sm">{title}</h2>
      {children && <p className="small">{children}</p>}
    </div>
  )
}

export function Modal({ title, onClose, children }) {
  const titleId = useId()
  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])
  return (
    <div className="modal-back" onClick={onClose}>
      <div className="card modal" role="dialog" aria-modal="true" aria-labelledby={titleId} onClick={(e) => e.stopPropagation()}>
        <div className="spread" style={{ marginBottom: 20 }}>
          <h2 id={titleId}>{title}</h2>
          <button className="icon-btn" onClick={onClose} aria-label="Close"><X size={20} /></button>
        </div>
        {children}
      </div>
    </div>
  )
}

export function Stat({ value, label, to }) {
  const body = (
    <>
      <div className="stat-value">{value}</div>
      <div className="stat-label">{label}</div>
    </>
  )
  return to ? <Link to={to} className="card tight card-link">{body}</Link> : <div className="card tight">{body}</div>
}

export function AppShell({ tabs, roleLabel, banner, children }) {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  return (
    <>
      <header className="topbar">
        <div className="wrap topbar-inner">
          <Brand to={tabs[0].to} />
          <nav className="tabs" aria-label="Sections">
            {tabs.map(({ to, label, end, icon: Icon, badge }) => (
              <NavLink key={to} to={to} end={end} className={({ isActive }) => `tab${isActive ? ' active' : ''}`}>
                {Icon && <Icon size={16} aria-hidden="true" />}
                {label}
                {badge}
              </NavLink>
            ))}
          </nav>
          <div className="row" style={{ marginLeft: 'auto', gap: 16 }}>
            <div className="who small">
              <div>{user?.fullName}</div>
              <div className="xs muted">{roleLabel}</div>
            </div>
            <button className="btn btn-quiet btn-sm" onClick={() => { logout(); navigate('/login') }}>
              <LogOut size={15} aria-hidden="true" /> Sign out
            </button>
          </div>
        </div>
      </header>
      {banner}
      <main className="app-main">
        <div className="wrap">{children}</div>
      </main>
    </>
  )
}
