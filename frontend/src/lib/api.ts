import axios, { type AxiosError, type AxiosInstance, type InternalAxiosRequestConfig } from 'axios'
import type { User } from './types'

const ACCESS_KEY = 'ch_access'
const REFRESH_KEY = 'ch_refresh'
const SESSION_KEY = 'ch_persistent_session'
export const AUTH_CHANGED = 'ch-auth-changed'

export const tokenStore = {
  getAccess: () => localStorage.getItem(ACCESS_KEY),
  getRefresh: () => localStorage.getItem(REFRESH_KEY),
  isPersistent: () => localStorage.getItem(SESSION_KEY) === '1',
  hasSession: () => !!(tokenStore.getAccess() || tokenStore.getRefresh() || tokenStore.isPersistent()),
  set: (access: string, refresh: string) => {
    localStorage.setItem(ACCESS_KEY, access)
    localStorage.setItem(REFRESH_KEY, refresh)
    localStorage.removeItem(SESSION_KEY)
  },
  setSession: (access: string) => {
    localStorage.setItem(ACCESS_KEY, access)
    localStorage.setItem(SESSION_KEY, '1')
    localStorage.removeItem(REFRESH_KEY)
  },
  setAccess: (access: string) => localStorage.setItem(ACCESS_KEY, access),
  clear: () => {
    for (const key of [ACCESS_KEY, REFRESH_KEY, SESSION_KEY, 'ch_user', 'ch_auth_identity']) localStorage.removeItem(key)
    window.dispatchEvent(new Event(AUTH_CHANGED))
  },
}

export const api = axios.create({ baseURL: import.meta.env.VITE_API_BASE_URL ?? '/api' })
// Cookie exchange deliberately has no Bearer interceptor (an expired access token is irrelevant).
export const sessionApi = axios.create({
  baseURL: api.defaults.baseURL,
  withCredentials: true,
  timeout: 10000,
  headers: { 'X-Requested-With': 'XMLHttpRequest' },
})

export interface LoginResult { user: User; access: string; refresh?: string; persistent?: boolean }
export function rememberLogin(data: LoginResult) {
  if (data.persistent) tokenStore.setSession(data.access)
  else if (data.refresh) tokenStore.set(data.access, data.refresh)
  if (data.user) localStorage.setItem('ch_user', JSON.stringify(data.user))
}

let refreshPromise: Promise<string | null> | null = null
export function refreshAccessToken(): Promise<string | null> {
  return refreshPromise ??= exchangeSession().finally(() => { refreshPromise = null })
}

async function exchangeSession(): Promise<string | null> {
  const refresh = tokenStore.getRefresh()
  const persistent = tokenStore.isPersistent()
  const previousAccess = tokenStore.getAccess()
  if (!persistent && !refresh) return null
  try {
    const { data } = persistent
      ? await sessionApi.post<LoginResult>('/auth/session/')
      : await sessionApi.post<LoginResult>('/auth/refresh/', { refresh })
    // A logout or a different login in another tab wins over an in-flight refresh.
    if (tokenStore.getAccess() !== previousAccess || tokenStore.isPersistent() !== persistent || tokenStore.getRefresh() !== refresh) return null
    if (data.persistent) rememberLogin(data)
    else if (data.refresh) tokenStore.set(data.access, data.refresh)
    else tokenStore.setAccess(data.access)
    return data.access
  } catch (error) {
    // Offline/5xx responses are temporary. Only a rejected credential ends the session.
    if (axios.isAxiosError(error) && [400, 401].includes(error.response?.status ?? 0) && tokenStore.getAccess() === previousAccess) tokenStore.clear()
    return null
  }
}

export function installSessionRecovery(client: AxiosInstance) {
  client.interceptors.response.use((response) => response, async (error: AxiosError) => {
    const original = error.config as (InternalAxiosRequestConfig & { _retried?: boolean }) | undefined
    if (error.response?.status === 401 && original && !original._retried && tokenStore.hasSession()) {
      original._retried = true
      const access = await refreshAccessToken()
      if (access) {
        original.headers.Authorization = `Bearer ${access}`
        return client(original)
      }
    }
    return Promise.reject(error)
  })
}

api.interceptors.request.use((config) => {
  const access = tokenStore.getAccess()
  if (access) config.headers.Authorization = `Bearer ${access}`
  return config
})
installSessionRecovery(api)
