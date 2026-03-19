import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import api from '../utils/api'
import toast from 'react-hot-toast'
import { Eye, EyeOff, CheckCircle } from 'lucide-react'

const FEATURES = [
  { id: 'drowsiness', label: 'Drowsiness Detection', desc: 'EAR + PERCLOS + yawn' },
  { id: 'blink', label: 'Blink Rate Monitor', desc: 'Fatigue via blink frequency' },
  { id: 'headPose', label: 'Head Pose Tracking', desc: 'Pitch / Yaw / Roll' },
  { id: 'pupil', label: 'Pupil & Iris Detection', desc: 'Gaze direction tracking' },
  { id: 'expression', label: 'Expression Analysis', desc: '7 facial expressions' },
]

export default function RegisterPage() {
  const [step, setStep] = useState(1)
  const [form, setForm] = useState({ institutionName: '', adminName: '', email: '', password: '', confirmPassword: '' })
  const [features, setFeatures] = useState(['drowsiness', 'blink', 'headPose', 'pupil', 'expression'])
  const [showPwd, setShowPwd] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [loading, setLoading] = useState(false)
  const { login } = useAuth()
  const navigate = useNavigate()

  const toggleFeature = (id) =>
    setFeatures(prev => prev.includes(id) ? prev.filter(f => f !== id) : [...prev, id])

  const handleStep1 = (e) => {
    e.preventDefault()
    if (form.password !== form.confirmPassword) { toast.error('Passwords do not match'); return }
    if (form.password.length < 6) { toast.error('Password must be at least 6 characters'); return }
    setStep(2)
  }

  const handleSubmit = async () => {
    if (features.length === 0) { toast.error('Select at least one AI feature'); return }
    setLoading(true)
    try {
      const { data } = await api.post('/auth/register-institution', {
        institutionName: form.institutionName,
        adminName: form.adminName,
        email: form.email,
        password: form.password,
        enabledFeatures: features,
      })
      login(data.token, data.user, data.institution)
      toast.success('Institution registered successfully!')
      navigate('/admin')
    } catch (err) {
      toast.error(err.response?.data?.error || 'Registration failed')
    } finally {
      setLoading(false)
    }
  }

  const s = {
    page: {
      minHeight: '100vh', background: '#0d1117',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 24, fontFamily: "'DM Sans', 'Segoe UI', sans-serif",
    },
    wrap: { width: '100%', maxWidth: 480 },
    logo: { display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, marginBottom: 6 },
    logoImg: { width: 42, height: 42, borderRadius: 10, objectFit: 'cover', border: '1px solid rgba(255,255,255,0.1)' },
    logoText: { fontSize: 26, fontWeight: 900, color: '#fff', letterSpacing: '-0.5px' },
    subtitle: { textAlign: 'center', color: '#64748b', fontSize: 14, marginBottom: 24 },
    stepper: { display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0, marginBottom: 24 },
    stepCircle: (active, done) => ({
      width: 36, height: 36, borderRadius: '50%',
      background: done ? '#6366f1' : active ? '#6366f1' : 'transparent',
      border: `2px solid ${active || done ? '#6366f1' : 'rgba(255,255,255,0.12)'}`,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontWeight: 700, fontSize: 14,
      color: active || done ? '#fff' : '#475569',
      boxShadow: active ? '0 0 14px rgba(99,102,241,0.5)' : 'none',
    }),
    stepLine: { width: 60, height: 2, background: step > 1 ? '#6366f1' : 'rgba(255,255,255,0.08)', margin: '0 4px', marginBottom: 0 },
    card: { background: '#161b26', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 16, padding: '32px 28px' },
    cardTitle: { fontSize: 22, fontWeight: 800, color: '#fff', marginBottom: 24 },
    label: { display: 'block', fontSize: 13, fontWeight: 500, color: '#94a3b8', marginBottom: 7 },
    input: {
      width: '100%', background: '#0d1117',
      border: '1px solid rgba(255,255,255,0.08)',
      borderRadius: 10, padding: '12px 14px',
      color: '#e2e8f0', fontSize: 14, outline: 'none',
      boxSizing: 'border-box', fontFamily: 'inherit',
    },
    group: { marginBottom: 18 },
    pwdWrap: { position: 'relative' },
    eyeBtn: { position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: '#475569', cursor: 'pointer', padding: 0 },
    primaryBtn: (disabled) => ({
      width: '100%', padding: '13px', borderRadius: 10, border: 'none',
      background: disabled ? 'rgba(99,102,241,0.5)' : '#6366f1',
      color: '#fff', fontWeight: 700, fontSize: 15,
      cursor: disabled ? 'not-allowed' : 'pointer',
      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
      marginTop: 8, boxShadow: '0 4px 16px rgba(99,102,241,0.3)',
      fontFamily: 'inherit',
    }),
    ghostBtn: {
      width: '100%', padding: '12px', borderRadius: 10,
      border: '1px solid rgba(255,255,255,0.08)',
      background: 'transparent', color: '#64748b',
      fontWeight: 600, fontSize: 14, cursor: 'pointer',
      marginTop: 10, fontFamily: 'inherit',
    },
    spinner: { width: 18, height: 18, border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 0.7s linear infinite', display: 'inline-block' },
    bottom: { textAlign: 'center', marginTop: 20, color: '#475569', fontSize: 14 },
    link: { color: '#6366f1', textDecoration: 'none', fontWeight: 600 },
    featureItem: (active) => ({
      display: 'flex', alignItems: 'center', gap: 12,
      padding: '13px 14px', borderRadius: 10, cursor: 'pointer',
      border: `1.5px solid ${active ? '#6366f1' : 'rgba(255,255,255,0.07)'}`,
      background: active ? 'rgba(99,102,241,0.08)' : 'rgba(255,255,255,0.02)',
      transition: 'all 0.15s', marginBottom: 8,
    }),
    checkbox: (active) => ({
      width: 20, height: 20, borderRadius: 6, flexShrink: 0,
      border: `2px solid ${active ? '#6366f1' : 'rgba(255,255,255,0.15)'}`,
      background: active ? '#6366f1' : 'transparent',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      transition: 'all 0.15s',
    }),
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
        <p style={s.subtitle}>Register your institution</p>

        {/* Stepper */}
        <div style={s.stepper}>
          <div style={s.stepCircle(step === 1, step > 1)}>
            {step > 1 ? <CheckCircle size={16} /> : '1'}
          </div>
          <div style={s.stepLine} />
          <div style={s.stepCircle(step === 2, false)}>2</div>
        </div>

        <div style={s.card}>
          {step === 1 ? (
            <>
              <div style={s.cardTitle}>Institution Details</div>
              <form onSubmit={handleStep1}>
                <div style={s.group}>
                  <label style={s.label}>Institution Name</label>
                  <input placeholder="Springfield High School" value={form.institutionName} onChange={e => setForm({ ...form, institutionName: e.target.value })} style={s.input} required />
                </div>
                <div style={s.group}>
                  <label style={s.label}>Admin Full Name</label>
                  <input placeholder="John Smith" value={form.adminName} onChange={e => setForm({ ...form, adminName: e.target.value })} style={s.input} required />
                </div>
                <div style={s.group}>
                  <label style={s.label}>Admin Email</label>
                  <input type="email" placeholder="admin@school.edu" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} style={s.input} required />
                </div>
                <div style={s.group}>
                  <label style={s.label}>Password</label>
                  <div style={s.pwdWrap}>
                    <input type={showPwd ? 'text' : 'password'} placeholder="Min. 6 characters" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} style={{ ...s.input, paddingRight: 44 }} required />
                    <button type="button" onClick={() => setShowPwd(!showPwd)} style={s.eyeBtn}>
                      {showPwd ? <EyeOff size={17} /> : <Eye size={17} />}
                    </button>
                  </div>
                </div>
                <div style={s.group}>
                  <label style={s.label}>Confirm Password</label>
                  <div style={s.pwdWrap}>
                    <input type={showConfirm ? 'text' : 'password'} placeholder="Re-enter password" value={form.confirmPassword} onChange={e => setForm({ ...form, confirmPassword: e.target.value })} style={{ ...s.input, paddingRight: 44 }} required />
                    <button type="button" onClick={() => setShowConfirm(!showConfirm)} style={s.eyeBtn}>
                      {showConfirm ? <EyeOff size={17} /> : <Eye size={17} />}
                    </button>
                  </div>
                </div>
                <button type="submit" style={s.primaryBtn(false)}>Continue →</button>
              </form>
            </>
          ) : (
            <>
              <div style={s.cardTitle}>Select AI Features</div>
              <p style={{ fontSize: 13, color: '#64748b', marginBottom: 18, marginTop: -16 }}>Choose which AI models to enable for your institution.</p>
              {FEATURES.map(({ id, label, desc }) => {
                const active = features.includes(id)
                return (
                  <div key={id} style={s.featureItem(active)} onClick={() => toggleFeature(id)}>
                    <div style={s.checkbox(active)}>
                      {active && <CheckCircle size={13} color="#fff" />}
                    </div>
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 600, color: '#e2e8f0' }}>{label}</div>
                      <div style={{ fontSize: 12, color: '#475569', marginTop: 1 }}>{desc}</div>
                    </div>
                  </div>
                )
              })}
              <button onClick={handleSubmit} style={s.primaryBtn(loading || features.length === 0)} disabled={loading || features.length === 0}>
                {loading ? <><span style={s.spinner} /> Registering...</> : 'Register Institution'}
              </button>
              <button onClick={() => setStep(1)} style={s.ghostBtn}>← Back</button>
            </>
          )}
        </div>

        <p style={s.bottom}>
          {step === 1
            ? <>Already registered? <Link to="/login" style={s.link}>Sign in</Link></>
            : <>Already registered? <Link to="/login" style={s.link}>Sign in</Link></>
          }
        </p>
      </div>
    </div>
  )
}
