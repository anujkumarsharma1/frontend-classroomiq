import { useMemo, useState } from 'react'
import { TrendingUp, ShieldAlert } from '../../components/icons'
import { useLive } from '../../data/LiveContext'
import { weeklyTrend } from '../../data/mockStream'
import { Block, PageHead } from '../../components/live'
import { AlertFeed } from './Overview'

export default function Trends() {
  const { state: s } = useLive()
  const data = useMemo(() => weeklyTrend(s.world), [s.world])
  const [sel, setSel] = useState(0)
  const [hover, setHover] = useState(null)
  const d = data[sel]
  const W = 900, H = 280, pad = 30
  const x = (i) => pad + (i / (d.weeks.length - 1)) * (W - pad * 2)
  const y = (v) => H - pad - ((v - 0.3) / 0.7) * (H - pad * 2)
  const path = d.weeks.map((w, i) => (i ? `H${x(i)} V${y(w.pct)}` : `M${x(0)},${y(w.pct)}`)).join(' ')
  const bw = Math.max(12, Math.round((W - pad * 2) / d.weeks.length / 3))
  return (
    <>
      <PageHead title="Trends" sub="Weekly “facing the board” average per lecture, weighted by valid face time." />
      <div className="bento">
        <Block title="Weekly attention trend" icon={TrendingUp} span="s4">
          <div className="seg-tabs" role="tablist" aria-label="Course">
            {data.map((c, i) => <button key={c.course} role="tab" aria-selected={i === sel} className="seg-tab" onClick={() => setSel(i)}>{c.course}</button>)}
          </div>
          <svg viewBox={`0 0 ${W} ${H}`} className="chart" shapeRendering="crispEdges" role="img" aria-label={`${d.course}: ${d.weeks.map((w) => `${w.week} ${Math.round(w.pct * 100)}%`).join(', ')}`}>
            {[0.4, 0.6, 0.8, 1].map((v) => <g key={v}><line x1={pad} x2={W - pad} y1={y(v)} y2={y(v)} className="grid-line" /><text x={4} y={y(v) + 4} className="axis">{v * 100}%</text></g>)}
            {d.weeks.map((w, i) => <rect key={`${sel}-b${i}`} className="bar" x={x(i) - bw / 2} y={y(w.pct)} width={bw} height={H - pad - y(w.pct)} style={{ animationDelay: `${i * 60}ms` }} />)}
            <path key={`l${sel}`} d={path} className="line draw" pathLength="1" />
            {d.weeks.map((w, i) => (
              <g key={w.week} onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)}>
                <rect x={x(i) - (hover === i ? 7 : 5)} y={y(w.pct) - (hover === i ? 7 : 5)} width={hover === i ? 14 : 10} height={hover === i ? 14 : 10} className="pt" />
                <text x={x(i)} y={H - 8} textAnchor="middle" className="axis">{w.week}</text>
                {hover === i && <text x={x(i)} y={y(w.pct) - 12} textAnchor="middle" className="tip">{Math.round(w.pct * 100)}%</text>}
              </g>
            ))}
          </svg>
        </Block>
        <Block title="Unknown-face alert log" icon={ShieldAlert} span="s4"><AlertFeed alerts={s.alerts} rooms={s.world.rooms} /></Block>
      </div>
    </>
  )
}
