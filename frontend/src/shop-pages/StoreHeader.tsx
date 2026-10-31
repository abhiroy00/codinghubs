import { useState } from 'react'
import { Link } from 'react-router-dom'
import { BrandLogo } from '../locations/FsShell'
import { IconSprite } from '../pages/free-session/icons'

/** Header of the Store area: its own menu (Home, product groups) and the shopping cart. */
export function StoreHeader() {
  const [open, setOpen] = useState(false)
  const close = () => setOpen(false)
  return (
    <>
      <IconSprite />
      <a href="#main" className="skip">
        Skip to content
      </a>
      <header className="hdr st-hdr" id="hdr">
        <div className="wrap hdr-in">
          <BrandLogo />
          <nav className={`nav${open ? ' open' : ''}`} id="nav" aria-label="Store">
            <a href="/">Home</a>
            <Link to="/store" onClick={close}>All Products</Link>
            <Link to="/store?category=t-shirts" onClick={close}>T-Shirts</Link>
            <Link to="/store?category=notes" onClick={close}>Notes</Link>
            <Link to="/store?category=books" onClick={close}>Books</Link>
            <Link to="/my-account/orders" onClick={close}>My Orders</Link>
          </nav>
          <div className="hdr-actions">
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
