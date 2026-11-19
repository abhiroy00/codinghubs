import { useEffect, useId, useState, type CSSProperties, type FormEvent } from 'react'
import { AI_TOOLS, logoColors } from '../../data/ai-tools'
import { COURSE_OPTIONS } from './data'
import { AnimatedCard } from '../../components/ui'

/** Small public GET/POST without pulling the HTTP client into the home page bundle. */
const getJson = (path: string) => fetch(`/api${path}`, { headers: { Accept: 'application/json' } }).then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))

/* ------------------------------------------------------------------ moving logo wall */

const WITH_ICON = AI_TOOLS.filter((t) => t.icon)
const ROWS = [WITH_ICON.filter((_, i) => i % 2 === 0), WITH_ICON.filter((_, i) => i % 2 === 1)]

function LogoTile({ name, icon, color }: { name: string; icon: string; color: string }) {
  const { bg, fg } = logoColors(color)
  return (
    <li className="lw-tile">
      <span className="lw-mark" style={{ '--lw-bg': bg, '--lw-fg': fg } as CSSProperties} aria-hidden="true">
        <span style={{ WebkitMaskImage: `url(/assets/ai-tools/${icon}.svg)`, maskImage: `url(/assets/ai-tools/${icon}.svg)` }} />
      </span>
      <span className="lw-name">{name}</span>
    </li>
  )
}

/** Two rows of tool logos drifting in opposite directions (paused for reduced motion). */
export function LogoWall() {
  return (
    <section className="lw" aria-labelledby="lw-title">
      <div className="lw-glow" aria-hidden="true" />
      <div className="lw-head">
        <span className="lw-star" aria-hidden="true">★</span>
        <h2 id="lw-title">
          <span>Learn on the tools</span>
          <span className="lw-accent">the industry uses</span>
        </h2>
        <p>From AI assistants to data and deployment platforms, you practise on real, industry-standard tools in class.</p>
      </div>
      <div className="lw-rows">
        {ROWS.map((row, r) => (
          <div key={r} className={`lw-row ${r ? 'lw-rev' : ''}`}>
            {/* The list is rendered twice so the loop is seamless; the copy is hidden from assistive tech. */}
            <ul className="lw-track">
              {row.map((t) => <LogoTile key={t.id} name={t.name} icon={t.icon!} color={t.color} />)}
            </ul>
            <ul className="lw-track" aria-hidden="true">
              {row.map((t) => <LogoTile key={t.id} name={t.name} icon={t.icon!} color={t.color} />)}
            </ul>
          </div>
        ))}
      </div>
      <p className="lw-note"><a href="/ai-tools">See all {AI_TOOLS.length} tools <span aria-hidden="true">→</span></a></p>
    </section>
  )
}

/* ------------------------------------------------------------------ reviews */

interface Review { name: string; course: string; text: string; photo: string; rating?: number | null }
const COURSES = COURSE_OPTIONS.flatMap((g) => g.items)

