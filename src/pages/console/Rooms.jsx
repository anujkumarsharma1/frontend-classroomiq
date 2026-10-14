import { Link, useParams, Navigate } from 'react-router-dom'
import { Clock, Grid3x3, Download, DoorOpen } from '../../components/icons'
import { useLive } from '../../data/LiveContext'
import { flagsFor, attentionPct, isInside, downloadCsv } from '../../data/store'
import { heatmapHistory } from '../../data/mockStream'
import { PixelPerson } from '../../components/pixel'
import { Block, PageHead, AnimatedNumber, hhmm, STATUS, LivePulse } from '../../components/live'

export function Timeline({ rows, from, to, now }) {
  const span = to - from
  const x = (t) => `${Math.max(0, Math.min(100, ((t - from) / span) * 100))}%`
  const ticks = []
  for (let t = Math.ceil(from / 600e3) * 600e3; t <= to; t += 600e3) ticks.push(t)
  return (
    <div className="timeline" role="table" aria-label="Attendance timeline">
      <div className="tl-axis" role="row" aria-hidden>
        <span className="tl-name" />
        <div className="tl-track">{ticks.map((t) => <span key={t} className="tl-tick" style={{ left: x(t) }}>{hhmm(t)}</span>)}</div>
      </div>
      {rows.map((r) => (
        <div key={r.id} className="tl-row" role="row">
          <span className="tl-name" role="rowheader"><Link to={`/console/people/${r.id}`}>{r.name}</Link><span className={`chip ${r.status}`}>{STATUS[r.status]}</span></span>
          <div className="tl-track" role="cell" aria-label={r.iv.map((i) => `${hhmm(i.in)} to ${i.out ? hhmm(i.out) : 'now'}`).join(', ') || 'no presence'}>
            {r.slot && <span className="tl-slot" style={{ left: x(r.slot.start), width: `calc(${x(r.slot.end)} - ${x(r.slot.start)})` }} />}
            {r.iv.map((i, k) => (
              <span key={k} className={`tl-bar ${i.out ? '' : 'open'}`} style={{ left: x(i.in), width: `calc(${x(i.out ?? now)} - ${x(i.in)})` }} />
            ))}
            {r.iv.length > 0 && (() => {
              const last = r.iv[r.iv.length - 1]
              return (
                <span key={`${last.in}-${last.out}`} className={`tl-sprite ${last.out ? 'leaving' : 'entering'}`} style={{ left: x(last.out ?? now) }}>
                  <PixelPerson seed={r.id} walking size={22} />
                </span>
              )
            })()}
          </div>
        </div>
      ))}
      <div className="tl-now" style={{ left: `calc(var(--tl-name) + (100% - var(--tl-name)) * ${(now - from) / span})` }} aria-hidden />
    </div>
  )
}

export function Heatmap({ room }) {
  const data = heatmapHistory(room)
  return (
    <div className="heat-wrap" tabIndex={0} role="region" aria-label="Occupancy heatmap">
      <table className="heat">
        <caption className="sr-only">Share of time each zone was occupied, by hour</caption>
        <thead><tr><th scope="col">Zone</th>{Array.from({ length: 10 }, (_, h) => <th key={h} scope="col">{String(8 + h).padStart(2, '0')}</th>)}</tr></thead>
        <tbody>
          {data.map((row, z) => (
            <tr key={z}><th scope="row">{room.mode === 'office' ? `D-${z + 1}` : `Seat ${String.fromCharCode(65 + Math.floor(z / 4))}${(z % 4) + 1}`}</th>
              {row.map((v, h) => <td key={h} style={{ '--v': v }} title={`${Math.round(v * 100)}%`}><span className="sr-only">{Math.round(v * 100)}%</span></td>)}</tr>
          ))}
        </tbody>
      </table>
      <div className="heat-legend xs muted"><span>0%</span><span className="heat-scale" aria-hidden /><span>100% occupied</span></div>
    </div>
  )
}

export function RoomsList() {
  const { state: s } = useLive()
  return (
    <>
      <PageHead title="Rooms" sub="Pick a room for its attendance timeline and occupancy heatmap." />
      <div className="bento">
        {s.world.rooms.filter((r) => r.mode === 'classroom').map((r) => {
          const ppl = s.world.people.filter((p) => p.home === r.id)
          const fl = ppl.map((p) => flagsFor(s, p.id).status)
          return (
            <Link key={r.id} to={`/console/rooms/${r.id}`} className="block s2 card-link-block">
              <h2 className="block-title"><DoorOpen size={16} aria-hidden />{r.name}</h2>
              <p className="muted small">{r.course}</p>
              <div className="big"><AnimatedNumber value={ppl.filter((p) => isInside(s, p.id)).length} /><span className="of">/ {ppl.length} inside</span></div>
              <div className="row-gap small"><span className="chip late">{fl.filter((f) => f === 'late').length} late</span><span className="chip early_exit">{fl.filter((f) => f === 'early_exit').length} left early</span><span className="chip absent">{fl.filter((f) => f === 'absent').length} absent</span></div>
            </Link>
          )
        })}
      </div>
    </>
  )
}

export function RoomDetail() {
  const { id } = useParams()
  const { state: s, now } = useLive()
  const room = s.world.rooms.find((r) => r.id === id)
  if (!room) return <Navigate to="/console/rooms" replace />
  const slot = s.world.timetable.find((t) => t.room === id)
  const rows = s.world.people.filter((p) => p.home === id).map((p) => ({ ...p, ...flagsFor(s, p.id, now), att: attentionPct(s, p.id) }))
  const from = (slot?.start ?? now - 3600e3) - 10 * 60e3, to = (slot?.end ?? now) + 5 * 60e3
  return (
    <>
      <PageHead title={room.name} sub={slot ? `${slot.course} · ${hhmm(slot.start)}–${hhmm(slot.end)} · grace ${slot.graceMin} min` : ''}>
        <button className="btn" onClick={() => downloadCsv(s)}><Download size={16} aria-hidden /> CSV</button>
      </PageHead>
      <div className="bento">
        <Block title="Attendance timeline" icon={Clock} span="s4" action={<LivePulse />}
          detail={<p className="small">Bars are presence intervals from door-line crossings (debounced) plus a 120 s absence timeout. Late = first entry after start + grace; left early = last exit before end − grace.</p>}>
          <Timeline rows={rows} from={from} to={to} now={now} />
        </Block>
        <Block title="Seat occupancy heatmap (today)" icon={Grid3x3} span="s4"
          detail={<p className="small">Per-seat polygons; a seat is occupied in a 30 s bin if a tracked person is inside it for more than half the bin.</p>}>
          <Heatmap room={room} />
        </Block>
      </div>
    </>
  )
}
