import { useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { getCases, PAGE_SIZE, takeInitial, type Card, type Paged } from './api'
import { CardView, Crumbs, PageFrame, Pager, SearchIcon } from './shared'

const initial = typeof document === 'undefined' ? null : takeInitial()

export function CaseList() {
  const [params, setParams] = useSearchParams()
  const page = Math.max(1, Number(params.get('page')) || 1)
  const industry = params.get('industry') ?? ''
  const technology = params.get('technology') ?? ''
  const q = params.get('q') ?? ''
  const seed = useRef(initial?.kind === 'case-list' ? initial : null)
  const [data, setData] = useState<Paged<Card> | null>(seed.current ? { count: seed.current.count ?? 0, results: seed.current.results ?? [], industries: seed.current.industries } : null)
  const [error, setError] = useState(false)
  const [text, setText] = useState(q)

  useEffect(() => {
    document.title = 'Case Studies | Coding Hubs School of AI'
    window.scrollTo(0, 0)
  }, [])

  useEffect(() => {
    const s = seed.current
    if (s && s.page === page && (s.industry ?? '') === industry && (s.q ?? '') === q && !technology) {
      seed.current = null
      return
    }
    let live = true
    setError(false)
    getCases({ page, page_size: PAGE_SIZE, ...(industry ? { industry } : {}), ...(technology ? { technology } : {}), ...(q ? { q } : {}) })
      .then((d) => live && setData((prev) => ({ ...d, industries: d.industries ?? prev?.industries, technologies: d.technologies ?? prev?.technologies })))
      .catch(() => live && setError(true))
    return () => {
      live = false
    }
  }, [page, industry, technology, q])

  useEffect(() => {
    if (text === q) return
    const t = setTimeout(() => {
      const next = new URLSearchParams(params)
      if (text) next.set('q', text)
      else next.delete('q')
      next.delete('page')
      setParams(next)
    }, 350)
    return () => clearTimeout(t)
  }, [text]) // eslint-disable-line react-hooks/exhaustive-deps

  const go = (patch: Record<string, string | null>) => {
    const next = new URLSearchParams(params)
    for (const [k, v] of Object.entries(patch)) v ? next.set(k, v) : next.delete(k)
    if (!('page' in patch)) next.delete('page')
    setParams(next)
  }

  return (
    <PageFrame>
      <Crumbs items={[{ label: 'Home', to: '/' }, { label: 'Case Studies' }]} />
      <h1>Case Studies</h1>
      <p className="bl-lead">Learning and project stories from Coding Hubs School of AI.</p>
      <div className="bl-tools">
        <label className="bl-search">
          <span className="sr-only">Search case studies</span>
          <SearchIcon />
          <input type="search" placeholder="Search case studies" value={text} onChange={(e) => setText(e.target.value)} />
        </label>
        {data?.industries && data.industries.length > 0 && (
          <div className="bl-chips" role="group" aria-label="Industry">
            <button type="button" className={!industry ? 'on' : ''} aria-pressed={!industry} onClick={() => go({ industry: null })}>All industries</button>
            {data.industries.map((i) => (
              <button key={i} type="button" className={industry === i ? 'on' : ''} aria-pressed={industry === i} onClick={() => go({ industry: i })}>{i}</button>
            ))}
          </div>
        )}
        {data?.technologies && data.technologies.length > 0 && (
          <div className="bl-chips" role="group" aria-label="Technology">
            {data.technologies.map((t) => (
              <button key={t} type="button" className={technology === t ? 'on' : ''} aria-pressed={technology === t} onClick={() => go({ technology: technology === t ? null : t })}>{t}</button>
            ))}
          </div>
        )}
      </div>
      {error && <p className="bl-state" role="alert">We could not load the case studies. Please refresh the page.</p>}
      {!data && !error && <p className="bl-state" role="status">Loading…</p>}
      {data && data.count === 0 && <p className="bl-state">{q || industry || technology ? 'No case studies match your filters.' : 'No case studies published yet. Check back soon.'}</p>}
      <div className="bl-grid">{data?.results.map((c) => <CardView key={c.slug} c={c} base="/case-studies" />)}</div>
      {data && <Pager page={page} count={data.count} size={PAGE_SIZE} onPage={(p) => go({ page: p > 1 ? String(p) : null })} />}
    </PageFrame>
  )
}
