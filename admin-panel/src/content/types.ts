export type Kind = 'blogs' | 'case-studies' | 'projects' | 'project-guides' | 'products'
export type Status = 'draft' | 'scheduled' | 'published' | 'archived'

export interface Row {
  id: number
  title: string
  slug: string
  status: Status
  published_at: string | null
  updated_at: string
  category_name?: string | null
  industry?: string
  is_featured: boolean
  reading_time: number
}

export interface Taxon {
  id: number
  name: string
  slug: string
  blog_count: number
}

export interface Revision {
  id: number
  created_at: string
  title: string
  status: string
}

export interface ContentStats {
  blogs: Counts
  case_studies: Counts
  recent: { id: number; kind: 'blog' | 'case'; title: string; status: Status; updated_at: string }[]
}
export interface Counts {
  total: number
  published: number
  draft: number
  scheduled: number
  archived: number
}

export interface SeoFields {
  seo_title: string
  meta_description: string
  focus_keyword: string
  secondary_keywords: string[]
  canonical_url: string
  og_title: string
  og_description: string
  og_image: string
}

export interface Common extends SeoFields {
  id?: number
  title: string
  slug: string
  featured_image: string
  featured_image_alt: string
  author_name: string
  author_title: string
  is_featured: boolean
  status: Status
  published_at: string // value of <input type="datetime-local">, '' when unset
  related_ids: number[]
  related_titles: { id: number; title: string }[]
}

export interface BlogForm extends Common {
  excerpt: string
  content: string
  category: number | ''
  tag_names: string[]
  search_intent: string
  faq: { q: string; a: string }[]
}

export interface CaseForm extends Common {
  summary: string
  client_name: string
  client_permission: boolean
  client_descriptor: string
  industry: string
  duration: string
  overview: string
  background: string
  challenge: string
  objectives: string
  solution: string
  implementation: string
  results: string
  lessons: string
  hidden_sections: string[]
  technologies: string[]
  metrics: { label: string; value: string; note: string }[]
  related_services: { label: string; url: string }[]
  gallery: { src: string; alt: string }[]
}

const seoBlank: SeoFields = {
  seo_title: '', meta_description: '', focus_keyword: '', secondary_keywords: [], canonical_url: '', og_title: '', og_description: '', og_image: '',
}
const commonBlank: Common = {
  title: '', slug: '', featured_image: '', featured_image_alt: '', author_name: '', author_title: '', is_featured: false, status: 'draft',
  published_at: '', related_ids: [], related_titles: [], ...seoBlank,
}
export const blankBlog: BlogForm = { ...commonBlank, excerpt: '', content: '', category: '', tag_names: [], search_intent: '', faq: [] }
export const blankCase: CaseForm = {
  ...commonBlank, summary: '', client_name: '', client_permission: false, client_descriptor: '', industry: '', duration: '', overview: '', background: '',
  challenge: '', objectives: '', solution: '', implementation: '', results: '', lessons: '', hidden_sections: [], technologies: [], metrics: [],
  related_services: [], gallery: [],
}

/** ISO (UTC) from the API -> value for <input type="datetime-local"> in the browser's timezone. */
export function toLocalInput(iso: string | null | undefined): string {
  if (!iso) return ''
  const d = new Date(iso)
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`
}
export const fromLocalInput = (v: string) => (v ? new Date(v).toISOString() : null)

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function fromApi<T extends Common>(blank: T, data: any): T {
  const out: any = { ...blank }
  for (const k of Object.keys(blank)) if (data[k] !== undefined && data[k] !== null) out[k] = data[k]
  out.id = data.id
  out.published_at = toLocalInput(data.published_at)
  if (Array.isArray(data.tags)) out.tag_names = data.tags
  out.related_ids = (data.related ?? []).map((r: { id: number }) => r.id)
  out.related_titles = data.related ?? []
  if ('category' in blank) out.category = data.category ?? ''
  return out as T
}

const NULLABLE = ['category', 'product', 'project', 'original_price', 'tax_rate', 'publication_year', 'pages', 'weight_grams', 'download_limit']

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function toApi(form: Common): Record<string, any> {
  const { related_titles: _t, published_at, id: _id, ...rest } = form as Common & Record<string, unknown>
  void _t
  void _id
  const out: Record<string, unknown> = { ...rest, published_at: fromLocalInput(published_at) }
  // optional numeric / relation fields: an empty box means "not set", which the API expects as null
  for (const k of NULLABLE) if (out[k] === '') out[k] = null
  return out
}

export const wordCount = (html: string) => {
  const text = new DOMParser().parseFromString(html || '', 'text/html').body.textContent ?? ''
  return (text.match(/[\p{L}\p{N}'’-]+/gu) ?? []).length
}
export const readingMinutes = (...parts: string[]) => Math.max(1, Math.round(parts.reduce((n, p) => n + wordCount(p), 0) / 200))
export const slugify = (s: string) =>
  s.toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 120)
