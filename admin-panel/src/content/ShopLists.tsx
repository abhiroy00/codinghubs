import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { adminApi, type Paged } from '../api'
import { ConfirmDelete } from './EditorShell'
import { fmtDate } from './format'
import type { Kind, Row } from './types'

/* eslint-disable @typescript-eslint/no-explicit-any */
const STATUSES = ['draft', 'scheduled', 'published', 'archived']
const SORTS: [string, string][] = [['-updated', 'Recently updated'], ['-date', 'Newest published'], ['date', 'Oldest published'], ['title', 'Title A–Z'], ['status', 'Status']]

interface Cfg {
  title: string
  noun: string
  path: string
  extra: (r: any) => string
  extraHead: string
  filter?: { name: string; label: string; options: [string, string][] }
}
const CFG: Partial<Record<Kind, Cfg>> = {
  projects: { title: 'Projects', noun: 'project', path: 'projects', extraHead: 'Difficulty', extra: (r) => `${r.difficulty ?? ''}${r.product ? ' · paid' : ''}`, filter: { name: 'difficulty', label: 'All difficulties', options: [['beginner', 'Beginner'], ['intermediate', 'Intermediate'], ['advanced', 'Advanced']] } },
  'project-guides': { title: 'Project guides', noun: 'project guide', path: 'project-guides', extraHead: 'Access', extra: (r) => r.access_type, filter: { name: 'access', label: 'Any access', options: [['free', 'Free'], ['account', 'Account'], ['paid', 'Paid'], ['included', 'Included']] } },
  products: { title: 'Products', noun: 'product', path: 'products', extraHead: 'Type · price', extra: (r) => `${r.product_type} · ₹${r.price}`, filter: { name: 'type', label: 'All types', options: [['digital', 'Digital'], ['physical', 'Physical'], ['mixed', 'Mixed']] } },
}

