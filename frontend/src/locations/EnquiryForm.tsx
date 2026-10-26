import { useState, type FormEvent } from 'react'
import { api } from '../lib/api'
import { COURSE_OPTIONS } from '../pages/free-session/data'
import { normalizePhone } from '../pages/free-session/RegisterForm'

/** Counselling / course-details request. Posts to the existing /api/leads/ endpoint (same one the Talk-to-an-expert modal uses). */
export function EnquiryForm({ locality, sourcePage }: { locality: string; sourcePage: string }) {
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [course, setCourse] = useState('')
  const [company, setCompany] = useState('') // honeypot
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [status, setStatus] = useState<'idle' | 'sending' | 'done' | 'error'>('idle')

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    const next: Record<string, string> = {}
    if (name.trim().replace(/[^\p{L}]/gu, '').length < 2) next.name = 'Please enter your name.'
    const normalized = normalizePhone(phone)
    if (!normalized) next.phone = 'Enter a valid 10-digit Indian mobile number.'
    setErrors(next)
    if (Object.keys(next).length) return
    if (company) {
      setStatus('done')
      return
    }
    setStatus('sending')
    try {
      await api.post('/leads/', {
        name: name.trim().replace(/\s+/g, ' '),
        phone: `+91${normalized}`,
        course: course ? `${course} (from ${locality})` : `AI course enquiry (from ${locality})`,
        mode: 'expert',
        source_page: sourcePage,
      })
      setStatus('done')
    } catch {
      setStatus('error')
    }
  }

  if (status === 'done') {
    return (
      <div className="loc-form-done" role="status">
        <h3>Thank you — we have your request.</h3>
        <p>The Coding Hubs team will contact you on the number you shared to discuss your goals and the current course details.</p>
      </div>
    )
  }

  return (
    <form className="loc-form" onSubmit={onSubmit} noValidate>
      <div className="loc-field">
        <label htmlFor="enq-name">Your name</label>
        <input id="enq-name" name="name" autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} aria-invalid={!!errors.name} aria-describedby={errors.name ? 'enq-name-err' : undefined} />
        {errors.name && <p className="loc-err" id="enq-name-err">{errors.name}</p>}
      </div>
      <div className="loc-field">
        <label htmlFor="enq-phone">Mobile number</label>
        <input id="enq-phone" name="phone" type="tel" inputMode="tel" autoComplete="tel" value={phone} onChange={(e) => setPhone(e.target.value)} aria-invalid={!!errors.phone} aria-describedby={errors.phone ? 'enq-phone-err' : undefined} />
        {errors.phone && <p className="loc-err" id="enq-phone-err">{errors.phone}</p>}
      </div>
      <div className="loc-field">
        <label htmlFor="enq-course">Course of interest (optional)</label>
        <select id="enq-course" name="course" value={course} onChange={(e) => setCourse(e.target.value)}>
          <option value="">Not sure yet</option>
          {COURSE_OPTIONS.map((g) => (
            <optgroup key={g.group} label={g.group}>
              {g.items.map((i) => (
                <option key={i} value={i}>{i}</option>
              ))}
            </optgroup>
          ))}
        </select>
      </div>
      <div className="loc-field">
        <label htmlFor="enq-loc">Your locality</label>
        <input id="enq-loc" value={locality} readOnly />
      </div>
      <input type="text" name="company" value={company} onChange={(e) => setCompany(e.target.value)} tabIndex={-1} autoComplete="off" aria-hidden="true" style={{ position: 'absolute', left: '-9999px' }} />
      <button type="submit" className="btn btn-yellow btn-block btn-lg" disabled={status === 'sending'} aria-busy={status === 'sending'}>
        {status === 'sending' ? 'Sending…' : 'Request Course Details'}
      </button>
      {status === 'error' && (
        <p className="loc-err" role="alert">
          We could not send your request. Please try again, or call the number shown on this page.
        </p>
      )}
      <p className="loc-form-note">
        By submitting you agree to be contacted about Coding Hubs courses. See our <a href="/policies#privacy">Privacy Policy</a>.
      </p>
    </form>
  )
}
