import { useEffect, useState } from 'react'
import { adminApi, type Paged } from '../api'
import { fmtDate } from './format'

interface FreeDownloadLead {
  id: number
  full_name: string
  email: string
  mobile_number: string
  resource_name: string
  created_at: string
}

export function FreeDownloadLeads() {
  const [query, setQuery] = useState('')
  const [page, setPage] = useState(1)
  const [data, setData] = useState<Paged<FreeDownloadLead> | null>(null)
  const [error, setError] = useState('')
  useEffect(() => {
    const timer = window.setTimeout(() => {
      adminApi.get('/free-download-leads/', { params: { q: query || undefined, page } })
        .then(({ data: response }) => { setData(response); setError('') })
        .catch(() => setError('Could not load free download requests.'))
    }, 200)
    return () => window.clearTimeout(timer)
  }, [query, page])
  const pageCount = Math.max(1, Math.ceil((data?.count ?? 0) / 20))
  return (
    <>
      <div className="ad-head"><div><h1 className="ad-h1">Free download requests</h1><p className="ad-muted">Visitors who submitted their details to download a free resource. These requests do not create orders or payments.</p></div></div>
      <div className="ad-filters"><input type="search" placeholder="Search name, email, phone or resource" value={query} onChange={(event) => { setQuery(event.target.value); setPage(1) }} aria-label="Search free download requests" /></div>
      {error && <div className="ad-notice error" role="alert">{error}</div>}
      {!data && !error && <p className="ad-muted" role="status">Loading requests…</p>}
      {data && data.results.length === 0 && <div className="ad-empty"><p>{query ? 'No matching download requests.' : 'No free download requests yet.'}</p></div>}
      {data && data.results.length > 0 && <div className="ad-tablewrap"><table className="ad-table"><thead><tr><th>Date</th><th>Resource</th><th>Name</th><th>Email</th><th>Mobile</th></tr></thead><tbody>
        {data.results.map((lead) => <tr key={lead.id}><td>{fmtDate(lead.created_at, true)}</td><td>{lead.resource_name}</td><td>{lead.full_name}</td><td><a href={`mailto:${lead.email}`}>{lead.email}</a></td><td><a href={`tel:${lead.mobile_number.replace(/[^+\d]/g, '')}`}>{lead.mobile_number}</a></td></tr>)}
      </tbody></table></div>}
      {data && pageCount > 1 && <div className="ad-pager"><button type="button" className="ad-btn" disabled={page <= 1} onClick={() => setPage(page - 1)}>Previous</button><span>Page {page} of {pageCount} · {data.count} requests</span><button type="button" className="ad-btn" disabled={page >= pageCount} onClick={() => setPage(page + 1)}>Next</button></div>}
    </>
  )
}
