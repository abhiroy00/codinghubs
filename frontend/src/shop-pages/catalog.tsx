import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { NotFound } from '../pages/NotFound'
import { PageFrame, Pager, SearchIcon, useSeo } from '../content-pages/shared'
import { cartApi, errorText, fmtSize, get, initial, rupees, shop, type Card, type Paged } from './api'

/* eslint-disable @typescript-eslint/no-explicit-any */
type Kind = 'store' | 'projects' | 'guides'
const CFG = {
  store: { title: 'Store', h1: 'Store', lead: 'Study notes, books, project reports and source code. Instant downloads or printed copies.', api: '/products/', base: '/store', initKind: 'store-list', filter: 'category', filterLabel: 'Categories' },
  projects: { title: 'Projects', h1: 'Projects', lead: 'Real project ideas with objectives, features, technology stack and learning outcomes.', api: '/projects/', base: '/projects', initKind: 'project-list', filter: 'category', filterLabel: 'Categories' },
  guides: { title: 'Project Guides', h1: 'Project Guides', lead: 'Step-by-step guides: setup, code, testing and deployment.', api: '/project-guides/', base: '/project-guides', initKind: 'guide-list', filter: 'category', filterLabel: 'Categories' },
} as const
const PAGE = 12

function Badge({ c }: { c: Card }) {
  if (c.price !== undefined && c.price !== null && 'in_stock' in c) return <strong>{c.is_free ? 'Free' : rupees(c.price)}</strong>
  if (c.is_paid) return <strong>{rupees(c.price)}</strong>
  if (c.access_type === 'paid') return <strong>{c.price ? rupees(c.price) : 'Paid'}</strong>
  if (c.access_type === 'account') return <strong>Free with account</strong>
  return <strong>Free</strong>
}

export function ItemCard({ c, base }: { c: Card; base: string }) {
  const img = c.image?.src ?? c.featured_image
  const alt = c.image?.alt ?? c.featured_image_alt ?? ''
  const tag = typeof c.category === 'object' && c.category ? c.category.name : (c.category as string) || c.difficulty
  return (
    <article className="bl-card">
      {img && (
        <Link to={`${base}/${c.slug}`} className="bl-card-img" tabIndex={-1} aria-hidden="true">
          <img src={img} alt={alt} loading="lazy" decoding="async" width={640} height={360} />
        </Link>
      )}
      <div className="bl-card-body">
        {tag && <p className="bl-cat">{tag}</p>}
        <h2>
          <Link to={`${base}/${c.slug}`}>{c.title}</Link>
        </h2>
        <p>{c.short_description || c.summary}</p>
        <p className="bl-meta">
          <Badge c={c} />
          {c.original_price && <s> {rupees(c.original_price)}</s>}
          {c.stock_label ? ` · ${c.stock_label}` : ''}
          {c.estimated_time ? ` · ${c.estimated_time}` : ''}
          {c.difficulty && c.product_type === undefined ? ` · ${c.difficulty}` : ''}
        </p>
      </div>
    </article>
  )
}

