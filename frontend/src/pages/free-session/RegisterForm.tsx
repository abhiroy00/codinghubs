import { useEffect, useState, type FormEvent } from 'react'
import { api } from '../../lib/api'
import { COURSE_OPTIONS, EDUCATION_OPTIONS, WHATSAPP } from './data'
import { FsIcon } from './icons'

export function normalizePhone(v: string): string | null {
  let d = String(v).replace(/[\s\-().]/g, '')
  if (/[^\d+]/.test(d)) return null
  d = d.replace(/^\+?91(?=\d{10}$)/, '').replace(/^0(?=\d{10}$)/, '')
  return /^[6-9]\d{9}$/.test(d) ? d : null
}

const validators = {
  name: (v: string) => /^[\p{L}][\p{L} .'-]{1,79}$/u.test(v.trim()) && v.trim().replace(/[^\p{L}]/gu, '').length >= 2,
  phone: (v: string) => !!normalizePhone(v),
  email: (v: string) => /^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i.test(v.trim()) && v.trim().length <= 120,
  course: (v: string) => !!v,
}
const messages = {
  name: 'Please enter your full name (letters only).',
  phone: 'Enter a valid 10-digit Indian mobile number (starting with 6, 7, 8 or 9).',
  email: 'Enter a valid email address, e.g. name@example.com.',
  course: "Please select the course you're interested in.",
}

interface RegisterFormProps {
  onThanksChange?: (shown: boolean) => void
  prefillCourse?: string | null
  prefillToken?: number
}

export function RegisterForm({ onThanksChange, prefillCourse, prefillToken }: RegisterFormProps = {}) {
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [course, setCourse] = useState('')
  const [education, setEducation] = useState('')
  const [waConsent, setWaConsent] = useState(false)
  const [company, setCompany] = useState('') // honeypot
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [status, setStatus] = useState<{ msg: string; type: 'error' | 'info' | '' }>({ msg: '', type: '' })
  const [submitting, setSubmitting] = useState(false)
  const [thanks, setThanks] = useState<{ firstName: string; course: string } | null>(null)

  useEffect(() => {
    onThanksChange?.(!!thanks)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [thanks])

  useEffect(() => {
    if (prefillCourse) {
      setCourse(prefillCourse)
      setErrors((e) => ({ ...e, course: '' }))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [prefillToken])

  function validateAll() {
    const values = { name, phone, email, course }
    const next: Record<string, string> = {}
    ;(Object.keys(validators) as (keyof typeof validators)[]).forEach((key) => {
      if (!validators[key](values[key])) next[key] = messages[key]
    })
    setErrors(next)
    return next
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setStatus({ msg: '', type: '' })
    const fieldErrors = validateAll()
    if (Object.keys(fieldErrors).length > 0) {
      setStatus({ msg: 'Please correct the highlighted fields.', type: 'error' })
      return
    }

    if (company) {
      // honeypot tripped — silently "succeed" without actually submitting
      setThanks({ firstName: '', course })
      return
    }

    const normalized = normalizePhone(phone)!
    const dupKey = `lp_reg_${normalized}_${course}`
    const prevRaw = localStorage.getItem(dupKey)
    const prev = prevRaw ? (JSON.parse(prevRaw) as { ts: number }) : null
    if (prev && Date.now() - prev.ts < 24 * 36e5) {
      setStatus({ msg: `You've already registered for ${course} with this mobile number. We'll contact you with the session details — no need to register again.`, type: 'info' })
      return
    }

    setSubmitting(true)
    try {
      await api.post('/leads/', {
        name: name.trim().replace(/\s+/g, ' '),
        phone: '+91' + normalized,
        course,
        mode: 'demo',
        source_page: '/free-session',
      })
      localStorage.setItem(dupKey, JSON.stringify({ ts: Date.now() }))
      setThanks({ firstName: name.trim().split(' ')[0], course })
    } catch {
      setStatus({ msg: 'Something went wrong and your registration was not submitted. Please try again.', type: 'error' })
    } finally {
      setSubmitting(false)
    }
  }

  function registerAgain() {
    setThanks(null)
    setName('')
    setPhone('')
    setEmail('')
    setCourse('')
    setEducation('')
    setWaConsent(false)
    setErrors({})
    setStatus({ msg: '', type: '' })
  }

  if (thanks) {
    const waText = WHATSAPP.message.replace('{course}', thanks.course).replace('{name}', thanks.firstName)
    return (
      <div className="thanks" id="thanks" tabIndex={-1}>
        <div className="thanks-ico" aria-hidden="true">
          <FsIcon id="i-check" />
        </div>
        <h2 id="thanks-title">You're registered!</h2>
        <p className="thanks-sub">
          {thanks.firstName ? `Thank you, ${thanks.firstName}. We've received your registration for the free live session.` : "We've received your registration for the free live session."}
        </p>
        <div className="thanks-course">
          <span>Selected course</span>
          <strong>{thanks.course}</strong>
        </div>
        <h3>What happens next?</h3>
        <ol className="next">
          <li>We'll share the confirmed session date, time and joining link on the mobile number / email you provided.</li>
          <li>Keep a laptop or phone with a stable internet connection ready for the live session.</li>
          <li>Note down your questions — you can ask the trainer during the Q&amp;A.</li>
        </ol>
        <a className="btn btn-wa btn-block" href={`https://wa.me/${WHATSAPP.number}?text=${encodeURIComponent(waText)}`} target="_blank" rel="noopener noreferrer">
          <FsIcon id="i-wa" />
          <span>Message us on WhatsApp</span>
        </a>
        <p className="wa-note">Optional — opens WhatsApp with a pre-filled message. Only send it if you'd like to chat with us there.</p>
        <button type="button" className="link-btn" id="againBtn" onClick={registerAgain}>
          Register for another course
        </button>
      </div>
    )
  }

  return (
    <div id="formWrap">
      <div className="form-head">
        <h2 id="form-title">Reserve your free seat</h2>
        <p>Fill in your details to register for the free live online session.</p>
        <ul className="form-meta" aria-label="Session summary">
          <li>
            <FsIcon id="i-clock" />2 Hours
          </li>
          <li>
            <FsIcon id="i-monitor" />Live Online
          </li>
          <li>
            <FsIcon id="i-ticket" />Free
          </li>
        </ul>
      </div>
      <form id="leadForm" noValidate aria-labelledby="form-title" onSubmit={handleSubmit}>
        <div className="field">
          <label htmlFor="f-name">
            Full Name <span className="req" aria-hidden="true">*</span>
          </label>
          <input
            id="f-name"
            name="name"
            type="text"
            autoComplete="name"
            maxLength={80}
            required
            aria-describedby="e-name"
            placeholder="Your full name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            aria-invalid={!!errors.name}
          />
          <p className="err" id="e-name">
            {errors.name}
          </p>
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
              aria-describedby="e-phone"
              placeholder="10-digit mobile number"
              value={phone}
              onChange={(e) => setPhone(e.target.value.replace(/[^\d+\s-]/g, ''))}
              aria-invalid={!!errors.phone}
            />
          </div>
          <p className="err" id="e-phone">
            {errors.phone}
          </p>
        </div>
        <div className="field">
          <label htmlFor="f-email">
            Email Address <span className="req" aria-hidden="true">*</span>
          </label>
          <input
            id="f-email"
            name="email"
            type="email"
            autoComplete="email"
            maxLength={120}
            required
            aria-describedby="e-email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            aria-invalid={!!errors.email}
          />
          <p className="err" id="e-email">
            {errors.email}
          </p>
        </div>
        <div className="field">
          <label htmlFor="f-course">
            Select Your Interested Course <span className="req" aria-hidden="true">*</span>
          </label>
          <select id="f-course" name="course" required aria-describedby="e-course" value={course} onChange={(e) => setCourse(e.target.value)} aria-invalid={!!errors.course}>
            <option value="">Choose a course</option>
            {COURSE_OPTIONS.map((g) => (
              <optgroup label={g.group} key={g.group}>
                {g.items.map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </optgroup>
            ))}
          </select>
          <p className="err" id="e-course">
            {errors.course}
          </p>
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
          <input type="checkbox" name="whatsapp_consent" id="f-wa" checked={waConsent} onChange={(e) => setWaConsent(e.target.checked)} />
          <span>
            Send me session updates on WhatsApp <span className="opt">(optional)</span>
          </span>
        </label>
        <div className="hp" aria-hidden="true">
          <label htmlFor="f-company">Company</label>
          <input id="f-company" name="company" type="text" tabIndex={-1} autoComplete="off" value={company} onChange={(e) => setCompany(e.target.value)} />
        </div>

        <button type="submit" className="btn btn-yellow btn-block btn-lg" id="submitBtn" disabled={submitting} aria-busy={submitting}>
          <span className="btn-label">{submitting ? 'Submitting…' : 'Reserve My Free Seat'}</span>
          <FsIcon id="i-arrow" />
          {submitting && <span className="spinner" aria-hidden="true"></span>}
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
