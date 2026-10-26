import { Link } from 'react-router-dom'
import { FsIcon } from '../pages/free-session/icons'
import { INSTITUTE, WHATSAPP } from '../pages/free-session/data'
import { EnquiryForm } from './EnquiryForm'
import { FsFooter, FsHeader } from './FsShell'
import { LocationFx } from './LocationFx'
import { GROUP_LABELS, HEAD_OFFICE, getLocation, locationPath } from './registry'
import type { LocationContent, LocationMeta } from './types'

const FIGURES: Record<string, { src: string; alt: string }> = {
  curriculum: { src: '/assets/ai/path.jpg', alt: 'AI-generated illustration of a staircase of learning steps from code to data, neural networks and an AI assistant' },
  projects: { src: '/assets/ai/team.jpg', alt: 'AI-generated illustration of learners and professionals building an AI chatbot and data dashboard together' },
}

/** Pure presentational page, used both by the client route and by the build-time prerender. */
export function LocationView({ meta, content }: { meta: LocationMeta; content: LocationContent }) {
  const related = meta.related.map((s) => getLocation(s)).filter((l): l is LocationMeta => !!l)
  const waHref = `https://wa.me/${WHATSAPP.number}?text=${encodeURIComponent(`Hi! I am interested in the AI course. I am from ${meta.short}. Please share the details.`)}`

  return (
    <div className="fs-page lv">
      <LocationFx />
      <FsHeader />
      <main id="main">
        <section className="loc-hero" aria-labelledby="loc-title">
          <div className="wrap loc-hero-in">
            <nav className="breadcrumb" aria-label="Breadcrumb">
              <ol>
                <li><Link to="/">Home</Link></li>
                <li><Link to="/locations/">Locations</Link></li>
                <li><Link to={locationPath(meta.slug)}>{meta.short}</Link></li>
                <li aria-current="page"><span className="current">AI Course</span></li>
              </ol>
            </nav>
            <p className="eyebrow eyebrow-light">AI training · Delhi NCR</p>
            <h1 id="loc-title">{content.h1}</h1>
            <div className="loc-hero-grid">
              <div className="loc-lead" data-editorial="hero">
                {content.hero.map((p, i) => (
                  <p key={i}>{p}</p>
                ))}
                <div className="cta-row">
                  <a href="#enquire" className="btn btn-yellow btn-lg">
                    Request Course Details <FsIcon id="i-arrow" />
                  </a>
                  <a href={waHref} className="btn btn-ghost-light btn-lg" target="_blank" rel="noopener noreferrer">
                    Talk to Our Counsellor
                  </a>
                </div>
              </div>
              <div className="lv-visual">
                <figure className="lv-hero-img">
                  <img src="/assets/ai/hero.jpg" alt="AI-generated illustration of students learning artificial intelligence together" width={1536} height={870} fetchPriority="high" />
                  <span className="lv-chip lv-chip-1">Free 2-hour live online demo</span>
                  <span className="lv-chip lv-chip-2">Learn from {meta.short}</span>
                </figure>
                <aside className="loc-ho-card" aria-label="Head office">
                  <p className="loc-ho-h">Head Office</p>
                  <p>{HEAD_OFFICE.line}.</p>
                  <a className="loc-ho-tel" href={INSTITUTE.phoneHref}>{INSTITUTE.phone}</a>
                </aside>
              </div>
            </div>
          </div>
        </section>

        <section className="lv-glance" aria-label="This guide at a glance">
          <div className="wrap">
            <ul>
              {[
                { n: 16, l: 'topic AI learning path' },
                { n: 8, l: 'career roles explained' },
                { n: 8, l: 'portfolio project ideas' },
                { n: content.faqs.length, l: 'questions answered' },
              ].map((g) => (
                <li key={g.l} data-rv>
                  <strong data-count={g.n}>{g.n}</strong>
                  <span>{g.l}</span>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <div className="wrap loc-body">
          <div className="loc-layout">
            <article className="loc-article" data-editorial="body">
              <nav className="loc-toc" aria-label="On this page">
                <p className="loc-toc-h">On this page</p>
                <ol>
                  {content.sections.map((s) => (
                    <li key={s.id}>
                      <a href={`#${s.id}`}>{s.heading}</a>
                    </li>
                  ))}
                  <li><a href="#faqs">Frequently asked questions</a></li>
                  <li><a href="#head-office">Head Office</a></li>
                </ol>
              </nav>

              {content.sections.map((s) => (
                <section key={s.id} id={s.id} className="loc-sec" aria-labelledby={`${s.id}-h`} data-rv>
                  <h2 id={`${s.id}-h`}>{s.heading}</h2>
                  {s.paragraphs.map((p, i) => (
                    <p key={i}>{p}</p>
                  ))}
                  {s.subsections?.map((sub) => (
                    <div key={sub.heading} className="loc-sub">
                      <h3>{sub.heading}</h3>
                      {sub.paragraphs.map((p, i) => (
                        <p key={i}>{p}</p>
                      ))}
                    </div>
                  ))}
                  {FIGURES[s.id] && (
                    <figure className="loc-fig">
                      <img src={FIGURES[s.id].src} alt={FIGURES[s.id].alt} width={1024} height={768} loading="lazy" decoding="async" />
                      <figcaption>AI-generated illustration</figcaption>
                    </figure>
                  )}
                </section>
              ))}

              <section id="faqs" className="loc-sec" aria-labelledby="faqs-h">
                <h2 id="faqs-h">Frequently asked questions about AI courses for learners in {meta.short}</h2>
                {content.faqs.map((f) => (
                  <div key={f.q} className="loc-faq">
                    <h3>{f.q}</h3>
                    <p>{f.a}</p>
                  </div>
                ))}
              </section>

              <section id="conclusion" className="loc-sec" aria-labelledby="conclusion-h">
                <h2 id="conclusion-h">Your next step towards AI skills</h2>
                {content.conclusion.map((p, i) => (
                  <p key={i}>{p}</p>
                ))}
              </section>
            </article>

            <aside className="loc-side" id="enquire" aria-label="Course enquiry">
              <div className="loc-side-card">
                <h2>Request course details</h2>
                <p>Tell us your goal and we will share the current syllabus, format, schedule and fee details.</p>
                <EnquiryForm locality={meta.label} sourcePage={locationPath(meta.slug)} />
              </div>
              <nav className="loc-jump" aria-label="Jump to a section">
                <p>Jump to</p>
                <ul>
                  {content.sections.map((sec) => (
                    <li key={sec.id}>
                      <a href={`#${sec.id}`}>{sec.heading}</a>
                    </li>
                  ))}
                  <li><a href="#faqs">Questions answered</a></li>
                </ul>
              </nav>
            </aside>
          </div>
        </div>

        <section className="loc-office" id="head-office" aria-labelledby="ho-h">
          <div className="wrap loc-office-in">
            <div>
              <p className="eyebrow">Head Office</p>
              <h2 id="ho-h">Coding Hubs School of AI — Head Office, Netaji Subhash Place, Delhi</h2>
              <address>
                <strong>Head Office:</strong> {HEAD_OFFICE.line}.
              </address>
              <p>
                This is the official address of Coding Hubs School of AI. This page does not describe a separate branch or classroom in {meta.short}; it is
                written for learners in and around {meta.short} who want to understand AI training and enquire about the options available to them.
                Please contact us before travelling so that a counsellor can confirm the current arrangements.
              </p>
              <ul className="loc-office-links">
                <li><a href={INSTITUTE.phoneHref}>Call {INSTITUTE.phone}</a></li>
                <li><a href={`mailto:${INSTITUTE.email}`}>Email {INSTITUTE.email}</a></li>
                <li><a href={waHref} target="_blank" rel="noopener noreferrer">Enquire About AI Training on WhatsApp</a></li>
              </ul>
            </div>
            <div className="loc-office-cta">
              <Link to="/locations/" className="btn btn-navy btn-lg">
                View All Locations
              </Link>
              <a href="/#courses" className="btn btn-ghost btn-lg">
                Explore AI Course
              </a>
            </div>
          </div>
        </section>

        <section className="sec sec-alt loc-related" aria-labelledby="rel-h">
          <div className="wrap">
            <h2 id="rel-h" className="loc-rel-h">AI course information for nearby areas</h2>
            <ul className="lx-grid">
              {related.map((l, i) => (
                <li key={l.slug} style={{ ['--i' as string]: i }}>
                  <Link to={locationPath(l.slug)} className={`lx-card g-${l.group}`}>
                    <span className="lx-tag">{GROUP_LABELS[l.group]}</span>
                    <strong>AI Course in {l.short}</strong>
                    <span className="lx-blurb">{l.blurb}</span>
                    <span className="lx-go">
                      Read the guide <FsIcon id="i-arrow" />
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
            <p className="lv-all"><Link to="/locations/" className="btn btn-navy">View All Locations</Link></p>
          </div>
        </section>
      </main>
      <div className="lv-bar">
        <a href="#enquire" className="btn btn-yellow btn-sm">Request Course Details</a>
        <a href={waHref} className="btn btn-wa btn-sm" target="_blank" rel="noopener noreferrer">WhatsApp</a>
      </div>
      <FsFooter />
    </div>
  )
}
