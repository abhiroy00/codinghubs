import { useState, type FormEvent } from 'react'
import { api } from '../lib/api'
import { COURSE_OPTIONS, EDUCATION_OPTIONS, WHATSAPP } from '../pages/free-session/data'
import { FsIcon } from '../pages/free-session/icons'
import { normalizePhone } from '../pages/free-session/RegisterForm'

/**
 * Counselling / course-details request, styled like the home page's "Reserve your free seat" form.
 * Posts to the existing /api/leads/ endpoint (the one the Talk-to-an-expert modal uses). The lead model has no
 * email or education fields, so we only ask for what it can store; extra details travel in the course note.
 */
export function EnquiryForm({ locality, sourcePage }: { locality: string; sourcePage: string }) {
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [course, setCourse] = useState('')
  const [education, setEducation] = useState('')
  const [waConsent, setWaConsent] = useState(false)
  const [company, setCompany] = useState('') // honeypot
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [status, setStatus] = useState<{ msg: string; type: 'error' | '' }>({ msg: '', type: '' })
  const [submitting, setSubmitting] = useState(false)
  const [done, setDone] = useState<{ firstName: string; course: string } | null>(null)

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setStatus({ msg: '', type: '' })
    const next: Record<string, string> = {}
    if (!/^[\p{L}][\p{L} .'-]{1,79}$/u.test(name.trim()) || name.replace(/[^\p{L}]/gu, '').length < 2) next.name = 'Please enter your full name (letters only).'
    const normalized = normalizePhone(phone)
    if (!normalized) next.phone = 'Enter a valid 10-digit Indian mobile number (starting with 6, 7, 8 or 9).'
    if (!course) next.course = "Please select the course you're interested in."
    setErrors(next)
    if (Object.keys(next).length) {
      setStatus({ msg: 'Please correct the highlighted fields.', type: 'error' })
      return
    }
    const firstName = name.trim().split(' ')[0]
    if (company) {
      setDone({ firstName, course })
      return
    }
    const note = [course, education, waConsent ? 'WhatsApp OK' : '', `from ${locality}`].filter(Boolean).join(' | ').slice(0, 120)
    setSubmitting(true)
    try {
      await api.post('/leads/', {
        name: name.trim().replace(/\s+/g, ' '),
        phone: `+91${normalized}`,
        course: note,
        mode: 'expert',
        source_page: sourcePage,
      })
      setDone({ firstName, course })
    } catch {
      setStatus({ msg: 'Something went wrong and your request was not sent. Please try again, or call us on the number shown on this page.', type: 'error' })
    } finally {
      setSubmitting(false)
    }
  }

  if (done) {
    const waText = `Hi! I just requested course details for "${done.course}" from ${locality}. My name is ${done.firstName}.`
    return (
      <div className="thanks" tabIndex={-1} role="status">
        <div className="thanks-ico" aria-hidden="true">
          <FsIcon id="i-check" />
        </div>
        <h2>Request received!</h2>
        <p className="thanks-sub">
          {done.firstName ? `Thank you, ${done.firstName}. ` : ''}A Coding Hubs counsellor will contact you on the number you shared.
        </p>
        <div className="thanks-course">
          <span>Course of interest</span>
          <strong>{done.course}</strong>
        </div>
        <a className="btn btn-wa btn-block" href={`https://wa.me/${WHATSAPP.number}?text=${encodeURIComponent(waText)}`} target="_blank" rel="noopener noreferrer">
          <FsIcon id="i-wa" />
          <span>Message us on WhatsApp</span>
        </a>
        <p className="wa-note">Optional — opens WhatsApp with a pre-filled message.</p>
      </div>
    )
  }

  return (
    <div id="formWrap">
      <div className="form-head">
        <h2 id="form-title">Request course details</h2>
        <p>Tell us your goal and a counsellor will share the current syllabus, format and schedule.</p>
        <ul className="form-meta" aria-label="Enquiry summary">
          <li>
            <FsIcon id="i-pin" />
            {locality}
          </li>
          <li>
            <FsIcon id="i-phone" />Call-back
          </li>
          <li>
            <FsIcon id="i-ticket" />Free to enquire
          </li>
        </ul>
      </div>
      <form id="leadForm" noValidate aria-labelledby="form-title" onSubmit={onSubmit}>
        <div className="field">
          <label htmlFor="f-name">
            Full Name <span className="req" aria-hidden="true">*</span>
          </label>
          <input id="f-name" name="name" type="text" autoComplete="name" maxLength={80} required placeholder="Your full name" value={name} onChange={(e) => setName(e.target.value)} aria-invalid={!!errors.name} aria-describedby="e-name" />
          <p className="err" id="e-name">{errors.name}</p>
        </div>
        <div className="field">
          <label htmlFor="f-phone">
            Mobile Number <span className="req" aria-hidden="true">*</span>
          </label>
          <div className="phone-wrap">
            <span className="cc" aria-hidden="true">+91</span>
            <input
              id="f-phone"
              name="phone"
              type="tel"
              inputMode="numeric"
              autoComplete="tel-national"
              maxLength={14}
              required
              placeholder="10-digit mobile number"
              value={phone}
              onChange={(e) => setPhone(e.target.value.replace(/[^\d+\s-]/g, ''))}
              aria-invalid={!!errors.phone}
              aria-describedby="e-phone"
            />
          </div>
          <p className="err" id="e-phone">{errors.phone}</p>
        </div>
        <div className="field">
          <label htmlFor="f-course">
            Select Your Interested Course <span className="req" aria-hidden="true">*</span>
          </label>
          <select id="f-course" name="course" required value={course} onChange={(e) => setCourse(e.target.value)} aria-invalid={!!errors.course} aria-describedby="e-course">
            <option value="">Choose a course</option>
            <option>Not sure yet — help me choose</option>
            {COURSE_OPTIONS.map((g) => (
              <optgroup label={g.group} key={g.group}>
                {g.items.map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </optgroup>
            ))}
          </select>
          <p className="err" id="e-course">{errors.course}</p>
        </div>
        <div className="field">
          <label htmlFor="f-edu">
            Current Education or Qualification <span className="opt">(optional)</span>
          </label>
          <select id="f-edu" name="education" value={education} onChange={(e) => setEducation(e.target.value)}>
            <option value="">Select (optional)</option>
            {EDUCATION_OPTIONS.map((o) => (
              <option key={o}>{o}</option>
            ))}
          </select>
        </div>
        <label className="check">
          <input type="checkbox" name="whatsapp_consent" checked={waConsent} onChange={(e) => setWaConsent(e.target.checked)} />
          <span>
            You may contact me on WhatsApp <span className="opt">(optional)</span>
          </span>
        </label>
        <div className="hp" aria-hidden="true">
          <label htmlFor="f-company">Company</label>
          <input id="f-company" name="company" type="text" tabIndex={-1} autoComplete="off" value={company} onChange={(e) => setCompany(e.target.value)} />
        </div>
        <button type="submit" className="btn btn-yellow btn-block btn-lg" id="submitBtn" disabled={submitting} aria-busy={submitting}>
          <span className="btn-label">{submitting ? 'Sending…' : 'Request Course Details'}</span>
          <FsIcon id="i-arrow" />
        </button>
        <p className={`form-status${status.type ? ' is-' + status.type : ''}`} role="alert" aria-live="assertive">
          {status.msg}
        </p>
        <p className="privacy">
          <span>
            <FsIcon id="i-lock" />No payment needed
          </span>
          <a href="/policies#privacy">Privacy Policy</a>
        </p>
      </form>
    </div>
  )
}
