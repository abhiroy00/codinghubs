import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { PageFrame } from '../content-pages/shared'
import { cartApi, errorText, fmtSize, get, lastOrder, rupees, shop, type CartData } from './api'

/* eslint-disable @typescript-eslint/no-explicit-any */
function useNoIndex(title: string) {
  useEffect(() => {
    document.title = `${title} | Coding Hubs School of AI`
    let m = document.head.querySelector<HTMLMetaElement>('meta[name="robots"]')
    const created = !m
    if (!m) {
      m = document.createElement('meta')
      m.name = 'robots'
      document.head.appendChild(m)
    }
    const old = m.content
    m.content = 'noindex, nofollow'
    window.scrollTo(0, 0)
    return () => {
      if (created) m!.remove()
      else m!.content = old
    }
  }, [title])
}

export function Totals({ c }: { c: CartData }) {
  return (
    <dl className="shop-totals">
      <dt>Subtotal</dt><dd>{rupees(c.subtotal)}</dd>
      {Number(c.discount) > 0 && <><dt>Discount{c.coupon ? ` (${c.coupon})` : ''}</dt><dd>−{rupees(c.discount)}</dd></>}
      {c.tax_mode === 'exclusive' && <><dt>Tax</dt><dd>{rupees(c.tax)}</dd></>}
      {c.has_physical && <><dt>Shipping</dt><dd>{Number(c.shipping) > 0 ? rupees(c.shipping) : 'Free'}</dd></>}
      {c.tax_mode === 'inclusive' && Number(c.tax) > 0 && <><dt>Includes tax</dt><dd>{rupees(c.tax)}</dd></>}
      <dt className="shop-grand">Total</dt><dd className="shop-grand">{rupees(c.total)}</dd>
    </dl>
  )
}

export function CartPage() {
  useNoIndex('Your cart')
  const [cart, setCart] = useState<CartData | null>(null)
  const [error, setError] = useState('')
  const [code, setCode] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    cartApi.get().then(setCart).catch(() => setError('Could not load your cart.'))
  }, [])
  const run = async (fn: () => Promise<CartData>) => {
    setBusy(true)
    setError('')
    try {
      setCart(await fn())
    } catch (e) {
      const d = (e as any)?.response?.data
      if (d?.items) setCart(d)
      setError(errorText(e))
    } finally {
      setBusy(false)
    }
  }
  const blocked = !!cart?.problems.length

  return (
    <PageFrame>
      <h1>Your cart</h1>
      {error && <p className="shop-err" role="alert">{error}</p>}
      {!cart && !error && <p className="bl-state" role="status">Loading…</p>}
      {cart && cart.items.length === 0 && (
        <div className="bl-state"><p>Your cart is empty.</p><Link className="btn btn-yellow" to="/store">Browse the store</Link></div>
      )}
      {cart && cart.items.length > 0 && (
        <div className="shop-cart">
          <ul className="shop-lines">
            {cart.items.map((l) => (
              <li key={l.product.slug} className={l.problem ? 'has-problem' : ''}>
                {l.product.image && <img src={l.product.image.src} alt={l.product.image.alt} width={72} height={72} loading="lazy" />}
                <div className="shop-line-main">
                  <Link to={`/store/${l.product.slug}`}>{l.product.title}</Link>
                  <small>{l.product.product_type === 'digital' ? 'Digital download' : l.product.product_type === 'physical' ? 'Printed' : 'Printed + digital'}</small>
                  {l.problem && <p className="shop-err" role="alert">{l.problem} Remove it or change the quantity to continue.</p>}
                </div>
                <label className="shop-qty-sm">
                  <span className="sr-only">Quantity of {l.product.title}</span>
                  <input type="number" min={1} max={l.max_quantity} value={l.quantity} disabled={busy || l.max_quantity === 1} onChange={(e) => void run(() => cartApi.set((l.product as any).id, Number(e.target.value) || 1))} />
                </label>
                <strong>{rupees(l.subtotal)}</strong>
                <button type="button" className="ad-link shop-linkbtn" disabled={busy} onClick={() => void run(() => cartApi.remove((l.product as any).id))} aria-label={`Remove ${l.product.title}`}>Remove</button>
              </li>
            ))}
          </ul>
          <aside className="shop-summary">
            <form onSubmit={(e: FormEvent) => { e.preventDefault(); void run(() => cartApi.coupon(code)) }} className="shop-coupon">
              <label htmlFor="coupon">Coupon code</label>
              <div>
                <input id="coupon" value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} placeholder={cart.coupon || 'Enter code'} maxLength={40} />
                <button className="btn btn-ghost-dark" disabled={busy || !code}>Apply</button>
              </div>
              {cart.coupon && <p className="shop-ok">Coupon {cart.coupon} applied. <button type="button" className="ad-link shop-linkbtn" onClick={() => void run(() => cartApi.coupon(''))}>Remove</button></p>}
              {cart.coupon_error && <p className="shop-err" role="alert">{cart.coupon_error}</p>}
            </form>
            <Totals c={cart} />
            <p className="bl-meta">Prices, discounts, tax and shipping are calculated again on our server when you check out.</p>
            <Link className={`btn btn-yellow btn-block${blocked ? ' disabled' : ''}`} to="/checkout" aria-disabled={blocked} onClick={(e) => blocked && e.preventDefault()}>Checkout</Link>
            <Link to="/store" className="bl-meta">Continue shopping</Link>
          </aside>
        </div>
      )}
    </PageFrame>
  )
}