export function ShopList({ kind }: { kind: Kind }) {
  const cfg = CFG[kind]!
  const [q, setQ] = useState('')
  const [dq, setDq] = useState('')
  const [status, setStatus] = useState('')
  const [extra, setExtra] = useState('')
  const [ordering, setOrdering] = useState('-updated')
  const [page, setPage] = useState(1)
  const [data, setData] = useState<Paged<Row & Record<string, any>> | null>(null)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [del, setDel] = useState<Row | null>(null)

  useEffect(() => {
    const t = setTimeout(() => { setDq(q); setPage(1) }, 300)
    return () => clearTimeout(t)
  }, [q])
  const load = useCallback(() => {
    setError('')
    adminApi.get(`/${cfg.path}/`, { params: { page, q: dq || undefined, status: status || undefined, ordering, ...(extra && cfg.filter ? { [cfg.filter.name]: extra } : {}) } })
      .then((r) => setData(r.data)).catch(() => setError('Could not load the list.'))
  }, [cfg, page, dq, status, ordering, extra])
  useEffect(load, [load])

  const act = async (row: Row, action: 'publish' | 'unpublish') => {
    setNotice('')
    try {
      await adminApi.post(`/${cfg.path}/${row.id}/${action}/`, {})
      setNotice(action === 'publish' ? `“${row.title}” is live.` : `“${row.title}” was unpublished.`)
      load()
    } catch (err) {
      const d = (err as any)?.response?.data
      setError(d ? Object.values(d).flat().join(' ') : 'That did not work.')
    }
  }
  const preview = async (row: Row) => {
    const win = window.open('', '_blank')
    try {
      const { data: p } = await adminApi.post<{ url: string }>(`/${cfg.path}/${row.id}/preview/`)
      if (win) win.location.href = p.url
    } catch {
      win?.close()
      setError('Could not open the preview.')
    }
  }
  const remove = async () => {
    if (!del) return
    try {
      await adminApi.delete(`/${cfg.path}/${del.id}/`)
      setNotice(`“${del.title}” was deleted.`)
    } catch {
      setError('Could not delete it. You may not have permission.')
    }
    setDel(null)
    load()
  }
  const pages = data ? Math.max(1, Math.ceil(data.count / 20)) : 1
  return (
    <>
      <div className="ad-head">
        <h1 className="ad-h1">{cfg.title}</h1>
        <Link className="ad-btn ad-btn-primary" to={`/${kind}/create`}>+ New {cfg.noun}</Link>
      </div>
      <div className="ad-filters">
        <input type="search" placeholder="Search title or URL…" value={q} onChange={(e) => setQ(e.target.value)} aria-label={`Search ${cfg.title}`} />
        <select value={status} onChange={(e) => { setStatus(e.target.value); setPage(1) }} aria-label="Status">
          <option value="">All statuses</option>
          {STATUSES.map((s) => (<option key={s} value={s}>{s[0].toUpperCase() + s.slice(1)}</option>))}
        </select>
        {cfg.filter && (
          <select value={extra} onChange={(e) => { setExtra(e.target.value); setPage(1) }} aria-label={cfg.filter.label}>
            <option value="">{cfg.filter.label}</option>
            {cfg.filter.options.map(([v, l]) => (<option key={v} value={v}>{l}</option>))}
          </select>
        )}
        <select value={ordering} onChange={(e) => setOrdering(e.target.value)} aria-label="Sort">
          {SORTS.map(([v, l]) => (<option key={v} value={v}>{l}</option>))}
        </select>
      </div>
      {notice && <div className="ad-notice ok" role="status">{notice}</div>}
      {error && <div className="ad-notice error" role="alert">{error}</div>}
      {!data && !error && <p className="ad-muted" role="status">Loading…</p>}
      {data && data.results.length === 0 && (
        <div className="ad-empty"><p>{q || status || extra ? 'Nothing matches these filters.' : `No ${cfg.title.toLowerCase()} yet.`}</p>{!q && !status && <Link className="ad-btn ad-btn-primary" to={`/${kind}/create`}>Add the first one</Link>}</div>
      )}
      {data && data.results.length > 0 && (
        <div className="ad-tablewrap">
          <table className="ad-table">
            <thead><tr><th>Title</th><th>Status</th><th>{cfg.extraHead}</th><th>Published</th><th>Updated</th><th><span className="sr-only">Actions</span></th></tr></thead>
            <tbody>
              {data.results.map((r) => {
                const live = r.status === 'published' || r.status === 'scheduled'
                return (
                  <tr key={r.id}>
                    <td><Link to={`/${kind}/edit/${r.id}`}><strong>{r.title}</strong></Link>{r.is_featured && <span className="ad-badge tone-pin"> Featured</span>}<br /><small className="ad-muted">/{r.slug}</small></td>
                    <td><span className={`ad-badge st-${r.status}`}>{r.status}</span></td>
                    <td>{cfg.extra(r) || '—'}</td>
                    <td>{fmtDate(r.published_at)}</td>
                    <td>{fmtDate(r.updated_at)}</td>
                    <td className="ad-actions">
                      <Link className="ad-link" to={`/${kind}/edit/${r.id}`}>Edit</Link>
                      <button type="button" className="ad-link" onClick={() => void preview(r)}>Preview</button>
                      <button type="button" className="ad-link" onClick={() => void act(r, live ? 'unpublish' : 'publish')}>{live ? 'Unpublish' : 'Publish'}</button>
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
        <div className="ad-pager"><button type="button" className="ad-btn" disabled={page <= 1} onClick={() => setPage(page - 1)}>Previous</button><span>Page {page} of {pages} · {data.count} items</span><button type="button" className="ad-btn" disabled={page >= pages} onClick={() => setPage(page + 1)}>Next</button></div>
      )}
      {del && <ConfirmDelete title={del.title} onCancel={() => setDel(null)} onConfirm={() => void remove()} />}
    </>
  )
}
