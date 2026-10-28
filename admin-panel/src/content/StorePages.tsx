import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { Link, useParams } from 'react-router-dom'
import { adminApi, type Paged } from '../api'
import { ConfirmDelete } from './EditorShell'
import { CheckField, Field, NumberField, SelectField, Text } from './fields'
import { fmtDate } from './format'

/* eslint-disable @typescript-eslint/no-explicit-any */
const inr = (v: string | number) => `₹${Number(v).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
const nice = (s: string) => s.replace(/_/g, ' ').replace(/^./, (c) => c.toUpperCase())
const errText = (e: any, d = 'That did not work.') => { const r = e?.response?.data; return r?.detail ?? (r && typeof r === 'object' ? Object.values(r).flat().join(' ') : d) }

function Pager({ page, count, size = 20, onPage }: { page: number; count: number; size?: number; onPage: (p: number) => void }) {
  const pages = Math.max(1, Math.ceil(count / size))
  if (pages <= 1) return null
  return <div className="ad-pager"><button type="button" className="ad-btn" disabled={page <= 1} onClick={() => onPage(page - 1)}>Previous</button><span>Page {page} of {pages} · {count} items</span><button type="button" className="ad-btn" disabled={page >= pages} onClick={() => onPage(page + 1)}>Next</button></div>
}

/* ---------------- overview ---------------- */
export function StoreOverview() {
  const [s, setS] = useState<any>(null)
  const [err, setErr] = useState(false)
  useEffect(() => { adminApi.get('/shop/stats/').then((r) => setS(r.data)).catch(() => setErr(true)) }, [])
  const tile = (label: string, value: string | number, to?: string) => (
    <div className="ad-card"><p>{label}</p><strong>{to ? <Link to={to}>{value}</Link> : value}</strong></div>
  )
  return (
    <>
      <div className="ad-head"><h1 className="ad-h1">Store overview</h1>
        <div className="ad-head-actions"><Link className="ad-btn ad-btn-primary" to="/products/create">+ New product</Link><Link className="ad-btn" to="/projects/create">+ New project</Link><Link className="ad-btn" to="/project-guides/create">+ New guide</Link></div>
      </div>
      {err && <div className="ad-notice error" role="alert">Could not load the statistics.</div>}
      {!s && !err && <p className="ad-muted" role="status">Loading…</p>}
      {s && (
        <>
          {!s.payments_configured && <div className="ad-note" role="status">Online payments are not configured: set the Razorpay keys on the server (see DEPLOY.md). Until then customers can only order free items.</div>}
          {s.payments_configured && !s.payments_live && <div className="ad-note" role="status">Payments are in <strong>test mode</strong>. No real money moves until live keys are set.</div>}
          <div className="ad-cards">
            {tile('Projects', `${s.projects.published} / ${s.projects.total}`, '/projects')}
            {tile('Guides', `${s.guides.published} / ${s.guides.total}`, '/project-guides')}
            {tile('Products', `${s.products.published} / ${s.products.total}`, '/products')}
            {tile('Paid orders', s.orders.paid, '/store-orders')}
            {tile('Pending payment', s.orders.pending, '/store-orders')}
            {tile('Digital sales', `${s.digital_sales.orders} · ${inr(s.digital_sales.amount)}`)}
            {tile('Physical sales', `${s.physical_sales.orders} · ${inr(s.physical_sales.amount)}`)}
          </div>
          <p className="ad-hint">Published / total. Sales figures count paid orders only and come straight from the database.</p>
          <div className="ad-grid2">
            <section className="ad-panel"><h2>Low stock</h2>
              {s.low_stock.length === 0 ? <p className="ad-muted">No stock alerts.</p> : <ul className="ad-revs">{s.low_stock.map((p: any) => <li key={p.id}><span>{p.title}</span><strong>{p.stock} left</strong></li>)}</ul>}
            </section>
            <section className="ad-panel"><h2>Recent orders</h2>
              {s.recent_orders.length === 0 ? <p className="ad-muted">No orders yet.</p> : <ul className="ad-revs">{s.recent_orders.map((o: any) => <li key={o.number}><Link to={`/store-orders/${o.number}`}>{o.number}</Link><span>{o.name} · {inr(o.total)} · <span className={`ad-badge st-${o.payment_status}`}>{nice(o.payment_status)}</span></span></li>)}</ul>}
            </section>
          </div>
        </>
      )}
    </>
  )
}

/* ---------------- orders ---------------- */
export function StoreOrders() {
  const [f, setF] = useState({ q: '', status: '', payment_status: '', product_type: '', date_from: '', date_to: '' })
  const [page, setPage] = useState(1)
  const [data, setData] = useState<Paged<any> | null>(null)
  const [err, setErr] = useState('')
  const load = useCallback(() => {
    adminApi.get('/store-orders/', { params: { page, ...Object.fromEntries(Object.entries(f).filter(([, v]) => v)) } }).then((r) => { setData(r.data); setErr('') }).catch(() => setErr('Could not load orders.'))
  }, [f, page])
  useEffect(() => { const t = setTimeout(load, 250); return () => clearTimeout(t) }, [load])
  const set = (k: string) => (e: { target: { value: string } }) => { setF({ ...f, [k]: e.target.value }); setPage(1) }
  return (
    <>
      <h1 className="ad-h1">Orders</h1>
      <div className="ad-filters">
        <input type="search" placeholder="Order no., name, email, phone" value={f.q} onChange={set('q')} aria-label="Search orders" />
        <select value={f.payment_status} onChange={set('payment_status')} aria-label="Payment status"><option value="">Any payment</option>{['unpaid', 'pending', 'paid', 'failed', 'partially_refunded', 'refunded'].map((s) => <option key={s} value={s}>{nice(s)}</option>)}</select>
        <select value={f.status} onChange={set('status')} aria-label="Order status"><option value="">Any status</option>{['pending_payment', 'paid', 'processing', 'shipped', 'delivered', 'cancelled', 'expired', 'refund_requested', 'partially_refunded', 'refunded'].map((s) => <option key={s} value={s}>{nice(s)}</option>)}</select>
        <select value={f.product_type} onChange={set('product_type')} aria-label="Product type"><option value="">Digital and physical</option><option value="digital">Has digital</option><option value="physical">Has physical</option></select>
        <label className="ad-inline">From <input type="date" value={f.date_from} onChange={set('date_from')} /></label>
        <label className="ad-inline">To <input type="date" value={f.date_to} onChange={set('date_to')} /></label>
      </div>
      {err && <div className="ad-notice error" role="alert">{err}</div>}
      {!data && !err && <p className="ad-muted" role="status">Loading…</p>}
      {data && data.results.length === 0 && <div className="ad-empty"><p>No orders match.</p></div>}
      {data && data.results.length > 0 && (
        <div className="ad-tablewrap"><table className="ad-table">
          <thead><tr><th>Order</th><th>Date</th><th>Customer</th><th>Items</th><th>Subtotal</th><th>Discount</th><th>Tax</th><th>Shipping</th><th>Total</th><th>Payment</th><th>Status</th></tr></thead>
          <tbody>{data.results.map((o: any) => (
            <tr key={o.number}>
              <td><Link to={`/store-orders/${o.number}`}><strong>{o.number}</strong></Link></td><td>{fmtDate(o.created_at, true)}</td>
              <td>{o.name}<br /><small className="ad-muted">{o.email}</small></td>
              <td>{o.items.map((i: any) => `${i.quantity}× ${i.title}`).join(', ')}</td>
              <td>{inr(o.subtotal)}</td><td>{Number(o.discount) ? `−${inr(o.discount)}` : '—'}</td><td>{inr(o.tax)}</td><td>{inr(o.shipping)}</td><td><strong>{inr(o.total)}</strong></td>
              <td><span className={`ad-badge st-${o.payment_status}`}>{nice(o.payment_status)}</span></td><td><span className="ad-badge">{nice(o.status)}</span></td>
            </tr>))}</tbody>
        </table></div>
      )}
      {data && <Pager page={page} count={data.count} onPage={setPage} />}
    </>
  )
}

export function StoreOrderDetail() {
  const { number } = useParams<{ number: string }>()
  const [o, setO] = useState<any>(null)
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null)
  const [busy, setBusy] = useState(false)
  const [ship, setShip] = useState({ carrier: '', tracking_number: '' })
  const [refund, setRefund] = useState({ amount: '', reason: '', restock: false })
  const [note, setNote] = useState('')
  const load = useCallback(() => { adminApi.get(`/store-orders/${number}/`).then((r) => { setO(r.data); setNote(r.data.admin_note) }).catch(() => setMsg({ ok: false, text: 'Order not found.' })) }, [number])
  useEffect(load, [load])
  const act = async (path: string, body: object, ok: string, confirm?: string) => {
    if (confirm && !window.confirm(confirm)) return
    setBusy(true); setMsg(null)
    try { const r = await adminApi.post(`/store-orders/${number}/${path}/`, body); setO(r.data); setMsg({ ok: true, text: ok }) } catch (e) { setMsg({ ok: false, text: errText(e) }) } finally { setBusy(false) }
  }
  if (!o) return msg ? <div className="ad-notice error" role="alert">{msg.text}</div> : <p className="ad-muted" role="status">Loading…</p>
  const paid = o.payment_status === 'paid' || o.payment_status === 'partially_refunded'
  const nexts: Record<string, [string, string][]> = { paid: [['processing', 'Start processing']], processing: [['shipped', 'Mark shipped']], shipped: [['delivered', 'Mark delivered']], partially_refunded: [['processing', 'Start processing']], refund_requested: [['processing', 'Resume processing']] }
  return (
    <>
      <p className="ad-crumb"><Link to="/store-orders">Orders</Link> › {o.number}</p>
      <div className="ad-head"><h1 className="ad-h1">{o.number}</h1><span className={`ad-badge st-${o.payment_status}`}>{nice(o.payment_status)}</span></div>
      {msg && <div className={`ad-notice ${msg.ok ? 'ok' : 'error'}`} role={msg.ok ? 'status' : 'alert'}>{msg.text}</div>}
      <div className="ad-editor-grid">
        <div className="ad-editor-main">
          <section className="ad-panel"><h2>Items</h2>
            <table className="ad-table"><thead><tr><th>Item</th><th>SKU</th><th>Qty</th><th>Unit</th><th>Tax</th><th>Total</th></tr></thead>
              <tbody>{o.items.map((i: any) => <tr key={i.id}><td>{i.title}</td><td>{i.sku}</td><td>{i.quantity}</td><td>{inr(i.unit_price)}</td><td>{inr(i.tax)}</td><td>{inr(i.line_total)}</td></tr>)}</tbody></table>
            <dl className="shop-dl"><dt>Subtotal</dt><dd>{inr(o.subtotal)}</dd><dt>Discount{o.coupon_code ? ` (${o.coupon_code})` : ''}</dt><dd>{inr(o.discount)}</dd><dt>Tax ({o.tax_mode})</dt><dd>{inr(o.tax)}</dd><dt>Shipping</dt><dd>{inr(o.shipping)}</dd><dt><strong>Total</strong></dt><dd><strong>{inr(o.total)}</strong></dd>{Number(o.refunded_amount) > 0 && <><dt>Refunded</dt><dd>{inr(o.refunded_amount)}</dd></>}</dl>
          </section>
          <section className="ad-panel"><h2>Payments</h2>
            {o.payments.length === 0 ? <p className="ad-muted">No gateway payment (free order or not started).</p> : <ul className="ad-revs">{o.payments.map((p: any, i: number) => <li key={i}><span>{p.provider} · {p.provider_payment_id || p.provider_order_id}</span><span>{inr(p.amount)} · {p.status}{p.signature_verified ? ' · verified' : ''}</span></li>)}</ul>}
            {o.refunds.length > 0 && <><h3 className="ad-sub">Refunds</h3><ul className="ad-revs">{o.refunds.map((r: any, i: number) => <li key={i}><span>{fmtDate(r.created_at, true)} {r.reason && `· ${r.reason}`}</span><strong>{inr(r.amount)}</strong></li>)}</ul></>}
          </section>
          <section className="ad-panel"><h2>Internal note</h2>
            <textarea className="ad-input" rows={3} value={note} onChange={(e) => setNote(e.target.value)} aria-label="Internal note" />
            <button type="button" className="ad-btn" onClick={() => void adminApi.patch(`/store-orders/${number}/`, { admin_note: note }).then(() => setMsg({ ok: true, text: 'Note saved.' }))}>Save note</button>
          </section>
        </div>
        <aside className="ad-editor-side">
          <section className="ad-panel"><h2>Customer</h2><p><strong>{o.name}</strong><br />{o.email}<br />{o.phone || '—'}<br /><small className="ad-muted">{o.customer.username ? `Account: ${o.customer.username}` : 'Guest checkout'}</small></p>
            {o.has_physical && <><h3 className="ad-sub">Ship to</h3><p>{[o.shipping_address.line1, o.shipping_address.line2, o.shipping_address.city, o.shipping_address.state, o.shipping_address.postal_code].filter(Boolean).join(', ')}</p></>}
            {o.customer_note && <p className="ad-hint">Customer note: {o.customer_note}</p>}
          </section>
          <section className="ad-panel"><h2>Status</h2>
            <p><span className="ad-badge">{nice(o.status)}</span> · fulfilment {nice(o.fulfilment_status)}</p>
            {o.tracking_number && <p>Tracking: {o.carrier} {o.tracking_number}</p>}
            {paid && o.has_physical && (nexts[o.status] ?? []).map(([to, label]) => (
              <div key={to}>
                {to === 'shipped' && <><Text id="carrier" label="Carrier" value={ship.carrier} onChange={(v) => setShip({ ...ship, carrier: v })} /><Text id="tracking" label="Tracking number" value={ship.tracking_number} onChange={(v) => setShip({ ...ship, tracking_number: v })} /></>}
                <button type="button" className="ad-btn ad-btn-primary" disabled={busy} onClick={() => void act('status', { status: to, ...(to === 'shipped' ? ship : {}) }, `Order is now ${nice(to).toLowerCase()}.`)}>{label}</button>
              </div>
            ))}
            {!['cancelled', 'expired', 'refunded', 'shipped', 'delivered'].includes(o.status) && <button type="button" className="ad-btn" disabled={busy} onClick={() => void act('cancel', { reason: 'cancelled by admin' }, 'Order cancelled and stock released.', 'Cancel this order? Stock is released. If it was paid, refund it separately.')}>Cancel order</button>}
          </section>
          {paid && (
            <section className="ad-panel"><h2>Refund</h2>
              <NumberField id="ramount" label={`Amount (max ${inr(Number(o.total) - Number(o.refunded_amount))})`} step="0.01" value={refund.amount} onChange={(v) => setRefund({ ...refund, amount: v })} hint="Empty = refund everything that is left." />
              <Text id="rreason" label="Reason" value={refund.reason} onChange={(v) => setRefund({ ...refund, reason: v })} />
              {o.has_physical && <CheckField id="restock" label="Put returned physical items back in stock" checked={refund.restock} onChange={(v) => setRefund({ ...refund, restock: v })} />}
              <button type="button" className="ad-btn ad-btn-danger" disabled={busy} onClick={() => void act('refund', refund, 'Refund processed with the payment gateway.', 'Refund through the payment gateway? A full refund also removes the customer’s access to the files.')}>Refund</button>
            </section>
          )}
        </aside>
      </div>
    </>
  )
}

/* ---------------- inventory ---------------- */
export function Inventory() {
  const [low, setLow] = useState(false)
  const [q, setQ] = useState('')
  const [page, setPage] = useState(1)
  const [data, setData] = useState<Paged<any> | null>(null)
  const [adj, setAdj] = useState<any>(null)
  const [hist, setHist] = useState<any[] | null>(null)
  const [msg, setMsg] = useState('')
  const load = useCallback(() => { adminApi.get('/inventory/', { params: { page, q: q || undefined, low: low ? 1 : undefined } }).then((r) => setData(r.data)).catch(() => setMsg('Could not load inventory.')) }, [page, q, low])
  useEffect(() => { const t = setTimeout(load, 250); return () => clearTimeout(t) }, [load])
  const save = async (e: FormEvent) => {
    e.preventDefault()
    try { await adminApi.post(`/inventory/${adj.id}/adjust/`, { delta: adj.delta, note: adj.note, reason: Number(adj.delta) > 0 ? 'restock' : 'adjustment' }); setAdj(null); load() } catch (err) { setMsg(errText(err)) }
  }
  return (
    <>
      <h1 className="ad-h1">Inventory</h1>
      <p className="ad-hint">Physical products that track stock. Stock is reserved when a customer starts paying and released if the order is cancelled, fails or expires. Digital products have no stock.</p>
      <div className="ad-filters"><input type="search" placeholder="Search name or SKU" value={q} onChange={(e) => { setQ(e.target.value); setPage(1) }} aria-label="Search inventory" /><label className="ad-inline"><input type="checkbox" checked={low} onChange={(e) => { setLow(e.target.checked); setPage(1) }} /> Low stock only</label></div>
      {msg && <div className="ad-notice error" role="alert">{msg}</div>}
      {data && data.results.length === 0 && <div className="ad-empty"><p>No tracked physical products.</p></div>}
      {data && data.results.length > 0 && (
        <div className="ad-tablewrap"><table className="ad-table"><thead><tr><th>Product</th><th>SKU</th><th>In stock</th><th>Alert at</th><th>Status</th><th /></tr></thead>
          <tbody>{data.results.map((p: any) => (
            <tr key={p.id}><td><Link to={`/products/edit/${p.id}`}>{p.title}</Link></td><td>{p.sku}</td><td><strong>{p.stock}</strong></td><td>{p.threshold}</td>
              <td><span className={`ad-badge ${p.status === 'ok' ? 'st-published' : p.status === 'low' ? 'tone-pin' : 'st-failed'}`}>{p.status === 'ok' ? 'OK' : p.status === 'low' ? 'Low' : 'Out of stock'}</span></td>
              <td className="ad-actions"><button type="button" className="ad-link" onClick={() => setAdj({ id: p.id, title: p.title, delta: '', note: '' })}>Adjust</button><button type="button" className="ad-link" onClick={() => void adminApi.get(`/inventory/${p.id}/movements/`).then((r) => setHist(r.data))}>History</button></td></tr>
          ))}</tbody></table></div>
      )}
      {data && <Pager page={page} count={data.count} onPage={setPage} />}
      {adj && (
        <div className="ad-modal" role="dialog" aria-modal="true" aria-label="Adjust stock" onClick={(e) => e.target === e.currentTarget && setAdj(null)}>
          <form className="ad-modal-card" onSubmit={(e) => void save(e)}>
            <h2>Adjust stock: {adj.title}</h2>
            <NumberField id="delta" label="Change (+ add, − remove)" value={adj.delta} onChange={(v) => setAdj({ ...adj, delta: v })} />
            <Text id="anote" label="Note" value={adj.note} onChange={(v) => setAdj({ ...adj, note: v })} placeholder="e.g. new delivery, damaged copy" />
            <div className="ad-modal-actions"><button type="button" className="ad-btn" onClick={() => setAdj(null)}>Cancel</button><button className="ad-btn ad-btn-primary" disabled={!adj.delta}>Save</button></div>
          </form>
        </div>
      )}
      {hist && (
        <div className="ad-modal" role="dialog" aria-modal="true" aria-label="Stock history" onClick={(e) => e.target === e.currentTarget && setHist(null)}>
          <div className="ad-modal-card"><h2>Stock history</h2>
            {hist.length === 0 ? <p className="ad-muted">No movements yet.</p> : <ul className="ad-revs">{hist.map((m, i) => <li key={i}><span>{fmtDate(m.created_at, true)} · {nice(m.reason)}{m.order ? ` · ${m.order}` : ''}{m.note ? ` · ${m.note}` : ''}</span><strong>{m.delta > 0 ? '+' : ''}{m.delta} → {m.balance_after}</strong></li>)}</ul>}
            <div className="ad-modal-actions"><button type="button" className="ad-btn" onClick={() => setHist(null)}>Close</button></div>
          </div>
        </div>
      )}
    </>
  )
}

/* ---------------- customers ---------------- */
export function Customers() {
  const [q, setQ] = useState('')
  const [page, setPage] = useState(1)
  const [data, setData] = useState<Paged<any> | null>(null)
  useEffect(() => { const t = setTimeout(() => adminApi.get('/customers/', { params: { page, q: q || undefined } }).then((r) => setData(r.data)), 250); return () => clearTimeout(t) }, [q, page])
  return (
    <>
      <h1 className="ad-h1">Customers</h1>
      <p className="ad-hint">Registered customers who have placed an order. Guest orders appear in Orders.</p>
      <div className="ad-filters"><input type="search" placeholder="Search name or email" value={q} onChange={(e) => { setQ(e.target.value); setPage(1) }} aria-label="Search customers" /></div>
      {data && data.results.length === 0 && <div className="ad-empty"><p>No customers yet.</p></div>}
      {data && data.results.length > 0 && <div className="ad-tablewrap"><table className="ad-table"><thead><tr><th>Customer</th><th>Email</th><th>Phone</th><th>Joined</th><th>Orders</th><th>Paid</th><th>Spent</th></tr></thead>
        <tbody>{data.results.map((c: any) => <tr key={c.id}><td><strong>{c.username}</strong></td><td>{c.email}</td><td>{c.phone || '—'}</td><td>{fmtDate(c.joined)}</td><td>{c.orders}</td><td>{c.paid_orders}</td><td>{inr(c.spent)}</td></tr>)}</tbody></table></div>}
      {data && <Pager page={page} count={data.count} onPage={setPage} />}
    </>
  )
}

/* ---------------- coupons ---------------- */
const blankCoupon = { code: '', discount_type: 'percent', value: '', max_discount: '', min_purchase: '0', valid_from: '', valid_until: '', usage_limit: '', per_customer_limit: '', is_active: true, product_ids: [] as number[], category_ids: [] as number[] }
const toLocal = (iso: string | null) => (iso ? new Date(new Date(iso).getTime() - new Date(iso).getTimezoneOffset() * 60000).toISOString().slice(0, 16) : '')
export function Coupons() {
  const [rows, setRows] = useState<any[] | null>(null)
  const [edit, setEdit] = useState<any>(null)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [del, setDel] = useState<any>(null)
  const [products, setProducts] = useState<any[]>([])
  const load = useCallback(() => { adminApi.get('/coupons/').then((r) => setRows(r.data.results ?? r.data)) }, [])
  useEffect(() => { load(); adminApi.get('/products/', { params: { page_size: 100 } }).then((r) => setProducts(r.data.results)) }, [load])
  const open = (c?: any) => { setErrors({}); setEdit(c ? { ...blankCoupon, ...c, valid_from: toLocal(c.valid_from), valid_until: toLocal(c.valid_until), max_discount: c.max_discount ?? '', usage_limit: c.usage_limit ?? '', per_customer_limit: c.per_customer_limit ?? '', product_ids: c.eligible_product_ids ?? [], category_ids: c.eligible_category_ids ?? [] } : { ...blankCoupon }) }
  const save = async (e: FormEvent) => {
    e.preventDefault()
    const b: any = { ...edit, valid_from: edit.valid_from ? new Date(edit.valid_from).toISOString() : null, valid_until: edit.valid_until ? new Date(edit.valid_until).toISOString() : null }
    for (const k of ['max_discount', 'usage_limit', 'per_customer_limit']) if (b[k] === '') b[k] = null
    try { if (edit.id) await adminApi.patch(`/coupons/${edit.id}/`, b); else await adminApi.post('/coupons/', b); setEdit(null); load() } catch (err: any) { const d = err?.response?.data ?? {}; setErrors(Object.fromEntries(Object.entries(d).map(([k, v]) => [k, Array.isArray(v) ? String(v[0]) : String(v)]))) }
  }
  const set = (k: string) => (v: any) => setEdit({ ...edit, [k]: v })
  return (
    <>
      <div className="ad-head"><h1 className="ad-h1">Coupons</h1><button type="button" className="ad-btn ad-btn-primary" onClick={() => open()}>+ New coupon</button></div>
      {rows && rows.length === 0 && <div className="ad-empty"><p>No coupons yet.</p></div>}
      {rows && rows.length > 0 && <div className="ad-tablewrap"><table className="ad-table"><thead><tr><th>Code</th><th>Discount</th><th>Valid</th><th>Used</th><th>Status</th><th /></tr></thead>
        <tbody>{rows.map((c) => <tr key={c.id}><td><strong>{c.code}</strong></td><td>{c.discount_type === 'percent' ? `${c.value}%` : inr(c.value)}{c.max_discount ? ` (max ${inr(c.max_discount)})` : ''}{Number(c.min_purchase) ? ` · min ${inr(c.min_purchase)}` : ''}</td><td>{c.valid_from ? fmtDate(c.valid_from) : 'Now'} → {c.valid_until ? fmtDate(c.valid_until) : 'No end'}</td><td>{c.used}{c.usage_limit ? ` / ${c.usage_limit}` : ''}</td><td><span className={`ad-badge ${c.is_active ? 'st-published' : ''}`}>{c.is_active ? 'Active' : 'Off'}</span></td>
          <td className="ad-actions"><button type="button" className="ad-link" onClick={() => open(c)}>Edit</button><button type="button" className="ad-link ad-danger" onClick={() => setDel(c)}>Delete</button></td></tr>)}</tbody></table></div>}
      {edit && (
        <div className="ad-modal" role="dialog" aria-modal="true" aria-label="Coupon" onClick={(e) => e.target === e.currentTarget && setEdit(null)}>
          <form className="ad-modal-card ad-wide" onSubmit={(e) => void save(e)}>
            <h2>{edit.id ? 'Edit coupon' : 'New coupon'}</h2>
            <Text id="c-code" label="Code" value={edit.code} onChange={(v) => set('code')(v.toUpperCase())} error={errors.code} max={40} />
            <SelectField id="c-type" label="Type" value={edit.discount_type} onChange={set('discount_type')} options={[['percent', 'Percentage'], ['fixed', 'Fixed amount (₹)']]} />
            <NumberField id="c-value" label={edit.discount_type === 'percent' ? 'Percent off' : 'Amount off (₹)'} step="0.01" value={edit.value} onChange={set('value')} error={errors.value} />
            <NumberField id="c-max" label="Maximum discount (₹)" step="0.01" value={edit.max_discount} onChange={set('max_discount')} error={errors.max_discount} />
            <NumberField id="c-min" label="Minimum purchase (₹)" step="0.01" value={edit.min_purchase} onChange={set('min_purchase')} />
            <Field label="Valid from" htmlFor="c-from" error={errors.valid_from}><input id="c-from" type="datetime-local" className="ad-input" value={edit.valid_from} onChange={(e) => set('valid_from')(e.target.value)} /></Field>
            <Field label="Valid until" htmlFor="c-until" error={errors.valid_until}><input id="c-until" type="datetime-local" className="ad-input" value={edit.valid_until} onChange={(e) => set('valid_until')(e.target.value)} /></Field>
            <NumberField id="c-limit" label="Total uses allowed" value={edit.usage_limit} onChange={set('usage_limit')} hint="Empty = unlimited. A cancelled order gives its use back." />
            <NumberField id="c-per" label="Uses per customer" value={edit.per_customer_limit} onChange={set('per_customer_limit')} />
            <Field label="Only these products (optional)" htmlFor="c-prod" hint="Empty = every product."><select id="c-prod" multiple size={5} className="ad-input" value={edit.product_ids.map(String)} onChange={(e) => set('product_ids')([...e.target.selectedOptions].map((o) => Number(o.value)))}>{products.map((p) => <option key={p.id} value={p.id}>{p.title}</option>)}</select></Field>
            <CheckField id="c-active" label="Active" checked={edit.is_active} onChange={set('is_active')} />
            <div className="ad-modal-actions"><button type="button" className="ad-btn" onClick={() => setEdit(null)}>Cancel</button><button className="ad-btn ad-btn-primary">Save coupon</button></div>
          </form>
        </div>
      )}
      {del && <ConfirmDelete title={del.code} onCancel={() => setDel(null)} onConfirm={() => void adminApi.delete(`/coupons/${del.id}/`).then(() => { setDel(null); load() })} />}
    </>
  )
}

/* ---------------- store settings ---------------- */
export function StoreSettings() {
  const [s, setS] = useState<any>(null)
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null)
  const [errors, setErrors] = useState<Record<string, string>>({})
  useEffect(() => { adminApi.get('/store-settings/').then((r) => setS(r.data)) }, [])
  if (!s) return <p className="ad-muted" role="status">Loading…</p>
  const set = (k: string) => (v: any) => setS({ ...s, [k]: v })
  const save = async (e: FormEvent) => {
    e.preventDefault()
    try { const r = await adminApi.patch('/store-settings/', s); setS(r.data); setErrors({}); setMsg({ ok: true, text: 'Settings saved.' }) } catch (err: any) { const d = err?.response?.data ?? {}; setErrors(Object.fromEntries(Object.entries(d).map(([k, v]) => [k, Array.isArray(v) ? String(v[0]) : String(v)]))); setMsg({ ok: false, text: 'Please fix the highlighted fields.' }) }
  }
  const policy = (k: string, label: string) => <Text key={k} id={k} label={label} textarea rows={5} value={s[k] ?? ''} onChange={set(k)} error={errors[k]} hint="Basic formatting is kept; scripts are removed." />
  return (
    <form onSubmit={(e) => void save(e)} className="ad-editor-main">
      <h1 className="ad-h1">Store settings</h1>
      {msg && <div className={`ad-notice ${msg.ok ? 'ok' : 'error'}`} role={msg.ok ? 'status' : 'alert'}>{msg.text}</div>}
      <section className="ad-panel"><h2>Money</h2>
        <Text id="currency" label="Currency" value={s.currency} onChange={(v) => set('currency')(v.toUpperCase())} max={3} error={errors.currency} />
        <SelectField id="tax_mode" label="Tax" value={s.tax_mode} onChange={set('tax_mode')} options={[['none', 'No tax charged'], ['exclusive', 'Tax added on top of prices'], ['inclusive', 'Prices include tax']]} hint="Confirm the correct treatment with your accountant before charging tax." />
        <NumberField id="default_tax_rate" label="Default tax rate (%)" step="0.01" value={s.default_tax_rate} onChange={set('default_tax_rate')} error={errors.default_tax_rate} hint="Applied when a product has no rate of its own. Not pre-filled: set only an approved rate." />
        <NumberField id="shipping_flat" label="Flat shipping charge (₹)" step="0.01" value={s.shipping_flat} onChange={set('shipping_flat')} hint="Charged once per order that has printed items." />
        <NumberField id="free_shipping_over" label="Free shipping over (₹)" step="0.01" value={s.free_shipping_over ?? ''} onChange={(v) => set('free_shipping_over')(v === '' ? null : v)} />
        <CheckField id="allow_guest_checkout" label="Allow guest checkout (no account needed)" checked={s.allow_guest_checkout} onChange={set('allow_guest_checkout')} />
      </section>
      <section className="ad-panel"><h2>Contact and e-mail</h2>
        <Text id="contact_email" label="Store contact e-mail" value={s.contact_email} onChange={set('contact_email')} error={errors.contact_email} />
        <Text id="contact_phone" label="Store contact phone" value={s.contact_phone} onChange={set('contact_phone')} />
        <Text id="notify_email" label="Notify this address of every paid order" value={s.notify_email} onChange={set('notify_email')} error={errors.notify_email} />
        <CheckField id="email_orders" label="Send order e-mails to customers" checked={s.email_orders} onChange={set('email_orders')} hint="Needs working e-mail settings on the server (see DEPLOY.md)." />
      </section>
      <section className="ad-panel"><h2>Policies</h2>
        {policy('refund_policy', 'Refund policy')}{policy('return_policy', 'Return policy (printed items)')}{policy('digital_delivery_policy', 'Digital delivery policy')}{policy('shipping_policy', 'Shipping policy')}
        <p className="ad-hint">Have these reviewed by the business owner before launch.</p>
      </section>
      <button className="ad-btn ad-btn-primary">Save settings</button>
    </form>
  )
}
