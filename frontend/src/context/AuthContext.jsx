import { createContext, useContext, useState, useEffect } from 'react'
import { getMe, logout as logoutApi } from '../services/api'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const token = localStorage.getItem('token')
    const stored = localStorage.getItem('user')
    if (token && stored) {
      try {
        setUser(JSON.parse(stored))
        getMe().then(res => {
          const u = res.data.user
          setUser(u)
          localStorage.setItem('user', JSON.stringify(u))
        }).catch(() => {
          localStorage.removeItem('token')
          localStorage.removeItem('user')
          setUser(null)
        }).finally(() => setLoading(false))
      } catch (e) {
        localStorage.removeItem('token')
        localStorage.removeItem('user')
        setLoading(false)
      }
    } else {
      setLoading(false)
    }
  }, [])

  const loginUser = (token, userData) => {
    localStorage.setItem('token', token)
    localStorage.setItem('user', JSON.stringify(userData))
    setUser(userData)
  }

  const logout = async () => {
    try {
      await logoutApi()
    } catch (e) {
      // Ignore logout API errors
    }
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    setUser(null)
  }

  const updateUser = (userData) => {
    setUser(userData)
    localStorage.setItem('user', JSON.stringify(userData))
  }

  return (
    <AuthContext.Provider value={{ user, loading, loginUser, logout, updateUser }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
