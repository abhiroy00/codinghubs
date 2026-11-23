import { useCallback, useEffect, useState } from 'react'
import { isLiveNow, PUBLIC_BASE, publicUrl } from './liveUrl'
import { Link } from 'react-router-dom'
import { adminApi, type Paged } from '../api'
import { ConfirmDelete } from './EditorShell'
import { fmtDate } from './format'
import type { Kind, Row, Status, Taxon } from './types'

const STATUSES: Status[] = ['draft', 'scheduled', 'published', 'archived']
const SORTS = [
  ['-created', 'Newest first'],
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
  const [ordering, setOrdering] = useState('-created')
  const [page, setPage] = useState(1)
  const [data, setData] = useState<Paged<Row> | null>(null)
  const [cats, setCats] = useState<Taxon[]>([])
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [del, setDel] = useState<Row | null>(null)
  const [busyId, setBusyId] = useState<number | null>(null)
  const [gsc, setGsc] = useState<{ configured: boolean } | null>(null)
  const [gscBusy, setGscBusy] = useState(false)
  const [stats, setStats] = useState<{ total: number; published: number; drafts: number } | null>(null)

  useEffect(() => {
    if (q) return
    setDq('') // clearing the box resets the search right away
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
  const loadStats = useCallback(() => {
    const count = (st?: string) => adminApi.get<Paged<Row>>(`/${kind}/`, { params: { page_size: 1, status: st } }).then((r) => r.data.count)
    Promise.all([count(), count('published'), count('draft')])
      .then(([total, published, drafts]) => setStats({ total, published, drafts }))
      .catch(() => setStats(null))
  }, [kind])
  useEffect(loadStats, [loadStats])
  const reload = () => { load(); loadStats() }

  const act = async (row: Row, action: 'publish' | 'unpublish') => {
    setBusyId(row.id)
    setNotice('')
    try {
      await adminApi.post(`/${kind}/${row.id}/${action}/`, {})
      setNotice(action === 'publish' ? `“${row.title}” is live.` : `“${row.title}” was unpublished.`)
      reload()
    } catch (err) {
      const msg = (err as { response?: { data?: Record<string, string[]> } })?.response?.data
      setError(msg ? Object.values(msg).flat().join(' ') : 'That did not work. Please try again.')
    } finally {
      setBusyId(null)
    }
  }
  useEffect(() => {
    if (kind === 'blogs') adminApi.get<{ configured: boolean }>('/blogs/search-console/').then((r) => setGsc(r.data)).catch(() => setGsc(null))
  }, [kind])
  const refreshGoogle = async () => {
    setGscBusy(true)
    setNotice('')
    setError('')
    try {
      const { data: r } = await adminApi.post<{ posts: number; inspected: number; never_checked: number }>('/blogs/search-console/')
      setNotice(`Google data updated: index status checked for ${r.inspected} posts${r.never_checked ? `, ${r.never_checked} still to check — click again` : ''}.`)
      load()
    } catch (err) {
      const detail = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail
      setError(detail ?? 'Could not reach Google Search Console.')
    } finally {
      setGscBusy(false)
    }
  }
  const toggleFeatured = async (row: Row) => {
    setBusyId(row.id)
    setNotice('')
    setError('')
    try {
      await adminApi.patch(`/${kind}/${row.id}/`, { is_featured: !row.is_featured })
      setNotice(row.is_featured ? `“${row.title}” is no longer featured.` : `“${row.title}” is now featured.`)
      reload()
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
      reload()
    } catch {
      setError('Could not delete it. You may not have permission.')
      setDel(null)
    }
  }

  const pages = data ? Math.max(1, Math.ceil(data.count / 20)) : 1
  const plural = kind === 'blogs' ? 'Posts' : 'Case Studies'
  const applyFilter = () => { setDq(q); setPage(1); load() }
  return (
    <div className="cx">
      <div className="cx-stats">
        <div className="cx-stat"><span className="cx-stat-ico blue" aria-hidden="true">▤</span><div><strong>{stats?.total ?? '–'}</strong><span>Total {plural}</span></div></div>
        <div className="cx-stat"><span className="cx-stat-ico green" aria-hidden="true">✔</span><div><strong>{stats?.published ?? '–'}</strong><span>Published</span></div></div>
        <div className="cx-stat"><span className="cx-stat-ico yellow" aria-hidden="true">✎</span><div><strong>{stats?.drafts ?? '–'}</strong><span>Drafts</span></div></div>
      </div>

      <div className="cx-card">
        <header className="cx-card-head">
          <h1><span className="cx-head-ico" aria-hidden="true">▤</span>All {kind === 'blogs' ? 'Blog Posts' : 'Case Studies'}</h1>
          <div className="cx-head-actions">
            {kind === 'blogs' && gsc?.configured && (
              <button type="button" className="cx-btn-outline" disabled={gscBusy} onClick={() => void refreshGoogle()}>{gscBusy ? 'Checking Google…' : 'Refresh Google status'}</button>
            )}
            <Link className="cx-btn-primary" to={`/${kind}/create`}>+ {kind === 'blogs' ? 'Write New Post' : 'Add New Study'}</Link>
          </div>
        </header>

        <form className="cx-filters" role="search" onSubmit={(e) => { e.preventDefault(); applyFilter() }}>
          <input type="search" className="cx-input" placeholder="🔍 Search by title..." value={q} onChange={(e) => setQ(e.target.value)} aria-label={`Search ${noun}s`} />
          {kind === 'blogs' && (
            <select className="cx-input" value={category} onChange={(e) => { setCategory(e.target.value); setPage(1) }} aria-label="Filter by category">
              <option value="">All Categories</option>
              {cats.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          )}
          <select className="cx-input" value={status} onChange={(e) => { setStatus(e.target.value); setPage(1) }} aria-label="Filter by status">
            <option value="">All Status</option>
            {STATUSES.map((s) => <option key={s} value={s}>{s[0].toUpperCase() + s.slice(1)}</option>)}
          </select>
          <select className="cx-input" value={ordering} onChange={(e) => setOrdering(e.target.value)} aria-label="Sort">
            {SORTS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
          <button type="submit" className="cx-btn-primary">Filter</button>
        </form>

        {notice && <div className="ad-notice ok cx-inset" role="status">{notice}</div>}
        {error && <div className="ad-notice error cx-inset" role="alert">{error}</div>}
        {!data && !error && <p className="cx-empty" role="status">Loading…</p>}
        {data && data.results.length === 0 && (
          <div className="cx-empty">
            <p>{q || status || category ? `Is filter se koi ${noun} nahi mila.` : `Abhi koi ${noun} nahi hai.`}</p>
            {!q && !status && !category && <Link className="cx-btn-primary" to={`/${kind}/create`}>Pehla post likho</Link>}
          </div>
        )}
        {data && data.results.length > 0 && (
          <div className="cx-tablewrap">
            <table className="cx-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Thumb</th>
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
                      <td className="cx-num">{(page - 1) * 20 + i + 1}</td>
                      <td>{r.featured_image ? <img className="cx-thumb" src={r.featured_image} alt="" loading="lazy" /> : <span className="cx-thumb cx-thumb-empty" aria-hidden="true">🖼</span>}</td>
                      <td className="cx-title">
                        <Link to={`/${kind}/edit/${r.id}`}>{r.title}</Link>
                        <small>{r.slug}</small>
                      </td>
                      <td>{(kind === 'blogs' ? r.category_name : r.industry) || '—'}</td>
                      <td><span className={`cx-status st-${r.status}`}>{r.status === 'published' ? '✅ ' : r.status === 'scheduled' ? '🕒 ' : r.status === 'draft' ? '📝 ' : ''}{r.status[0].toUpperCase() + r.status.slice(1)}</span></td>
                      <td>{r.is_featured ? <span className="cx-star" title="Featured">⭐</span> : <span className="cx-muted">—</span>}</td>
                      <td className="cx-views" title="Article page views: one per visitor per post every 30 minutes (refreshes and bots excluded)">{(r.view_count ?? 0).toLocaleString('en-IN')}</td>
                      <td className="cx-date">{fmtDate(r.published_at || r.updated_at)}</td>
                      <td>
                        <div className="cx-acts">
                          <Link className="cx-act edit" to={`/${kind}/edit/${r.id}`}><Icon name="edit" />Edit</Link>
                          {live ? (
                            <button type="button" className="cx-act draft" disabled={busy} onClick={() => void act(r, 'unpublish')}><Icon name="pause" />Draft</button>
                          ) : (
                            <button type="button" className="cx-act publish" disabled={busy} onClick={() => void act(r, 'publish')}><Icon name="send" />Publish</button>
                          )}
                          <button type="button" className="cx-act feature" disabled={busy} aria-pressed={r.is_featured} onClick={() => void toggleFeatured(r)}><Icon name="star" />{r.is_featured ? 'Unfeature' : 'Feature'}</button>
                          {liveNow ? (
                            <a className="cx-act view" href={publicUrl(PUBLIC_BASE[kind], r.slug)} target="_blank" rel="noopener noreferrer"><Icon name="eye" />View</a>
                          ) : (
                            <button type="button" className="cx-act view" onClick={() => void preview(r)} title="Private preview (not indexed)"><Icon name="eye" />Preview</button>
                          )}
                          <button type="button" className="cx-act del" onClick={() => setDel(r)} aria-label={`Delete ${r.title}`} title="Delete"><Icon name="trash" /></button>
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
          <div className="cx-pager">
            <button type="button" className="cx-btn-outline" disabled={page <= 1} onClick={() => setPage(page - 1)}>← Previous</button>
            <span>Page {page} of {pages} · {data.count} {plural.toLowerCase()}</span>
            <button type="button" className="cx-btn-outline" disabled={page >= pages} onClick={() => setPage(page + 1)}>Next →</button>
          </div>
        )}
      </div>
      {del && <ConfirmDelete title={del.title} onCancel={() => setDel(null)} onConfirm={() => void remove()} />}
    </div>
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
