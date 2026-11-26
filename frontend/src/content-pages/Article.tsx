import { useEffect, useState } from 'react'
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom'
import { NotFound } from '../pages/NotFound'
import { fmtDate, getBlog, getCase, recordView, takeInitial, type Article } from './api'
import { CardView, InsightCard, InsMeta, PageFrame, useSeo } from './shared'
import { ArticleToc } from './ArticleToc'
import './blog.css'
import { HeroVideo } from '../components/HeroVideo'

const initial = typeof document === 'undefined' ? null : takeInitial()

type Kind = 'blog' | 'case'

function useArticle(kind: Kind) {
  const { slug = '' } = useParams<{ slug: string }>()
  const { search } = useLocation()
  const preview = new URLSearchParams(search).get('preview') ?? undefined
  const navigate = useNavigate()
  const seeded = initial && initial.kind === kind && initial.slug === slug ? initial.article : undefined
  const [article, setArticle] = useState<Article | null>(seeded ?? null)
  const [missing, setMissing] = useState(false)

  useEffect(() => {
    if (seeded && article === seeded) return
    let live = true
    setMissing(false)
    ;(kind === 'blog' ? getBlog : getCase)(slug, preview)
      .then((a) => {
        if (!live) return
        setArticle(a)
        window.scrollTo(0, 0)
        if (a.slug !== slug) navigate(`/${kind === 'blog' ? 'blog' : 'case-studies'}/${a.slug}`, { replace: true })
      })
      .catch(() => live && setMissing(true))
    return () => {
      live = false
    }
  }, [slug, preview]) // eslint-disable-line react-hooks/exhaustive-deps

  const viewedSlug = article && !preview ? article.slug : ''
  useEffect(() => {
    if (!viewedSlug) return
    let live = true
    // Show the visitor's own view in the count once the server has recorded it.
    recordView(kind, viewedSlug).then((counted) => {
      if (counted && live) setArticle((a) => (a && a.slug === viewedSlug ? { ...a, view_count: (a.view_count ?? 0) + 1 } : a))
    })
    return () => {
      live = false
    }
  }, [kind, viewedSlug])

  useSeo(article?.seo ?? null)
  return { article, missing }
}

function Share({ title, url }: { title: string; url: string }) {
  const u = encodeURIComponent(url)
  const t = encodeURIComponent(title)
  return (
    <p className="bl-share">
      Share:{' '}
      <a href={`https://www.linkedin.com/sharing/share-offsite/?url=${u}`} target="_blank" rel="noopener noreferrer">LinkedIn</a>
      {' · '}
      <a href={`https://twitter.com/intent/tweet?url=${u}&text=${t}`} target="_blank" rel="noopener noreferrer">X</a>
      {' · '}
      <a href={`https://wa.me/?text=${t}%20${u}`} target="_blank" rel="noopener noreferrer">WhatsApp</a>
    </p>
  )
}

/** Thin bar at the top of the window that fills while the article is read. */
function ReadProgress() {
  const [pct, setPct] = useState(0)
  useEffect(() => {
    const onScroll = () => {
      const max = document.documentElement.scrollHeight - window.innerHeight
      setPct(max > 0 ? Math.min(100, (window.scrollY / max) * 100) : 0)
    }
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])
  return <div className="bl-progress" role="presentation"><span style={{ width: `${pct}%` }} /></div>
}

/** "Updated" is shown, like on the server-rendered page, only when a post changed at least a day after publishing. */
function updatedLabel(a: Article): { iso: string; text: string } | undefined {
  if (!a.updated_at || !a.published_at) return undefined
  const updated = new Date(a.updated_at), published = new Date(a.published_at)
  return updated.getTime() - published.getTime() >= 86_400_000 ? { iso: a.updated_at, text: fmtDate(a.updated_at) } : undefined
}

