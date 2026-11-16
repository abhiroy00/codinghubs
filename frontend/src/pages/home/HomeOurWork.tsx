import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { WORKS, WORK_CATEGORIES, workImage } from '../../data/our-work'

const SHOWN = 6

/** Home showcase of delivered projects with working category filters; the full list lives on /our-work. */
export function HomeOurWork() {
  const [category, setCategory] = useState('')
  const filtered = useMemo(() => (category ? WORKS.filter((w) => w.category === category) : WORKS), [category])
  const shown = filtered.slice(0, SHOWN)
  const count = (c: string) => WORKS.filter((w) => w.category === c).length

  return (
    <section className="hm-sec hm-alt" id="our-work" aria-labelledby="hm-work-title">
      <div className="hm-wrap">
        <div className="hm-head hm-head-split">
          <div>
            <p className="hm-kicker">Our Work</p>
            <h2 id="hm-work-title">Projects built, shipped and working in the real world</h2>
          </div>
          <p className="hm-lead">AI applications, business platforms, online stores and websites. Open a project to see it live.</p>
        </div>

        <div className="hm-chips" role="group" aria-label="Filter projects by category">
          <button type="button" className={!category ? 'is-on' : ''} aria-pressed={!category} onClick={() => setCategory('')}>
            All <span>{WORKS.length}</span>
          </button>
          {WORK_CATEGORIES.map((c) => (
            <button key={c} type="button" className={category === c ? 'is-on' : ''} aria-pressed={category === c} onClick={() => setCategory(category === c ? '' : c)}>
              {c} <span>{count(c)}</span>
            </button>
          ))}
        </div>
        <p className="hm-count" role="status" aria-live="polite">
          Showing {shown.length} of {filtered.length} {category ? `${category} ` : ''}project{filtered.length === 1 ? '' : 's'}
        </p>

        <ul className="hm-work-grid">
          {shown.map((w) => (
            <li key={w.name} className="hm-work">
              <div className="hm-work-shot">
                <img src={workImage(w)} alt={`${w.name} screenshot`} width={800} height={500} loading="lazy" decoding="async" />
              </div>
              <div className="hm-work-body">
                <p className="hm-tag">{w.category}</p>
                <h3>{w.name}</h3>
                <p>{w.summary}</p>
                {w.href ? (
                  <a className="hm-link" href={w.href} target="_blank" rel="noopener noreferrer">
                    View project<span className="sr-only">: {w.name} (opens in a new tab)</span> <span aria-hidden="true">↗</span>
                  </a>
                ) : (
                  <span className="hm-muted-note">Private client project</span>
                )}
              </div>
            </li>
          ))}
        </ul>

        <p className="hm-more">
          <Link className="hm-btn hm-btn-ghost" to="/our-work">See all {WORKS.length} projects</Link>
        </p>
      </div>
    </section>
  )
}
