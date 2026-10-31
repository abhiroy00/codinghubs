import { useEffect, useState } from 'react'
import { Link, Navigate, useLocation } from 'react-router-dom'
import { PageFrame, Pager } from '../content-pages/shared'
import { DownloadList } from './cart'
import { errorText, fmtSize, rupees, shop, useCartData } from './api'

/* eslint-disable @typescript-eslint/no-explicit-any */
const nice = (s: string) => s.replace(/_/g, ' ').replace(/^./, (c) => c.toUpperCase())

function AccountFrame({ children, title, openToAll = false }: { children: React.ReactNode; title: string; openToAll?: boolean }) {
  const loc = useLocation()
  useEffect(() => {
    document.title = `${title} | Coding Hubs School of AI`
    const m = document.createElement('meta')
    m.name = 'robots'
    m.content = 'noindex, nofollow'
    document.head.appendChild(m)
    return () => m.remove()
  }, [title])
  if (!openToAll && !localStorage.getItem('ch_access')) return <Navigate to="/login" replace state={{ from: loc.pathname }} />
  return (
    <PageFrame store>
      {localStorage.getItem('ch_access') && (
        <nav className="shop-tabs" aria-label="My account">
          <Link to="/my-account">Profile</Link>
          <Link to="/my-account/orders">Orders</Link>
          <Link to="/my-account/downloads">Downloads</Link>
          <Link to="/cart">Cart</Link>
        </nav>
      )}
      {children}
    </PageFrame>
  )
}

export function MyAccount() {
  const [me, setMe] = useState<any>(null)
  const [claim, setClaim] = useState({ order_number: '', token: '' })
  const [msg, setMsg] = useState('')
  useEffect(() => {
    shop.get('/auth/me/').then((r) => setMe(r.data)).catch(() => undefined)
  }, [])
  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setMsg('')
    try {
      await shop.post('/my-account/claim-order/', claim)
      setMsg('Order added to your account.')
      setClaim({ order_number: '', token: '' })
    } catch {
      setMsg('We could not find a guest order with that number and code.')
    }
  }
  return (
    <AccountFrame title="My account">
      <h1>My account</h1>
      {me && <dl className="shop-dl"><dt>Username</dt><dd>{me.username}</dd>{me.email && <><dt>Email</dt><dd>{me.email}</dd></>}{me.phone && <><dt>Phone</dt><dd>{me.phone}</dd></>}</dl>}
      <p><Link className="btn btn-yellow" to="/my-account/orders">View my orders</Link> <Link className="btn btn-ghost-dark" to="/my-account/downloads">My downloads</Link></p>
      <section>
        <h2>Bought as a guest?</h2>
        <p className="bl-meta">Enter the order number and the private code from the link in your confirmation email (the part after <code>token=</code>) to add that order to this account.</p>
        <form className="shop-form shop-inline" onSubmit={(e) => void submit(e)}>
          <label>Order number<input value={claim.order_number} onChange={(e) => setClaim({ ...claim, order_number: e.target.value.trim() })} /></label>
          <label>Private code<input value={claim.token} onChange={(e) => setClaim({ ...claim, token: e.target.value.trim() })} /></label>
          <button className="btn btn-ghost-dark" disabled={!claim.order_number || !claim.token}>Add order</button>
        </form>
        {msg && <p role="status">{msg}</p>}
      </section>
      <p className="bl-meta">Need help? <a href="/#contact">Contact us</a>. Our <Link to="/policies#rescheduling">refund policy</Link> applies to every order.</p>
    </AccountFrame>
  )
}

/** Products the visitor has added to the cart (works without signing in). */
function CartItems() {
  const { cart, ready } = useCartData()
  return (
    <section className="shop-cart-items" aria-labelledby="in-cart">
      <h2 id="in-cart">In your cart{cart && cart.count > 0 ? ` (${cart.count})` : ''}</h2>
      {!ready && <p className="bl-state" role="status">Loading…</p>}
      {ready && (!cart || cart.items.length === 0) && <p className="bl-state">Nothing in your cart yet. <Link to="/store">Browse the store</Link></p>}
      {cart && cart.items.length > 0 && (
        <>
          <ul className="shop-lines">
            {cart.items.map((l) => (
              <li key={l.product.id}>
                <div className="shop-line-main">
                  <Link to={`/store/${l.product.slug}`}>{l.product.title}</Link>
                  <span className="bl-meta"> · {l.quantity} × {Number(l.unit_price) === 0 ? 'Free' : rupees(l.unit_price)}</span>
                  {l.problem && <span className="shop-pill failed"> {l.problem}</span>}
                </div>
                <strong>{Number(l.subtotal) === 0 ? 'Free' : rupees(l.subtotal)}</strong>
              </li>
            ))}
          </ul>
          <p className="shop-order-actions">
            <strong>Total: {Number(cart.total) === 0 ? 'Free' : rupees(cart.total)}</strong>
            <Link className="btn btn-yellow" to="/checkout">Checkout</Link>
            <Link className="btn btn-ghost" to="/cart">Edit cart</Link>
          </p>
        </>
      )}
    </section>
  )
}

