import { useEffect, useMemo, useState } from 'react'
import { adminApi, type Paged } from './api'

interface TutorBooking {
  id: number
  reference: string
  student_name: string
  student_email: string
  tutor_name: string
  course: string
  preferred_date: string
  preferred_time: string
  session_type: string
  message: string
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled'
  created_at: string
}

const STATUSES: TutorBooking['status'][] = ['pending', 'confirmed', 'completed', 'cancelled']
const formatDate = (value: string) => new Intl.DateTimeFormat('en-IN', { dateStyle: 'medium' }).format(new Date(`${value}T00:00:00`))
const formatCreated = (value: string) => new Intl.DateTimeFormat('en-IN', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value))

export function TutorBookingsPage() {
  const [query, setQuery] = useState('')
  const [tutor, setTutor] = useState('')
  const [course, setCourse] = useState('')
  const [status, setStatus] = useState('')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [page, setPage] = useState(1)
  const [data, setData] = useState<Paged<TutorBooking> | null>(null)
  const [error, setError] = useState('')
  const [selected, setSelected] = useState<TutorBooking | null>(null)
  const [savingId, setSavingId] = useState<number | null>(null)
  const [debounced, setDebounced] = useState({ query: '', tutor: '', course: '' })

  useEffect(() => {
    const timer = setTimeout(() => setDebounced({ query, tutor, course }), 300)
    return () => clearTimeout(timer)
  }, [query, tutor, course])

  const params = useMemo(() => ({
    q: debounced.query || undefined,
    tutor: debounced.tutor || undefined,
    course: debounced.course || undefined,
    status: status || undefined,
    from: from || undefined,
    to: to || undefined,
    page,
  }), [debounced, status, from, to, page])

  useEffect(() => setPage(1), [debounced, status, from, to])

  useEffect(() => {
    let active = true
    adminApi.get<Paged<TutorBooking>>('/tutor-bookings/', { params })
      .then(({ data: result }) => {
        if (active) {
          setData(result)
          setError('')
        }
      })
      .catch(() => {
        if (active) setError('Could not load tutor bookings. Please refresh.')
      })
    return () => { active = false }
  }, [params])

  async function updateStatus(booking: TutorBooking, next: TutorBooking['status']) {
    setSavingId(booking.id)
    setError('')
    try {
      const { data: updated } = await adminApi.patch<TutorBooking>(`/tutor-bookings/${booking.id}/`, { status: next })
      setData((current) => current && { ...current, results: current.results.map((item) => item.id === booking.id ? updated : item) })
      setSelected((current) => current?.id === booking.id ? updated : current)
    } catch {
      setError(`Could not update booking ${booking.reference}. Please try again.`)
    } finally {
      setSavingId(null)
    }
  }

  const pages = data ? Math.max(1, Math.ceil(data.count / 25)) : 1

  return (
    <>
      <div className="ad-head">
        <h1 className="ad-h1">Tutor Bookings</h1>
      </div>
      <div className="ad-filters">
        <input type="search" placeholder="Search student name or email…" value={query} onChange={(event) => setQuery(event.target.value)} aria-label="Search student name or email" />
        <input type="search" placeholder="Filter by tutor…" value={tutor} onChange={(event) => setTutor(event.target.value)} aria-label="Filter by tutor name" />
        <input type="search" placeholder="Filter by course…" value={course} onChange={(event) => setCourse(event.target.value)} aria-label="Filter by course" />
        <select value={status} onChange={(event) => setStatus(event.target.value)} aria-label="Filter by booking status">
          <option value="">All statuses</option>
          {STATUSES.map((item) => <option key={item} value={item}>{item}</option>)}
        </select>
        <label>From <input type="date" value={from} onChange={(event) => setFrom(event.target.value)} aria-label="Preferred date from" /></label>
        <label>To <input type="date" value={to} onChange={(event) => setTo(event.target.value)} aria-label="Preferred date to" /></label>
      </div>
      {error && <p className="ad-error" role="alert">{error}</p>}
      <div className="ad-tablewrap">
        <table className="ad-table">
          <thead>
            <tr>
              <th>Booking</th><th>Student</th><th>Tutor</th><th>Course</th><th>Preferred session</th><th>Type</th><th>Status</th><th>Created</th><th>Details</th>
            </tr>
          </thead>
          <tbody>
            {data?.results.map((booking) => (
              <tr key={booking.id}>
                <td className="nowrap"><strong>{booking.reference}</strong></td>
                <td><strong>{booking.student_name}</strong><a className="ad-student-email" href={`mailto:${booking.student_email}`}>{booking.student_email}</a></td>
                <td>{booking.tutor_name}</td>
                <td>{booking.course}</td>
                <td className="nowrap">{formatDate(booking.preferred_date)}<small className="ad-muted">{booking.preferred_time}</small></td>
                <td>{booking.session_type}</td>
                <td>
                  <select
                    className={`ad-status st-${booking.status}`}
                    value={booking.status}
                    disabled={savingId === booking.id}
                    onChange={(event) => updateStatus(booking, event.target.value as TutorBooking['status'])}
                    aria-label={`Status for booking ${booking.reference}`}
                  >
                    {STATUSES.map((item) => <option key={item} value={item}>{item}</option>)}
                  </select>
                </td>
                <td className="nowrap">{formatCreated(booking.created_at)}</td>
                <td><button type="button" className="ad-link" onClick={() => setSelected(booking)}>View details</button></td>
              </tr>
            ))}
            {data && data.results.length === 0 && <tr><td colSpan={9} className="ad-muted">No tutor bookings match these filters.</td></tr>}
          </tbody>
        </table>
      </div>
      <div className="ad-pager">
        <span>{data ? `${data.count} booking${data.count === 1 ? '' : 's'}` : 'Loading…'}</span>
        <div>
          <button type="button" className="ad-btn" disabled={page <= 1} onClick={() => setPage((value) => value - 1)}>← Prev</button>
          <span>Page {page} of {pages}</span>
          <button type="button" className="ad-btn" disabled={page >= pages} onClick={() => setPage((value) => value + 1)}>Next →</button>
        </div>
      </div>
      {selected && (
        <div className="ad-modal" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && setSelected(null)}>
          <section className="ad-modal-card ad-booking-detail" role="dialog" aria-modal="true" aria-labelledby="booking-detail-title">
            <button type="button" className="ad-booking-close" onClick={() => setSelected(null)} aria-label="Close booking details">×</button>
            <h2 id="booking-detail-title">Booking {selected.reference}</h2>
            <dl>
              <div><dt>Student</dt><dd>{selected.student_name}</dd></div>
              <div><dt>Email</dt><dd><a href={`mailto:${selected.student_email}`}>{selected.student_email}</a></dd></div>
              <div><dt>Tutor</dt><dd>{selected.tutor_name}</dd></div>
              <div><dt>Course</dt><dd>{selected.course}</dd></div>
              <div><dt>Preferred date and time</dt><dd>{formatDate(selected.preferred_date)} at {selected.preferred_time}</dd></div>
              <div><dt>Session type</dt><dd>{selected.session_type}</dd></div>
              <div><dt>Booking status</dt><dd><span className={`ad-badge st-${selected.status}`}>{selected.status}</span></dd></div>
              <div><dt>Created</dt><dd>{formatCreated(selected.created_at)}</dd></div>
              <div className="ad-booking-message"><dt>Additional message</dt><dd>{selected.message || 'No additional message.'}</dd></div>
            </dl>
          </section>
        </div>
      )}
    </>
  )
}
