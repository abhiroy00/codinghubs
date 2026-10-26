import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useScopedStylesheet } from '../hooks/useScopedStylesheet'
import { FsIcon } from '../pages/free-session/icons'
import { INSTITUTE } from '../pages/free-session/data'
import { FsFooter, FsHeader } from './FsShell'
import { INDEX_TITLE } from './seo'
import { GROUP_LABELS, GROUP_ORDER, HEAD_OFFICE, LOCATIONS, locationPath } from './registry'

export function LocationsIndex() {
  useScopedStylesheet([
    '/free-session.css',
    'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&family=Poppins:wght@600;700;800&display=swap',
  ])
  useEffect(() => {
    document.title = INDEX_TITLE
  }, [])
  const [q, setQ] = useState('')
  const filtered = useMemo(() => {
    const t = q.trim().toLowerCase()
    return t ? LOCATIONS.filter((l) => l.label.toLowerCase().includes(t) || l.short.toLowerCase().includes(t)) : LOCATIONS
  }, [q])

  return (
    <div className="fs-page">
      <FsHeader />
      <main id="main">
        <section className="loc-hero" aria-labelledby="idx-title">
          <div className="wrap loc-hero-in">
            <nav className="breadcrumb" aria-label="Breadcrumb">
              <ol>
                <li><Link to="/">Home</Link></li>
                <li aria-current="page"><span className="current">Locations</span></li>
              </ol>
            </nav>
            <p className="eyebrow eyebrow-light">AI training · Delhi NCR</p>
            <h1 id="idx-title">AI Course Information for Learners Across Delhi NCR</h1>
            <div className="loc-lead">
              <p>
                Coding Hubs School of AI helps students, graduates and working professionals build practical skills in Artificial Intelligence, from
                Python and data handling to generative AI applications. Our official head office is at Netaji Subhash Place (NSP), Delhi, and we hear from
                learners across Delhi, Noida, Gurugram, Faridabad and nearby towns.
              </p>
              <p>
                Choose your area below to read a guide written for learners there: what AI training involves, how to compare options, who it suits and how
                to enquire. Each guide is honest about where we are located, so you can plan with the right expectations.
              </p>
              <div className="cta-row">
                <a href="#all-locations" className="btn btn-yellow btn-lg">Find Your Area <FsIcon id="i-arrow" /></a>
                <a href={INSTITUTE.phoneHref} className="btn btn-ghost-light btn-lg">Talk to Our Counsellor</a>
              </div>
            </div>
          </div>
        </section>

        <section className="sec" id="all-locations" aria-labelledby="idx-h2">
          <div className="wrap">
            <h2 id="idx-h2" className="loc-rel-h">Choose your location</h2>
            <div className="loc-search">
              <label htmlFor="loc-q">Search by locality</label>
              <input id="loc-q" type="search" placeholder="e.g. Laxmi Nagar, Sector 62, Gurugram" value={q} onChange={(e) => setQ(e.target.value)} />
              <p className="loc-search-n" role="status" aria-live="polite">
                {filtered.length} of {LOCATIONS.length} locations
              </p>
            </div>
            {GROUP_ORDER.map((g) => {
              const items = filtered.filter((l) => l.group === g)
              if (!items.length) return null
              return (
                <div key={g} className="loc-group">
                  <h3>{GROUP_LABELS[g]}</h3>
                  <ul className="loc-cards">
                    {items.map((l) => (
                      <li key={l.slug}>
                        <Link to={locationPath(l.slug)}>
                          <strong>AI Course in {l.short}</strong>
                          <span>{l.blurb}</span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              )
            })}
            {filtered.length === 0 && <p className="loc-none">No matching locality. Try a nearby area, or contact us and we will help you find the right option.</p>}
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
              <ul className="loc-office-links">
                <li><a href={INSTITUTE.phoneHref}>Call {INSTITUTE.phone}</a></li>
                <li><a href={`mailto:${INSTITUTE.email}`}>Email {INSTITUTE.email}</a></li>
              </ul>
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