export function BlogDetail() {
  const { article: a, missing } = useArticle('blog')
  if (missing) return <NotFound />
  if (!a) return <PageFrame insight><p className="ins-state" role="status">Loading…</p></PageFrame>
  return (
    <PageFrame reading insight>
      <ReadProgress />
      <article className="ins-article">
        <header className="ins-art-hero">
          <div className="ins-art-hero-in">
            {a.preview && <p className="bl-preview" role="status">Preview. This page is not public.</p>}
            {a.category && (
              <p className="ins-art-cat">
                <Link to={`/blog?category=${a.category.slug}`}>{a.category.name}</Link>
              </p>
            )}
            <h1>{a.title}</h1>
            <InsMeta c={a} author long updated={updatedLabel(a)} />
          </div>
        </header>
        {a.featured_image && (
          <figure className="ins-art-cover">
            <img src={a.featured_image} alt={a.featured_image_alt} width={1200} height={630} decoding="async" fetchPriority="high" />
            {a.featured_image_caption && <figcaption>{a.featured_image_caption}</figcaption>}
          </figure>
        )}
        <div className="ins-art-body">
          {a.toc.length > 2 && (
            <details className="ins-toc">
              <summary>Table of contents</summary>
              <ArticleToc items={a.toc} />
            </details>
          )}
          {/* content_html is sanitised on the server (allowlist) when saved and again when served */}
          <div className="bl-body ins-prose" dangerouslySetInnerHTML={{ __html: a.content_html ?? '' }} />
          {a.gallery && a.gallery.length > 0 && (
            <section className="bl-gallery" aria-label="Article gallery">
              {a.gallery.map((g, idx) => (
                <figure key={`${g.src}-${idx}`}>
                  <img src={g.src} alt={g.alt || a.title} loading="lazy" decoding="async" />
                  {g.alt && <figcaption>{g.alt}</figcaption>}
                </figure>
              ))}
            </section>
          )}
          {a.faq && a.faq.length > 0 && (
            <section className="ins-faq">
              <h2>Frequently Asked Questions</h2>
              {a.faq.map((f) => (
                <details key={f.q}>
                  <summary>{f.q}</summary>
                  <div dangerouslySetInnerHTML={{ __html: f.a }} />
                </details>
              ))}
            </section>
          )}
          <Share title={a.title} url={a.seo.canonical} />
        </div>
        {a.related.length > 0 && (
          <section className="ins-related" aria-labelledby="ins-related-title">
            <h2 id="ins-related-title">Related Articles</h2>
            <div className="ins-grid">
              {a.related.map((r) => (
                <InsightCard key={r.slug} c={r} />
              ))}
            </div>
          </section>
        )}
      </article>
    </PageFrame>
  )
}

export function CaseDetail() {
  const { article: a, missing } = useArticle('case')
  if (missing) return <NotFound />
  if (!a) return <PageFrame><p className="bl-state" role="status">Loading…</p></PageFrame>
  return (
    <PageFrame>
      <ReadProgress />
      <article className="bl-article">
        {a.preview && <p className="bl-preview" role="status">Preview. This page is not public.</p>}
        <header className="bl-head hv-host"><HeroVideo clip="our-work" />
          {a.industry && <p className="bl-cat">{a.industry}</p>}
          <h1>{a.title}</h1>
          <p className="bl-meta">
            {a.client ? `${a.client} · ` : ''}
            {a.duration ? `${a.duration} · ` : ''}
            {fmtDate(a.published_at)}
          </p>
        </header>
        {a.featured_image && <img className="bl-cover" src={a.featured_image} alt={a.featured_image_alt} width={1200} height={630} decoding="async" />}
        {a.metrics && a.metrics.length > 0 && (
          <ul className="bl-metrics">
            {a.metrics.map((m) => (
              <li key={m.label}>
                <strong>{m.value}</strong> {m.label}
                {m.note && <small>{m.note}</small>}
              </li>
            ))}
          </ul>
        )}
        {a.sections?.map((s) => (
          <section key={s.key} id={s.key} className="bl-body">
            <h2>{s.title}</h2>
            <div dangerouslySetInnerHTML={{ __html: s.html }} />
          </section>
        ))}
        {a.technologies && a.technologies.length > 0 && (
          <section id="tech">
            <h2>Technology stack</h2>
            <ul className="bl-tags">
              {a.technologies.map((t) => (
                <li key={t}>{t}</li>
              ))}
            </ul>
          </section>
        )}
        {a.gallery && a.gallery.length > 0 && (
          <section className="bl-gallery">
            {a.gallery.map((g) => (
              <img key={g.src} src={g.src} alt={g.alt} loading="lazy" decoding="async" />
            ))}
          </section>
        )}
        {a.related_services && a.related_services.length > 0 && (
          <section>
            <h2>Related services</h2>
            <ul>
              {a.related_services.map((s) => (
                <li key={s.url}>
                  <a href={s.url}>{s.label}</a>
                </li>
              ))}
            </ul>
          </section>
        )}
        {a.related.length > 0 && (
          <section className="bl-related">
            <h2>More case studies</h2>
            <div className="bl-grid">
              {a.related.map((r) => (
                <CardView key={r.slug} c={r} base="/case-studies" />
              ))}
            </div>
          </section>
        )}
      </article>
    </PageFrame>
  )
}
