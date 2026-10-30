import { Link } from 'react-router-dom'
import { Logo } from '../lib/icons'
import { useModal } from '../lib/modal-context'
import { CartLink } from './CartLink'
import { LearningNavigation } from '../learning/LearningNavigation'

const RESOURCE_LINKS = [
  ['/blog', 'Blog'],
  ['/case-studies', 'Case Studies'],
  ['/projects', 'Projects'],
  ['/project-guides', 'Project Guides'],
  ['/#session', 'About the Session'],
  ['/#contact', 'Contact'],
] as const

export function Header({ scrolled, onOpenMenu }: { scrolled: boolean; onOpenMenu: () => void }) {
  const { openModal } = useModal()

  return (
    <header className={`site${scrolled ? ' scrolled' : ''}`} id="hdr">
      <nav className="container-x" aria-label="Primary">
        <Link to="/" style={{ flexShrink: 0 }} aria-label="Coding Hubs School of AI home">
          <Logo />
        </Link>
        <ul className="nav-links">
          <li>
            <Link className="nav-link" to="/#demo-classes">
              Free Demo Class
            </Link>
          </li>
          <LearningNavigation />
          <li>
            <Link className="nav-link" to="/faq">
              FAQ
            </Link>
          </li>
          <li>
            <Link className="nav-link" to="/book-a-tutor/">
              Book a Tutor
            </Link>
          </li>
          <li>
            <Link className="nav-link" to="/store">
              Store
            </Link>
          </li>
          <li className="dd dd-res">
            <button type="button" className="nav-link" aria-haspopup="true">
              Resources{' '}
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="m6 9 6 6 6-6" />
              </svg>
            </button>
            <div className="dd-panel dd-small">
              {RESOURCE_LINKS.map(([to, label]) => (
                <Link key={to} to={to}>
                  {label}
                </Link>
              ))}
            </div>
          </li>
          <li>
            <button type="button" className="nav-link" onClick={() => openModal()}>
              Talk to an Expert
            </button>
          </li>
        </ul>
        <div className="nav-right">
          <CartLink />
          <button type="button" className="menu-btn" aria-haspopup="dialog" aria-expanded="false" onClick={onOpenMenu}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M4 8h16M4 16h16" />
            </svg>
            <span className="sr-only">Open menu</span>
          </button>
        </div>
      </nav>
    </header>
  )
}