export function CatalogList({ kind }: { kind: Kind }) {
  const cfg = CFG[kind]
  const [params, setParams] = useSearchParams()
  const page = Math.max(1, Number(params.get('page')) || 1)
  const filter = params.get(cfg.filter) ?? ''
  const difficulty = params.get('difficulty') ?? ''
  const q = params.get('q') ?? ''
  const ordering = params.get('ordering') ?? ''
  const seedRef = useRef<Record<string, any> | null>(null)
  if (seedRef.current === null) {
    const i = initial()
    seedRef.current = i && i.kind === cfg.initKind ? i : {}
  }
  const seed = seedRef.current
  const [data, setData] = useState<Paged<Card> | null>(seed.results ? { count: seed.count, results: seed.results, categories: seed.categories ?? seed.categories } : null)
  const [cats, setCats] = useState<any[]>(seed.categories ?? [])
  const [error, setError] = useState(false)
  const [text, setText] = useState(q)
  const used = useRef(false)

  useEffect(() => {
    document.title = `${cfg.title} | Coding Hubs School of AI`
    window.scrollTo(0, 0)
  }, [cfg.title])

  useEffect(() => {
    if (!used.current && seed.results && seed.page === page && (seed.category ?? '') === filter && (seed.q ?? '') === q && !difficulty && !ordering) {
      used.current = true
      return
    }
    used.current = true
    let live = true
    setError(false)
    get<Paged<Card>>(cfg.api, { page, page_size: PAGE, ...(filter ? { [cfg.filter]: filter } : {}), ...(difficulty ? { difficulty } : {}), ...(q ? { q } : {}), ...(ordering ? { ordering } : {}) })
      .then((d) => {
        if (!live) return
        setData(d)
        if (d.categories) setCats(d.categories)
      })
      .catch(() => live && setError(true))
    return () => {
      live = false
    }
  }, [page, filter, difficulty, q, ordering, cfg.api, cfg.filter]) // eslint-disable-line react-hooks/exhaustive-deps

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
  const catName = (c: any) => (typeof c === 'string' ? c : c.name)
  const catKey = (c: any) => (typeof c === 'string' ? c : c.slug)

  return (
    <PageFrame>
      <h1>{cfg.h1}</h1>
      <p className="bl-lead">{cfg.lead}</p>
      <div className="bl-tools">
        <label className="bl-search">
          <span className="sr-only">Search {cfg.title}</span>
          <SearchIcon />
          <input type="search" placeholder={`Search ${cfg.title.toLowerCase()}`} value={text} onChange={(e) => setText(e.target.value)} />
        </label>
        {cats.length > 0 && (
          <div className="bl-chips" role="group" aria-label={cfg.filterLabel}>
            <button type="button" className={!filter ? 'on' : ''} aria-pressed={!filter} onClick={() => go({ [cfg.filter]: null })}>All</button>
            {cats.map((c) => (
              <button key={catKey(c)} type="button" className={filter === catKey(c) ? 'on' : ''} aria-pressed={filter === catKey(c)} onClick={() => go({ [cfg.filter]: catKey(c) })}>
                {catName(c)}
              </button>
            ))}
          </div>
        )}
        <div className="bl-selects">
          {kind !== 'store' && (
            <select aria-label="Difficulty" value={difficulty} onChange={(e) => go({ difficulty: e.target.value || null })}>
              <option value="">Any difficulty</option>
              <option value="beginner">Beginner</option>
              <option value="intermediate">Intermediate</option>
              <option value="advanced">Advanced</option>
            </select>
          )}
          <select aria-label="Sort" value={ordering} onChange={(e) => go({ ordering: e.target.value || null })}>
            <option value="">Newest</option>
            <option value="title">Title A–Z</option>
            {kind === 'store' && <option value="price_asc">Price: low to high</option>}
            {kind === 'store' && <option value="price_desc">Price: high to low</option>}
          </select>
        </div>
      </div>
      {error && <p className="bl-state" role="alert">We could not load this list. Please refresh the page.</p>}
      {!data && !error && <p className="bl-state" role="status">Loading…</p>}
      {data && data.count === 0 && <p className="bl-state">{q || filter || difficulty ? 'Nothing matches your search.' : 'Nothing published yet. Check back soon.'}</p>}
      <div className="bl-grid">{data?.results.map((c) => <ItemCard key={c.slug} c={c} base={cfg.base} />)}</div>
      {data && <Pager page={page} count={data.count} size={PAGE} onPage={(p) => go({ page: p > 1 ? String(p) : null })} />}
    </PageFrame>
  )
}

