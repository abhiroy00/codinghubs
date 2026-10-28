import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { adminApi } from '../api'
import { fmtDate } from './format'
import type { ContentStats, Counts } from './types'

function Tile({ label, value, tone }: { label: string; value: number; tone: string }) {
  return (
    <div className={`ad-card tone-${tone}`}>
      <p>{label}</p>
      <strong>{value}</strong>
    </div>
  )
}

function Group({ title, c, to }: { title: string; c: Counts; to: string }) {
  return (
    <section className="ad-panel">
      <div className="ad-head">
        <h2>{title}</h2>
        <Link className="ad-link" to={to}>Manage →</Link>
      </div>
      <div className="ad-cards">
        <Tile label="Total" value={c.total} tone="navy" />
        <Tile label="Published" value={c.published} tone="teal" />
        <Tile label="Drafts" value={c.draft} tone="yellow" />
        <Tile label="Scheduled" value={c.scheduled} tone="blue" />
      </div>
    </section>
  )
}

export function ContentDashboard() {
  const [s, setS] = useState<ContentStats | null>(null)
  const [error, setError] = useState(false)
  useEffect(() => {
    adminApi.get<ContentStats>('/content/stats/').then((r) => setS(r.data)).catch(() => setError(true))
  }, [])
  return (
    <>
      <div className="ad-head">
        <h1 className="ad-h1">Content</h1>
        <div className="ad-head-actions">
          <Link className="ad-btn ad-btn-primary" to="/blogs/create">+ New blog post</Link>
          <Link className="ad-btn" to="/case-studies/create">+ New case study</Link>
        </div>
      </div>
      {error && <div className="ad-notice error" role="alert">Could not load the statistics.</div>}
      {!s && !error && <p className="ad-muted" role="status">Loading…</p>}
      {s && (
        <>
          <div className="ad-grid2">
            <Group title="Blog" c={s.blogs} to="/blogs" />
            <Group title="Case studies" c={s.case_studies} to="/case-studies" />
          </div>
          <section className="ad-panel">
            <h2>Recently updated</h2>
            {s.recent.length === 0 ? (
              <p className="ad-muted">Nothing yet. Write your first post to see it here.</p>
            ) : (
              <table className="ad-table">
                <tbody>
                  {s.recent.map((r) => (
                    <tr key={`${r.kind}-${r.id}`}>
                      <td><Link to={`/${r.kind === 'blog' ? 'blogs' : 'case-studies'}/edit/${r.id}`}>{r.title}</Link></td>
                      <td>{r.kind === 'blog' ? 'Blog' : 'Case study'}</td>
                      <td><span className={`ad-badge st-${r.status}`}>{r.status}</span></td>
                      <td>{fmtDate(r.updated_at, true)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </section>
        </>
      )}
    </>
  )
}
