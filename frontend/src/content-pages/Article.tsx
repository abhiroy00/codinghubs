import { useEffect, useState } from 'react'
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom'
import { NotFound } from '../pages/NotFound'
import { fmtDate, getBlog, getCase, takeInitial, type Article } from './api'
import { CardView, PageFrame, useSeo } from './shared'
import './blog.css'

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

  useSeo(article?.seo ?? null)
  return { article, missing }
}

function Cta({ kind }: { kind: Kind }) {
  return (
    <aside className="bl-cta">
      <h2>{kind === 'blog' ? 'Learn AI hands-on' : 'Talk to us about your project'}</h2>
      <p>{kind === 'blog' ? 'Join the free 2-hour live online demo session and see how we teach.' : 'Tell us your goal and a counsellor will get in touch.'}</p>
      <a className="btn btn-yellow" href={kind === 'blog' ? '/#register' : '/#contact'}>
        {kind === 'blog' ? 'Register for free' : 'Get in touch'}
      </a>
    </aside>
  )
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

export function BlogDetail() {
  const { article: a, missing } = useArticle('blog')
  if (missing) return <NotFound />
  if (!a) return <PageFrame><p className="bl-state" role="status">Loading…</p></PageFrame>
  return (
    <PageFrame>
      <ReadProgress />
      <article className="bl-article">
        {a.preview && <p className="bl-preview" role="status">Preview. This page is not public.</p>}
        <header className="bl-head">
          {a.category && (
            <p className="bl-cat">
              <Link to={`/blog?category=${a.category.slug}`}>{a.category.name}</Link>
            </p>
          )}
          <h1>{a.title}</h1>
          <p className="bl-meta">
            {a.author_name ? `By ${a.author_name}${a.author_title ? `, ${a.author_title}` : ''} · ` : ''}
            {fmtDate(a.published_at)} · {a.reading_time} min read
            {a.updated_at && new Date(a.updated_at).getTime() - new Date(a.published_at).getTime() > 86400000 ? ` · Updated ${fmtDate(a.updated_at)}` : ''}
          </p>
        </header>
        {a.featured_image && <img className="bl-cover" src={a.featured_image} alt={a.featured_image_alt} width={1200} height={630} decoding="async" />}
        {a.toc.length > 0 && (
          <nav className="bl-toc" aria-label="Table of contents">
            <h2>Contents</h2>
            <ol>
              {a.toc.map((t) => (
                <li key={t.id} className={`l${t.level}`}>
                  <a href={`#${t.id}`}>{t.text}</a>
                </li>
              ))}
            </ol>
          </nav>
        )}
        {/* content_html is sanitised on the server (allowlist) when saved and again when served */}
        <div className="bl-body" dangerouslySetInnerHTML={{ __html: a.content_html ?? '' }} />
        {a.faq && a.faq.length > 0 && (
          <section className="bl-faq">
            <h2>Frequently asked questions</h2>
            {a.faq.map((f) => (
              <div key={f.q}>
                <h3>{f.q}</h3>
                <div dangerouslySetInnerHTML={{ __html: f.a }} />
              </div>
            ))}
          </section>
        )}
        <Share title={a.title} url={a.seo.canonical} />
        <Cta kind="blog" />
        {a.related.length > 0 && (
          <section className="bl-related">
            <h2>Related articles</h2>
            <div className="bl-grid">
              {a.related.map((r) => (
                <CardView key={r.slug} c={r} base="/blog" />
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
        <header className="bl-head">
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
        <Cta kind="case" />
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
