import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { NotFound } from '../pages/NotFound'
import { PageFrame, Pager, SearchIcon } from '../content-pages/shared'
import { Html, useDetail } from './catalog'
import { Arrow } from './projects'
import { GuideCard } from './guides'
import { cartApi, errorText, fmtSize, get, initial, rupees, useCartData, type Card, type Paged } from './api'
import './projects.css'
import './shopui.css'

/* eslint-disable @typescript-eslint/no-explicit-any */
const PAGE = 12
const TYPE_LABEL: Record<string, string> = { digital: 'Instant download', physical: 'Printed', mixed: 'Printed + download' }
const saving = (c: { price?: string | null; original_price?: string | null }) => {
  const p = Number(c.price), o = Number(c.original_price)
  return o > p && p >= 0 ? Math.round((1 - p / o) * 100) : 0
}

function CartBadge() {
  return (
    <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="9" cy="20" r="1.5" /><circle cx="18" cy="20" r="1.5" /><path d="M2 3h3l2.7 12.4a2 2 0 0 0 2 1.6h7.6a2 2 0 0 0 2-1.5L21 8H6" />
    </svg>
  )
}

export function ProductCard({ c, i = 0 }: { c: Card; i?: number }) {
  const [state, setState] = useState<'idle' | 'busy' | 'error'>('idle')
  const { cart, ready: cartReady } = useCartData()
  const inCart = !!cart?.items.some((line) => line.product.id === c.id)
  const cut = saving(c)
  const img = c.image
  const add = async () => {
    if (inCart) return
    setState('busy')
    try { await cartApi.add(c.id!, 1); setState('idle') } catch { setState('error'); setTimeout(() => setState('idle'), 2200) }
  }
  return (
    <article className="pj-card st-card" style={{ ['--i' as string]: i }}>
      <Link to={`/store/${c.slug}`} className="pj-card-media st-media" tabIndex={-1} aria-hidden="true">
        {img ? <img src={img.src} alt={img.alt || c.title} loading="lazy" decoding="async" width={640} height={480} /> : <div className="st-ph"><span>{c.product_type === 'physical' ? 'BOOK' : (c.format || 'PDF').slice(0, 4)}</span></div>}
        <span className="st-type">{TYPE_LABEL[c.product_type ?? 'digital']}</span>
        {cut > 0 && <span className="st-save">Save {cut}%</span>}
      </Link>
      <div className="pj-card-body">
        {c.category && typeof c.category === 'object' && <p className="pj-cat">{c.category.name}</p>}
        <h2><Link to={`/store/${c.slug}`}>{c.title}</Link></h2>
        {c.short_description && <p className="pj-sum">{c.short_description}</p>}
        <div className="st-priceRow">
          <strong className="st-price">{c.is_free ? 'Free' : rupees(c.price)}</strong>
          {c.original_price && <s>{rupees(c.original_price)}</s>}
          <span className={`st-stock${c.in_stock ? '' : ' out'}`}>{c.stock_label}</span>
        </div>
        <div className="pj-foot st-foot">
          {inCart ? <Link to="/cart" className="st-add"><CartBadge /> Go to Cart</Link> : (
            <button type="button" className="st-add" onClick={() => void add()} disabled={!c.in_stock || state === 'busy' || !cartReady} aria-live="polite">
              <CartBadge /> {!cartReady ? 'Checking cart…' : state === 'error' ? 'Try again' : c.is_free ? 'Get free' : 'Add to cart'}
            </button>
          )}
          <Link to={`/store/${c.slug}`} className="pj-go" aria-label={`View ${c.title}`}>Details <Arrow /></Link>
        </div>
      </div>
    </article>
  )
}

