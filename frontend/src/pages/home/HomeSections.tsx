import { Link } from 'react-router-dom'
import { FsIcon } from '../free-session/icons'
import { COURSES, INSTITUTE, SESSION, WHATSAPP } from '../free-session/data'
import { PROGRAMS } from '../free-session/programs'
import { SLIDES, type Slide } from '../free-session/HeroSlider'
import { VideoReels } from '../free-session/VideoReels'
import { AI_TOOLS, logoColors } from '../../data/ai-tools'
import type { CSSProperties } from 'react'

const WA_HREF = `https://wa.me/${WHATSAPP.number}?text=${encodeURIComponent(WHATSAPP.genericMessage)}`
const TBA = /to be announced/i
const srcSet = (s: Slide) => s.widths.map((w) => `/assets/hero/${s.name}-${w}.webp ${w}w`).join(', ')

/** Registration CTA. `#register` + data-cta is intercepted by FreeSession and opens the demo form. */
function DemoCta({ id, className = 'hp-btn hp-btn-primary', children = 'Book Free Demo' }: { id: string; className?: string; children?: React.ReactNode }) {
  return <a href="#register" className={className} data-cta={id}>{children} <FsIcon id="i-arrow" /></a>
}

function Photo({ slide, eager = false, sizes }: { slide: Slide; eager?: boolean; sizes: string }) {
  return (
    <picture>
      <source type="image/webp" srcSet={srcSet(slide)} sizes={sizes} />
      <img
        src={`/assets/hero/${slide.name}.jpg`}
        alt={slide.alt}
        width={slide.width}
        height={slide.height}
        loading={eager ? 'eager' : 'lazy'}
        fetchPriority={eager ? 'high' : 'auto'}
        decoding={eager ? 'sync' : 'async'}
        style={slide.position ? { objectPosition: slide.position } : undefined}
      />
    </picture>
  )
}

/* 3 ---------------------------------------------------------------- hero */
export function HomeHero() {
  const photo = SLIDES[0]
  return (
    <section className="hp-hero" id="home" aria-labelledby="hero-title">
      <div className="hp-wrap hp-hero-grid">
        <div className="hp-hero-copy join-copy">
          <p className="hp-eyebrow">Coding Hubs School of AI</p>
          <h1 id="hero-title">Build Practical AI &amp; Coding Skills</h1>
          <p className="hp-hero-lead">Learn through instructor-led classes, practical demonstrations and projects. Start with a free 2-hour live online demo to explore the course that fits your goals.</p>
          <div className="hp-actions join-actions">
            <DemoCta id="hero-primary" />
            <Link to="/courses/" className="hp-btn hp-btn-secondary">Explore Courses</Link>
          </div>
          <p className="hp-proof"><FsIcon id="i-monitor" />Free demo: Live online · 2 hours · No payment needed</p>
        </div>
        <figure className="hp-hero-media">
          <Photo slide={photo} eager sizes="(max-width: 960px) 100vw, 560px" />
          <figcaption>Classroom session at Coding Hubs. The free demo itself runs live online.</figcaption>
        </figure>
      </div>
    </section>
  )
}

