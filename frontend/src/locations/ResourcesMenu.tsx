import { useEffect, useRef, useState } from 'react'

const LINKS = [
  ['/blog', 'Blog'],
  ['/case-studies', 'Case Studies'],
  ['/projects', 'Projects'],
  ['/project-guides', 'Project Guides'],
  ['/#session', 'About the Session'],
  ['/#contact', 'Contact'],
] as const

/** "Resources" header item: a button that opens a short list (hover, tap or keyboard). Inline list inside the burger menu. */
export function ResourcesMenu() {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!open) return
    const close = (e: MouseEvent | KeyboardEvent) => {
      if (e instanceof KeyboardEvent ? e.key === 'Escape' : !ref.current?.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', close)
    document.addEventListener('keydown', close)
    return () => {
      document.removeEventListener('mousedown', close)
      document.removeEventListener('keydown', close)
    }
  }, [open])
  return (
    <div className={`res${open ? ' open' : ''}`} ref={ref} onMouseEnter={() => window.matchMedia('(hover:hover)').matches && setOpen(true)} onMouseLeave={() => setOpen(false)}>
      <button type="button" className="res-btn" aria-expanded={open} aria-haspopup="true" onClick={() => setOpen((o) => (window.matchMedia('(hover:hover)').matches && o ? true : !o))}>
        Resources
        <svg className="res-chev" viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="m6 9 6 6 6-6" />
        </svg>
      </button>
      <ul className="res-list" onClick={() => setOpen(false)}>
        {LINKS.map(([href, label]) => (
          <li key={href}>
            <a href={href}>{label}</a>
          </li>
        ))}
      </ul>
    </div>
  )
}

export function CartLink({ light = false }: { light?: boolean }) {
  const [n, setN] = useState(() => {
    try {
      return Number(localStorage.getItem('ch_cart_count')) || 0
    } catch {
      return 0
    }
  })
  useEffect(() => {
    const h = (e: Event) => setN((e as CustomEvent<number>).detail)
    window.addEventListener('cart-count', h)
    return () => window.removeEventListener('cart-count', h)
  }, [])
  return (
    <a href="/cart" className={`cart-link${light ? ' on-light' : ''}`} aria-label={`Cart, ${n} item${n === 1 ? '' : 's'}`}>
      <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <circle cx="9" cy="20" r="1.5" />
        <circle cx="18" cy="20" r="1.5" />
        <path d="M2 3h3l2.7 12.4a2 2 0 0 0 2 1.6h7.6a2 2 0 0 0 2-1.5L21 8H6" />
      </svg>
      {n > 0 && <span className="cart-badge">{n}</span>}
    </a>
  )
}
