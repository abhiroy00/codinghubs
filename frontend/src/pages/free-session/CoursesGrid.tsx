import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { COURSE_CATALOG } from '../../learning/catalog'
import { CATEGORY_TABS, COURSES } from './data'
import { FsIcon } from './icons'

const CATALOG_BY_NAME = new Map(COURSE_CATALOG.map((c) => [c.name, c]))
const countFor = (filter: string) => (filter === 'all' ? COURSES.length : COURSES.filter((c) => c.cat === filter).length)

/** Course catalogue: category tabs with counts, search, and equal-height poster cards with details and free-demo buttons. */
export function CoursesGrid() {
  const [filter, setFilter] = useState('all')
  const [q, setQ] = useState('')
  const visible = useMemo(() => {
    const t = q.trim().toLowerCase()
    return COURSES.filter((c) => (filter === 'all' || c.cat === filter) && (!t || `${c.title} ${c.catLabel} ${c.desc}`.toLowerCase().includes(t)))
  }, [filter, q])

  return (
    <>
      <ul className="cc-stats" aria-label="Courses at a glance">
        <li><strong>{COURSES.length}</strong><span>Courses</span></li>
        <li><strong>{CATEGORY_TABS.length - 1}</strong><span>Learning areas</span></li>
        <li><strong>2 hrs</strong><span>Free live demo</span></li>
        <li><strong>30 days</strong><span>Interview-prep roadmap</span></li>
      </ul>

      <div className="cc-toolbar">
        <div className="tabs" role="group" aria-label="Filter by category">
          {CATEGORY_TABS.map((t) => (
            <button key={t.filter} type="button" className={`tab${filter === t.filter ? ' is-active' : ''}`} aria-pressed={filter === t.filter} onClick={() => setFilter(t.filter)}>
              {t.label} <span className="tab-n">{countFor(t.filter)}</span>
            </button>
          ))}
        </div>
        <label className="cc-search">
          <span className="sr-only">Search courses</span>
          <input type="search" placeholder="Search a course, e.g. Python" value={q} onChange={(e) => setQ(e.target.value)} />
        </label>
      </div>

      <p className="cc-count" role="status" aria-live="polite">Showing {visible.length} of {COURSES.length} courses</p>

      <div className="cc-grid" id="courseGrid">
        {visible.map((c, i) => {
          const def = CATALOG_BY_NAME.get(c.title)
          const tools = def ? def.tools.slice(0, 3) : []
          return (
            <article className={`cc-card cc-${c.cat}`} key={c.title} style={{ ['--i' as string]: Math.min(i, 8) }}>
              <div className="cc-poster" aria-hidden="true">
                <span className="cc-ring r1" />
                <span className="cc-ring r2" />
                <span className="cc-glyph"><FsIcon id={c.icon} /></span>
                <span className="cc-cat">{c.catLabel}</span>
                <span className="cc-code">{'</>'}</span>
              </div>
              <div className="cc-body">
                <h3>{c.title}</h3>
                <p>{c.desc}</p>
                {tools.length > 0 && (
                  <ul className="cc-tools" aria-label="Tools and concepts">
                    {tools.map((t) => (<li key={t}>{t}</li>))}
                  </ul>
                )}
                <ul className="cc-meta">
                  <li><FsIcon id="i-monitor" /> Live online</li>
                  <li><FsIcon id="i-ticket" /> Free demo</li>
                </ul>
                <div className="cc-actions">
                  {def ? <Link className="cc-btn cc-ghost" to={`/courses/${def.slug}/`}>View details</Link> : <span />}
                  <button type="button" className="cc-btn cc-solid" data-course={c.title} data-cta-location="course_card">
                    Free demo <FsIcon id="i-arrow" />
                  </button>
                </div>
              </div>
            </article>
          )
        })}
      </div>

      {visible.length === 0 && (
        <div className="empty">
          <p>No course matches your search.</p>
          <button type="button" className="btn btn-navy btn-sm" onClick={() => { setFilter('all'); setQ('') }}>Show all courses</button>
        </div>
      )}
    </>
  )
}
