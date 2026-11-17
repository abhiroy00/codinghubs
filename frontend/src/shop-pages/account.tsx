import { GuestProgressImport } from '../interview/GuestProgressImport'
import { InterviewActivity } from '../interview/ResourceActions'
import '../community/public.css'
import { lazy, Suspense, useEffect, useMemo, useState, type FormEvent } from 'react'
import { Link, Navigate, useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { PageFrame } from '../content-pages/shared'
import { UserAvatar } from '../components/AccountMenu'
import { useAuth } from '../lib/auth-context'
import { api } from '../lib/api'
import type { User } from '../lib/types'
import { errorText } from './api'
import './profile.css'

const LearningDashboard = lazy(() => import('../pages/Dashboard').then(m=>({default:m.Dashboard})))
const StudioPreferences = lazy(() => import('../studio/pages').then(m=>({default:m.Profile})))
type Section = 'personal' | 'security' | 'data' | 'learning' | 'interview' | 'studio'
const SECTIONS: { id: Section; label: string; icon: string }[] = [
  {id:'learning',label:'Courses & progress',icon:'M3 3h18v18H3z'},
  {id:'interview',label:'Interview activity',icon:'M6 3h12v18l-6-4-6 4V3z'},
  {id:'studio',label:'Studio preferences',icon:'M4 4h16v16H4z'},
  { id: 'personal', label: 'Personal Info', icon: 'M20 21v-2a7 7 0 0 0-14 0v2M17 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0' },
  { id: 'security', label: 'Security', icon: 'M6 11V8a6 6 0 1 1 12 0v3M5 11h14v10H5zM12 15v2' },
  { id: 'data', label: 'Your Data', icon: 'M4 7c0-1.7 3.6-3 8-3s8 1.3 8 3-3.6 3-8 3-8-1.3-8-3Zm0 0v10c0 1.7 3.6 3 8 3s8-1.3 8-3V7M4 12c0 1.7 3.6 3 8 3s8-1.3 8-3' },
]

function Icon({ d }: { d: string }) {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={d} />
    </svg>
  )
}

type FieldErrors = Partial<Record<'first_name' | 'last_name' | 'phone', string>>

/** Field-level messages from a DRF 400 response, if any. */
function fieldErrors(error: unknown): FieldErrors {
  const data = (error as { response?: { data?: Record<string, unknown> } })?.response?.data
  if (!data || typeof data !== 'object') return {}
  const out: FieldErrors = {}
  for (const key of ['first_name', 'last_name', 'phone'] as const) {
    const value = data[key]
    if (Array.isArray(value) && value.length) out[key] = String(value[0])
  }
  return out
}

