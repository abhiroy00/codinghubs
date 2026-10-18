import { useState, type FormEvent } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../lib/auth-context'

export function Login() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation() as { state?: { from?: { pathname: string } } }
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await login(username, password)
      navigate(location.state?.from?.pathname ?? '/dashboard', { replace: true })
    } catch {
      setError('Invalid username or password.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <section className="section" aria-labelledby="login-heading">
      <div className="container-x" style={{ maxWidth: '26rem' }}>
        <p className="eyebrow rv">Student login</p>
        <h1 id="login-heading" className="display-lg mt-4">
          Welcome back.
        </h1>
        <form onSubmit={handleSubmit} style={{ marginTop: '2rem' }}>
          <div className="field">
            <label htmlFor="username">Username</label>
            <input id="username" required autoComplete="username" value={username} onChange={(e) => setUsername(e.target.value)} />
          </div>
          <div className="field">
            <label htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              required
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          {error && <p style={{ color: '#be123c', fontSize: '.875rem', marginTop: '.5rem' }}>{error}</p>}
          <button type="submit" className="btn btn-ink" style={{ width: '100%', marginTop: '1.5rem' }} disabled={loading}>
            <span className="shine"></span>
            <span>{loading ? 'Logging in…' : 'Log in'}</span>
          </button>
        </form>
        <p style={{ marginTop: '1.5rem', fontSize: '.875rem', color: 'var(--color-muted)' }}>
          New here?{' '}
          <Link to="/register" style={{ textDecoration: 'underline', textUnderlineOffset: '2px' }}>
            Create an account
          </Link>
        </p>
      </div>
    </section>
  )
}
