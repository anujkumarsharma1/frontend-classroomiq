import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import api from '../utils/api'

const AuthContext = createContext(null)
// Demo-data mode: no backend call, clearly flagged user.
const DEMO_USER = { fullName: 'Demo admin', role: 'admin', demo: true }

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null)
  const [institution, setInstitution] = useState(null)
  const [loading, setLoading] = useState(true)

  const loadUser = useCallback(async () => {
    if (localStorage.getItem('ciq-demo') === '1') { setUser(DEMO_USER); setInstitution({ name: 'Demo campus' }); setLoading(false); return }
    const token = localStorage.getItem('token')
    if (!token) { setLoading(false); return }
    try {
      const { data } = await api.get('/auth/me')
      setUser(data.user)
      setInstitution(data.institution)
    } catch {
      localStorage.removeItem('token')
      localStorage.removeItem('user')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadUser() }, [loadUser])

  const login = (token, userData, institutionData) => {
    localStorage.setItem('token', token)
    setUser(userData)
    setInstitution(institutionData)
  }

  const enterDemo = () => { localStorage.setItem('ciq-demo', '1'); setUser(DEMO_USER); setInstitution({ name: 'Demo campus' }) }

  const logout = () => {
    localStorage.removeItem('ciq-demo')
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    setUser(null)
    setInstitution(null)
  }

  const isAdmin = user?.role === 'admin'
  const isTeacher = user?.role === 'teacher'
  const isStudent = user?.role === 'student'

  return (
    <AuthContext.Provider value={{ user, institution, loading, login, logout, isAdmin, isTeacher, isStudent, loadUser, enterDemo }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider')
  return ctx
}
