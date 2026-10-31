import { useState } from 'react'
import { Link } from 'react-router-dom'
import { FsIcon, IconSprite } from '../pages/free-session/icons'
import { INSTITUTE, WHATSAPP } from '../pages/free-session/data'
import { useRegisterPopup } from '../lib/register-popup'
import { FloatingContact } from '../components/FloatingContact'
import { ScrollProgress } from '../components/ScrollProgress'
import { LocationsMenu } from './LocationsMenu'
import { ResourcesMenu } from './ResourcesMenu'
import { COURSE_NAMES, GROUP_LABELS, GROUP_ORDER, HEAD_OFFICE, LOCATIONS } from './registry'

/** Official Coding Hubs School of AI logo (transparent PNG) on a white pill so it reads on the dark header. */
/** In-page anchor on the home page, client-side route to it from every other page (no full reload). */
function HLink({ home, to, children, ...rest }: { home: boolean; to: string; children: React.ReactNode } & Omit<React.AnchorHTMLAttributes<HTMLAnchorElement>, 'href'>) {
  return home ? <a href={to} {...rest}>{children}</a> : <Link to={to} {...(rest as object)}>{children}</Link>
}

export function BrandLogo({ home = false }: { home?: boolean }) {
  const inner = (
    <span className="brand-pill">
      <picture>
        <source srcSet="/assets/coding-hubs-school-of-ai-logo-wide.webp" type="image/webp" />
        <img className="brand-logo" src="/assets/coding-hubs-school-of-ai-logo-wide.png" alt="Coding Hubs School of AI" width={720} height={208} />
      </picture>
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
  const popup = useRegisterPopup()
  return (
    <>
      <IconSprite />
      <a href="#main" className="skip">
        Skip to content
      </a>
      <ScrollProgress />
      <header className="hdr" id="hdr">
        <div className="wrap hdr-in">
          <BrandLogo />
          <nav className={`nav${navOpen ? ' open' : ''}`} id="nav" aria-label="Primary">
            <a href="/">Home</a>
            <Link to="/#demo-classes" onClick={() => setNavOpen(false)}>Free Demo Classes</Link>
            <Link to="/courses/" onClick={() => setNavOpen(false)}>Courses</Link>
            <Link to="/interview-prep/" onClick={() => setNavOpen(false)}>Interview Prep</Link>
            <Link to="/certificates/" onClick={() => setNavOpen(false)}>Certificates</Link>
            <Link to="/book-a-tutor/" onClick={() => setNavOpen(false)}>Book a Tutor</Link>
            <LocationsMenu onNavigate={() => setNavOpen(false)} />
            <a href="/store">Store</a>
            <ResourcesMenu />
            <button type="button" className="btn btn-yellow nav-cta" onClick={() => { setNavOpen(false); popup.open() }}>
              <FsIcon id="i-tap" />Register for Free Demo
            </button>
          </nav>
          <div className="hdr-actions">
            <a href={INSTITUTE.phoneHref} className="hdr-phone">
              <FsIcon id="i-phone" />{INSTITUTE.phone}
            </a>
            <button type="button" className="btn btn-yellow btn-sm hdr-cta" onClick={() => popup.open()}>
              <FsIcon id="i-tap" />Free Demo<span className="free-badge-red">FREE</span>
            </button>
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
  const popup = useRegisterPopup()
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
    <>
    <footer className="ftr fx">
      <span className="fx-blob" aria-hidden="true"></span>
      <div className="wrap">
        <div className="fx-cta">
          <div>
            <h2>Ready to start learning AI?</h2>
            <p>Join the free 2-hour live online demo, or talk to a counsellor about the course that fits your goals.</p>
          </div>
          <div className="fx-cta-btns">
            <button type="button" className="btn btn-navy btn-lg" data-cta="footer" onClick={() => popup.open()}>
              Register Free <FsIcon id="i-arrow" />
            </button>
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
              <li><HLink home={home} to={h('#demo-classes')}>Free Demo Classes</HLink></li>
              <li><Link to="/courses/">All Courses</Link></li>
              <li><Link to="/locations/">AI Course Locations</Link></li>
              <li><a href="/blog">Blog</a></li>
              <li><a href="/case-studies">Case Studies</a></li>
              <li><a href="/projects">Projects</a></li>
              <li><a href="/store">Store</a></li>
              <li><HLink home={home} to={h('#contact')}>Contact</HLink></li>
            </ul>
          </nav>

          <nav className="fx-col" aria-label="Popular courses">
            <h2>Popular Courses</h2>
            <ul>
              {COURSE_NAMES.slice(0, 7).map((c) => (
                <li key={c}>
                  <HLink home={home} to={h('#courses')}>{c}</HLink>
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
          <p className="fx-credit">
            Powered &amp; Developed by <a href="https://innovativeais.com/">Innovative AI Solutions</a>
          </p>
          <ul>
            <li><a href="/policies#privacy">Privacy Policy</a></li>
            <li><a href="/policies#terms">Terms &amp; Conditions</a></li>
            <li><a href="/policies#rescheduling">Rescheduling Policy</a></li>
          </ul>
        </div>
      </div>
    </footer>
    <FloatingContact />
    </>
  )
}
