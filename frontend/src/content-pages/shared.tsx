import { useEffect, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { FS_CSS } from '../lib/fs-css'
import { useScopedStylesheet } from '../hooks/useScopedStylesheet'
import { FsFooter, FsHeader } from '../locations/FsShell'
import { StoreHeader } from '../shop-pages/StoreHeader'
import { fmtDate, type Card, type Seo } from './api'

export function SearchIcon() {
  return (
    <svg className="ico" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.5-3.5" />
    </svg>
  )
}

export function PageFrame({ children, wide = false, store = false }: { children: ReactNode; wide?: boolean; store?: boolean }) {
  useScopedStylesheet([FS_CSS, 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&family=Poppins:wght@600;700;800&display=swap'])
  return (
    <div className="fs-page">
      {store ? <StoreHeader /> : <FsHeader />}
      <main id="main" className={`wrap bl-main${wide ? ' bl-wide-main' : ''}`}>
        {children}
      </main>
      <FsFooter />
    </div>
  )
}

export function CardView({ c, base, index = 0 }: { c: Card; base: string; index?: number }) {
  const tag = c.category?.name ?? c.industry
  return (
    <article className="bl-card bl-in" style={{ ['--i' as string]: Math.min(index, 8) }}>
      {c.featured_image && (
        <Link to={`${base}/${c.slug}`} className="bl-card-img" tabIndex={-1} aria-hidden="true">
          <img src={c.featured_image} alt={c.featured_image_alt} loading="lazy" decoding="async" width={640} height={360} />
        </Link>
      )}
      <div className="bl-card-body">
        {tag && <p className="bl-cat">{tag}</p>}
        <h2>
          <Link to={`${base}/${c.slug}`}>{c.title}</Link>
        </h2>
        <p>{c.excerpt || c.summary}</p>
        {c.highlights && c.highlights.length > 0 && (
          <ul className="bl-highlights">
            {c.highlights.map((h) => (
              <li key={h.label}>
                <strong>{h.value}</strong> {h.label}
              </li>
            ))}
          </ul>
        )}
        <p className="bl-meta">
          {c.author_name ? `${c.author_name} · ` : ''}
          {fmtDate(c.published_at)}
          {c.reading_time ? ` · ${c.reading_time} min read` : ''}
        </p>
        <Link to={`${base}/${c.slug}`} className="bl-more" aria-label={`Read ${c.title}`}>
          Read more <span aria-hidden="true">→</span>
        </Link>
      </div>
    </article>
  )
}

export function Pager({ page, count, size, onPage }: { page: number; count: number; size: number; onPage: (p: number) => void }) {
  const pages = Math.max(1, Math.ceil(count / size))
  if (pages <= 1) return null
  return (
    <nav className="bl-pager" aria-label="Pagination">
      <button type="button" disabled={page <= 1} onClick={() => onPage(page - 1)}>
        Previous
      </button>
      <span>
        Page {page} of {pages}
      </span>
      <button type="button" disabled={page >= pages} onClick={() => onPage(page + 1)}>
        Next
      </button>
    </nav>
  )
}

/** Keeps <head> right on client-side navigation (a direct visit already has it from the server). Restores on leave. */
export function useSeo(seo: Seo | null) {
  useEffect(() => {
    if (!seo) return
    const prevTitle = document.title
    const restore: (() => void)[] = []
    document.title = seo.title
    const set = (selector: string, make: () => HTMLElement, attr: string, value: string) => {
      let el = document.head.querySelector<HTMLElement>(selector)
      const created = !el
      if (!el) {
        el = make()
        document.head.appendChild(el)
      }
      const old = el.getAttribute(attr)
      el.setAttribute(attr, value)
      restore.push(() => (created ? el!.remove() : old === null ? el!.removeAttribute(attr) : el!.setAttribute(attr, old)))
    }
    const metaTag = (key: 'name' | 'property', name: string, value: string) => {
      set(
        `meta[${key}="${name}"]`,
        () => {
          const m = document.createElement('meta')
          m.setAttribute(key, name)
          return m
        },
        'content',
        value,
      )
    }
    metaTag('name', 'description', seo.description)
    metaTag('name', 'robots', seo.robots)
    metaTag('property', 'og:title', seo.og.title)
    metaTag('property', 'og:description', seo.og.description)
    metaTag('property', 'og:image', seo.og.image)
    metaTag('property', 'og:url', seo.og.url)
    metaTag('property', 'og:type', seo.og.type)
    if (seo.robots.startsWith('index')) {
      set('link[rel="canonical"]', () => Object.assign(document.createElement('link'), { rel: 'canonical' }), 'href', seo.canonical)
    }
    const ld = document.createElement('script')
    ld.type = 'application/ld+json'
    ld.dataset.managed = '1'
    ld.textContent = JSON.stringify(seo.json_ld).replace(/</g, '\\u003c')
    document.head.querySelectorAll('script[type="application/ld+json"]').forEach((s) => s.remove())
    document.head.appendChild(ld)
    return () => {
      document.title = prevTitle
      restore.forEach((r) => r())
      ld.remove()
    }
  }, [seo])
}
