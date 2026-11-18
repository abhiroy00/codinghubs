import { useEffect, useState } from 'react'
import { api } from '../lib/api'

export type FeedItem = {
  title: string
  url: string
  summary: string
  published_at: string
  categories: string[]
  source: string
  source_name: string
  source_url: string
}
export type FeedPayload = {
  refreshed_at: string | null
  stale: boolean
  categories: { id: string; label: string; count: number }[]
  sources: { id: string; name: string; url: string; ok: boolean; fetched_at: string | null }[]
  items: FeedItem[]
}

const PAGE = 12
const date = (value: string) => new Date(value).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })

/**
 * Technology news from allowlisted publishers (backend apps/newsletter/feeds.py). The server validates,
 * classifies and de-duplicates every item; this only renders plain text and links to the original article.
 * Independent of the email subscription form.
 */
export function TechFeed() {
  const [data, setData] = useState<FeedPayload | null>(null)
  const [error, setError] = useState(false)
  const [retry, setRetry] = useState(0)
  const [category, setCategory] = useState('')
  const [shown, setShown] = useState(PAGE)

  useEffect(() => {
    let active = true
    api.get<FeedPayload>('/newsletter/feed/')
      .then((r) => {
        if (!active) return
        // Treat anything that is not the documented shape as a failure, never as an empty feed.
        if (r.data && Array.isArray(r.data.items) && Array.isArray(r.data.categories) && Array.isArray(r.data.sources)) setData(r.data)
        else setError(true)
      })
      .catch(() => { if (active) setError(true) })
    return () => { active = false }
  }, [retry])

  const labels = new Map(data?.categories.map((c) => [c.id, c.label]))
  const items = (data?.items ?? []).filter((item) => !category || item.categories.includes(category))
  const failing = data?.sources.filter((s) => !s.ok) ?? []

  return (
    <section className="tf" aria-labelledby="tf-title" aria-busy={!data && !error}>
      <div className="tf-head">
        <div>
          <p className="tf-kicker">Tech news</p>
          <h2 id="tf-title">What&rsquo;s new in AI, code and cloud</h2>
          <p>Headlines from {data?.sources.length ? data.sources.map((s) => s.name).join(', ') : 'trusted technology publishers'}. Filtered to technology topics only; every link opens the original article.</p>
        </div>
      </div>

      {data && data.categories.length > 0 && (
        <div className="tf-chips" role="group" aria-label="Filter news by topic">
          <button type="button" aria-pressed={!category} onClick={() => { setCategory(''); setShown(PAGE) }}>All <span>{data.items.length}</span></button>
          {data.categories.filter((c) => c.id !== 'education').map((c) => (
            <button key={c.id} type="button" aria-pressed={category === c.id} onClick={() => { setCategory(c.id); setShown(PAGE) }}>
              {c.label} <span>{c.count}</span>
            </button>
          ))}
        </div>
      )}

      {!data && !error && (
        <ul className="tf-grid" aria-hidden="true">
          {Array.from({ length: 6 }, (_, i) => <li key={i} className="tf-card tf-skeleton"><span /><span /><span /></li>)}
        </ul>
      )}
      {!data && !error && <p className="sr-only" role="status">Loading technology news…</p>}

      {error && (
        <p className="tf-note" role="alert">
          Technology news could not be loaded right now. <button type="button" className="tf-link-btn" onClick={() => { setError(false); setRetry((x) => x + 1) }}>Try again</button>
        </p>
      )}

      {data && data.items.length === 0 && (
        <p className="tf-note" role="status">No technology news is available at the moment. Please check back later.</p>
      )}

      {data && (data.stale || failing.length > 0) && data.items.length > 0 && (
        <p className="tf-note tf-muted">
          {data.stale ? 'These headlines may be out of date; we will refresh them shortly.' : `Some sources could not be reached just now (${failing.map((s) => s.name).join(', ')}); showing their latest saved headlines.`}
        </p>
      )}

      {items.length > 0 && (
        <>
          <ul className="tf-grid">
            {items.slice(0, shown).map((item) => (
              <li key={item.url} className="tf-card">
                <p className="tf-meta">
                  <span className="tf-source">{item.source_name}</span>
                  <time dateTime={item.published_at}>{date(item.published_at)}</time>
                </p>
                <h3><a href={item.url} target="_blank" rel="noopener noreferrer">{item.title}<span className="sr-only"> (opens {item.source_name} in a new tab)</span></a></h3>
                {item.summary && <p className="tf-summary">{item.summary}</p>}
                <ul className="tf-tags" aria-label="Topics">
                  {item.categories.map((c) => <li key={c}>{labels.get(c) ?? c}</li>)}
                </ul>
              </li>
            ))}
          </ul>
          {shown < items.length && (
            <p className="tf-more"><button type="button" onClick={() => setShown((n) => n + PAGE)}>Show more headlines</button></p>
          )}
        </>
      )}
    </section>
  )
}
