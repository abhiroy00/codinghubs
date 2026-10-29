import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { cartApi, errorText, rupees, type CartData } from '../shop-pages/api'

export function CartDrawer() {
  const [open, setOpen] = useState(false)
  const [cart, setCart] = useState<CartData | null>(null)
  const [busyId, setBusyId] = useState<number | null>(null)
  const [quantityDrafts, setQuantityDrafts] = useState<Record<number, string>>({})
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    setError('')
    try { setCart(await cartApi.get()) } catch (e) { setError(errorText(e, 'Could not load your cart.')) }
  }, [])

  useEffect(() => {
    const onOpen = (event: Event) => {
      const cartFromAdd = (event as CustomEvent<CartData | undefined>).detail
      if (cartFromAdd) setCart(cartFromAdd)
      else void load()
      setOpen(true)
    }
    const onUpdate = (event: Event) => {
      const next = (event as CustomEvent<CartData>).detail
      if (next) setCart(next)
    }
    window.addEventListener('cart-open', onOpen)
    window.addEventListener('cart-updated', onUpdate)
    return () => {
      window.removeEventListener('cart-open', onOpen)
      window.removeEventListener('cart-updated', onUpdate)
    }
  }, [load])

  useEffect(() => {
    if (!open) return
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onKeyDown = (event: KeyboardEvent) => { if (event.key === 'Escape') setOpen(false) }
    window.addEventListener('keydown', onKeyDown)
    return () => {
      document.body.style.overflow = previous
      window.removeEventListener('keydown', onKeyDown)
    }
  }, [open])

  const changeQuantity = async (productId: number, quantity: number) => {
    setBusyId(productId)
    setError('')
    try {
      setCart(await cartApi.set(productId, quantity))
      setQuantityDrafts((drafts) => { const next = { ...drafts }; delete next[productId]; return next })
    }
    catch (e) { setError(errorText(e)) }
    finally { setBusyId(null) }
  }

  const finishQuantityEdit = (productId: number, value: string, current: number, maximum: number) => {
    setQuantityDrafts((drafts) => { const next = { ...drafts }; delete next[productId]; return next })
    const parsed = Number(value)
    if (!value || !Number.isFinite(parsed)) return
    const quantity = Math.min(maximum, Math.max(1, Math.floor(parsed)))
    if (quantity !== current) void changeQuantity(productId, quantity)
  }

  const remove = async (productId: number) => {
    setBusyId(productId)
    setError('')
    try { setCart(await cartApi.remove(productId)) }
    catch (e) { setError(errorText(e)) }
    finally { setBusyId(null) }
  }

  if (!open) return null
  const blocked = !!cart?.problems.length
  return (
    <div className="cart-overlay" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setOpen(false) }}>
      <section className="cart-drawer" role="dialog" aria-modal="true" aria-labelledby="cart-drawer-title">
        <header className="cart-drawer-head">
          <h2 id="cart-drawer-title">Your cart{cart?.count ? ` (${cart.count})` : ''}</h2>
          <button type="button" className="cart-drawer-close" aria-label="Close cart" onClick={() => setOpen(false)}>
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18" /></svg>
          </button>
        </header>
        {error && <p className="cart-drawer-warning" role="alert">{error}</p>}
        {!cart ? (
          <div className="cart-drawer-empty" role="status">Loading your cart…</div>
        ) : cart.items.length === 0 ? (
          <div className="cart-drawer-empty"><strong>Your cart is empty</strong><span>Browse the store and add something you like.</span></div>
        ) : (
          <div className="cart-drawer-lines">
            {cart.items.map((line) => {
              const productId = Number(line.product.id)
              const image = line.product.image?.src || line.product.featured_image
              const busy = busyId === productId
              return (
                <article className="cart-drawer-line" key={line.product.slug}>
                  {image ? <img className="cart-drawer-image" src={image} alt={line.product.image?.alt || line.product.featured_image_alt || line.product.title} /> : <div className="cart-drawer-image cart-drawer-placeholder" aria-hidden="true">{line.product.format || 'Item'}</div>}
                  <div className="cart-drawer-info">
                    <div className="cart-drawer-product-head"><h3>{line.product.title}</h3><strong className="cart-drawer-price">{rupees(line.subtotal)}</strong></div>
                    <p>{rupees(line.unit_price)} each</p>
                    <div className="cart-drawer-qty" aria-label={`Quantity for ${line.product.title}`}>
                      <button type="button" aria-label="Decrease quantity" disabled={busy} onClick={() => line.quantity <= 1 ? void remove(productId) : void changeQuantity(productId, line.quantity - 1)}>−</button>
                      <input className="cart-drawer-quantity" type="number" inputMode="numeric" min={1} max={line.max_quantity} step={1} aria-label={`Quantity for ${line.product.title}`} disabled={busy} value={quantityDrafts[productId] ?? String(line.quantity)} onChange={(event) => setQuantityDrafts((drafts) => ({ ...drafts, [productId]: event.target.value }))} onBlur={(event) => finishQuantityEdit(productId, event.target.value, line.quantity, line.max_quantity)} onKeyDown={(event) => { if (event.key === 'Enter') event.currentTarget.blur() }} />
                      <button type="button" aria-label="Increase quantity" disabled={busy || line.quantity >= line.max_quantity} onClick={() => void changeQuantity(productId, line.quantity + 1)}>+</button>
                      <button type="button" className="cart-drawer-remove" disabled={busy} onClick={() => void remove(productId)}>Remove</button>
                    </div>
                    {line.problem && <p className="cart-drawer-warning">{line.problem}</p>}
                  </div>
                </article>
              )
            })}
          </div>
        )}
        {cart && cart.items.length > 0 && (
          <footer className="cart-drawer-foot">
            {blocked && <p className="cart-drawer-warning">Review the item availability before checkout.</p>}
            <div className="cart-drawer-subtotal"><span>Subtotal</span><strong>{rupees(cart.subtotal)}</strong></div>
            <div className="cart-drawer-actions">
              <button type="button" className="btn btn-ghost-dark" onClick={() => setOpen(false)}>Continue shopping</button>
              <Link className={`btn btn-yellow${blocked ? ' disabled' : ''}`} to="/checkout" aria-disabled={blocked} onClick={(event) => { if (blocked) event.preventDefault(); else setOpen(false) }}>Proceed to checkout</Link>
            </div>
          </footer>
        )}
      </section>
    </div>
  )
}
