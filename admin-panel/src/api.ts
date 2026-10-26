import axios, { type AxiosError, type InternalAxiosRequestConfig } from 'axios'

const ACCESS = 'ch_admin_access'
const REFRESH = 'ch_admin_refresh'
const BASE = import.meta.env.VITE_API_BASE_URL ?? '/api'

// Separate from the student tokens in lib/api.ts so a student login can never open the panel.
export const adminTokens = {
  access: () => localStorage.getItem(ACCESS),
  refresh: () => localStorage.getItem(REFRESH),
  set: (access: string, refresh: string) => {
    localStorage.setItem(ACCESS, access)
    localStorage.setItem(REFRESH, refresh)
  },
  setAccess: (access: string) => localStorage.setItem(ACCESS, access),
  clear: () => {
    localStorage.removeItem(ACCESS)
    localStorage.removeItem(REFRESH)
  },
}

export const adminApi = axios.create({ baseURL: `${BASE}/admin` })

adminApi.interceptors.request.use((config) => {
  const token = adminTokens.access()
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

let refreshing: Promise<string | null> | null = null

async function refreshAccess() {
  const refresh = adminTokens.refresh()
  if (!refresh) return null
  try {
    const { data } = await axios.post(`${BASE}/auth/refresh/`, { refresh })
    adminTokens.set(data.access, data.refresh ?? refresh)
    return data.access as string
  } catch {
    return null
  }
}

adminApi.interceptors.response.use(
  (r) => r,
  async (error: AxiosError) => {
    const original = error.config as (InternalAxiosRequestConfig & { _retried?: boolean }) | undefined
    const status = error.response?.status
    const isLogin = original?.url?.includes('/login/')
    if (status === 401 && original && !original._retried && !isLogin) {
      original._retried = true
      refreshing ??= refreshAccess().finally(() => {
        refreshing = null
      })
      const token = await refreshing
      if (token) {
        original.headers.Authorization = `Bearer ${token}`
        return adminApi(original)
      }
      adminTokens.clear()
      window.dispatchEvent(new Event('admin-logout'))
    }
    if (status === 403 && !isLogin) {
      adminTokens.clear()
      window.dispatchEvent(new Event('admin-logout'))
    }
    return Promise.reject(error)
  },
)

export interface Paged<T> {
  count: number
  next: string | null
  previous: string | null
  results: T[]
}

export interface Lead {
  id: number
  name: string
  phone: string
  course: string
  mode: 'demo' | 'expert'
  source_page: string
  utm_source: string
  utm_medium: string
  utm_campaign: string
  status: 'new' | 'contacted' | 'interested' | 'converted' | 'closed'
  notes: string
  created_at: string
}

export interface Stats {
  leads: { total: number; today: number; last_7_days: number; last_30_days: number; by_status: Record<string, number> }
  leads_per_day: { date: string; count: number }[]
  top_sources: { label: string; count: number }[]
  top_courses: { label: string; count: number }[]
  users: number
  enrollments: number
  orders: Record<string, number>
  recent_leads: Lead[]
}

export const STATUSES: Lead['status'][] = ['new', 'contacted', 'interested', 'converted', 'closed']
