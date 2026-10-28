import { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { adminApi, type Paged } from '../api'
import { ConfirmDelete } from './EditorShell'
import { fmtDate } from './format'
import type { Kind, Row, Status, Taxon } from './types'

const STATUSES: Status[] = ['draft', 'scheduled', 'published', 'archived']
const SORTS = [
  ['-updated', 'Recently updated'],
  ['-date', 'Newest published'],
  ['date', 'Oldest published'],
  ['title', 'Title A–Z'],
  ['status', 'Status'],
] as const

export function ContentList({ kind }: { kind: Kind }) {
  const noun = kind === 'blogs' ? 'blog post' : 'case study'
  const navigate = useNavigate()
  const [q, setQ] = useState('')
  const [dq, setDq] = useState('')
  const [status, setStatus] = useState('')
  const [category, setCategory] = useState('')
  const [ordering, setOrdering] = useState('-updated')
  const [page, setPage] = useState(1)
  const [data, setData] = useState<Paged<Row> | null>(null)
  const [cats, setCats] = useState<Taxon[]>([])
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [del, setDel] = useState<Row | null>(null)
  const [busyId, setBusyId] = useState<number | null>(null)

  useEffect(() => {
    const t = setTimeout(() => {
      setDq(q)
      setPage(1)
    }, 300)
    return () => clearTimeout(t)
  }, [q])
  useEffect(() => {
    if (kind === 'blogs') adminApi.get<Taxon[]>('/blog-categories/').then((r) => setCats(r.data)).catch(() => undefined)
  }, [kind])

  const load = useCallback(() => {
    setError('')
    adminApi
      .get<Paged<Row>>(`/${kind}/`, { params: { page, q: dq || undefined, status: status || undefined, category: category || undefined, ordering } })
      .then((r) => setData(r.data))
      .catch(() => setError('Could not load the list.'))
  }, [kind, page, dq, status, category, ordering])
  useEffect(load, [load])

  const act = async (row: Row, action: 'publish' | 'unpublish') => {
    setBusyId(row.id)
    setNotice('')
    try {
      await adminApi.post(`/${kind}/${row.id}/${action}/`, {})
      setNotice(action === 'publish' ? `“${row.title}” is live.` : `“${row.title}” was unpublished.`)
      load()
    } catch (err) {
      const msg = (err as { response?: { data?: Record<string, string[]> } })?.response?.data
      setError(msg ? Object.values(msg).flat().join(' ') : 'That did not work. Please try again.')
    } finally {
      setBusyId(null)
    }
  }
  const preview = async (row: Row) => {
    const win = window.open('', '_blank')
    try {
      const { data: p } = await adminApi.post<{ url: string }>(`/${kind}/${row.id}/preview/`)
      if (win) win.location.href = p.url
    } catch {
      win?.close()
      setError('Could not open the preview.')
    }
  }
  const remove = async () => {
    if (!del) return
    try {
      await adminApi.delete(`/${kind}/${del.id}/`)
      setNotice(`“${del.title}” was deleted.`)
      setDel(null)
      load()
    } catch {
      setError('Could not delete it. You may not have permission.')
      setDel(null)
    }
  }

  const pages = data ? Math.max(1, Math.ceil(data.count / 20)) : 1
  return (
    <>
      <div className="ad-head">
        <h1 className="ad-h1">{kind === 'blogs' ? 'Blogs' : 'Case studies'}</h1>
        <Link className="ad-btn ad-btn-primary" to={`/${kind}/create`}>
          + New {noun}
        </Link>
      </div>
      <div className="ad-filters">
        <input type="search" placeholder="Search title or URL…" value={q} onChange={(e) => setQ(e.target.value)} aria-label={`Search ${noun}s`} />
        <select value={status} onChange={(e) => { setStatus(e.target.value); setPage(1) }} aria-label="Filter by status">
          <option value="">All statuses</option>
          {STATUSES.map((s) => (
            <option key={s} value={s}>{s[0].toUpperCase() + s.slice(1)}</option>
          ))}
        </select>
        {kind === 'blogs' && (
          <select value={category} onChange={(e) => { setCategory(e.target.value); setPage(1) }} aria-label="Filter by category">
            <option value="">All categories</option>
            {cats.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        )}
        <select value={ordering} onChange={(e) => setOrdering(e.target.value)} aria-label="Sort">
          {SORTS.map(([v, l]) => (
            <option key={v} value={v}>{l}</option>
          ))}
        </select>
      </div>
      {notice && <div className="ad-notice ok" role="status">{notice}</div>}
      {error && <div className="ad-notice error" role="alert">{error}</div>}
      {!data && !error && <p className="ad-muted" role="status">Loading…</p>}
      {data && data.results.length === 0 && (
        <div className="ad-empty">
          <p>{q || status || category ? `No ${noun}s match these filters.` : `No ${noun}s yet.`}</p>
          {!q && !status && !category && <Link className="ad-btn ad-btn-primary" to={`/${kind}/create`}>Write the first one</Link>}
        </div>
      )}
      {data && data.results.length > 0 && (
        <div className="ad-tablewrap">
          <table className="ad-table">
            <thead>
              <tr>
                <th>Title</th>
                <th>Status</th>
                <th>{kind === 'blogs' ? 'Category' : 'Industry'}</th>
                <th>Published</th>
                <th>Updated</th>
                <th><span className="sr-only">Actions</span></th>
              </tr>
            </thead>
            <tbody>
              {data.results.map((r) => {
                const live = r.status === 'published' || r.status === 'scheduled'
                return (
                  <tr key={r.id}>
                    <td>
                      <Link to={`/${kind}/edit/${r.id}`}><strong>{r.title}</strong></Link>
                      {r.is_featured && <span className="ad-badge tone-pin"> Featured</span>}
                      <br />
                      <small className="ad-muted">/{kind === 'blogs' ? 'blog' : 'case-studies'}/{r.slug}</small>
                    </td>
                    <td><span className={`ad-badge st-${r.status}`}>{r.status}</span></td>
                    <td>{(kind === 'blogs' ? r.category_name : r.industry) || '—'}</td>
                    <td>{fmtDate(r.published_at)}</td>
                    <td>{fmtDate(r.updated_at)}</td>
                    <td className="ad-actions">
                      <button type="button" className="ad-link" onClick={() => navigate(`/${kind}/edit/${r.id}`)}>Edit</button>
                      <button type="button" className="ad-link" onClick={() => void preview(r)}>Preview</button>
                      {live ? (
                        <button type="button" className="ad-link" disabled={busyId === r.id} onClick={() => void act(r, 'unpublish')}>Unpublish</button>
                      ) : (
                        <button type="button" className="ad-link" disabled={busyId === r.id} onClick={() => void act(r, 'publish')}>Publish</button>
                      )}
                      <button type="button" className="ad-link ad-danger" onClick={() => setDel(r)}>Delete</button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
      {data && pages > 1 && (
        <div className="ad-pager">
          <button type="button" className="ad-btn" disabled={page <= 1} onClick={() => setPage(page - 1)}>Previous</button>
          <span>Page {page} of {pages} · {data.count} items</span>
          <button type="button" className="ad-btn" disabled={page >= pages} onClick={() => setPage(page + 1)}>Next</button>
        </div>
      )}
      {del && <ConfirmDelete title={del.title} onCancel={() => setDel(null)} onConfirm={() => void remove()} />}
    </>
  )
}
