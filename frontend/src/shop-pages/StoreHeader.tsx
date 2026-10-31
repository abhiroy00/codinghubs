import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { BrandLogo } from '../locations/FsShell'
import { INSTITUTE } from '../pages/free-session/data'
import { FsIcon, IconSprite } from '../pages/free-session/icons'
import { ScrollProgress } from '../components/ScrollProgress'

/** Header of the Store area: its own menu (Home, product groups) and the shopping cart. */
export function StoreHeader() {
  const [open, setOpen] = useState(false)
  const { pathname, search } = useLocation()
  const cat = new URLSearchParams(search).get('category') ?? ''
  const here = (path: string, c = '') => (pathname === path || pathname === `${path}/`) && cat === c ? 'page' : undefined
  const close = () => setOpen(false)
  return (
    <>
      <IconSprite />
      <a href="#main" className="skip">
        Skip to content
      </a>
      <ScrollProgress />
      <header className="hdr st-hdr" id="hdr">
        <div className="wrap hdr-in">
          <BrandLogo />
          <nav className={`nav${open ? ' open' : ''}`} id="nav" aria-label="Store">
            <a href="/">Home</a>
            <Link to="/store" onClick={close} aria-current={here('/store')}>All Products</Link>
            <Link to="/store?category=t-shirts" onClick={close} aria-current={here('/store', 't-shirts')}>T-Shirts</Link>
            <Link to="/store?category=notes" onClick={close} aria-current={here('/store', 'notes')}>Notes</Link>
            <Link to="/store?category=books" onClick={close} aria-current={here('/store', 'books')}>Books</Link>
            <Link to="/my-account/orders" onClick={close} aria-current={pathname.startsWith('/my-account') ? 'page' : undefined}>My Orders</Link>
          </nav>
          <div className="hdr-actions">
            <a href={INSTITUTE.phoneHref} className="hdr-phone">
              <FsIcon id="i-phone" />{INSTITUTE.phone}
            </a>
            <button type="button" className="burger" aria-expanded={open} aria-controls="nav" aria-label={open ? 'Close menu' : 'Open menu'} onClick={() => setOpen((o) => !o)}>
              <span></span>
              <span></span>
              <span></span>
            </button>
          </div>
        </div>
      </header>
    </>
  )
}
