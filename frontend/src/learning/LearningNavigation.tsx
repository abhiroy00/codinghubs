import { Link } from 'react-router-dom'
import { COURSE_CATEGORIES } from './catalog'

export function LearningNavigation() {
  return <>
    <li className="dd learn-nav-dropdown"><Link className="nav-link" to="/courses/" aria-haspopup="true">Courses <span aria-hidden="true">⌄</span></Link><div className="dd-panel learn-nav-panel">{COURSE_CATEGORIES.map((category) => <div key={category.name}><h4>{category.name}</h4>{category.courses.map((course) => <Link key={course.slug} to={`/courses/${course.slug}/`}>{course.name}</Link>)}</div>)}</div></li>
    <li className="dd learn-nav-dropdown"><Link className="nav-link" to="/interview-prep/" aria-haspopup="true">Interview Prep <span aria-hidden="true">⌄</span></Link><div className="dd-panel dd-small learn-prep-panel"><Link to="/interview-prep/">Progress dashboard</Link>{COURSE_CATEGORIES.map((category) => <div key={category.name}><h4>{category.name}</h4>{category.courses.map((course) => <Link key={course.slug} to={`/interview-prep/${course.slug}/`}>{course.name}</Link>)}</div>)}</div></li>
  </>
}

export function FsLearningNavigation({ onNavigate }: { onNavigate?: () => void }) {
  return <>
    <details className="learn-fs-menu"><summary>Courses</summary><div className="learn-fs-menu-panel"><Link to="/courses/" onClick={onNavigate}>All courses</Link>{COURSE_CATEGORIES.map((category) => <section key={category.name}><h3>{category.name}</h3>{category.courses.map((course) => <Link key={course.slug} to={`/courses/${course.slug}/`} onClick={onNavigate}>{course.name}</Link>)}</section>)}</div></details>
    <Link to="/interview-prep/" onClick={onNavigate}>Interview Prep</Link>
  </>
}
