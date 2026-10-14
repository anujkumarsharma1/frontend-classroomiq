import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './context/AuthContext'
import LandingPage from './pages/LandingPage'
import LoginPage from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'
import Console from './pages/console/Console'
import NotFoundPage from './pages/NotFoundPage'

const homeFor = () => '/console'

const Loading = () => (
  <div className="auth-page" role="status" aria-label="Loading"><span className="spinner" style={{ color: 'var(--accent)', width: 28, height: 28 }} /></div>
)

const ProtectedRoute = ({ children, roles }) => {
  const { user, loading } = useAuth()
  if (loading) return <Loading />
  if (!user) return <Navigate to="/login" replace />
  if (roles && !roles.includes(user.role)) return <Navigate to="/" replace />
  return children
}

const PublicRoute = ({ children }) => {
  const { user, loading } = useAuth()
  if (loading) return <Loading />
  if (user) return <Navigate to={homeFor(user.role)} replace />
  return children
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/login" element={<PublicRoute><LoginPage /></PublicRoute>} />
      <Route path="/register" element={<PublicRoute><RegisterPage /></PublicRoute>} />
      <Route path="/console/*" element={<ProtectedRoute roles={['admin', 'teacher']}><Console /></ProtectedRoute>} />
      <Route path="/admin/*" element={<Navigate to="/console" replace />} />
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  )
}
