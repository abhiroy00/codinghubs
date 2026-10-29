import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../lib/auth-context'
import { cartApi } from '../shop-pages/api'

export function CartLink({ className = '' }: { className?: string }) {
  const { user } = useAuth()
  const [count, setCount] = useState(0)

  useEffect(() => {
    if (!user) {
      setCount(0)
      return
    }

    let active = true
    let receivedUpdate = false
    try {
      const cached = Number(localStorage.getItem('ch_cart_count') || 0)
      setCount(Number.isFinite(cached) ? cached : 0)
    } catch {
      setCount(0)
    }

    const onCartCount = (event: Event) => {
      receivedUpdate = true
      const next = (event as CustomEvent<number>).detail
      setCount(Number.isFinite(next) ? next : 0)
    }
    window.addEventListener('cart-count', onCartCount)
    void cartApi.get().then((cart) => {
      if (active && !receivedUpdate) setCount(cart.count)
    }).catch(() => undefined)

    return () => {
      active = false
      window.removeEventListener('cart-count', onCartCount)
    }
  }, [user])

  if (!user) return null

  const badge = count > 99 ? '99+' : String(count)
  return (
    <Link
      className={`cart-nav${className ? ` ${className}` : ''}`}
      to="/cart"
      aria-label={`Shopping cart${count ? `, ${count} item${count === 1 ? '' : 's'}` : ', empty'}`}
      title={`Cart${count ? ` (${count})` : ''}`}
    >
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M3 4h2l2.1 11.1a2 2 0 0 0 2 1.6h7.7a2 2 0 0 0 1.9-1.5L20 8H6" />
        <circle cx="10" cy="20" r="1.4" />
        <circle cx="17" cy="20" r="1.4" />
      </svg>
      {count > 0 && <span className="cart-nav-badge" aria-hidden="true">{badge}</span>}
      <span className="sr-only">Cart</span>
    </Link>
  )
}
