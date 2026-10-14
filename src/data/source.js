// Swappable data source. VITE_DATA_SOURCE=api will use the backend once the
// IoT ingest exists; until then everything runs on the demo stream.
import { buildWorld, backfill, startMockStream } from './mockStream'
import { getSocketUrl } from '../utils/api'

export const DATA_SOURCE = import.meta.env.VITE_DATA_SOURCE === 'api' ? 'api' : 'demo'

const demoSource = {
  kind: 'demo',
  async load() { const world = buildWorld(); return { world, history: backfill(world) } },
  subscribe(world, onEvent) { return startMockStream(world, onEvent) },
}

// Stub: wire to GET /api/iot/world, GET /api/iot/events?since=, and socket.io 'iot:event'.
const apiSource = {
  kind: 'api',
  async load() { throw new Error(`IoT API not implemented yet (${getSocketUrl()})`) },
  subscribe() { return () => {} },
}

export const source = DATA_SOURCE === 'api' ? apiSource : demoSource
