import { Link } from 'react-router-dom'
import { Users, DoorOpen, Eye, Cpu, ShieldAlert, Activity, Download, UserX, ArrowRight } from 'lucide-react'
import { useLive } from '../../data/LiveContext'
import { isInside, attentionPct, avg, flagsFor, downloadCsv } from '../../data/store'
import { EVENT } from '../../data/schema'
import { AnimatedNumber, Sparkline, Block, PageHead, LivePulse, hhmm } from '../../components/live'

const pct = (v) => `${Math.round(v * 100)}%`
const FEED_TEXT = {
  [EVENT.ENTERED]: 'entered', [EVENT.EXITED]: 'left', [EVENT.ATTENTION]: 'attention sample', [EVENT.BLINK]: 'blink sample', [EVENT.DESK]: 'desk state', [EVENT.UNKNOWN]: 'unknown face',
}

export function AlertFeed({ alerts, rooms, compact }) {
  if (!alerts.length) return <p className="muted small">No unknown faces yet.</p>
  return (
    <ul className="alert-list" aria-live="polite">
      {alerts.slice(0, compact ? 4 : 12).map((a) => (
        <li key={a.id} className="alert-item">
          <span className="snap" role="img" aria-label="No snapshot stored"><UserX size={20} aria-hidden /></span>
          <span className="grow"><b>Unknown face</b> · {rooms.find((r) => r.id === a.room)?.name}<br />
            <span className="xs muted">best match {a.match.score.toFixed(2)} &lt; threshold {a.match.threshold} · track {a.track}</span></span>
          <time className="xs muted mono">{hhmm(a.ts)}</time>
        </li>
      ))}
    </ul>
  )
}

export default function Overview() {
  const { state: s } = useLive()
  const { world } = s
  const students = world.people.filter((p) => p.role === 'student')
  const inside = world.people.filter((p) => isInside(s, p.id))
  const devs = Object.values(s.devices)
  const online = devs.filter((d) => d.status === 'online')
  const att = avg(inside.map((p) => attentionPct(s, p.id)).filter((x) => x != null))
  const flags = students.map((p) => flagsFor(s, p.id).status)
  const late = flags.filter((f) => f === 'late').length, early = flags.filter((f) => f === 'early_exit').length

  return (
    <>
      <PageHead title="Overview" sub={`${world.site} · ${world.rooms.length} rooms · ${devs.length} edge devices`}>
        <button className="btn btn-primary" onClick={() => downloadCsv(s)}><Download size={16} aria-hidden /> Export attendance CSV</button>
      </PageHead>

      <div className="bento">
        <Block title="Present now" icon={Users} span="s2 r2 hero-block" detail={<p className="small">Counted from <code>person.entered</code> minus <code>person.exited</code> events across all rooms.</p>}>
          <div className="big"><AnimatedNumber value={inside.length} /><span className="of">/ {world.people.length} enrolled</span></div>
          <div className="meter" aria-hidden><span style={{ width: pct(inside.length / world.people.length) }} /></div>
          <div className="row-gap small"><span className="chip warn">{late} late</span><span className="chip bad">{early} left early</span><LivePulse /></div>
        </Block>
        <Block title="Facing the board" icon={Eye} detail={<p className="small">Head pose (solvePnP) inside the board region. Not a measure of understanding.</p>}>
          <div className="big"><AnimatedNumber value={att == null ? null : att * 100} format={(v) => `${Math.round(v)}%`} /></div>
          <span className="xs muted">avg of people inside</span>
        </Block>
        <Block title="Devices online" icon={Cpu}>
          <div className="big"><AnimatedNumber value={online.length} /><span className="of">/ {devs.length}</span></div>
          <span className="xs muted">avg {avg(online.map((d) => d.fps))?.toFixed(1)} fps</span>
        </Block>
        <Block title="Unknown faces" icon={ShieldAlert}>
          <div className="big"><AnimatedNumber value={s.alerts.length} /></div>
          <span className="xs muted">this session</span>
        </Block>
        <Block title="Events processed" icon={Activity}>
          <div className="big mono"><AnimatedNumber value={s.total} /></div>
          <span className="xs muted">simulated MQTT</span>
        </Block>

        <Block title="Rooms & cameras" icon={DoorOpen} span="s4">
          <div className="tiles">
            {world.rooms.map((r) => {
              const dev = devs.find((d) => d.room === r.id)
              const ppl = world.people.filter((p) => p.home === r.id)
              const inn = ppl.filter((p) => isInside(s, p.id)).length
              const zones = s.occupancy[r.id] || {}
              const trend = ppl.flatMap((p) => (s.attention[p.id] || []).map((x) => x.v)).slice(-20)
              return (
                <Link key={r.id} to={r.mode === 'office' ? '/console/office' : `/console/rooms/${r.id}`} className="tile">
                  <div className="tile-cam" aria-hidden>
                    <div className="zones" style={{ gridTemplateColumns: `repeat(${r.zones > 8 ? 4 : 4}, 1fr)` }}>
                      {Array.from({ length: r.zones }, (_, z) => <span key={z} className={zones[`z${z}`] ? 'z on' : 'z'} />)}
                    </div>
                    <span className="rec"><span className="pulse-dot" />{dev?.id}</span>
                  </div>
                  <div className="tile-body">
                    <div className="spread"><b>{r.name}</b><span className="chip">{r.mode}</span></div>
                    <div className="spread small"><span><AnimatedNumber value={inn} /> / {ppl.length} inside</span><span className="muted">{r.course || 'desks'}</span></div>
                    <Sparkline data={trend} height={28} label={`${r.name} attention trend`} />
                  </div>
                </Link>
              )
            })}
            {devs.filter((d) => !world.rooms.some((r) => r.id === d.room)).map((d) => (
              <Link key={d.id} to="/console/devices" className="tile offline">
                <div className="tile-cam" aria-hidden><span className="rec off">offline</span></div>
                <div className="tile-body"><b>{d.room}</b><span className="small muted">Last seen {hhmm(d.lastSeen)}</span></div>
              </Link>
            ))}
          </div>
        </Block>

        <Block title="Unknown-face alerts" icon={ShieldAlert} span="s2" action={<LivePulse />}>
          <AlertFeed alerts={s.alerts} rooms={world.rooms} compact />
          <p className="xs muted">No images are stored. Embedding scored below the match threshold for every enrolled person.</p>
        </Block>
        <Block title="Live event stream" icon={Activity} span="s2">
          <ul className="feed">
            {s.feed.slice(0, 8).map((e) => {
              const p = world.people.find((x) => x.id === e.person)
              return (
                <li key={e.id} className="feed-row">
                  <time className="mono xs muted">{hhmm(e.ts)}</time>
                  <code className="xs">{e.type}</code>
                  <span className="small grow">{p ? p.name : 'Unknown'} {FEED_TEXT[e.type]} · {e.room}</span>
                </li>
              )
            })}
          </ul>
          <Link to="/console/rooms" className="small link-arrow">All rooms <ArrowRight size={14} aria-hidden /></Link>
        </Block>
      </div>
    </>
  )
}
