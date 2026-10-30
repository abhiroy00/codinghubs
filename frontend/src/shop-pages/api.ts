import axios from 'axios'
import { useEffect, useState } from 'react'
import { api as baseApi } from '../lib/api'
import { takeInitial } from '../content-pages/api'

/* eslint-disable @typescript-eslint/no-explicit-any */
export const initial = (): Record<string, any> | null => (typeof document === 'undefined' ? null : (takeInitial() as unknown as Record<string, any> | null))

const CART_KEY = 'ch_cart_token'
const ORDER_KEY = 'ch_last_order'
export const cartToken = {
  get: () => {
    try {
      return localStorage.getItem(CART_KEY)
    } catch {
      return null
    }
  },
  set: (t: string | null) => {
    try {
      if (t) localStorage.setItem(CART_KEY, t)
      else localStorage.removeItem(CART_KEY)
    } catch {
      /* storage unavailable: the cart then lasts for the page only */
    }
  },
}
/** The order token lets a guest open their own order and downloads; kept only in this browser (and the confirmation email). */
export const lastOrder = {
  get: (): { number: string; token: string } | null => {
    try {
      return JSON.parse(localStorage.getItem(ORDER_KEY) || 'null')
    } catch {
      return null
    }
  },
  set: (v: { number: string; token: string } | null) => {
    try {
      if (v) localStorage.setItem(ORDER_KEY, JSON.stringify(v))
      else localStorage.removeItem(ORDER_KEY)
    } catch {
      /* ignore */
    }
  },
}

export const shop = axios.create({ baseURL: baseApi.defaults.baseURL })
shop.interceptors.request.use((c) => {
  const access = localStorage.getItem('ch_access')
  if (access) c.headers.Authorization = `Bearer ${access}`
  const t = cartToken.get()
  if (t) c.headers['X-Cart-Token'] = t
  return c
})

export interface Money {
  price: string
  original_price?: string | null
  currency?: string
}
export const rupees = (v: string | number | null | undefined) => `₹${Number(v ?? 0).toLocaleString('en-IN', { minimumFractionDigits: Number(v) % 1 ? 2 : 0, maximumFractionDigits: 2 })}`
export const fmtSize = (n: number) => (n > 1048576 ? `${(n / 1048576).toFixed(1)} MB` : `${Math.max(1, Math.round(n / 1024))} KB`)

export interface Card {
  id?: number
  title: string
  slug: string
  short_description?: string
  summary?: string
  price?: string | null
  original_price?: string | null
  is_free?: boolean
  is_paid?: boolean
  product_type?: string
  stock_label?: string
  in_stock?: boolean
  format?: string
  author?: string
  category?: { name: string; slug: string } | string | null
  image?: { src: string; alt: string } | null
  featured_image?: string
  featured_image_alt?: string
  difficulty?: string
  technologies?: string[]
  estimated_time?: string
  access_type?: string
  reading_time?: number
  is_featured?: boolean
}
export interface Paged<T> {
  count: number
  results: T[]
  categories?: any[]
  technologies?: string[]
}

export const get = <T = any>(url: string, params?: Record<string, any>) => shop.get<T>(url, { params }).then((r) => r.data)

/* ---- cart (server-side; this only remembers the token and notifies the header) ---- */
export interface CartLine {
  product: Card & { slug: string; product_type: string }
  quantity: number
  unit_price: string
  subtotal: string
  discount: string
  tax: string
  problem: string
  max_quantity: number
}
export interface CartData {
  token: string | null
  items: CartLine[]
  subtotal: string
  discount: string
  tax: string
  shipping: string
  total: string
  coupon: string
  coupon_error: string
  tax_mode: string
  has_physical: boolean
  has_digital: boolean
  problems: { product: string; message: string }[]
  count: number
}
let cartSnapshot: CartData | null = null
let cartRequest: Promise<CartData> | null = null
const cartSubscribers = new Set<(cart: CartData) => void>()
const publishCart = (cart: CartData) => {
  cartSnapshot = cart
  cartSubscribers.forEach((subscriber) => subscriber(cart))
}
const emit = (count: number) => {
  try {
    localStorage.setItem('ch_cart_count', String(count))
  } catch {
    /* ignore */
  }
  window.dispatchEvent(new CustomEvent('cart-count', { detail: count }))
}
const adopt = (c: CartData, openDrawer = false) => {
  if (c.token) cartToken.set(c.token)
  publishCart(c)
  emit(c.count)
  window.dispatchEvent(new CustomEvent('cart-updated', { detail: c }))
  if (openDrawer) window.dispatchEvent(new CustomEvent('cart-open', { detail: c }))
  return c
}
const loadCart = () => {
  if (!cartRequest) {
    cartRequest = get<CartData>('/cart/').then(adopt).finally(() => { cartRequest = null })
  }
  return cartRequest
}
export const cartApi = {
  get: loadCart,
<<<<<<< Updated upstream
  add: (product: number, quantity = 1, openDrawer = true) => shop.post<CartData>('/cart/items/', { product, quantity }).then((r) => adopt(r.data, openDrawer)),
=======
  add: (product: number, quantity = 1) => shop.post<CartData>('/cart/items/', { product, quantity }).then((r) => adopt(r.data)),
>>>>>>> Stashed changes
  set: (productId: number, quantity: number) => shop.patch<CartData>(`/cart/items/${productId}/`, { quantity }).then((r) => adopt(r.data)),
  remove: (productId: number) => shop.delete<CartData>(`/cart/items/${productId}/`).then((r) => adopt(r.data)),
  coupon: (code: string, email = '') => shop.post<CartData>('/cart/coupon/', { code, email }).then((r) => adopt(r.data)),
}
/** Shared view of the existing server cart, hydrated once and refreshed by every cart mutation. */
export function useCartData() {
  const [cart, setCart] = useState<CartData | null>(cartSnapshot)
  const [ready, setReady] = useState(!!cartSnapshot)
  useEffect(() => {
    const receive = (next: CartData) => { setCart(next); setReady(true) }
    cartSubscribers.add(receive)
    if (cartSnapshot) { setCart(cartSnapshot); setReady(true) }
    else void loadCart().then(() => setReady(true)).catch(() => setReady(true))
    return () => { cartSubscribers.delete(receive) }
  }, [])
  return { cart, ready }
}
export const errorText = (err: unknown, fallback = 'Something went wrong. Please try again.') => {
  const d = (err as { response?: { data?: { detail?: string; coupon_error?: string } } })?.response?.data
  return d?.detail || d?.coupon_error || fallback
}
