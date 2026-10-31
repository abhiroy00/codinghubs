import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import { NotFound } from '../pages/NotFound'
import { BackLink } from '../components/BackLink'
import { PageFrame, Pager, SearchIcon } from '../content-pages/shared'
import { FileList, Html, useDetail } from './catalog'
import { errorText, get, initial, rupees, shop, type Card, type Paged } from './api'
import './projects.css'

/* eslint-disable @typescript-eslint/no-explicit-any */
const PAGE = 9
const LEVELS: [string, string][] = [['', 'Any level'], ['beginner', 'Beginner'], ['intermediate', 'Intermediate'], ['advanced', 'Advanced']]
export const cap = (s?: string) => (s ? s[0].toUpperCase() + s.slice(1) : '')
export const initials = (t: string) => t.split(/\s+/).slice(0, 2).map((w) => w[0]).join('').toUpperCase()
export const hue = (t: string) => [...t].reduce((n, c) => (n * 31 + c.charCodeAt(0)) % 360, 7)

export function Clock() {
  return (
    <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" />
    </svg>
  )
}
export function Arrow() {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M5 12h14M13 6l6 6-6 6" />
    </svg>
  )
}

export function Cover({ c, big = false }: { c: Card; big?: boolean }) {
  if (c.featured_image) return <img src={c.featured_image} alt={c.featured_image_alt || c.title} loading={big ? 'eager' : 'lazy'} decoding="async" width={800} height={450} />
  const h = hue(c.title)
  return (
    <div className="pj-ph" style={{ background: `linear-gradient(135deg,hsl(${h} 70% 38%),hsl(${(h + 50) % 360} 75% 52%))` }} aria-hidden="true">
      <span>{initials(c.title)}</span>
      <i /><i /><i />
    </div>
  )
}

export function ProjectCard({ c, i = 0, featured = false }: { c: Card; i?: number; featured?: boolean }) {
  const tech = c.technologies ?? []
  return (
    <article className={`pj-card${featured ? ' pj-card-feat' : ''}`} style={{ ['--i' as string]: i }}>
      <Link to={`/projects/${c.slug}`} className="pj-card-media" tabIndex={-1} aria-hidden="true">
        <Cover c={c} />
        <span className={`pj-lvl pj-${c.difficulty}`}>{cap(c.difficulty)}</span>
        <span className={`pj-price${c.is_paid ? ' paid' : ''}`}>{c.is_paid ? rupees(c.price) : 'Free'}</span>
      </Link>
      <div className="pj-card-body">
        {c.category && typeof c.category === 'string' && <p className="pj-cat">{c.category}</p>}
        <h2>
          <Link to={`/projects/${c.slug}`}>{c.title}</Link>
        </h2>
        <p className="pj-sum">{c.summary}</p>
        {tech.length > 0 && (
          <ul className="pj-tags" aria-label="Technologies">
            {tech.slice(0, 4).map((t) => (<li key={t}>{t}</li>))}
            {tech.length > 4 && <li className="more">+{tech.length - 4}</li>}
          </ul>
        )}
        {c.guide && (
          <Link to={`/project-guides/${c.guide.slug}`} className="pj-guide-link">
            Guide: {c.guide.title}
          </Link>
        )}
        <div className="pj-foot">
          {c.estimated_time ? <span className="pj-time"><Clock /> {c.estimated_time}</span> : <span />}
          <Link to={`/projects/${c.slug}`} className="pj-go" aria-label={`View ${c.title}`}>View project <Arrow /></Link>
        </div>
      </div>
    </article>
  )
}

