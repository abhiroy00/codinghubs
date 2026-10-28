import { useEffect, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { NotFound } from '../pages/NotFound'
import { PageFrame, Pager, SearchIcon } from '../content-pages/shared'
import { CodeEnhancedHtml, FileList, Html, useDetail } from './catalog'
import { Arrow, Clock, Cover, cap } from './projects'
import { get, initial, rupees, type Card, type Paged } from './api'
import './projects.css'
import './shopui.css'

/* eslint-disable @typescript-eslint/no-explicit-any */
const PAGE = 9
const ACCESS: Record<string, string> = { free: 'Free', account: 'Free with account', paid: 'Paid', included: 'Included' }

function accessLabel(c: Card) {
  if (c.access_type === 'paid') return c.price ? rupees(c.price) : 'Paid'
  return ACCESS[c.access_type ?? 'free'] ?? 'Free'
}

export function GuideCard({ c, i = 0, featured = false }: { c: Card; i?: number; featured?: boolean }) {
  const project = (c as any).project as { title: string; slug: string } | null
  return (
    <article className={`pj-card${featured ? ' pj-card-feat' : ''}`} style={{ ['--i' as string]: i }}>
      <Link to={`/project-guides/${c.slug}`} className="pj-card-media" tabIndex={-1} aria-hidden="true">
        <Cover c={c} />
        <span className={`pj-lvl pj-${c.difficulty}`}>{cap(c.difficulty)}</span>
        <span className={`pj-price${c.access_type === 'paid' ? ' paid' : ''}`}>{accessLabel(c)}</span>
      </Link>
      <div className="pj-card-body">
        {c.category && typeof c.category === 'string' && <p className="pj-cat">{c.category}</p>}
        <h2><Link to={`/project-guides/${c.slug}`}>{c.title}</Link></h2>
        <p className="pj-sum">{c.summary}</p>
        {project && <p className="gd-for">For project: <span>{project.title}</span></p>}
        {(c.technologies ?? []).length > 0 && (
          <ul className="pj-tags">{(c.technologies ?? []).slice(0, 3).map((t) => (<li key={t}>{t}</li>))}</ul>
        )}
        <div className="pj-foot">
          <span className="pj-time"><Clock /> {c.estimated_time || `${c.reading_time ?? 1} min read`}</span>
          <Link to={`/project-guides/${c.slug}`} className="pj-go" aria-label={`Read ${c.title}`}>Read guide <Arrow /></Link>
        </div>
      </div>
    </article>
  )
}

/* ---------------------------------------------------------------- list */
export function GuidesPage() {
  const [params, setParams] = useSearchParams()
  const page = Math.max(1, Number(params.get('page')) || 1)
  const category = params.get('category') ?? ''
  const difficulty = params.get('difficulty') ?? ''
  const access = params.get('access') ?? ''
  const q = params.get('q') ?? ''
  const seedRef = useRef<Record<string, any> | null>(null)
  if (seedRef.current === null) {
    const i = initial()
    seedRef.current = i && i.kind === 'guide-list' ? i : {}
  }
  const seed = seedRef.current
  const [data, setData] = useState<Paged<Card> | null>(seed.results ? { count: seed.count, results: seed.results } : null)
  const [cats, setCats] = useState<string[]>(seed.categories ?? [])
  const [text, setText] = useState(q)
  const [error, setError] = useState(false)
  const [total, setTotal] = useState<number | null>(seed.count ?? null)
  const used = useRef(false)

  useEffect(() => {
    document.title = 'Project Guides | Coding Hubs School of AI'
    window.scrollTo(0, 0)
  }, [])
  useEffect(() => {
    const s = seedRef.current!
    const unfiltered = !category && !difficulty && !access && !q
    if (!used.current && s.results && s.page === page && unfiltered) {
      used.current = true
      return
    }
    used.current = true
    let live = true
    setError(false)
    get<Paged<Card>>('/project-guides/', { page, page_size: PAGE, ...(category ? { category } : {}), ...(difficulty ? { difficulty } : {}), ...(access ? { access } : {}), ...(q ? { q } : {}) })
      .then((d) => { if (live) { setData(d); if (d.categories) setCats(d.categories); if (unfiltered) setTotal(d.count) } })
      .catch(() => live && setError(true))
    return () => { live = false }
  }, [page, category, difficulty, access, q])
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
  const active = [category, difficulty, access, q].filter(Boolean).length
  const reset = () => { setText(''); setParams(new URLSearchParams()) }

  return (
    <PageFrame wide>
      <section className="pj-hero gd-hero">
        <span className="pj-blob b1" aria-hidden="true" /><span className="pj-blob b2" aria-hidden="true" /><span className="pj-grid-bg" aria-hidden="true" />
        <div className="pj-hero-in">
          <p className="pj-eyebrow">Step by step</p>
          <h1>Project guides that take you from <span>idea to working app</span></h1>
          <p className="pj-lead">Follow clear guidance for setup, building, testing and deployment, written by the Coding Hubs team.</p>
          <label className="pj-search">
            <span className="sr-only">Search guides</span><SearchIcon />
            <input type="search" placeholder="Search guides…" value={text} onChange={(e) => setText(e.target.value)} />
          </label>
          <ul className="pj-stats"><li><strong>{total ?? '–'}</strong><span>Guides</span></li><li><strong>{cats.length || '–'}</strong><span>Categories</span></li></ul>
        </div>
      </section>
      <div className="pj-filters">
        {cats.length > 0 && (
          <div className="pj-chips" role="group" aria-label="Category">
            <button type="button" className={!category ? 'on' : ''} aria-pressed={!category} onClick={() => go({ category: null })}>All</button>
            {cats.map((c) => (<button key={c} type="button" className={category === c ? 'on' : ''} aria-pressed={category === c} onClick={() => go({ category: category === c ? null : c })}>{c}</button>))}
          </div>
        )}
        <div className="pj-selects">
          <select aria-label="Level" value={difficulty} onChange={(e) => go({ difficulty: e.target.value || null })}>
            <option value="">Any level</option><option value="beginner">Beginner</option><option value="intermediate">Intermediate</option><option value="advanced">Advanced</option>
          </select>
          <select aria-label="Access" value={access} onChange={(e) => go({ access: e.target.value || null })}>
            <option value="">Any access</option><option value="free">Free</option><option value="account">Free with account</option><option value="paid">Paid</option><option value="included">Included</option>
          </select>
          {active > 0 && <button type="button" className="pj-clear" onClick={reset}>Clear filters ({active})</button>}
        </div>
      </div>
      {error && <p className="bl-state" role="alert">We could not load the guides. Please refresh the page.</p>}
      {!data && !error && <div className="pj-grid" aria-busy="true">{Array.from({ length: 6 }).map((_, i) => (<div key={i} className="pj-skel" />))}</div>}
      {data && data.count === 0 && (
        <div className="pj-empty"><strong>{active ? 'No guide matches these filters.' : 'Guides are coming soon.'}</strong><p>{active ? 'Try removing a filter.' : 'Check back soon.'}</p>{active > 0 && <button type="button" className="btn btn-yellow" onClick={reset}>Clear filters</button>}</div>
      )}
      <div className="pj-grid" key={`${page}-${category}-${difficulty}-${access}-${q}`}>
        {data?.results.map((c, i) => (<GuideCard key={c.slug} c={c} i={i} />))}
      </div>
      {data && <Pager page={page} count={data.count} size={PAGE} onPage={(p) => go({ page: p > 1 ? String(p) : null })} />}
      <section className="pj-cta"><div><h2>Want a project to follow?</h2><p>Browse real projects with features, tech stack and learning outcomes.</p></div><Link className="btn btn-yellow btn-lg" to="/projects">Explore projects</Link></section>
    </PageFrame>
  )
}

/* ---------------------------------------------------------------- detail */
export function GuidePage() {
  const { data: g, missing, slug } = useDetail('guide', '/project-guides')
  if (missing) return <NotFound />
  if (!g) return <PageFrame wide><div className="pj-detail-skel" aria-busy="true" role="status"><span className="sr-only">Loading…</span></div></PageFrame>
  const u = g.unlock
  const sections: any[] = g.sections ?? []
  const toc = [
    g.objectives?.length && { id: 'learn', label: 'What you learn' },
    (g.prerequisites_html || g.required_software?.length) && { id: 'prereq', label: 'Before you start' },
    ...sections.map((s) => ({ id: s.key, label: s.title })),
    g.faq?.length && { id: 'faq', label: 'FAQ' },
    g.files?.length && { id: 'files', label: 'Downloads' },
  ].filter(Boolean) as { id: string; label: string }[]
  const project = g.project as { title: string; slug: string } | null

  return (
    <PageFrame wide>
      <article className="pj-detail">
        {g.preview && <p className="bl-preview" role="status">Preview. This page is not public.</p>}
        <header className="pj-dhero gd-dhero">
          <div className="pj-dhero-bg" aria-hidden="true">{g.featured_image && <img src={g.featured_image} alt="" />}</div>
          <div className="pj-dhero-in">
            <Link to="/project-guides" className="pj-back"><span aria-hidden="true">←</span> All guides</Link>
            <div className="pj-badges">
              <span className={`pj-lvl pj-${g.difficulty}`}>{cap(g.difficulty)}</span>
              {g.category && <span className="pj-pill">{g.category}</span>}
              <span className={`pj-pill ${g.access_type === 'paid' ? 'paid' : 'free'}`}>{accessLabel(g)}</span>
            </div>
            <h1>{g.title}</h1>
            {g.summary && <p className="pj-dlead">{g.summary}</p>}
            <ul className="pj-meta">
              <li><Clock /> {g.estimated_time || `${g.reading_time} min read`}</li>
              {g.author_name && <li>By {g.author_name}{g.author_title ? `, ${g.author_title}` : ''}</li>}
              {project && <li>For <Link to={`/projects/${project.slug}`} className="gd-link">{project.title}</Link></li>}
            </ul>
          </div>
        </header>

        <div className="pj-layout">
          <div className="pj-main">
            {!g.unlocked && u && (
              <aside className="pj-lock gd-lock">
                <div><strong>{u.type === 'account' ? 'Log in to read the full guide' : 'Unlock the full guide'}</strong><p>{u.message}</p>{u.courses?.length > 0 && <p>Included with: {u.courses.map((c: any) => c.name).join(', ')}.</p>}</div>
                <div className="gd-lock-actions">
                  {u.type === 'account' && <Link className="btn btn-yellow" to="/login">Log in or sign up</Link>}
                  {u.product && <Link className="btn btn-yellow" to={`/store/${u.product.slug}`}>Get it · {rupees(u.product.price)}</Link>}
                </div>
              </aside>
            )}
            {g.objectives?.length > 0 && (
              <section id="learn" className="pj-sec"><h2>What you will learn</h2>
                <ul className="pj-learn">{g.objectives.map((o: string) => (<li key={o}><span aria-hidden="true">✓</span>{o}</li>))}</ul>
              </section>
            )}
            {(g.prerequisites_html || g.required_software?.length > 0) && (
              <section id="prereq" className="pj-sec"><h2>Before you start</h2>
                {g.prerequisites_html && <Html html={g.prerequisites_html} />}
                {g.required_software?.length > 0 && <><h3>Required software</h3><ul className="pj-stack">{g.required_software.map((t: string) => (<li key={t}>{t}</li>))}</ul></>}
              </section>
            )}
            {sections.map((s) => (
              <section key={s.key} id={s.key} className={`pj-sec${s.locked ? ' gd-locked' : ''}`}>
                <h2>{s.title}</h2>
                {s.locked ? <p className="guide-locked">🔒 This part is in the full guide.</p> : <CodeEnhancedHtml html={s.html} />}
              </section>
            ))}
            {g.faq?.length > 0 && (
              <section id="faq" className="pj-sec"><h2>Questions</h2>
                <div className="gd-faq">{g.faq.map((f: any) => (<details key={f.q}><summary>{f.q}</summary><Html html={f.a} /></details>))}</div>
              </section>
            )}
            {g.resources?.length > 0 && (
              <section className="pj-sec"><h2>Resources</h2>
                <ul className="pj-links">{g.resources.map((r: any) => (<li key={r.url}><a href={r.url}><strong>{r.label}</strong><span>{r.url}</span><Arrow /></a></li>))}</ul>
              </section>
            )}
            {g.files?.length > 0 && <section id="files" className="pj-sec"><FileList files={g.files} base="/project-guides" slug={slug} /></section>}
            {g.related_blogs?.length > 0 && (
              <section className="pj-sec"><h2>Related articles</h2>
                <ul className="pj-links">{g.related_blogs.map((b: any) => (<li key={b.slug}><Link to={`/blog/${b.slug}`}><strong>{b.title}</strong><span>Article</span><Arrow /></Link></li>))}</ul>
              </section>
            )}
          </div>
          <aside className="pj-side" aria-label="Guide summary">
            <div className="pj-glance">
              <h2>About this guide</h2>
              <dl>
                <dt>Level</dt><dd><span className={`pj-lvl pj-${g.difficulty}`}>{cap(g.difficulty)}</span></dd>
                <dt>Reading</dt><dd>{g.reading_time} min</dd>
                {g.estimated_time && <><dt>Build time</dt><dd>{g.estimated_time}</dd></>}
                <dt>Access</dt><dd>{accessLabel(g)}</dd>
              </dl>
              {(g.technologies ?? []).length > 0 && <ul className="pj-tags">{g.technologies.slice(0, 8).map((t: string) => (<li key={t}>{t}</li>))}</ul>}
              {project && <Link className="btn btn-yellow btn-block" to={`/projects/${project.slug}`}>View the project</Link>}
              <a className="pj-ask" href="/#contact">Stuck? Ask a mentor</a>
            </div>
            {toc.length > 1 && <nav className="pj-toc" aria-label="On this page"><h2>On this page</h2><ol>{toc.map((s) => (<li key={s.id}><a href={`#${s.id}`}>{s.label}</a></li>))}</ol></nav>}
          </aside>
        </div>
        {g.related_projects?.length > 0 && (
          <section className="pj-more"><h2>Related projects</h2>
            <div className="pj-grid">{g.related_projects.map((r: Card) => (<article key={r.slug} className="pj-card"><Link to={`/projects/${r.slug}`} className="pj-card-media" tabIndex={-1} aria-hidden="true"><Cover c={r} /></Link><div className="pj-card-body"><h2><Link to={`/projects/${r.slug}`}>{r.title}</Link></h2><p className="pj-sum">{r.summary}</p></div></article>))}</div>
          </section>
        )}
        <section className="pj-cta"><div><h2>Need help while you build?</h2><p>Join the free 2-hour live session and ask your questions live.</p></div><a className="btn btn-yellow btn-lg" href="/#register">Join free demo</a></section>
      </article>
    </PageFrame>
  )
}