let rzp: Promise<void> | null = null
const loadRazorpay = () =>
  (rzp ??= new Promise<void>((resolve, reject) => {
    if ((window as any).Razorpay) return resolve()
    const s = document.createElement('script')
    s.src = 'https://checkout.razorpay.com/v1/checkout.js'
    s.onload = () => resolve()
    s.onerror = () => {
      rzp = null
      reject(new Error('Could not load the payment window. Check your connection and try again.'))
    }
    document.body.appendChild(s)
  }))

export function CheckoutPage() {
  useNoIndex('Checkout')
  const nav = useNavigate()
  const [cart, setCart] = useState<CartData | null>(null)
  const [settings, setSettings] = useState<any>(null)
  const [form, setForm] = useState({ name: '', email: '', phone: '', line1: '', line2: '', city: '', state: '', postal_code: '', note: '' })
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [pending, setPending] = useState<{ number: string; token: string } | null>(null)
  const loggedIn = !!localStorage.getItem('ch_access')

  useEffect(() => {
    cartApi.get().then(setCart).catch(() => setError('Could not load your cart.'))
    get('/store/settings/').then(setSettings).catch(() => undefined)
    if (loggedIn) {
      shop.get('/auth/me/').then(({ data }) => setForm((f) => ({ ...f, name: f.name || [data.first_name, data.last_name].filter(Boolean).join(' ') || data.username || '', email: f.email || data.email || '', phone: f.phone || data.phone || '' }))).catch(() => undefined)
    }
  }, [loggedIn])

  const set = (k: keyof typeof form) => (e: { target: { value: string } }) => setForm((f) => ({ ...f, [k]: e.target.value }))
  const verify = useCallback(async (order: { number: string; token: string }, res: any) => {
    try {
      await shop.post('/store/payments/verify/', { order_number: order.number, ...res }, { headers: { 'X-Order-Token': order.token } })
    } catch {
      /* the success page asks the server again and shows the truthful status */
    }
    nav(`/payment/success?order=${order.number}&token=${order.token}`)
  }, [nav])

  const openPayment = useCallback(async (pay: any) => {
    await loadRazorpay()
    const order = { number: pay.order_number, token: pay.token }
    const R = (window as any).Razorpay
    const inst = new R({
      key: pay.key, amount: pay.amount, currency: pay.currency, name: 'Coding Hubs School of AI', description: `Order ${pay.order_number}`, order_id: pay.razorpay_order_id,
      prefill: { name: pay.name, email: pay.email, contact: pay.phone }, theme: { color: '#0A1A3F' },
      handler: (res: any) => void verify(order, res),
      modal: { ondismiss: () => { setBusy(false); setPending(order); setError('The payment was not completed. Your items are held for a short time: you can try again below.') } },
    })
    inst.on('payment.failed', (r: any) => {
      void shop.post('/store/payments/failed/', { order_number: order.number, reason: r?.error?.description ?? '' }, { headers: { 'X-Order-Token': order.token } }).catch(() => undefined)
      setError(r?.error?.description ? `Payment failed: ${r.error.description}` : 'The payment failed. Please try again.')
    })
    inst.open()
  }, [verify])

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setBusy(true)
    setError('')
    try {
      const addr = { line1: form.line1, line2: form.line2, city: form.city, state: form.state, postal_code: form.postal_code, country: 'India' }
      const { data } = await shop.post('/checkout/', { name: form.name, email: form.email, phone: form.phone, shipping_address: addr, billing_address: addr, note: form.note })
      cartApi.get().catch(() => undefined)
      lastOrder.set({ number: data.order_number, token: data.token })
      if (data.free) return nav(`/payment/success?order=${data.order_number}&token=${data.token}`)
      setPending({ number: data.order_number, token: data.token })
      await openPayment(data)
    } catch (err) {
      const d = (err as any)?.response?.data
      if (d?.items) setCart(d)
      setError(errorText(err))
      setBusy(false)
    }
  }
  const retry = async () => {
    if (!pending) return
    setBusy(true)
    setError('')
    try {
      const { data } = await shop.post(`/store/orders/${pending.number}/pay/`, {}, { headers: { 'X-Order-Token': pending.token } })
      await openPayment(data)
    } catch (err) {
      setError(errorText(err, 'This order can no longer be paid. Please start again from your cart.'))
      setBusy(false)
    }
  }

  if (cart && cart.items.length === 0 && !pending) {
    return <PageFrame><h1>Checkout</h1><p className="bl-state">Your cart is empty. <Link to="/store">Browse the store</Link></p></PageFrame>
  }
  const guestBlocked = settings && !settings.allow_guest_checkout && !loggedIn
  return (
    <PageFrame>
      <h1>Checkout</h1>
      {settings && !settings.payments_enabled && cart && Number(cart.total) > 0 && (
        <p className="shop-err" role="alert">Online payment is not switched on yet, so paid orders cannot be placed right now. Please contact us.</p>
      )}
      {guestBlocked && <p className="shop-err" role="alert">Please <Link to="/login">log in</Link> or <Link to="/register">create an account</Link> to check out.</p>}
      {error && <p className="shop-err" role="alert">{error}</p>}
      {pending && <button type="button" className="btn btn-yellow" disabled={busy} onClick={() => void retry()}>Try the payment again</button>}
      <div className="shop-cart">
        <form className="shop-form" onSubmit={(e) => void submit(e)} noValidate>
          <h2>Your details</h2>
          <label>Full name *<input value={form.name} onChange={set('name')} autoComplete="name" required /></label>
          <label>Email * <small>Your receipt and download link are sent here.</small><input type="email" value={form.email} onChange={set('email')} autoComplete="email" required /></label>
          <label>Phone<input type="tel" value={form.phone} onChange={set('phone')} autoComplete="tel" /></label>
          {cart?.has_physical && (
            <fieldset>
              <legend>Delivery address</legend>
              <label>Address line 1 *<input value={form.line1} onChange={set('line1')} autoComplete="address-line1" /></label>
              <label>Address line 2<input value={form.line2} onChange={set('line2')} autoComplete="address-line2" /></label>
              <div className="shop-row">
                <label>City *<input value={form.city} onChange={set('city')} autoComplete="address-level2" /></label>
                <label>State *<input value={form.state} onChange={set('state')} autoComplete="address-level1" /></label>
                <label>PIN code *<input value={form.postal_code} onChange={set('postal_code')} inputMode="numeric" maxLength={6} autoComplete="postal-code" /></label>
              </div>
            </fieldset>
          )}
          <label>Note for us (optional)<input value={form.note} onChange={set('note')} maxLength={300} /></label>
          <button className="btn btn-yellow btn-lg" disabled={busy || !!guestBlocked || !cart || cart.problems.length > 0}>{busy ? 'Please wait…' : cart && Number(cart.total) === 0 ? 'Place free order' : `Pay ${cart ? rupees(cart.total) : ''}`}</button>
          <p className="bl-meta">Payments are processed by Razorpay. We never see or store your card details. By paying you agree to our <Link to="/policies#terms">terms</Link>, <Link to="/policies#privacy">privacy</Link> and refund policy.</p>
        </form>
        <aside className="shop-summary">
          <h2>Order summary</h2>
          {cart?.items.map((l) => <p key={l.product.slug} className="shop-sum-line"><span>{l.quantity} × {l.product.title}</span><span>{rupees(l.subtotal)}</span></p>)}
          {cart && <Totals c={cart} />}
        </aside>
      </div>
    </PageFrame>
  )
}

