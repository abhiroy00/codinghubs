import { useMemo } from 'react'
import { useParams } from 'react-router-dom'
import { FS_CSS } from '../lib/fs-css'
import { useScopedStylesheet } from '../hooks/useScopedStylesheet'
import { FsFooter, FsHeader } from '../locations/FsShell'
import { WHATSAPP } from './free-session/data'
import { FsIcon } from './free-session/icons'
import { NotFound } from './NotFound'
import { useRegisterPopup } from '../lib/register-popup'
import { getProgram } from './free-session/programs'
import { HeroVideo } from '../components/HeroVideo'
import { pageSeo, programMeta } from '../seo/site'
import { useSeo } from '../seo/useSeo'
import { CourseBrochureSection } from '../learning/CourseBrochureSection'

const WA_HREF = `https://wa.me/${WHATSAPP.number}?text=${encodeURIComponent(WHATSAPP.genericMessage)}`

export function Curriculum() {
  useScopedStylesheet([
    FS_CSS,
  ])

  const popup = useRegisterPopup()
  const { slug } = useParams<{ slug: string }>()
  const program = getProgram(slug)

  const seo = useMemo(() => program ? pageSeo(programMeta(program)) : null, [program])
  useSeo(seo)

  if (!program) return <NotFound />

  return (
    <div className="fs-page">
      <FsHeader />

      <main id="main">
        <section className="curriculum-banner hv-host" aria-labelledby="curriculum-title">
          <HeroVideo clip="course-detail" />
          <div className="wrap curriculum-banner-in">
            <p className="eyebrow">15-Day Training Program</p>
            <h1 id="curriculum-title">{program.title}</h1>
            <p className="sub">{program.tagline}</p>
            <ul className="form-meta" aria-label="Program summary">
              <li>
                <FsIcon id="i-cal" />15 Days
              </li>
              <li>
                <FsIcon id="i-monitor" />Online Live
              </li>
            </ul>
          </div>
        </section>

        <div className="wrap" style={{ paddingTop: '2rem' }}>
          <CourseBrochureSection key={program.slug} course={{ slug: program.slug, name: program.title, category: '15-Day Training Program' }} />
        </div>

        <section className="sec sec-alt curriculum-sec" aria-label={`${program.title} day-by-day plan`}>
          <div className="wrap">
            <div className="sec-head center reveal">
              <p className="eyebrow">Day by day</p>
              <h2 className="h2">
                What You'll Learn, <span className="marker">Day by Day</span>
              </h2>
              <p className="sub">Tap a day to see what it covers.</p>
            </div>
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
              <button type="button" className="btn btn-anim btn-yellow btn-lg" onClick={() => popup.open()}>
                Register for Free <FsIcon id="i-arrow" />
              </button>
              <a href={WA_HREF} target="_blank" rel="noopener noreferrer" className="btn btn-wa btn-lg">
                <FsIcon id="i-wa" />
                <span>Ask a question</span>
              </a>
            </div>
          </div>
        </section>
      </main>

      <FsFooter />
    </div>
  )
}
