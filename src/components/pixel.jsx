import { useEffect, useRef, useState } from 'react'
import { useLocation } from 'react-router-dom'

const SHIRTS = ['#29ADFF', '#FF004D', '#00E436', '#FFA300', '#FF77A8', '#83769C']
const HAIR = ['#000000', '#5F574F', '#AB5236', '#7E2553']
const hash = (s = '') => [...String(s)].reduce((a, c) => (a * 31 + c.charCodeAt(0)) >>> 0, 7)

export function PixelPerson({ seed, walking = false, size = 24, className = '' }) {
  const h = hash(seed)
  const shirt = SHIRTS[h % SHIRTS.length], hair = HAIR[(h >> 3) % HAIR.length]
  return (
    <svg viewBox="0 0 8 12" width={(size * 8) / 12} height={size} shapeRendering="crispEdges" className={`px-person ${walking ? 'walking' : ''} ${className}`} aria-hidden="true" focusable="false">
      <rect x="2" y="0" width="4" height="1" fill={hair} />
      <rect x="1" y="1" width="6" height="1" fill={hair} />
      <rect x="2" y="2" width="4" height="2" fill="#FFCCAA" />
      <rect x="3" y="2" width="1" height="1" fill="#000" /><rect x="5" y="2" width="1" height="1" fill="#000" />
      <rect x="1" y="4" width="6" height="4" fill={shirt} />
      <rect x="0" y="5" width="1" height="2" fill="#FFCCAA" /><rect x="7" y="5" width="1" height="2" fill="#FFCCAA" />
      <g className="leg-a"><rect x="2" y="8" width="1" height="4" fill="#1D2B53" /><rect x="5" y="8" width="1" height="4" fill="#1D2B53" /></g>
      <g className="leg-b"><rect x="1" y="8" width="1" height="3" fill="#1D2B53" /><rect x="3" y="8" width="1" height="4" fill="#1D2B53" /><rect x="5" y="8" width="1" height="3" fill="#1D2B53" /><rect x="6" y="8" width="1" height="4" fill="#1D2B53" /></g>
    </svg>
  )
}

export function PixelCamera({ size = 64 }) {
  return (
    <svg viewBox="0 0 16 12" width={size} height={(size * 12) / 16} shapeRendering="crispEdges" className="px-camera" aria-hidden="true" focusable="false">
      <rect x="1" y="2" width="11" height="8" fill="#C2C3C7" />
      <rect x="2" y="3" width="9" height="6" fill="#5F574F" />
      <rect x="4" y="4" width="4" height="4" fill="#000" />
      <rect x="5" y="5" width="2" height="2" fill="#29ADFF" />
      <rect x="12" y="4" width="3" height="4" fill="#C2C3C7" />
      <rect x="2" y="1" width="2" height="1" fill="#C2C3C7" />
      <rect className="px-rec" x="9" y="3" width="1" height="1" fill="#FF004D" />
      <rect x="5" y="10" width="2" height="2" fill="#C2C3C7" />
    </svg>
  )
}

export function PixelLoader({ label = 'LOADING', full = false }) {
  return (
    <div className={`px-loader ${full ? 'full' : ''}`} role="status" aria-live="polite">
      <div className="px-scan">
        <PixelCamera size={128} />
        <span className="px-beam" aria-hidden="true" />
      </div>
      <div className="px-bar" aria-hidden="true">{Array.from({ length: 10 }, (_, i) => <i key={i} style={{ '--i': i }} />)}</div>
      <p className="px-loading">{label}<span className="px-dots" aria-hidden="true">…</span><span className="sr-only">, please wait</span></p>
    </div>
  )
}

export function BootLoader({ children }) {
  const [phase, setPhase] = useState('on')
  useEffect(() => {
    const quick = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    const t1 = setTimeout(() => setPhase('out'), quick ? 0 : 600)
    const t2 = setTimeout(() => setPhase('off'), quick ? 0 : 900)
    return () => { clearTimeout(t1); clearTimeout(t2) }
  }, [])
  return (
    <>
      {children}
      {phase !== 'off' && <div className={`boot ${phase}`}><PixelLoader label="BOOTING" full /></div>}
    </>
  )
}

const CELLS = Array.from({ length: 96 }, (_, i) => ((i * 7919 + 13) % 97) / 97)
export function RouteFX() {
  const { pathname } = useLocation()
  const prev = useRef(pathname)
  const [fx, setFx] = useState({ key: 0, on: false })
  useEffect(() => {
    if (prev.current === pathname) return
    prev.current = pathname
    setFx((f) => ({ key: f.key + 1, on: true }))
    const t = setTimeout(() => setFx((f) => ({ ...f, on: false })), 700)
    return () => clearTimeout(t)
  }, [pathname])
  if (!fx.on) return null
  return (
    <div key={fx.key} className="route-fx" aria-hidden="true">
      <div className="px-wipe">{CELLS.map((d, i) => <i key={i} style={{ '--d': `${Math.round(d * 260)}ms` }} />)}</div>
      <div className="px-topbar">{Array.from({ length: 20 }, (_, i) => <i key={i} style={{ '--i': i }} />)}</div>
    </div>
  )
}

const DRIPS = [[6, 9], [19, 5], [33, 12], [47, 6], [61, 10], [78, 4], [90, 8]]
export function SprayTag({ children }) {
  return (
    <span className="tag">
      <span className="tag-text">{children}</span>
      <svg className="drips" viewBox="0 0 100 16" preserveAspectRatio="none" aria-hidden="true" focusable="false">
        {DRIPS.map(([x, h], i) => (
          <g key={x} style={{ '--k': i }} className="drip">
            <rect x={x} y="0" width="2" height={h} />
            <rect x={x - 0.5} y={h} width="3" height="2.4" />
          </g>
        ))}
      </svg>
    </span>
  )
}
