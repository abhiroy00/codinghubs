import { type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { FS_CSS } from '../lib/fs-css'
import { useScopedStylesheet } from '../hooks/useScopedStylesheet'
import { FsHeader } from '../locations/FsShell'
import { SiteFooter } from '../components/SiteFooter'
import { fmtDate, type Card } from './api'
import { AnimatedCard } from '../components/ui'

export function SearchIcon() {
  return (
    <svg className="ico" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.5-3.5" />
    </svg>
  )
}

export function PageFrame({ children, wide = false, reading = false }: { children: ReactNode; wide?: boolean; reading?: boolean }) {
  useScopedStylesheet([FS_CSS])
  return (
    <div className={`fs-page${reading ? ' bl-reading-page' : ''}`}>
      <FsHeader />
      <main id="main" className={reading ? 'bl-main bl-reading-main' : `wrap bl-main${wide ? ' bl-wide-main' : ''}`}>
        {children}
      </main>
      <SiteFooter />
    </div>
  )
}

export function CardView({ c, base, index = 0 }: { c: Card; base: string; index?: number }) {
  const tag = c.category?.name ?? c.industry
  return (
    <AnimatedCard bare className="bl-card" data-index={index}>
      {c.featured_image && (
        <Link to={`${base}/${c.slug}`} className="bl-card-img ui-zoom" tabIndex={-1} aria-hidden="true">
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
    </AnimatedCard>
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

export { useSeo } from '../seo/useSeo'
