import { useState, type FormEvent } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { api } from '../lib/api'

interface ApiError {
  response?: { data?: Record<string, string[] | string> }
}

function firstError(err: unknown): string {
  const data = (err as ApiError)?.response?.data
  if (!data) return 'Something went wrong. Please try again.'
  const first = Object.values(data)[0]
  return Array.isArray(first) ? first[0] : String(first)
}

export function ForgotPassword() {
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  async function submit(e: FormEvent) {
    e.preventDefault()
    setError('')
    setBusy(true)
    try {
      await api.post('/auth/password-reset/', { email })
      setSent(true)
    } catch (err) {
      setError(firstError(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="section" aria-labelledby="forgot-heading">
      <div className="container-x" style={{ maxWidth: '26rem' }}>
        <p className="eyebrow rv">Account help</p>
        <h1 id="forgot-heading" className="display-lg mt-4">
          Reset your password.
        </h1>
        {sent ? (
          <>
            <p style={{ marginTop: '2rem' }}>
              If an account exists for that email address, we have sent a link to choose a new password. The link is valid
              for a limited time.
            </p>
            <p className="bl-meta">Nothing arrived? Check the spam folder, or <Link to="/register">create an account</Link>.</p>
          </>
        ) : (
          <>
            <p style={{ marginTop: '1rem', color: 'var(--color-muted)' }}>
              Enter the email address on your account and we will send you a reset link.
            </p>
            <form onSubmit={submit} style={{ marginTop: '2rem' }}>
              <div className="field">
                <label htmlFor="forgot-email">Email</label>
                <input
                  id="forgot-email"
                  type="email"
                  required
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              {error && <p style={{ color: '#be123c', fontSize: '.875rem', marginTop: '.5rem' }} role="alert">{error}</p>}
              <button type="submit" className="btn btn-ink" style={{ width: '100%', marginTop: '1.5rem' }} disabled={busy}>
                <span className="shine"></span>
                <span>{busy ? 'Sending…' : 'Send reset link'}</span>
              </button>
            </form>
          </>
        )}
        <p style={{ marginTop: '1.5rem', fontSize: '.875rem', color: 'var(--color-muted)' }}>
          <Link to="/login" style={{ textDecoration: 'underline', textUnderlineOffset: '2px' }}>Back to login</Link>
        </p>
      </div>
    </section>
  )
}

export function ResetPassword() {
  const [params] = useSearchParams()
  const uid = params.get('uid') ?? ''
  const token = params.get('token') ?? ''
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [done, setDone] = useState(false)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  async function submit(e: FormEvent) {
    e.preventDefault()
    setError('')
    if (password !== confirm) {
      setError('The two passwords do not match.')
      return
    }
    setBusy(true)
    try {
      await api.post('/auth/password-reset/confirm/', { uid, token, password })
      setDone(true)
    } catch (err) {
      setError(firstError(err))
    } finally {
      setBusy(false)
    }
  }

  const invalidLink = !uid || !token
  return (
    <section className="section" aria-labelledby="reset-heading">
      <div className="container-x" style={{ maxWidth: '26rem' }}>
        <p className="eyebrow rv">Account help</p>
        <h1 id="reset-heading" className="display-lg mt-4">
          Choose a new password.
        </h1>
        {done ? (
          <>
            <p style={{ marginTop: '2rem' }}>Your password has been changed, and other devices have been signed out.</p>
            <Link to="/login" className="btn btn-ink" style={{ marginTop: '1.5rem', display: 'inline-flex' }}>
              <span className="shine"></span>
              <span>Log in</span>
            </Link>
          </>
        ) : invalidLink ? (
          <p style={{ marginTop: '2rem' }}>
            This link is incomplete. <Link to="/forgot-password">Request a new reset link</Link>.
          </p>
        ) : (
          <form onSubmit={submit} style={{ marginTop: '2rem' }}>
            <div className="field">
              <label htmlFor="reset-password">New password</label>
              <input
                id="reset-password"
                type="password"
                required
                minLength={8}
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            <div className="field">
              <label htmlFor="reset-confirm">Confirm new password</label>
              <input
                id="reset-confirm"
                type="password"
                required
                minLength={8}
                autoComplete="new-password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
              />
            </div>
            {error && <p style={{ color: '#be123c', fontSize: '.875rem', marginTop: '.5rem' }} role="alert">{error}</p>}
            <button type="submit" className="btn btn-ink" style={{ width: '100%', marginTop: '1.5rem' }} disabled={busy}>
              <span className="shine"></span>
              <span>{busy ? 'Saving…' : 'Set new password'}</span>
            </button>
          </form>
        )}
      </div>
    </section>
  )
}
