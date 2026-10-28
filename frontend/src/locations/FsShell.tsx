import { useState } from 'react'
import { Link } from 'react-router-dom'
import { FsIcon, IconSprite } from '../pages/free-session/icons'
import { INSTITUTE, WHATSAPP } from '../pages/free-session/data'
import { LocationsMenu } from './LocationsMenu'
import { ResourcesMenu } from './ResourcesMenu'
import { COURSE_NAMES, GROUP_LABELS, GROUP_ORDER, HEAD_OFFICE, LOCATIONS } from './registry'

/** Official Coding Hubs School of AI logo (transparent PNG) on a white pill so it reads on the dark header. */
export function BrandLogo({ home = false }: { home?: boolean }) {
  const inner = (
    <span className="brand-pill">
      <img className="brand-logo" src="/assets/coding-hubs-school-of-ai-logo-wide.png" alt="Coding Hubs School of AI" width={720} height={208} />
    </span>
  )
  return home ? (
    <a href="#home" className="logo brand" aria-label="Coding Hubs School of AI home">
      {inner}
    </a>
  ) : (
    <Link to="/" className="logo brand" aria-label="Coding Hubs School of AI home">
      {inner}
    </Link>
  )
}

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
          <BrandLogo />
          <nav className={`nav${navOpen ? ' open' : ''}`} id="nav" aria-label="Primary">
            <a href="/">Home</a>
            <a href="/#demo-classes">Free Demo Classes</a>
            <a href="/#courses">Explore Courses</a>
            <Link to="/book-a-tutor/" onClick={() => setNavOpen(false)}>Book a Tutor</Link>
            <LocationsMenu onNavigate={() => setNavOpen(false)} />
            <a href="/store">Store</a>
            <ResourcesMenu />
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

export function FsFooter({ home = false }: { home?: boolean }) {
  // On the home page the in-page anchors scroll; everywhere else they go back to the home page section.
  const h = (hash: string) => (home ? hash : `/${hash}`)
  const waHref = `https://wa.me/${WHATSAPP.number}?text=${encodeURIComponent(WHATSAPP.genericMessage)}`
  const socials = [
    { id: 'i-in', label: 'LinkedIn', href: INSTITUTE.social.linkedin },
    { id: 'i-ig', label: 'Instagram', href: INSTITUTE.social.instagram },
    { id: 'i-fb', label: 'Facebook', href: INSTITUTE.social.facebook },
    { id: 'i-yt', label: 'YouTube', href: INSTITUTE.social.youtube },
    { id: 'i-wa', label: 'WhatsApp', href: `https://wa.me/${WHATSAPP.number}` },
  ]

  return (
    <footer className="ftr fx">
      <span className="fx-blob" aria-hidden="true"></span>
      <div className="wrap">
        <div className="fx-cta">
          <div>
            <h2>Ready to start learning AI?</h2>
            <p>Join the free 2-hour live online demo, or talk to a counsellor about the course that fits your goals.</p>
          </div>
          <div className="fx-cta-btns">
            <a href={h('#register')} className="btn btn-navy btn-lg" data-cta="footer">
              Register Free <FsIcon id="i-arrow" />
            </a>
            <a href={INSTITUTE.phoneHref} className="btn btn-ghost btn-lg">
              Call {INSTITUTE.phone}
            </a>
          </div>
        </div>

        <div className="fx-grid">
          <div className="fx-brand">
            <Link to="/" className="fx-logo" aria-label="Coding Hubs School of AI home">
              <img src={LOGO_WIDE} alt="Coding Hubs School of AI logo" width={720} height={208} loading="lazy" />
            </Link>
            <p>Practical AI &amp; development training for learners across Delhi NCR. Learn live, build real projects, ask your questions.</p>
            <ul className="fx-social" aria-label="Social media">
              {socials.map((x) => (
                <li key={x.label}>
                  <a href={x.href} target="_blank" rel="noopener noreferrer" aria-label={x.label} title={x.label}>
                    <FsIcon id={x.id} className="ico ico-fill" />
                  </a>
                </li>
              ))}
            </ul>
          </div>

          <nav className="fx-col" aria-label="Quick links">
            <h2>Explore</h2>
            <ul>
              <li><a href={home ? '#home' : '/'}>Home</a></li>
              <li><a href={h('#demo-classes')}>Free Demo Classes</a></li>
              <li><a href={h('#courses')}>All Courses</a></li>
              <li><Link to="/locations/">AI Course Locations</Link></li>
              <li><a href="/blog">Blog</a></li>
              <li><a href="/case-studies">Case Studies</a></li>
              <li><a href="/projects">Projects</a></li>
              <li><a href="/project-guides">Project Guides</a></li>
              <li><a href="/store">Store</a></li>
              <li><a href={h('#faq')}>FAQ</a></li>
              <li><a href={h('#contact')}>Contact</a></li>
            </ul>
          </nav>

          <nav className="fx-col" aria-label="Popular courses">
            <h2>Popular Courses</h2>
            <ul>
              {COURSE_NAMES.slice(0, 7).map((c) => (
                <li key={c}>
                  <a href={h('#courses')}>{c}</a>
                </li>
              ))}
            </ul>
          </nav>

          <div className="fx-col">
            <h2>Get in touch</h2>
            <ul className="fx-contact">
              <li>
                <span className="fx-ico"><FsIcon id="i-phone" /></span>
                <a href={INSTITUTE.phoneHref}>{INSTITUTE.phone}</a>
              </li>
              <li>
                <span className="fx-ico"><FsIcon id="i-mail" /></span>
                <a href={`mailto:${INSTITUTE.email}`}>{INSTITUTE.email}</a>
              </li>
              <li>
                <span className="fx-ico"><FsIcon id="i-wa" className="ico ico-fill" /></span>
                <a href={waHref} target="_blank" rel="noopener noreferrer">Chat on WhatsApp</a>
              </li>
              <li>
                <span className="fx-ico"><FsIcon id="i-pin" /></span>
                <span>
                  <strong>Head Office</strong>
                  <br />
                  {HEAD_OFFICE.line}
                </span>
              </li>
            </ul>
          </div>
        </div>

        <div className="fx-locs">
          <h2>AI course locations</h2>
          <ul className="fx-loc-regions">
            {GROUP_ORDER.map((g) => (
              <li key={g}>
                <Link to={`/locations/?region=${g}`}>
                  {GROUP_LABELS[g]} <span>({LOCATIONS.filter((l) => l.group === g).length})</span>
                </Link>
              </li>
            ))}
            <li>
              <Link to="/locations/" className="fx-loc-all">
                View all {LOCATIONS.length} locations
              </Link>
            </li>
          </ul>
        </div>

        <div className="fx-bottom">
          <p>
            © {new Date().getFullYear()} {INSTITUTE.name}. All rights reserved.
          </p>
          <ul>
            <li><a href="/policies#privacy">Privacy Policy</a></li>
            <li><a href="/policies#terms">Terms &amp; Conditions</a></li>
            <li><a href="/policies#rescheduling">Rescheduling Policy</a></li>
          </ul>
          <button type="button" className="fx-top" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} aria-label="Back to top">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M12 19V5M5 12l7-7 7 7" />
            </svg>
          </button>
        </div>
      </div>
    </footer>
  )
}
