import { useParams, Navigate } from 'react-router-dom'
import { Clock, Eye, EyeOff, User } from 'lucide-react'
import { useLive } from '../../data/LiveContext'
import { flagsFor, attentionPct, blinkRate, isInside } from '../../data/store'
import { Block, PageHead, Ring, Sparkline, AnimatedNumber, hhmm, STATUS } from '../../components/live'
import { Timeline } from './Rooms'

export default function Person() {
  const { id } = useParams()
  const { state: s, now } = useLive()
  const p = s.world.people.find((x) => x.id === id)
  if (!p) return <Navigate to="/console" replace />
  const f = flagsFor(s, id, now)
  const att = attentionPct(s, id), bpm = blinkRate(s, id)
  const slot = f.slot
  const from = (slot?.start ?? now - 3600e3) - 10 * 60e3, to = (slot?.end ?? now) + 5 * 60e3
  return (
    <>
      <PageHead title={p.name} sub={`${p.id} · ${p.role} · ${s.world.rooms.find((r) => r.id === p.home)?.name}`} />
      <div className="bento">
        <Block title="Status" icon={User}>
          <div className="big small-big">{isInside(s, id) ? 'Inside' : 'Not inside'}</div>
          <span className={`chip ${f.status}`}>{STATUS[f.status]}</span>
          <p className="xs muted">First entry {hhmm(f.iv[0]?.in)} · last exit {hhmm(f.iv[f.iv.length - 1]?.out)}</p>
        </Block>
        <Block title="Facing the board" icon={Eye}>
          <Ring value={att} label="Facing the board" />
          <Sparkline data={(s.attention[id] || []).map((x) => x.v)} label="Attention samples" />
        </Block>
        <Block title="Blink rate" icon={EyeOff} detail={<p className="small">Eye Aspect Ratio below threshold for 2–3 frames = one blink. Per minute of valid face time only.</p>}>
          <div className="big"><AnimatedNumber value={bpm} format={(v) => v.toFixed(1)} /><span className="of">/ min</span></div>
          <Sparkline data={(s.blink[id] || []).map((x) => x.bpm)} label="Blink rate samples" />
        </Block>
        <Block title="Minutes present" icon={Clock}>
          <div className="big"><AnimatedNumber value={f.minutes ?? 0} /><span className="of">min</span></div>
          <span className="xs muted">within the timetable slot</span>
        </Block>
        <Block title="Presence timeline" icon={Clock} span="s4">
          <Timeline rows={[{ ...p, ...f }]} from={from} to={to} now={now} />
        </Block>
      </div>
    </>
  )
}
