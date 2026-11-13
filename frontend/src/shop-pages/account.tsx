import { useEffect, useState, type FormEvent } from 'react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { PageFrame } from '../content-pages/shared'
import { UserAvatar } from '../components/AccountMenu'
import { useAuth } from '../lib/auth-context'
import { api } from '../lib/api'
import { errorText } from './api'
import './profile.css'

export function MyAccount() {
  const { logout, user, loading } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const [message, setMessage] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  useEffect(() => {
    document.title = 'My account | Coding Hubs School of AI'
    const meta = document.createElement('meta')
    meta.name = 'robots'
    meta.content = 'noindex, nofollow'
    document.head.appendChild(meta)
    return () => meta.remove()
  }, [])

  async function exportData() {
    setMessage('')
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
  }

  async function deleteAccount(event: FormEvent) {
    event.preventDefault()
    if (!window.confirm('Delete your account permanently? This cannot be undone.')) return
    setMessage('')
    setBusy(true)
    try {
      await api.post('/auth/me/delete/', { password })
      await logout()
      navigate('/', { replace: true })
    } catch (error) { setMessage(errorText(error, 'Could not delete your account. Please try again.')) }
    finally { setBusy(false) }
  }
  if (loading) return <PageFrame><p role="status">Loading your account…</p></PageFrame>
  if (!user) return <Navigate to="/login" replace state={{ from: { pathname: location.pathname } }} />
  const name = [user.first_name, user.last_name].filter(Boolean).join(' ') || user.username
  return <PageFrame>
    <div className="profile-page">
      <p className="eyebrow">YOUR CODING HUBS ACCOUNT</p>
      <h1>My account</h1>
      <section className="profile-panel profile-summary" aria-label="Your profile">
        <UserAvatar user={user} />
        <div><h2>{name}</h2><p>{user.email}</p></div>
        <dl><dt>Username</dt><dd>{user.username}</dd>{user.phone && <><dt>Phone</dt><dd>{user.phone}</dd></>}</dl>
      </section>
      <section className="profile-panel">
        <h2>Your learning</h2><p>Continue your courses and check your enrollments.</p>
        <Link className="btn btn-yellow" to="/dashboard">Open dashboard ↗</Link>
      </section>
      <section className="profile-panel">
        <h2>Your data</h2><p>Download a copy of your profile, enrollments, learning progress and certificates as JSON.</p>
        <button type="button" className="btn btn-ghost-dark" onClick={() => void exportData()}>Download my data</button>
      </section>
      <section className="profile-panel">
        <h2>Delete account</h2>
        <p>This permanently removes your account, learning progress, AI history and uploaded resumes. See our <Link to="/policies#privacy">privacy policy</Link>.</p>
        <form className="profile-delete" onSubmit={deleteAccount}>
          <label>Password<input type="password" autoComplete="current-password" required value={password} onChange={(event) => setPassword(event.target.value)} /></label>
          <button type="submit" className="btn btn-ghost-dark" disabled={busy || !password}>{busy ? 'Deleting…' : 'Delete my account'}</button>
        </form>
      </section>
      {message && <p role="alert">{message}</p>}
      <p>Need help? <Link to="/#contact">Contact us</Link>.</p>
    </div>
  </PageFrame>
}
