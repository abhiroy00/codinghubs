import { useEffect } from 'react'
import { Link, Navigate, useParams } from 'react-router-dom'
import { useScopedStylesheet } from '../hooks/useScopedStylesheet'
import { INSTITUTE, WHATSAPP } from './free-session/data'
import { FsIcon, IconSprite } from './free-session/icons'
import { getProgram } from './free-session/programs'

const WA_HREF = `https://wa.me/${WHATSAPP.number}?text=${encodeURIComponent(WHATSAPP.genericMessage)}`

export function Curriculum() {
  useScopedStylesheet([
    '/free-session.css',
    'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&family=Poppins:wght@600;700;800&display=swap',
  ])

  const { slug } = useParams<{ slug: string }>()
  const program = getProgram(slug)

  useEffect(() => {
    if (program) document.title = `${program.title} — Day-by-Day Plan | ${INSTITUTE.name}`
    return () => {
      document.title = 'Coding Hubs School of AI'
    }
  }, [program])

  if (!program) return <Navigate to="/" replace />

  return (
    <div className="fs-page">
      <IconSprite />

      <header className="hdr">
        <div className="wrap hdr-in">
          <Link to="/" className="logo" aria-label="Home">
            <img className="logo-img" src="/fs-assets/img/logo.jpg" alt={INSTITUTE.name} width={380} height={100} />
          </Link>
          <div className="hdr-actions">
            <Link to="/#register" className="btn btn-yellow btn-sm hdr-cta">
              <FsIcon id="i-tap" />Register<span className="free-badge-red">FREE</span>
            </Link>
          </div>
        </div>
      </header>

      <main>
        <section className="sec curriculum-hero" aria-labelledby="curriculum-title">
          <div className="wrap">
            <Link to="/" style={{ display: 'inline-flex', alignItems: 'center', gap: '.4rem', marginBottom: '1.25rem', color: 'var(--navy)', fontWeight: 600 }}>
              <svg className="ico" style={{ transform: 'scaleX(-1)' }} aria-hidden="true">
                <use href="#i-arrow" />
              </svg>
              Back to all programs
            </Link>
            <div className="sec-head center">
              <p className="eyebrow">15-Day Training Program</p>
              <h1 id="curriculum-title" className="h2">
                {program.title}
              </h1>
              <p className="sub">{program.tagline}</p>
              <p className="plan-price" style={{ justifyContent: 'center' }}>
                <span className="amt">₹4,999</span>
                <span className="per">15 days · online live</span>
              </p>
            </div>
          </div>
        </section>

        <section className="sec sec-alt" aria-label={`${program.title} day-by-day plan`}>
          <div className="wrap">
            <div className="faq curriculum-days">
              {program.days.map((day, i) => (
                <details key={day.title} open={i === 0}>
                  <summary>
                    <span className="day-n">{i + 1}</span>
                    {`Day ${i + 1}: ${day.title}`}
                  </summary>
                  <p>{day.desc}</p>
                </details>
              ))}
            </div>
          </div>
        </section>

        <section className="sec" aria-label="Enroll">
          <div className="wrap center">
            <h2 className="h2">Ready to start {program.title}?</h2>
            <p className="sub" style={{ marginBottom: '1.5rem' }}>
              Begin with the free 2-hour live demo session — no payment needed.
            </p>
            <div className="cta-row" style={{ justifyContent: 'center' }}>
              <Link to="/#register" className="btn btn-anim btn-yellow btn-lg">
                Register for Free <FsIcon id="i-arrow" />
              </Link>
              <a href={WA_HREF} target="_blank" rel="noopener noreferrer" className="btn btn-wa btn-lg">
                <FsIcon id="i-wa" />
                <span>Ask a question</span>
              </a>
            </div>
          </div>
        </section>
      </main>

      <footer className="ftr">
        <div className="wrap ftr-bottom">
          <p>
            © {new Date().getFullYear()} {INSTITUTE.name}. All rights reserved.
          </p>
          <Link to="/" className="to-top" aria-label="Back to home">
            <svg className="ico" aria-hidden="true" style={{ transform: 'rotate(-90deg)' }}>
              <use href="#i-arrow" />
            </svg>
          </Link>
        </div>
      </footer>
    </div>
  )
}
