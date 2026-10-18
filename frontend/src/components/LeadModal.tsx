import { useEffect, useRef, useState, type FormEvent } from 'react'
import { api } from '../lib/api'
import { WA } from '../lib/icons'
import { useLenisRef } from '../lib/lenis-context'
import { useModal } from '../lib/modal-context'

const COURSE_OPTIONS = [
  'Not sure yet',
  'AI Engineering Diploma',
  'Generative AI',
  'Agentic AI',
  'Data Science',
  'Data Analytics',
  'AI-Integrated Full Stack',
  'MERN Stack',
  'Python Full Stack',
  'AWS / Azure Cloud',
  'Cyber Security',
]

export function LeadModal() {
  const { state, closeModal } = useModal()
  const lenisRef = useLenisRef()
  const nameRef = useRef<HTMLInputElement>(null)

  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [course, setCourse] = useState('Not sure yet')
  const [submitted, setSubmitted] = useState(false)
  const [sending, setSending] = useState(false)

  const demo = state.mode === 'demo'

  useEffect(() => {
    if (!state.open) return
    setSubmitted(false)
    setCourse(state.course && COURSE_OPTIONS.includes(state.course) ? state.course : state.course || 'Not sure yet')
    document.body.style.overflow = 'hidden'
    lenisRef.current?.stop()
    const t = setTimeout(() => nameRef.current?.focus(), 200)
    return () => clearTimeout(t)
  }, [state.open, state.course, lenisRef])

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') close()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function close() {
    closeModal()
    document.body.style.overflow = ''
    lenisRef.current?.start()
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setSending(true)
    const eyebrow = demo ? 'Free demo class' : 'Talk to an expert'
    try {
      await api.post('/leads/', {
        name,
        phone,
        course: course === 'Not sure yet' ? '' : course,
        mode: demo ? 'demo' : 'expert',
        source_page: location.pathname,
      })
    } catch {
      // backend lead storage is best-effort; the WhatsApp handoff below is the real conversion path
    } finally {
      setSending(false)
    }
    const msg = `Hi Coding Hubs! I'm ${name} (${phone}). Interested in: ${course}. (${eyebrow})`
    window.open('https://wa.me/' + WA + '?text=' + encodeURIComponent(msg), '_blank', 'noopener')
    setSubmitted(true)
    setName('')
    setPhone('')
    setCourse('Not sure yet')
  }

  if (!state.open) return null

  return (
    <div
      id="modal"
      className="open"
      role="dialog"
      aria-modal="true"
      aria-labelledby="mTitle"
      data-modal
      onClick={(e) => {
        if (e.target === e.currentTarget) close()
      }}
    >
      <div className="box">
        <button type="button" className="x" aria-label="Close" onClick={close}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
            <path d="M6 6l12 12M18 6 6 18" />
          </svg>
        </button>
        {!submitted ? (
          <form onSubmit={handleSubmit}>
            <p className="eyebrow">{demo ? 'Free demo class' : 'Talk to an expert'}</p>
            <h3 id="mTitle" className="display-md" style={{ fontSize: '1.75rem', marginTop: '.5rem' }}>
              {demo ? 'Book your free demo.' : 'Get a call back.'}
            </h3>
            <p style={{ marginTop: '.5rem', fontSize: '.9375rem', color: 'var(--color-muted)' }}>
              {demo ? 'Experience a live session — completely free, no commitment.' : 'Leave your number. We will call you back.'}
            </p>
            <div className="field">
              <label htmlFor="fName">Full name</label>
              <input
                id="fName"
                ref={nameRef}
                required
                autoComplete="name"
                placeholder="Your name"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <div className="field">
              <label htmlFor="fPhone">Phone / WhatsApp</label>
              <input
                id="fPhone"
                required
                type="tel"
                inputMode="tel"
                pattern="[0-9+\s-]{10,15}"
                autoComplete="tel"
                placeholder="+91"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
            </div>
            <div className="field">
              <label htmlFor="fCourse">Interested in</label>
              <select id="fCourse" value={course} onChange={(e) => setCourse(e.target.value)}>
                {COURSE_OPTIONS.includes(course) ? null : <option value={course}>{course}</option>}
                {COURSE_OPTIONS.map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </select>
            </div>
            <button type="submit" className="btn btn-lime" style={{ width: '100%', marginTop: '1.5rem' }} disabled={sending}>
              <span className="shine"></span>
              <span>{demo ? 'Book my free demo' : 'Call me back'}</span>
            </button>
            <p className="form-note">🔒 Your details are safe with us. No spam, ever.</p>
          </form>
        ) : (
          <div className="form-ok show">
            <div
              style={{
                width: 56,
                height: 56,
                margin: '0 auto',
                borderRadius: '50%',
                background: 'var(--color-lime)',
                display: 'grid',
                placeItems: 'center',
              }}
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#111218" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 6 9 17l-5-5" />
              </svg>
            </div>
            <h3 className="display-md" style={{ fontSize: '1.5rem', marginTop: '1rem' }}>
              Thank you!
            </h3>
            <p style={{ marginTop: '.5rem', color: 'var(--color-muted)' }}>Our counsellor will call you within 30 minutes.</p>
          </div>
        )}
      </div>
    </div>
  )
}
