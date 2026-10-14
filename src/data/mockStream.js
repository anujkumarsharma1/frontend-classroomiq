// Simulated MQTT event stream for demo-data mode. Produces the same event shapes
// the edge devices will publish. Deterministic seed so screenshots are stable-ish.
import { EVENT, MATCH_THRESHOLD } from './schema'

let seed = 42
const rnd = () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646 }
const pick = (a) => a[Math.floor(rnd() * a.length)]
const SITE = 'main-campus'
const FIRST = ['Aarav','Diya','Kabir','Meera','Rohan','Ananya','Ishaan','Saanvi','Vihaan','Kavya','Arjun','Nisha','Dev','Riya','Aditya','Pooja','Kunal','Tara','Yash','Sneha','Om','Priya','Neel','Zara']
const LAST = ['Sharma','Iyer','Khan','Reddy','Gupta','Nair','Das','Mehta','Bose','Singh','Patel','Rao']

export function buildWorld(now = Date.now()) {
  seed = 42
  const rooms = [
    { id: 'R-101', name: 'Room 101', mode: 'classroom', course: 'Data Structures', zones: 12 },
    { id: 'R-102', name: 'Room 102', mode: 'classroom', course: 'Operating Systems', zones: 12 },
    { id: 'LAB-2', name: 'AI Lab 2', mode: 'classroom', course: 'Machine Learning', zones: 12 },
    { id: 'OFF-1', name: 'Office floor 1', mode: 'office', course: null, zones: 8 },
  ]
  const devices = rooms.flatMap((r, i) => [
    { id: `edge-${r.id.toLowerCase()}`, room: r.id, kind: i === 3 ? 'Jetson Orin Nano' : 'Raspberry Pi 5 + Hailo-8L', cameras: i === 3 ? 3 : 1, fps: 14 + rnd() * 2, tempC: 52 + rnd() * 10, status: 'online', lastSeen: now },
  ])
  devices.push({ id: 'edge-r-103', room: 'R-103', kind: 'Raspberry Pi 5', cameras: 1, fps: 0, tempC: 0, status: 'offline', lastSeen: now - 14 * 60e3 })
  const people = Array.from({ length: 24 }, (_, i) => {
    const office = i >= 18
    return {
      id: `P-${String(i + 1).padStart(4, '0')}`,
      name: `${FIRST[i]} ${pick(LAST)}`,
      role: office ? 'staff' : 'student',
      home: office ? 'OFF-1' : rooms[i % 3].id,
      desk: office ? `D-${i - 17}` : null,
      enrolled: now - (5 + i) * 86400e3,
      consent: true,
    }
  })
  // Timetable: current slot started 40 min ago and runs 60 min.
  const slotStart = now - 40 * 60e3
  const timetable = rooms.filter((r) => r.mode === 'classroom').map((r) => ({ room: r.id, course: r.course, start: slotStart, end: slotStart + 60 * 60e3, graceMin: 5 }))
  return { rooms, devices, people, timetable, site: SITE }
}

// History that already happened in the current slot, so the dashboard isn't empty.
export function backfill(world, now = Date.now()) {
  const ev = []
  const slotStart = world.timetable[0].start
  for (const p of world.people) {
    const room = world.rooms.find((r) => r.id === p.home)
    const device = world.devices.find((d) => d.room === room.id).id
    const base = { site: world.site, room: room.id, device, camera: 'cam-1' }
    if (rnd() < 0.08) continue // absent
    const late = rnd() < 0.2
    const tIn = slotStart - 4 * 60e3 + rnd() * 6 * 60e3 + (late ? 8 * 60e3 + rnd() * 10 * 60e3 : 0)
    ev.push({ ...base, id: `b-${p.id}-in`, ts: tIn, type: EVENT.ENTERED, person: p.id, match: { score: 0.55 + rnd() * 0.3, threshold: MATCH_THRESHOLD }, data: { line: 'door-1', direction: 'in' } })
    if (rnd() < 0.15) {
      const tOut = tIn + (10 + rnd() * 15) * 60e3
      if (tOut < now) ev.push({ ...base, id: `b-${p.id}-out`, ts: tOut, type: EVENT.EXITED, person: p.id, data: { line: 'door-1', direction: 'out' } })
    }
  }
  // Desk-state history for office staff over the last 40 min.
  for (const p of world.people.filter((x) => x.role === 'staff')) {
    const device = world.devices.find((d) => d.room === p.home).id
    for (let t = now - 40 * 60e3, k = 0; t < now - 30e3; t += (2 + rnd() * 6) * 60e3, k++) {
      const r = rnd()
      ev.push({ site: world.site, room: p.home, device, camera: 'cam-2', id: `b-dk-${p.id}-${k}`, ts: t, type: EVENT.DESK, person: p.id, data: { desk: p.desk, state: r < 0.6 ? 'working' : r < 0.8 ? 'at_desk' : 'away' } })
    }
  }
  // Two earlier unknown-face alerts (no images, only scores).
  for (const [k, room] of [[0, 'R-102'], [1, 'LAB-2']]) {
    const device = world.devices.find((d) => d.room === room).id
    ev.push({ site: world.site, room, device, camera: 'cam-1', id: `b-uk-${k}`, ts: now - (18 - k * 9) * 60e3, type: EVENT.UNKNOWN, person: null, track: `t-${4100 + k}`, match: { score: 0.21 + k * 0.07, threshold: MATCH_THRESHOLD }, data: { zone: 'door' } })
  }
  return ev.sort((a, b) => a.ts - b.ts)
}

