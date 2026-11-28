import axios from 'axios'
import { installSessionRecovery, api as baseApi } from '../lib/api'
import { takeInitial } from '../content-pages/api'

/* eslint-disable @typescript-eslint/no-explicit-any */
export const initial = (): Record<string, any> | null => (typeof document === 'undefined' ? null : (takeInitial() as unknown as Record<string, any> | null))

export const shop = axios.create({ baseURL: baseApi.defaults.baseURL })
shop.interceptors.request.use((c) => {
  const access = localStorage.getItem('ch_access')
  if (access) c.headers.Authorization = `Bearer ${access}`
  return c
})

installSessionRecovery(shop)

export const fmtSize = (n: number) => (n > 1048576 ? `${(n / 1048576).toFixed(1)} MB` : `${Math.max(1, Math.round(n / 1024))} KB`)

export interface Card {
  id?: number
  title: string
  slug: string
  summary?: string
  category?: { name: string; slug: string } | string | null
  image?: { src: string; alt: string } | null
  featured_image?: string
  featured_image_alt?: string
  difficulty?: string
  technologies?: string[]
  estimated_time?: string
  files_restricted?: boolean
  access_type?: string
  reading_time?: number
  is_featured?: boolean
  /** First published guide of a project (set on project cards). */
  guide?: { title: string; slug: string; access_type?: string } | null
}
export interface Paged<T> {
  count: number
  results: T[]
  categories?: any[]
  technologies?: string[]
  indexable?: boolean
}

export const get = <T = any>(url: string, params?: Record<string, any>) => shop.get<T>(url, { params }).then((r) => r.data)

export const errorText = (err: unknown, fallback = 'Something went wrong. Please try again.') => {
  const d = (err as { response?: { data?: Record<string, unknown> } })?.response?.data
  if (!d) return fallback
  if (typeof d.detail === 'string') return d.detail
  if (typeof d.coupon_error === 'string') return d.coupon_error
  // DRF field errors look like {password: ['...']}; show the first message rather than a generic one.
  for (const value of Object.values(d)) {
    if (Array.isArray(value) && typeof value[0] === 'string') return value[0]
    if (typeof value === 'string') return value
  }
  return fallback
}
