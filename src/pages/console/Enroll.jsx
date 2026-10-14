import { useState } from 'react'
import { UserPlus, ScanFace, ShieldCheck } from 'lucide-react'
import { useLive } from '../../data/LiveContext'
import { Block, PageHead } from '../../components/live'

const STEPS = ['Frontal', 'Turn left', 'Turn right', 'Look up', 'Liveness check']
export default function Enroll() {
  const { state: s } = useLive()
  const [form, setForm] = useState({ name: '', id: '', consent: false, guardian: false })
  const [step, setStep] = useState(-1)
  const [done, setDone] = useState([])
  const run = (e) => {
    e.preventDefault()
    let i = 0; setStep(0)
    const t = setInterval(() => { i++; if (i >= STEPS.length) { clearInterval(t); setStep(-1); setDone([{ ...form }, ...done]); setForm({ name: '', id: '', consent: false, guardian: false }) } else setStep(i) }, 700)
  }
  return (
    <>
      <PageHead title="Enrollment" sub="Captures 5–10 frames, keeps only ArcFace embeddings. Frames are discarded." />
      <div className="bento">
        <Block title="Enroll a person" icon={UserPlus} span="s2">
          <form onSubmit={run} className="stack">
            <label className="field-l">Full name<input className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required /></label>
            <label className="field-l">Person ID<input className="input" value={form.id} onChange={(e) => setForm({ ...form, id: e.target.value })} required placeholder="P-0025" /></label>
            <label className="check-l"><input type="checkbox" checked={form.consent} onChange={(e) => setForm({ ...form, consent: e.target.checked })} required /> Consent recorded after notice (DPDP Act s.5–6)</label>
            <label className="check-l"><input type="checkbox" checked={form.guardian} onChange={(e) => setForm({ ...form, guardian: e.target.checked })} /> Under 18: verifiable parental consent obtained (s.9)</label>
            <button className="btn btn-primary" disabled={step >= 0}>Start capture (simulated)</button>
          </form>
        </Block>
        <Block title="Capture" icon={ScanFace} span="s2">
          <div className={`capture ${step >= 0 ? 'running' : ''}`} aria-live="polite">
            <ScanFace size={56} aria-hidden />
            <p className="small">{step >= 0 ? `${STEPS[step]}…` : 'Waiting. No camera is used in demo mode.'}</p>
            <ol className="cap-steps">{STEPS.map((t, i) => <li key={t} className={i < step ? 'ok' : i === step ? 'now' : ''}>{t}</li>)}</ol>
          </div>
        </Block>
        <Block title={`Enrolled (${s.world.people.length + done.length})`} icon={ShieldCheck} span="s4">
          <div className="table-scroll" tabIndex={0} role="region" aria-label="Enrolled people">
            <table className="tbl">
              <thead><tr><th scope="col">ID</th><th scope="col">Name</th><th scope="col">Role</th><th scope="col">Stored</th><th scope="col">Consent</th></tr></thead>
              <tbody>
                {done.map((d) => <tr key={d.id} className="new-row"><td className="mono">{d.id}</td><td>{d.name}</td><td>student</td><td>512-d embedding ×5 (demo)</td><td>Yes</td></tr>)}
                {s.world.people.map((p) => <tr key={p.id}><td className="mono">{p.id}</td><td>{p.name}</td><td>{p.role}</td><td>512-d embedding</td><td>{p.consent ? 'Yes' : 'No'}</td></tr>)}
              </tbody>
            </table>
          </div>
        </Block>
      </div>
    </>
  )
}
