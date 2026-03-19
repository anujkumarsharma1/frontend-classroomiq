import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import api from '../utils/api'
import toast from 'react-hot-toast'
import { Eye, EyeOff } from 'lucide-react'

export default function LoginPage() {
  const [tab, setTab] = useState('admin')
  const [form, setForm] = useState({ email: '', userId: '', password: '' })
  const [showPwd, setShowPwd] = useState(false)
  const [loading, setLoading] = useState(false)
  const { login } = useAuth()
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
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
      toast.success(`Welcome back, ${user.fullName}!`)
      if (user.role === 'admin') navigate('/admin')
      else if (user.role === 'teacher') navigate('/teacher')
      else navigate('/student')
    } catch (err) {
      toast.error(err.response?.data?.error || 'Login failed')
    } finally {
      setLoading(false)
    }
  }

  const s = {
    page: {
      minHeight: '100vh',
      background: '#0d1117',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 24,
      fontFamily: "'DM Sans', 'Segoe UI', sans-serif",
    },
    wrap: { width: '100%', maxWidth: 420 },
    logo: {
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      gap: 12, marginBottom: 10,
    },
    logoImg: { width: 42, height: 42, borderRadius: 10, objectFit: 'cover', border: '1px solid rgba(255,255,255,0.1)' },
    logoText: { fontSize: 26, fontWeight: 900, color: '#fff', letterSpacing: '-0.5px' },
    subtitle: { textAlign: 'center', color: '#64748b', fontSize: 14, marginBottom: 28 },
    card: {
      background: '#161b26',
      border: '1px solid rgba(255,255,255,0.07)',
      borderRadius: 16,
      padding: '28px 28px',
    },
    tabs: {
      display: 'flex', background: '#0d1117',
      borderRadius: 12, padding: 4, marginBottom: 24, gap: 4,
    },
    tabBtn: (active) => ({
      flex: 1, padding: '9px 4px', borderRadius: 9, border: 'none',
      background: active ? '#6366f1' : 'transparent',
      color: active ? '#fff' : '#64748b',
      fontWeight: 600, fontSize: 13, cursor: 'pointer',
      textTransform: 'capitalize', transition: 'all 0.2s',
      boxShadow: active ? '0 4px 12px rgba(99,102,241,0.35)' : 'none',
    }),
    label: { display: 'block', fontSize: 13, fontWeight: 500, color: '#94a3b8', marginBottom: 7 },
    input: {
      width: '100%', background: '#0d1117',
      border: '1px solid rgba(255,255,255,0.08)',
      borderRadius: 10, padding: '12px 14px',
      color: '#e2e8f0', fontSize: 14, outline: 'none',
      boxSizing: 'border-box', transition: 'border-color 0.2s',
      fontFamily: 'inherit',
    },
    inputFocus: { borderColor: 'rgba(99,102,241,0.6)' },
    pwdWrap: { position: 'relative' },
    eyeBtn: {
      position: 'absolute', right: 12, top: '50%',
      transform: 'translateY(-50%)', background: 'none',
      border: 'none', color: '#475569', cursor: 'pointer', padding: 0,
    },
    submitBtn: (loading) => ({
      width: '100%', padding: '13px',
      borderRadius: 10, border: 'none',
      background: loading ? 'rgba(99,102,241,0.6)' : '#6366f1',
      color: '#fff', fontWeight: 700, fontSize: 15,
      cursor: loading ? 'not-allowed' : 'pointer',
      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
      marginTop: 8, boxShadow: '0 4px 16px rgba(99,102,241,0.3)',
      transition: 'all 0.2s', fontFamily: 'inherit',
    }),
    spinner: {
      width: 18, height: 18,
      border: '2px solid rgba(255,255,255,0.3)',
      borderTopColor: '#fff', borderRadius: '50%',
      animation: 'spin 0.7s linear infinite', display: 'inline-block',
    },
    bottom: { textAlign: 'center', marginTop: 20, color: '#475569', fontSize: 14 },
    link: { color: '#6366f1', textDecoration: 'none', fontWeight: 600 },
  }

  return (
    <div style={s.page}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800;900&display=swap');
        @keyframes spin { to { transform: rotate(360deg) } }
        input::placeholder { color: #334155 }
        input:focus { border-color: rgba(99,102,241,0.6) !important; box-shadow: 0 0 0 3px rgba(99,102,241,0.1); }
      `}</style>

      <div style={s.wrap}>
        {/* Logo */}
        <div style={s.logo}>
          <img src="/logo.jpg" alt="ClassroomIQ" style={s.logoImg} />
          <span style={s.logoText}>ClassroomIQ</span>
        </div>
        <p style={s.subtitle}>Sign in to your account</p>

        <div style={s.card}>
          {/* Tabs */}
          <div style={s.tabs}>
            {['admin', 'teacher', 'student'].map(t => (
              <button key={t} onClick={() => setTab(t)} style={s.tabBtn(tab === t)}>
                {t.charAt(0).toUpperCase() + t.slice(1)}
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit}>
            {/* Email or User ID */}
            <div style={{ marginBottom: 16 }}>
              <label style={s.label}>
                {tab === 'admin' ? 'Email Address' : 'User ID'}
              </label>
              {tab === 'admin' ? (
                <input
                  type="email"
                  placeholder="admin@school.edu"
                  value={form.email}
                  onChange={e => setForm({ ...form, email: e.target.value })}
                  style={s.input}
                  required
                />
              ) : (
                <input
                  placeholder={tab === 'teacher' ? 'e.g. INST001-TCH-001' : 'e.g. INST001-STD-001'}
                  value={form.userId}
                  onChange={e => setForm({ ...form, userId: e.target.value.toUpperCase() })}
                  style={{ ...s.input, textTransform: 'uppercase', letterSpacing: '0.5px' }}
                  required
                />
              )}
            </div>

            {/* Password */}
            <div style={{ marginBottom: 6 }}>
              <label style={s.label}>Password</label>
              <div style={s.pwdWrap}>
                <input
                  type={showPwd ? 'text' : 'password'}
                  placeholder="Enter password"
                  value={form.password}
                  onChange={e => setForm({ ...form, password: e.target.value })}
                  style={{ ...s.input, paddingRight: 44 }}
                  required
                />
                <button type="button" onClick={() => setShowPwd(!showPwd)} style={s.eyeBtn}>
                  {showPwd ? <EyeOff size={17} /> : <Eye size={17} />}
                </button>
              </div>
            </div>

            <button type="submit" style={s.submitBtn(loading)} disabled={loading}>
              {loading
                ? <><span style={s.spinner} /> Signing in...</>
                : <><span style={{ fontSize: 16 }}>→</span> Sign In</>
              }
            </button>
          </form>
        </div>

        <p style={s.bottom}>
          New institution?{' '}
          <Link to="/register" style={s.link}>Register here</Link>
        </p>
      </div>
    </div>
  )
}
