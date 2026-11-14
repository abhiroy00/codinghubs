import { useState } from 'react'
import { Link } from 'react-router-dom'
import { COURSE_CATEGORIES, type CourseDefinition } from './catalog'
import './course-explorer.css'

type Tab = 'learn' | 'projects' | 'careers'
const TABS: [Tab, string][] = [['learn', 'What you will learn'], ['projects', 'Projects'], ['careers', 'Careers']]

const cap = (s: string) => s[0].toUpperCase() + s.slice(1)
const pad = (n: number) => String(n).padStart(2, '0')
const monogram = (t: string) => t.replace(/[^A-Za-z0-9 ]/g, ' ').trim().split(/\s+/).slice(0, 2).map((w) => w[0]).join('').toUpperCase()

function BookIcon() {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="5" y="3" width="14" height="18" rx="2" /><path d="M9 8h6M9 12h6M9 16h4" />
    </svg>
  )
}

function CoursePanel({ course }: { course: CourseDefinition }) {
  const [tab, setTab] = useState<Tab>('learn')
  const id = `cx-${course.slug}`
  return (
    <div className="cx-panel">
      <div className="cx-panel-head">
        <p className="cx-meta">{course.category} · {course.modules.length} modules · 30-day path</p>
        <h3>{course.name}</h3>
        <p className="cx-intro">{course.introduction}</p>
      </div>

      <div className="cx-tabs" role="tablist" aria-label={`${course.name} details`}>
        {TABS.map(([key, label]) => (
          <button key={key} type="button" role="tab" id={`${id}-${key}`} aria-selected={tab === key} aria-controls={`${id}-${key}-panel`} className={tab === key ? 'on' : ''} onClick={() => setTab(key)}>
            {label}
          </button>
        ))}
      </div>

      <div className="cx-tabpanel" role="tabpanel" id={`${id}-${tab}-panel`} aria-labelledby={`${id}-${tab}`}>
        {tab === 'learn' && (
          <>
            <ol className="cx-modules">
              {course.modules.map((m, i) => (
                <li key={m.title}><span>Module {pad(i + 1)}</span>{m.title}</li>
              ))}
            </ol>
            <h4 className="cx-sub">Skills you build</h4>
            <ul className="cx-bullets">
              {course.skills.map((s) => (<li key={s}>{cap(s)}</li>))}
            </ul>
          </>
        )}
        {tab === 'projects' && (
          <ul className="cx-projects">
            {course.projects.map((p) => (
              <li key={p.name}><strong>{p.name}</strong><p>{p.description}</p></li>
            ))}
          </ul>
        )}
        {tab === 'careers' && (
          <ul className="cx-bullets">
            {course.careers.map((c) => (<li key={c}>{cap(c)}</li>))}
          </ul>
        )}
      </div>

      <div className="cx-tools">
        <h4>Tools used</h4>
        <ul>
          {course.tools.map((t) => (
            <li key={t}><span aria-hidden="true">{monogram(t)}</span>{t}</li>
          ))}
        </ul>
      </div>

      <div className="cx-actions">
        <Link className="cx-btn" to={`/courses/${course.slug}/`}>View course details <span aria-hidden="true">→</span></Link>
        <Link className="cx-btn cx-btn-quiet" to={`/interview-prep/${course.slug}/`}>30-day interview prep</Link>
        <a className="cx-btn cx-btn-quiet" href="/#register">Book free demo</a>
      </div>
    </div>
  )
}

/** Curriculum-style course explorer: category tabs, a numbered course list and a detail panel. */
export function CourseExplorer() {
  const [catIndex, setCatIndex] = useState(0)
  const [slug, setSlug] = useState(COURSE_CATEGORIES[0].courses[0].slug)
  const category = COURSE_CATEGORIES[catIndex]
  const course = category.courses.find((c) => c.slug === slug) ?? category.courses[0]

  return (
    <section id="courses" className="cx" aria-labelledby="cx-title">
      <div className="cx-head">
        <p className="cx-kicker">Course curriculum</p>
        <h2 id="cx-title">Find the course that fits your goal</h2>
        <p>Pick a track, choose a course and see its modules, projects and tools before you book a free demo.</p>
      </div>

      <div className="cx-cats" role="group" aria-label="Course category">
        {COURSE_CATEGORIES.map((c, i) => (
          <button key={c.name} type="button" aria-pressed={i === catIndex} className={i === catIndex ? 'on' : ''} onClick={() => { setCatIndex(i); setSlug(c.courses[0].slug) }}>
            {c.name} <span>{c.courses.length}</span>
          </button>
        ))}
      </div>

      <div className="cx-frame">
        <ul className="cx-list" aria-label={`${category.name} courses`}>
          {category.courses.map((c, i) => (
            <li key={c.slug}>
              <button type="button" className={c.slug === course.slug ? 'on' : ''} aria-current={c.slug === course.slug ? 'true' : undefined} onClick={() => setSlug(c.slug)}>
                <span className="cx-ico"><BookIcon /></span>
                <span className="cx-li-text"><small>Course {pad(i + 1)}</small>{c.name}</span>
              </button>
            </li>
          ))}
        </ul>
        <CoursePanel key={course.slug} course={course} />
      </div>
    </section>
  )
}

/** Compact index so every course page stays one link away. */
export function CourseIndex() {
  return (
    <section className="cx-index" aria-labelledby="cx-index-title">
      <h2 id="cx-index-title">All courses</h2>
      <div className="cx-index-grid">
        {COURSE_CATEGORIES.map((c) => (
          <div key={c.name}>
            <h3>{c.name}</h3>
            <ul>{c.courses.map((course) => (<li key={course.slug}><Link to={`/courses/${course.slug}/`}>{course.name}</Link></li>))}</ul>
          </div>
        ))}
      </div>
    </section>
  )
}
