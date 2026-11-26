import { type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { FS_CSS } from '../lib/fs-css'
import { useScopedStylesheet } from '../hooks/useScopedStylesheet'
import { FsHeader } from '../locations/FsShell'
import { SiteFooter } from '../components/SiteFooter'
import { fmtDate, type Card } from './api'
import { AnimatedCard } from '../components/ui'
import { useRegisterPopup } from '../lib/register-popup'
import { CAMPUSES } from '../locations/registry'

export function SearchIcon() {
  return (
    <svg className="ico" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.5-3.5" />
    </svg>
  )
}

export function PageFrame({ children, wide = false, reading = false, insight = false }: { children: ReactNode; wide?: boolean; reading?: boolean; insight?: boolean }) {
  useScopedStylesheet([FS_CSS])
  return (
    <div className={`fs-page${reading ? ' bl-reading-page' : ''}${insight ? ' ins-page' : ''}`}>
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
          {(c.view_count ?? 0) > 0 ? ` · ${c.view_count!.toLocaleString('en-IN')} ${c.view_count === 1 ? 'view' : 'views'}` : ''}
        </p>
        <Link to={`${base}/${c.slug}`} className="bl-more" aria-label={`Read ${c.title}`}>
          Read more <span aria-hidden="true">→</span>
        </Link>
      </div>
    </AnimatedCard>
  )
}

export function Pager({ page, count, size, onPage, hrefFor }: { page: number; count: number; size: number; onPage: (p: number) => void; hrefFor?: (p: number) => string }) {
  const pages = Math.max(1, Math.ceil(count / size))
  if (pages <= 1) return null
  // With hrefFor, neighbouring pages are real links, so crawlers that render the page can still reach every listed item.
  const step = (target: number, label: string, rel: 'prev' | 'next', enabled: boolean) =>
    enabled && hrefFor ? (
      <Link to={hrefFor(target)} rel={rel}>
        {label}
      </Link>
    ) : (
      <button type="button" disabled={!enabled} onClick={() => onPage(target)}>
        {label}
      </button>
    )
  return (
    <nav className="bl-pager" aria-label="Pagination">
      {step(page - 1, 'Previous', 'prev', page > 1)}
      <span>
        Page {page} of {pages}
      </span>
      {step(page + 1, 'Next', 'next', page < pages)}
    </nav>
  )
}

/* ---------- Insights (blog) UI: light hero, cards with category badge, icon meta, numbered pager ---------- */

const ICON_PATHS = {
  user: 'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm-7 8a7 7 0 0 1 14 0',
  calendar: 'M7 3v3m10-3v3M4 9h16M5 5h14a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1Z',
  clock: 'M12 7v5l3 2m6-2a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z',
  eye: 'M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12Zm10 3a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z',
  left: 'M15 6l-6 6 6 6',
  right: 'M9 6l6 6-6 6',
  arrow: 'M5 12h14m-6-6 6 6-6 6',
  back: 'M19 12H5m6-6-6 6 6 6',
} as const

export function InsIcon({ name }: { name: keyof typeof ICON_PATHS }) {
  return (
    <svg className="ins-ico" viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={ICON_PATHS[name]} />
    </svg>
  )
}

const views = (n?: number) => ((n ?? 0) > 0 ? n!.toLocaleString('en-IN') : '')

export function InsMeta({ c, author = false, long = false, updated }: { c: Card; author?: boolean; long?: boolean; updated?: { iso: string; text: string } }) {
  return (
    <p className="ins-meta">
      {author && c.author_name && <span><InsIcon name="user" />{c.author_name}</span>}
      {c.published_at && <span><InsIcon name="calendar" /><time dateTime={c.published_at}>{fmtDate(c.published_at)}</time></span>}
      {updated && <span>Updated <time dateTime={updated.iso}>{updated.text}</time></span>}
      {!!c.reading_time && <span><InsIcon name="clock" />{c.reading_time} {long ? 'min read' : 'min'}</span>}
      {views(c.view_count) && <span><InsIcon name="eye" />{views(c.view_count)}{long ? (c.view_count === 1 ? ' view' : ' views') : ''}</span>}
    </p>
  )
}

/** Blog card: image with category badge, date / minutes / views, title, excerpt and "Read More". */
export function InsightCard({ c, base = '/blog', heading: H = 'h3' }: { c: Card; base?: string; heading?: 'h2' | 'h3' }) {
  const href = `${base}/${c.slug}`
  return (
    <article className="ins-card">
      <Link to={href} className="ins-card-img" tabIndex={-1} aria-hidden="true">
        {c.featured_image ? <img src={c.featured_image} alt={c.featured_image_alt} loading="lazy" decoding="async" width={640} height={336} /> : <span className="ins-card-ph" />}
        {c.category && <span className="ins-badge">{c.category.name}</span>}
      </Link>
      <div className="ins-card-body">
        <InsMeta c={c} />
        <H className="ins-card-title"><Link to={href}>{c.title}</Link></H>
        {c.excerpt && <p className="ins-excerpt">{c.excerpt}</p>}
        <Link to={href} className="ins-more" aria-label={`Read more: ${c.title}`}>Read More <InsIcon name="arrow" /></Link>
      </div>
    </article>
  )
}

/** Large first card: image left, details right, "Read Full Article" button. */
export function FeaturedInsight({ c }: { c: Card }) {
  const href = `/blog/${c.slug}`
  return (
    <article className="ins-featured">
      <Link to={href} className="ins-featured-img" tabIndex={-1} aria-hidden="true">
        {c.featured_image ? <img src={c.featured_image} alt={c.featured_image_alt} decoding="async" width={1200} height={630} fetchPriority="high" /> : <span className="ins-card-ph" />}
        <span className="ins-badge ins-badge-solid">Featured Article</span>
      </Link>
      <div className="ins-featured-body">
        {c.category && <Link to={`/blog?category=${c.category.slug}`} className="ins-pill-outline">{c.category.name}</Link>}
        <h2><Link to={href}>{c.title}</Link></h2>
        <InsMeta c={c} author long />
        {c.excerpt && <p className="ins-excerpt">{c.excerpt}</p>}
        <Link to={href} className="ins-btn">Read Full Article <InsIcon name="arrow" /></Link>
      </div>
    </article>
  )
}

/** Numbered pagination with previous/next arrows; links are real URLs for crawlers. */
export function NumberPager({ page, count, size, hrefFor }: { page: number; count: number; size: number; hrefFor: (p: number) => string }) {
  const pages = Math.max(1, Math.ceil(count / size))
  if (pages <= 1) return null
  return (
    <nav className="ins-pager" aria-label="Pagination">
      {page > 1 && <Link to={hrefFor(page - 1)} rel="prev" aria-label="Previous page"><InsIcon name="left" /></Link>}
      {Array.from({ length: pages }, (_, i) => i + 1).map((p) => (
        <Link key={p} to={hrefFor(p)} className={p === page ? 'on' : ''} aria-current={p === page ? 'page' : undefined} aria-label={`Page ${p}`}>{p}</Link>
      ))}
      {page < pages && <Link to={hrefFor(page + 1)} rel="next" aria-label="Next page"><InsIcon name="right" /></Link>}
    </nav>
  )
}

/* ---------- Hub layout (blog, case studies): compact header, cards, sidebar with search, filters and next steps ---------- */

const HUB_LINKS = [
  { to: '/courses/', label: 'All courses' },
  { to: '/brochures/', label: 'Course brochures' },
  { to: '/blog', label: 'Blog' },
  { to: '/case-studies', label: 'Case studies' },
  { to: '/locations/', label: 'Locations' },
  { to: '/certificates/', label: 'Certificates' },
] as const

/** Sidebar box: related hubs, the two Delhi classrooms and the free demo. Markup mirrors content/_hub_plan.html. */
export function HubPlan({ current }: { current: string }) {
  const popup = useRegisterPopup()
  return (
    <aside className="hub-plan" aria-labelledby="hub-plan-title">
      <h2 id="hub-plan-title">Plan your course</h2>
      <ul className="hub-links">
        {HUB_LINKS.filter((l) => l.to !== current).map((l) => <li key={l.to}><Link to={l.to}>{l.label}<InsIcon name="right" /></Link></li>)}
      </ul>
      <div className="hub-campus">
        <h3>Our classroom in Delhi</h3>
        {CAMPUSES.map((c) => <p key={c.name}><b>{c.name}</b> · {c.role}<br /><span>{c.address}</span></p>)}
        <p><b>Live online</b> · <span>for learners anywhere in India</span></p>
      </div>
      <button type="button" className="hub-demo" onClick={() => popup.open()}>Book a free demo</button>
    </aside>
  )
}

/** Search box used in the hub sidebar; submits as a normal GET form when scripts are off. */
export function HubSearch({ action, label, value, onChange }: { action: string; label: string; value: string; onChange: (v: string) => void }) {
  return (
    <form className="hub-search" role="search" action={action} method="get" onSubmit={(e) => e.preventDefault()}>
      <label htmlFor="hub-q">{label}</label>
      <div>
        <input id="hub-q" type="search" name="q" placeholder="Search keyword" value={value} onChange={(e) => onChange(e.target.value)} />
        <SearchIcon />
      </div>
    </form>
  )
}

export { useSeo } from '../seo/useSeo'

