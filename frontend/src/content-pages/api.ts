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
}

export interface Seo {
  title: string
  description: string
  canonical: string
  robots: string
  og: { type: string; title: string; description: string; image: string; url: string }
  json_ld: unknown
}

export interface Paged<T> {
  count: number
  results: T[]
  industries?: string[]
  technologies?: string[]
}

export interface Article extends Card {
  content_html?: string
  toc: { id: string; text: string; level: number }[]
  author_title?: string
  updated_at?: string
  faq?: { q: string; a: string }[]
  related: Card[]
  seo: Seo
  preview: boolean
  sections?: { key: string; title: string; html: string }[]
  metrics?: { label: string; value: string; note: string }[]
  duration?: string
  related_services?: { label: string; url: string }[]
  gallery?: { src: string; alt: string }[]
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
export const getCases = (params: Record<string, string | number>) => api.get<Paged<Card>>('/case-studies/', { params }).then((r) => r.data)
export const getCase = (slug: string, preview?: string) => api.get<Article>(`/case-studies/${slug}/`, { params: preview ? { preview } : {} }).then((r) => r.data)

export const PAGE_SIZE = 9
export const fmtDate = (iso?: string) => (iso ? new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '')
