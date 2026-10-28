import { useEffect, useState, type FormEvent } from 'react'
import { NavLink, Navigate, Route, Routes, useNavigate } from 'react-router-dom'
import { adminApi, adminTokens } from './api'
import { BlogEditor } from './content/BlogEditor'
import { CaseEditor } from './content/CaseEditor'
import { ContentList } from './content/ContentList'
import { ContentDashboard } from './content/Dashboard'
import { Taxonomy } from './content/Taxonomy'
import { GuideEditor, ProductEditor, ProjectEditor } from './content/ShopEditors'
import { ShopList } from './content/ShopLists'
import { Coupons, Customers, Inventory, StoreOrderDetail, StoreOrders, StoreOverview, StoreSettings } from './content/StorePages'
import { CoursesPage, DataPage, LeadsPage, Overview } from './pages'
import { TutorBookingsPage } from './TutorBookingsPage'
import { TutorsPage } from './TutorsPage'
import './admin.css'

const NAV = [
  { to: '/', label: 'Overview', icon: 'M3 13h8V3H3v10Zm0 8h8v-6H3v6Zm10 0h8V11h-8v10Zm0-18v6h8V3h-8Z' },
  { to: '/leads', label: 'Leads', icon: 'M16 11a4 4 0 1 0-8 0 4 4 0 0 0 8 0Zm-12 9c0-3.3 3.6-5 8-5s8 1.7 8 5v1H4v-1Z' },
  { to: '/enrollments', label: 'Enrollments', icon: 'M12 3 2 8l10 5 8-4v6h2V8L12 3Zm-6 9.5V16c0 1.7 2.7 3 6 3s6-1.3 6-3v-3.5l-6 3-6-3Z' },
  { to: '/orders', label: 'Orders', icon: 'M7 4h10l1 4H6l1-4ZM5 10h14l-1 10H6L5 10Z' },
  { to: '/users', label: 'Users', icon: 'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm0 2c-4 0-8 2-8 5v1h16v-1c0-3-4-5-8-5Z' },
  { to: '/content', label: 'Content', icon: 'M5 3h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Zm2 4v2h10V7H7Zm0 4v2h10v-2H7Zm0 4v2h6v-2H7Z' },
  { to: '/blogs', label: 'Blogs', icon: 'M4 4h13l3 3v13H4V4Zm3 5v2h10V9H7Zm0 4v2h10v-2H7Z' },
  { to: '/case-studies', label: 'Case studies', icon: 'M4 7h16v13H4V7Zm4-3h8v2H8V4Zm-1 6v2h10v-2H7Z' },
  { to: '/taxonomy', label: 'Categories & tags', icon: 'M3 3h8l10 10-8 8L3 11V3Zm4 3a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3Z' },
  { to: '/shop', label: 'Store overview', icon: 'M4 7h16l-1.5 11a2 2 0 0 1-2 1.7H7.5a2 2 0 0 1-2-1.7L4 7Zm4-3h8l1 3H7l1-3Z' },
  { to: '/products', label: 'Products', icon: 'M12 2 3 6.5v11L12 22l9-4.5v-11L12 2Zm0 2.2 5.9 2.9L12 10 6.1 7.1 12 4.2Z' },
  { to: '/projects', label: 'Projects', icon: 'M4 5h16v3H4V5Zm0 5h16v9H4v-9Zm3 2v2h10v-2H7Z' },
  { to: '/project-guides', label: 'Project guides', icon: 'M5 3h11l3 3v15H5V3Zm3 6v2h8V9H8Zm0 4v2h8v-2H8Z' },
  { to: '/store-orders', label: 'Store orders', icon: 'M7 4h10l1 4H6l1-4ZM5 10h14l-1 10H6L5 10Z' },
  { to: '/inventory', label: 'Inventory', icon: 'M3 3h18v4H3V3Zm1 5h16v13H4V8Zm5 3v2h6v-2H9Z' },
  { to: '/customers', label: 'Customers', icon: 'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm0 2c-4 0-8 2-8 5v1h16v-1c0-3-4-5-8-5Z' },
  { to: '/coupons', label: 'Coupons', icon: 'M3 8a2 2 0 0 0 2-2h14a2 2 0 0 0 2 2v2a2 2 0 0 0 0 4v2a2 2 0 0 0-2 2H5a2 2 0 0 0-2-2v-2a2 2 0 0 0 0-4V8Z' },
  { to: '/store-settings', label: 'Store settings', icon: 'M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8Zm9 4-2.1.7a7 7 0 0 1-.6 1.5l1 2-2 2-2-1a7 7 0 0 1-1.5.6L13 21h-2l-.7-2.1a7 7 0 0 1-1.5-.6l-2 1-2-2 1-2a7 7 0 0 1-.6-1.5L3 12v-2l2.1-.7a7 7 0 0 1 .6-1.5l-1-2 2-2 2 1a7 7 0 0 1 1.5-.6L11 3h2l.7 2.1a7 7 0 0 1 1.5.6l2-1 2 2-1 2a7 7 0 0 1 .6 1.5L21 10v2Z' },
  { to: '/courses', label: 'Courses', icon: 'M4 5h16v3H4V5Zm0 5h16v3H4v-3Zm0 5h10v3H4v-3Z' },
  { to: '/tutor-bookings', label: 'Tutor Bookings', icon: 'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm-8 9c0-3.3 3.6-5 8-5s8 1.7 8 5v1H4v-1Zm14-11h4m-2-2v4' },
  { to: '/tutors', label: 'Tutors', icon: 'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm-8 9c0-3.3 3.6-5 8-5s8 1.7 8 5v1H4v-1Z' },
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
        onDone={(display) => {
          localStorage.setItem('ch_admin_name', display)
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

function Login({ onDone }: { onDone: (name: string) => void }) {
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
      onDone(data.user.name)
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
  return (
    <div className="ad-shell">
      <aside className="ad-side">
        <div className="ad-brand">
          <img src="/assets/coding-hubs-school-of-ai-logo-wide.png" alt="Coding Hubs School of AI" width={720} height={208} />
          <span>Admin</span>
        </div>
        <nav aria-label="Admin sections">
          {NAV.map((n) => (
            <NavLink key={n.to} to={n.to} end={n.to === '/'} className={({ isActive }) => (isActive ? 'on' : '')}>
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d={n.icon} />
              </svg>
              {n.label}
            </NavLink>
          ))}
        </nav>
        <div className="ad-side-foot">
          <a href="/" target="_blank" rel="noopener noreferrer">
            View website ↗
          </a>
          <a href="/admin/" target="_blank" rel="noopener noreferrer">
            Django admin ↗
          </a>
        </div>
      </aside>
      <div className="ad-main">
        <header className="ad-top">
          <p>
            Welcome back, <strong>{name || 'Admin'}</strong>
          </p>
          <button
            type="button"
            className="ad-btn"
            onClick={() => {
              onLogout()
              navigate('/')
            }}
          >
            Log out
          </button>
        </header>
        <main className="ad-content">
          <Routes>
            <Route index element={<Overview />} />
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
            <Route path="taxonomy" element={<Taxonomy />} />
            <Route path="shop" element={<StoreOverview />} />
            <Route path="products" element={<ShopList kind="products" />} />
            <Route path="products/create" element={<ProductEditor key="new-product" />} />
            <Route path="products/edit/:id" element={<ProductEditor />} />
            <Route path="projects" element={<ShopList kind="projects" />} />
            <Route path="projects/create" element={<ProjectEditor key="new-project" />} />
            <Route path="projects/edit/:id" element={<ProjectEditor />} />
            <Route path="project-guides" element={<ShopList kind="project-guides" />} />
            <Route path="project-guides/create" element={<GuideEditor key="new-guide" />} />
            <Route path="project-guides/edit/:id" element={<GuideEditor />} />
            <Route path="store-orders" element={<StoreOrders />} />
            <Route path="store-orders/:number" element={<StoreOrderDetail />} />
            <Route path="inventory" element={<Inventory />} />
            <Route path="customers" element={<Customers />} />
            <Route path="coupons" element={<Coupons />} />
            <Route path="store-settings" element={<StoreSettings />} />
            <Route path="tutor-bookings" element={<TutorBookingsPage />} />
            <Route path="tutors" element={<TutorsPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
      </div>
    </div>
  )
}
