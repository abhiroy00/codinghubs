import { ArrowIcon } from '../../lib/icons'
import { useModal } from '../../lib/modal-context'
import { Billboard } from './Billboard'
import { HeroBackground } from './HeroBackground'

export function Hero() {
  const { openModal } = useModal()

  return (
    <section className="hero" aria-labelledby="home-hero">
      <HeroBackground />
      <div className="container-x" style={{ position: 'relative' }}>
        <div className="hero-grid">
          <div style={{ maxWidth: '36rem' }}>
            <h1 id="home-hero" className="display-lg rv-up" data-d="0">
              AI will shape your career.<span className="sub">Are you ready?</span>
            </h1>
            <p className="lede mt-6 rv-up" data-d="100">
              <span className="mark-accent">AI</span> is changing how software gets built. Learn AI, Data Science &amp; Full
              Stack with real mentors — and get job-ready before everyone else does.
            </p>
            <div className="btn-row rv-up" data-d="200" style={{ marginTop: '2.25rem' }}>
              <button type="button" className="btn btn-lime" onClick={() => openModal('demo')}>
                <span className="shine"></span>
                <span>Begin with a free demo class</span>
              </button>
              <button type="button" className="btn btn-ghost" onClick={() => openModal()}>
                <span className="shine"></span>
                <span>Talk to an Expert</span>
                <ArrowIcon />
              </button>
            </div>
            <div className="rv-up" data-d="300" style={{ marginTop: '2.25rem' }}>
              <div className="next-card">
                <span className="icon-chip" aria-hidden="true">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="4" width="18" height="18" rx="3" />
                    <path d="M16 2v4M8 2v4M3 10h18" />
                  </svg>
                </span>
                <div>
                  <p className="tiny-label">Next demo class</p>
                  <p
                    className="font-display"
                    style={{ marginTop: '.25rem', fontSize: '.9375rem', fontWeight: 600, lineHeight: 1.25, letterSpacing: '-.02em', color: 'var(--color-muted)' }}
                  >
                    Mon – Sat · 9:00 AM – 7:00 PM
                  </p>
                </div>
              </div>
              <p style={{ marginTop: '.75rem', fontSize: '.8125rem', color: 'var(--color-muted)' }}>
                Mon – Sat · Delhi NCR · <span className="strike">Paid</span> <span className="ok">FREE</span>
              </p>
            </div>
          </div>

          <div className="rv-up" data-d="250">
            <Billboard />
          </div>
        </div>
      </div>
    </section>
  )
}
