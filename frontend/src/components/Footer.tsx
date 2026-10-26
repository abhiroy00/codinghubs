import { Link } from 'react-router-dom'
import { PHONE, WA, Logo } from '../lib/icons'

export function Footer() {
  return (
    <footer>
      <div className="container-x f-in">
        <div className="f-grid">
          <div>
            <Link to="/" aria-label="Coding Hubs School of AI home">
              <Logo />
            </Link>
            <p style={{ marginTop: '1rem', maxWidth: '20rem', fontSize: '.9375rem', lineHeight: 1.625, color: 'var(--color-muted)' }}>
              Practical AI &amp; Full Stack education for the future of work.
            </p>
            <ul className="contact-list">
              <li>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <path d="M12 21s-7-6.2-7-11a7 7 0 0 1 14 0c0 4.8-7 11-7 11Z" />
                  <circle cx="12" cy="10" r="2.5" />
                </svg>
                <span>904, 9th Floor, Pearls Best Heights-I, Netaji Subhash Place, Delhi – 110034</span>
              </li>
              <li>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1.9.4 1.8.7 2.7a2 2 0 0 1-.5 2.1L8 9.8a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.7.7a2 2 0 0 1 1.7 2Z" />
                </svg>
                <a href={`tel:+${WA}`}>{PHONE}</a> · Mon – Sat, 9 AM – 7 PM
              </li>
            </ul>
            <ul className="social">
              <li>
                <a href="https://instagram.com/" target="_blank" rel="noopener noreferrer">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="3" y="3" width="18" height="18" rx="5" />
                    <circle cx="12" cy="12" r="4" />
                    <circle cx="17.5" cy="6.5" r="1" fill="currentColor" />
                  </svg>
                  <span className="sr-only">Instagram</span>
                </a>
              </li>
              <li>
                <a href="https://linkedin.com/" target="_blank" rel="noopener noreferrer">
                  <svg viewBox="0 0 24 24" fill="currentColor">
                    <path d="M4.98 3.5a2.5 2.5 0 1 1 0 5 2.5 2.5 0 0 1 0-5ZM3 9.5h4V21H3V9.5Zm6.5 0h3.8v1.6h.1c.5-1 1.8-2 3.8-2 4 0 4.8 2.6 4.8 6V21h-4v-5.1c0-1.2 0-2.8-1.7-2.8s-2 1.3-2 2.7V21h-4V9.5Z" />
                  </svg>
                  <span className="sr-only">LinkedIn</span>
                </a>
              </li>
              <li>
                <a href="https://youtube.com/" target="_blank" rel="noopener noreferrer">
                  <svg viewBox="0 0 24 24" fill="currentColor">
                    <path d="M23 7.2a3 3 0 0 0-2.1-2.1C19 4.6 12 4.6 12 4.6s-7 0-8.9.5A3 3 0 0 0 1 7.2 31 31 0 0 0 .5 12a31 31 0 0 0 .5 4.8 3 3 0 0 0 2.1 2.1c1.9.5 8.9.5 8.9.5s7 0 8.9-.5a3 3 0 0 0 2.1-2.1 31 31 0 0 0 .5-4.8 31 31 0 0 0-.5-4.8ZM9.7 15.1V8.9l5.8 3.1-5.8 3.1Z" />
                  </svg>
                  <span className="sr-only">YouTube</span>
                </a>
              </li>
              <li>
                <a href="https://x.com/" target="_blank" rel="noopener noreferrer">
                  <svg viewBox="0 0 24 24" fill="currentColor" style={{ width: 15, height: 15 }}>
                    <path d="M18.2 2.3h3.3l-7.2 8.3 8.5 11.2h-6.7l-5.2-6.8-6 6.8H1.6l7.7-8.8L1.2 2.3h6.8l4.7 6.2 5.5-6.2Zm-1.2 17.5h1.8L7.1 4.2H5.1l11.9 15.6Z" />
                  </svg>
                  <span className="sr-only">X</span>
                </a>
              </li>
            </ul>
          </div>
          <div className="f-cols">
            <nav aria-label="Learn">
              <h2>Learn</h2>
              <ul>
                <li>
                  <Link to="/#demo">Free Demo Class</Link>
                </li>
                <li>
                  <Link to="/#courses">AI &amp; Data</Link>
                </li>
                <li>
                  <Link to="/#courses">Full Stack</Link>
                </li>
                <li>
                  <Link to="/#courses">Cloud &amp; Cyber</Link>
                </li>
                <li>
                  <Link to="/#compare">Compare Programs</Link>
                </li>
              </ul>
            </nav>
            <nav aria-label="Company">
              <h2>Company</h2>
              <ul>
                <li>
                  <Link to="/faq#team">About</Link>
                </li>
                <li>
                  <Link to="/#learners">Success Stories</Link>
                </li>
                <li>
                  <Link to="/faq#team">Mentors</Link>
                </li>
                <li>
                  <Link to="/#placements">Hiring Partners</Link>
                </li>
                <li>
                  <a href={`tel:+${WA}`}>Contact</a>
                </li>
              </ul>
            </nav>
            <nav aria-label="Support">
              <h2>Support</h2>
              <ul>
                <li>
                  <Link to="/faq">FAQ</Link>
                </li>
                <li>
                  <Link to="/policies">Terms</Link>
                </li>
                <li>
                  <Link to="/policies">Privacy</Link>
                </li>
                <li>
                  <Link to="/policies">Refund Policy</Link>
                </li>
              </ul>
            </nav>
          </div>
        </div>
        <div className="f-bottom">
          <p>© {new Date().getFullYear()} Coding Hubs School of AI. All rights reserved.</p>
          <p>AI skills for the future of work.</p>
        </div>
      </div>
    </footer>
  )
}
