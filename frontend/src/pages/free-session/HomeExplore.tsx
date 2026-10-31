import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { shop } from '../../shop-pages/api'
import { GROUP_LABELS, GROUP_ORDER, LOCATIONS, locationPath } from '../../locations/registry'

interface Item {
  title: string
  slug: string
  summary?: string
  difficulty?: string
  technologies?: string[]
  access_type?: string
}

/** Published items from the database (nothing is shown until something has been published). */
function useLatest(path: string) {
  const [items, setItems] = useState<Item[]>([])
  useEffect(() => {
    let live = true
    shop.get(path, { params: { page_size: 3 } }).then((r) => live && setItems(Array.isArray(r.data?.results) ? r.data.results : [])).catch(() => undefined)
    return () => {
      live = false
    }
  }, [path])
  return items
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
          <Link to={`${base}/${c.slug}`} className="hx-more">{cta} <span aria-hidden="true">→</span></Link>
        </li>
      ))}
    </ul>
  )
}

export function HomeExplore() {
  const projects = useLatest('/projects/')
  const guides = useLatest('/project-guides/')
  return (
    <>
      {projects.length > 0 && (
        <section className="sec" id="projects" aria-labelledby="projects-title">
          <div className="wrap">
            <div className="sec-head center reveal">
              <p className="eyebrow">Practical projects</p>
              <h2 id="projects-title" className="h2">Build things you can <span className="marker">show</span></h2>
              <p className="sub">Real project ideas with objectives, technology stack and learning outcomes.</p>
            </div>
            <CardList items={projects} base="/projects" cta="View project" />
            <p className="hx-all"><Link className="btn btn-ghost" to="/projects">All projects</Link></p>
          </div>
        </section>
      )}

      {guides.length > 0 && (
        <section className="sec sec-alt" id="guides" aria-labelledby="guides-title">
          <div className="wrap">
            <div className="sec-head center reveal">
              <p className="eyebrow">Learning resources</p>
              <h2 id="guides-title" className="h2">Project guides and <span className="marker">tutorials</span></h2>
              <p className="sub">Step-by-step guides to build and understand each project, plus articles on AI and development.</p>
            </div>
            <CardList items={guides} base="/project-guides" cta="Read guide" />
            <p className="hx-all">
              <Link className="btn btn-ghost" to="/project-guides">All guides</Link>
              <Link className="btn btn-ghost" to="/blog">Read the blog</Link>
            </p>
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
