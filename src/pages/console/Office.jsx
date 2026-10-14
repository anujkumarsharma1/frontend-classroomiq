import { Link } from 'react-router-dom'
import { Briefcase, Footprints, Monitor, Grid3x3 } from 'lucide-react'
import { useLive } from '../../data/LiveContext'
import { Block, PageHead, AnimatedNumber, LivePulse } from '../../components/live'
import { Heatmap } from './Rooms'

const LABEL = { working: 'Working at screen', at_desk: 'At desk, not facing screen', away: 'Roaming / away' }
export default function Office() {
  const { state: s, now } = useLive()
  const staff = s.world.people.filter((p) => p.role === 'staff')
  const rows = staff.map((p) => {
    const d = s.desk[p.id]
    if (!d) return { p, t: { working: 0, at_desk: 0, away: 0 }, state: null }
    const t = { working: d.working, at_desk: d.at_desk, away: d.away }
    t[d.state] += now - d.since
    return { p, t, state: d.state }
  })
  const tot = rows.reduce((a, r) => ({ working: a.working + r.t.working, at_desk: a.at_desk + r.t.at_desk, away: a.away + r.t.away }), { working: 0, at_desk: 0, away: 0 })
  const all = tot.working + tot.at_desk + tot.away || 1
  const room = s.world.rooms.find((r) => r.mode === 'office')
  return (
    <>
      <PageHead title="Office floor" sub="Desk-zone occupancy + head pose toward the screen, roaming tracked across 3 cameras with OSNet re-ID." />
      <div className="bento">
        <Block title="Working" icon={Monitor}><div className="big"><AnimatedNumber value={(tot.working / all) * 100} format={(v) => `${Math.round(v)}%`} /></div><span className="xs muted">of observed time</span></Block>
        <Block title="At desk, not on screen" icon={Briefcase}><div className="big"><AnimatedNumber value={(tot.at_desk / all) * 100} format={(v) => `${Math.round(v)}%`} /></div></Block>
        <Block title="Roaming / away" icon={Footprints}><div className="big"><AnimatedNumber value={(tot.away / all) * 100} format={(v) => `${Math.round(v)}%`} /></div></Block>
        <Block title="At desks now" icon={Briefcase}><div className="big"><AnimatedNumber value={rows.filter((r) => r.state && r.state !== 'away').length} /><span className="of">/ {staff.length}</span></div><LivePulse /></Block>
        <Block title="Desk time vs roaming, per person" icon={Monitor} span="s4">
          <div className="legend small">{Object.entries(LABEL).map(([k, v]) => <span key={k}><i className={`sw ${k}`} aria-hidden />{v}</span>)}</div>
          <ul className="stack-bars">
            {rows.map(({ p, t, state }) => {
              const sum = t.working + t.at_desk + t.away || 1
              return (
                <li key={p.id}>
                  <Link to={`/console/people/${p.id}`} className="sb-name">{p.name}<span className="xs muted"> {p.desk}</span></Link>
                  <div className="sb" role="img" aria-label={`${p.name}: working ${Math.round((t.working / sum) * 100)}%, at desk ${Math.round((t.at_desk / sum) * 100)}%, away ${Math.round((t.away / sum) * 100)}%`}>
                    {['working', 'at_desk', 'away'].map((k) => <span key={k} className={`seg-${k}`} style={{ flexGrow: t[k] / sum }} />)}
                  </div>
                  <span className={`chip ${state || ''}`}>{state ? LABEL[state].split(',')[0] : 'no data'}</span>
                </li>
              )
            })}
          </ul>
        </Block>
        <Block title="Desk occupancy heatmap (today)" icon={Grid3x3} span="s4"><Heatmap room={room} /></Block>
      </div>
    </>
  )
}
