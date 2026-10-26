import { useCallback, useEffect, useMemo, useState } from 'react'
import { adminApi, STATUSES, type Lead, type Paged, type Stats } from './api'

const fmt = new Intl.DateTimeFormat('en-IN', { dateStyle: 'medium', timeStyle: 'short' })
const fmtDay = new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short' })
const when = (iso: string) => fmt.format(new Date(iso))

function useDebounced<T>(value: T, ms = 350) {
  const [v, setV] = useState(value)
  useEffect(() => {
    const t = setTimeout(() => setV(value), ms)
    return () => clearTimeout(t)
  }, [value, ms])
  return v
}

function cleanPhone(p: string) {
  return p.replace(/[^\d]/g, '')
}

function shortSource(src: string) {
  if (!src) return '—'
  return src.replace(/^\/locations\/ai-course-in-/, 'Location: ').replace(/-delhi\/?$/, '').replace(/\/$/, '').replaceAll('-', ' ')
}

/* ---------------- Overview ---------------- */

export function Overview() {
  const [stats, setStats] = useState<Stats | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    adminApi
      .get<Stats>('/stats/')
      .then((r) => setStats(r.data))
      .catch(() => setError('Could not load the overview. Please refresh.'))
  }, [])

  if (error) return <p className="ad-error">{error}</p>
  if (!stats) return <p className="ad-muted">Loading…</p>

  const max = Math.max(1, ...stats.leads_per_day.map((d) => d.count))
  const cards = [
    { label: 'Leads today', value: stats.leads.today, tone: 'yellow' },
    { label: 'Last 7 days', value: stats.leads.last_7_days, tone: 'blue' },
    { label: 'Last 30 days', value: stats.leads.last_30_days, tone: 'purple' },
    { label: 'All-time leads', value: stats.leads.total, tone: 'navy' },
    { label: 'Registered users', value: stats.users, tone: 'teal' },
    { label: 'Enrollments', value: stats.enrollments, tone: 'pink' },
  ]

  return (
    <>
      <h1 className="ad-h1">Overview</h1>
      <div className="ad-cards">
        {cards.map((c) => (
          <div key={c.label} className={`ad-card tone-${c.tone}`}>
            <span>{c.label}</span>
            <strong>{c.value}</strong>
          </div>
        ))}
      </div>

      <div className="ad-grid2">
        <section className="ad-panel">
          <h2>Leads in the last 14 days</h2>
          <svg className="ad-chart" viewBox="0 0 560 190" role="img" aria-label="Bar chart of leads per day for the last 14 days">
            {stats.leads_per_day.map((d, i) => {
              const h = (d.count / max) * 130
              const x = 12 + i * 39
              return (
                <g key={d.date}>
                  <title>{`${fmtDay.format(new Date(d.date))}: ${d.count} lead${d.count === 1 ? '' : 's'}`}</title>
                  <rect x={x} y={150 - h} width="26" height={Math.max(h, 2)} rx="6" className={d.count ? 'bar' : 'bar zero'} />
                  {d.count > 0 && (
                    <text x={x + 13} y={144 - h} textAnchor="middle" className="bar-n">
                      {d.count}
                    </text>
                  )}
                  <text x={x + 13} y="172" textAnchor="middle" className="bar-d">
                    {new Date(d.date).getDate()}
                  </text>
                </g>
              )
            })}
          </svg>
        </section>

        <section className="ad-panel">
          <h2>Pipeline</h2>
          <ul className="ad-pipe">
            {STATUSES.map((s) => (
              <li key={s}>
                <span className={`ad-badge st-${s}`}>{s}</span>
                <div className="ad-meter">
                  <i style={{ width: `${stats.leads.total ? (stats.leads.by_status[s] / stats.leads.total) * 100 : 0}%` }} />
                </div>
                <b>{stats.leads.by_status[s] ?? 0}</b>
              </li>
            ))}
          </ul>
        </section>
      </div>

      <div className="ad-grid2">
        <TopList title="Where leads come from" rows={stats.top_sources} map={shortSource} />
        <TopList title="Courses people ask about" rows={stats.top_courses} map={(s) => s.split(' | ')[0]} />
      </div>

      <section className="ad-panel">
        <h2>Latest leads</h2>
        <div className="ad-tablewrap">
          <table className="ad-table">
            <thead>
              <tr>
                <th>When</th>
                <th>Name</th>
                <th>Phone</th>
                <th>Interest</th>
                <th>Source</th>
              </tr>
            </thead>
            <tbody>
              {stats.recent_leads.map((l) => (
                <tr key={l.id}>
                  <td>{when(l.created_at)}</td>
                  <td>{l.name}</td>
                  <td>
                    <a href={`tel:${l.phone}`}>{l.phone}</a>
                  </td>
                  <td>{l.course || '—'}</td>
                  <td>{shortSource(l.source_page)}</td>
                </tr>
              ))}
              {stats.recent_leads.length === 0 && (
                <tr>
                  <td colSpan={5} className="ad-muted">
                    No leads yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </>
  )
}

function TopList({ title, rows, map }: { title: string; rows: { label: string; count: number }[]; map: (s: string) => string }) {
  const max = Math.max(1, ...rows.map((r) => r.count))
  return (
    <section className="ad-panel">
      <h2>{title}</h2>
      {rows.length === 0 && <p className="ad-muted">Nothing yet.</p>}
      <ul className="ad-top-list">
        {rows.map((r) => (
          <li key={r.label}>
            <span title={r.label}>{map(r.label)}</span>
            <div className="ad-meter">
              <i style={{ width: `${(r.count / max) * 100}%` }} />
            </div>
            <b>{r.count}</b>
          </li>
        ))}
      </ul>
    </section>
  )
}

/* ---------------- Leads ---------------- */

export function LeadsPage() {
  const [q, setQ] = useState('')
  const [status, setStatus] = useState('')
  const [mode, setMode] = useState('')
  const [source, setSource] = useState('')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [page, setPage] = useState(1)
  const [data, setData] = useState<Paged<Lead> | null>(null)
  const [error, setError] = useState('')
  const [editing, setEditing] = useState<Lead | null>(null)
  const dq = useDebounced(q)
  const dsource = useDebounced(source)

  const params = useMemo(() => {
    const p: Record<string, string> = {}
    if (dq) p.q = dq
    if (status) p.status = status
    if (mode) p.mode = mode
    if (dsource) p.source = dsource
    if (from) p.from = from
    if (to) p.to = to
    return p
  }, [dq, status, mode, dsource, from, to])

  useEffect(() => setPage(1), [params])

  const load = useCallback(() => {
    adminApi
      .get<Paged<Lead>>('/leads/', { params: { ...params, page } })
      .then((r) => {
        setData(r.data)
        setError('')
      })
      .catch(() => setError('Could not load leads.'))
  }, [params, page])
  useEffect(load, [load])

  async function setLeadStatus(lead: Lead, value: Lead['status']) {
    setData((d) => d && { ...d, results: d.results.map((l) => (l.id === lead.id ? { ...l, status: value } : l)) })
    try {
      await adminApi.patch(`/leads/${lead.id}/`, { status: value })
    } catch {
      load()
    }
  }

  async function saveNotes(lead: Lead, notes: string) {
    const { data: updated } = await adminApi.patch<Lead>(`/leads/${lead.id}/`, { notes })
    setData((d) => d && { ...d, results: d.results.map((l) => (l.id === lead.id ? updated : l)) })
    setEditing(null)
  }

  async function remove(lead: Lead) {
    if (!window.confirm(`Delete the lead from ${lead.name}? This cannot be undone.`)) return
    await adminApi.delete(`/leads/${lead.id}/`)
    load()
  }

  async function exportCsv() {
    const res = await adminApi.get('/leads/export/', { params, responseType: 'blob' })
    const url = URL.createObjectURL(res.data)
    const a = document.createElement('a')
    a.href = url
    a.download = 'coding-hubs-leads.csv'
    a.click()
    URL.revokeObjectURL(url)
  }

  const pages = data ? Math.max(1, Math.ceil(data.count / 25)) : 1

  return (
    <>
      <div className="ad-head">
        <h1 className="ad-h1">Leads</h1>
        <button type="button" className="ad-btn" onClick={exportCsv}>
          Export CSV
        </button>
      </div>

      <div className="ad-filters">
        <input type="search" placeholder="Search name, phone, course…" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search leads" />
        <select value={status} onChange={(e) => setStatus(e.target.value)} aria-label="Status">
          <option value="">All statuses</option>
          {STATUSES.map((s) => (
            <option key={s}>{s}</option>
          ))}
        </select>
        <select value={mode} onChange={(e) => setMode(e.target.value)} aria-label="Type">
          <option value="">All types</option>
          <option value="demo">Free demo</option>
          <option value="expert">Talk to expert</option>
        </select>
        <input type="search" placeholder="Source contains… (e.g. locations)" value={source} onChange={(e) => setSource(e.target.value)} aria-label="Source page" />
        <label>
          From <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
        </label>
        <label>
          To <input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
        </label>
      </div>

      {error && <p className="ad-error">{error}</p>}
      <div className="ad-tablewrap">
        <table className="ad-table">
          <thead>
            <tr>
              <th>When</th>
              <th>Name</th>
              <th>Contact</th>
              <th>Interest</th>
              <th>Source</th>
              <th>Status</th>
              <th>Notes</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {data?.results.map((l) => (
              <tr key={l.id}>
                <td className="nowrap">{when(l.created_at)}</td>
                <td>
                  <strong>{l.name}</strong>
                  <small className="ad-muted">{l.mode === 'demo' ? 'Free demo' : 'Talk to expert'}</small>
                </td>
                <td className="nowrap">
                  <a href={`tel:${l.phone}`}>{l.phone}</a>
                  <a className="ad-wa" href={`https://wa.me/${cleanPhone(l.phone)}`} target="_blank" rel="noopener noreferrer">
                    WhatsApp
                  </a>
                </td>
                <td className="wrap">{l.course || '—'}</td>
                <td className="wrap">{shortSource(l.source_page)}</td>
                <td>
                  <select className={`ad-status st-${l.status}`} value={l.status} onChange={(e) => setLeadStatus(l, e.target.value as Lead['status'])} aria-label={`Status for ${l.name}`}>
                    {STATUSES.map((s) => (
                      <option key={s}>{s}</option>
                    ))}
                  </select>
                </td>
                <td className="wrap">
                  <button type="button" className="ad-link" onClick={() => setEditing(l)}>
                    {l.notes ? l.notes.slice(0, 40) + (l.notes.length > 40 ? '…' : '') : 'Add note'}
                  </button>
                </td>
                <td>
                  <button type="button" className="ad-icon-btn" onClick={() => remove(l)} aria-label={`Delete lead ${l.name}`} title="Delete">
                    ✕
                  </button>
                </td>
              </tr>
            ))}
            {data && data.results.length === 0 && (
              <tr>
                <td colSpan={8} className="ad-muted">
                  No leads match these filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="ad-pager">
        <span>{data ? `${data.count} lead${data.count === 1 ? '' : 's'}` : 'Loading…'}</span>
        <div>
          <button type="button" className="ad-btn" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
            ← Prev
          </button>
          <span>
            Page {page} of {pages}
          </span>
          <button type="button" className="ad-btn" disabled={page >= pages} onClick={() => setPage((p) => p + 1)}>
            Next →
          </button>
        </div>
      </div>

      {editing && <NoteDialog lead={editing} onClose={() => setEditing(null)} onSave={saveNotes} />}
    </>
  )
}

function NoteDialog({ lead, onClose, onSave }: { lead: Lead; onClose: () => void; onSave: (l: Lead, notes: string) => Promise<void> }) {
  const [text, setText] = useState(lead.notes)
  const [busy, setBusy] = useState(false)
  return (
    <div className="ad-modal" role="dialog" aria-modal="true" aria-label={`Notes for ${lead.name}`} onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="ad-modal-card">
        <h2>Notes · {lead.name}</h2>
        <p className="ad-muted">
          {lead.phone} · {lead.course || 'No course noted'}
        </p>
        <textarea rows={6} value={text} onChange={(e) => setText(e.target.value)} autoFocus placeholder="Call outcome, follow-up date, budget questions…" />
        <div className="ad-modal-actions">
          <button type="button" className="ad-btn" onClick={onClose}>
            Cancel
          </button>
          <button
            type="button"
            className="ad-btn ad-btn-primary"
            disabled={busy}
            onClick={async () => {
              setBusy(true)
              await onSave(lead, text)
            }}
          >
            {busy ? 'Saving…' : 'Save note'}
          </button>
        </div>
      </div>
    </div>
  )
}

/* ---------------- Generic table pages ---------------- */

interface Column {
  key: string
  label: string
  date?: boolean
  badge?: boolean
  bool?: boolean
}

export function DataPage({
  title,
  endpoint,
  columns,
  searchable,
  filters,
}: {
  title: string
  endpoint: string
  columns: Column[]
  searchable?: boolean
  filters?: { name: string; label: string; options: string[] }[]
}) {
  const [q, setQ] = useState('')
  const [extra, setExtra] = useState<Record<string, string>>({})
  const [page, setPage] = useState(1)
  const [data, setData] = useState<Paged<Record<string, unknown>> | null>(null)
  const [error, setError] = useState('')
  const dq = useDebounced(q)

  useEffect(() => setPage(1), [dq, extra])
  useEffect(() => {
    adminApi
      .get<Paged<Record<string, unknown>>>(endpoint, { params: { ...extra, q: dq || undefined, page } })
      .then((r) => {
        setData(r.data)
        setError('')
      })
      .catch(() => setError(`Could not load ${title.toLowerCase()}.`))
  }, [endpoint, extra, dq, page, title])

  const pages = data ? Math.max(1, Math.ceil(data.count / 25)) : 1

  return (
    <>
      <h1 className="ad-h1">{title}</h1>
      {(searchable || filters) && (
        <div className="ad-filters">
          {searchable && <input type="search" placeholder={`Search ${title.toLowerCase()}…`} value={q} onChange={(e) => setQ(e.target.value)} aria-label={`Search ${title}`} />}
          {filters?.map((f) => (
            <select key={f.name} value={extra[f.name] ?? ''} onChange={(e) => setExtra((x) => ({ ...x, [f.name]: e.target.value }))} aria-label={f.label}>
              <option value="">{f.label}</option>
              {f.options.map((o) => (
                <option key={o}>{o}</option>
              ))}
            </select>
          ))}
        </div>
      )}
      {error && <p className="ad-error">{error}</p>}
      <div className="ad-tablewrap">
        <table className="ad-table">
          <thead>
            <tr>
              {columns.map((c) => (
                <th key={c.key}>{c.label}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data?.results.map((row, i) => (
              <tr key={String(row.id ?? i)}>
                {columns.map((c) => {
                  const v = row[c.key]
                  return (
                    <td key={c.key} className={c.date ? 'nowrap' : ''}>
                      {c.date ? when(String(v)) : c.bool ? (v ? 'Yes' : '—') : c.badge ? <span className={`ad-badge st-${String(v)}`}>{String(v || '—')}</span> : String(v ?? '') || '—'}
                    </td>
                  )
                })}
              </tr>
            ))}
            {data && data.results.length === 0 && (
              <tr>
                <td colSpan={columns.length} className="ad-muted">
                  Nothing here yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <div className="ad-pager">
        <span>{data ? `${data.count} total` : 'Loading…'}</span>
        <div>
          <button type="button" className="ad-btn" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
            ← Prev
          </button>
          <span>
            Page {page} of {pages}
          </span>
          <button type="button" className="ad-btn" disabled={page >= pages} onClick={() => setPage((p) => p + 1)}>
            Next →
          </button>
        </div>
      </div>
    </>
  )
}

/* ---------------- Courses ---------------- */

interface CourseRow {
  id: number
  name: string
  category: string
  duration_display: string
  is_active: boolean
}

export function CoursesPage() {
  const [rows, setRows] = useState<CourseRow[] | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    adminApi
      .get<CourseRow[] | Paged<CourseRow>>('/courses/')
      .then((r) => setRows(Array.isArray(r.data) ? r.data : r.data.results))
      .catch(() => setError('Could not load courses.'))
  }, [])

  async function toggle(c: CourseRow) {
    setRows((rs) => rs && rs.map((x) => (x.id === c.id ? { ...x, is_active: !c.is_active } : x)))
    try {
      await adminApi.patch(`/courses/${c.id}/`, { is_active: !c.is_active })
    } catch {
      setRows((rs) => rs && rs.map((x) => (x.id === c.id ? { ...x, is_active: c.is_active } : x)))
    }
  }

  return (
    <>
      <h1 className="ad-h1">Courses</h1>
      <p className="ad-muted">Switch a course off to hide it from the website catalogue and checkout.</p>
      {error && <p className="ad-error">{error}</p>}
      <div className="ad-tablewrap">
        <table className="ad-table">
          <thead>
            <tr>
              <th>Course</th>
              <th>Category</th>
              <th>Duration</th>
              <th>Visible</th>
            </tr>
          </thead>
          <tbody>
            {rows?.map((c) => (
              <tr key={c.id}>
                <td>
                  <strong>{c.name}</strong>
                </td>
                <td>{c.category}</td>
                <td>{c.duration_display || '—'}</td>
                <td>
                  <button type="button" className={`ad-switch${c.is_active ? ' on' : ''}`} role="switch" aria-checked={c.is_active} aria-label={`${c.name} visible`} onClick={() => toggle(c)}>
                    <i />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  )
}