/* ---------------- detail pages ---------------- */
function useDetail(kind: 'product' | 'project' | 'guide', apiBase: string) {
  const { slug = '' } = useParams<{ slug: string }>()
  const { search } = window.location.pathname ? { search: window.location.search } : { search: '' }
  const preview = new URLSearchParams(search).get('preview') ?? undefined
  const seedRef = useRef<any>(undefined)
  if (seedRef.current === undefined) {
    const i = initial()
    seedRef.current = i && i.kind === kind && i.slug === slug ? i.article : null
  }
  const [data, setData] = useState<any>(seedRef.current)
  const [missing, setMissing] = useState(false)
  const first = useRef(true)

  useEffect(() => {
    let live = true
    setMissing(false)
    // products are the same for everybody: use the server data as is. Projects and guides depend on who is logged in
    // (locked / unlocked), so always ask the API once with the visitor's login.
    if (kind === 'product' && first.current && seedRef.current) {
      first.current = false
      return
    }
    first.current = false
    get(`${apiBase}/${slug}/`, preview ? { preview } : undefined)
      .then((d) => live && (setData(d), window.scrollTo(0, 0)))
      .catch(() => live && !seedRef.current && setMissing(true))
    return () => {
      live = false
    }
  }, [slug, preview]) // eslint-disable-line react-hooks/exhaustive-deps
  useSeo(data?.seo ?? null)
  return { data, missing, slug }
}

function Html({ html }: { html?: string }) {
  // sanitised on the server (allowlist) when saved and again when served
  return html ? <div className="bl-body" dangerouslySetInnerHTML={{ __html: html }} /> : null
}

export function ProductDetail() {
  const { data: p, missing } = useDetail('product', '/products')
  const [qty, setQty] = useState(1)
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null)
  const [busy, setBusy] = useState(false)
  const nav = useNavigate()
  if (missing) return <NotFound />
  if (!p) return <PageFrame><p className="bl-state" role="status">Loading…</p></PageFrame>
  const add = async (then?: () => void) => {
    setBusy(true)
    setMsg(null)
    try {
      await cartApi.add(p.id, p.is_physical ? qty : 1)
      setMsg({ ok: true, text: 'Added to your cart.' })
      then?.()
    } catch (e) {
      setMsg({ ok: false, text: errorText(e) })
    } finally {
      setBusy(false)
    }
  }
  return (
    <PageFrame>
      <article className="bl-article bl-wide">
        {p.preview && <p className="bl-preview" role="status">Preview. This page is not public.</p>}
        <div className={`shop-product${p.images?.length ? ' has-img' : ''}`}>
          {p.images?.length ? (<div>
            {p.images?.length ? (
              <div className="shop-gallery">
                <img className="bl-cover" src={p.images[0].src} alt={p.images[0].alt} width={1200} height={630} decoding="async" />
                {p.images.length > 1 && <div className="shop-thumbs">{p.images.slice(1).map((i: any) => <img key={i.src} src={i.src} alt={i.alt} loading="lazy" />)}</div>}
              </div>
            ) : null}
          </div>) : null}
          <div>
            {p.category && <p className="bl-cat">{p.category.name}</p>}
            <h1>{p.title}</h1>
            <p className="bl-meta">{[p.author && `By ${p.author}`, p.format, p.language].filter(Boolean).join(' · ')}</p>
            <p className="bl-price"><strong>{p.is_free ? 'Free' : rupees(p.price)}</strong>{p.original_price && <s> {rupees(p.original_price)}</s>}</p>
            <p className={`bl-stock${p.in_stock ? '' : ' out'}`}>{p.stock_label}</p>
            {p.tax_note && <p className="bl-meta">{p.tax_note}</p>}
            {p.is_physical && p.shipping_flat && Number(p.shipping_flat) > 0 && (
              <p className="bl-meta">Shipping {rupees(p.shipping_flat)}{p.free_shipping_over ? `, free over ${rupees(p.free_shipping_over)}` : ''}.</p>
            )}
            {p.is_physical && p.in_stock && (
              <label className="shop-qty">Quantity
                <input type="number" min={1} max={10} value={qty} onChange={(e) => setQty(Math.min(10, Math.max(1, Number(e.target.value) || 1)))} />
              </label>
            )}
            <div className="shop-actions">
              <button type="button" className="btn btn-yellow" disabled={!p.in_stock || busy} onClick={() => void add()}>{p.is_free ? 'Get for free' : 'Add to cart'}</button>
              <button type="button" className="btn btn-ghost-dark" disabled={!p.in_stock || busy} onClick={() => void add(() => nav('/checkout'))}>Buy now</button>
            </div>
            {msg && <p className={msg.ok ? 'shop-ok' : 'shop-err'} role={msg.ok ? 'status' : 'alert'}>{msg.text} {msg.ok && <Link to="/cart">View cart</Link>}</p>}
            {p.delivery && <p className="bl-meta">{p.delivery}</p>}
            <p className="bl-meta"><Link to="/policies#rescheduling">Refund and return policy</Link> · Need help? <a href="/#contact">Contact us</a></p>
          </div>
        </div>
        <Html html={p.description_html} />
        {p.included_materials?.length > 0 && <section><h2>What is included</h2><ul>{p.included_materials.map((m: string) => <li key={m}>{m}</li>)}</ul></section>}
        {p.files?.length > 0 && <section><h2>Files you will get</h2><ul>{p.files.map((f: any) => <li key={f.label}>{f.label} <small>({fmtSize(f.size)})</small></li>)}</ul></section>}
        {(p.publisher || p.isbn || p.edition || p.publication_year || p.pages || p.topics?.length > 0) && (
          <section>
            <h2>Details</h2>
            <dl className="shop-dl">
              {p.publisher && <><dt>Publisher</dt><dd>{p.publisher}</dd></>}
              {p.edition && <><dt>Edition</dt><dd>{p.edition}</dd></>}
              {p.publication_year && <><dt>Year</dt><dd>{p.publication_year}</dd></>}
              {p.pages && <><dt>Pages</dt><dd>{p.pages}</dd></>}
              {p.isbn && <><dt>ISBN</dt><dd>{p.isbn}</dd></>}
              {p.topics?.length > 0 && <><dt>Topics</dt><dd>{p.topics.join(', ')}</dd></>}
            </dl>
          </section>
        )}
        {p.guides?.length > 0 && <section className="bl-related"><h2>Related project guides</h2><div className="bl-grid">{p.guides.map((g: Card) => <ItemCard key={g.slug} c={g} base="/project-guides" />)}</div></section>}
        {p.related?.length > 0 && <section className="bl-related"><h2>Related items</h2><div className="bl-grid">{p.related.map((r: Card) => <ItemCard key={r.slug} c={r} base="/store" />)}</div></section>}
      </article>
    </PageFrame>
  )
}

