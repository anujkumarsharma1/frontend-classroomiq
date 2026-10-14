// Reduces the event stream into dashboard state. Pure functions; source-agnostic.
import { EVENT } from './schema'

export function initialState(world) {
  return {
    world, presence: {}, attention: {}, blink: {}, occupancy: {}, desk: {}, alerts: [], feed: [], total: 0,
    devices: Object.fromEntries(world.devices.map((d) => [d.id, { ...d }])),
  }
}

export function reduce(s, e) {
  const n = { ...s, total: s.total + 1 }
  if (e.type !== EVENT.HEARTBEAT && e.type !== EVENT.OCCUPANCY) n.feed = [e, ...s.feed].slice(0, 40)
  switch (e.type) {
    case EVENT.ENTERED: {
      const iv = s.presence[e.person] || []
      const last = iv[iv.length - 1]
      if (last && !last.out) break
      n.presence = { ...s.presence, [e.person]: [...iv, { room: e.room, in: e.ts, out: null }] }
      break
    }
    case EVENT.EXITED: {
      const iv = s.presence[e.person] || []
      const last = iv[iv.length - 1]
      if (!last || last.out) break
      n.presence = { ...s.presence, [e.person]: [...iv.slice(0, -1), { ...last, out: e.ts }] }
      break
    }
    case EVENT.ATTENTION:
      n.attention = { ...s.attention, [e.person]: [...(s.attention[e.person] || []), { ts: e.ts, v: e.data.onTargetPct }].slice(-60) }
      break
    case EVENT.BLINK:
      n.blink = { ...s.blink, [e.person]: [...(s.blink[e.person] || []), { ts: e.ts, bpm: (e.data.blinks / e.data.validFaceS) * 60 }].slice(-30) }
      break
    case EVENT.OCCUPANCY:
      n.occupancy = { ...s.occupancy, [e.room]: e.data.zones }
      break
    case EVENT.DESK: {
      const d = s.desk[e.person] || { state: e.data.state, since: e.ts, working: 0, at_desk: 0, away: 0 }
      const acc = { ...d, [d.state]: d[d.state] + (e.ts - d.since), state: e.data.state, since: e.ts }
      n.desk = { ...s.desk, [e.person]: acc }
      break
    }
    case EVENT.UNKNOWN:
      n.alerts = [e, ...s.alerts].slice(0, 20)
      break
    case EVENT.HEARTBEAT:
      if (s.devices[e.device]) n.devices = { ...s.devices, [e.device]: { ...s.devices[e.device], fps: e.data.fps, tempC: e.data.tempC, lastSeen: e.ts, status: 'online' } }
      break
    default:
  }
  return n
}

export const isInside = (s, pid) => { const iv = s.presence[pid]; return !!iv && iv.length > 0 && !iv[iv.length - 1].out }
export const avg = (a) => (a && a.length ? a.reduce((x, y) => x + y, 0) / a.length : null)
export const attentionPct = (s, pid) => avg((s.attention[pid] || []).map((x) => x.v))
export const blinkRate = (s, pid) => avg((s.blink[pid] || []).map((x) => x.bpm))

// Late / early-exit flags vs timetable (ARCHITECTURE.md §4.5).
export function flagsFor(s, pid, now = Date.now()) {
  const p = s.world.people.find((x) => x.id === pid)
  const slot = s.world.timetable.find((t) => t.room === p?.home)
  const iv = (s.presence[pid] || []).filter((i) => !slot || i.room === slot.room)
  if (!slot) return { status: iv.length ? 'present' : 'absent', iv }
  if (!iv.length) return { status: now > slot.start + slot.graceMin * 60e3 ? 'absent' : 'pending', iv, slot }
  const g = slot.graceMin * 60e3
  const late = iv[0].in > slot.start + g
  const last = iv[iv.length - 1]
  const early = !!last.out && last.out < slot.end - g && last.out < now
  const minutes = iv.reduce((m, i) => m + (Math.min(i.out ?? now, slot.end) - Math.max(i.in, slot.start)) / 60e3, 0)
  return { status: early ? 'early_exit' : late ? 'late' : 'on_time', late, early, iv, slot, minutes: Math.max(0, minutes) }
}

const fmt = (t) => (t ? new Date(t).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: false }) : '')
const q = (v) => { const x = String(v ?? ''); return /[",\n]/.test(x) ? `"${x.replace(/"/g, '""')}"` : x }
export function attendanceCsv(s, now = Date.now()) {
  const rows = [['date', 'room', 'course', 'person_id', 'name', 'first_entry', 'last_exit', 'minutes_present', 'status', 'attention_pct', 'source']]
  const date = new Date(now).toISOString().slice(0, 10)
  for (const p of s.world.people.filter((x) => x.role === 'student')) {
    const f = flagsFor(s, p.id, now)
    const a = attentionPct(s, p.id)
    rows.push([date, p.home, f.slot?.course ?? '', p.id, p.name, fmt(f.iv[0]?.in), fmt(f.iv[f.iv.length - 1]?.out), f.minutes != null ? Math.round(f.minutes) : 0, f.status, a == null ? '' : Math.round(a * 100), 'demo'])
  }
  return rows.map((r) => r.map(q).join(',')).join('\r\n') + '\r\n'
}
export function downloadCsv(s) {
  const blob = new Blob([attendanceCsv(s)], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = Object.assign(document.createElement('a'), { href: url, download: `attendance-demo-${new Date().toISOString().slice(0, 10)}.csv` })
  document.body.appendChild(a); a.click(); a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
