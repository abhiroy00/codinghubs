import { Link } from 'react-router-dom'
import { useAuth } from '../lib/auth-context'
import { Logo } from '../lib/icons'
import { useModal } from '../lib/modal-context'
import { CartLink } from '../locations/ResourcesMenu'

const COURSE_COLUMNS = [
  { heading: 'AI & Data', items: ['Generative AI', 'Agentic AI', 'Prompt Engineering', 'AI Engineering Diploma', 'Data Science', 'Data Analytics'] },
  { heading: 'Full Stack', items: ['AI-Integrated Full Stack', 'Python Full Stack', 'MERN Stack', 'MEAN Stack', 'React Full Stack', '.NET Full Stack'] },
  { heading: 'Cloud & Cyber', items: ['AWS Solutions Architect', 'Azure (AZ-104)', 'Google Cloud', 'Cloud DevOps', 'Ethical Hacker (C|EH)', 'CISSP'] },
]

const RESOURCE_LINKS = [
  ['/blog', 'Blog'],
  ['/case-studies', 'Case Studies'],
  ['/#session', 'About the Session'],
  ['/#contact', 'Contact'],
] as const

export function Header({ scrolled, onOpenMenu }: { scrolled: boolean; onOpenMenu: () => void }) {
  const { openModal } = useModal()
  const { user, logout } = useAuth()

  return (
    <header className={`site${scrolled ? ' scrolled' : ''}`} id="hdr">
      <nav className="container-x" aria-label="Primary">
        <Link to="/" style={{ flexShrink: 0 }} aria-label="Coding Hubs School of AI home">
          <Logo />
        </Link>
        <ul className="nav-links">
          <li>
            <Link className="nav-link" to="/#demo">
              Free Demo Class
            </Link>
          </li>
          <li className="dd">
            <Link className="nav-link" to="/#courses" aria-haspopup="true">
              Courses{' '}
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="m6 9 6 6 6-6" />
              </svg>
            </Link>
            <div className="dd-panel">
              {COURSE_COLUMNS.map((col) => (
                <div key={col.heading}>
                  <h4>{col.heading}</h4>
                  {col.items.map((item) => (
                    <Link key={item} to="/#courses">
                      {item}
                    </Link>
                  ))}
                </div>
              ))}
            </div>
          </li>
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
          <CartLink light />
          {user ? (
            <>
              <Link className="nav-link nav-login" to="/dashboard">
                {user.username}
              </Link>
              <button type="button" className="nav-link" onClick={logout}>
                Logout
              </button>
            </>
          ) : (
            <Link className="nav-link nav-login" to="/login">
              Login
            </Link>
          )}
          <button type="button" className="btn btn-lime btn-sm" onClick={() => openModal('demo')}>
            <span className="shine"></span>
            <span>
              <span className="only-lg">Join Free Demo Class</span>
              <span className="only-sm">Join Free</span>
            </span>
          </button>
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
