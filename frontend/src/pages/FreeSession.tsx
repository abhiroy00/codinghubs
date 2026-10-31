import { useEffect, useRef, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useLenisRef } from '../lib/lenis-context'
import { useRegisterPopup } from '../lib/register-popup'
import { FS_CSS } from '../lib/fs-css'
import { useScopedStylesheet } from '../hooks/useScopedStylesheet'
import { BrandLogo, FsFooter } from '../locations/FsShell'
import { LocationsMenu } from '../locations/LocationsMenu'
import { ResourcesMenu } from '../locations/ResourcesMenu'
import { CoursesGrid } from './free-session/CoursesGrid'
import { COURSES } from './free-session/data'
import { INSTITUTE, SESSION, WHATSAPP } from './free-session/data'
import { FsIcon, IconSprite } from './free-session/icons'
import { PROGRAMS } from './free-session/programs'
import { ScrollProgress } from '../components/ScrollProgress'
import { HeroBot } from './free-session/HeroBot'
import { HeroCode } from './free-session/HeroCode'
import { HomeExplore } from './free-session/HomeExplore'
import { useFsReveal } from './free-session/useFsReveal'
import { VideoReels } from './free-session/VideoReels'


const WA_HREF = `https://wa.me/${WHATSAPP.number}?text=${encodeURIComponent(WHATSAPP.genericMessage)}`

