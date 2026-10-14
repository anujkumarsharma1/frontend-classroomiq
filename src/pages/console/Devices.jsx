import { useState } from 'react'
import { Cpu, Plus } from 'lucide-react'
import { useLive } from '../../data/LiveContext'
import { Block, PageHead, AnimatedNumber, hhmm } from '../../components/live'

export default function Devices() {
  const { state: s } = useLive()
  const [extra, setExtra] = useState([])
  const [form, setForm] = useState({ id: '', room: '', rtsp: '' })
  const devs = [...Object.values(s.devices), ...extra]
  const add = (e) => { e.preventDefault(); setExtra([...extra, { id: form.id, room: form.room, kind: 'Pending provisioning', cameras: 1, status: 'pending', fps: 0, tempC: 0 }]); setForm({ id: '', room: '', rtsp: '' }) }
  return (
    <>
      <PageHead title="Cameras & devices" sub="Edge devices publish heartbeats to ciq/{site}/{room}/{device}/heartbeat every 10 s." />
      <div className="bento">
        {devs.map((d) => (
          <Block key={d.id} title={d.id} icon={Cpu} className={d.status}>
            <div className="spread small"><span>{d.room}</span><span className={`chip ${d.status}`}>{d.status}</span></div>
            <p className="xs muted">{d.kind} · {d.cameras} camera{d.cameras > 1 ? 's' : ''}</p>
            <div className="spread"><span className="big small-big mono"><AnimatedNumber value={d.fps} format={(v) => v.toFixed(1)} /> <span className="of">fps</span></span><span className="mono small"><AnimatedNumber value={d.tempC} format={(v) => `${Math.round(v)}°C`} /></span></div>
            <p className="xs muted">Last heartbeat {d.lastSeen ? hhmm(d.lastSeen) : '—'}</p>
          </Block>
        ))}
        <Block title="Add a device" icon={Plus} span="s2">
          <form onSubmit={add} className="stack">
            <label className="field-l">Device ID<input className="input" value={form.id} onChange={(e) => setForm({ ...form, id: e.target.value })} required placeholder="edge-r-104" /></label>
            <label className="field-l">Room<input className="input" value={form.room} onChange={(e) => setForm({ ...form, room: e.target.value })} required placeholder="R-104" /></label>
            <label className="field-l">Camera RTSP URL<input className="input" value={form.rtsp} onChange={(e) => setForm({ ...form, rtsp: e.target.value })} placeholder="rtsp://192.168.1.20:554/stream1" /></label>
            <button className="btn btn-primary">Add (demo only, not saved)</button>
          </form>
        </Block>
      </div>
    </>
  )
}