function PersonalInfo({ user, onSaved }: { user: User; onSaved: (u: User) => void }) {
  const initial = useMemo(() => ({ first_name: user.first_name || '', last_name: user.last_name || '', phone: user.phone || '' }), [user])
  const [form, setForm] = useState(initial)
  const [saving, setSaving] = useState(false)
  const [status, setStatus] = useState<{ kind: 'ok' | 'error'; text: string } | null>(null)
  const [errors, setErrors] = useState<FieldErrors>({})
  const dirty = form.first_name !== initial.first_name || form.last_name !== initial.last_name || form.phone !== initial.phone

  function set(key: keyof typeof form, value: string) {
    setForm((f) => ({ ...f, [key]: value }))
    setErrors((e) => ({ ...e, [key]: undefined }))
    setStatus(null)
  }

  async function save(event: FormEvent) {
    event.preventDefault()
    if (!dirty || saving) return
    setSaving(true)
    setStatus(null)
    setErrors({})
    try {
      const { data } = await api.patch<User>('/auth/me/', form)
      setForm({ first_name: data.first_name || '', last_name: data.last_name || '', phone: data.phone || '' })
      onSaved(data)
      setStatus({ kind: 'ok', text: 'Your changes have been saved.' })
    } catch (error) {
      const fields = fieldErrors(error)
      setErrors(fields)
      setStatus({ kind: 'error', text: Object.keys(fields).length ? 'Please correct the highlighted fields.' : errorText(error, 'Could not save your changes. Please try again.') })
    } finally {
      setSaving(false)
    }
  }

  return (
    <form className="pf-form" onSubmit={save} noValidate>
      <header className="pf-head">
        <div>
          <h2 id="pf-section-title">Personal Information</h2>
          <p>Basic details to help us get to know you better</p>
        </div>
        <button type="button" className="pf-btn pf-btn-ghost" disabled={!dirty || saving} onClick={() => { setForm(initial); setErrors({}); setStatus(null) }}>
          Cancel
          <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>
        </button>
      </header>

      <div className="pf-grid">
        <div className="pf-field">
          <label htmlFor="pf-first">First Name</label>
          <input id="pf-first" autoComplete="given-name" maxLength={150} value={form.first_name} placeholder="Enter your first name" aria-invalid={!!errors.first_name} aria-describedby={errors.first_name ? 'pf-first-err' : undefined} onChange={(e) => set('first_name', e.target.value)} />
          {errors.first_name && <p className="pf-err" id="pf-first-err">{errors.first_name}</p>}
        </div>
        <div className="pf-field">
          <label htmlFor="pf-last">Last Name</label>
          <input id="pf-last" autoComplete="family-name" maxLength={150} value={form.last_name} placeholder="Enter your last name" aria-invalid={!!errors.last_name} aria-describedby={errors.last_name ? 'pf-last-err' : undefined} onChange={(e) => set('last_name', e.target.value)} />
          {errors.last_name && <p className="pf-err" id="pf-last-err">{errors.last_name}</p>}
        </div>
        <div className="pf-field">
          <label htmlFor="pf-email">Email Address</label>
          <input id="pf-email" value={user.email || ''} placeholder="No email on this account" readOnly aria-describedby="pf-email-note" />
          <p className="pf-note" id="pf-email-note">Your sign-in email can’t be changed here.</p>
        </div>
        <div className="pf-field">
          <label htmlFor="pf-phone">Phone Number</label>
          <input id="pf-phone" type="tel" autoComplete="tel" inputMode="tel" maxLength={20} value={form.phone} placeholder="Enter your phone number" aria-invalid={!!errors.phone} aria-describedby={errors.phone ? 'pf-phone-err' : undefined} onChange={(e) => set('phone', e.target.value)} />
          {errors.phone && <p className="pf-err" id="pf-phone-err">{errors.phone}</p>}
        </div>
        <div className="pf-field">
          <label htmlFor="pf-username">Username</label>
          <input id="pf-username" value={user.username} readOnly />
        </div>
        <div className="pf-field">
          <label htmlFor="pf-joined">Member Since</label>
          <input id="pf-joined" value={user.date_joined ? new Date(user.date_joined).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' }) : '—'} readOnly />
        </div>
      </div>

      <div className="pf-actions">
        {status && <p className={`pf-status ${status.kind}`} role={status.kind === 'error' ? 'alert' : 'status'}>{status.text}</p>}
        <button type="submit" className="pf-btn pf-btn-primary" disabled={!dirty || saving}>{saving ? 'Saving…' : 'Save'}</button>
      </div>
    </form>
  )
}

function Security({ user, onSignOut }: { user: User; onSignOut: () => void }) {
  const [sending, setSending] = useState(false)
  const [message, setMessage] = useState<{ kind: 'ok' | 'error'; text: string } | null>(null)
  async function sendReset() {
    if (!user.email) return
    setSending(true)
    setMessage(null)
    try {
      await api.post('/auth/password-reset/', { email: user.email })
      setMessage({ kind: 'ok', text: `If your account uses a password, a reset link is on its way to ${user.email}.` })
    } catch (error) {
      setMessage({ kind: 'error', text: errorText(error, 'Could not send the reset link. Please try again.') })
    } finally {
      setSending(false)
    }
  }
  return (
    <div className="pf-form">
      <header className="pf-head">
        <div>
          <h2 id="pf-section-title">Security</h2>
          <p>Manage your password and sign-in</p>
        </div>
      </header>
      <section className="pf-card">
        <h3>Password</h3>
        <p>We’ll email you a secure link to set a new password.</p>
        {user.email ? (
          <button type="button" className="pf-btn pf-btn-ghost" disabled={sending} onClick={() => void sendReset()}>{sending ? 'Sending…' : 'Email me a reset link'}</button>
        ) : (
          <p className="pf-note">This account has no email address, so a reset link can’t be sent. <Link to="/#contact">Contact support</Link>.</p>
        )}
        {message && <p className={`pf-status ${message.kind}`} role={message.kind === 'error' ? 'alert' : 'status'}>{message.text}</p>}
      </section>
      <section className="pf-card">
        <h3>Sign out</h3>
        <p>Sign out of Coding Hubs on this device.</p>
        <button type="button" className="pf-btn pf-btn-ghost" onClick={onSignOut}>Sign out</button>
      </section>
    </div>
  )
}

function YourData({ onDeleted }: { onDeleted: () => Promise<void> }) {
  const [message, setMessage] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [exporting, setExporting] = useState(false)

  async function exportData() {
    setMessage('')
    setExporting(true)
    try {
      const { data } = await api.get('/auth/me/export/')
      const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }))
      const link = document.createElement('a')
      link.href = url
      link.download = 'coding-hubs-my-data.json'
      document.body.appendChild(link)
      link.click()
      link.remove()
      URL.revokeObjectURL(url)
    } catch (error) { setMessage(errorText(error, 'Could not prepare your data download. Please try again.')) }
    finally { setExporting(false) }
  }

  async function deleteAccount(event: FormEvent) {
    event.preventDefault()
    if (!window.confirm('Delete your account permanently? This cannot be undone.')) return
    setMessage('')
    setBusy(true)
    try {
      await api.post('/auth/me/delete/', { password })
      await onDeleted()
    } catch (error) { setMessage(errorText(error, 'Could not delete your account. Please try again.')) }
    finally { setBusy(false) }
  }

  return (
    <div className="pf-form">
      <header className="pf-head">
        <div>
          <h2 id="pf-section-title">Your Data</h2>
          <p>Download or delete what we hold about you</p>
        </div>
      </header>
      <section className="pf-card">
        <h3>Download my data</h3>
        <p>Your profile, enrollments, learning progress and certificates as a JSON file.</p>
        <button type="button" className="pf-btn pf-btn-ghost" disabled={exporting} onClick={() => void exportData()}>{exporting ? 'Preparing…' : 'Download my data'}</button>
      </section>
      <section className="pf-card pf-danger">
        <h3>Delete account</h3>
        <p>This permanently removes your account, learning progress, AI history and uploaded resumes. See our <Link to="/policies#privacy">privacy policy</Link>.</p>
        <form className="pf-delete" onSubmit={deleteAccount}>
          <div className="pf-field">
            <label htmlFor="pf-delete-password">Password</label>
            <input id="pf-delete-password" type="password" autoComplete="current-password" required value={password} onChange={(event) => setPassword(event.target.value)} />
          </div>
          <button type="submit" className="pf-btn pf-btn-danger" disabled={busy || !password}>{busy ? 'Deleting…' : 'Delete my account'}</button>
        </form>
      </section>
      {message && <p className="pf-status error" role="alert">{message}</p>}
    </div>
  )
}

