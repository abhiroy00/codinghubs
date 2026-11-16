import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { api, AUTH_CHANGED, refreshAccessToken, rememberLogin, sessionApi, tokenStore, type LoginResult } from './api'
import type { User } from './types'

interface RegisterPayload { username: string; email: string; phone: string; password: string }
interface AuthContextValue {
  user: User | null
  loading: boolean
  login: (username: string, password: string) => Promise<void>
  loginWithGoogle: (credential: string, password?: string) => Promise<void>
  register: (payload: RegisterPayload) => Promise<void>
  logout: () => Promise<void>
  /** Replace the signed-in user after the server confirms a profile update. */
  updateUser: (next: User) => void
}
const AuthContext = createContext<AuthContextValue | null>(null)
const PENDING_LOGOUT = 'ch_pending_logout'

function cachedUser(): User | null {
  try { return JSON.parse(localStorage.getItem('ch_user') || 'null') } catch { return null }
}

let logoutPromise: Promise<void> | null = null
async function finishLogout() {
  if (!localStorage.getItem(PENDING_LOGOUT)) return
  const refresh = localStorage.getItem(PENDING_LOGOUT)
  return logoutPromise ??= sessionApi.post('/auth/logout/', { refresh: refresh === '1' ? undefined : refresh }).then(() => {
    if (localStorage.getItem(PENDING_LOGOUT) === refresh) localStorage.removeItem(PENDING_LOGOUT)
  }).finally(() => { logoutPromise = null })
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true
    async function restore() {
      try {
        await finishLogout()
        if (!tokenStore.hasSession()) { if (active) setUser(null); return }
        if (tokenStore.isPersistent() || !tokenStore.getAccess()) await refreshAccessToken()
        if (!tokenStore.hasSession()) { if (active) setUser(null); return }
        const requestedIdentity = localStorage.getItem('ch_auth_identity')
        const { data } = await api.get<User>('/auth/me/')
        // A logout while /me was pending must never sign the user back in.
        if (active && tokenStore.hasSession() && localStorage.getItem('ch_auth_identity') === requestedIdentity) {
          localStorage.setItem('ch_user', JSON.stringify(data))
          setUser(data)
        }
      } catch {
        if (active) setUser(tokenStore.hasSession() ? cachedUser() : null)
      } finally { if (active) setLoading(false) }
    }
    const onStorage = (event: StorageEvent) => {
      if (event.key === null || ['ch_access', 'ch_user', 'ch_persistent_session'].includes(event.key)) {
        if (!tokenStore.hasSession()) setUser(null)
        else setUser(cachedUser())
      }
    }
    const onClear = () => setUser(null)
    const onVisible = () => { if (document.visibilityState === 'visible') void restore() }
    void restore()
    window.addEventListener('storage', onStorage)
    window.addEventListener(AUTH_CHANGED, onClear)
    window.addEventListener('online', restore)
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      active = false
      window.removeEventListener('storage', onStorage)
      window.removeEventListener(AUTH_CHANGED, onClear)
      window.removeEventListener('online', restore)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [])

  async function signIn(path: string, payload: object) {
    await finishLogout()
    const { data } = await sessionApi.post<LoginResult>(path, { ...payload, persistent: true })
    localStorage.setItem('ch_auth_identity', crypto.randomUUID())
    rememberLogin(data)
    if (data.user) setUser(data.user)
    else {
      const result = await api.get<User>('/auth/me/')
      localStorage.setItem('ch_user', JSON.stringify(result.data))
      setUser(result.data)
    }
  }
  const login = (username: string, password: string) => signIn('/auth/login/', { username, password })
  const loginWithGoogle = (credential: string, password?: string) => signIn('/auth/google/', { credential, ...(password ? { password } : {}) })
  const register = (payload: RegisterPayload) => signIn('/auth/register/', payload)

  async function logout() {
    localStorage.setItem(PENDING_LOGOUT, tokenStore.getRefresh() || '1')
    tokenStore.clear()
    setUser(null)
    // If offline, retry server revocation on reconnect/before the next sign-in.
    await finishLogout().catch(() => undefined)
  }
  function updateUser(next: User) {
    localStorage.setItem('ch_user', JSON.stringify(next))
    setUser(next)
  }
  return <AuthContext.Provider value={{ user, loading, login, loginWithGoogle, register, logout, updateUser }}>{children}</AuthContext.Provider>
}

export const useOptionalAuth = () => useContext(AuthContext)
export function useAuth() {
  const ctx = useOptionalAuth()
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
