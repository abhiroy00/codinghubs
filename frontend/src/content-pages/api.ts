import { api } from '../lib/api'

export interface Card {
  title: string
  slug: string
  excerpt?: string
  summary?: string
  featured_image: string
  featured_image_alt: string
  author_name?: string
  category?: { name: string; slug: string } | null
  industry?: string
  tags?: string[]
  technologies?: string[]
  client?: string
  highlights?: { label: string; value: string }[]
  published_at: string
  reading_time?: number
  is_featured: boolean
  view_count?: number
}

export interface Seo {
  title: string
  description: string
  canonical: string
  robots: string
  og: { type: string; title: string; description: string; image: string; url: string; alt?: string }
  json_ld: unknown
}

export interface Paged<T> {
  count: number
  results: T[]
  industries?: string[]
  technologies?: string[]
}

export interface Article extends Card {
  featured_image_caption?: string
  content_html?: string
  toc: { id: string; text: string; level: number }[]
  author_title?: string
  updated_at?: string
  gallery?: { src: string; alt: string }[]
  word_count?: number
  faq?: { q: string; a: string }[]
  related: Card[]
  seo: Seo
  preview: boolean
  sections?: { key: string; title: string; html: string }[]
  metrics?: { label: string; value: string; note: string }[]
  duration?: string
  related_services?: { label: string; url: string }[]
}

interface Initial {
  kind: 'blog-list' | 'case-list' | 'blog' | 'case'
  slug?: string
  article?: Article
  page?: number
  category?: string
  industry?: string
  q?: string
  results?: Card[]
  count?: number
  categories?: { name: string; slug: string; blog_count: number }[]
  industries?: string[]
}

/** The server embeds the page's data in the HTML (#__CONTENT__) so the first React render needs no request and no flash. */
let parsed = false
let initialData: Initial | null = null
export function takeInitial(): Initial | null {
  if (parsed) return initialData
  parsed = true
  const el = document.getElementById('__CONTENT__')
  if (!el) return null
  try {
    initialData = JSON.parse(el.textContent || 'null') as Initial
  } catch {
    initialData = null
  }
  el.remove()
  return initialData
}

export const getBlogs = (params: Record<string, string | number>) => api.get<Paged<Card>>('/blogs/', { params }).then((r) => r.data)
export const getBlogCategories = () => api.get<{ name: string; slug: string; blog_count: number }[]>('/blog-categories/').then((r) => r.data)
export const getBlog = (slug: string, preview?: string) => api.get<Article>(`/blogs/${slug}/`, { params: preview ? { preview } : {} }).then((r) => r.data)
/** A repeat visit to the same post from the same browser counts again after this long (refreshes in between do not). */
export const VIEW_WINDOW_MS = 30 * 60 * 1000

/**
 * Counts a view of a live post: once per browser per post within VIEW_WINDOW_MS, like an analytics session.
 * The server ignores bots and anything not live. Resolves true when this call recorded a view. Never throws.
 */
export async function recordView(kind: 'blog' | 'case', slug: string, now = Date.now()): Promise<boolean> {
  const key = `ch_view_${kind}_${slug}`
  try {
    const last = Number(localStorage.getItem(key) ?? 0)
    if (last && now - last < VIEW_WINDOW_MS) return false
    localStorage.setItem(key, String(now))
  } catch {
    // Storage blocked (private mode, strict settings): still count, the server throttle limits abuse.
  }
  try {
    await api.post(`/${kind === 'blog' ? 'blogs' : 'case-studies'}/${slug}/view/`)
    return true
  } catch {
    return false
  }
}
export const getCases = (params: Record<string, string | number>) => api.get<Paged<Card>>('/case-studies/', { params }).then((r) => r.data)
export const getCase = (slug: string, preview?: string) => api.get<Article>(`/case-studies/${slug}/`, { params: preview ? { preview } : {} }).then((r) => r.data)

export const PAGE_SIZE = 9
export const fmtDate = (iso?: string) => (iso ? new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '')
