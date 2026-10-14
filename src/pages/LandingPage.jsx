import { Link, useNavigate } from 'react-router-dom'
import { ScanFace, DoorOpen, Eye, Briefcase, Cpu, ShieldCheck, ArrowRight } from 'lucide-react'
import { useAuth } from '../context/AuthContext'

const FEATURES = [
  [DoorOpen, 'Attendance on entry', 'Room cameras recognise enrolled faces at the door and log entry, exit, late and early exits against the timetable.'],
  [Eye, 'Attention & blink rate', 'Head pose toward the board and blinks per minute, from landmarks. Shown as “facing the board”, never as a grade.'],
  [Briefcase, 'Office mode', 'Desk time at the screen vs roaming, followed across cameras.'],
  [Cpu, 'Edge first', 'A Raspberry Pi or Jetson beside each camera does the vision work and sends small MQTT events, not video.'],
  [ShieldCheck, 'Built for DPDP', 'Consent at enrollment, embeddings instead of photos, retention limits.'],
]
export default function LandingPage() {
  const { user, enterDemo } = useAuth()
  const navigate = useNavigate()
  return (
    <div className="landing">
      <header className="land-top">
        <Link to="/" className="logo"><ScanFace size={22} aria-hidden /> ClassroomIQ</Link>
        <nav className="row-gap">{user ? <Link className="btn btn-primary" to="/console">Open console</Link> : <><Link className="btn" to="/login">Sign in</Link><Link className="btn btn-primary" to="/register">Register</Link></>}</nav>
      </header>
      <main>
        <section className="land-hero">
          <span className="chip">Prototype · multi-camera IoT</span>
          <h1 className="display">Know who's in the room, and when.</h1>
          <p className="lede">ClassroomIQ connects fixed cameras in classrooms and offices through edge devices. Faces become attendance, head pose becomes attention, and every number is backed by an event you can audit.</p>
          <div className="row-gap">
            <button className="btn btn-primary btn-lg" onClick={() => { if (!user) enterDemo(); navigate('/console') }}>Explore the demo console <ArrowRight size={16} aria-hidden /></button>
            <a className="btn btn-lg" href="https://github.com/anujkumarsharma1/frontend-classroomiq/blob/v3/ARCHITECTURE.md">Read the architecture</a>
          </div>
          <p className="xs muted">The demo runs on simulated events. No real cameras are connected yet.</p>
        </section>
        <section className="bento land-bento" aria-label="Features">
          {FEATURES.map(([Icon, t, d], i) => (
            <article key={t} className={`block ${i === 0 ? 's2' : ''} ${i === 3 ? 's2' : ''}`}>
              <h2 className="block-title"><Icon size={18} aria-hidden />{t}</h2>
              <p className="muted small">{d}</p>
            </article>
          ))}
        </section>
      </main>
    </div>
  )
}
