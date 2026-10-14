import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { useAuth } from '../context/AuthContext'
import api, { errorText } from '../utils/api'
import { Field, PasswordInput, Spinner } from './ui'

const ROLES = [
  { id: 'teacher', label: 'Teacher' },
  { id: 'admin', label: 'Admin' },
]

export default function SignInForm({ idPrefix = 'signin' }) {
  const [role, setRole] = useState('teacher')
  const [form, setForm] = useState({ email: '', userId: '', password: '' })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const { login } = useAuth()
  const navigate = useNavigate()

  const submit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const res = role === 'admin'
        ? await api.post('/auth/admin-login', { email: form.email, password: form.password })
        : await api.post('/auth/login', { userId: form.userId.trim().toUpperCase(), password: form.password, role })
      const { token, user, institution } = res.data
      login(token, user, institution)
      toast.success(`Welcome back, ${user.fullName}`)
      navigate('/console')
    } catch (err) {
      setError(errorText(err, 'Sign-in failed. Check your details and try again.'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={submit} className="stack" style={{ gap: 18 }} noValidate={false}>
      <div className="seg" role="group" aria-label="I am a">
        {ROLES.map((r) => (
          <button key={r.id} type="button" aria-pressed={role === r.id} onClick={() => { setRole(r.id); setError('') }}>{r.label}</button>
        ))}
      </div>
      {role === 'admin' ? (
        <Field label="Email" id={`${idPrefix}-email`}>
          <input id={`${idPrefix}-email`} className="input" type="email" autoComplete="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="you@school.edu" required />
        </Field>
      ) : (
        <Field label={'Teacher ID'} hint="Your admin gave you this ID." id={`${idPrefix}-uid`}>
          <input id={`${idPrefix}-uid`} className="input" autoComplete="username" value={form.userId} onChange={(e) => setForm({ ...form, userId: e.target.value.toUpperCase() })} placeholder={role === 'teacher' ? 'INST001-TCH-001' : 'INST001-STD-001'} required />
        </Field>
      )}
      <Field label="Password" id={`${idPrefix}-pwd`}>
        <PasswordInput id={`${idPrefix}-pwd`} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
      </Field>
      {error && <p className="small" role="alert" style={{ color: 'var(--low)' }}>{error}</p>}
      <button type="submit" className="btn btn-primary btn-block" disabled={loading}>
        {loading && <Spinner />}{loading ? 'Signing in' : 'Sign in'}
      </button>
    </form>
  )
}
