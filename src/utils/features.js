// Feature ids are the legacy ones the current backend validates on /auth/register.
// Labels describe the v3 IoT concept; remap ids when the v3 backend lands.
export const FEATURES = [
  { id: 'drowsiness', label: 'Attendance', desc: 'Face recognition on entry, entry and exit times' },
  { id: 'blink', label: 'Blink rate', desc: 'Blinks per minute from close cameras' },
  { id: 'headPose', label: 'Attention', desc: 'Head pose toward the board or screen' },
  { id: 'pupil', label: 'Occupancy', desc: 'Seat and zone heatmaps' },
  { id: 'expression', label: 'Office mode', desc: 'Desk time vs roaming' },
]
