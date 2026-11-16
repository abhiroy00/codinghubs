import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { GROUP_LABELS, GROUP_ORDER, LOCATIONS, locationPath } from '../../locations/registry'

interface Item {
  title: string
  slug: string
  summary?: string
  difficulty?: string
  technologies?: string[]
  access_type?: string
  guide?: { title: string; slug: string } | null
}

/** Published items from the database (nothing is shown until something has been published). */
/** Small public GET without pulling the HTTP client into the home page bundle. */
const getJson = (path: string) => fetch(`/api${path}`, { headers: { Accept: 'application/json' } }).then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))

function useLatest(path: string) {
  const [items, setItems] = useState<Item[]>([])
  useEffect(() => {
    let live = true
    getJson(`${path}?page_size=3`).then((d) => live && setItems(Array.isArray(d?.results) ? d.results : [])).catch(() => undefined)
    return () => {
      live = false
    }
  }, [path])
  return items
}

interface Review {
  name: string
  course: string
  text: string
  photo: string
}

/** Genuine student reviews the owner has published with permission (nothing renders until one exists). */
function useReviews() {
  const [rows, setRows] = useState<Review[]>([])
  useEffect(() => {
    let live = true
    getJson('/testimonials/').then((d) => live && setRows(Array.isArray(d) ? d : [])).catch(() => undefined)
    return () => {
      live = false
    }
  }, [])
  return rows
}

function CardList({ items, base, cta }: { items: Item[]; base: string; cta: string }) {
  return (
    <ul className="hx-grid">
      {items.map((c) => (
        <li key={c.slug} className="hx-card">
          {c.difficulty && <span className="hx-tag">{c.difficulty}</span>}
          <h3>
            <Link to={`${base}/${c.slug}`}>{c.title}</Link>
          </h3>
          {c.summary && <p>{c.summary}</p>}
          {c.technologies && c.technologies.length > 0 && (
            <ul className="hx-tech" aria-label="Technologies">
              {c.technologies.slice(0, 4).map((t) => (<li key={t}>{t}</li>))}
            </ul>
          )}
          {c.guide && (
            <Link to={`/project-guides/${c.guide.slug}`} className="hx-guide">
              Guide: {c.guide.title}
            </Link>
          )}
          <Link to={`${base}/${c.slug}`} className="hx-more">{cta} <span aria-hidden="true">→</span></Link>
        </li>
      ))}
    </ul>
  )
}

export function HomeExplore() {
  const projects = useLatest('/projects/')
  const reviews = useReviews()
  return (
    <>
      {projects.length > 0 && (
        <section className="sec" id="projects" aria-labelledby="projects-title">
          <div className="wrap">
            <div className="sec-head center reveal">
              <p className="eyebrow">Practical projects</p>
              <h2 id="projects-title" className="h2">Projects with <span className="marker">step-by-step guides</span></h2>
              <p className="sub">Each project comes with its guide: objectives, technology stack and how to build it.</p>
            </div>
            <CardList items={projects} base="/projects" cta="View project" />
            <p className="hx-all"><Link className="btn btn-ghost" to="/projects">All projects</Link><Link className="btn btn-ghost" to="/blog">Read the blog</Link></p>
          </div>
        </section>
      )}

      {reviews.length > 0 && (
        <section className="sec sec-alt" id="reviews" aria-labelledby="reviews-title">
          <div className="wrap">
            <div className="sec-head center reveal">
              <p className="eyebrow">Student feedback</p>
              <h2 id="reviews-title" className="h2">What our <span className="marker">students</span> say</h2>
            </div>
            <ul className="hx-grid">
              {reviews.map((r) => (
                <li key={r.name + r.text.slice(0, 12)} className="hx-card hx-review">
                  <blockquote>“{r.text}”</blockquote>
                  <p className="hx-who">
                    {r.photo && <img src={r.photo} alt="" width={44} height={44} loading="lazy" />}
                    <span><strong>{r.name}</strong>{r.course && <em>{r.course}</em>}</span>
                  </p>
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}

      <section className="sec" id="locations" aria-labelledby="locations-title">
        <div className="wrap">
          <div className="sec-head center reveal">
            <p className="eyebrow">Delhi NCR</p>
            <h2 id="locations-title" className="h2">AI courses across <span className="marker">Delhi NCR</span></h2>
            <p className="sub">Guides for learners in your area: what to learn, how to start and how to reach us.</p>
          </div>
          <div className="hx-locs">
            {GROUP_ORDER.map((g) => (
              <div key={g} className="hx-loc-group">
                <h3>{GROUP_LABELS[g]}</h3>
                <ul>
                  {LOCATIONS.filter((l) => l.group === g).map((l) => (
                    <li key={l.slug}><Link to={locationPath(l.slug)}>{l.short}</Link></li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          <p className="hx-all"><Link className="btn btn-ghost" to="/locations/">All {LOCATIONS.length} locations</Link></p>
        </div>
      </section>
    </>
  )
}
