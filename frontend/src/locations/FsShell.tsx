import { Link } from 'react-router-dom'
import { FsIcon } from '../pages/free-session/icons'
import { INSTITUTE, WHATSAPP } from '../pages/free-session/data'
import { PROGRAMS } from '../pages/free-session/programs'
import { useRegisterPopup } from '../lib/register-popup'
import { FloatingContact } from '../components/FloatingContact'
import { Header } from '../components/Header'
import { useOptionalAuth } from '../lib/auth-context'
import { COURSE_NAMES, GROUP_LABELS, GROUP_ORDER, HEAD_OFFICE, LOCATIONS } from './registry'

/** Official Coding Hubs School of AI logo (transparent PNG) on a white pill so it reads on the dark header. */
/** In-page anchor on the home page, client-side route to it from every other page (no full reload). */
function HLink({ home, to, children, ...rest }: { home: boolean; to: string; children: React.ReactNode } & Omit<React.AnchorHTMLAttributes<HTMLAnchorElement>, 'href'>) {
  return home ? <a href={to} {...rest}>{children}</a> : <Link to={to} {...(rest as object)}>{children}</Link>
}
/** WebP logo widths: 288 covers the ~140px-wide header logo on 1x/2x screens, 720 covers 3x screens. */
export const LOGO_WIDE_SRCSET = '/assets/coding-hubs-school-of-ai-logo-wide-w288.webp 288w, /assets/coding-hubs-school-of-ai-logo-wide.webp 720w'

/** Wide logo as WebP with the PNG as fallback. `displayWidth` is the CSS width it renders at (for srcset selection). */
export function LogoWide({ alt, displayWidth, className, lazy, style }: { alt: string; displayWidth: number; className?: string; lazy?: boolean; style?: React.CSSProperties }) {
  return (
    <picture>
      <source srcSet={LOGO_WIDE_SRCSET} sizes={`${displayWidth}px`} type="image/webp" />
      <img className={className} src={LOGO_WIDE} alt={alt} width={720} height={208} loading={lazy ? 'lazy' : undefined} decoding={lazy ? 'async' : undefined} style={style} />
    </picture>
  )
}

export function BrandLogo({ home = false }: { home?: boolean }) {
  // .brand-logo is 40px tall at most (free-session.css), i.e. about 139px wide.
  const inner = (
    <span className="brand-pill">
      <LogoWide className="brand-logo" alt="Coding Hubs School of AI" displayWidth={139} />
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

/** Shared primary header for public page shells. */
export function FsHeader() {
  return <Header />
}

export function FsFooter({ home = false }: { home?: boolean }) {
  const popup = useRegisterPopup()
  const auth = useOptionalAuth()
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
    <section className="fx-cta-sec" aria-label="Register for the free demo">
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
      </div>
    </section>
    <footer className="ftr fx" id="site-footer">
      <span className="fx-blob" aria-hidden="true"></span>
      <div className="wrap">
        <div className="fx-grid">
          <div className="fx-brand">
            <Link to="/" className="fx-logo" aria-label="Coding Hubs School of AI home">
              <LogoWide alt="Coding Hubs School of AI logo" displayWidth={160} lazy />
            </Link>
            <p>Practical AI &amp; development training for learners across Delhi NCR. Learn live, build real projects, ask your questions.</p>
          </div>

          <nav className="fx-col" aria-label="Quick links">
            <h2>Explore</h2>
            <ul>
              <li><a href={home ? '#home' : '/'}>Home</a></li>
              <li><HLink home={home} to={h('#demo-classes')}>Free Demo Classes</HLink></li>
              <li><Link to="/courses/">All Courses</Link></li>
              <li><Link to="/locations/">AI Course Locations</Link></li>
              <li><Link to="/blog">Blog</Link></li>
              <li><Link to="/case-studies">Case Studies</Link></li>
              <li><Link to="/our-work">Our Work</Link></li>
              <li><Link to="/ai-tools">AI Tools</Link></li>
              <li><Link to="/projects">Projects</Link></li>
              <li><Link to="/learn/">Learning Library</Link></li>
              <li><Link to="/visual-lab/">Visual Lab</Link></li>
              <li><Link to="/faq">FAQ</Link></li>
              <li><Link to="/newsletter/">Newsletter</Link></li>
              <li><Link to="/brochures/">Course Brochures</Link></li>
              <li><Link to="/interview-studio">Interview Studio</Link></li>
              <li><HLink home={home} to={h('#contact')}>Support</HLink></li>
              {!auth?.user && <li><Link to="/login" className="sh-login">Log in</Link></li>}
            </ul>
          </nav>

          <nav className="fx-col" aria-label="Courses and programs">
            <h2>Popular Courses</h2>
            <ul>
              {COURSE_NAMES.slice(0, 7).map((c) => (
                <li key={c}>
                  <Link to="/courses/">{c}</Link>
                </li>
              ))}
            </ul>
            <h2>15-Day Programs</h2>
            <ul>
              {PROGRAMS.map((program) => (
                <li key={program.slug}>
                  <Link to={`/program/${program.slug}`}>{program.title}</Link>
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

        <ul className="fx-social-row" aria-label="Social media">
          {socials.map((x) => (
            <li key={x.label}>
              <a href={x.href} target="_blank" rel="noopener noreferrer">
                <FsIcon id={x.id} className="ico ico-fill" />
                {x.label}
              </a>
            </li>
          ))}
        </ul>
      </div>

      <div className="fx-bar">
        <div className="wrap fx-bottom">
          <p>
            © {new Date().getFullYear()} {INSTITUTE.name}. All rights reserved.
          </p>
          <p className="fx-credit">
            Powered and developed by <a href="https://innovativeais.com/" target="_blank" rel="noopener noreferrer">Innovative AI Solutions</a>
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
