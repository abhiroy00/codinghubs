import { useCallback, useEffect, useState } from 'react'
import { isLiveNow, PUBLIC_BASE, publicUrl } from './liveUrl'
import { Link } from 'react-router-dom'
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
  ['-views', 'Most viewed'],
] as const

export function ContentList({ kind }: { kind: Kind }) {
  const noun = kind === 'blogs' ? 'blog post' : 'case study'
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
  const toggleFeatured = async (row: Row) => {
    setBusyId(row.id)
    setNotice('')
    setError('')
    try {
      await adminApi.patch(`/${kind}/${row.id}/`, { is_featured: !row.is_featured })
      setNotice(row.is_featured ? `“${row.title}” is no longer featured.` : `“${row.title}” is now featured.`)
      load()
    } catch {
      setError('Could not change the featured setting. You may not have permission.')
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
          <table className="ad-table ad-ctable">
            <thead>
              <tr>
                <th className="ad-num">#</th>
                <th>Title</th>
                <th>{kind === 'blogs' ? 'Category' : 'Industry'}</th>
                <th>Status</th>
                <th>Featured</th>
                <th>Views</th>
                <th>Date</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {data.results.map((r, i) => {
                const live = r.status === 'published' || r.status === 'scheduled'
                const liveNow = isLiveNow(r.status, r.published_at)
                const busy = busyId === r.id
                return (
                  <tr key={r.id}>
                    <td className="ad-num">{(page - 1) * 20 + i + 1}</td>
                    <td className="ad-ctitle">
                      <Link to={`/${kind}/edit/${r.id}`}><strong>{r.title}</strong></Link>
                      <small className="ad-muted">{PUBLIC_BASE[kind]}/{r.slug}</small>
                    </td>
                    <td>{(kind === 'blogs' ? r.category_name : r.industry) || '—'}</td>
                    <td><span className={`ad-pill st-${r.status}`}>{r.status === 'published' && <Icon name="check" />}{r.status}</span></td>
                    <td>{r.is_featured ? <span className="ad-star" title="Featured"><Icon name="star" /></span> : <span className="ad-muted">—</span>}</td>
                    <td className="ad-views" title="Article page views, one per visitor session (bots excluded)">{(r.view_count ?? 0).toLocaleString('en-IN')}</td>
                    <td className="nowrap">{fmtDate(r.published_at || r.updated_at)}</td>
                    <td>
                      <div className="ad-row-actions">
                        <Link className="ad-act act-edit" to={`/${kind}/edit/${r.id}`}><Icon name="edit" />Edit</Link>
                        {live ? (
                          <button type="button" className="ad-act act-draft" disabled={busy} onClick={() => void act(r, 'unpublish')}><Icon name="pause" />Draft</button>
                        ) : (
                          <button type="button" className="ad-act act-publish" disabled={busy} onClick={() => void act(r, 'publish')}><Icon name="send" />Publish</button>
                        )}
                        <button type="button" className="ad-act act-feature" disabled={busy} aria-pressed={r.is_featured} onClick={() => void toggleFeatured(r)}><Icon name="star" />{r.is_featured ? 'Unfeature' : 'Feature'}</button>
                        {liveNow ? (
                          <a className="ad-act act-view" href={publicUrl(PUBLIC_BASE[kind], r.slug)} target="_blank" rel="noopener noreferrer" title={publicUrl(PUBLIC_BASE[kind], r.slug)}><Icon name="eye" />View</a>
                        ) : (
                          <button type="button" className="ad-act act-preview" onClick={() => void preview(r)} title="Private preview (not indexed)"><Icon name="eye" />Preview</button>
                        )}
                        <button type="button" className="ad-act act-delete" onClick={() => setDel(r)}><Icon name="trash" />Delete</button>
                      </div>
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

const ICONS = {
  edit: 'M4 20h4L19 9l-4-4L4 16v4zM14 6l4 4',
  pause: 'M8 5v14M16 5v14',
  send: 'M4 12l16-8-6 16-3-7-7-1z',
  star: 'M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9L12 3z',
  eye: 'M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12zM12 15a3 3 0 100-6 3 3 0 000 6z',
  trash: 'M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13',
  check: 'M5 12.5l4.5 4.5L19 7.5',
} as const

function Icon({ name }: { name: keyof typeof ICONS }) {
  const filled = name === 'star'
  return (
    <svg className="ad-ico" viewBox="0 0 24 24" width="15" height="15" aria-hidden="true" fill={filled ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth={filled ? 0 : 2.2} strokeLinecap="round" strokeLinejoin="round">
      <path d={ICONS[name]} />
    </svg>
  )
}
