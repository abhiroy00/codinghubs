import { ArrowIcon } from '../../lib/icons'
import { useModal } from '../../lib/modal-context'
import { useCourses } from '../../lib/useCourses'
import { Words } from '../Words'

const FEATURED_ORDER = ['AI Engineering Diploma', 'AI-Integrated Full Stack', 'Data Science', 'MERN Stack', 'AWS Solutions Architect', 'Ethical Hacker (C|EH) v13']

export function ComparePrograms() {
  const { courses } = useCourses()
  const { openModal } = useModal()

  const featured = FEATURED_ORDER.map((name) => courses.find((c) => c.name === name)).filter((c): c is NonNullable<typeof c> => Boolean(c))

  return (
    <section className="section" id="compare" aria-labelledby="workplace-heading">
      <div className="container-x">
        <div style={{ maxWidth: '48rem' }}>
          <p className="eyebrow rv">Compare programs</p>
          <h2 id="workplace-heading" className="display-lg mt-4">
            <span className="line-mask">
              <span>Find the right program for you.</span>
            </span>
          </h2>
          <p className="lede rv mt-5" style={{ maxWidth: '42rem' }}>
            Not a guess. Duration, salary potential and placement rate from our recent batches — side by side.
          </p>
        </div>
        <ul className="stat-grid mt-14">
          {featured.map((course) => (
            <li className="rv-up" key={course.slug}>
              <p className="stat-big" style={{ color: 'var(--color-brand)' }}>
                {course.salary_range_display.replace(/\s*LPA$/, '')}
                <small>LPA</small>
              </p>
              <p className="stat-k">{course.name}</p>
              <p className="stat-d">
                {course.duration_display} · <b>{course.placement_rate}% placement</b> · {course.category_name} careers
              </p>
              <button type="button" className="stat-link" onClick={() => openModal(undefined, course.name)}>
                Enquire →
              </button>
            </li>
          ))}
        </ul>
        <p className="mt-10" style={{ fontSize: '.75rem', color: 'var(--color-faint)' }}>
          Average salary ranges and placement rates are based on recent Coding Hubs batches.
        </p>
        <div className="divider-cta">
          <Words as="h3" className="display-md" text="AI isn't coming. It's already here." />
          <div className="rv mt-8">
            <button type="button" className="btn btn-ink" onClick={() => openModal()}>
              <span className="shine"></span>
              <span>I want to learn AI</span>
              <ArrowIcon />
            </button>
          </div>
        </div>
      </div>
    </section>
  )
}
