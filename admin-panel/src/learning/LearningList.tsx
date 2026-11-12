import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { adminApi, type Paged } from '../api'
import type { Metadata, Row } from './types'
import './learning-admin.css'

export function LearningList() {
  const [data, setData] = useState<Paged<Row> | null>(null)
  const [metadata, setMetadata] = useState<Metadata | null>(null)
  const [q, setQ] = useState('')
  const [status, setStatus] = useState('')
  const [module, setModule] = useState('')
  const [page, setPage] = useState(1)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  useEffect(() => { let active = true; adminApi.get<Metadata>('/learning/metadata/').then(r => { if (active) setMetadata(r.data) }).catch(() => {}); return () => { active = false } }, [])
  useEffect(() => {
    let active = true
    const timer = setTimeout(() => {
      setLoading(true); setError('')
      adminApi.get<Paged<Row>>('/learning/concepts/', { params: { q, status, module, page } }).then(r => { if (active) setData(r.data) }).catch(() => { if (active) setError('Could not load learning content. Check your account permissions and connection.') }).finally(() => { if (active) setLoading(false) })
    }, 250)
    return () => { active = false; clearTimeout(timer) }
  }, [q, status, module, page])
  return <div className="la-workspace"><header><h1>Engineering curriculum</h1><p>Author and review each concept independently. Saving a draft does not update its published lesson.</p></header><div className="la-filters"><label>Search concepts<input className="ad-input" type="search" value={q} onChange={e => { setQ(e.target.value); setPage(1) }} /></label><label>Module<select className="ad-input" value={module} onChange={e => { setModule(e.target.value); setPage(1) }}><option value="">All modules</option>{metadata?.modules.map(m => <option key={m.id} value={m.id}>{m.number}. {m.title}</option>)}</select></label><label>Editorial status<select className="ad-input" value={status} onChange={e => { setStatus(e.target.value); setPage(1) }}><option value="">All statuses</option>{['not_started', 'draft', 'in_review', 'approved', 'published'].map(s => <option key={s} value={s}>{s.replaceAll('_', ' ')}</option>)}</select></label></div>{error && <p role="alert" className="ad-error">{error}</p>}{loading && <p role="status">Loading concepts…</p>}<div className="la-table"><table><thead><tr><th>Concept</th><th>Module</th><th>Draft status</th><th>Published version</th><th>Draft revision</th></tr></thead><tbody>{data?.results.map(c => <tr key={c.id}><td><Link to={`/learning/${c.id}`}>{c.title}</Link></td><td>{c.module}</td><td>{c.status.replaceAll('_', ' ')}</td><td>{c.published_version || 'Not published'}</td><td>{c.edit_version}</td></tr>)}</tbody></table></div>{data && !data.results.length && <p>No matching concepts.</p>}<nav aria-label="Curriculum pages" className="la-actions"><button className="ad-btn" disabled={loading || page === 1} onClick={() => setPage(p => p - 1)}>Previous</button><span>Page {page} · {data?.count ?? 0} concepts</span><button className="ad-btn" disabled={loading || !data?.next} onClick={() => setPage(p => p + 1)}>Next</button></nav></div>
}
