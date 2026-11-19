import { useEffect, useState, type CSSProperties } from 'react'
import { Link } from 'react-router-dom'
import { AI_TOOLS, AI_TOOL_CATEGORIES, logoColors, type AiTool, type AiToolCategory } from '../../data/ai-tools'
import { FsIcon } from './icons'
import './home-tools.css'

/* Everything below is derived from AI_TOOLS, so adding a tool updates the counts, cards and preview. */
const GROUPS = AI_TOOL_CATEGORIES.map((category) => {
  const tools = AI_TOOLS.filter((t) => t.category === category)
  return { category, tools, lead: tools.find((t) => t.icon) ?? tools[0] }
})
const ROTATE_MS = 3600

function ToolMark({ tool, size = 'md' }: { tool: AiTool; size?: 'sm' | 'md' }) {
  const { bg, fg } = logoColors(tool.color)
  return (
    <span className={`ht-mark ht-mark-${size}`} style={{ '--ht-bg': bg, '--ht-fg': fg } as CSSProperties} aria-hidden="true">
      {tool.icon ? (
        <span className="ht-glyph" style={{ WebkitMaskImage: `url(/assets/ai-tools/${tool.icon}.svg)`, maskImage: `url(/assets/ai-tools/${tool.icon}.svg)` }} />
      ) : (
        <span className="ht-mono">{tool.monogram}</span>
      )}
    </span>
  )
}

const catHref = (c: AiToolCategory) => `/ai-tools?category=${encodeURIComponent(c)}`

/** Split section: live stats + category cards on the left, a laptop previewing the active category on the right. */
export function HomeTools() {
  const [active, setActive] = useState(0)
  const [paused, setPaused] = useState(false)

  // Cycle the preview through categories; stops while the visitor is interacting or prefers reduced motion.
  useEffect(() => {
    if (paused || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const id = window.setInterval(() => setActive((i) => (i + 1) % GROUPS.length), ROTATE_MS)
    return () => window.clearInterval(id)
  }, [paused])

  const group = GROUPS[active]
  const [chipA, chipB, chipC] = [group.tools[0], group.tools[1] ?? group.tools[0], group.tools[2] ?? group.tools[0]]

  return (
    <section className="sec home-tools" id="ai-tools-showcase" aria-labelledby="ht-title">
      <div className="wrap ht-layout">
        <div className="ht-copy">
          <p className="ht-badge"><FsIcon id="i-spark" /> Tools you&rsquo;ll master</p>
          <h2 id="ht-title" className="h2">
            Industry AI Tools, <span className="ht-sub">taught hands-on at Coding Hubs</span>
          </h2>
          <p className="ht-intro">
            Practise on {AI_TOOLS.length} real AI assistants, coding tools, data platforms and deployment services across {GROUPS.length} categories, the same stack teams use at work.
          </p>

          <dl className="ht-stats">
            <div><dt>Tools</dt><dd>{AI_TOOLS.length}</dd></div>
            <div><dt>Categories</dt><dd>{GROUPS.length}</dd></div>
            <div><dt>Hands-on classes</dt><dd>Live</dd></div>
          </dl>

          <ul className="ht-cats" onMouseLeave={() => setPaused(false)}>
            {GROUPS.map((g, i) => (
              <li key={g.category}>
                <Link
                  to={catHref(g.category)}
                  className={`ht-cat${i === active ? ' on' : ''}`}
                  aria-current={i === active ? 'true' : undefined}
                  onMouseEnter={() => { setActive(i); setPaused(true) }}
                  onFocus={() => { setActive(i); setPaused(true) }}
                  onBlur={() => setPaused(false)}
                >
                  <ToolMark tool={g.lead} />
                  <strong>{g.category}</strong>
                  <span>{g.tools.length} tool{g.tools.length === 1 ? '' : 's'}</span>
                </Link>
              </li>
            ))}
          </ul>

          <div className="ht-ctas">
            <Link className="ht-btn ht-btn-primary" to="/ai-tools">Explore all tools <FsIcon id="i-arrow" /></Link>
            <Link className="ht-btn ht-btn-ghost" to={catHref(group.category)}>Browse {group.category}</Link>
          </div>
        </div>

        <div className="ht-stage" aria-hidden="true">
          <div className="ht-laptop">
            <div className="ht-screen">
              <div className="ht-bar">
                <span className="ht-dots"><i /><i /><i /></span>
                <span className="ht-url">codinghubs.in/ai-tools</span>
                <span className="ht-live"><i />Live</span>
              </div>
              <p className="ht-screen-title" key={`t-${active}`}>{group.category}</p>
              <ul className="ht-grid" key={active}>
                {group.tools.slice(0, 6).map((t, i) => (
                  <li key={t.id} style={{ '--d': `${i * 70}ms` } as CSSProperties}>
                    <ToolMark tool={t} size="sm" />
                    <b>{t.name}</b>
                    <small>{t.description}</small>
                  </li>
                ))}
              </ul>
            </div>
            <div className="ht-base" />
          </div>

          <span className="ht-chip ht-chip-a" key={`a-${chipA.id}`}><ToolMark tool={chipA} size="sm" />{chipA.name}</span>
          <span className="ht-chip ht-chip-b" key={`b-${chipB.id}`}><ToolMark tool={chipB} size="sm" />{chipB.name}</span>
          <span className="ht-chip ht-chip-c" key={`c-${chipC.id}`}><ToolMark tool={chipC} size="sm" />{chipC.name}</span>
        </div>
      </div>
    </section>
  )
}
