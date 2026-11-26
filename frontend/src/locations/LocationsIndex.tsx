import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { FS_CSS } from '../lib/fs-css'
import { useScopedStylesheet } from '../hooks/useScopedStylesheet'
import { INSTITUTE } from '../pages/free-session/data'
import { FsIcon } from '../pages/free-session/icons'
import { EnquiryForm } from './EnquiryForm'
import { FsHeader } from './FsShell'
import { SiteFooter } from '../components/SiteFooter'
import { Marquee } from './Marquee'
import { CAMPUSES, COURSE_NAMES, GROUP_LABELS, GROUP_ORDER, LOCATIONS, locationPath } from './registry'
import './locations-index.css'
import { INDEX_TITLE, INDEX_DESCRIPTION, indexJsonLd } from './seo'
import { LOGO_URL, pageSeo } from '../seo/site'
import { useSeo } from '../seo/useSeo'

const INDEX_SEO = pageSeo({ path: '/locations/', title: INDEX_TITLE, description: INDEX_DESCRIPTION, image: LOGO_URL, indexable: true, jsonLd: indexJsonLd() })
import type { LocationGroup } from './types'
import { HeroVideo } from '../components/HeroVideo'
import { AnimatedCard } from '../components/ui'

/** Card thumbnails: AVIF/WebP at 400w and 640w next to the original JPG (kept as the fallback). */
const THUMB_SIZES = '(min-width: 1000px) 400px, (min-width: 640px) 50vw, 100vw'
const thumbSet = (slug: string, ext: 'avif' | 'webp') => `/assets/ai/loc/thumb/${slug}-w400.${ext} 400w, /assets/ai/loc/thumb/${slug}-w640.${ext} 640w`

const PERKS = [
  { i: 'i-monitor', t: 'Learn online', d: 'The free demo and 15-day programs are live and online, so learners anywhere in NCR can join.' },
  { i: 'i-pin', t: 'Honest about location', d: 'One head office and classroom at Netaji Subhash Place, Pitampura. Other area guides are for online learners; no fake local branches.' },
  { i: 'i-check', t: 'Written per locality', d: 'Each guide is written for its own area and audience, not copy-pasted.' },
]

export function LocationsIndex() {
  useSeo(INDEX_SEO)
  useScopedStylesheet([
    FS_CSS,
  ])
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [])

  const [q, setQ] = useState('')
  const [group, setGroup] = useState<LocationGroup | 'all'>('all')
  useEffect(() => {
    const h = new URLSearchParams(window.location.search).get('region') || ''
    if ((GROUP_ORDER as string[]).includes(h)) setGroup(h as LocationGroup)
  }, [])
  // Keep ?region= in the address bar so a filtered view can be shared and the footer's region links keep working.
  function chooseGroup(next: LocationGroup | 'all') {
    setGroup(next)
    const url = new URL(window.location.href)
    if (next === 'all') url.searchParams.delete('region')
    else url.searchParams.set('region', next)
    window.history.replaceState(window.history.state, '', url.pathname + url.search + url.hash)
  }

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
        <section className="lx-hero hv-host" aria-labelledby="idx-title"><HeroVideo clip="locations" />
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
              <li><strong>NSP, Pitampura</strong> head office &amp; classroom</li>
            </ul>
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
                <button type="button" className="lx-tab" aria-pressed={group === 'all'} onClick={() => chooseGroup('all')}>
                  All <span>{LOCATIONS.length}</span>
                </button>
                {GROUP_ORDER.map((g) => (
                  <button key={g} type="button" className={`lx-tab g-${g}`} aria-pressed={group === g} onClick={() => chooseGroup(g)}>
                    {GROUP_LABELS[g]} <span>{LOCATIONS.filter((l) => l.group === g).length}</span>
                  </button>
                ))}
              </div>
              <div className="lx-search">
                <label htmlFor="loc-q" className="sr-only">Search by locality</label>
                <input id="loc-q" type="search" placeholder="Search your area, e.g. Laxmi Nagar, Sector 62" value={q} onChange={(e) => setQ(e.target.value)} />
              </div>
            </div>
            <div className="lx-avail" aria-label="How you can learn">
              <p><span className="lx-dot lx-dot-online" aria-hidden="true" /><strong>Online live</strong> classes and the free demo are available from every area listed.</p>
              <p><span className="lx-dot lx-dot-office" aria-hidden="true" /><strong>In person</strong> at our head office and classroom in Netaji Subhash Place, Pitampura, Delhi. <a href="#head-office">Contact us before visiting</a>.</p>
            </div>
            <p className="lx-count" role="status" aria-live="polite">
              Showing {filtered.length} of {LOCATIONS.length} locations
            </p>

            <ul className="lx-grid">
              {filtered.map((l, i) => (
                <li key={l.slug} style={{ ['--i' as string]: i }}>
                  <AnimatedCard bare as={Link} to={locationPath(l.slug)} className={`lx-card ui-zoom g-${l.group}`}>
                    <picture>
                      <source type="image/avif" srcSet={thumbSet(l.slug, 'avif')} sizes={THUMB_SIZES} />
                      <source type="image/webp" srcSet={thumbSet(l.slug, 'webp')} sizes={THUMB_SIZES} />
                      <img className="lx-thumb" src={`/assets/ai/loc/thumb/${l.slug}.jpg`} alt="" width={640} height={363} loading="lazy" decoding="async" />
                    </picture>
                    <span className="lx-badge" aria-hidden="true">{String(LOCATIONS.indexOf(l) + 1).padStart(2, '0')}</span>
                    <span className="lx-tag">{GROUP_LABELS[l.group]}</span>
                    <strong>AI Course in {l.short}</strong>
                    <span className="lx-mode">{l.slug === 'ai-course-in-pitampura-delhi' || l.slug === 'ai-course-in-nsp-delhi' ? 'Classroom + online live' : 'Online live · Classroom at NSP, Pitampura'}</span>
                    <span className="lx-blurb">{l.blurb}</span>
                    <span className="lx-go">
                      Read the guide <FsIcon id="i-arrow" />
                    </span>
                  </AnimatedCard>
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

        <Marquee title="Courses at Coding Hubs" tone="navy" reverse items={COURSE_NAMES.map((c) => ({ label: c, href: '/courses/' }))} />

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
              <p className="eyebrow">Where we teach</p>
              <h2 id="idx-ho">Our classroom in Delhi</h2>
              <div className="lx-campuses">
                {CAMPUSES.map((c) => (
                  <div key={c.name}><b>{c.name}</b><small>{c.role}</small><address>{c.address}</address></div>
                ))}
              </div>
              <p>
                The area guides on this page are written for learners in those areas, most of whom join live online. Please contact us before visiting the
                classroom so a counsellor can confirm the batch and timing for your enquiry.
              </p>
            </div>
            <div className="loc-office-cta">
              <a href="/courses/" className="btn btn-yellow btn-lg">Explore AI Course</a>
            </div>
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  )
}
