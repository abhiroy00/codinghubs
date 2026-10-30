import { useState } from 'react'
import { CATEGORY_TABS, COURSES } from './data'
import { FsIcon } from './icons'
import { Link } from 'react-router-dom'
import { COURSE_CATALOG } from '../../learning/catalog'

export function CoursesGrid() {
  const [filter, setFilter] = useState('all')
  const visible = filter === 'all' ? COURSES : COURSES.filter((c) => c.cat === filter)

  return (
    <>
      <div className="toolbar">
        <div className="tabs" role="group" aria-label="Filter by category">
          {CATEGORY_TABS.map((t) => (
            <button
              key={t.filter}
              type="button"
              className={`tab${filter === t.filter ? ' is-active' : ''}`}
              aria-pressed={filter === t.filter}
              onClick={() => setFilter(t.filter)}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div className="course-grid" id="courseGrid">
        {visible.map((c) => (
          <article className="course" data-cat={c.cat} key={c.title}>
            <div className="c-top">
              <span className={`c-ico ${c.iconColor}`}>
                <FsIcon id={c.icon} />
              </span>
              <span className="c-cat">{c.catLabel}</span>
            </div>
            <h3>{c.title}</h3>
            <p>{c.desc}</p>
            {COURSE_CATALOG.find((course) => course.name === c.title) && <Link className="c-btn" to={`/courses/${COURSE_CATALOG.find((course) => course.name === c.title)?.slug}/`}>View course details <FsIcon id="i-arrow" /></Link>}
            <button type="button" className="c-btn" data-course={c.title} data-cta-location="course_card">
              Join Free Session <FsIcon id="i-arrow" />
            </button>
          </article>
        ))}
      </div>
      <div className="empty" hidden={visible.length !== 0}>
        <p>No courses in this category yet.</p>
        <button type="button" className="btn btn-navy btn-sm" onClick={() => setFilter('all')}>
          Show all courses
        </button>
      </div>
    </>
  )
}
