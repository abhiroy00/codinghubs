import { useState } from 'react'
import { Link } from 'react-router-dom'
import { FsIcon, IconSprite } from '../pages/free-session/icons'
import { INSTITUTE, WHATSAPP } from '../pages/free-session/data'
import { LocationsMenu } from './LocationsMenu'
import { GROUP_LABELS, GROUP_ORDER, HEAD_OFFICE, LOCATIONS, locationPath } from './registry'

export const LOGO_WIDE = '/assets/coding-hubs-school-of-ai-logo-wide.png'

/** Header for the location pages: same look as the free-session header plus the Locations menu. */
export function FsHeader() {
  const [navOpen, setNavOpen] = useState(false)
  return (
    <>
      <IconSprite />
      <a href="#main" className="skip">
        Skip to content
      </a>
      <header className="hdr" id="hdr">
        <div className="wrap hdr-in">
          <Link to="/" className="logo" aria-label="Coding Hubs School of AI home">
            <img className="logo-img" src={LOGO_WIDE} alt="Coding Hubs School of AI logo" width={720} height={208} />
          </Link>
          <nav className={`nav${navOpen ? ' open' : ''}`} id="nav" aria-label="Primary">
            <a href="/">Home</a>
            <a href="/#demo-classes">Free Demo Classes</a>
            <a href="/#courses">Explore Courses</a>
            <LocationsMenu onNavigate={() => setNavOpen(false)} />
            <a href="/#contact">Contact</a>
            <a href="/#register" className="btn btn-yellow nav-cta btn-shake">
              <FsIcon id="i-tap" />Register<span className="free-badge-red">FREE</span>
            </a>
          </nav>
          <div className="hdr-actions">
            <a href="/#register" className="btn btn-yellow btn-sm hdr-cta">
              <FsIcon id="i-tap" />Register<span className="free-badge-red">FREE</span>
            </a>
            <button type="button" className="burger" aria-expanded={navOpen} aria-controls="nav" aria-label={navOpen ? 'Close menu' : 'Open menu'} onClick={() => setNavOpen((o) => !o)}>
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

export function FsFooter() {
  return (
    <footer className="ftr">
      <div className="wrap ftr-grid">
        <div className="ftr-brand">
          <Link to="/" className="logo logo-light" aria-label="Coding Hubs School of AI home">
            <img className="logo-img" src={LOGO_WIDE} alt="Coding Hubs School of AI logo" width={720} height={208} loading="lazy" />
          </Link>
          <p className="ftr-tag">Practical AI training for learners across Delhi NCR. Official head office at Netaji Subhash Place, Delhi.</p>
        </div>

        <nav className="ftr-col" aria-label="Quick links">
          <h2>Quick Links</h2>
          <ul className="ftr-links">
            <li><a href="/#courses">Explore Courses</a></li>
            <li><Link to="/locations/">All Locations</Link></li>
            <li><a href="/#faq">FAQ</a></li>
            <li><a href="/policies#privacy">Privacy Policy</a></li>
            <li><a href="/policies#terms">Terms &amp; Conditions</a></li>
          </ul>
        </nav>

        <div className="ftr-col">
          <h2>Contact Us</h2>
          <ul className="ftr-contact">
            <li>
              <span className="fc-ico"><FsIcon id="i-phone" /></span>
              <a href={INSTITUTE.phoneHref}>{INSTITUTE.phone}</a>
            </li>
            <li>
              <span className="fc-ico"><FsIcon id="i-mail" /></span>
              <a href={`mailto:${INSTITUTE.email}`}>{INSTITUTE.email}</a>
            </li>
            <li>
              <span className="fc-ico"><FsIcon id="i-wa" className="ico ico-fill" /></span>
              <a href={`https://wa.me/${WHATSAPP.number}`} target="_blank" rel="noopener noreferrer">Chat on WhatsApp</a>
            </li>
            <li>
              <span className="fc-ico"><FsIcon id="i-pin" /></span>
              <span>
                <strong>Head Office:</strong> {HEAD_OFFICE.line}.
              </span>
            </li>
          </ul>
        </div>
      </div>

      <div className="wrap loc-ftr-locs">
        <h2>AI Course Locations</h2>
        <div className="loc-ftr-cols">
          {GROUP_ORDER.map((g) => {
            const items = LOCATIONS.filter((l) => l.group === g)
            return (
              <div key={g}>
                <p>{GROUP_LABELS[g]}</p>
                <ul>
                  {items.map((l) => (
                    <li key={l.slug}>
                      <Link to={locationPath(l.slug)}>{l.short}</Link>
                    </li>
                  ))}
                </ul>
              </div>
            )
          })}
        </div>
      </div>

      <div className="wrap ftr-bottom">
        <p>
          © {new Date().getFullYear()} {INSTITUTE.name}. All rights reserved.
        </p>
      </div>
    </footer>
  )
}
