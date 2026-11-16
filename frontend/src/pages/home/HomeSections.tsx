import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { FsIcon } from '../free-session/icons'
import { COURSES, INSTITUTE, SESSION, WHATSAPP } from '../free-session/data'
import { PROGRAMS } from '../free-session/programs'
import { VideoReels } from '../free-session/VideoReels'
import { GROUP_LABELS, GROUP_ORDER, HEAD_OFFICE, LOCATIONS, locationPath } from '../../locations/registry'
import { FAQS } from '../faq-data'

const WA_HREF = `https://wa.me/${WHATSAPP.number}?text=${encodeURIComponent(WHATSAPP.genericMessage)}`
const DIRECTIONS_HREF = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(HEAD_OFFICE.line)}`

/* ------------------------------------------------------------------ hero */

/** A small, static project preview: the kind of code learners write in their first live sessions. */
function CodePreview() {
  return (
    <figure className="hm-code" aria-hidden="true">
      <div className="hm-code-bar">
        <span /><span /><span />
        <code>first_api.py</code>
      </div>
      <pre>
        <code>
          <b className="k">from</b> fastapi <b className="k">import</b> FastAPI{'\n'}
          {'\n'}
          app = FastAPI(){'\n'}
          {'\n'}
          <i className="d">@app.get</i>(<s>"/courses"</s>){'\n'}
          <b className="k">def</b> <i className="f">courses</i>():{'\n'}
          {'    '}<b className="k">return</b> [<s>"Generative AI"</s>, <s>"Full Stack"</s>,{'\n'}
          {'            '}<s>"Data Analytics"</s>]
        </code>
      </pre>
      <div className="hm-code-steps">
        <span className="done">Learn</span>
        <span className="done">Build</span>
        <span>Ship</span>
      </div>
    </figure>
  )
}

export function HomeHero() {
  return (
    <section className="hm-hero" id="home" aria-labelledby="hero-title">
      <div className="hm-wrap hm-hero-grid">
        <div className="hm-hero-copy join-copy">
          <p className="hm-kicker">Coding Hubs School of AI</p>
          <h1 id="hero-title">
            Delhi NCR’s most practical <span>AI learning community.</span>
          </h1>
          <p className="hm-hero-sub">Live classes, mentors from the industry and projects you can show. Start with a free 2-hour demo class.</p>
          <div className="hm-actions join-actions">
            <a href="#register" className="hm-btn" data-cta="hero-primary">Book free demo class <FsIcon id="i-arrow" /></a>
            <a href="/courses/" className="hm-btn hm-btn-ghost">Explore courses</a>
          </div>
          <ul className="hm-proof" aria-label="Demo session details">
            <li><FsIcon id="i-check" />Live online</li>
            <li><FsIcon id="i-check" />2 hours</li>
            <li><FsIcon id="i-check" />No payment needed</li>
          </ul>
        </div>
        <CodePreview />
      </div>
    </section>
  )
}

/* ------------------------------------------------------------------ offerings */

const PATHWAYS = [
  { number: '01', title: 'Courses', detail: 'AI, development, data & design', href: '/courses/', icon: 'i-code' },
  { number: '02', title: 'Interview Prep', detail: 'Your 30-day learning roadmap', href: '/interview-prep/', icon: 'i-map' },
  { number: '03', title: 'Book a Tutor', detail: 'Learn with personal guidance', href: '/book-a-tutor/', icon: 'i-users' },
  { number: '04', title: 'Latest Jobs', detail: 'Explore your next opportunity', href: '/latest-jobs/', icon: 'i-compass' },
]

export function HomePathways() {
  return (
    <nav className="hm-paths" aria-label="Explore Coding Hubs">
      <div className="hm-wrap hm-paths-grid">
        {PATHWAYS.map((p) => (
          <Link className="hm-path" to={p.href} key={p.href}>
            <span className="hm-path-n">{p.number}</span>
            <FsIcon id={p.icon} />
            <span className="hm-path-copy"><strong>{p.title}</strong><small>{p.detail}</small></span>
            <span className="hm-path-arrow" aria-hidden="true">→</span>
          </Link>
        ))}
      </div>
    </nav>
  )
}

const LEARN = [
  { icon: 'i-compass', title: 'Introduction to your course', text: 'An overview of the selected technology or subject and where it is used.' },
  { icon: 'i-play', title: 'Live demonstration', text: 'A practical example or live demo, depending on the course you pick.' },
  { icon: 'i-map', title: 'Modules & learning roadmap', text: 'How the course is structured and what you would learn step by step.' },
  { icon: 'i-chat', title: 'Trainer Q&A', text: 'Interact with the trainer and get your questions answered live.' },
  { icon: 'i-book', title: 'Full course & admission info', text: 'Details of the complete course and how the admission process works.' },
]

export function HomeSession() {
  return (
    <section className="hm-sec" id="session" aria-labelledby="session-title">
      <div className="hm-wrap hm-session">
        <div>
          <p className="hm-kicker">About the session</p>
          <h2 id="session-title">What will you learn in our free live session?</h2>
          <p className="hm-lead">A focused 2-hour live introduction to the course you choose — so you can decide with confidence.</p>
          <ol className="hm-learn">
            {LEARN.map((l, i) => (
              <li key={l.title} className="reveal">
                <span className="hm-learn-n">{String(i + 1).padStart(2, '0')}</span>
                <div><h3>{l.title}</h3><p>{l.text}</p></div>
              </li>
            ))}
          </ol>
        </div>
        <aside className="hm-facts" aria-label="Session information">
          <p className="hm-facts-title"><span className="hm-live" aria-hidden="true" />Session information</p>
          <dl>
            <div><dt><FsIcon id="i-clock" />Duration</dt><dd>2 Hours</dd></div>
            <div><dt><FsIcon id="i-monitor" />Mode</dt><dd>Online Live Session</dd></div>
            <div><dt><FsIcon id="i-cal" />Date</dt><dd>{SESSION.date}</dd></div>
            <div><dt><FsIcon id="i-clock" />Time</dt><dd>{SESSION.time}</dd></div>
            <div><dt><FsIcon id="i-ticket" />Fee</dt><dd><span className="hm-free">FREE</span> for the demo session</dd></div>
          </dl>
          <p className="hm-facts-note"><strong>Please note:</strong> this free session is a demonstration and introduction to the course. It is not the complete paid course.</p>
          <a href="#register" className="hm-btn hm-btn-block" data-cta="session-card">Register for Free <FsIcon id="i-arrow" /></a>
        </aside>
      </div>
    </section>
  )
}

export function HomePrograms() {
  return (
    <section className="hm-sec hm-alt" id="program" aria-labelledby="program-title">
      <div className="hm-wrap">
        <div className="hm-head hm-head-split">
          <div>
            <p className="hm-kicker">Programs</p>
            <h2 id="program-title">Start free. Then go deeper in 15&nbsp;days.</h2>
          </div>
          <p className="hm-lead">Attend the free demo session first. If you like it, join the paid 15-day training program for the same course.</p>
        </div>

        <div className="hm-steps2">
          <article className="hm-step1">
            <p className="hm-step-label">Step 1</p>
            <h3>Free Demo Session <span className="hm-free">FREE</span></h3>
            <p className="hm-meta"><FsIcon id="i-clock" />2 Hours · Online Live</p>
            <a href="#register" className="hm-btn hm-btn-ghost hm-btn-block" data-cta="plan-demo">Register for Free <FsIcon id="i-arrow" /></a>
          </article>
          <div className="hm-step2">
            <p className="hm-step-label">Step 2 — Then choose your 15-day program</p>
            <p className="hm-step2-sub">Tap a program to see the full day-by-day plan before you enroll.</p>
            <ul className="hm-programs">
              {PROGRAMS.map((p) => (
                <li key={p.slug}>
                  <Link to={`/program/${p.slug}`} className="hm-program">
                    <span className="hm-program-copy">
                      <strong>{p.title} <span className="hm-paid">PAID</span></strong>
                      <span className="hm-meta"><FsIcon id="i-cal" />15 Days · Online Live</span>
                      <span className="hm-program-desc">{p.tagline}</span>
                    </span>
                    <span className="hm-program-go">View Day-by-Day Plan <span aria-hidden="true">→</span></span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>
        <p className="hm-fine hm-center"><FsIcon id="i-ticket" />Registering for the free demo costs nothing. Contact us for details of the 15-day programs.</p>
      </div>
    </section>
  )
}

export function HomeDemoClasses({ onJoin }: { onJoin: () => void }) {
  return (
    <section className="hm-sec" id="demo-classes" aria-labelledby="videos-title">
      <div className="hm-wrap">
        <div className="hm-head hm-head-split">
          <div>
            <p className="hm-kicker">Free demo classes</p>
            <h2 id="videos-title">Watch our free demo classes before you join</h2>
          </div>
          <p className="hm-lead">Get a feel for how we teach. <strong>6</strong> short videos from our trainers. Tap any video to watch, no sign-up needed.</p>
        </div>
        <VideoReels />
        <div className="hm-banner">
          <p><strong>Liked the class?</strong> Join the <strong>free 2-hour LIVE session</strong> and ask the trainer your questions in real time.</p>
          <button type="button" className="hm-btn" data-cta-location="video_section" onClick={onJoin}>Join Free Live Session <FsIcon id="i-arrow" /></button>
        </div>
      </div>
    </section>
  )
}

/* ------------------------------------------------------------------ published content (API) */

interface Item { title: string; slug: string; summary?: string; difficulty?: string; technologies?: string[]; guide?: { title: string; slug: string } | null }
interface Review { name: string; course: string; text: string; photo: string }

const getJson = (path: string) => fetch(`/api${path}`, { headers: { Accept: 'application/json' } }).then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))

function useApi<T>(path: string, pick: (d: unknown) => T[]) {
  const [rows, setRows] = useState<T[]>([])
  useEffect(() => {
    let live = true
    getJson(path).then((d) => live && setRows(pick(d))).catch(() => undefined)
    return () => { live = false }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [path])
  return rows
}

/** Projects with guides published from the admin panel. Nothing renders until one is published. */
export function HomeGuidedProjects() {
  const items = useApi<Item>('/projects/?page_size=3', (d) => (Array.isArray((d as { results?: Item[] })?.results) ? (d as { results: Item[] }).results : []))
  if (!items.length) return null
  return (
    <section className="hm-sec" id="projects" aria-labelledby="projects-title">
      <div className="hm-wrap">
        <div className="hm-head reveal">
          <p className="hm-kicker">Practical projects</p>
          <h2 id="projects-title">Projects with step-by-step guides</h2>
          <p className="hm-lead">Each project comes with its guide: objectives, technology stack and how to build it.</p>
        </div>
        <ul className="hm-cards3">
          {items.map((c) => (
            <li key={c.slug} className="hm-card">
              {c.difficulty && <p className="hm-tag">{c.difficulty}</p>}
              <h3><Link to={`/projects/${c.slug}`}>{c.title}</Link></h3>
              {c.summary && <p>{c.summary}</p>}
              {c.technologies && c.technologies.length > 0 && (
                <ul className="hm-pills" aria-label="Technologies">{c.technologies.slice(0, 4).map((t) => <li key={t}>{t}</li>)}</ul>
              )}
              {c.guide && <Link to={`/project-guides/${c.guide.slug}`} className="hm-link">Guide: {c.guide.title}</Link>}
              <Link to={`/projects/${c.slug}`} className="hm-link">View project <span aria-hidden="true">→</span></Link>
            </li>
          ))}
        </ul>
        <p className="hm-more"><Link className="hm-btn hm-btn-ghost" to="/projects">All projects</Link><Link className="hm-btn hm-btn-ghost" to="/blog">Read the blog</Link></p>
      </div>
    </section>
  )
}

/** Genuine student reviews the owner has published with permission. Nothing renders until one exists. */
export function HomeReviews() {
  const rows = useApi<Review>('/testimonials/', (d) => (Array.isArray(d) ? (d as Review[]) : []))
  if (!rows.length) return null
  return (
    <section className="hm-sec hm-alt" id="reviews" aria-labelledby="reviews-title">
      <div className="hm-wrap">
        <div className="hm-head reveal">
          <p className="hm-kicker">Student feedback</p>
          <h2 id="reviews-title">What our students say</h2>
        </div>
        <ul className="hm-cards3">
          {rows.map((r) => (
            <li key={r.name + r.text.slice(0, 12)} className="hm-card hm-review">
              <blockquote>“{r.text}”</blockquote>
              <p className="hm-who">
                {r.photo && <img src={r.photo} alt="" width={44} height={44} loading="lazy" />}
                <span><strong>{r.name}</strong>{r.course && <em>{r.course}</em>}</span>
              </p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}

/* ------------------------------------------------------------------ benefits, steps, about */

export function HomeWhy() {
  return (
    <section className="hm-sec hm-alt" id="why" aria-labelledby="why-title">
      <div className="hm-wrap hm-why">
        <div className="hm-why-intro">
          <p className="hm-kicker">Why join</p>
          <h2 id="why-title">Why join our free session?</h2>
          <p className="hm-lead">Try before you decide. Two hours, live and online, to find out whether a course is right for you.</p>
          <p className="hm-small-h">Ideal for</p>
          <ul className="hm-pills">
            <li>Students</li><li>Fresh graduates</li><li>Working professionals</li><li>Career switchers</li>
          </ul>
          <div className="hm-callout">
            <p className="hm-callout-big">2 hours. Live. <span>Free.</span></p>
            <p>Pick a course, save your seat, and come see for yourself.</p>
            <a href="#register" className="hm-btn hm-btn-light" data-cta="why-tile">Reserve My Free Seat <FsIcon id="i-arrow" /></a>
          </div>
        </div>
        <ol className="hm-benefits">
          <li className="reveal">
            <span className="hm-benefit-n">01</span>
            <div>
              <h3>Understand the course <em>before</em> admission</h3>
              <p>See what the course is really about before you commit to anything.</p>
              <ul className="hm-ticks" aria-label="You will find out">
                <li><FsIcon id="i-check" />What the course covers</li>
                <li><FsIcon id="i-check" />How the classes are taught</li>
                <li><FsIcon id="i-check" />Whether it suits your goals</li>
                <li><FsIcon id="i-check" />Course fee &amp; batch details</li>
                <li><FsIcon id="i-check" />What you can do after the course</li>
              </ul>
            </div>
          </li>
          <li className="reveal">
            <span className="hm-benefit-n">02</span>
            <div><h3>A practical introduction</h3><p>Get a hands-on introduction to the subject, not just theory.</p></div>
          </li>
          <li className="reveal">
            <span className="hm-benefit-n">03</span>
            <div><h3>Ask the trainer, live</h3><p>Interact with the trainer and get your doubts cleared in real time.</p></div>
          </li>
          <li className="reveal">
            <span className="hm-benefit-n">04</span>
            <div><h3>Discover skills &amp; career pathways</h3><p>Find out which skills matter in the field and the directions they can take you.</p></div>
          </li>
        </ol>
      </div>
    </section>
  )
}

export function HomeHow() {
  const steps = [
    { icon: 'i-compass', title: 'Choose Your Course', text: `Pick the course you're curious about from the ${COURSES.length} options.` },
    { icon: 'i-pen', title: 'Register for the Free Online Session', text: 'Fill the short form — it’s free.' },
    { icon: 'i-monitor', title: 'Attend the Live Demo & Explore the Full Course', text: 'Join online, learn live, ask questions and explore the full course.' },
  ]
  return (
    <section className="hm-sec" id="how" aria-labelledby="how-title">
      <div className="hm-wrap">
        <div className="hm-head hm-head-center">
          <p className="hm-kicker">How it works</p>
          <h2 id="how-title">3 simple steps</h2>
        </div>
        <ol className="hm-how">
          {steps.map((s, i) => (
            <li key={s.title} className="reveal">
              <span className="hm-how-n">{String(i + 1).padStart(2, '0')}</span>
              <FsIcon id={s.icon} />
              <h3>{s.title}</h3>
              <p>{s.text}</p>
            </li>
          ))}
        </ol>
        <p className="hm-more"><a href="#register" className="hm-btn" data-cta="how-it-works">Book My Free Seat <FsIcon id="i-arrow" /></a></p>
      </div>
    </section>
  )
}

