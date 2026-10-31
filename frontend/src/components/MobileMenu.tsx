import { Link } from 'react-router-dom'
import { PHONE, WA, Logo } from '../lib/icons'
import { useModal } from '../lib/modal-context'

export function MobileMenu({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { openModal } = useModal()

  function go(mode?: 'demo') {
    onClose()
    openModal(mode)
  }

  return (
    <div
      id="mobile"
      role="dialog"
      aria-modal="true"
      aria-label="Menu"
      className={open ? 'open' : ''}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div className="sheet">
        <div className="top">
          <Logo />
          <button type="button" className="menu-btn" style={{ display: 'inline-flex' }} onClick={onClose}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M6 6l12 12M18 6 6 18" />
            </svg>
            <span className="sr-only">Close menu</span>
          </button>
        </div>
        <Link className="m" to="/#demo-classes" onClick={onClose}>
          Free Demo Class
        </Link>
        <Link className="m" to="/courses/" onClick={onClose}>Courses</Link>
        <Link className="m" to="/interview-prep/" onClick={onClose}>Interview Prep</Link>
        <Link className="m" to="/#why" onClick={onClose}>
          Success Stories
        </Link>
        <Link className="m" to="/book-a-tutor/" onClick={onClose}>
          Book a Tutor
        </Link>
        <Link className="m" to="/#about" onClick={onClose}>
          About Us
        </Link>
        <Link className="m" to="/store" onClick={onClose}>
          Store
        </Link>
        <p className="m-head">Resources</p>
        <Link className="m m-sub" to="/blog" onClick={onClose}>
          Blog
        </Link>
        <Link className="m m-sub" to="/case-studies" onClick={onClose}>
          Case Studies
        </Link>
        <Link className="m m-sub" to="/projects" onClick={onClose}>
          Projects
        </Link>
        <Link className="m m-sub" to="/#session" onClick={onClose}>
          About the Session
        </Link>
        <Link className="m m-sub" to="/#contact" onClick={onClose}>
          Contact
        </Link>
        <a className="m" href={`tel:+${WA}`} onClick={onClose}>
          Call {PHONE}
        </a>
        <div style={{ marginTop: 'auto', paddingTop: '1.5rem', display: 'flex', flexDirection: 'column', gap: '.75rem' }}>
          <button type="button" className="btn btn-lime" onClick={() => go('demo')}>
            <span className="shine"></span>
            <span>Join Free Demo Class</span>
          </button>
          <button type="button" className="btn btn-ghost" onClick={() => go()}>
            <span className="shine"></span>
            <span>Talk to an Expert</span>
          </button>
        </div>
      </div>
    </div>
  )
}
