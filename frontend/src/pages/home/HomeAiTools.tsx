import { useId, useMemo, useState } from 'react'
import { AI_TOOLS, AI_TOOL_CATEGORIES, type AiToolCategory } from '../../data/ai-tools'

const ICON_TONE: Record<AiToolCategory, string> = {
  'AI assistants': 'tone-a',
  Research: 'tone-b',
  Coding: 'tone-c',
  'Data & ML': 'tone-d',
  'Build with LLMs': 'tone-e',
}

/** Directory of AI tools used in class: search by name/description and filter by category (both combine). */
export function HomeAiTools() {
  const searchId = useId()
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState<AiToolCategory | ''>('')
  const q = query.trim().toLowerCase()
  const results = useMemo(
    () => AI_TOOLS.filter((t) => (!category || t.category === category) && (!q || `${t.name} ${t.description}`.toLowerCase().includes(q))),
    [q, category],
  )
  const filtered = Boolean(q || category)
  const reset = () => { setQuery(''); setCategory('') }

  return (
    <section className="hm-sec" id="ai-tools" aria-labelledby="hm-tools-title">
      <div className="hm-wrap">
        <div className="hm-head hm-head-split">
          <div>
            <p className="hm-kicker">AI Tools</p>
            <h2 id="hm-tools-title">AI tools worth knowing</h2>
          </div>
          <p className="hm-lead">A short, hand-picked list of tools that come up in our classes. Search or filter, then open the official site.</p>
        </div>

        <div className="hm-tools-bar">
          <label className="hm-search" htmlFor={searchId}>
            <span className="sr-only">Search AI tools</span>
            <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>
            <input id={searchId} type="search" placeholder="Search tools, e.g. notebooks" value={query} onChange={(e) => setQuery(e.target.value)} />
          </label>
          <div className="hm-chips" role="group" aria-label="Filter tools by category">
            <button type="button" className={!category ? 'is-on' : ''} aria-pressed={!category} onClick={() => setCategory('')}>All</button>
            {AI_TOOL_CATEGORIES.map((c) => (
              <button key={c} type="button" className={category === c ? 'is-on' : ''} aria-pressed={category === c} onClick={() => setCategory(category === c ? '' : c)}>
                {c}
              </button>
            ))}
          </div>
          {filtered && <button type="button" className="hm-reset" onClick={reset}>Reset filters</button>}
        </div>
        <p className="hm-count" role="status" aria-live="polite">
          {results.length} of {AI_TOOLS.length} tools{category ? ` in ${category}` : ''}{q ? ` matching “${query.trim()}”` : ''}
        </p>

        {results.length > 0 ? (
          <ul className="hm-tools">
            {results.map((t) => (
              <li key={t.id} className="hm-tool">
                <div className="hm-tool-top">
                  <span className={`hm-tool-icon ${ICON_TONE[t.category]}`} aria-hidden="true">{t.icon}</span>
                  <div>
                    <h3>{t.name}</h3>
                    <p className="hm-tag">{t.category}</p>
                  </div>
                </div>
                <p>{t.description}</p>
                <a className="hm-link" href={t.officialUrl} target="_blank" rel="noopener noreferrer">
                  Visit Tool<span className="sr-only">: {t.name} (opens in a new tab)</span> <span aria-hidden="true">↗</span>
                </a>
              </li>
            ))}
          </ul>
        ) : (
          <div className="hm-empty">
            <p><strong>No tools match {q ? `“${query.trim()}”` : 'this filter'}{q && category ? ` in ${category}` : ''}.</strong></p>
            <p>Try a different word, or clear the search and filters to see all {AI_TOOLS.length} tools.</p>
            <button type="button" className="hm-btn hm-btn-ghost" onClick={reset}>Show all tools</button>
          </div>
        )}
        <p className="hm-fine">Links open each tool’s official website. Availability, plans and pricing are set by each provider.</p>
      </div>
    </section>
  )
}