export function HomeAbout() {
  return (
    <section className="hm-sec hm-alt" id="about" aria-labelledby="about-title">
      <div className="hm-wrap hm-about">
        <div>
          <p className="hm-kicker">About us</p>
          <h2 id="about-title">About Coding Hubs School of AI</h2>
        </div>
        <div className="hm-about-copy">
          <p className="hm-lead">{INSTITUTE.name} offers instructor-led training in Artificial Intelligence, Software Development, Data Analytics, UI/UX Design and Digital Marketing.</p>
          <p>Our free live demo sessions are designed to help students understand a course before admission — what it covers, how it is taught and whether it suits their goals.</p>
          <div className="hm-trainer">
            <FsIcon id="i-users" />
            <div><h3>Your trainer</h3><p>Trainer details for your selected course will be shared with registered students before the session.</p></div>
          </div>
        </div>
      </div>
    </section>
  )
}

/* ------------------------------------------------------------------ visit / location */

export function HomeVisit() {
  return (
    <section className="hm-sec hm-visit" id="contact" aria-labelledby="visit-title">
      <div className="hm-wrap hm-visit-grid">
        <div className="hm-visit-main">
          <p className="hm-kicker">Head office</p>
          <h2 id="visit-title">Visit CodingHubs</h2>
          <address className="hm-address">
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 21s-7-6.2-7-11.5a7 7 0 0 1 14 0C19 14.8 12 21 12 21Z" /><circle cx="12" cy="9.5" r="2.5" /></svg>
            <span>{HEAD_OFFICE.line}</span>
          </address>
          <ul className="hm-contact">
            <li><FsIcon id="i-phone" /><a href={INSTITUTE.phoneHref}>{INSTITUTE.phone}</a></li>
            <li><FsIcon id="i-mail" /><a href={`mailto:${INSTITUTE.email}`}>{INSTITUTE.email}</a></li>
            <li><FsIcon id="i-wa" /><a href={WA_HREF} target="_blank" rel="noopener noreferrer" data-cta="contact-whatsapp">Chat on WhatsApp</a></li>
            <li><FsIcon id="i-globe" /><a href={INSTITUTE.websiteHref} target="_blank" rel="noopener">{INSTITUTE.website}</a></li>
          </ul>
          <div className="hm-actions">
            <a className="hm-btn" href={DIRECTIONS_HREF} target="_blank" rel="noopener noreferrer">Get Directions<span className="sr-only"> (opens Google Maps in a new tab)</span> <span aria-hidden="true">↗</span></a>
            <a className="hm-btn hm-btn-ghost" href={INSTITUTE.phoneHref}>Call {INSTITUTE.phone}</a>
          </div>
          <ul className="hm-social" aria-label="Social media">
            <li><a href={INSTITUTE.social.instagram} target="_blank" rel="noopener"><FsIcon id="i-ig" /><span className="sr-only">Instagram</span></a></li>
            <li><a href={INSTITUTE.social.linkedin} target="_blank" rel="noopener"><FsIcon id="i-in" /><span className="sr-only">LinkedIn</span></a></li>
            <li><a href={INSTITUTE.social.youtube} target="_blank" rel="noopener"><FsIcon id="i-yt" /><span className="sr-only">YouTube</span></a></li>
            <li><a href={INSTITUTE.social.facebook} target="_blank" rel="noopener"><FsIcon id="i-fb" /><span className="sr-only">Facebook</span></a></li>
          </ul>
        </div>

        <div className="hm-areas" id="locations">
          <h3>AI courses across Delhi NCR</h3>
          <p>Guides for learners in your area: what to learn, how to start and how to reach us.</p>
          <div className="hm-area-groups">
            {GROUP_ORDER.map((g) => (
              <div key={g} className="hm-area">
                <h4>{GROUP_LABELS[g]}</h4>
                <ul>
                  {LOCATIONS.filter((l) => l.group === g).map((l) => (
                    <li key={l.slug}><Link to={locationPath(l.slug)}>{l.short}</Link></li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          <Link className="hm-link" to="/locations/">All {LOCATIONS.length} locations <span aria-hidden="true">→</span></Link>
        </div>
      </div>
    </section>
  )
}

/* ------------------------------------------------------------------ FAQ */

export function HomeFaq() {
  return (
    <section className="hm-sec hm-alt" id="faq" aria-labelledby="faq-title">
      <div className="hm-wrap hm-faq">
        <div>
          <p className="hm-kicker">FAQ</p>
          <h2 id="faq-title">Questions, answered</h2>
          <p className="hm-lead">Can’t find your answer? Talk to us and a counsellor will help.</p>
          <p className="hm-faq-links"><Link className="hm-link" to="/faq">All FAQs <span aria-hidden="true">→</span></Link></p>
        </div>
        <div className="hm-faq-list">
          {FAQS.map((f) => (
            <details key={f.q} open={'open' in f && f.open ? true : undefined}>
              <summary>{f.q}</summary>
              <p>{f.a}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  )
}
