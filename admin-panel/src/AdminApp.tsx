import { useEffect, useState, type FormEvent } from 'react'
import { NavLink, Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom'
import { adminApi, adminTokens } from './api'
import { BlogEditor } from './content/BlogEditor'
import { CaseEditor } from './content/CaseEditor'
import { ContentList } from './content/ContentList'
import { ContentDashboard } from './content/Dashboard'
import { ChangePassword } from './content/ChangePassword'
import { GuideEditor, ProductEditor, ProjectEditor, SimpleProductEditor } from './content/ShopEditors'
import { ShopList } from './content/ShopLists'
import { Customers, StoreOrderDetail, StoreOrders, StoreOverview } from './content/StorePages'
import { CoursesPage, DataPage, LeadsPage, Overview } from './pages'
import { TutorBookingsPage } from './TutorBookingsPage'
import { TutorsPage } from './TutorsPage'
import './admin.css'

const NAV: { heading: string; items: { to: string; label: string; icon: string; end?: boolean; count?: 'blogs' | 'cases' }[] }[] = [
  {
    heading: 'Main',
    items: [
      { to: '/', label: 'Dashboard', icon: 'M3 13h8V3H3v10Zm0 8h8v-6H3v6Zm10 0h8V11h-8v10Zm0-18v6h8V3h-8Z', end: true },
    ],
  },
  {
    heading: 'Leads & courses',
    items: [
      { to: '/leads', label: 'Manage Leads', icon: 'M16 11a4 4 0 1 0-8 0 4 4 0 0 0 8 0Zm-12 9c0-3.3 3.6-5 8-5s8 1.7 8 5v1H4v-1Z' },
      { to: '/enrollments', label: 'Enrollments', icon: 'M12 3 2 8l10 5 8-4v6h2V8L12 3Zm-6 9.5V16c0 1.7 2.7 3 6 3s6-1.3 6-3v-3.5l-6 3-6-3Z' },
      { to: '/orders', label: 'Course Orders', icon: 'M7 4h10l1 4H6l1-4ZM5 10h14l-1 10H6L5 10Z' },
      { to: '/users', label: 'Users', icon: 'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm0 2c-4 0-8 2-8 5v1h16v-1c0-3-4-5-8-5Z' },
      { to: '/courses', label: 'Courses', icon: 'M4 5h16v3H4V5Zm0 5h16v3H4v-3Zm0 5h10v3H4v-3Z' },
    ],
  },
  {
    heading: 'Blog / Insights',
    items: [
      { to: '/blogs', label: 'All Posts', icon: 'M4 4h13l3 3v13H4V4Zm3 5v2h10V9H7Zm0 4v2h10v-2H7Z', end: true, count: 'blogs' },
      { to: '/blogs/create', label: 'Write New Post', icon: 'M12 4a8 8 0 1 0 0 16 8 8 0 0 0 0-16Zm1 4v3h3v2h-3v3h-2v-3H8v-2h3V8h2Z' },
    ],
  },
  {
    heading: 'Case Studies',
    items: [
      { to: '/case-studies', label: 'All Case Studies', icon: 'M4 7h16v13H4V7Zm4-3h8v2H8V4Zm-1 6v2h10v-2H7Z', end: true, count: 'cases' },
      { to: '/case-studies/create', label: 'Add New Study', icon: 'M12 4a8 8 0 1 0 0 16 8 8 0 0 0 0-16Zm1 4v3h3v2h-3v3h-2v-3H8v-2h3V8h2Z' },
    ],
  },
  {
    heading: 'Projects & guides',
    items: [
      { to: '/projects', label: 'Projects', icon: 'M4 5h16v3H4V5Zm0 5h16v9H4v-9Zm3 2v2h10v-2H7Z' },
      { to: '/project-guides', label: 'Project Guides', icon: 'M5 3h11l3 3v15H5V3Zm3 6v2h8V9H8Zm0 4v2h8v-2H8Z' },
    ],
  },
  {
    heading: 'Store',
    items: [
      { to: '/products', label: 'Products', icon: 'M12 2 3 6.5v11L12 22l9-4.5v-11L12 2Zm0 2.2 5.9 2.9L12 10 6.1 7.1 12 4.2Z' },
      { to: '/store-orders', label: 'Store Orders', icon: 'M7 4h10l1 4H6l1-4ZM5 10h14l-1 10H6L5 10Z' },
      { to: '/customers', label: 'Customers', icon: 'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm0 2c-4 0-8 2-8 5v1h16v-1c0-3-4-5-8-5Z' },
    ],
  },
  {
    heading: 'Tutors',
    items: [
      { to: '/tutor-bookings', label: 'Tutor Bookings', icon: 'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm-8 9c0-3.3 3.6-5 8-5s8 1.7 8 5v1H4v-1Zm14-11h4m-2-2v4' },
      { to: '/tutors', label: 'Tutors', icon: 'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm-8 9c0-3.3 3.6-5 8-5s8 1.7 8 5v1H4v-1Z' },
    ],
  },
  {
    heading: 'Settings',
    items: [
      { to: '/change-password', label: 'Change Password', icon: 'M7 14a4 4 0 1 1 3.9-5H21v3h-2v2h-3v-2h-5.1A4 4 0 0 1 7 14Zm0-6a2 2 0 1 0 0 4 2 2 0 0 0 0-4Z' },
    ],
  },
]

export function AdminApp() {
  const [authed, setAuthed] = useState(() => !!adminTokens.access())
  const [name, setName] = useState(() => localStorage.getItem('ch_admin_name') ?? '')

  useEffect(() => {
    document.title = 'Admin Panel | Coding Hubs'
    const meta = document.createElement('meta')
    meta.name = 'robots'
    meta.content = 'noindex, nofollow'
    document.head.appendChild(meta)
    const onLogout = () => setAuthed(false)
    window.addEventListener('admin-logout', onLogout)
    return () => {
      document.head.removeChild(meta)
      window.removeEventListener('admin-logout', onLogout)
    }
  }, [])

  if (!authed) {
    return (
      <Login
        onDone={(display, email) => {
          localStorage.setItem('ch_admin_name', display)
          localStorage.setItem('ch_admin_email', email)
          setName(display)
          setAuthed(true)
        }}
      />
    )
  }

  return (
    <Shell
      name={name}
      onLogout={() => {
        adminTokens.clear()
        setAuthed(false)
      }}
    />
  )
}

function Login({ onDone }: { onDone: (name: string, email: string) => void }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [show, setShow] = useState(false)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  async function submit(e: FormEvent) {
    e.preventDefault()
    setError('')
    setBusy(true)
    try {
      const { data } = await adminApi.post('/login/', { email, password })
      adminTokens.set(data.access, data.refresh)
      onDone(data.user.name, data.user.email ?? email)
    } catch (err) {
      const status = (err as { response?: { status?: number } }).response?.status
      setError(status === 429 ? 'Too many attempts. Please wait a minute and try again.' : 'Invalid email or password.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="ad-login">
      <form className="ad-login-card" onSubmit={submit}>
        <div className="ad-logo">
          <img src="/assets/coding-hubs-school-of-ai-logo-wide.png" alt="Coding Hubs School of AI" width={720} height={208} />
        </div>
        <h1>Admin Panel</h1>
        <p>Sign in to manage leads, enrollments and courses.</p>
        <label htmlFor="ad-email">Email</label>
        <input id="ad-email" type="email" autoComplete="username" required value={email} onChange={(e) => setEmail(e.target.value)} />
        <label htmlFor="ad-pass">Password</label>
        <div className="ad-pass">
          <input id="ad-pass" type={show ? 'text' : 'password'} autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} />
          <button type="button" onClick={() => setShow((s) => !s)} aria-pressed={show}>
            {show ? 'Hide' : 'Show'}
          </button>
        </div>
        {error && (
          <p className="ad-error" role="alert">
            {error}
          </p>
        )}
        <button type="submit" className="ad-btn ad-btn-primary" disabled={busy}>
          {busy ? 'Signing in…' : 'Sign in'}
        </button>
      </form>
    </div>
  )
}

function Shell({ name, onLogout }: { name: string; onLogout: () => void }) {
  const navigate = useNavigate()
  const location = useLocation()
  const [counts, setCounts] = useState<{ blogs?: number; cases?: number }>({})
  const [open, setOpen] = useState(false)
  const email = localStorage.getItem('ch_admin_email') ?? ''
  useEffect(() => {
    adminApi.get('/content/stats/').then((r) => setCounts({ blogs: r.data.blogs.total, cases: r.data.case_studies.total })).catch(() => undefined)
    setOpen(false)
  }, [location.pathname])
  const initial = (name || email || 'A').trim()[0]?.toUpperCase()
  return (
    <div className="ad-shell">
      <aside className={`ad-side${open ? ' open' : ''}`}>
        <div className="ad-brand">
          <img src="/assets/coding-hubs-school-of-ai-logo-wide.png" alt="Coding Hubs School of AI" width={720} height={208} />
          <span>Admin</span>
          <button type="button" className="ad-menu-btn" aria-expanded={open} aria-controls="ad-nav" onClick={() => setOpen((o) => !o)}>{open ? 'Close' : 'Menu'}</button>
        </div>
        <nav aria-label="Admin sections" id="ad-nav">
          {NAV.map((g) => (
            <div key={g.heading} className="ad-nav-group">
              <p className="ad-nav-head">{g.heading}</p>
              {g.items.map((n) => (
                <NavLink key={n.to} to={n.to} end={n.end} className={({ isActive }) => (isActive ? 'on' : '')}>
                  <svg viewBox="0 0 24 24" aria-hidden="true"><path d={n.icon} /></svg>
                  <span>{n.label}</span>
                  {n.count && counts[n.count] !== undefined && <em className="ad-count-pill">{counts[n.count]}</em>}
                </NavLink>
              ))}
            </div>
          ))}
        </nav>
        <div className="ad-side-user">
          <div className="ad-user-card">
            <span className="ad-avatar" aria-hidden="true">{initial}</span>
            <span className="ad-user-text"><strong>{name || 'Admin'}</strong>{email && <small>{email}</small>}</span>
          </div>
          <button type="button" className="ad-signout" onClick={() => { onLogout(); navigate('/') }}>⎋ Sign Out</button>
          <div className="ad-side-foot">
            <a href="/" target="_blank" rel="noopener noreferrer">View website ↗</a>
            <a href="/admin/" target="_blank" rel="noopener noreferrer">Django admin ↗</a>
          </div>
        </div>
      </aside>
      <div className="ad-main">
        <main className="ad-content">
          <Routes>
            <Route index element={<><Overview /><StoreOverview /></>} />
            <Route path="leads" element={<LeadsPage />} />
            <Route
              path="enrollments"
              element={
                <DataPage
                  title="Enrollments"
                  endpoint="/enrollments/"
                  columns={[
                    { key: 'enrolled_at', label: 'Date', date: true },
                    { key: 'user', label: 'User' },
                    { key: 'email', label: 'Email' },
                    { key: 'course', label: 'Course' },
                    { key: 'payment_status', label: 'Payment', badge: true },
                  ]}
                />
              }
            />
            <Route
              path="orders"
              element={
                <DataPage
                  title="Orders"
                  endpoint="/orders/"
                  filters={[{ name: 'status', label: 'All statuses', options: ['created', 'paid', 'failed'] }]}
                  columns={[
                    { key: 'created_at', label: 'Date', date: true },
                    { key: 'razorpay_order_id', label: 'Order ID' },
                    { key: 'user', label: 'User' },
                    { key: 'course', label: 'Course' },
                    { key: 'status', label: 'Status', badge: true },
                  ]}
                />
              }
            />
            <Route
              path="users"
              element={
                <DataPage
                  title="Users"
                  endpoint="/users/"
                  searchable
                  columns={[
                    { key: 'date_joined', label: 'Joined', date: true },
                    { key: 'username', label: 'Username' },
                    { key: 'email', label: 'Email' },
                    { key: 'phone', label: 'Phone' },
                    { key: 'is_staff', label: 'Staff', bool: true },
                  ]}
                />
              }
            />
            <Route path="courses" element={<CoursesPage />} />
            <Route path="content" element={<ContentDashboard />} />
            <Route path="blogs" element={<ContentList kind="blogs" />} />
            <Route path="blogs/create" element={<BlogEditor key="new-blog" />} />
            <Route path="blogs/edit/:id" element={<BlogEditor />} />
            <Route path="case-studies" element={<ContentList kind="case-studies" />} />
            <Route path="case-studies/create" element={<CaseEditor key="new-case" />} />
            <Route path="case-studies/edit/:id" element={<CaseEditor />} />
            <Route path="products" element={<ShopList kind="products" />} />
            <Route path="products/create" element={<SimpleProductEditor key="new-product" />} />
            <Route path="products/edit/:id" element={<SimpleProductEditor />} />
            <Route path="products/advanced/:id" element={<ProductEditor />} />
            <Route path="projects" element={<ShopList kind="projects" />} />
            <Route path="projects/create" element={<ProjectEditor key="new-project" />} />
            <Route path="projects/edit/:id" element={<ProjectEditor />} />
            <Route path="project-guides" element={<ShopList kind="project-guides" />} />
            <Route path="project-guides/create" element={<GuideEditor key="new-guide" />} />
            <Route path="project-guides/edit/:id" element={<GuideEditor />} />
            <Route path="store-orders" element={<StoreOrders />} />
            <Route path="store-orders/:number" element={<StoreOrderDetail />} />
            <Route path="customers" element={<Customers />} />
            <Route path="tutor-bookings" element={<TutorBookingsPage />} />
            <Route path="tutors" element={<TutorsPage />} />
            <Route path="change-password" element={<ChangePassword onDone={onLogout} />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
      </div>
    </div>
  )
}
