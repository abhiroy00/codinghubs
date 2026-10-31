import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { FS_CSS } from '../lib/fs-css'
import { useScopedStylesheet } from '../hooks/useScopedStylesheet'
import { INSTITUTE } from '../pages/free-session/data'
import { FsIcon } from '../pages/free-session/icons'
import { EnquiryForm } from './EnquiryForm'
import { FsFooter, FsHeader } from './FsShell'
import { Marquee } from './Marquee'
import { COURSE_NAMES, GROUP_LABELS, GROUP_ORDER, HEAD_OFFICE, LOCATIONS, locationPath } from './registry'
import { INDEX_TITLE } from './seo'
import type { LocationGroup } from './types'

const STEPS = [
  { n: '01', t: 'Find your area', d: 'Open the guide written for your locality and read what AI training involves for learners there.' },
  { n: '02', t: 'Try the free session', d: 'Join the free two-hour live online demo and see the teaching style before you decide anything.' },
  { n: '03', t: 'Talk to a counsellor', d: 'Ask about syllabus, format, schedule and terms, and decide at your own pace.' },
]

const PERKS = [
  { i: 'i-monitor', t: 'Learn online', d: 'The free demo and 15-day programs are live and online, so learners anywhere in NCR can join.' },
  { i: 'i-pin', t: 'Honest about location', d: 'One official head office at Netaji Subhash Place. No fake local branches.' },
  { i: 'i-check', t: 'Written per locality', d: 'Each guide is written for its own area and audience, not copy-pasted.' },
]

