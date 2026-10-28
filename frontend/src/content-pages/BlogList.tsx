import { useEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { getBlogCategories, getBlogs, PAGE_SIZE, takeInitial, type Card, type Paged } from './api'
import { CardView, PageFrame, Pager, SearchIcon } from './shared'

type Cats = { name: string; slug: string; blog_count: number }[]
const initial = typeof document === 'undefined' ? null : takeInitial()

export function BlogList() {
  const [params, setParams] = useSearchParams()
  const page = Math.max(1, Number(params.get('page')) || 1)
  const category = params.get('category') ?? ''
  const q = params.get('q') ?? ''
  const seed = useRef(initial?.kind === 'blog-list' ? initial : null)
  const [data, setData] = useState<Paged<Card> | null>(seed.current ? { count: seed.current.count ?? 0, results: seed.current.results ?? [] } : null)
  const [cats, setCats] = useState<Cats>(seed.current?.categories ?? [])
  const [error, setError] = useState(false)
  const [text, setText] = useState(q)

  useEffect(() => {
    document.title = 'AI & Coding Blog | Coding Hubs School of AI'
    window.scrollTo(0, 0)
  }, [])

  useEffect(() => {
    if (!cats.length) getBlogCategories().then(setCats).catch(() => undefined)
  }, [cats.length])

  useEffect(() => {
    const s = seed.current
    if (s && s.page === page && (s.category ?? '') === category && (s.q ?? '') === q) {
      seed.current = null // server data matches this exact view; use it once
      return
    }
    let live = true
    setError(false)
    getBlogs({ page, page_size: PAGE_SIZE, ...(category ? { category } : {}), ...(q ? { q } : {}) })
      .then((d) => live && setData(d))
      .catch(() => live && setError(true))
    return () => {
      live = false
    }
  }, [page, category, q])

  // debounced search
  useEffect(() => {
    if (text === q) return
    const t = setTimeout(() => {
      const next = new URLSearchParams(params)
      if (text) next.set('q', text)
      else next.delete('q')
      next.delete('page')
      setParams(next)
    }, 350)
    return () => clearTimeout(t)
  }, [text]) // eslint-disable-line react-hooks/exhaustive-deps

  const go = (patch: Record<string, string | null>) => {
    const next = new URLSearchParams(params)
    for (const [k, v] of Object.entries(patch)) {
      if (v) next.set(k, v)
      else next.delete(k)
    }
    if (!('page' in patch)) next.delete('page')
    setParams(next)
  }

  const featured = useMemo(() => (page === 1 && !category && !q ? data?.results.find((c) => c.is_featured) : undefined), [data, page, category, q])
  const rest = data?.results.filter((c) => c !== featured) ?? []

  return (
    <PageFrame>
      <h1>AI &amp; Coding Blog</h1>
      <p className="bl-lead">Guides, tutorials and career advice on AI, programming and data from Coding Hubs School of AI.</p>

      <div className="bl-tools">
        <label className="bl-search">
          <span className="sr-only">Search articles</span>
          <SearchIcon />
          <input type="search" placeholder="Search articles" value={text} onChange={(e) => setText(e.target.value)} />
        </label>
        {cats.length > 0 && (
          <div className="bl-chips" role="group" aria-label="Categories">
            <button type="button" className={!category ? 'on' : ''} aria-pressed={!category} onClick={() => go({ category: null })}>
              All
            </button>
            {cats.map((c) => (
              <button key={c.slug} type="button" className={category === c.slug ? 'on' : ''} aria-pressed={category === c.slug} onClick={() => go({ category: c.slug })}>
                {c.name} <span>({c.blog_count})</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {error && <p className="bl-state" role="alert">We could not load the articles. Please refresh the page.</p>}
      {!data && !error && <p className="bl-state" role="status">Loading articles…</p>}
      {data && data.count === 0 && <p className="bl-state">{q || category ? 'No articles match your search.' : 'No articles published yet. Check back soon.'}</p>}

      {featured && (
        <div className="bl-featured">
          <CardView c={featured} base="/blog" />
        </div>
      )}
      <div className="bl-grid">
        {rest.map((c) => (
          <CardView key={c.slug} c={c} base="/blog" />
        ))}
      </div>
      {data && <Pager page={page} count={data.count} size={PAGE_SIZE} onPage={(p) => go({ page: p > 1 ? String(p) : null })} />}
    </PageFrame>
  )
}