export function MyAccount() {
  const { logout, user, loading, updateUser } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const [params, setParams] = useSearchParams()
  const requested = params.get('section') as Section | null
  const section: Section = SECTIONS.some((s) => s.id === requested) ? (requested as Section) : 'personal'

  useEffect(() => { document.title = 'My account | Coding Hubs School of AI' }, [])

  if (loading) return <PageFrame><p className="pf-loading" role="status">Loading your account…</p></PageFrame>
  if (!user) return <Navigate to="/login" replace state={{ from: { pathname: location.pathname } }} />
  const name = [user.first_name, user.last_name].filter(Boolean).join(' ') || user.username

  return (
    <PageFrame wide>
      <h1 className="sr-only">My account</h1>
      <div className="pf-shell">
        <aside className="pf-side" aria-label="Account sections">
          <div className="pf-who">
            <span className="pf-avatar"><UserAvatar user={user} /></span>
            <p className="pf-name">{name}</p>
            {user.email && <p className="pf-mail">{user.email}</p>}
          </div>
          <nav className="pf-nav" aria-label="Profile">
            {SECTIONS.map((s) => (
              <button key={s.id} type="button" className={section === s.id ? 'on' : ''} aria-current={section === s.id ? 'page' : undefined} onClick={() => setParams(s.id === 'personal' ? {} : { section: s.id })}>
                <Icon d={s.icon} />{s.label}
              </button>
            ))}

          </nav>
        </aside>
        <section className="pf-main" aria-labelledby="pf-section-title">
          {section === 'learning' && <GuestProgressImport/>}
          {section === 'learning' && <Suspense fallback={<p role="status">Loading learning dashboard…</p>}><LearningDashboard embedded/></Suspense>}
          {section === 'interview' && <InterviewActivity/>}
          {section === 'studio' && <Suspense fallback={<p role="status">Loading preferences…</p>}><StudioPreferences embedded/></Suspense>}
          {section === 'personal' && <PersonalInfo user={user} onSaved={updateUser} />}
          {section === 'security' && <Security user={user} onSignOut={() => { void logout().then(() => navigate('/', { replace: true })) }} />}
          {section === 'data' && <YourData onDeleted={async () => { await logout(); navigate('/', { replace: true }) }} />}
        </section>
      </div>
      <p className="pf-help">Need help? <Link to="/#contact">Contact us</Link>.</p>
    </PageFrame>
  )
}