/* 4 ---------------------------------------------------------------- gallery */
export function HomeGallery() {
  return (
    <section className="hp-sec hp-alt" id="gallery" aria-labelledby="gallery-title">
      <div className="hp-wrap">
        <header className="hp-head">
          <h2 id="gallery-title">Learning Together, Building Together</h2>
          <p>Explore moments from our classes, campus sessions and community events.</p>
        </header>
        <ul className="hp-gallery">
          {SLIDES.map((s, i) => (
            <li key={s.name} className={`hp-shot hp-shot-${i + 1}${s.fit === 'contain' ? ' is-wide' : ''}`}>
              <figure>
                <div className="hp-shot-img"><Photo slide={s} sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 400px" /></div>
                <figcaption><strong>{s.title}</strong><span>{s.detail}</span></figcaption>
              </figure>
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}

/* 5 ---------------------------------------------------------------- quick links */
const QUICK = [
  { title: 'Courses', detail: 'AI, development, data and design courses.', href: '/courses/', icon: 'i-code', cta: 'Browse courses' },
  { title: 'Interview Prep', detail: 'A 30-day roadmap of lessons and practice.', href: '/interview-prep/', icon: 'i-map', cta: 'Start preparing' },
  { title: 'Book a Tutor', detail: 'One-to-one online sessions with a tutor.', href: '/book-a-tutor/', icon: 'i-users', cta: 'Find a tutor' },
  { title: 'Latest Jobs', detail: 'Openings in AI, data and development.', href: '/latest-jobs/', icon: 'i-compass', cta: 'See openings' },
]

export function HomeQuickLinks() {
  return (
    <nav className="hp-sec hp-quick-sec" aria-label="Explore Coding Hubs">
      <div className="hp-wrap">
        <ul className="hp-quick">
          {QUICK.map((q) => (
            <li key={q.href}>
              <Link to={q.href} className="hp-quick-card">
                <span className="hp-icon"><FsIcon id={q.icon} /></span>
                <strong>{q.title}</strong>
                <span className="hp-quick-detail">{q.detail}</span>
                <span className="hp-quick-cta">{q.cta} <span aria-hidden="true">→</span></span>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </nav>
  )
}

/* 6 ---------------------------------------------------------------- tools */
const TOOL_PICKS = AI_TOOLS.filter((t) => t.icon).slice(0, 12)

export function HomeTools() {
  return (
    <section className="hp-sec" id="tools" aria-labelledby="tools-title">
      <div className="hp-wrap">
        <header className="hp-head">
          <h2 id="tools-title">Practise With Tools Used in the Industry</h2>
          <p>Explore AI assistants, development tools and data platforms used across our courses. The tools covered vary by course.</p>
        </header>
        <ul className="hp-tools">
          {TOOL_PICKS.map((t) => {
            const { bg, fg } = logoColors(t.color)
            return (
              <li key={t.id}>
                <a className="hp-tool" href={t.officialUrl} target="_blank" rel="noopener noreferrer">
                  <span className="hp-tool-mark" style={{ '--tm-bg': bg, '--tm-fg': fg } as CSSProperties} aria-hidden="true">
                    <span style={{ WebkitMaskImage: `url(/assets/ai-tools/${t.icon}.svg)`, maskImage: `url(/assets/ai-tools/${t.icon}.svg)` }} />
                  </span>
                  <span className="hp-tool-name">{t.name}<span className="sr-only"> (opens the official site in a new tab)</span></span>
                </a>
              </li>
            )
          })}
        </ul>
        <p className="hp-more"><Link to="/ai-tools" className="hp-link">See all {AI_TOOLS.length} tools <span aria-hidden="true">→</span></Link></p>
      </div>
    </section>
  )
}

/* 7 ---------------------------------------------------------------- videos */
export function HomeVideos() {
  return (
    <section className="hp-sec hp-alt" id="demo-classes" aria-labelledby="videos-title">
      <div className="hp-wrap">
        <header className="hp-head">
          <p className="hp-eyebrow">Recorded demo videos</p>
          <h2 id="videos-title">Watch a Demo Before You Join</h2>
          <p>Explore short videos from our trainers and get a feel for how we teach. These are short recordings; the free 2-hour demo is a separate live class.</p>
        </header>
        <VideoReels />
        <div className="hp-banner">
          <div>
            <h3>Want to ask questions live?</h3>
            <p>Join the free 2-hour live online demo and talk to a trainer.</p>
          </div>
          <DemoCta id="video_section" />
        </div>
      </div>
    </section>
  )
}

/* 8 ---------------------------------------------------------------- live session */
const TOPICS = [
  { icon: 'i-compass', title: 'Course introduction', text: 'What the course covers and where the skills are used.' },
  { icon: 'i-play', title: 'Practical demonstration', text: 'A live example, depending on the course you choose.' },
  { icon: 'i-map', title: 'Modules and learning roadmap', text: 'How the course is structured, step by step.' },
  { icon: 'i-chat', title: 'Live trainer Q&A', text: 'Ask the trainer your questions in real time.' },
  { icon: 'i-book', title: 'Full course and admission information', text: 'Details of the complete course and how admission works.' },
]

export function HomeSession() {
  const unscheduled = TBA.test(SESSION.date) || TBA.test(SESSION.time)
  return (
    <section className="hp-sec" id="session" aria-labelledby="session-title">
      <div className="hp-wrap">
        <header className="hp-head">
          <h2 id="session-title">What You’ll Explore in the Free Live Demo</h2>
          <p>A focused 2-hour introduction to your selected course, designed to help you decide your next step.</p>
        </header>
        <div className="hp-session">
          <ul className="hp-topics">
            {TOPICS.map((t) => (
              <li key={t.title} className="hp-card">
                <span className="hp-icon"><FsIcon id={t.icon} /></span>
                <h3>{t.title}</h3>
                <p>{t.text}</p>
              </li>
            ))}
          </ul>
          <aside className="hp-info" aria-labelledby="session-info-title">
            <h3 id="session-info-title">Session information</h3>
            <dl>
              <div><dt><FsIcon id="i-clock" />Duration</dt><dd>2 hours</dd></div>
              <div><dt><FsIcon id="i-monitor" />Mode</dt><dd>Live online</dd></div>
              <div><dt><FsIcon id="i-cal" />Date and time</dt><dd>{unscheduled ? 'Schedule to be announced' : `${SESSION.date}, ${SESSION.time}`}</dd></div>
              <div><dt><FsIcon id="i-ticket" />Fee</dt><dd>Free demo</dd></div>
            </dl>
            <p className="hp-note">This is an introductory demo, not the complete paid course.</p>
            <DemoCta id="session-card" className="hp-btn hp-btn-primary hp-btn-block" />
          </aside>
        </div>
      </div>
    </section>
  )
}

/* 9 ---------------------------------------------------------------- programs */
export function HomePrograms() {
  return (
    <section className="hp-sec hp-alt" id="program" aria-labelledby="program-title">
      <div className="hp-wrap">
        <header className="hp-head">
          <h2 id="program-title">Start With a Free Demo. Choose Your Next Step.</h2>
          <p>Explore the teaching approach first, then review the paid 15-day program that interests you.</p>
        </header>

        <div className="hp-step1">
          <div className="hp-step-tag"><span>Step 1</span>Free</div>
          <div className="hp-step1-body">
            <h3>Free 2-hour live demo</h3>
            <p>Live online · 2 hours · No payment needed. See how we teach and ask the trainer anything.</p>
          </div>
          <DemoCta id="plan-demo" />
        </div>

        <div className="hp-step2-head">
          <span className="hp-step-pill">Step 2 · Optional</span>
          <h3>Paid 15-day programs</h3>
        </div>
        <ul className="hp-programs">
          {PROGRAMS.map((p) => {
            const miles = [0, 7, p.days.length - 1].map((d) => ({ day: d + 1, title: p.days[d]?.title })).filter((m) => m.title)
            return (
              <li key={p.slug}>
                <Link to={`/program/${p.slug}`} className="hp-program">
                  <span className="hp-paid">Paid program</span>
                  <h4>{p.title}</h4>
                  <p className="hp-program-desc">{p.tagline}</p>
                  <p className="hp-meta"><FsIcon id="i-cal" />15 days · Live online</p>
                  <ol className="hp-miles" aria-label={`${p.title}: selected milestones`}>
                    {miles.map((m) => <li key={m.day}><span>Day {m.day}</span>{m.title}</li>)}
                  </ol>
                  <span className="hp-btn hp-btn-secondary hp-btn-block">View Day-by-Day Plan <FsIcon id="i-arrow" /></span>
                </Link>
              </li>
            )
          })}
        </ul>
        <p className="hp-fine">Program fees are shared on request. Registering for the free demo costs nothing.</p>
      </div>
    </section>
  )
}

/* 10 ---------------------------------------------------------------- why join */
const BENEFITS = [
  { icon: 'i-map', title: 'Understand the course and roadmap', text: 'See what the course covers and how it is structured before you decide.' },
  { icon: 'i-play', title: 'Watch a practical demonstration', text: 'Get a hands-on introduction to the subject, not just theory.' },
  { icon: 'i-chat', title: 'Ask the trainer your questions', text: 'Clear your doubts with the trainer in real time.' },
  { icon: 'i-compass', title: 'Explore skills and career directions', text: 'Find out which skills matter in the field and where they can lead.' },
]

export function HomeWhy() {
  return (
    <section className="hp-sec" id="why" aria-labelledby="why-title">
      <div className="hp-wrap">
        <header className="hp-head">
          <h2 id="why-title">Explore the Course Before You Commit</h2>
          <p>Ideal for students, fresh graduates, working professionals and career switchers.</p>
        </header>
        <ul className="hp-grid4">
          {BENEFITS.map((b) => (
            <li key={b.title} className="hp-card">
              <span className="hp-icon"><FsIcon id={b.icon} /></span>
              <h3>{b.title}</h3>
              <p>{b.text}</p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}

/* 11 ---------------------------------------------------------------- how it works */
export function HomeHow() {
  const steps = [
    { title: 'Choose your course', text: `Pick from ${COURSES.length} courses in AI, development, data and design.` },
    { title: 'Register for the free demo', text: 'Fill in the short form. It is free.' },
    { title: 'Attend live and ask your questions', text: 'Join online, learn live and explore the full course.' },
  ]
  return (
    <section className="hp-sec hp-alt" id="how" aria-labelledby="how-title">
      <div className="hp-wrap">
        <header className="hp-head">
          <h2 id="how-title">Your Free Demo in 3 Simple Steps</h2>
        </header>
        <ol className="hp-steps">
          {steps.map((s, i) => (
            <li key={s.title}>
              <span className="hp-step-n" aria-hidden="true">{i + 1}</span>
              <div><h3>{s.title}</h3><p>{s.text}</p></div>
            </li>
          ))}
        </ol>
        <p className="hp-more"><DemoCta id="how-it-works" /></p>
      </div>
    </section>
  )
}

/* 13 ---------------------------------------------------------------- about + contact */
export function HomeAbout() {
  return (
    <section className="hp-sec" id="about" aria-labelledby="about-title">
      <div className="hp-wrap hp-about">
        <div>
          <h2 id="about-title">About Coding Hubs School of AI</h2>
          <p className="hp-lead">We offer instructor-led training in Artificial Intelligence, Software Development, Data Analytics, UI/UX Design and Digital Marketing. Our introductory sessions help learners explore a course before admission.</p>
          <div className="hp-trainer">
            <span className="hp-icon"><FsIcon id="i-users" /></span>
            <div>
              <h3>Your trainer</h3>
              <p>Trainer details for your selected course are shared with registered learners before the session.</p>
            </div>
          </div>
        </div>
        <aside className="hp-contact" id="contact" aria-labelledby="contact-title">
          <h3 id="contact-title">Contact us</h3>
          <ul>
            <li><FsIcon id="i-phone" /><a href={INSTITUTE.phoneHref}>{INSTITUTE.phone}</a></li>
            <li><FsIcon id="i-mail" /><a href={`mailto:${INSTITUTE.email}`}>{INSTITUTE.email}</a></li>
            <li><FsIcon id="i-globe" /><a href={INSTITUTE.websiteHref} target="_blank" rel="noopener">{INSTITUTE.website}</a></li>
            <li><FsIcon id="i-pin" /><address>{INSTITUTE.address}</address></li>
          </ul>
          <a className="hp-btn hp-btn-wa hp-btn-block" href={WA_HREF} target="_blank" rel="noopener noreferrer" data-cta="contact-whatsapp">
            <FsIcon id="i-wa" className="ico ico-fill" />Chat on WhatsApp
          </a>
          <ul className="hp-social" aria-label="Social media">
            <li><a href={INSTITUTE.social.instagram} target="_blank" rel="noopener"><FsIcon id="i-ig" /><span className="sr-only">Instagram</span></a></li>
            <li><a href={INSTITUTE.social.linkedin} target="_blank" rel="noopener"><FsIcon id="i-in" /><span className="sr-only">LinkedIn</span></a></li>
            <li><a href={INSTITUTE.social.youtube} target="_blank" rel="noopener"><FsIcon id="i-yt" /><span className="sr-only">YouTube</span></a></li>
            <li><a href={INSTITUTE.social.facebook} target="_blank" rel="noopener"><FsIcon id="i-fb" /><span className="sr-only">Facebook</span></a></li>
          </ul>
        </aside>
      </div>
    </section>
  )
}
