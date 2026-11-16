import { Link } from 'react-router-dom'
import { FsIcon } from '../pages/free-session/icons'
import { INSTITUTE, WHATSAPP } from '../pages/free-session/data'
import { useRegisterPopup } from '../lib/register-popup'
import { FloatingContact } from '../components/FloatingContact'
import { Header } from '../components/Header'
import '../components/shared-footer.css'
import { COURSE_NAMES, GROUP_LABELS, GROUP_ORDER, HEAD_OFFICE, LOCATIONS } from './registry'

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

/** Shared primary header for public page shells. */
export function FsHeader() {
  return <Header />
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
    <section className="footer-cta" aria-label="Register for the free demo">
      <div className="wrap">
        <div className="sf-cta">
          <div>
            <h2>Find the Right Course for Your Next Step</h2>
            <p>Join a free 2-hour live demo to explore the course, see a practical demonstration and ask the trainer your questions.</p>
          </div>
          <div className="sf-cta-btns">
            <button type="button" className="sf-button sf-button-primary" data-cta="footer" onClick={() => popup.open()}>
              Book Free Demo <FsIcon id="i-arrow" />
            </button>
            <a href={INSTITUTE.phoneHref} className="sf-button sf-button-secondary">
              Talk to a Counsellor
            </a>
          </div>
        </div>
      </div>
    </section>
    <footer className="site-footer">
      <div className="wrap">
        <div className="sf-grid">
          <div className="sf-brand">
            <Link to="/" className="sf-logo" aria-label="Coding Hubs School of AI home">
              <img src={LOGO_WIDE} alt="Coding Hubs School of AI logo" width={720} height={208} loading="lazy" />
            </Link>
            <p>Practical AI &amp; development training for learners across Delhi NCR. Learn live, build real projects, ask your questions.</p>
          </div>

          <nav className="sf-col" aria-label="Quick links">
            <h2>Explore</h2>
            <ul>
              <li><a href={home ? '#home' : '/'}>Home</a></li>
              <li><HLink home={home} to={h('#demo-classes')}>Recorded Demo Videos</HLink></li>
              <li><Link to="/courses/">All Courses</Link></li>
              <li><Link to="/locations/">AI Course Locations</Link></li>
              <li><Link to="/blog">Blog</Link></li>
              <li><Link to="/case-studies">Case Studies</Link></li>
              <li><Link to="/our-work">Our Work</Link></li>
              <li><Link to="/ai-tools">AI Tools</Link></li>
              <li><Link to="/projects">Projects</Link></li>
              <li><Link to="/project-guides">Project Guides</Link></li>
              <li><Link to="/interview-prep/">Interview Prep</Link></li>
              <li><Link to="/book-a-tutor/">Book a Tutor</Link></li>
              <li><Link to="/latest-jobs/">Latest Jobs</Link></li>
              <li><Link to="/learn/">Learning Library</Link></li>
              <li><Link to="/visual-lab/">Visual Lab</Link></li>
              <li><Link to="/faq">FAQ</Link></li>
              <li><Link to="/interview-studio">Interview Studio</Link></li>
              <li><HLink home={home} to={h('#contact')}>Support</HLink></li>
            </ul>
          </nav>

          <nav className="sf-col" aria-label="Popular courses">
            <h2>Popular Courses</h2>
            <ul>
              {COURSE_NAMES.slice(0, 7).map((c) => (
                <li key={c}>
                  <Link to="/courses/">{c}</Link>
                </li>
              ))}
            </ul>
          </nav>

          <div className="sf-col">
            <h2>Get in touch</h2>
            <ul className="sf-contact">
              <li>
                <span className="sf-ico"><FsIcon id="i-phone" /></span>
                <a href={INSTITUTE.phoneHref}>{INSTITUTE.phone}</a>
              </li>
              <li>
                <span className="sf-ico"><FsIcon id="i-mail" /></span>
                <a href={`mailto:${INSTITUTE.email}`}>{INSTITUTE.email}</a>
              </li>
              <li>
                <span className="sf-ico"><FsIcon id="i-wa" className="ico ico-fill" /></span>
                <a href={waHref} target="_blank" rel="noopener noreferrer">Chat on WhatsApp</a>
              </li>
              <li>
                <span className="sf-ico"><FsIcon id="i-pin" /></span>
                <span>
                  <strong>Head Office</strong>
                  <br />
                  {HEAD_OFFICE.line}
                </span>
              </li>
            </ul>
          </div>
        </div>

        <div className="sf-locs">
          <h2>Explore AI courses by location</h2>
          <p className="sf-location-note">Our head office is in Netaji Subhash Place, Delhi. These guides cover learning options by area; they are not a list of physical campuses.</p>
          <ul className="sf-loc-regions">
            {GROUP_ORDER.map((g) => (
              <li key={g}>
                <Link to={`/locations/?region=${g}`}>
                  {GROUP_LABELS[g]} <span>({LOCATIONS.filter((l) => l.group === g).length})</span>
                </Link>
              </li>
            ))}
            <li>
              <Link to="/locations/" className="sf-loc-all">
                View all {LOCATIONS.length} locations
              </Link>
            </li>
          </ul>
        </div>

        <ul className="sf-social-row" aria-label="Social media">
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

      <div className="sf-bar">
        <div className="wrap sf-bottom">
          <p>
            © {new Date().getFullYear()} {INSTITUTE.name}. All rights reserved.
          </p>
          <p className="sf-credit">
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
