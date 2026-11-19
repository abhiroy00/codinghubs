import { HomeNewsletter } from '../community/HomeNewsletter'
import { useEffect, useRef, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { useLenisRef } from '../lib/lenis-context'
import { useRegisterPopup } from '../lib/register-popup'
import { FS_CSS } from '../lib/fs-css'
import { useScopedStylesheet } from '../hooks/useScopedStylesheet'
import { FsFooter } from '../locations/FsShell'
import { COURSES } from './free-session/data'
import { INSTITUTE, SESSION } from './free-session/data'
import { FsIcon } from './free-session/icons'
import { Header } from '../components/Header'
import { BatchAnnouncement, JoinHero } from './free-session/JoinHero'
import { HomePathways } from './free-session/HomePathways'
import { HomeProjects } from './free-session/HomeProjects'
import { HomeTools } from './free-session/HomeTools'
import { CareerLaunch } from './free-session/CareerLaunch'
import { InnovativeToolkit } from '../components/InnovativeToolkit'
import { ContactHub } from './free-session/ContactHub'
import './free-session/home.css'
import './free-session/home-theme.css'
import { LogoWall } from './free-session/HomeExplore'
import { useFsReveal } from './free-session/useFsReveal'
import { HOME_META, pageSeo } from '../seo/site'
import { useSeo } from '../seo/useSeo'
import { AnimatedCard, Reveal } from '../components/ui'

const HOME_SEO = pageSeo(HOME_META)


export function FreeSession() {
  useSeo(HOME_SEO)
  useScopedStylesheet([
    FS_CSS,
  ], { preserveFirstPaint: true })

  const rootRef = useRef<HTMLDivElement>(null)
  const lenisRef = useLenisRef()
  const popup = useRegisterPopup()
  const location = useLocation()
  useFsReveal(rootRef)

  const [pastHero, setPastHero] = useState(false)

  useEffect(() => {
    if (!('IntersectionObserver' in window)) return
    const heroTopEl = rootRef.current?.querySelector('.join-copy')
    const io2 = heroTopEl
      ? new IntersectionObserver(([en]) => setPastHero(!en.isIntersecting && en.boundingClientRect.top < 0))
      : null
    if (heroTopEl && io2) io2.observe(heroTopEl)
    return () => {
      io2?.disconnect()
    }
  }, [])

  function goToForm(course?: string) {
    popup.open(course)
  }

  // Arriving from another page (/#register, /#courses): scroll to the section once the page has laid out.
  useEffect(() => {
    const id = location.hash.slice(1)
    if (!id) return
    if (id === 'register') { goToForm(); return }
    let cancelled = false
    let frame = 0
    const align = () => {
      // Page styles and fonts change section positions after an inner-page navigation.
      void document.fonts.ready.then(() => {
        if (cancelled) return
        frame = requestAnimationFrame(() => {
          const el = document.getElementById(id)
          if (!el) return
          const inset = (document.getElementById('hdr')?.getBoundingClientRect().height ?? 72) + 16
          const top = id === 'home' ? 0 : Math.max(0, window.scrollY + el.getBoundingClientRect().top - inset)
          if (lenisRef.current) {
            lenisRef.current.resize()
            // Numeric targets avoid applying the header inset again via CSS scroll-margin/padding.
            lenisRef.current.scrollTo(top)
          } else window.scrollTo({ top, behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' })
        })
      })
    }
    const stylesheet = document.querySelector<HTMLLinkElement>(`link[rel="stylesheet"][href="${FS_CSS}"]`)
    if (stylesheet && !stylesheet.sheet) {
      stylesheet.addEventListener('load', align, { once: true })
      stylesheet.addEventListener('error', align, { once: true })
    } else align()
    // Other deferred stylesheets, fonts and images can still change the height of the sections above the target.
    // For a few seconds, re-align whenever the page height changes, unless the visitor has started scrolling.
    let userMoved = false
    const stopFollowing = () => { userMoved = true }
    const events = ['wheel', 'touchstart', 'keydown', 'pointerdown'] as const
    events.forEach((type) => window.addEventListener(type, stopFollowing, { passive: true, once: true }))
    let lastHeight = document.documentElement.scrollHeight
    const follow = new ResizeObserver(() => {
      const height = document.documentElement.scrollHeight
      if (userMoved || cancelled || Math.abs(height - lastHeight) < 2) return
      lastHeight = height
      align()
    })
    follow.observe(document.body)
    const stopTimer = window.setTimeout(() => follow.disconnect(), 4000)
    return () => {
      cancelled = true
      cancelAnimationFrame(frame)
      follow.disconnect()
      window.clearTimeout(stopTimer)
      events.forEach((type) => window.removeEventListener(type, stopFollowing))
      stylesheet?.removeEventListener('load', align)
      stylesheet?.removeEventListener('error', align)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.hash, location.key])

  function handleRootClick(e: React.MouseEvent) {
    const target = e.target as HTMLElement
    const cta = target.closest('[data-cta]') as HTMLElement | null
    if (cta) {
      if (cta.getAttribute('href') === '#register') {
        e.preventDefault()
        goToForm()
      }
    }
  }

  const showSticky = pastHero

  return (
    <div ref={rootRef} className="fs-page ch-home" onClick={handleRootClick}>
      <BatchAnnouncement />
      <Header />

      <main id="main">
        <JoinHero />
        <CareerLaunch />
        <HomePathways />
        <HomeProjects />

        <HomeTools />
        <InnovativeToolkit />
        <LogoWall />

        <section className="sec" id="session" aria-labelledby="session-title">
          <div className="wrap session-grid">
            <div>
              <p className="eyebrow">About the session</p>
              <h2 id="session-title" className="h2 reveal">
                What Will You Learn in Our <span className="marker">Free Live</span> Session?
              </h2>
              <p className="sub">A focused 2-hour live introduction to the course you choose — so you can decide with confidence.</p>
              <Reveal as="ol" stagger className="learn">
                <li>
                  <span className="learn-ico">
                    <FsIcon id="i-compass" />
                  </span>
                  <div>
                    <h3>Introduction to your course</h3>
                    <p>An overview of the selected technology or subject and where it is used.</p>
                  </div>
                </li>
                <li>
                  <span className="learn-ico">
                    <FsIcon id="i-play" />
                  </span>
                  <div>
                    <h3>Live demonstration</h3>
                    <p>A practical example or live demo, depending on the course you pick.</p>
                  </div>
                </li>
                <li>
                  <span className="learn-ico">
                    <FsIcon id="i-map" />
                  </span>
                  <div>
                    <h3>Modules &amp; learning roadmap</h3>
                    <p>How the course is structured and what you would learn step by step.</p>
                  </div>
                </li>
                <li>
                  <span className="learn-ico">
                    <FsIcon id="i-chat" />
                  </span>
                  <div>
                    <h3>Trainer Q&amp;A</h3>
                    <p>Interact with the trainer and get your questions answered live.</p>
                  </div>
                </li>
                <li>
                  <span className="learn-ico">
                    <FsIcon id="i-book" />
                  </span>
                  <div>
                    <h3>Full course &amp; admission info</h3>
                    <p>Details of the complete course and how the admission process works.</p>
                  </div>
                </li>
              </Reveal>
            </div>
            <aside className="session-card" aria-label="Session information">
              <div className="sc-head">
                <span className="live-dot" aria-hidden="true"></span>Session information
              </div>
              <dl className="sc-list">
                <div>
                  <dt>
                    <FsIcon id="i-clock" />Duration
                  </dt>
                  <dd>2 Hours</dd>
                </div>
                <div>
                  <dt>
                    <FsIcon id="i-monitor" />Mode
                  </dt>
                  <dd>Online Live Session</dd>
                </div>
                <div>
                  <dt>
                    <FsIcon id="i-cal" />Date
                  </dt>
                  <dd>{SESSION.date}</dd>
                </div>
                <div>
                  <dt>
                    <FsIcon id="i-clock" />Time
                  </dt>
                  <dd>{SESSION.time}</dd>
                </div>
                <div>
                  <dt>
                    <FsIcon id="i-ticket" />Fee
                  </dt>
                  <dd>
                    <span className="free-tag">FREE</span> for the demo session
                  </dd>
                </div>
              </dl>
              <p className="sc-note">
                <strong>Please note:</strong> this free session is a demonstration and introduction to the course. It is not the complete paid course.
              </p>
              <a href="#register" className="btn btn-anim btn-yellow btn-block" data-cta="session-card">
                Register for Free <FsIcon id="i-arrow" />
              </a>
            </aside>
          </div>
        </section>

        <section className="sec plan-sec" id="program" aria-labelledby="program-title">
          <div className="wrap">
            <div className="sec-head center reveal">
              <p className="eyebrow">Free live session</p>
              <h2 id="program-title" className="h2">
                Start with a <span className="marker">Free Live</span> Session.
              </h2>
              <p className="sub">Attend a free demo, see how we teach and ask your questions before choosing a course.</p>
            </div>

            <AnimatedCard bare className="demo-pass" aria-labelledby="demo-pass-title">
              <div className="dp-stub" aria-hidden="true">
                <span className="dp-step">Free demo</span>
                <span className="dp-free">FREE</span>
                <span className="dp-admit">Admit one · Live class</span>
              </div>
              <div className="dp-body">
                <p className="dp-live"><span className="dp-dot" aria-hidden="true" />Live online demo class</p>
                <h3 id="demo-pass-title">Your free pass to a 2-hour live class</h3>
                <p className="dp-lead">Sit in on a real class, see how we teach and ask the trainer anything — before you pay for anything.</p>
                <ol className="dp-agenda" aria-label="What happens in the session">
                  <li><b>01</b>Course introduction</li>
                  <li><b>02</b>Live demonstration</li>
                  <li><b>03</b>Modules &amp; roadmap</li>
                  <li><b>04</b>Trainer Q&amp;A</li>
                </ol>
                <div className="dp-foot">
                  <ul className="dp-facts" aria-label="Session details">
                    <li><FsIcon id="i-clock" />2 hours</li>
                    <li><FsIcon id="i-monitor" />Online live</li>
                    <li><FsIcon id="i-ticket" />No payment needed</li>
                  </ul>
                  <a href="#register" className="dp-cta" data-cta="plan-demo">
                    Claim my free seat <FsIcon id="i-arrow" />
                  </a>
                </div>
              </div>
            </AnimatedCard>

            <p className="plan-note">
              <FsIcon id="i-ticket" />Registering for the free demo costs nothing.
            </p>
          </div>
        </section>

        <section className="sec sec-process" id="how" aria-labelledby="how-title">
          <div className="wrap">
            <div className="sec-head center reveal">
              <p className="eyebrow eyebrow-light">How it works</p>
              <h2 id="how-title" className="h2">
                3 Simple <span className="marker">Steps</span>
              </h2>
            </div>
            <div className="steps-layout">
              <svg className="steps-thread" viewBox="0 0 1000 288" preserveAspectRatio="none" aria-hidden="true">
                <path d="M0 64C90 64 110 64 167 64 300 64 350 92 500 92S700 64 833 64 930 64 1000 64" />
              </svg>
              <ol className="steps">
                <AnimatedCard bare as="li" className="step reveal">
                  <div className="step-visual" aria-hidden="true">
                    <span className="step-diamond"><FsIcon id="i-compass" className="step-icon" /></span>
                    <span className="step-n">01</span>
                  </div>
                  <div className="step-copy">
                    <h3>Choose Your Course</h3>
                    <p>Pick the course you're curious about from the {COURSES.length} options.</p>
                  </div>
                </AnimatedCard>
                <AnimatedCard bare as="li" className="step reveal">
                  <div className="step-visual" aria-hidden="true">
                    <span className="step-diamond"><FsIcon id="i-pen" className="step-icon" /></span>
                    <span className="step-n">02</span>
                  </div>
                  <div className="step-copy">
                    <h3>Register for the Free Online Session</h3>
                    <p>Fill the short form — it's free.</p>
                  </div>
                </AnimatedCard>
                <AnimatedCard bare as="li" className="step reveal">
                  <div className="step-visual" aria-hidden="true">
                    <span className="step-diamond"><FsIcon id="i-monitor" className="step-icon" /></span>
                    <span className="step-n">03</span>
                  </div>
                  <div className="step-copy">
                    <h3>Attend the Live Demo &amp; Explore the Full Course</h3>
                    <p>Join online, learn live, ask questions and explore the full course.</p>
                  </div>
                </AnimatedCard>
              </ol>
            </div>
            <div className="center">
              <a href="#register" className="btn btn-anim btn-yellow btn-lg" data-cta="how-it-works">
                Book My Free Seat <FsIcon id="i-arrow" />
              </a>
            </div>
          </div>
        </section>

        <section className="sec" id="about" aria-labelledby="about-title">
          <div className="wrap about-grid">
            <div>
              <p className="eyebrow">About us</p>
              <h2 id="about-title" className="h2 reveal">
                About Coding Hubs <span className="marker">School of AI</span>
              </h2>
              <p className="sub">{INSTITUTE.name} offers instructor-led training in Artificial Intelligence, Software Development, Data Analytics, UI/UX Design and Digital Marketing.</p>
              <p className="about-p">Our free live demo sessions are designed to help students understand a course before admission — what it covers, how it is taught and whether it suits their goals.</p>
              <div className="trainer">
                <span className="trainer-ico">
                  <FsIcon id="i-users" />
                </span>
                <div>
                  <h3>Your trainer</h3>
                  <p>Trainer details for your selected course will be shared with registered students before the session.</p>
                </div>
              </div>
            </div>
            <figure className="about-students" aria-hidden="true">
              <span className="about-blob" />
              <img src="/img/students-1000.webp" srcSet="/img/students-720.webp 720w, /img/students-1000.webp 1000w, /img/students.webp 1400w" sizes="(max-width: 900px) 92vw, 620px" alt="" width={1400} height={665} loading="lazy" decoding="async" />
            </figure>
          </div>
        </section>

        <ContactHub />

        <HomeNewsletter />
      </main>

      <FsFooter home />

      <div className={`sticky-cta${showSticky ? ' show' : ''}`} aria-hidden={!showSticky}>
        <div>
          <strong>Free 2-hour live session</strong>
          <span>Online · Free</span>
        </div>
        <a href="#register" className="btn btn-anim btn-yellow btn-sm" data-cta="sticky-mobile" tabIndex={showSticky ? 0 : -1}>
          Register Free
        </a>
      </div>
    </div>
  )
}