// Live generator: every tick emits a handful of events.
export function startMockStream(world, onEvent, { intervalMs = 1500 } = {}) {
  let n = 0
  const tick = () => {
    const now = Date.now()
    for (const d of world.devices.filter((x) => x.status === 'online')) {
      if (n % 4 === 0) onEvent({ id: `hb-${d.id}-${n}`, ts: now, site: world.site, room: d.room, device: d.id, type: EVENT.HEARTBEAT, data: { fps: 13.5 + rnd() * 2.5, tempC: 50 + rnd() * 14 } })
    }
    for (let k = 0; k < 3; k++) {
      const p = pick(world.people)
      const d = world.devices.find((x) => x.room === p.home)
      const base = { site: world.site, room: p.home, device: d.id, camera: 'cam-1', person: p.id, ts: now }
      if (p.role === 'staff') {
        const r = rnd()
        onEvent({ ...base, id: `dk-${n}-${k}`, type: EVENT.DESK, data: { desk: p.desk, state: r < 0.62 ? 'working' : r < 0.8 ? 'at_desk' : 'away' } })
      } else {
        onEvent({ ...base, id: `at-${n}-${k}`, type: EVENT.ATTENTION, data: { onTargetPct: Math.min(1, Math.max(0, 0.35 + rnd() * 0.65)), yaw: (rnd() - 0.5) * 50, pitch: (rnd() - 0.5) * 20, target: 'board' } })
        if (rnd() < 0.5) onEvent({ ...base, id: `bl-${n}-${k}`, type: EVENT.BLINK, data: { blinks: Math.round(9 + rnd() * 12), windowS: 60, validFaceS: Math.round(35 + rnd() * 25) } })
      }
    }
    if (n % 3 === 0) {
      const r = pick(world.rooms)
      const d = world.devices.find((x) => x.room === r.id)
      const zones = {}
      for (let z = 0; z < r.zones; z++) zones[`z${z}`] = rnd() < (0.25 + 0.6 * ((z % 4) / 4 + rnd() * 0.3)) ? 1 : 0
      onEvent({ id: `oc-${n}`, ts: now, site: world.site, room: r.id, device: d.id, type: EVENT.OCCUPANCY, data: { zones } })
    }
    if (n % 9 === 4) {
      const r = pick(world.rooms)
      const d = world.devices.find((x) => x.room === r.id)
      onEvent({ id: `uk-${n}`, ts: now, site: world.site, room: r.id, device: d.id, camera: 'cam-1', type: EVENT.UNKNOWN, person: null, track: `t-${9000 + n}`, match: { score: 0.12 + rnd() * 0.25, threshold: MATCH_THRESHOLD }, data: { bestScore: 0, zone: 'door' } })
    }
    if (n % 7 === 2) {
      const p = pick(world.people.filter((x) => x.role === 'student'))
      const d = world.devices.find((x) => x.room === p.home)
      const type = rnd() < 0.5 ? EVENT.EXITED : EVENT.ENTERED
      onEvent({ id: `mv-${n}`, ts: now, site: world.site, room: p.home, device: d.id, camera: 'cam-1', person: p.id, type, match: { score: 0.6, threshold: MATCH_THRESHOLD }, data: { line: 'door-1', direction: type === EVENT.ENTERED ? 'in' : 'out' } })
    }
    n++
  }
  const h = setInterval(tick, intervalMs)
  tick()
  return () => clearInterval(h)
}

// Weekly attention trend: 8 past ISO weeks per course (demo only).
export function weeklyTrend(world) {
  seed = 7
  return world.rooms.filter((r) => r.course).map((r) => {
    let v = 0.6 + rnd() * 0.1
    return { course: r.course, room: r.id, weeks: Array.from({ length: 8 }, (_, i) => { v = Math.min(0.92, Math.max(0.4, v + (rnd() - 0.48) * 0.08)); return { week: `W${34 + i}`, pct: v } }) }
  })
}
// Heatmap history: zone x hour (08..17) occupancy share.
export function heatmapHistory(room) {
  seed = room.id.charCodeAt(room.id.length - 1) * 31
  return Array.from({ length: room.zones }, (_, z) => Array.from({ length: 10 }, (_, h) => {
    const lunch = h === 4 || h === 5 ? 0.35 : 1
    const front = 1 - (Math.floor(z / 4) * 0.22)
    return Math.max(0, Math.min(1, (0.3 + rnd() * 0.6) * lunch * front))
  }))
}
