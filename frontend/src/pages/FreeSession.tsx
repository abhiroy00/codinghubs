import { HomeNewsletter } from '../community/HomeNewsletter'
import { useEffect, useRef, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { useLenisRef } from '../lib/lenis-context'
import { useRegisterPopup } from '../lib/register-popup'
import { FS_CSS } from '../lib/fs-css'
import { useScopedStylesheet } from '../hooks/useScopedStylesheet'
import { FsFooter } from '../locations/FsShell'
import { COURSES } from './free-session/data'
import { INSTITUTE, SESSION, WHATSAPP } from './free-session/data'
import { FsIcon } from './free-session/icons'
import { Header } from '../components/Header'
import { BatchAnnouncement, JoinHero } from './free-session/JoinHero'
import { HomePathways } from './free-session/HomePathways'
import './free-session/home.css'
import './free-session/home-theme.css'
import { HomeExplore, LogoWall } from './free-session/HomeExplore'
import { useFsReveal } from './free-session/useFsReveal'
import { VideoReels } from './free-session/VideoReels'
import { HOME_META, pageSeo } from '../seo/site'
import { useSeo } from '../seo/useSeo'

const HOME_SEO = pageSeo(HOME_META)

const WA_HREF = `https://wa.me/${WHATSAPP.number}?text=${encodeURIComponent(WHATSAPP.genericMessage)}`

export function FreeSession() {
  useSeo(HOME_SEO)
  useScopedStylesheet([
    FS_CSS,
  ])

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
    return () => {
      cancelled = true
      cancelAnimationFrame(frame)
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
        <HomePathways />
        <LogoWall />

        <section className="sec videos" id="demo-classes" aria-labelledby="videos-title">
          <div className="v-deco" aria-hidden="true">
            <span></span>
            <span></span>
          </div>
          <div className="wrap">
            <div className="sec-head center reveal">
              <p className="free-badge">
                <span className="fb-play" aria-hidden="true">
                  <svg viewBox="0 0 24 24">
                    <path d="M8 5v14l11-7z" fill="currentColor" />
                  </svg>
                </span>
                FREE DEMO CLASSES<span className="fb-shine" aria-hidden="true"></span>
              </p>
              <h2 id="videos-title" className="h2">
                Watch Our Free Demo Classes <span className="marker">Before You Join</span>
              </h2>
              <p className="sub">
                Get a feel for how we teach. <strong>6</strong> short videos from our trainers. Tap any video to watch, no sign-up needed.
              </p>
            </div>

            <VideoReels />

            <div className="v-cta reveal">
              <div className="v-cta-text">
                <span className="v-cta-ico">
                  <FsIcon id="i-monitor" />
                </span>
                <p>
                  <strong>Liked the class?</strong> Join the <strong>free 2-hour LIVE session</strong> and ask the trainer your questions in real time.
                </p>
              </div>
              <div className="v-cta-btns">
                <button type="button" className="btn btn-anim btn-yellow" data-cta-location="video_section" onClick={() => goToForm()}>
                  Join Free Live Session <FsIcon id="i-arrow" />
                </button>
              </div>
            </div>
          </div>
        </section>

        <section className="sec" id="session" aria-labelledby="session-title">
          <div className="wrap session-grid">
            <div>
              <p className="eyebrow">About the session</p>
              <h2 id="session-title" className="h2 reveal">
                What Will You Learn in Our <span className="marker">Free Live</span> Session?
              </h2>
              <p className="sub">A focused 2-hour live introduction to the course you choose — so you can decide with confidence.</p>
              <ol className="learn">
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
              </ol>
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

            <article className="demo-pass" aria-labelledby="demo-pass-title">
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
            </article>

            <p className="plan-note">
              <FsIcon id="i-ticket" />Registering for the free demo costs nothing.
            </p>
          </div>
        </section>

        <section className="sec why-sec" id="why" aria-labelledby="why-title">
          <div className="why-deco" aria-hidden="true">
            <span className="wd1"></span>
            <span className="wd2"></span>
          </div>
          <div className="wrap">
            <div className="sec-head center reveal">
              <p className="eyebrow">Why join</p>
              <h2 id="why-title" className="h2 why-h2">
                Why Join Our <span className="marker">Free</span> Session?
                <span className="sticker st-1" aria-hidden="true">FREE</span>
                <span className="sticker st-2" aria-hidden="true">
                  <span className="live-dot"></span>LIVE
                </span>
              </h2>
              <p className="sub">Try before you decide. Two hours, live and online, to find out whether a course is right for you.</p>
            </div>

            <div className="bento">
              <article className="tile t-a reveal">
                <span className="t-num">01</span>
                <span className="t-ico">
                  <FsIcon id="i-eye" />
                </span>
                <h3>
                  Understand the course <em>before</em> admission
                </h3>
                <p>See what the course is really about before you commit to anything.</p>
                <ul className="ticks" aria-label="You will find out">
                  <li>
                    <FsIcon id="i-check" />What the course covers
                  </li>
                  <li>
                    <FsIcon id="i-check" />How the classes are taught
                  </li>
                  <li>
                    <FsIcon id="i-check" />Whether it suits your goals
                  </li>
                  <li>
                    <FsIcon id="i-check" />Course fee &amp; batch details
                  </li>
                  <li>
                    <FsIcon id="i-check" />What you can do after the course
                  </li>
                </ul>
                <div className="ideal">
                  <p className="ideal-h">Ideal for</p>
                  <ul className="ideal-chips">
                    <li>Students</li>
                    <li>Fresh graduates</li>
                    <li>Working professionals</li>
                    <li>Career switchers</li>
                  </ul>
                </div>
                <div className="try-ticket" aria-hidden="true">
                  <span>
                    TRY BEFORE
                    <br />
                    YOU DECIDE
                  </span>
                  <b>FREE</b>
                </div>
              </article>

              <article className="tile t-b reveal">
                <span className="t-num">02</span>
                <h3>A practical introduction</h3>
                <p>Get a hands-on introduction to the subject, not just theory.</p>
                <div className="code-win" aria-hidden="true">
                  <div className="cw-bar">
                    <i></i>
                    <i></i>
                    <i></i>
                    <span>demo.py</span>
                  </div>
                  <pre>
                    <span className="c-k">name</span> = <span className="c-s">"You"</span>
                    {'\n'}
                    <span className="c-f">print</span>(<span className="c-s">f"Hello, {'{name}'}!"</span>)<span className="typing"></span>
                    {'\n'}
                    <span className="c-o">› Hello, You!</span>
                  </pre>
                </div>
              </article>

              <article className="tile t-c reveal">
                <span className="t-num">03</span>
                <span className="t-ico">
                  <FsIcon id="i-hand" />
                </span>
                <h3>Ask the trainer, live</h3>
                <p>Interact with the trainer and get your doubts cleared in real time.</p>
                <div className="bubbles" aria-hidden="true">
                  <span className="bub">Is this course right for me?</span>
                  <span className="bub">What will I learn first?</span>
                  <span className="bub">How is the full course structured?</span>
                </div>
              </article>

              <article className="tile t-d reveal">
                <span className="t-num">04</span>
                <span className="t-ico">
                  <FsIcon id="i-compass" />
                </span>
                <h3>Discover skills &amp; career pathways</h3>
                <p>Find out which skills matter in the field and the directions they can take you.</p>
                <div className="path" aria-hidden="true">
                  <span className="node">
                    <b>1</b>Basics
                  </span>
                  <span className="link"></span>
                  <span className="node">
                    <b>2</b>Skills
                  </span>
                  <span className="link"></span>
                  <span className="node">
                    <b>3</b>Practice
                  </span>
                  <span className="link"></span>
                  <span className="node node-goal">
                    <b>&#10003;</b>Your path
                  </span>
                </div>
              </article>

              <article className="tile t-f reveal">
                <p className="t-f-big">
                  2 hours.
                  <br />
                  Live.
                  <br />
                  <span>Free.</span>
                </p>
                <p className="t-f-sub">Pick a course, save your seat, and come see for yourself.</p>
                <a href="#register" className="btn btn-anim btn-yellow btn-block" data-cta="why-tile">
                  Reserve My Free Seat <FsIcon id="i-arrow" />
                </a>
              </article>
            </div>
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
                <li className="step reveal">
                  <div className="step-visual" aria-hidden="true">
                    <span className="step-diamond"><FsIcon id="i-compass" className="step-icon" /></span>
                    <span className="step-n">01</span>
                  </div>
                  <div className="step-copy">
                    <h3>Choose Your Course</h3>
                    <p>Pick the course you're curious about from the {COURSES.length} options.</p>
                  </div>
                </li>
                <li className="step reveal">
                  <div className="step-visual" aria-hidden="true">
                    <span className="step-diamond"><FsIcon id="i-pen" className="step-icon" /></span>
                    <span className="step-n">02</span>
                  </div>
                  <div className="step-copy">
                    <h3>Register for the Free Online Session</h3>
                    <p>Fill the short form — it's free.</p>
                  </div>
                </li>
                <li className="step reveal">
                  <div className="step-visual" aria-hidden="true">
                    <span className="step-diamond"><FsIcon id="i-monitor" className="step-icon" /></span>
                    <span className="step-n">03</span>
                  </div>
                  <div className="step-copy">
                    <h3>Attend the Live Demo &amp; Explore the Full Course</h3>
                    <p>Join online, learn live, ask questions and explore the full course.</p>
                  </div>
                </li>
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
            <div className="contact-card" id="contact">
              <h3>Contact us</h3>
              <ul className="contact-list">
                <li>
                  <FsIcon id="i-phone" />
                  <a href={INSTITUTE.phoneHref}>{INSTITUTE.phone}</a>
                </li>
                <li>
                  <FsIcon id="i-mail" />
                  <a href={`mailto:${INSTITUTE.email}`}>{INSTITUTE.email}</a>
                </li>
                <li>
                  <FsIcon id="i-globe" />
                  <a href={INSTITUTE.websiteHref} target="_blank" rel="noopener">{INSTITUTE.website}</a>
                </li>
                <li>
                  <FsIcon id="i-pin" />
                  <span>{INSTITUTE.address}</span>
                </li>
              </ul>
              <a className="btn btn-wa btn-block" href={WA_HREF} target="_blank" rel="noopener noreferrer" data-cta="contact-whatsapp">
                <FsIcon id="i-wa" />
                <span>Chat on WhatsApp</span>
              </a>
              <ul className="social" aria-label="Social media">
                <li>
                  <a href={INSTITUTE.social.instagram} target="_blank" rel="noopener">
                    <FsIcon id="i-ig" />
                    <span className="sr-only">Instagram</span>
                  </a>
                </li>
                <li>
                  <a href={INSTITUTE.social.linkedin} target="_blank" rel="noopener">
                    <FsIcon id="i-in" />
                    <span className="sr-only">LinkedIn</span>
                  </a>
                </li>
                <li>
                  <a href={INSTITUTE.social.youtube} target="_blank" rel="noopener">
                    <FsIcon id="i-yt" />
                    <span className="sr-only">YouTube</span>
                  </a>
                </li>
                <li>
                  <a href={INSTITUTE.social.facebook} target="_blank" rel="noopener">
                    <FsIcon id="i-fb" />
                    <span className="sr-only">Facebook</span>
                  </a>
                </li>
              </ul>
            </div>
          </div>
        </section>

        <HomeExplore />
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
