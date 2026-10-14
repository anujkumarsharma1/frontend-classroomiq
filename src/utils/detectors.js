export const FEATURES = [
  { id: 'drowsiness', label: 'Drowsiness', desc: 'Eye closure and yawns over time' },
  { id: 'blink', label: 'Blink rate', desc: 'Tiredness from how often a student blinks' },
  { id: 'headPose', label: 'Head pose', desc: 'Whether the head turns away from the screen' },
  { id: 'pupil', label: 'Pupil and iris', desc: 'Where the eyes are pointed' },
  { id: 'expression', label: 'Expressions', desc: 'Seven expressions, from focus to confusion' },
]

export const DETECTORS = [
  { key: 'drowsiness', src: '/dashboard2.html', title: 'Drowsiness and blink', needs: ['drowsiness', 'blink'] },
  { key: 'headpose', src: '/dashboard3.html', title: 'Head pose', needs: ['headPose'] },
  { key: 'pupil', src: '/dashboard4.html', title: 'Pupil and iris', needs: ['pupil'] },
  { key: 'microexpr', src: '/dashboard5.html', title: 'Micro-expressions', needs: ['expression'] },
  { key: 'struggle', src: '/dashboard_struggle.html', title: 'Productive struggle', needs: [] },
]

export const detectorsFor = (enabled) => {
  if (!Array.isArray(enabled) || enabled.length === 0) return DETECTORS
  return DETECTORS.filter((d) => d.needs.length === 0 || d.needs.some((n) => enabled.includes(n)))
}
