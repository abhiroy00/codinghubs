import { useMemo, useState, type CSSProperties } from 'react'
import { FS_CSS } from '../../lib/fs-css'
import { useScopedStylesheet } from '../../hooks/useScopedStylesheet'
import { FsHeader } from '../../locations/FsShell'
import { SiteFooter } from '../../components/SiteFooter'
import { AI_TOOLS, AI_TOOL_CATEGORIES, logoColors, type AiTool, type AiToolCategory } from '../../data/ai-tools'
import { LOGO_URL, organizationNode, pageSeo, type PageMeta } from '../../seo/site'
import { useSeo } from '../../seo/useSeo'
import './ai-tools.css'
import { HeroVideo } from '../../components/HeroVideo'

export const AI_TOOLS_META: PageMeta = {
  path: '/ai-tools',
  title: 'AI Tools to Learn: Assistants, Coding & Data | Coding Hubs',
  description: 'The AI assistants, coding tools, data platforms and design apps used in Coding Hubs classes and projects, with links to each official site.',
  image: LOGO_URL,
  indexable: true,
  jsonLd: {
    '@context': 'https://schema.org',
    '@graph': [
      organizationNode(),
      {
        '@type': 'CollectionPage',
        name: 'AI Tools',
        url: 'https://codinghubs.in/ai-tools',
        mainEntity: {
          '@type': 'ItemList',
          itemListElement: AI_TOOLS.map((t, i) => ({ '@type': 'ListItem', position: i + 1, name: t.name, url: t.officialUrl })),
        },
      },
    ],
  },
}
const AI_TOOLS_SEO = pageSeo(AI_TOOLS_META)

/** Rows alternate 4 and 5 cards on wide screens so the grid reads as a staggered wall. */
function stagger<T>(items: T[]) {
  const rows: T[][] = []
  let i = 0
  let size = 4
  while (i < items.length) {
    rows.push(items.slice(i, i + size))
    i += size
    size = size === 4 ? 5 : 4
  }
  // Avoid a lonely single card on the last row: borrow one from the row above.
  const last = rows[rows.length - 1]
  const prev = rows[rows.length - 2]
  if (last && prev && last.length === 1 && prev.length > 3) last.unshift(prev.pop()!)
  return rows
}

function Logo({ tool }: { tool: AiTool }) {
  const { bg, fg } = logoColors(tool.color)
  const style = { '--at-bg': bg, '--at-fg': fg } as CSSProperties
  return (
    <span className="at-logo" style={style} aria-hidden="true">
      {tool.icon ? (
        <span className="at-glyph" style={{ WebkitMaskImage: `url(/assets/ai-tools/${tool.icon}.svg)`, maskImage: `url(/assets/ai-tools/${tool.icon}.svg)` }} />
      ) : (
        <span className="at-mono">{tool.monogram}</span>
      )}
    </span>
  )
}

export function AiTools() {
  useSeo(AI_TOOLS_SEO)
  useScopedStylesheet([FS_CSS])
  const [category, setCategory] = useState<AiToolCategory | ''>('')
  const [query, setQuery] = useState('')
  const shown = useMemo(() => {
    const q = query.trim().toLowerCase()
    return AI_TOOLS.filter((t) => (!category || t.category === category) && (!q || `${t.name} ${t.description} ${t.category}`.toLowerCase().includes(q)))
  }, [category, query])
  const rows = stagger(shown)

  return (
    <div className="fs-page at-page">
      <FsHeader />
      <main id="main">
        <section className="at-band hv-host hv-tall" aria-labelledby="at-title"><HeroVideo clip="ai-tools" />
          <div className="at-stars" aria-hidden="true" />
          <div className="at-in">
            <header className="at-head">
              <h1 id="at-title">
                <span>Master the Tools Behind</span>
                <span className="at-accent">AI Tools</span>
              </h1>
              <p>Get hands-on with the AI assistants, coding tools, data platforms and design apps we use in class and on real projects.</p>
            </header>

            <div className="at-chips" role="group" aria-label="Filter tools by category">
              <button type="button" className={!category ? 'on' : ''} aria-pressed={!category} onClick={() => setCategory('')}>
                All <span>{AI_TOOLS.length}</span>
              </button>
              {AI_TOOL_CATEGORIES.map((c) => (
                <button key={c} type="button" className={category === c ? 'on' : ''} aria-pressed={category === c} onClick={() => setCategory(category === c ? '' : c)}>
                  {c} <span>{AI_TOOLS.filter((t) => t.category === c).length}</span>
                </button>
              ))}
            </div>
            <div className="at-search">
              <label htmlFor="at-q" className="sr-only">Search tools</label>
              <input id="at-q" type="search" placeholder="Search tools, e.g. Python, deployment, design" value={query} maxLength={80} onChange={(e) => setQuery(e.target.value)} />
            </div>
            <p className="at-count" role="status" aria-live="polite">
              Showing {shown.length} {category ? `${category} ` : ''}tool{shown.length === 1 ? '' : 's'}{query.trim() ? ` matching “${query.trim()}”` : ''}
            </p>
            {shown.length === 0 && (
              <p className="at-empty">No tools match. <button type="button" onClick={() => { setQuery(''); setCategory('') }}>Clear search and filters</button></p>
            )}

            <ul className="at-rows" aria-label="Tools">
              {rows.map((row, r) => (
                <li key={r} className="at-row">
                  <ul>
                    {row.map((t) => (
                      <li key={t.id}>
                        <a className="at-card" href={t.officialUrl} target="_blank" rel="noopener noreferrer">
                          <Logo tool={t} />
                          <span className="at-text">
                            <strong>{t.name}</strong>
                            <span>{t.description}</span>
                          </span>
                          <span className="sr-only"> (opens the official site in a new tab)</span>
                          <span className="at-go" aria-hidden="true">↗</span>
                        </a>
                      </li>
                    ))}
                  </ul>
                </li>
              ))}
            </ul>

            <p className="at-note">Each card opens the tool’s official website. Plans and pricing are set by each provider. Logos and names are trademarks of their owners.</p>
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  )
}
