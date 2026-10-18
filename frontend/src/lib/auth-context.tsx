import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { api, tokenStore } from './api'
import type { User } from './types'

interface RegisterPayload {
  username: string
  email: string
  phone: string
  password: string
}

interface AuthContextValue {
  user: User | null
  loading: boolean
  login: (username: string, password: string) => Promise<void>
  register: (payload: RegisterPayload) => Promise<void>
  logout: () => void
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  async function loadMe() {
    try {
      const { data } = await api.get<User>('/auth/me/')
      setUser(data)
    } catch {
      setUser(null)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (tokenStore.getAccess()) {
      loadMe()
    } else {
      setLoading(false)
    }
  }, [])

  async function login(username: string, password: string) {
    const { data } = await api.post('/auth/login/', { username, password })
    tokenStore.set(data.access, data.refresh)
    await loadMe()
  }

  async function register(payload: RegisterPayload) {
    const { data } = await api.post('/auth/register/', payload)
    tokenStore.set(data.access, data.refresh)
    setUser(data.user)
  }

  function logout() {
    tokenStore.clear()
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
