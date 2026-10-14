import { Link } from 'react-router-dom'
import { Brand } from '../components/ui'
import SignInForm from '../components/SignInForm'

export default function LoginPage() {
  return (
    <main className="auth-page">
      <div className="auth-box">
        <Brand />
        <h1 style={{ marginBottom: 8 }}>Sign in</h1>
        <p className="muted" style={{ marginBottom: 28 }}>Pick your role, then use the details your school gave you.</p>
        <div className="card">
          <SignInForm idPrefix="login" />
        </div>
        <p className="small muted" style={{ marginTop: 24, textAlign: 'center' }}>
          New school? <Link to="/register">Register your institution</Link>
        </p>
      </div>
    </main>
  )
}
