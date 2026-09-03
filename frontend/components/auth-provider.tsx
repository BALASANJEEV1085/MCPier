'use client'

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { currentUser } from '@/lib/mock-data'

// Frontend-only demo session. No real authentication or backend is involved —
// this only simulates a signed-in state so the prototype's dashboard can be explored.
const SESSION_KEY = 'mcpier-demo-session'

interface AuthContextValue {
  isAuthenticated: boolean
  isLoading: boolean
  user: typeof currentUser
  signIn: () => void
  signOut: () => void
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    setIsAuthenticated(window.localStorage.getItem(SESSION_KEY) === 'true')
    setIsLoading(false)
  }, [])

  function signIn() {
    window.localStorage.setItem(SESSION_KEY, 'true')
    setIsAuthenticated(true)
  }

  function signOut() {
    window.localStorage.removeItem(SESSION_KEY)
    setIsAuthenticated(false)
  }

  return (
    <AuthContext.Provider value={{ isAuthenticated, isLoading, user: currentUser, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