/* ---------------------------------------------------------------- list */
export function ProjectsPage() {
  const [params, setParams] = useSearchParams()
  const page = Math.max(1, Number(params.get('page')) || 1)
  const category = params.get('category') ?? ''
  const difficulty = params.get('difficulty') ?? ''
  const tech = params.get('technology') ?? ''
  const price = params.get('price') ?? ''
  const ordering = params.get('ordering') ?? ''
  const q = params.get('q') ?? ''
  const seedRef = useRef<Record<string, any> | null>(null)
  if (seedRef.current === null) {
    const i = initial()
    seedRef.current = i && i.kind === 'project-list' ? i : {}
  }
  const seed = seedRef.current
  const [data, setData] = useState<Paged<Card> | null>(seed.results ? { count: seed.count, results: seed.results } : null)
  const [cats, setCats] = useState<string[]>(seed.categories ?? [])
  const [techs, setTechs] = useState<string[]>([])
  const [text, setText] = useState(q)
  const [error, setError] = useState(false)
  const [total, setTotal] = useState<number | null>(seed.count ?? null)
  const used = useRef(false)

  useEffect(() => {
    document.title = 'Projects | Coding Hubs School of AI'
    window.scrollTo(0, 0)
  }, [])

  useEffect(() => {
    const s = seedRef.current!
    const unfiltered = !category && !difficulty && !tech && !price && !ordering && !q
    if (!used.current && s.results && s.page === page && unfiltered) {
      used.current = true
      get<Paged<Card>>('/projects/', { page_size: 1 }).then((d) => { setCats(d.categories ?? []); setTechs(d.technologies ?? []) }).catch(() => undefined)
      return
    }
    used.current = true
    let live = true
    setError(false)
    get<Paged<Card>>('/projects/', { page, page_size: PAGE, ...(category ? { category } : {}), ...(difficulty ? { difficulty } : {}), ...(tech ? { technology: tech } : {}), ...(price ? { [price]: 1 } : {}), ...(q ? { q } : {}), ...(ordering ? { ordering } : {}) })
      .then((d) => {
        if (!live) return
        setData(d)
        if (d.categories) setCats(d.categories)
        if (d.technologies) setTechs(d.technologies)
        if (unfiltered) setTotal(d.count)
      })
      .catch(() => live && setError(true))
    return () => { live = false }
  }, [page, category, difficulty, tech, price, ordering, q])

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
  const active = [category, difficulty, tech, price, q].filter(Boolean).length
  const featured = useMemo(() => (page === 1 && !active ? data?.results.find((c) => c.is_featured) : undefined), [data, page, active])
  const rest = data?.results.filter((c) => c !== featured) ?? []

  return (
    <PageFrame wide>
      <section className="pj-hero">
        <span className="pj-blob b1" aria-hidden="true" /><span className="pj-blob b2" aria-hidden="true" /><span className="pj-grid-bg" aria-hidden="true" />
        <div className="pj-hero-in">
          <p className="pj-eyebrow">Learn by building</p>
          <h1>Real projects you can <span>build, learn from and show off</span></h1>
          <p className="pj-lead">Pick a project, follow the features and tech stack, and turn what you learn into something for your portfolio.</p>
          <label className="pj-search">
            <span className="sr-only">Search projects</span>
            <SearchIcon />
            <input type="search" placeholder="Search by project or technology…" value={text} onChange={(e) => setText(e.target.value)} />
          </label>
          <ul className="pj-stats" aria-label="Project statistics">
            <li><strong>{total ?? '–'}</strong><span>Projects</span></li>
            <li><strong>{cats.length || '–'}</strong><span>Categories</span></li>
            <li><strong>{techs.length || '–'}</strong><span>Technologies</span></li>
          </ul>
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
          <select aria-label="Level" value={difficulty} onChange={(e) => go({ difficulty: e.target.value || null })}>{LEVELS.map(([v, l]) => (<option key={v} value={v}>{l}</option>))}</select>
          {techs.length > 0 && (
            <select aria-label="Technology" value={tech} onChange={(e) => go({ technology: e.target.value || null })}>
              <option value="">Any technology</option>
              {techs.map((t) => (<option key={t} value={t}>{t}</option>))}
            </select>
          )}
          <select aria-label="Free or paid" value={price} onChange={(e) => go({ price: e.target.value || null })}>
            <option value="">Free and paid</option><option value="free">Free only</option><option value="paid">Paid only</option>
          </select>
          <select aria-label="Sort" value={ordering} onChange={(e) => go({ ordering: e.target.value || null })}>
            <option value="">Newest first</option><option value="oldest">Oldest first</option><option value="title">Title A–Z</option>
          </select>
          {active > 0 && <button type="button" className="pj-clear" onClick={() => { setText(''); setParams(new URLSearchParams()) }}>Clear filters ({active})</button>}
        </div>
      </div>

      {error && <p className="bl-state" role="alert">We could not load the projects. Please refresh the page.</p>}
      {!data && !error && (
        <div className="pj-grid" aria-busy="true" aria-label="Loading projects">
          {Array.from({ length: 6 }).map((_, i) => (<div key={i} className="pj-skel" />))}
        </div>
      )}
      {data && data.count === 0 && (
        <div className="pj-empty">
          <strong>{active ? 'No project matches these filters.' : 'New projects are on the way.'}</strong>
          <p>{active ? 'Try removing a filter or searching for something else.' : 'Check back soon, or join the free demo session to see how we teach.'}</p>
          {active > 0 ? <button type="button" className="btn btn-yellow" onClick={() => { setText(''); setParams(new URLSearchParams()) }}>Clear filters</button> : <a className="btn btn-yellow" href="/#register">Join the free demo</a>}
        </div>
      )}
      {featured && (
        <div className="pj-featured"><p className="pj-feat-label">Featured project</p><ProjectCard c={featured} featured /></div>
      )}
      <div className="pj-grid" key={`${page}-${category}-${difficulty}-${tech}-${price}-${q}-${ordering}`}>
        {rest.map((c, i) => (<ProjectCard key={c.slug} c={c} i={i} />))}
      </div>
      {data && <Pager page={page} count={data.count} size={PAGE} onPage={(p) => go({ page: p > 1 ? String(p) : null })} />}

      <section className="pj-cta">
        <div><h2>Stuck on a project?</h2><p>Join the free 2-hour live session and learn how to plan, build and debug with real mentors.</p></div>
        <a className="btn btn-yellow btn-lg" href="/#register">Join free demo</a>
      </section>
    </PageFrame>
  )
}

