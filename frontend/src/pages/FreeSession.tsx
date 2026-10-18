import { useEffect, useRef, useState } from 'react'
import { useScopedStylesheet } from '../hooks/useScopedStylesheet'
import { CoursesGrid } from './free-session/CoursesGrid'
import { FAQS, INSTITUTE, SESSION, WHATSAPP } from './free-session/data'
import { FsIcon, IconSprite } from './free-session/icons'
import { RegisterForm } from './free-session/RegisterForm'
import { useFsReveal } from './free-session/useFsReveal'
import { VideoReels } from './free-session/VideoReels'

const COURSE_TICKER = [
  'Generative AI', 'Agentic AI', 'AI Engineering', 'Vibe Coding', 'Cyber Security + Gen AI', 'Java Full Stack + Gen AI',
  'MERN Stack + Gen AI', 'Data Science Pro', 'Data Analytics Using Python', 'Python', 'UI/UX Designing', 'Advanced Digital Marketing',
]

const WA_HREF = `https://wa.me/${WHATSAPP.number}?text=${encodeURIComponent(WHATSAPP.genericMessage)}`

export function FreeSession() {
  useScopedStylesheet([
    '/free-session.css',
    'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&family=Poppins:wght@600;700;800&display=swap',
  ])

  const rootRef = useRef<HTMLDivElement>(null)
  useFsReveal(rootRef)

  const [navOpen, setNavOpen] = useState(false)
  const [prefillCourse, setPrefillCourse] = useState<string | null>(null)
  const [prefillToken, setPrefillToken] = useState(0)
  const [thanksShown, setThanksShown] = useState(false)
  const [formVisible, setFormVisible] = useState(true)
  const [pastHero, setPastHero] = useState(false)

  useEffect(() => {
    document.title = 'Free 2-Hour Live Online Demo Session | AI, Data, Development, Design & Marketing Courses'
    return () => {
      document.title = 'Coding Hubs School of AI — AI will shape your career. Are you ready?'
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
    const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches
    if (course) {
      setPrefillCourse(course)
      setPrefillToken((t) => t + 1)
    }
    document.getElementById('register')?.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' })
    setTimeout(() => {
      const ids = ['f-name', 'f-phone', 'f-email', 'f-course']
      const firstEmpty = ids
        .map((id) => document.getElementById(id) as HTMLInputElement | HTMLSelectElement | null)
        .find((el) => el && !el.value)
      ;(firstEmpty ?? (document.getElementById('submitBtn') as HTMLElement | null))?.focus()
    }, 450)
  }

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

  const showSticky = !formVisible && pastHero && !thanksShown

  return (
    <div ref={rootRef} className="fs-page" onClick={handleRootClick}>
      <IconSprite />

      <header className="hdr" id="hdr">
        <div className="wrap hdr-in">
          <a href="#home" className="logo" aria-label="Home">
            <img className="logo-img" src="/fs-assets/img/logo.jpg" alt="Coding Hubs School of AI" width={380} height={100} />
          </a>
          <nav className={`nav${navOpen ? ' open' : ''}`} id="nav" aria-label="Primary" onClick={(e) => { if ((e.target as HTMLElement).closest('a')) setNavOpen(false) }}>
            <a href="#home">Home</a>
            <a href="#demo-classes">Free Demo Classes</a>
            <a href="#courses">Explore Courses</a>
            <a href="#session">About the Session</a>
            <a href="#contact">Contact</a>
            <a href="#register" className="btn btn-yellow nav-cta btn-shake" data-cta="mobile-menu">
              <FsIcon id="i-tap" />Register<span className="free-badge-red">FREE</span>
            </a>
          </nav>
          <div className="hdr-actions">
            <a href="#register" className="btn btn-yellow btn-sm hdr-cta btn-shake" data-cta="header">
              <FsIcon id="i-tap" />Register<span className="free-badge-red">FREE</span>
            </a>
            <button type="button" className="burger" aria-expanded={navOpen} aria-controls="nav" aria-label={navOpen ? 'Close menu' : 'Open menu'} onClick={() => setNavOpen((o) => !o)}>
              <span></span>
              <span></span>
              <span></span>
            </button>
          </div>
        </div>
      </header>

      <main>
        <section className="hero" id="home" aria-labelledby="hero-title">
          <div className="hero-deco" aria-hidden="true">
            <span className="blob b1"></span>
            <span className="blob b2"></span>
            <span className="grid"></span>
          </div>
          <div className="wrap hero-grid">
            <div className="hero-top">
              <p className="pill">
                <span className="live-dot" aria-hidden="true"></span>FREE 2-HOUR LIVE ONLINE SESSION
              </p>
              <h1 id="hero-title">
                Explore Your{' '}
                <span className="hl">
                  Future Career
                  <svg viewBox="0 0 300 16" preserveAspectRatio="none" aria-hidden="true">
                    <path d="M3 12C70 4 180 2 297 9" />
                  </svg>
                </span>{' '}
                with Our Free Live Training Session
              </h1>
            </div>

            <div className="hero-form" id="register">
              <div className="form-card">
                <RegisterForm onThanksChange={setThanksShown} prefillCourse={prefillCourse} prefillToken={prefillToken} />
              </div>
            </div>

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
                <a href="#register" className="btn btn-anim btn-yellow btn-lg" data-cta="hero-primary">
                  Register for Free <FsIcon id="i-arrow" />
                </a>
                <a href="#courses" className="btn btn-ghost-light btn-lg" data-cta="hero-explore">
                  Explore Courses
                </a>
              </div>
              <p className="facts-label">
                <span aria-hidden="true">✦</span> Session at a glance
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
                    <strong>₹0</strong>
                    <span>Free demo</span>
                  </div>
                  <span className="f-badge" aria-hidden="true">FREE</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        <div className="ticker" aria-label="Courses with a free live session">
          <div className="ticker-track">
            <ul>
              {COURSE_TICKER.map((c) => (
                <li key={c}>{c}</li>
              ))}
            </ul>
            <ul aria-hidden="true">
              {COURSE_TICKER.map((c) => (
                <li key={c}>{c}</li>
              ))}
            </ul>
          </div>
        </div>

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
              <p className="eyebrow">Program &amp; fees</p>
              <h2 id="program-title" className="h2">
                Start <span className="marker">Free</span>. Then Go Deeper in 15&nbsp;Days.
              </h2>
              <p className="sub">Attend the free demo session first. If you like it, join the paid 15-day training program for the same course.</p>
            </div>

            <div className="plan-grid">
              <article className="plan-card">
                <div className="plan-media">
                  <img src="/fs-assets/img/Modern Virtual Classroom Studio.png" alt="Free live demo session" width={800} height={500} loading="lazy" decoding="async" />
                  <span className="plan-step">Step 1</span>
                </div>
                <div className="plan-body">
                  <h3>
                    Free Demo Session <span className="free-tag">FREE</span>
                  </h3>
                  <p className="plan-meta">
                    <FsIcon id="i-clock" />2 Hours · Online Live
                  </p>
                  <p className="plan-price">
                    <span className="amt">₹0</span>
                    <span className="per">no payment to register</span>
                  </p>
                  <ul className="plan-list">
                    <li>
                      <FsIcon id="i-check" />Introduction to your chosen course
                    </li>
                    <li>
                      <FsIcon id="i-check" />Live demonstration by the trainer
                    </li>
                    <li>
                      <FsIcon id="i-check" />Course roadmap &amp; modules
                    </li>
                    <li>
                      <FsIcon id="i-check" />Live Q&amp;A with the trainer
                    </li>
                  </ul>
                  <a href="#register" className="btn btn-ghost btn-block" data-cta="plan-demo">
                    Register for Free <FsIcon id="i-arrow" />
                  </a>
                </div>
              </article>

              <div className="plan-link" aria-hidden="true">
                <FsIcon id="i-arrow" />
              </div>

              <article className="plan-card plan-featured">
                <div className="plan-media">
                  <img src="/fs-assets/img/Live Python Class Studio.png" alt="15-day live training program" width={800} height={500} loading="lazy" decoding="async" />
                  <span className="plan-step">Step 2</span>
                  <span className="plan-badge">Paid Program</span>
                </div>
                <div className="plan-body">
                  <h3>
                    15-Day Training Program <span className="paid-tag">PAID</span>
                  </h3>
                  <p className="plan-meta">
                    <FsIcon id="i-cal" />15 Days · Online Live
                  </p>
                  <p className="plan-price">
                    <span className="amt">₹4,999</span>
                    <span className="per">paid course fee</span>
                  </p>
                  <ul className="plan-list">
                    <li>
                      <FsIcon id="i-check" />15 days of live, trainer-led classes
                    </li>
                    <li>
                      <FsIcon id="i-check" />Hands-on practice on real examples
                    </li>
                    <li>
                      <FsIcon id="i-check" />Doubt-solving with the trainer
                    </li>
                    <li>
                      <FsIcon id="i-check" />Guidance on your next learning steps
                    </li>
                  </ul>
                  <a href="#register" className="btn btn-anim btn-yellow btn-block" data-cta="plan-program">
                    Enroll Now <FsIcon id="i-arrow" />
                  </a>
                </div>
              </article>
            </div>

            <p className="plan-note">
              <FsIcon id="i-ticket" />You only pay the ₹4,999 fee if you decide to join the 15-day program after the free demo.
            </p>
          </div>
        </section>

        <a href="#courses" className="wide-banner" data-cta="courses-banner">
          <img src="/fs-assets/img/bg3.png" alt="Build your future with AI Engineer. Learn today, build tomorrow. Explore all courses." width={2048} height={584} loading="lazy" decoding="async" />
        </a>

        <section className="sec sec-alt" id="courses" aria-labelledby="courses-title">
          <div className="wrap">
            <div className="sec-head center reveal">
              <p className="eyebrow">12 courses</p>
              <h2 id="courses-title" className="h2">
                Explore <span className="marker">All Courses</span>
              </h2>
              <p className="sub">
                Choose a course and join its free live session. Click <strong>Join Free Session</strong> to register in one step.
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
                <span className="sticker st-1" aria-hidden="true">₹0</span>
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
                  <b>₹0</b>
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
                  <span className="bub">Is this course right for me? 🤔</span>
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
                    <b>★</b>Your path
                  </span>
                </div>
              </article>

              <article className="tile t-f reveal">
                <p className="t-f-big">
                  2 hours.
                  <br />
                  Live.
                  <br />
                  <span>₹0.</span>
                </p>
                <p className="t-f-sub">Pick a course, save your seat, and come see for yourself.</p>
                <a href="#register" className="btn btn-anim btn-yellow btn-block" data-cta="why-tile">
                  Reserve My Free Seat <FsIcon id="i-arrow" />
                </a>
              </article>
            </div>
          </div>
        </section>

        <section className="sec sec-navy" id="how" aria-labelledby="how-title">
          <div className="wrap">
            <div className="sec-head center reveal">
              <p className="eyebrow eyebrow-light">How it works</p>
              <h2 id="how-title" className="h2">
                3 Simple <span className="marker">Steps</span>
              </h2>
            </div>
            <ol className="steps">
              <li className="step">
                <span className="step-n">1</span>
                <h3>Choose Your Course</h3>
                <p>Pick the course you're curious about from the 12 options.</p>
              </li>
              <li className="step">
                <span className="step-n">2</span>
                <h3>Register for the Free Online Session</h3>
                <p>Fill the short form — it's free.</p>
              </li>
              <li className="step">
                <span className="step-n">3</span>
                <h3>Attend the Live Demo &amp; Explore the Full Course</h3>
                <p>Join online, learn live, ask questions and explore the full course.</p>
              </li>
            </ol>
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

        <section className="sec sec-alt" id="faq" aria-labelledby="faq-title">
          <div className="wrap faq-wrap">
            <div className="sec-head center reveal">
              <p className="eyebrow">FAQ</p>
              <h2 id="faq-title" className="h2">
                Frequently Asked <span className="marker">Questions</span>
              </h2>
            </div>
            <div className="faq-grid">
              <div className="faq">
                {FAQS.map((f) => (
                  <details key={f.q}>
                    <summary>{f.q}</summary>
                    <p>{f.a}</p>
                  </details>
                ))}
              </div>
              <figure className="faq-img">
                <img src="/fs-assets/img/faq.png" alt="" width={1024} height={1536} loading="lazy" decoding="async" />
              </figure>
            </div>
          </div>
        </section>

        <section className="final" aria-labelledby="final-title">
          <div className="wrap">
            <a href="#register" className="final-banner" data-cta="final-banner">
              <img src="/fs-assets/img/contact-banner.jpg" alt="Your Next Learning Journey Starts Here! Register for our free 2-hour live online session. Register for Free" width={1920} height={592} loading="lazy" decoding="async" />
            </a>
            <div className="final-box">
              <span className="ring r1" aria-hidden="true"></span>
              <span className="ring r2" aria-hidden="true"></span>
              <h2 id="final-title">Your Next Learning Journey Starts Here!</h2>
              <p>
                Register for our <strong>FREE 2-HOUR LIVE ONLINE SESSION</strong> and explore the skills you want to learn.
              </p>
              <a href="#register" className="btn btn-anim btn-navy btn-lg" data-cta="final">
                Register for Free <FsIcon id="i-arrow" />
              </a>
            </div>
          </div>
        </section>
      </main>

      <footer className="ftr">
        <div className="wrap ftr-grid">
          <div className="ftr-brand">
            <a href="#home" className="logo logo-light" aria-label="Back to top">
              <img className="logo-img" src="/fs-assets/img/logo.jpg" alt="Coding Hubs School of AI" width={380} height={100} />
            </a>
            <p className="ftr-tag">Free 2-hour live online demo sessions for AI, development, data, design and marketing courses.</p>
          </div>

          <nav className="ftr-col" aria-label="Quick links">
            <h2>Quick Links</h2>
            <ul className="ftr-links">
              <li><a href="#courses">Explore Courses</a></li>
              <li><a href="#program">Program &amp; Fees</a></li>
              <li><a href="#session">About the Session</a></li>
              <li><a href="#faq">FAQ</a></li>
              <li><a href="/policies#privacy">Privacy Policy</a></li>
              <li><a href="/policies#terms">Terms &amp; Conditions</a></li>
              <li><a href="/policies#rescheduling">Rescheduling Policy</a></li>
            </ul>
          </nav>

          <div className="ftr-col ftr-social-col">
            <h2>Our Social</h2>
            <ul className="ftr-social">
              <li>
                <a href={INSTITUTE.social.linkedin} target="_blank" rel="noopener">
                  <FsIcon id="i-in" className="ico ico-fill" />LinkedIn
                </a>
              </li>
              <li>
                <a href={INSTITUTE.social.instagram} target="_blank" rel="noopener">
                  <FsIcon id="i-ig" />Instagram
                </a>
              </li>
              <li>
                <a href={INSTITUTE.social.facebook} target="_blank" rel="noopener">
                  <FsIcon id="i-fb" className="ico ico-fill" />Facebook
                </a>
              </li>
              <li>
                <a href={INSTITUTE.social.youtube} target="_blank" rel="noopener">
                  <FsIcon id="i-yt" className="ico ico-fill" />YouTube
                </a>
              </li>
              <li>
                <a href={`https://wa.me/${WHATSAPP.number}`} target="_blank" rel="noopener">
                  <FsIcon id="i-wa" className="ico ico-fill" />WhatsApp
                </a>
              </li>
            </ul>
          </div>

          <div className="ftr-col">
            <h2>Contact Us</h2>
            <ul className="ftr-contact">
              <li>
                <span className="fc-ico"><FsIcon id="i-phone" /></span>
                <a href={INSTITUTE.phoneHref}>{INSTITUTE.phone}</a>
              </li>
              <li>
                <span className="fc-ico"><FsIcon id="i-mail" /></span>
                <a href={`mailto:${INSTITUTE.email}`}>{INSTITUTE.email}</a>
              </li>
              <li>
                <span className="fc-ico"><FsIcon id="i-globe" /></span>
                <a href={INSTITUTE.websiteHref} target="_blank" rel="noopener">{INSTITUTE.website}</a>
              </li>
              <li>
                <span className="fc-ico"><FsIcon id="i-pin" /></span>
                <span>
                  <span>{INSTITUTE.name}</span>
                  <br />
                  <span>{INSTITUTE.address}</span>
                </span>
              </li>
            </ul>
          </div>
        </div>

        <div className="wrap ftr-cta">
          <div>
            <h2>Join the Next Free Live Session</h2>
            <p>2 hours · Online · ₹0. Reserve your seat in under a minute.</p>
          </div>
          <a href="#register" className="ftr-pill" data-cta="footer">
            <span>Enter your details to reserve a free seat</span>
            <span className="btn btn-yellow btn-sm">
              Register Free <FsIcon id="i-arrow" />
            </span>
          </a>
        </div>

        <div className="wrap ftr-bottom">
          <p>
            © {new Date().getFullYear()} {INSTITUTE.name}. All rights reserved.
          </p>
          <a href="#home" className="to-top" aria-label="Back to top">
            <svg className="ico" aria-hidden="true" style={{ transform: 'rotate(-90deg)' }}>
              <use href="#i-arrow" />
            </svg>
          </a>
        </div>
      </footer>

      <a href={WA_HREF} className="wa-float" target="_blank" rel="noopener" aria-label="Chat with us on WhatsApp">
        <FsIcon id="i-wa" />
      </a>

      <div className={`sticky-cta${showSticky ? ' show' : ''}`} aria-hidden={!showSticky}>
        <div>
          <strong>Free 2-hour live session</strong>
          <span>Online · ₹0</span>
        </div>
        <a href="#register" className="btn btn-anim btn-yellow btn-sm" data-cta="sticky-mobile" tabIndex={showSticky ? 0 : -1}>
          Register Free
        </a>
      </div>
    </div>
  )
}