function Stars({ value, label }: { value: number; label?: string }) {
  return (
    <span className="rv-stars" role="img" aria-label={label ?? `${value} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map((n) => <span key={n} className={n <= value ? 'on' : ''} aria-hidden="true">★</span>)}
    </span>
  )
}

function ReviewForm() {
  const id = useId()
  const [form, setForm] = useState({ name: '', course: '', text: '', rating: 0, permission: false, website: '' })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [state, setState] = useState<'idle' | 'sending' | 'done' | 'error'>('idle')
  const [message, setMessage] = useState('')
  const set = (k: keyof typeof form, v: string | number | boolean) => { setForm((f) => ({ ...f, [k]: v })); setErrors((e) => ({ ...e, [k]: '' })) }

  function validate() {
    const e: Record<string, string> = {}
    if (!form.name.trim()) e.name = 'Please enter your name.'
    if (!form.rating) e.rating = 'Please choose a star rating.'
    if (form.text.trim().length < 20) e.text = 'Please write at least 20 characters.'
    if (!form.permission) e.permission = 'Please allow us to show your review.'
    return e
  }

  async function submit(event: FormEvent) {
    event.preventDefault()
    const e = validate()
    setErrors(e)
    if (Object.keys(e).length) { setState('error'); setMessage('Please correct the highlighted fields.'); return }
    setState('sending'); setMessage('')
    try {
      const res = await fetch('/api/testimonials/submit/', { method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json' }, body: JSON.stringify(form) })
      const data = await res.json().catch(() => ({}))
      if (res.status === 429) throw new Error('You have sent several reviews recently. Please try again later.')
      if (!res.ok) {
        const fieldErrors: Record<string, string> = {}
        for (const [k, v] of Object.entries(data || {})) if (Array.isArray(v)) fieldErrors[k] = String(v[0])
        setErrors(fieldErrors)
        throw new Error(Object.keys(fieldErrors).length ? 'Please correct the highlighted fields.' : 'Could not send your review. Please try again.')
      }
      setState('done'); setMessage(data.detail || 'Thank you! Your review will appear after our team checks it.')
    } catch (err) {
      setState('error'); setMessage(err instanceof Error ? err.message : 'Could not send your review. Please try again.')
    }
  }

  if (state === 'done') {
    return (
      <div className="rv-form rv-thanks" role="status">
        <span className="rv-check" aria-hidden="true">✓</span>
        <h3>Thank you for your review!</h3>
        <p>{message}</p>
      </div>
    )
  }

  return (
    <form className="rv-form" onSubmit={submit} noValidate aria-labelledby={`${id}-t`}>
      <h3 id={`${id}-t`}>Share your experience</h3>
      <p className="rv-form-sub">Took a demo class or a course with us? Tell other learners how it went.</p>

      <fieldset className="rv-rate">
        <legend>Your rating</legend>
        <div className="rv-rate-row">
          {[5, 4, 3, 2, 1].map((n) => (
            <span key={n}>
              <input type="radio" id={`${id}-r${n}`} name={`${id}-rating`} value={n} checked={form.rating === n} onChange={() => set('rating', n)} />
              <label htmlFor={`${id}-r${n}`} title={`${n} star${n > 1 ? 's' : ''}`}><span className="sr-only">{n} star{n > 1 ? 's' : ''}</span>★</label>
            </span>
          ))}
        </div>
        {errors.rating && <p className="rv-err">{errors.rating}</p>}
      </fieldset>

      <div className="rv-two">
        <div className="rv-field">
          <label htmlFor={`${id}-name`}>Your name</label>
          <input id={`${id}-name`} maxLength={80} autoComplete="name" value={form.name} aria-invalid={!!errors.name} onChange={(e) => set('name', e.target.value)} />
          {errors.name && <p className="rv-err">{errors.name}</p>}
        </div>
        <div className="rv-field">
          <label htmlFor={`${id}-course`}>Course <span>(optional)</span></label>
          <select id={`${id}-course`} value={form.course} onChange={(e) => set('course', e.target.value)}>
            <option value="">Select a course</option>
            {COURSES.map((c) => <option key={c} value={c}>{c}</option>)}
            <option value="Free demo class">Free demo class</option>
          </select>
        </div>
      </div>
      <div className="rv-field">
        <label htmlFor={`${id}-text`}>Your review</label>
        <textarea id={`${id}-text`} rows={4} maxLength={1200} value={form.text} aria-invalid={!!errors.text} placeholder="What did you learn? How were the classes and trainers?" onChange={(e) => set('text', e.target.value)} />
        <p className="rv-count">{form.text.trim().length}/1200</p>
        {errors.text && <p className="rv-err">{errors.text}</p>}
      </div>
      <div className="rv-hp" aria-hidden="true">
        <label htmlFor={`${id}-web`}>Website</label>
        <input id={`${id}-web`} tabIndex={-1} autoComplete="off" value={form.website} onChange={(e) => set('website', e.target.value)} />
      </div>
      <label className="rv-consent">
        <input type="checkbox" checked={form.permission} onChange={(e) => set('permission', e.target.checked)} />
        <span>I agree that Coding Hubs may show my name, course and review on the website.</span>
      </label>
      {errors.permission && <p className="rv-err">{errors.permission}</p>}
      {message && state === 'error' && <p className="rv-err rv-err-main" role="alert">{message}</p>}
      <button type="submit" className="rv-submit" disabled={state === 'sending'}>{state === 'sending' ? 'Sending…' : 'Submit review'}</button>
      <p className="rv-fine">Reviews are checked by our team before they appear.</p>
    </form>
  )
}

/** Published reviews (with permission) plus a form for learners to send a new one. */
function Reviews() {
  const [rows, setRows] = useState<Review[] | null>(null)
  useEffect(() => {
    let live = true
    getJson('/testimonials/').then((d) => live && setRows(Array.isArray(d) ? d : [])).catch(() => live && setRows([]))
    return () => { live = false }
  }, [])
  const rated = (rows ?? []).filter((r) => r.rating)
  const avg = rated.length ? rated.reduce((s, r) => s + (r.rating || 0), 0) / rated.length : 0

  return (
    <section className="sec rvw" id="reviews" aria-labelledby="reviews-title">
      <div className="wrap">
        <div className="sec-head center reveal">
          <p className="eyebrow">Reviews &amp; testimonials</p>
          <h2 id="reviews-title" className="h2">What our <span className="marker">learners</span> say</h2>
          {rated.length > 0 && (
            <p className="rv-summary"><Stars value={Math.round(avg)} label={`Average ${avg.toFixed(1)} out of 5`} /> <strong>{avg.toFixed(1)}</strong> from {rated.length} review{rated.length === 1 ? '' : 's'}</p>
          )}
        </div>
        <div className="rv-grid">
          <div className="rv-list">
            {rows === null ? (
              <p className="rv-muted" role="status">Loading reviews…</p>
            ) : rows.length ? (
              <ul>
                {rows.map((r) => (
                  <AnimatedCard bare as="li" key={r.name + r.text.slice(0, 16)} className="rv-card">
                    <span className="rv-quote" aria-hidden="true">“</span>
                    {r.rating ? <Stars value={r.rating} /> : null}
                    <blockquote>{r.text}</blockquote>
                    <p className="rv-who">
                      {r.photo ? <img src={r.photo} alt="" width={44} height={44} loading="lazy" /> : <span className="rv-initial" aria-hidden="true">{r.name.slice(0, 1).toUpperCase()}</span>}
                      <span><strong>{r.name}</strong>{r.course && <em>{r.course}</em>}</span>
                    </p>
                  </AnimatedCard>
                ))}
              </ul>
            ) : (
              <div className="rv-empty">
                <span aria-hidden="true">★★★★★</span>
                <h3>Be the first to leave a review</h3>
                <p>Reviews from our learners will appear here once they are checked and approved.</p>
              </div>
            )}
          </div>
          <ReviewForm />
        </div>
      </div>
    </section>
  )
}

export function HomeExplore() {
  return <Reviews />
}
