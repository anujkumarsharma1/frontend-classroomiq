import { Link } from 'react-router-dom'
import { Brand, HeadingLink } from '../components/ui'
import SignInForm from '../components/SignInForm'
import { useAuth } from '../context/AuthContext'
import { DETECTORS } from '../utils/detectors'

const DETECTOR_COPY = {
  drowsiness: 'Notices heavy eyelids, long blinks and yawns before a student nods off.',
  headpose: 'Tracks pitch, yaw and roll, so it knows when a head turns away from the lesson.',
  pupil: 'Follows the iris to tell whether eyes are on the screen or wandering.',
  microexpr: 'Reads seven expressions, from focus to confusion, from small facial movements.',
  struggle: "Tells a student who is working through something hard apart from one who's stuck.",
}

const STEPS = [
  { title: 'Set up your school', body: 'An admin registers the institution and adds teachers and students, one at a time or from a list.' },
  { title: 'Start a session', body: 'The teacher names the class and gets a six-character code to share.' },
  { title: 'Students join', body: 'Each student enters the code and allows the camera. Scores reach the teacher every two seconds.' },
]

function ExampleCard() {
  return (
    <div className="card" style={{ position: 'relative', maxWidth: 420 }}>
      <span className="pill example-tag">Example</span>
      <p className="small muted" style={{ marginBottom: 4 }}>Student card</p>
      <h3 style={{ marginBottom: 20 }}>Attention over the last minute</h3>
      <svg className="wave" viewBox="0 0 360 90" width="100%" height="90" aria-hidden="true" style={{ overflow: 'hidden' }}>
        <g className="wave-move">
          <path d="M0 50 C 25 20, 75 20, 100 45 S 175 75, 200 50 S 275 20, 300 45 S 375 75, 400 50 S 475 20, 500 45 S 575 75, 600 50" />
        </g>
      </svg>
      <div className="spread" style={{ marginTop: 16 }}>
        <span className="pill good"><span className="dot live" /> Face visible</span>
        <span className="small muted">Nudge sends a gentle prompt</span>
      </div>
    </div>
  )
}

export default function LandingPage() {
  const { user } = useAuth()
  return (
    <>
      <header className="topbar">
        <div className="wrap topbar-inner">
          <Brand />
          <nav className="row" style={{ marginLeft: 'auto', gap: 8 }} aria-label="Main">
            <a href="#how" className="tab hide-sm">How it works</a>
            {user
              ? <Link to={`/${user.role}`} className="btn btn-primary btn-sm">Open dashboard</Link>
              : <Link to="/register" className="btn btn-primary btn-sm">Register</Link>}
          </nav>
        </div>
      </header>
      <main>
        <section className="wrap hero">
          <div>
            <h1 className="display">See who&apos;s with you while you teach.</h1>
            <p className="lede">ClassroomIQ reads attention from each student&apos;s webcam, right in their browser. You get a live score for every student, and the video never leaves their device.</p>
            <div className="row" style={{ marginTop: 32 }}>
              <Link to="/register" className="btn btn-primary">Register your institution</Link>
              <a href="#how" className="btn btn-quiet">See how a class runs</a>
            </div>
          </div>
          <div className="card" id="sign-in">
            <h2 style={{ marginBottom: 6 }}>Sign in</h2>
            <p className="small muted" style={{ marginBottom: 22 }}>Teachers and students use the ID from their admin.</p>
            <SignInForm idPrefix="home" />
          </div>
        </section>

        <section className="section" id="detectors">
          <div className="wrap">
            <div className="section-head">
              <HeadingLink href="#detectors">What it watches</HeadingLink>
              <p className="muted">Five detectors run in the student&apos;s browser. Your admin picks which ones your school uses.</p>
            </div>
            <div className="grid g-2">
              {DETECTORS.map((d) => (
                <div key={d.key} className="card tight">
                  <h3 style={{ marginBottom: 8 }}>{d.title}</h3>
                  <p className="muted small">{DETECTOR_COPY[d.key]}</p>
                </div>
              ))}
              <div className="card tight flat">
                <h3 style={{ marginBottom: 8 }}>What gets sent</h3>
                <p className="muted small">An attention score, an expression label and whether a face is in view. No frames, no recordings.</p>
              </div>
            </div>
          </div>
        </section>

        <section className="section" id="how">
          <div className="wrap">
            <div className="section-head">
              <HeadingLink href="#how">How a class runs</HeadingLink>
            </div>
            <div className="grid g-3">
              {STEPS.map((s, i) => (
                <div key={s.title} className="card">
                  <div className="step-n">{i + 1}</div>
                  <h3 style={{ marginBottom: 10 }}>{s.title}</h3>
                  <p className="muted small">{s.body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="section" id="teacher-view">
          <div className="wrap hero" style={{ padding: 0 }}>
            <div>
              <HeadingLink href="#teacher-view">What the teacher sees</HeadingLink>
              <p className="lede" style={{ marginTop: 16 }}>One card per student, with their score, their expression and a warning if their face leaves the frame. If someone drifts, tap Nudge.</p>
            </div>
            <ExampleCard />
          </div>
        </section>
      </main>
      <footer className="footer">
        <div className="wrap spread">
          <span>ClassroomIQ</span>
          <span>Needs a webcam and a recent Chrome, Edge or Firefox.</span>
        </div>
      </footer>
    </>
  )
}