/* ---------------------------------------------------------------- list */
export function StorePage() {
  const { cart } = useCartData()
  const [params, setParams] = useSearchParams()
  const page = Math.max(1, Number(params.get('page')) || 1)
  const category = params.get('category') ?? ''
  const type = params.get('type') ?? ''
  const ordering = params.get('ordering') ?? ''
  const free = params.get('free') ?? ''
  const q = params.get('q') ?? ''
  const seedRef = useRef<Record<string, any> | null>(null)
  if (seedRef.current === null) {
    const i = initial()
    seedRef.current = i && i.kind === 'store-list' ? i : {}
  }
  const seed = seedRef.current
  const [data, setData] = useState<Paged<Card> | null>(seed.results ? { count: seed.count, results: seed.results } : null)
  const [cats, setCats] = useState<{ name: string; slug: string; count: number }[]>(seed.categories ?? [])
  const [text, setText] = useState(q)
  const [error, setError] = useState(false)
  const [total, setTotal] = useState<number | null>(seed.count ?? null)
  const used = useRef(false)

  useEffect(() => {
    document.title = 'Store | Coding Hubs School of AI'
    window.scrollTo(0, 0)
  }, [])
  useEffect(() => {
    const s = seedRef.current!
    const unfiltered = !category && !type && !ordering && !free && !q
    if (!used.current && s.results && s.page === page && unfiltered) {
      used.current = true
      return
    }
    used.current = true
    let live = true
    setError(false)
    get<Paged<Card>>('/products/', { page, page_size: PAGE, ...(category ? { category } : {}), ...(type ? { type } : {}), ...(free ? { free: 1 } : {}), ...(q ? { q } : {}), ...(ordering ? { ordering } : {}) })
      .then((d) => { if (live) { setData(d); if (d.categories) setCats(d.categories as any); if (unfiltered) setTotal(d.count) } })
      .catch(() => live && setError(true))
    return () => { live = false }
  }, [page, category, type, ordering, free, q])
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
  const active = [category, type, free, q].filter(Boolean).length
  const reset = () => { setText(''); setParams(new URLSearchParams()) }

  return (
    <PageFrame wide>
      <section className="pj-hero st-hero">
        <span className="pj-blob b1" aria-hidden="true" /><span className="pj-blob b2" aria-hidden="true" /><span className="pj-grid-bg" aria-hidden="true" />
        <div className="pj-hero-in">
          <p className="pj-eyebrow">Coding Hubs Store</p>
          <h1>Notes, books and project files <span>made for learners</span></h1>
          <p className="pj-lead">Download study notes, project reports and source code the moment you pay, or order printed material.</p>
          <label className="pj-search">
            <span className="sr-only">Search the store</span><SearchIcon />
            <input type="search" placeholder="Search Python notes, Java notes, projects…" value={text} onChange={(e) => setText(e.target.value)} />
          </label>
          <Link to="/cart" className="st-cart-link" aria-label={`Open cart, ${cart?.count ?? 0} items`}>
            <CartBadge /> Cart <span>{cart?.count ?? 0}</span>
          </Link>
          <ul className="st-trust"><li>⚡ Instant digital delivery</li><li>🔒 Secure checkout with Razorpay</li><li>📚 Made by Coding Hubs trainers</li></ul>
        </div>
      </section>
      <div className="pj-filters">
        {cats.length > 0 && (
          <div className="pj-chips" role="group" aria-label="Category">
            <button type="button" className={!category ? 'on' : ''} aria-pressed={!category} onClick={() => go({ category: null })}>All{total !== null && !active ? ` (${total})` : ''}</button>
            {cats.map((c) => (<button key={c.slug} type="button" className={category === c.slug ? 'on' : ''} aria-pressed={category === c.slug} onClick={() => go({ category: category === c.slug ? null : c.slug })}>{c.name} ({c.count})</button>))}
          </div>
        )}
        <div className="pj-selects">
          <select aria-label="Type" value={type} onChange={(e) => go({ type: e.target.value || null })}>
            <option value="">All formats</option><option value="digital">Digital downloads</option><option value="physical">Printed</option><option value="mixed">Printed + digital</option>
          </select>
          <select aria-label="Sort" value={ordering} onChange={(e) => go({ ordering: e.target.value || null })}>
            <option value="">Newest first</option><option value="price_asc">Price: low to high</option><option value="price_desc">Price: high to low</option><option value="title">Title A–Z</option>
          </select>
          <label className="st-check"><input type="checkbox" checked={!!free} onChange={(e) => go({ free: e.target.checked ? '1' : null })} /> Free only</label>
          {active > 0 && <button type="button" className="pj-clear" onClick={reset}>Clear filters ({active})</button>}
        </div>
      </div>
      {error && <p className="bl-state" role="alert">We could not load the store. Please refresh the page.</p>}
      {!data && !error && <div className="pj-grid st-grid" aria-busy="true">{Array.from({ length: 8 }).map((_, i) => (<div key={i} className="pj-skel" />))}</div>}
      {data && data.count === 0 && (
        <div className="pj-empty"><strong>{active ? 'Nothing matches your search.' : 'The store is being stocked.'}</strong><p>{active ? 'Try different words or clear the filters.' : 'New notes and materials are coming soon.'}</p>{active > 0 && <button type="button" className="btn btn-yellow" onClick={reset}>Clear filters</button>}</div>
      )}
      <div className="pj-grid st-grid" key={`${page}-${category}-${type}-${free}-${q}-${ordering}`}>
        {data?.results.map((c, i) => (<ProductCard key={c.slug} c={c} i={i} />))}
      </div>
      {data && <Pager page={page} count={data.count} size={PAGE} onPage={(p) => go({ page: p > 1 ? String(p) : null })} />}
      <section className="pj-cta"><div><h2>Need help choosing?</h2><p>Talk to a Coding Hubs counsellor about the right material for your course.</p></div><a className="btn btn-yellow btn-lg" href="/#contact">Talk to us</a></section>
    </PageFrame>
  )
}

