import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { Check } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import api, { errorText } from '../utils/api'
import { Brand, Field, PasswordInput, Spinner } from '../components/ui'
import { FEATURES } from '../utils/features'

export default function RegisterPage() {
  const [step, setStep] = useState(1)
  const [form, setForm] = useState({ institutionName: '', adminName: '', email: '', password: '', confirmPassword: '' })
  const [features, setFeatures] = useState(FEATURES.map((f) => f.id))
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const { login } = useAuth()
  const navigate = useNavigate()
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value })

  const next = (e) => {
    e.preventDefault()
    if (form.password.length < 6) return setError('Use at least 6 characters for the password.')
    if (form.password !== form.confirmPassword) return setError("The two passwords don't match.")
    setError('')
    setStep(2)
  }

  const toggle = (id) => setFeatures((f) => (f.includes(id) ? f.filter((x) => x !== id) : [...f, id]))

  const submit = async () => {
    setLoading(true)
    setError('')
    try {
      const { data } = await api.post('/auth/register-institution', {
        institutionName: form.institutionName,
        adminName: form.adminName,
        email: form.email,
        password: form.password,
        enabledFeatures: features,
      })
      login(data.token, data.user, data.institution)
      toast.success('Institution registered')
      navigate('/console')
    } catch (err) {
      setError(errorText(err, 'Registration failed. Try again.'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="auth-page">
      <div className="auth-box" style={{ maxWidth: 500 }}>
        <Brand />
        <p className="small muted" style={{ marginBottom: 6 }}>Step {step} of 2</p>
        <h1 style={{ marginBottom: 8 }}>{step === 1 ? 'Register your institution' : 'Choose what to track'}</h1>
        <p className="muted" style={{ marginBottom: 28 }}>
          {step === 1 ? "You'll be the admin. You add rooms, cameras and people after this." : 'Edge devices only run the features you turn on.'}
        </p>
        <div className="card">
          {step === 1 ? (
            <form onSubmit={next} className="stack" style={{ gap: 18 }}>
              <Field label="Institution name" id="r-inst"><input id="r-inst" className="input" value={form.institutionName} onChange={set('institutionName')} autoComplete="organization" required /></Field>
              <Field label="Your full name" id="r-name"><input id="r-name" className="input" value={form.adminName} onChange={set('adminName')} autoComplete="name" required /></Field>
              <Field label="Email" id="r-email"><input id="r-email" className="input" type="email" value={form.email} onChange={set('email')} autoComplete="email" required /></Field>
              <Field label="Password" hint="At least 6 characters." id="r-pwd"><PasswordInput id="r-pwd" value={form.password} onChange={set('password')} autoComplete="new-password" minLength={6} /></Field>
              <Field label="Confirm password" id="r-pwd2"><PasswordInput id="r-pwd2" value={form.confirmPassword} onChange={set('confirmPassword')} autoComplete="new-password" /></Field>
              {error && <p className="small" role="alert" style={{ color: 'var(--low)' }}>{error}</p>}
              <button type="submit" className="btn btn-primary btn-block">Continue</button>
            </form>
          ) : (
            <div className="stack" style={{ gap: 10 }}>
              {FEATURES.map(({ id, label, desc }) => {
                const on = features.includes(id)
                return (
                  <button key={id} type="button" role="checkbox" aria-checked={on} className="check" onClick={() => toggle(id)}>
                    <span className="box">{on && <Check size={14} strokeWidth={3} />}</span>
                    <span>
                      <span style={{ display: 'block', fontWeight: 500 }}>{label}</span>
                      <span className="small muted">{desc}</span>
                    </span>
                  </button>
                )
              })}
              {error && <p className="small" role="alert" style={{ color: 'var(--low)' }}>{error}</p>}
              <button className="btn btn-primary btn-block" style={{ marginTop: 14 }} onClick={submit} disabled={loading || features.length === 0}>
                {loading && <Spinner />}{loading ? 'Registering' : 'Register institution'}
              </button>
              {features.length === 0 && <p className="hint" style={{ textAlign: 'center' }}>Turn on at least one.</p>}
              <button className="btn btn-quiet btn-block" onClick={() => setStep(1)}>Back</button>
            </div>
          )}
        </div>
        <p className="small muted" style={{ marginTop: 24, textAlign: 'center' }}>Already registered? <Link to="/login">Sign in</Link></p>
      </div>
    </main>
  )
}
