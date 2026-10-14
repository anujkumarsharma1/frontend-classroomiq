import { Routes, Route, Navigate } from 'react-router-dom'
import { LiveProvider, useLive } from '../../data/LiveContext'
import { ConsoleShell } from '../../components/live'
import { PixelLoader } from '../../components/pixel'
import Overview from './Overview'
import { RoomsList, RoomDetail } from './Rooms'
import Person from './Person'
import Office from './Office'
import Trends from './Trends'
import Devices from './Devices'
import Enroll from './Enroll'

function Inner() {
  const { state, error } = useLive()
  if (error) return <div className="block"><h1 className="h1">Can&apos;t load live data</h1><p className="muted">{error}</p></div>
  if (!state) return <PixelLoader label="CONNECTING" />
  return (
    <Routes>
      <Route index element={<Overview />} />
      <Route path="rooms" element={<RoomsList />} />
      <Route path="rooms/:id" element={<RoomDetail />} />
      <Route path="people/:id" element={<Person />} />
      <Route path="office" element={<Office />} />
      <Route path="trends" element={<Trends />} />
      <Route path="devices" element={<Devices />} />
      <Route path="enroll" element={<Enroll />} />
      <Route path="*" element={<Navigate to="/console" replace />} />
    </Routes>
  )
}
export default function Console() {
  return <LiveProvider><ConsoleShell><Inner /></ConsoleShell></LiveProvider>
}