/* ---------------------------------------------------------------- detail */
function Lightbox({ shots, index, onClose, onMove }: { shots: any[]; index: number; onClose: () => void; onMove: (d: number) => void }) {
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
      if (e.key === 'ArrowRight') onMove(1)
      if (e.key === 'ArrowLeft') onMove(-1)
    }
    document.addEventListener('keydown', h)
    return () => document.removeEventListener('keydown', h)
  }, [onClose, onMove])
  const s = shots[index]
  return (
    <div className="pj-lb" role="dialog" aria-modal="true" aria-label="Screenshot viewer" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <button type="button" className="pj-lb-x" onClick={onClose} aria-label="Close">×</button>
      {shots.length > 1 && <button type="button" className="pj-lb-n prev" onClick={() => onMove(-1)} aria-label="Previous screenshot">‹</button>}
      <figure><img src={s.src} alt={s.alt || ''} />{(s.caption || s.alt) && <figcaption>{s.caption || s.alt}</figcaption>}</figure>
      {shots.length > 1 && <button type="button" className="pj-lb-n next" onClick={() => onMove(1)} aria-label="Next screenshot">›</button>}
    </div>
  )
}

export function ProjectPage() {
  const { data: p, missing, slug } = useDetail('project', '/projects')
  const [shot, setShot] = useState<number | null>(null)
  const [questionName, setQuestionName] = useState('')
  const [questionEmail, setQuestionEmail] = useState('')
  const [questionText, setQuestionText] = useState('')
  const [questionBusy, setQuestionBusy] = useState(false)
  const [questionMessage, setQuestionMessage] = useState('')
  const [questionError, setQuestionError] = useState('')
  const { slug: routeSlug } = useParams()
  useEffect(() => setShot(null), [routeSlug])

  async function submitQuestion(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!slug) return
    setQuestionBusy(true)
    setQuestionMessage('')
    setQuestionError('')
    try {
      const { data } = await shop.post(`/projects/${slug}/questions/`, {
        name: questionName,
        email: questionEmail,
        question: questionText,
      })
      setQuestionMessage(data.detail)
      setQuestionName('')
      setQuestionEmail('')
      setQuestionText('')
    } catch (error) {
      setQuestionError(errorText(error, 'Could not submit your question. Please try again.'))
    } finally {
      setQuestionBusy(false)
    }
  }

  if (missing) return <NotFound />
  if (!p) return <PageFrame wide><div className="pj-detail-skel" aria-busy="true" role="status"><span className="sr-only">Loading…</span></div></PageFrame>

  const stack: string[] = [...new Set<string>([...(p.technologies ?? []), ...(p.languages ?? []), ...(p.tools ?? [])])]
  const shots: any[] = p.screenshots ?? []
  const sections: { id: string; label: string }[] = [
    p.overview_html && { id: 'overview', label: 'Overview' },
    p.problem_html && { id: 'problem', label: 'Problem' },
    p.objectives_html && { id: 'objectives', label: 'Objectives' },
    p.features?.length && { id: 'features', label: 'Features' },
    stack.length && { id: 'stack', label: 'Tech stack' },
    p.learning_outcomes?.length && { id: 'learn', label: 'What you learn' },
    (p.prerequisites_html || p.requirements_html) && { id: 'prereq', label: 'Prerequisites' },
    (p.architecture_html || p.database_html) && { id: 'arch', label: 'Architecture' },
    shots.length && { id: 'shots', label: 'Screenshots' },
    p.setup_html && { id: 'setup', label: 'Setup' },
    p.files?.length && { id: 'files', label: 'Downloads' },
    p.guides?.length && { id: 'guides', label: 'Guides' },
  ].filter(Boolean) as { id: string; label: string }[]

  return (
    <PageFrame wide>
      <article className="pj-detail">
        {p.preview && <p className="bl-preview" role="status">Preview. This page is not public.</p>}
        <header className="pj-dhero">
          <div className="pj-dhero-bg" aria-hidden="true">{p.featured_image && <img src={p.featured_image} alt="" />}</div>
          <div className="pj-dhero-in">
            <BackLink to="/projects" className="pj-back"><span aria-hidden="true">←</span> All projects</BackLink>
            <div className="pj-badges">
              <span className={`pj-lvl pj-${p.difficulty}`}>{cap(p.difficulty)}</span>
              {p.category && <span className="pj-pill">{p.category}</span>}
              <span className={`pj-pill ${p.is_paid ? 'paid' : 'free'}`}>{p.is_paid ? `Paid · ${rupees(p.price)}` : 'Free'}</span>
            </div>
            <h1>{p.title}</h1>
            {p.summary && <p className="pj-dlead">{p.summary}</p>}
            <ul className="pj-meta">
              {p.estimated_time && <li><Clock /> {p.estimated_time}</li>}
              {p.author_name && <li>By {p.author_name}{p.author_title ? `, ${p.author_title}` : ''}</li>}
              {stack.length > 0 && <li>{stack.length} technologies</li>}
            </ul>
            <div className="pj-actions">
              {p.guides?.length > 0 && <Link className="btn btn-yellow" to={`/project-guides/${p.guides[0].slug}`}>Read the project guide <Arrow /></Link>}
              {p.demo_url && <a className="btn btn-yellow" href={p.demo_url} target="_blank" rel="noopener noreferrer">Live demo <Arrow /></a>}
              {p.repo_url && <a className="btn pj-btn-ghost" href={p.repo_url} target="_blank" rel="noopener noreferrer">Source code</a>}
              {p.product && !p.unlocked && <Link className="btn btn-yellow" to={`/store/${p.product.slug}`}>Get the project · {rupees(p.product.price)}</Link>}
              {!p.demo_url && !p.repo_url && !p.product && <a className="btn btn-yellow" href="/#register">Build it with us — free demo</a>}
            </div>
          </div>
        </header>

        <div className="pj-layout">
          <div className="pj-main">
            {p.overview_html && <section id="overview" className="pj-sec"><h2>Overview</h2><Html html={p.overview_html} /></section>}
            {p.problem_html && <section id="problem" className="pj-sec"><h2>The problem</h2><Html html={p.problem_html} /></section>}
            {p.objectives_html && <section id="objectives" className="pj-sec"><h2>Objectives</h2><Html html={p.objectives_html} /></section>}
            {p.features?.length > 0 && (
              <section id="features" className="pj-sec">
                <h2>Features</h2>
                <ul className="pj-feats">
                  {p.features.map((f: any, i: number) => (
                    <li key={i} style={{ ['--i' as string]: i }}><span className="pj-num">{i + 1}</span><div><strong>{f.title}</strong>{f.description && <p>{f.description}</p>}</div></li>
                  ))}
                </ul>
              </section>
            )}
            {stack.length > 0 && (
              <section id="stack" className="pj-sec"><h2>Technology stack</h2>
                <ul className="pj-stack">{stack.map((t) => (<li key={t}>{t}</li>))}</ul>
              </section>
            )}
            {p.learning_outcomes?.length > 0 && (
              <section id="learn" className="pj-sec"><h2>What you will learn</h2>
                <ul className="pj-learn">{p.learning_outcomes.map((o: string) => (<li key={o}><span aria-hidden="true">✓</span>{o}</li>))}</ul>
              </section>
            )}
            {(p.prerequisites_html || p.requirements_html) && (
              <section id="prereq" className="pj-sec"><h2>Before you start</h2>
                {p.prerequisites_html && <><h3>Prerequisites</h3><Html html={p.prerequisites_html} /></>}
                {p.requirements_html && <><h3>System requirements</h3><Html html={p.requirements_html} /></>}
              </section>
            )}
            {(p.architecture_html || p.database_html) && (
              <section id="arch" className="pj-sec"><h2>How it is built</h2>
                {p.architecture_html && <><h3>Architecture</h3><Html html={p.architecture_html} /></>}
                {p.database_html && <><h3>Database</h3><Html html={p.database_html} /></>}
              </section>
            )}
            {shots.length > 0 && (
              <section id="shots" className="pj-sec"><h2>Screenshots</h2>
                <div className="pj-shots">
                  {shots.map((s, i) => (<button key={s.src} type="button" onClick={() => setShot(i)} aria-label={`Open screenshot ${i + 1}`}><img src={s.src} alt={s.alt || ''} loading="lazy" decoding="async" /></button>))}
                </div>
              </section>
            )}
            {p.setup_html && <section id="setup" className="pj-sec"><h2>Setup overview</h2><Html html={p.setup_html} /></section>}
            {p.files?.length > 0 && <section id="files" className="pj-sec"><FileList files={p.files} base="/projects" slug={slug} /></section>}
            {!p.preview && (
              <section id="project-questions" className="pj-sec pj-qa">
                <h2>Project questions</h2>
                <p>Ask us for help with this project. Your name, question, and our answer may be shown publicly so other learners can benefit. Your email stays private.</p>
                {p.questions?.length > 0 && <div className="pj-qa-list">{p.questions.map((item: any) => (
                  <article className="pj-qa-item" key={item.id}>
                    <h3>{item.question}</h3>
                    <p className="pj-qa-author">Asked by {item.name}</p>
                    <p className="pj-qa-answer">{item.answer}</p>
                  </article>
                ))}</div>}
                <form className="pj-qa-form" onSubmit={(event) => void submitQuestion(event)}>
                  <h3>Ask a project question</h3>
                  <label htmlFor="project-question-name">Name</label>
                  <input id="project-question-name" maxLength={100} required value={questionName} onChange={(event) => setQuestionName(event.target.value)} />
                  <label htmlFor="project-question-email">Email (private)</label>
                  <input id="project-question-email" type="email" required value={questionEmail} onChange={(event) => setQuestionEmail(event.target.value)} />
                  <label htmlFor="project-question-text">Your question</label>
                  <textarea id="project-question-text" maxLength={2000} required rows={5} value={questionText} onChange={(event) => setQuestionText(event.target.value)} />
                  {questionError && <p className="pj-qa-error" role="alert">{questionError}</p>}
                  {questionMessage && <p className="pj-qa-success" role="status">{questionMessage}</p>}
                  <button className="btn btn-yellow" type="submit" disabled={questionBusy}>{questionBusy ? 'Submitting…' : 'Submit question'}</button>
                </form>
              </section>
            )}
            {!p.unlocked && p.product && (
              <aside className="pj-lock"><div><strong>{p.locked_files} project file{p.locked_files === 1 ? '' : 's'} included</strong><p>Source code and files come with {p.product.title}.</p></div><Link className="btn btn-yellow" to={`/store/${p.product.slug}`}>Get it · {rupees(p.product.price)}</Link></aside>
            )}
            {p.guides?.length > 0 && (
              <section id="guides" className="pj-sec"><h2>Guides for this project</h2>
                <ul className="pj-links">{p.guides.map((g: Card) => (<li key={g.slug}><Link to={`/project-guides/${g.slug}`}><strong>{g.title}</strong><span>{g.summary}</span><Arrow /></Link></li>))}</ul>
              </section>
            )}
            {(p.related_courses?.length > 0 || p.related_blogs?.length > 0) && (
              <section className="pj-sec"><h2>Keep learning</h2>
                <ul className="pj-links">
                  {p.related_courses?.map((c: any) => (<li key={c.slug}><a href="/#courses"><strong>{c.name}</strong><span>Course</span><Arrow /></a></li>))}
                  {p.related_blogs?.map((b: any) => (<li key={b.slug}><Link to={`/blog/${b.slug}`}><strong>{b.title}</strong><span>Article</span><Arrow /></Link></li>))}
                </ul>
              </section>
            )}
          </div>

          <aside className="pj-side" aria-label="Project summary">
            <div className="pj-glance">
              <h2>At a glance</h2>
              <dl>
                <dt>Level</dt><dd><span className={`pj-lvl pj-${p.difficulty}`}>{cap(p.difficulty)}</span></dd>
                {p.estimated_time && <><dt>Time</dt><dd>{p.estimated_time}</dd></>}
                <dt>Price</dt><dd>{p.is_paid ? rupees(p.price) : 'Free'}</dd>
                {p.category && <><dt>Category</dt><dd>{p.category}</dd></>}
              </dl>
              {stack.length > 0 && <ul className="pj-tags">{stack.slice(0, 8).map((t) => (<li key={t}>{t}</li>))}</ul>}
              {p.demo_url && <a className="btn btn-yellow btn-block" href={p.demo_url} target="_blank" rel="noopener noreferrer">Live demo</a>}
              {p.product && !p.unlocked && <Link className="btn btn-yellow btn-block" to={`/store/${p.product.slug}`}>Get the project</Link>}
              <a className="pj-ask" href="/#contact">Need help? Talk to us</a>
            </div>
            {sections.length > 1 && (
              <nav className="pj-toc" aria-label="On this page"><h2>On this page</h2><ol>{sections.map((s) => (<li key={s.id}><a href={`#${s.id}`}>{s.label}</a></li>))}</ol></nav>
            )}
          </aside>
        </div>

        {p.related_projects?.length > 0 && (
          <section className="pj-more"><h2>More projects</h2><div className="pj-grid">{p.related_projects.map((r: Card, i: number) => (<ProjectCard key={r.slug} c={r} i={i} />))}</div></section>
        )}
        <section className="pj-cta">
          <div><h2>Want to build this with a mentor?</h2><p>Join the free 2-hour live session and get your questions answered live.</p></div>
          <a className="btn btn-yellow btn-lg" href="/#register">Join free demo</a>
        </section>
      </article>
      {shot !== null && shots[shot] && <Lightbox shots={shots} index={shot} onClose={() => setShot(null)} onMove={(d) => setShot((i) => (i === null ? i : (i + d + shots.length) % shots.length))} />}
    </PageFrame>
  )
}