export function MyOrders() {
  const [page, setPage] = useState(1)
  const [data, setData] = useState<any>(null)
  const [open, setOpen] = useState<string | null>(null)
  const [detail, setDetail] = useState<any>(null)
  const [msg, setMsg] = useState('')
  const signedIn = !!localStorage.getItem('ch_access')
  useEffect(() => {
    if (!signedIn) return
    shop.get('/my-account/orders/', { params: { page } }).then((r) => setData(r.data)).catch(() => setMsg('Could not load your orders.'))
  }, [page, signedIn])
  useEffect(() => {
    if (!open) return setDetail(null)
    shop.get(`/store/orders/${open}/`).then((r) => setDetail(r.data)).catch(() => setDetail(null))
  }, [open])
  const refund = async (n: string) => {
    if (!window.confirm('Ask us to refund this order?')) return
    try {
      await shop.post(`/store/orders/${n}/request-refund/`, {})
      setMsg('Refund requested. We will review it under our refund policy and email you.')
      setPage(1)
    } catch (e) {
      setMsg(errorText(e))
    }
  }
  return (
    <AccountFrame title="My orders" openToAll>
      <h1>My orders</h1>
      <CartItems />
      <h2>Past orders</h2>
      {!signedIn && <p className="bl-state"><Link to="/login" state={{ from: '/my-account/orders' }}>Sign in</Link> to see your past orders and downloads.</p>}
      {msg && signedIn && <p role="status">{msg}</p>}
      {data && data.results.length === 0 && <p className="bl-state">No orders yet. <Link to="/store">Visit the store</Link></p>}
      <ul className="shop-orders">
        {data?.results.map((o: any) => (
          <li key={o.number}>
            <button type="button" className="shop-order-head" aria-expanded={open === o.number} onClick={() => setOpen(open === o.number ? null : o.number)}>
              <strong>{o.number}</strong>
              <span>{new Date(o.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
              <span className={`shop-pill ${o.payment_status}`}>{nice(o.payment_status)}</span>
              <span className="shop-pill">{nice(o.status)}</span>
              <strong>{rupees(o.total)}</strong>
            </button>
            {open === o.number && (
              <div className="shop-order-body">
                <ul className="shop-lines">{o.items.map((i: any) => <li key={i.id}><div className="shop-line-main">{i.quantity} × {i.title}</div><strong>{rupees(i.line_total)}</strong></li>)}</ul>
                {o.tracking_number && <p>Shipped{o.carrier ? ` with ${o.carrier}` : ''}: tracking {o.tracking_number}</p>}
                {Number(o.refunded_amount) > 0 && <p>Refunded: {rupees(o.refunded_amount)}</p>}
                {detail?.downloads?.length > 0 && <DownloadList rows={detail.downloads} />}
                <p className="shop-order-actions">
                  <button type="button" className="ad-link shop-linkbtn" onClick={() => window.print()}>Print receipt</button>
                  {(o.payment_status === 'paid') && o.status !== 'refund_requested' && <button type="button" className="ad-link shop-linkbtn" onClick={() => void refund(o.number)}>Request a refund</button>}
                  <a href="/#contact">Get help with this order</a>
                </p>
              </div>
            )}
          </li>
        ))}
      </ul>
      {data && <Pager page={page} count={data.count} size={12} onPage={setPage} />}
    </AccountFrame>
  )
}

export function MyDownloads() {
  const [rows, setRows] = useState<any[] | null>(null)
  useEffect(() => {
    shop.get('/my-account/downloads/').then((r) => setRows(r.data)).catch(() => setRows([]))
  }, [])
  return (
    <AccountFrame title="My downloads">
      <h1>My downloads</h1>
      {rows === null && <p className="bl-state" role="status">Loading…</p>}
      {rows && rows.length === 0 && <p className="bl-state">Files from your purchases appear here once the payment is confirmed. <Link to="/store">Visit the store</Link></p>}
      {rows && rows.length > 0 && <DownloadList rows={rows.map((r) => ({ ...r, product: `${r.product} (${r.order})`, size: r.size }))} />}
      <p className="bl-meta">Download links are valid for a few minutes. Ask for a new one any time. {rows && rows.length > 0 && `Total files: ${rows.length}, ${fmtSize(rows.reduce((n, r) => n + r.size, 0))}.`}</p>
    </AccountFrame>
  )
}
