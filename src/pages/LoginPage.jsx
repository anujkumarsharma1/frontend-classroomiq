import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { Brand } from '../components/ui'
import SignInForm from '../components/SignInForm'

export default function LoginPage() {
  const { enterDemo } = useAuth()
  const navigate = useNavigate()
  return (
    <main className="auth-page">
      <div className="auth-box">
        <Brand />
        <h1 style={{ marginBottom: 8 }}>Sign in</h1>
        <p className="muted" style={{ marginBottom: 28 }}>Admins and teachers sign in. People in rooms don&apos;t need accounts.</p>
        <div className="card">
          <SignInForm idPrefix="login" />
        </div>
        <button className="btn btn-block" style={{ marginTop: 16 }} onClick={() => { enterDemo(); navigate('/console') }}>Explore with demo data</button>
        <p className="small muted" style={{ marginTop: 24, textAlign: 'center' }}>
          New school? <Link to="/register">Register your institution</Link>
        </p>
      </div>
    </main>
  )
}