export function FreeSession() {
  useScopedStylesheet([
    FS_CSS,
    'https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700;800&display=swap',
  ])

  const rootRef = useRef<HTMLDivElement>(null)
  const lenisRef = useLenisRef()
  const popup = useRegisterPopup()
  const location = useLocation()
  useFsReveal(rootRef)

  const [navOpen, setNavOpen] = useState(false)
  const [formVisible, setFormVisible] = useState(false)
  const [pastHero, setPastHero] = useState(false)

  useEffect(() => {
    document.title = 'Free 2-Hour Live Online Demo Session | AI, Data, Development, Design & Marketing Courses'
    return () => {
      document.title = 'Coding Hubs School of AI'
    }
  }, [])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && navOpen) setNavOpen(false)
    }
    const onClickOutside = (e: MouseEvent) => {
      if (navOpen && !(e.target as HTMLElement).closest('#hdr')) setNavOpen(false)
    }
    document.addEventListener('keydown', onKey)
    document.addEventListener('click', onClickOutside)
    return () => {
      document.removeEventListener('keydown', onKey)
      document.removeEventListener('click', onClickOutside)
    }
  }, [navOpen])

  useEffect(() => {
    if (!('IntersectionObserver' in window)) return
    const formEl = document.getElementById('register')
    const heroTopEl = rootRef.current?.querySelector('.hero-top')
    const io1 = formEl
      ? new IntersectionObserver(([en]) => setFormVisible(en.isIntersecting), { threshold: 0.15 })
      : null
    const io2 = heroTopEl
      ? new IntersectionObserver(([en]) => setPastHero(!en.isIntersecting && en.boundingClientRect.top < 0))
      : null
    if (formEl && io1) io1.observe(formEl)
    if (heroTopEl && io2) io2.observe(heroTopEl)
    return () => {
      io1?.disconnect()
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
    const t = setTimeout(() => {
      if (id === 'register') goToForm()
      else {
        const el = document.getElementById(id)
        if (el) (lenisRef.current ? lenisRef.current.scrollTo(el, { offset: -72 }) : el.scrollIntoView({ behavior: 'smooth', block: 'start' }))
      }
    }, 120)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.hash])

  function handleRootClick(e: React.MouseEvent) {
    const target = e.target as HTMLElement
    const courseBtn = target.closest('[data-course]') as HTMLElement | null
    if (courseBtn) {
      goToForm(courseBtn.dataset.course)
      return
    }
    const cta = target.closest('[data-cta]') as HTMLElement | null
    if (cta) {
      if (cta.getAttribute('href') === '#register') {
        e.preventDefault()
        goToForm()
      }
    }
  }

  const showSticky = !formVisible && pastHero

  return (
    <div ref={rootRef} className="fs-page" onClick={handleRootClick}>
      <IconSprite />

      <ScrollProgress />
      <header className="hdr" id="hdr">
        <div className="wrap hdr-in">
          <BrandLogo home />
          <nav className={`nav${navOpen ? ' open' : ''}`} id="nav" aria-label="Primary" onClick={(e) => { if ((e.target as HTMLElement).closest('a')) setNavOpen(false) }}>
            <a href="#home">Home</a>
            <a href="#demo-classes">Free Demo Classes</a>
            <a href="#courses">Courses</a>
            <Link to="/interview-prep/">Interview Prep</Link>
            <Link to="/certificates/">Certificates</Link>
            <Link to="/book-a-tutor/">Book a Tutor</Link>
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

      <main id="main">
        <section className="hero" id="home" aria-labelledby="hero-title">
          <div className="hero-deco" aria-hidden="true">
            <span className="blob b1"></span>
            <span className="blob b2"></span>
            <span className="grid"></span>
            <HeroBot />
          </div>
          <div className="wrap hero-grid">
            <div className="hero-top">
              <p className="pill">
                <span className="live-dot" aria-hidden="true"></span>PRACTICAL AI &amp; TECHNOLOGY TRAINING
              </p>
              <h1 id="hero-title">
                Learn AI.{' '}
                <span className="hl">
                  Build Your Future.
                  <svg viewBox="0 0 300 16" preserveAspectRatio="none" aria-hidden="true">
                    <path d="M3 12C70 4 180 2 297 9" />
                  </svg>
                </span>
              </h1>
              <p className="hero-sub">
                Live, instructor-led training in Generative AI, Python, Full Stack and Data Science. Start with a free 2-hour demo session.
              </p>
            </div>

            <HeroCode />

            <div className="hero-bottom">
              <ul className="checks">
                <li>
                  <FsIcon id="i-check" />100% Free Demo Session
                </li>
                <li>
                  <FsIcon id="i-check" />Live Online Learning
                </li>
                <li>
                  <FsIcon id="i-check" />Explore Courses Before Admission
                </li>
              </ul>
              <div className="cta-row">
                <a href="#courses" className="btn btn-anim btn-yellow btn-lg" data-cta="hero-explore">
                  Explore Courses <FsIcon id="i-arrow" />
                </a>
                <a href="#register" className="btn btn-ghost-light btn-lg" data-cta="hero-primary">
                  Book Free Live Demo
                </a>
              </div>
              <p className="facts-label">
                Session at a glance
              </p>
              <div className="facts" aria-label="Session at a glance">
                <div className="fact f-1">
                  <span className="f-ico">
                    <FsIcon id="i-clock" />
                  </span>
                  <div>
                    <strong>2 Hours</strong>
                    <span>Live session</span>
                  </div>
                </div>
                <div className="fact f-2">
                  <span className="f-ico">
                    <FsIcon id="i-monitor" />
                  </span>
                  <div>
                    <strong>Online</strong>
                    <span>Join from anywhere</span>
                  </div>
                </div>
                <div className="fact f-3">
                  <span className="f-ico">
                    <FsIcon id="i-ticket" />
                  </span>
                  <div>
                    <strong>Free</strong>
                    <span>Demo session</span>
                  </div>
                  <span className="f-badge" aria-hidden="true">FREE</span>
                </div>
              </div>
            </div>
          </div>
        </section>

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
                <button type="button" className="btn btn-anim btn-yellow" data-course="" data-cta-location="video_section" onClick={() => goToForm()}>
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
              <p className="eyebrow">Programs</p>
              <h2 id="program-title" className="h2">
                Start <span className="marker">Free</span>. Then Go Deeper in 15&nbsp;Days.
              </h2>
              <p className="sub">Attend the free demo session first. If you like it, join the paid 15-day training program for the same course.</p>
            </div>

            <div className="programs-intro">
              <article className="plan-card">
                <div className="plan-media">
                  <img src="/fs-assets/img/modern-virtual-classroom-studio.jpg" alt="Free live demo session" width={800} height={500} loading="lazy" decoding="async" />
                  <span className="plan-step">Step 1</span>
                </div>
                <div className="plan-body">
                  <h3>
                    Free Demo Session <span className="free-tag">FREE</span>
                  </h3>
                  <p className="plan-meta">
                    <FsIcon id="i-clock" />2 Hours · Online Live
                  </p>
                  <a href="#register" className="btn btn-ghost btn-block" data-cta="plan-demo">
                    Register for Free <FsIcon id="i-arrow" />
                  </a>
                </div>
              </article>
            </div>

            <div className="sec-head center" style={{ marginTop: '2.5rem' }}>
              <h3 className="h2" style={{ fontSize: 'clamp(1.3rem,2.4vw,1.8rem)' }}>
                Step 2 — Then Choose Your <span className="marker">15-Day Program</span>
              </h3>
              <p className="sub">Tap a program to see the full day-by-day plan before you enroll.</p>
            </div>

            <div className="programs-grid">
              {PROGRAMS.map((program) => (
                <Link to={`/program/${program.slug}`} key={program.slug} className="program-card-link">
                  <article className="plan-card plan-featured">
                    <div className="plan-media">
                      <img src={program.image} alt={program.title} width={800} height={500} loading="lazy" decoding="async" />
                      <span className="plan-badge">Paid Program</span>
                    </div>
                    <div className="plan-body">
                      <h3>
                        {program.title} <span className="paid-tag">PAID</span>
                      </h3>
                      <p className="plan-meta">
                        <FsIcon id="i-cal" />15 Days · Online Live
                      </p>
                      <p style={{ color: 'var(--muted)', fontSize: '.92rem', marginBottom: '1rem' }}>{program.tagline}</p>
                      <span className="btn btn-anim btn-yellow btn-block">
                        View Day-by-Day Plan <FsIcon id="i-arrow" />
                      </span>
                    </div>
                  </article>
                </Link>
              ))}
            </div>

            <p className="plan-note">
              <FsIcon id="i-ticket" />Registering for the free demo costs nothing. Contact us for details of the 15-day programs.
            </p>
          </div>
        </section>

        <section className="sec sec-alt" id="courses" aria-labelledby="courses-title">
          <div className="wrap">
            <div className="sec-head center reveal">
              <p className="eyebrow">{COURSES.length} courses</p>
              <h2 id="courses-title" className="h2">
                Explore <span className="marker">All Courses</span>
              </h2>
              <p className="sub">
                Pick a course to see its details, or book the free live demo for it in one step.
              </p>
            </div>
            <CoursesGrid />
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
                    <p>Pick the course you're curious about from the 12 options.</p>
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
