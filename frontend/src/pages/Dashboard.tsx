import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../lib/api'
import { useAuth } from '../lib/auth-context'
import { useCourses } from '../lib/useCourses'
import type { Enrollment } from '../lib/types'

export function Dashboard() {
  const { user } = useAuth()
  const { courses } = useCourses()
  const [enrollments, setEnrollments] = useState<Enrollment[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true
    api
      .get('/enrollments/me/')
      .then(({ data }) => active && setEnrollments(Array.isArray(data) ? data : data.results))
      .finally(() => active && setLoading(false))
    return () => {
      active = false
    }
  }, [])

  const enrolledCourseIds = new Set(enrollments.map((e) => e.course))
  const availableCourses = courses.filter((c) => !enrolledCourseIds.has(c.id))

  return (
    <section className="section" aria-labelledby="dashboard-heading">
      <div className="container-x">
        <p className="eyebrow rv">Dashboard</p>
        <h1 id="dashboard-heading" className="display-lg mt-4">
          Hi, {user?.username}.
        </h1>

        <h2 className="display-md mt-14" style={{ fontSize: '1.5rem' }}>
          My enrollments
        </h2>
        {loading ? (
          <p style={{ color: 'var(--color-muted)', marginTop: '1rem' }}>Loading…</p>
        ) : enrollments.length === 0 ? (
          <p style={{ color: 'var(--color-muted)', marginTop: '1rem' }}>You haven't enrolled in a course yet.</p>
        ) : (
          <ul className="stat-grid mt-8">
            {enrollments.map((e) => (
              <li key={e.id}>
                <p className="stat-k">{e.course_name}</p>
                <p className="stat-d">
                  {e.payment_status === 'paid' ? 'Paid' : e.payment_status}
                  {e.amount_paid ? ` · ₹${(e.amount_paid / 100).toLocaleString('en-IN')}` : ''} · Enrolled{' '}
                  {new Date(e.enrolled_at).toLocaleDateString('en-IN')}
                </p>
              </li>
            ))}
          </ul>
        )}

        <h2 className="display-md mt-14" style={{ fontSize: '1.5rem' }}>
          Browse more programs
        </h2>
        <ul className="stat-grid mt-8">
          {availableCourses.map((c) => (
            <li key={c.id}>
              <p className="stat-k">{c.name}</p>
              <p className="stat-d">
                {c.duration_display} · {c.placement_rate}% placement
              </p>
              <Link to={`/courses/${c.slug}`} className="stat-link">
                Enroll for ₹{c.price.toLocaleString('en-IN')} →
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}