function FileList({ files, base, slug }: { files: any[]; base: string; slug: string }) {
  const [err, setErr] = useState('')
  const open = async (id: number) => {
    setErr('')
    try {
      const { data } = await shop.post(`${base}/${slug}/files/${id}/link/`, {})
      window.location.assign(data.url)
    } catch (e) {
      setErr(errorText(e, 'Please log in to download this file.'))
    }
  }
  if (!files?.length) return null
  return (
    <section>
      <h2>Downloads</h2>
      <ul>{files.map((f) => <li key={f.id}><button type="button" className="ad-link shop-linkbtn" onClick={() => void open(f.id)}>{f.label}</button> <small>({fmtSize(f.size)})</small></li>)}</ul>
      {err && <p className="shop-err" role="alert">{err}</p>}
    </section>
  )
}

export function ProjectDetail() {
  const { data: p, missing, slug } = useDetail('project', '/projects')
  if (missing) return <NotFound />
  if (!p) return <PageFrame><p className="bl-state" role="status">Loading…</p></PageFrame>
  return (
    <PageFrame>
      <article className="bl-article">
        {p.preview && <p className="bl-preview" role="status">Preview. This page is not public.</p>}
        <header className="bl-head">
          <p className="bl-cat">{p.difficulty}{p.category ? ` · ${p.category}` : ''}</p>
          <h1>{p.title}</h1>
          <p className="bl-meta">{[p.estimated_time, p.author_name && `By ${p.author_name}`, p.is_paid ? `Paid project · ${rupees(p.price)}` : 'Free project'].filter(Boolean).join(' · ')}</p>
        </header>
        {p.featured_image && <img className="bl-cover" src={p.featured_image} alt={p.featured_image_alt} width={1200} height={630} decoding="async" />}
        <p className="bl-lead">{p.summary}</p>
        {p.overview_html && <section><h2>Overview</h2><Html html={p.overview_html} /></section>}
        {p.problem_html && <section><h2>Problem statement</h2><Html html={p.problem_html} /></section>}
        {p.objectives_html && <section><h2>Objectives</h2><Html html={p.objectives_html} /></section>}
        {p.features?.length > 0 && <section><h2>Features</h2><ul>{p.features.map((f: any, i: number) => <li key={i}><strong>{f.title}</strong> {f.description}</li>)}</ul></section>}
        {(p.technologies?.length > 0 || p.languages?.length > 0 || p.tools?.length > 0) && (
          <section><h2>Technology stack</h2><ul className="bl-tags">{[...p.technologies, ...p.languages, ...p.tools].map((t: string) => <li key={t}>{t}</li>)}</ul></section>
        )}
        {p.prerequisites_html && <section><h2>Prerequisites</h2><Html html={p.prerequisites_html} /></section>}
        {p.requirements_html && <section><h2>System requirements</h2><Html html={p.requirements_html} /></section>}
        {p.architecture_html && <section><h2>Architecture</h2><Html html={p.architecture_html} /></section>}
        {p.database_html && <section><h2>Database</h2><Html html={p.database_html} /></section>}
        {p.screenshots?.length > 0 && <section className="bl-gallery">{p.screenshots.map((s: any) => <figure key={s.src}><img src={s.src} alt={s.alt} loading="lazy" decoding="async" />{s.caption && <figcaption>{s.caption}</figcaption>}</figure>)}</section>}
        {p.learning_outcomes?.length > 0 && <section><h2>What you will learn</h2><ul>{p.learning_outcomes.map((o: string) => <li key={o}>{o}</li>)}</ul></section>}
        {p.setup_html && <section><h2>Setup overview</h2><Html html={p.setup_html} /></section>}
        <div className="shop-actions">
          {p.demo_url && <a className="btn btn-ghost-dark" href={p.demo_url} target="_blank" rel="noopener noreferrer">Live demo</a>}
          {p.repo_url && <a className="btn btn-ghost-dark" href={p.repo_url} target="_blank" rel="noopener noreferrer">Source repository</a>}
        </div>
        <FileList files={p.files} base="/projects" slug={slug} />
        {!p.unlocked && p.product && (
          <aside className="bl-cta">
            <h2>Get the project files</h2>
            <p>{p.locked_files} file{p.locked_files === 1 ? '' : 's'} included with {p.product.title} ({rupees(p.product.price)}).</p>
            <Link className="btn btn-yellow" to={`/store/${p.product.slug}`}>View in store</Link>
          </aside>
        )}
        {p.guides?.length > 0 && <section className="bl-related"><h2>Project guides</h2><div className="bl-grid">{p.guides.map((g: Card) => <ItemCard key={g.slug} c={g} base="/project-guides" />)}</div></section>}
        {p.related_courses?.length > 0 && <section><h2>Courses that help</h2><ul>{p.related_courses.map((c: any) => <li key={c.slug}><a href="/#courses">{c.name}</a></li>)}</ul></section>}
        {p.related_blogs?.length > 0 && <section><h2>Related articles</h2><ul>{p.related_blogs.map((b: any) => <li key={b.slug}><a href={`/blog/${b.slug}`}>{b.title}</a></li>)}</ul></section>}
        {p.related_projects?.length > 0 && <section className="bl-related"><h2>More projects</h2><div className="bl-grid">{p.related_projects.map((r: Card) => <ItemCard key={r.slug} c={r} base="/projects" />)}</div></section>}
      </article>
    </PageFrame>
  )
}

