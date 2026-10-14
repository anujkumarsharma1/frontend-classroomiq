// Event types published by edge devices over MQTT (see ARCHITECTURE.md §3).
export const EVENT = {
  ENTERED: 'person.entered',
  EXITED: 'person.exited',
  UNKNOWN: 'face.unknown',
  ATTENTION: 'attention.sample',
  BLINK: 'blink.sample',
  OCCUPANCY: 'zone.occupancy',
  DESK: 'desk.state',
  HEARTBEAT: 'device.heartbeat',
}
export const MATCH_THRESHOLD = 0.45
export const topicFor = (e) => `ciq/${e.site}/${e.room}/${e.device}/events`
