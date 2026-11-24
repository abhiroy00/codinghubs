import { useEffect, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { getCases, PAGE_SIZE, takeInitial, type Card, type Paged } from './api'
import { CardView, HubPlan, HubSearch, PageFrame, Pager } from './shared'
import './blog.css'
import { Reveal } from '../components/ui'

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
      setParams(next, { replace: true })
    }, 350)
    return () => clearTimeout(t)
  }, [text]) // eslint-disable-line react-hooks/exhaustive-deps

  const go = (patch: Record<string, string | null>) => {
    const next = new URLSearchParams(params)
    for (const [k, v] of Object.entries(patch)) {
      if (v) next.set(k, v)
      else next.delete(k)
    }
    if (!('page' in patch)) next.delete('page')
    setParams(next)
  }

  const filters = (label: string, key: 'industry' | 'technology', values: string[] | undefined, current: string, all?: string) =>
    values && values.length > 0 && (
      <nav className="hub-cats" aria-label={label}>
        <h2>{label}</h2>
        <ul>
          {all && <li><button type="button" className={!current ? 'on' : ''} aria-pressed={!current} onClick={() => go({ [key]: null })}>{all}</button></li>}
          {values.map((v) => (
            <li key={v}><button type="button" className={current === v ? 'on' : ''} aria-pressed={current === v} onClick={() => go({ [key]: current === v ? null : v })}>{v}</button></li>
          ))}
        </ul>
      </nav>
    )

  return (
    <PageFrame wide insight>
      <header className="hub-head">
        <p className="ins-kicker">Build · Case studies</p>
        <h1 id="case-studies-title">Case <span>studies</span></h1>
        <p className="hub-lead">Learning and project stories from Coding Hubs School of AI: what learners built, the tools they used and what changed for them.</p>
      </header>
      <div className="hub-layout">
        <div className="hub-tools">
          <HubSearch action="/case-studies" label="Search case studies" value={text} onChange={setText} />
          {filters('Industry', 'industry', data?.industries, industry, 'All industries')}
          {filters('Technology', 'technology', data?.technologies, technology)}
        </div>
        <section className="hub-main" aria-labelledby="case-list-title">
          <h2 id="case-list-title" className="hub-title">{q ? `Results for “${q}”` : 'All case studies'}</h2>
          {error && <p className="ins-state" role="alert">We could not load the case studies. Please refresh the page.</p>}
          {!data && !error && <p className="ins-state" role="status">Loading…</p>}
          {data && data.count === 0 && (q || industry || technology
            ? <p className="ins-state">No case studies match your filters.</p>
            : <div className="hub-empty"><b>Case studies are on the way.</b><p>New case studies will appear here. Meanwhile, see learner projects on <Link to="/our-work">Projects</Link> or read the <Link to="/blog">blog</Link>.</p></div>)}
          <Reveal stagger className="bl-grid hub-grid" key={data ? `${page}-${q}-${industry}-${technology}` : 'loading'}>{data?.results.map((c) => <CardView key={c.slug} c={c} base="/case-studies" />)}</Reveal>
          {data && <Pager page={page} count={data.count} size={PAGE_SIZE} onPage={(p) => go({ page: p > 1 ? String(p) : null })} />}
        </section>
        <HubPlan current="/case-studies" />
      </div>
    </PageFrame>
  )
}