export function GuideDetail() {
  const { data: g, missing, slug } = useDetail('guide', '/project-guides')
  if (missing) return <NotFound />
  if (!g) return <PageFrame><p className="bl-state" role="status">Loading…</p></PageFrame>
  const u = g.unlock
  return (
    <PageFrame>
      <article className="bl-article">
        {g.preview && <p className="bl-preview" role="status">Preview. This page is not public.</p>}
        <header className="bl-head">
          <p className="bl-cat">{g.difficulty}{g.category ? ` · ${g.category}` : ''}</p>
          <h1>{g.title}</h1>
          <p className="bl-meta">{[g.author_name && `By ${g.author_name}`, g.estimated_time, `${g.reading_time} min read`].filter(Boolean).join(' · ')}</p>
        </header>
        {g.featured_image && <img className="bl-cover" src={g.featured_image} alt={g.featured_image_alt} width={1200} height={630} decoding="async" />}
        <p className="bl-lead">{g.summary}</p>
        {g.objectives?.length > 0 && <section><h2>What you will learn</h2><ul>{g.objectives.map((o: string) => <li key={o}>{o}</li>)}</ul></section>}
        {g.required_software?.length > 0 && <section><h2>Required software</h2><ul className="bl-tags">{g.required_software.map((t: string) => <li key={t}>{t}</li>)}</ul></section>}
        {g.prerequisites_html && <section><h2>Prerequisites</h2><Html html={g.prerequisites_html} /></section>}
        {g.toc.length > 0 && <nav className="bl-toc" aria-label="Table of contents"><h2>Contents</h2><ol>{g.toc.map((t: any) => <li key={t.id}><a href={`#${t.id}`}>{t.text}</a></li>)}</ol></nav>}
        {g.sections.map((s: any) => (
          <section key={s.key} id={s.key} className="guide-section">
            <h2>{s.title}</h2>
            {s.locked ? <p className="guide-locked">🔒 This section is part of the full guide.</p> : <CodeEnhancedHtml html={s.html} />}
          </section>
        ))}
        {!g.unlocked && u && (
          <aside className="bl-cta">
            <h2>Unlock the full guide</h2>
            <p>{u.message}</p>
            {u.type === 'account' && <Link className="btn btn-yellow" to="/login">Log in or create an account</Link>}
            {u.product && <Link className="btn btn-yellow" to={`/store/${u.product.slug}`}>Get it for {rupees(u.product.price)}</Link>}
            {u.courses?.length > 0 && <p>Included with: {u.courses.map((c: any) => c.name).join(', ')}.</p>}
          </aside>
        )}
        {g.faq?.length > 0 && <section className="bl-faq"><h2>Frequently asked questions</h2>{g.faq.map((f: any) => <div key={f.q}><h3>{f.q}</h3><Html html={f.a} /></div>)}</section>}
        {g.resources?.length > 0 && <section><h2>Resources</h2><ul>{g.resources.map((r: any) => <li key={r.url}><a href={r.url}>{r.label}</a></li>)}</ul></section>}
        <FileList files={g.files} base="/project-guides" slug={slug} />
        {g.related_projects?.length > 0 && <section className="bl-related"><h2>Related projects</h2><div className="bl-grid">{g.related_projects.map((r: Card) => <ItemCard key={r.slug} c={r} base="/projects" />)}</div></section>}
        {g.related_blogs?.length > 0 && <section><h2>Related articles</h2><ul>{g.related_blogs.map((b: any) => <li key={b.slug}><a href={`/blog/${b.slug}`}>{b.title}</a></li>)}</ul></section>}
      </article>
    </PageFrame>
  )
}

/** Guide HTML with a copy button on every code block (accessible, works on mobile). */
function CodeEnhancedHtml({ html }: { html: string }) {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const root = ref.current
    if (!root) return
    root.querySelectorAll('pre').forEach((pre) => {
      if (pre.parentElement?.classList.contains('code-wrap')) return
      const wrap = document.createElement('div')
      wrap.className = 'code-wrap'
      pre.replaceWith(wrap)
      wrap.appendChild(pre)
      pre.tabIndex = 0
      pre.setAttribute('role', 'region')
      pre.setAttribute('aria-label', 'Code example')
      const btn = document.createElement('button')
      btn.type = 'button'
      btn.className = 'code-copy'
      btn.textContent = 'Copy'
      btn.addEventListener('click', () => {
        void navigator.clipboard?.writeText(pre.innerText).then(() => {
          btn.textContent = 'Copied'
          setTimeout(() => (btn.textContent = 'Copy'), 1500)
        })
      })
      wrap.appendChild(btn)
    })
  }, [html])
  return <div ref={ref} className="bl-body" dangerouslySetInnerHTML={{ __html: html }} />
}