/* ---------------------------------------------------------------- product */
export function ProductPage() {
  const { data: p, missing } = useDetail('product', '/products')
  const [qty, setQty] = useState(1)
  const [active, setActive] = useState(0)
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null)
  const [busy, setBusy] = useState(false)
  const nav = useNavigate()
  const { cart, ready: cartReady } = useCartData()
  useEffect(() => setActive(0), [p?.slug])
  if (missing) return <NotFound />
  if (!p) return <PageFrame wide><div className="pj-detail-skel" aria-busy="true" role="status"><span className="sr-only">Loading…</span></div></PageFrame>
  const cut = saving(p)
  const inCart = !!cart?.items.some((line) => line.product.id === p.id)
  const images: { src: string; alt: string }[] = p.images ?? []
  const add = async (then?: () => void, openDrawer = true) => {
    if (inCart) return
    setBusy(true); setMsg(null)
    try { await cartApi.add(p.id, p.is_physical ? qty : 1, openDrawer); setMsg({ ok: true, text: 'Added to your cart.' }); then?.() } catch (e) { setMsg({ ok: false, text: errorText(e) }) } finally { setBusy(false) }
  }
  const buyNow = () => inCart ? nav('/checkout') : void add(() => nav('/checkout'), false)
  const details: [string, any][] = [['Author', p.author], ['Publisher', p.publisher], ['Edition', p.edition], ['Year', p.publication_year], ['Pages', p.pages], ['Language', p.language], ['Format', p.format], ['ISBN', p.isbn], ['SKU', p.sku]].filter(([, v]) => v) as any
  return (
    <PageFrame wide>
      <article className="st-detail">
        {p.preview && <p className="bl-preview" role="status">Preview. This page is not public.</p>}
        <Link to="/store" className="st-back"><span aria-hidden="true">←</span> Back to store</Link>
        <div className="st-top">
          <div className="st-gallery">
            <div className="st-stage">
              {images[active] ? <img src={images[active].src} alt={images[active].alt || p.title} width={1000} height={750} decoding="async" /> : <div className="st-ph big"><span>{p.product_type === 'physical' ? 'BOOK' : (p.format || 'PDF').slice(0, 4)}</span></div>}
              {cut > 0 && <span className="st-save">Save {cut}%</span>}
            </div>
            {images.length > 1 && (
              <div className="st-thumbs">{images.map((im, i) => (<button key={im.src} type="button" className={i === active ? 'on' : ''} onClick={() => setActive(i)} aria-label={`Show image ${i + 1}`}><img src={im.src} alt="" loading="lazy" /></button>))}</div>
            )}
          </div>
          <div className="st-info">
            {p.category && <p className="pj-cat">{p.category.name}</p>}
            <h1>{p.title}</h1>
            <p className="st-by">{[p.author && `By ${p.author}`, p.format, TYPE_LABEL[p.product_type]].filter(Boolean).join(' · ')}</p>
            {p.short_description && <p className="st-lead">{p.short_description}</p>}
            <div className="st-buy">
              <div className="st-priceBig"><strong>{p.is_free ? 'Free' : rupees(p.price)}</strong>{p.original_price && <s>{rupees(p.original_price)}</s>}{cut > 0 && <em>You save {cut}%</em>}</div>
              <p className={`st-stock${p.in_stock ? '' : ' out'}`}>● {p.stock_label}</p>
              {p.tax_note && <p className="bl-meta">{p.tax_note}</p>}
              {p.is_physical && p.shipping_flat && Number(p.shipping_flat) > 0 && <p className="bl-meta">Shipping {rupees(p.shipping_flat)}{p.free_shipping_over ? `, free over ${rupees(p.free_shipping_over)}` : ''}.</p>}
              {p.is_physical && p.in_stock && (
                <label className="shop-qty">Quantity<input type="number" min={1} max={10} value={qty} onChange={(e) => setQty(Math.min(10, Math.max(1, Number(e.target.value) || 1)))} /></label>
              )}
              <div className="st-actions">
                {inCart ? <Link to="/cart" className="btn btn-yellow btn-lg">Go to Cart</Link> : <button type="button" className="btn btn-yellow btn-lg" disabled={!p.in_stock || busy || !cartReady} onClick={() => void add()}>{!cartReady ? 'Checking cart…' : p.is_free ? 'Get for free' : 'Add to cart'}</button>}
                <button type="button" className="btn pj-btn-dark btn-lg" disabled={!p.in_stock || busy || !cartReady} onClick={buyNow}>Buy now</button>
              </div>
              {msg && <p className={msg.ok ? 'shop-ok' : 'shop-err'} role={msg.ok ? 'status' : 'alert'}>{msg.text} {msg.ok && <Link to="/cart">View cart →</Link>}</p>}
            </div>
            <ul className="st-perks">
              {p.is_digital && <li><span>⚡</span><div><strong>Instant download</strong><small>Files unlock as soon as your payment is confirmed.</small></div></li>}
              {p.is_physical && <li><span>📦</span><div><strong>Delivered to your address</strong><small>Tracking details are emailed when it ships.</small></div></li>}
              <li><span>🔒</span><div><strong>Secure payment</strong><small>Paid through Razorpay. We never see your card details.</small></div></li>
              <li><span>↩</span><div><strong>Clear policies</strong><small><Link to="/policies#rescheduling">Refund and return policy</Link> · <a href="/#contact">Contact us</a></small></div></li>
            </ul>
          </div>
        </div>

        <div className="st-body">
          {p.description_html && <section className="pj-sec"><h2>About this {p.is_digital && !p.is_physical ? 'download' : 'product'}</h2><Html html={p.description_html} /></section>}
          {p.included_materials?.length > 0 && (
            <section className="pj-sec"><h2>What is included</h2><ul className="pj-learn">{p.included_materials.map((m: string) => (<li key={m}><span aria-hidden="true">✓</span>{m}</li>))}</ul></section>
          )}
          {p.files?.length > 0 && (
            <section className="pj-sec"><h2>Files you get</h2>
              <ul className="st-files">{p.files.map((f: any) => (<li key={f.label}><span aria-hidden="true">📄</span><strong>{f.label}</strong><small>{fmtSize(f.size)}</small></li>))}</ul>
              <p className="bl-meta">Download links appear on the confirmation page, in your email and under My account → Downloads.</p>
            </section>
          )}
          {(details.length > 0 || p.topics?.length > 0) && (
            <section className="pj-sec"><h2>Details</h2>
              {details.length > 0 && <dl className="st-dl">{details.map(([k, v]) => (<div key={k}><dt>{k}</dt><dd>{String(v)}</dd></div>))}</dl>}
              {p.topics?.length > 0 && <ul className="pj-stack">{p.topics.map((t: string) => (<li key={t}>{t}</li>))}</ul>}
            </section>
          )}
        </div>

        {p.guides?.length > 0 && <section className="pj-more"><h2>Related project guides</h2><div className="pj-grid">{p.guides.map((g: Card, i: number) => (<GuideCard key={g.slug} c={g} i={i} />))}</div></section>}
        {p.related?.length > 0 && <section className="pj-more"><h2>You may also like</h2><div className="pj-grid st-grid">{p.related.map((r: Card, i: number) => (<ProductCard key={r.slug} c={r} i={i} />))}</div></section>}
      </article>

      <div className="st-bar" role="region" aria-label="Buy">
        <div><strong>{p.is_free ? 'Free' : rupees(p.price)}</strong>{p.original_price && <s>{rupees(p.original_price)}</s>}</div>
        <button type="button" className="btn btn-yellow" disabled={!p.in_stock || busy || !cartReady} onClick={buyNow}>{!cartReady ? 'Checking cart…' : p.is_free ? 'Get free' : 'Buy now'}</button>
      </div>
    </PageFrame>
  )
}
