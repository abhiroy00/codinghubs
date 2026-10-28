import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react'
import { api } from '../lib/api'
import './book-tutor.css'

interface Tutor {
  id: number
  full_name: string
  profile_image: string
  designation: string
  bio: string
  experience: string
  expertise: string[]
  courses: string[]
  teaching_approach: string
}

interface BookingResponse {
  id: number
  reference: string
}

const today = () => {
  const date = new Date()
  const localDate = new Date(date.getTime() - date.getTimezoneOffset() * 60_000)
  return localDate.toISOString().slice(0, 10)
}

function bookingError(error: unknown) {
  const response = (error as { response?: { status?: number; data?: unknown } }).response
  if (response?.status === 429) return 'Too many booking attempts. Please wait a minute and try again.'
  if (response?.data && typeof response.data === 'object') {
    const errors = response.data as Record<string, unknown>
    if (typeof errors.detail === 'string') return errors.detail
    for (const value of Object.values(errors)) {
      if (typeof value === 'string') return value
      if (Array.isArray(value) && typeof value[0] === 'string') return value[0]
    }
  }
  return 'We could not submit your booking. Please review the form and try again.'
}

export function BookTutor() {
  const [tutors, setTutors] = useState<Tutor[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [profile, setProfile] = useState<Tutor | null>(null)
  const [bookingTutor, setBookingTutor] = useState<Tutor | null | undefined>(undefined)
  const [booking, setBooking] = useState<BookingResponse | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState('')
  const submissionKey = useRef(crypto.randomUUID())
  const courseOptions = useMemo(() => [...new Set(tutors.flatMap((tutor) => tutor.courses))].sort(), [tutors])

  useEffect(() => {
    document.title = 'Book a Tutor | Coding Hubs School of AI'
    api.get<Tutor[]>('/tutors/')
      .then(({ data }) => setTutors(data))
      .catch(() => setLoadError('Tutor profiles could not be loaded. Please try again later.'))
      .finally(() => setLoading(false))
    return () => {
      document.title = 'Coding Hubs School of AI'
    }
  }, [])

  useEffect(() => {
    const isDialogOpen = Boolean(profile) || bookingTutor !== undefined
    if (!isDialogOpen) return
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setProfile(null)
        closeBooking()
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => {
      document.body.style.overflow = previousOverflow
      window.removeEventListener('keydown', onKeyDown)
    }
  }, [profile, bookingTutor])

  function closeBooking() {
    setBookingTutor(undefined)
    setBooking(null)
    setSubmitError('')
  }

  async function submitBooking(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (submitting) return
    const form = event.currentTarget
    const values = new FormData(form)
    setSubmitting(true)
    setSubmitError('')
    try {
      const { data } = await api.post<BookingResponse>('/tutors/bookings/', {
        student_name: values.get('student_name'),
        student_email: values.get('student_email'),
        tutor: Number(values.get('tutor')),
        course: values.get('course'),
        preferred_date: values.get('preferred_date'),
        preferred_time: values.get('preferred_time'),
        session_type: 'online',
        message: values.get('message'),
        submission_key: submissionKey.current,
      })
      setBooking(data)
      submissionKey.current = crypto.randomUUID()
      form.reset()
    } catch (error) {
      setSubmitError(bookingError(error))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="tutors-page">
      <section className="tutors-hero">
        <div className="container-x tutors-hero-inner">
          <p className="eyebrow">PERSONALIZED LEARNING</p>
          <h1 className="display-lg">Learn directly from a <span>tutor</span></h1>
          <p className="lede">Get focused, one-to-one guidance in AI, data and software development. Choose a tutor and request a session that fits your schedule.</p>
          <button type="button" className="btn btn-ink" onClick={() => { setBooking(null); setBookingTutor(null) }} disabled={!tutors.length}>
            Find a tutor
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M5 12h14m-6-6 6 6-6 6" /></svg>
          </button>
        </div>
      </section>

      <section className="section tutors-section" aria-labelledby="tutors-heading">
        <div className="container-x">
          <div className="tutors-section-heading">
            <div>
              <p className="eyebrow">MEET YOUR TUTOR</p>
              <h2 className="display-md" id="tutors-heading">Practical help, from people who teach</h2>
            </div>
            <p className="muted">Book an online session for the topic you want to master.</p>
          </div>

          {loading && <p className="tutors-state" role="status">Loading tutor profiles…</p>}
          {loadError && <p className="tutors-state tutors-error" role="alert">{loadError}</p>}
          {!loading && !loadError && tutors.length === 0 && (
            <div className="tutors-empty">
              <div aria-hidden="true">✦</div>
              <h3>Tutor profiles are being added</h3>
              <p>Please check back soon. Once profiles are available, you can choose a tutor and request a session here.</p>
            </div>
          )}
          {tutors.length > 0 && (
            <div className="tutor-grid">
              {tutors.map((tutor) => (
                <article className="tutor-card" key={tutor.id}>
                  <TutorPortrait tutor={tutor} />
                  <div className="tutor-card-body">
                    <p className="tutor-designation">{tutor.designation}</p>
                    <h3>{tutor.full_name}</h3>
                    <p className="tutor-bio">{tutor.bio}</p>
                    {tutor.expertise.length > 0 && (
                      <ul className="tutor-tags" aria-label="Areas of expertise">
                        {tutor.expertise.slice(0, 4).map((skill) => <li key={skill}>{skill}</li>)}
                      </ul>
                    )}
                    {tutor.experience && <p className="tutor-experience">{tutor.experience} experience</p>}
                    <div className="tutor-actions">
                      <button type="button" className="btn btn-ghost" onClick={() => setProfile(tutor)}>View profile</button>
                      <button type="button" className="btn btn-lime" onClick={() => { setBooking(null); setBookingTutor(tutor) }}>Book a tutor</button>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>
      </section>

      {profile && (
        <div className="tutor-dialog-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && setProfile(null)}>
          <section className="tutor-dialog tutor-profile-dialog" role="dialog" aria-modal="true" aria-labelledby="profile-title">
            <button type="button" className="tutor-dialog-close" onClick={() => setProfile(null)} aria-label="Close profile">×</button>
            <TutorPortrait tutor={profile} large />
            <p className="tutor-designation">{profile.designation}</p>
            <h2 id="profile-title">{profile.full_name}</h2>
            {profile.experience && <p className="tutor-experience">{profile.experience} experience</p>}
            <p>{profile.bio}</p>
            {profile.expertise.length > 0 && <p><strong>Expertise:</strong> {profile.expertise.join(', ')}</p>}
            {profile.courses.length > 0 && <p><strong>Courses:</strong> {profile.courses.join(', ')}</p>}
            {profile.teaching_approach && <p><strong>Teaching approach:</strong> {profile.teaching_approach}</p>}
            <p><strong>Session type:</strong> Online</p>
            <button type="button" className="btn btn-ink" onClick={() => { setProfile(null); setBooking(null); setBookingTutor(profile) }}>Book this tutor</button>
          </section>
        </div>
      )}

      {bookingTutor !== undefined && (
        <div className="tutor-dialog-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && closeBooking()}>
          <section className="tutor-dialog tutor-booking-dialog" role="dialog" aria-modal="true" aria-labelledby="booking-title">
            <button type="button" className="tutor-dialog-close" onClick={closeBooking} aria-label="Close booking form">×</button>
            {booking ? (
              <div className="booking-success" role="status">
                <div className="booking-success-icon" aria-hidden="true">✓</div>
                <p className="eyebrow">REQUEST RECEIVED</p>
                <h2 id="booking-title">Your tutor booking request has been submitted successfully.</h2>
                <p>Our team will contact you to confirm your session.</p>
                <p className="booking-reference">Booking reference <strong>{booking.reference}</strong></p>
                <button type="button" className="btn btn-ink" onClick={closeBooking}>Done</button>
              </div>
            ) : (
              <>
                <p className="eyebrow">REQUEST A SESSION</p>
                <h2 id="booking-title">Book a tutor</h2>
                <p className="muted">Share your preferred time and our team will contact you to confirm.</p>
                <form className="tutor-booking-form" onSubmit={submitBooking}>
                  <label>Full name<input name="student_name" autoComplete="name" maxLength={160} required /></label>
                  <label>Email address<input name="student_email" type="email" autoComplete="email" maxLength={254} required /></label>
                  <label>Tutor
                    <select name="tutor" defaultValue={bookingTutor?.id ?? ''} required>
                      <option value="" disabled>Select a tutor</option>
                      {tutors.map((tutor) => <option key={tutor.id} value={tutor.id}>{tutor.full_name} — {tutor.designation}</option>)}
                    </select>
                  </label>
                  <label>Course or technology
                    <input name="course" list="tutor-course-options" maxLength={120} placeholder="e.g. Python, Data Science, Generative AI" required />
                    <datalist id="tutor-course-options">{courseOptions.map((course) => <option key={course} value={course} />)}</datalist>
                  </label>
                  <label>Preferred date<input name="preferred_date" type="date" min={today()} required /></label>
                  <label>Preferred time<input name="preferred_time" type="time" required /></label>
                  <label>Session type<input value="Online" readOnly aria-readonly="true" /></label>
                  <label className="tutor-message-field">Additional message <span>(optional)</span><textarea name="message" rows={3} maxLength={2000} placeholder="Tell us what you would like to work on." /></label>
                  {submitError && <p className="tutors-error" role="alert">{submitError}</p>}
                  <button type="submit" className="btn btn-ink tutor-submit" disabled={submitting}>
                    {submitting ? 'Submitting…' : 'Submit booking request'}
                  </button>
                </form>
              </>
            )}
          </section>
        </div>
      )}
    </div>
  )
}

function TutorPortrait({ tutor, large = false }: { tutor: Tutor; large?: boolean }) {
  const [imageError, setImageError] = useState(false)
  return tutor.profile_image && !imageError ? (
    <img className={`tutor-portrait${large ? ' large' : ''}`} src={tutor.profile_image} alt={tutor.full_name} loading="lazy" onError={() => setImageError(true)} />
  ) : (
    <div className={`tutor-portrait tutor-portrait-placeholder${large ? ' large' : ''}`} aria-label={`${tutor.full_name} profile placeholder`}>
      <span>{tutor.full_name.split(/\s+/).slice(0, 2).map((part) => part[0]).join('').toUpperCase()}</span>
    </div>
  )
}
