import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { getMe, logout as logoutApi } from '../services/api'

const INACTIVITY_TIMEOUT = 15 * 60 * 1000 // 15 minutes in ms

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  const logout = useCallback(async (reason = 'inactive') => {
    try {
      await logoutApi()
    } catch (e) {}
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    localStorage.removeItem('lastActivity')
    setUser(null)
    if (reason === 'inactive') {
      window.location.href = '/login?timeout=true'
    }
  }, [])

  const updateActivity = useCallback(() => {
    localStorage.setItem('lastActivity', Date.now().toString())
  }, [])

  // Check activity on mount
  useEffect(() => {
    const lastActivity = localStorage.getItem('lastActivity')
    if (lastActivity) {
      const timeSinceActivity = Date.now() - parseInt(lastActivity)
      if (timeSinceActivity > INACTIVITY_TIMEOUT) {
        logout('inactive')
        return
      }
    }
  }, [logout])

  // Track activity and check periodically
  useEffect(() => {
    const events = ['mousedown', 'keydown', 'scroll', 'touchstart']
    
    const handleActivity = () => {
      updateActivity()
    }

    events.forEach(event => {
      window.addEventListener(event, handleActivity)
    })

    // Check every minute
    const interval = setInterval(() => {
      const lastActivity = localStorage.getItem('lastActivity')
      if (lastActivity && user) {
        const timeSinceActivity = Date.now() - parseInt(lastActivity)
        if (timeSinceActivity > INACTIVITY_TIMEOUT) {
          logout('inactive')
        }
      }
    }, 60000)

    return () => {
      events.forEach(event => {
        window.removeEventListener(event, handleActivity)
      })
      clearInterval(interval)
    }
  }, [user, updateActivity, logout])

  // Handle browser close
  useEffect(() => {
    const handleBeforeUnload = (e) => {
      // Only logout on browser close, not on refresh
      if (e.persisted === false && !user) {
        // Browser is closing
      }
    }

    // On page load, check if this is a fresh open (not refresh)
    const isNewSession = !localStorage.getItem('lastActivity')
    
    window.addEventListener('beforeunload', handleBeforeUnload)
    
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload)
    }
  }, [])

  useEffect(() => {
    const token = localStorage.getItem('token')
    const stored = localStorage.getItem('user')
    
    if (token && stored) {
      updateActivity() // Set initial activity
      try {
        setUser(JSON.parse(stored))
        getMe().then(res => {
          const u = res.data.user
          setUser(u)
          localStorage.setItem('user', JSON.stringify(u))
        }).catch(() => {
          logout('expired')
        }).finally(() => setLoading(false))
      } catch (e) {
        localStorage.removeItem('token')
        localStorage.removeItem('user')
        setLoading(false)
      }
    } else {
      setLoading(false)
    }
  }, [logout, updateActivity])

  const loginUser = (token, userData) => {
    localStorage.setItem('token', token)
    localStorage.setItem('user', JSON.stringify(userData))
    updateActivity()
    setUser(userData)
  }

  const value = { user, loading, loginUser, logout, updateActivity }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used within AuthProvider')
  return context
}