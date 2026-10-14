import { Link } from 'react-router-dom'
import { Brand } from '../components/ui'

export default function NotFoundPage() {
  return (
    <main className="auth-page">
      <div className="auth-box" style={{ textAlign: 'center' }}>
        <div style={{ display: 'flex', justifyContent: 'center' }}><Brand /></div>
        <h1 style={{ marginBottom: 12 }}>This page doesn&apos;t exist</h1>
        <p className="muted" style={{ marginBottom: 28 }}>The link may be old, or the address has a typo.</p>
        <Link to="/" className="btn btn-primary">Go to the home page</Link>
      </div>
    </main>
  )
}
