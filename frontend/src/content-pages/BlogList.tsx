import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { getBlogCategories, getBlogs, PAGE_SIZE, takeInitial, type Card, type Paged } from './api'
import { CardView, PageFrame, Pager, SearchIcon, useSeo } from './shared'
import { LOGO_URL, SITE_ID } from '../seo/site'
import { SITE_URL } from '../locations/registry'
import type { Seo } from './api'
import './blog.css'
import { HeroVideo } from '../components/HeroVideo'
import { Reveal } from '../components/ui'

type Cats = { name: string; slug: string; blog_count: number }[]
const initial = typeof document === 'undefined' ? null : takeInitial()

/** Canonical-style list URL: no empty parameters and no `page=1`, matching the server-rendered links and canonicals. */
function listHref({ category, q, page = 1 }: { category: string; q: string; page?: number }) {
  const next = new URLSearchParams()
  if (category) next.set('category', category)
  if (q) next.set('q', q)
  if (page > 1) next.set('page', String(page))
  const query = next.toString()
  return query ? `/blog?${query}` : '/blog'
}

/** Mirrors listing_seo() in backend/apps/content/ssr.py so in-app filter and page changes keep the head consistent. */
function listSeo(category: string, topic: string, q: string, page: number, count: number | null): Seo {
  const suffix = page > 1 ? `, page ${page}` : ''
  const title = topic ? `${topic} Articles${suffix} | Coding Hubs Blog` : `AI & Coding Blog${suffix} | Coding Hubs School of AI`
  const description = topic
    ? `${topic} guides, tutorials and career advice from Coding Hubs School of AI, Delhi.`
    : 'Guides, tutorials and career advice on AI, programming and data from the team at Coding Hubs School of AI, Delhi.'
  const canonical = SITE_URL + listHref({ category, q: '', page })
  const indexable = !q && count !== 0
  return {
    title,
    description,
    canonical,
    robots: indexable ? 'index, follow, max-image-preview:large' : 'noindex, follow',
    og: { type: 'website', title, description, image: LOGO_URL, url: canonical },
    json_ld: {
      '@context': 'https://schema.org',
      '@graph': [{ '@type': 'CollectionPage', '@id': `${canonical}#webpage`, url: canonical, name: title, description, inLanguage: 'en-IN', isPartOf: { '@id': SITE_ID } }],
    },
  }
}

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
      setParams(next, { replace: true })
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

  const topic = cats.find((c) => c.slug === category)?.name ?? ''
  const seo = useMemo(() => (category && !topic ? null : listSeo(category, topic, q, page, data ? data.count : null)), [category, topic, q, page, data])
  useSeo(seo)
  const featured = useMemo(() => (page === 1 && !category && !q ? data?.results.find((c) => c.is_featured) : undefined), [data, page, category, q])
  const rest = data?.results.filter((c) => c !== featured) ?? []

  return (
    <PageFrame wide>
      <section className="bl-hero hv-host"><HeroVideo clip="blog" />
        <span className="bl-blob b1" aria-hidden="true" />
        <span className="bl-blob b2" aria-hidden="true" />
        <span className="bl-grid-bg" aria-hidden="true" />
        <div className="bl-hero-in">
          <p className="bl-eyebrow">Learn · Blog</p>
          <h1>
            {topic ? (
              <>
                {topic} <span>Articles</span>
              </>
            ) : (
              <>
                AI &amp; Coding <span>Blog</span>
              </>
            )}
          </h1>
          <p className="bl-lead">Guides, tutorials and career advice on AI, programming and data from Coding Hubs School of AI.</p>
          <label className="bl-search">
            <span className="sr-only">Search articles</span>
            <SearchIcon />
            <input type="search" placeholder="Search articles" value={text} onChange={(e) => setText(e.target.value)} />
            {text && (
              <button type="button" className="bl-clear" aria-label="Clear search" onClick={() => setText('')}>
                ×
              </button>
            )}
          </label>
          {data && (
            <ul className="bl-stats">
              <li><strong>{data.count}</strong><span>{q || category ? 'Matching' : 'Articles'}</span></li>
              <li><strong>{cats.length}</strong><span>Categories</span></li>
            </ul>
          )}
        </div>
      </section>

      {cats.length > 0 && (
        <nav className="bl-chips" aria-label="Blog categories">
          <Link to={listHref({ category: '', q })} className={!category ? 'on' : ''} aria-current={!category ? 'page' : undefined}>
            All
          </Link>
          {cats.map((c) => (
            <Link key={c.slug} to={listHref({ category: c.slug, q })} className={category === c.slug ? 'on' : ''} aria-current={category === c.slug ? 'page' : undefined}>
              {c.name} <span>({c.blog_count})</span>
            </Link>
          ))}
        </nav>
      )}

      {error && <p className="bl-state" role="alert">We could not load the articles. Please refresh the page.</p>}
      {!data && !error && (
        <div className="bl-grid" role="status" aria-label="Loading articles">
          {[0, 1, 2].map((i) => (<div key={i} className="bl-skel" />))}
        </div>
      )}
      {data && data.count === 0 && <p className="bl-state">{q || category ? 'No articles match your search.' : 'No articles published yet. Check back soon.'}</p>}

      {featured && (
        <div className="bl-featured">
          <CardView c={featured} base="/blog" />
        </div>
      )}
      <Reveal stagger className="bl-grid" key={`${page}-${category}-${q}`}>
        {rest.map((c, i) => (
          <CardView key={c.slug} c={c} base="/blog" index={i} />
        ))}
      </Reveal>
      {data && <Pager page={page} count={data.count} size={PAGE_SIZE} onPage={(p) => go({ page: p > 1 ? String(p) : null })} hrefFor={(p) => listHref({ category, q, page: p })} />}
    </PageFrame>
  )
}