export function LocationsIndex() {
  useScopedStylesheet([
    FS_CSS,
    'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&family=Manrope:wght@600;700;800&display=swap',
  ])
  useEffect(() => {
    document.title = INDEX_TITLE
    window.scrollTo(0, 0)
  }, [])

  const [q, setQ] = useState('')
  const [group, setGroup] = useState<LocationGroup | 'all'>('all')
  useEffect(() => {
    const h = new URLSearchParams(window.location.search).get('region') || ''
    if ((GROUP_ORDER as string[]).includes(h)) setGroup(h as LocationGroup)
  }, [])

  const filtered = useMemo(() => {
    const t = q.trim().toLowerCase()
    return LOCATIONS.filter(
      (l) => (group === 'all' || l.group === group) && (!t || l.label.toLowerCase().includes(t) || l.short.toLowerCase().includes(t)),
    )
  }, [q, group])

  return (
    <div className="fs-page">
      <FsHeader />
      <main id="main">
        <section className="lx-hero" aria-labelledby="idx-title">
          <span className="lx-blob lx-b1" aria-hidden="true"></span>
          <span className="lx-blob lx-b2" aria-hidden="true"></span>
          <span className="lx-blob lx-b3" aria-hidden="true"></span>
          <div className="wrap lx-hero-in">
            <p className="eyebrow eyebrow-light">AI training · Delhi NCR</p>
            <h1 id="idx-title">
              AI Course Information for Learners Across <span className="lx-mark">Delhi NCR</span>
            </h1>
            <p className="lx-sub">
              Coding Hubs School of AI helps students, graduates and working professionals build practical AI skills, from Python and data to generative AI
              applications. Pick your area to read a guide written for learners there.
            </p>
            <div className="cta-row">
              <a href="#all-locations" className="btn btn-yellow btn-lg btn-anim">
                Find Your Area <FsIcon id="i-arrow" />
              </a>
              <a href="#enquire" className="btn btn-ghost-light btn-lg">
                Talk to Our Counsellor
              </a>
            </div>
            <ul className="lx-chips" aria-label="Highlights">
              <li><strong>{LOCATIONS.length}</strong> area guides</li>
              <li><strong>2-hour</strong> free live online demo</li>
              <li><strong>NSP, Delhi</strong> official head office</li>
            </ul>
          </div>
        </section>

        <section className="lx-steps" aria-label="How it works">
          <div className="wrap">
            <ol className="lx-step-list">
              {STEPS.map((s) => (
                <li key={s.n}>
                  <span className="lx-step-n">{s.n}</span>
                  <h2>{s.t}</h2>
                  <p>{s.d}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <Marquee title="AI course locations" items={LOCATIONS.map((l) => ({ label: l.short, href: locationPath(l.slug), internal: true }))} />

        <section className="sec lx-find" id="all-locations" aria-labelledby="idx-h2">
          <div className="wrap">
            <div className="sec-head center">
              <p className="eyebrow">Choose your location</p>
              <h2 id="idx-h2" className="h2">
                Which area are you <span className="marker">learning from?</span>
              </h2>
            </div>

            <div className="lx-filter">
              <div className="lx-tabs" role="group" aria-label="Filter by region">
                <button type="button" className="lx-tab" aria-pressed={group === 'all'} onClick={() => setGroup('all')}>
                  All <span>{LOCATIONS.length}</span>
                </button>
                {GROUP_ORDER.map((g) => (
                  <button key={g} type="button" className={`lx-tab g-${g}`} aria-pressed={group === g} onClick={() => setGroup(g)}>
                    {GROUP_LABELS[g]} <span>{LOCATIONS.filter((l) => l.group === g).length}</span>
                  </button>
                ))}
              </div>
              <div className="lx-search">
                <label htmlFor="loc-q" className="sr-only">Search by locality</label>
                <input id="loc-q" type="search" placeholder="Search your area, e.g. Laxmi Nagar, Sector 62" value={q} onChange={(e) => setQ(e.target.value)} />
              </div>
            </div>
            <p className="lx-count" role="status" aria-live="polite">
              Showing {filtered.length} of {LOCATIONS.length} locations
            </p>

            <ul className="lx-grid">
              {filtered.map((l, i) => (
                <li key={l.slug} style={{ ['--i' as string]: i }}>
                  <Link to={locationPath(l.slug)} className={`lx-card g-${l.group}`}>
                    <img className="lx-thumb" src={`/assets/ai/loc/thumb/${l.slug}.jpg`} alt="" width={640} height={363} loading="lazy" decoding="async" />
                    <span className="lx-badge" aria-hidden="true">{String(LOCATIONS.indexOf(l) + 1).padStart(2, '0')}</span>
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
            {filtered.length === 0 && (
              <p className="loc-none">
                No matching locality. Try a nearby area, or <a href="#enquire">tell us where you are</a> and we will help you find the right option.
              </p>
            )}
          </div>
        </section>

        <section className="sec sec-alt lx-perks" aria-label="Why these guides">
          <div className="wrap">
            <ul className="lx-perk-list">
              {PERKS.map((p) => (
                <li key={p.t}>
                  <span className="lx-perk-ico"><FsIcon id={p.i} /></span>
                  <h3>{p.t}</h3>
                  <p>{p.d}</p>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <Marquee title="Courses at Coding Hubs" tone="navy" reverse items={COURSE_NAMES.map((c) => ({ label: c, href: '/#courses' }))} />

        <section className="lx-cta" id="enquire" aria-labelledby="idx-cta">
          <span className="lx-blob lx-b2" aria-hidden="true"></span>
          <div className="wrap lx-cta-in">
            <div className="lx-cta-copy">
              <p className="eyebrow eyebrow-light">Not sure where to start?</p>
              <h2 id="idx-cta">Tell us your goal. We will point you to the right AI course.</h2>
              <p>
                Share your name and number and a counsellor will get back to you with the current syllabus, format and schedule. No payment is needed to enquire.
              </p>
              <ul className="lx-cta-links">
                <li><a href={INSTITUTE.phoneHref}>Call {INSTITUTE.phone}</a></li>
                <li><a href={`mailto:${INSTITUTE.email}`}>{INSTITUTE.email}</a></li>
              </ul>
            </div>
            <div className="form-card">
              <EnquiryForm locality="Delhi NCR" sourcePage="/locations/" />
            </div>
          </div>
        </section>

        <section className="loc-office" id="head-office" aria-labelledby="idx-ho">
          <div className="wrap loc-office-in">
            <div>
              <p className="eyebrow">Head Office</p>
              <h2 id="idx-ho">Where to find us</h2>
              <address>
                <strong>Head Office:</strong> {HEAD_OFFICE.line}.
              </address>
              <p>
                All of our location guides refer to this single official address. Please contact us before visiting so a counsellor can confirm current
                arrangements for your enquiry.
              </p>
            </div>
            <div className="loc-office-cta">
              <a href="/#courses" className="btn btn-yellow btn-lg">Explore AI Course</a>
            </div>
          </div>
        </section>
      </main>
      <FsFooter />
    </div>
  )
}
