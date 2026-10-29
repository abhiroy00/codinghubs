import { useState, type FormEvent } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../lib/auth-context'

export function Register() {
  const { register } = useAuth()
  const navigate = useNavigate()
  const location = useLocation() as { state?: { from?: { pathname?: string } } }
  const [form, setForm] = useState({ username: '', email: '', phone: '', password: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  function update<K extends keyof typeof form>(key: K, value: string) {
    setForm((f) => ({ ...f, [key]: value }))
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await register(form)
      navigate(location.state?.from?.pathname ?? '/dashboard', { replace: true })
    } catch (err) {
      const detail = (err as { response?: { data?: Record<string, string[]> } }).response?.data
      const firstError = detail ? Object.values(detail)[0]?.[0] : undefined
      setError(firstError ?? 'Could not create your account. Please check your details.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <section className="section" aria-labelledby="register-heading">
      <div className="container-x" style={{ maxWidth: '26rem' }}>
        <p className="eyebrow rv">Create your account</p>
        <h1 id="register-heading" className="display-lg mt-4">
          Start learning today.
        </h1>
        <form onSubmit={handleSubmit} style={{ marginTop: '2rem' }}>
          <div className="field">
            <label htmlFor="r-username">Username</label>
            <input id="r-username" required autoComplete="username" value={form.username} onChange={(e) => update('username', e.target.value)} />
          </div>
          <div className="field">
            <label htmlFor="r-email">Email</label>
            <input id="r-email" type="email" required autoComplete="email" value={form.email} onChange={(e) => update('email', e.target.value)} />
          </div>
          <div className="field">
            <label htmlFor="r-phone">Phone / WhatsApp</label>
            <input id="r-phone" type="tel" required autoComplete="tel" placeholder="+91" value={form.phone} onChange={(e) => update('phone', e.target.value)} />
          </div>
          <div className="field">
            <label htmlFor="r-password">Password</label>
            <input
              id="r-password"
              type="password"
              required
              autoComplete="new-password"
              minLength={8}
              value={form.password}
              onChange={(e) => update('password', e.target.value)}
            />
          </div>
          {error && <p style={{ color: '#be123c', fontSize: '.875rem', marginTop: '.5rem' }}>{error}</p>}
          <button type="submit" className="btn btn-lime" style={{ width: '100%', marginTop: '1.5rem' }} disabled={loading}>
            <span className="shine"></span>
            <span>{loading ? 'Creating account…' : 'Create account'}</span>
          </button>
        </form>
        <p style={{ marginTop: '1.5rem', fontSize: '.875rem', color: 'var(--color-muted)' }}>
          Already have an account?{' '}
          <Link to="/login" state={location.state} style={{ textDecoration: 'underline', textUnderlineOffset: '2px' }}>
            Log in
          </Link>
        </p>
      </div>
    </section>
  )
}