export function PaymentResult({ failed = false }: { failed?: boolean }) {
  useNoIndex(failed ? 'Payment failed' : 'Order confirmation')
  const [params] = useSearchParams()
  const saved = lastOrder.get()
  const number = params.get('order') || saved?.number || ''
  const token = params.get('token') || saved?.token || ''
  const [order, setOrder] = useState<any>(null)
  const [error, setError] = useState('')
  const [tries, setTries] = useState(0)

  useEffect(() => {
    if (!number) return
    let live = true
    shop.get(`/store/orders/${number}/`, { params: token ? { token } : {}, headers: token ? { 'X-Order-Token': token } : {} })
      .then(({ data }) => {
        if (!live) return
        setOrder(data)
        // the gateway may confirm a little later (webhook): look again a few times instead of claiming success or failure
        if (!failed && data.payment_status !== 'paid' && data.payment_status !== 'partially_refunded' && tries < 6) setTimeout(() => live && setTries((t) => t + 1), 4000)
      })
      .catch(() => live && setError('We could not find this order. Check the link in your confirmation email.'))
    return () => {
      live = false
    }
  }, [number, token, tries, failed])

  const paid = order && (order.payment_status === 'paid' || order.payment_status === 'partially_refunded')
  return (
    <PageFrame>
      <h1>{failed ? 'Payment not completed' : paid ? 'Thank you! Your order is confirmed' : 'Confirming your payment…'}</h1>
      {error && <p className="shop-err" role="alert">{error}</p>}
      {!number && !error && <p className="bl-state">No order to show. <Link to="/store">Go to the store</Link></p>}
      {order && !paid && !failed && (
        <p role="status">Order <strong>{order.number}</strong> is waiting for the payment confirmation from the bank. This page checks again automatically. If money was deducted and this does not change within a few minutes, contact us with the order number: we never mark an order paid until the payment is confirmed.</p>
      )}
      {failed && <p>No money was taken for this attempt. Your items are held for a short time{number ? <>: <Link to={`/checkout`}>go back to checkout</Link> to try again.</> : '.'}</p>}
      {paid && (
        <>
          <p>Order <strong>{order.number}</strong> · {rupees(order.total)}. A confirmation was sent to {order.email}.</p>
          <ul className="shop-lines">{order.items.map((i: any) => <li key={i.id}><div className="shop-line-main">{i.quantity} × {i.title}</div><strong>{rupees(i.line_total)}</strong></li>)}</ul>
          {order.has_physical && <p>Printed items will be shipped to your address. We email tracking details when they leave.</p>}
          {order.downloads?.length > 0 && <DownloadList rows={order.downloads} token={token} />}
          {!localStorage.getItem('ch_access') && <p className="bl-meta">Keep this page’s link (it is in your email too) to download your files later. <Link to="/register">Create an account</Link> to see all your orders in one place.</p>}
        </>
      )}
    </PageFrame>
  )
}

export function DownloadList({ rows, token }: { rows: any[]; token?: string }) {
  const [err, setErr] = useState('')
  const open = async (id: number) => {
    setErr('')
    try {
      const { data } = await shop.post(`/store/downloads/${id}/link/`, {}, { headers: token ? { 'X-Order-Token': token } : {} })
      window.location.assign(data.url)
    } catch (e) {
      setErr(errorText(e, 'This download is not available.'))
    }
  }
  return (
    <section>
      <h2>Your downloads</h2>
      <ul className="shop-lines">
        {rows.map((r) => (
          <li key={r.id}>
            <div className="shop-line-main"><strong>{r.label}</strong><small>{r.product} · {fmtSize(r.size)}{r.remaining !== null && r.remaining !== undefined ? ` · ${r.remaining} download${r.remaining === 1 ? '' : 's'} left` : ''}</small></div>
            <button type="button" className="btn btn-yellow" disabled={!r.available} onClick={() => void open(r.id)}>{r.available ? 'Download' : 'Unavailable'}</button>
          </li>
        ))}
      </ul>
      {err && <p className="shop-err" role="alert">{err}</p>}
    </section>
  )
}
