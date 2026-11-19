import { useEffect, useState, type CSSProperties } from 'react'
import { TOOL_CATEGORIES, TOOLS_SITE, TOOLS_TOTAL, toolUrl, type ToolIcon } from '../data/innovativeTools'
import { AnimatedCard, Reveal } from './ui'
import './innovative-toolkit.css'

const ICONS: Record<ToolIcon, string> = {
  pdf: 'M7 3h7l5 5v13H7zM14 3v5h5M9.5 13h5M9.5 16.5h5',
  image: 'M4 5h16v14H4zM8 10a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3zM4 17l5-5 4 4 2-2 5 5',
  seo: 'M11 4a7 7 0 1 0 0 14 7 7 0 0 0 0-14zM20 20l-4-4M8 11l2 2 4-4',
  code: 'M8 8l-4 4 4 4M16 8l4 4-4 4M13 6l-2 12',
  text: 'M5 6h14M12 6v12M9 18h6',
  calc: 'M6 3h12v18H6zM9 7h6M9 11h.01M12 11h.01M15 11h.01M9 14h.01M12 14h.01M15 14h.01M9 17h.01M12 17h.01M15 17h.01',
  spark: 'M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8zM19 16l.8 2.2L22 19l-2.2.8L19 22l-.8-2.2L16 19l2.2-.8z',
  video: 'M3 6h12v12H3zM15 10l6-3v10l-6-3',
  convert: 'M4 8h13l-3-3M20 16H7l3 3',
  board: 'M4 4h16v12H4zM8 20h8M12 16v4M7 12l3-3 2 2 4-4',
  social: 'M18 8a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM6 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM18 22a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM8.6 13.5l6.8 4M15.4 6.5l-6.8 4',
  invoice: 'M6 3h12v18l-3-2-3 2-3-2-3 2zM9 8h6M9 12h6M9 16h3',
}

function Icon({ kind }: { kind: ToolIcon }) {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={ICONS[kind]} />
    </svg>
  )
}

const CHIP_MS = 2800
const ext = { target: '_blank', rel: 'noopener noreferrer' } as const

export interface InnovativeToolkitProps {
  id?: string
  /** 'light' for the homepage, 'dark' for the dark /ai-tools page. */
  tone?: 'light' | 'dark'
  /** How many category cards to show (the rest are one click away on the tools site). */
  limit?: number
}

/**
 * "Powerful Online Tools, Built by Innovative AI": live stats, category cards that open the toolkit, and a laptop whose
 * screen slowly scrolls a real screenshot of tools.innovativeais.com while featured-tool chips float and rotate around it.
 */
export function InnovativeToolkit({ id = 'online-tools', tone = 'light', limit = 8 }: InnovativeToolkitProps) {
  const [tick, setTick] = useState(0)
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const t = window.setInterval(() => { if (!document.hidden) setTick((n) => n + 1) }, CHIP_MS)
    return () => window.clearInterval(t)
  }, [])
  const featured = TOOL_CATEGORIES.map((c) => ({ ...c.featured, icon: c.icon, color: c.color }))
  const chip = (offset: number) => featured[(tick * 3 + offset) % featured.length]
  const chips = [chip(0), chip(1), chip(2)]
  const shown = TOOL_CATEGORIES.slice(0, limit)

  return (
    <section id={id} className={`itk itk-${tone}`} aria-labelledby={`${id}-title`}>
      <span className="itk-blob itk-blob-a" aria-hidden="true" />
      <span className="itk-blob itk-blob-b" aria-hidden="true" />
      <div className="wrap itk-layout">
        <div className="itk-copy">
          <Reveal>
            <p className="itk-badge"><Icon kind="invoice" /> Our Digital Tools</p>
            <h2 id={`${id}-title`} className="itk-title">Powerful Online Tools, <span>Built by Innovative AI</span></h2>
            <p className="itk-intro">
              Discover {TOOLS_TOTAL}+ free online tools across {TOOL_CATEGORIES.length} categories, made by Innovative AI Solutions, Coding Hub’s technology
              partner, to simplify everyday digital work: PDFs, images, SEO, code and more.
            </p>
            <dl className="itk-stats">
              <div><dt>Online tools</dt><dd>{TOOLS_TOTAL}+</dd></div>
              <div><dt>Categories</dt><dd>{TOOL_CATEGORIES.length}</dd></div>
              <div><dt>Free, in your browser</dt><dd>24/7</dd></div>
            </dl>
          </Reveal>

          <Reveal as="ul" stagger className="itk-cats" aria-label="Tool categories">
            {shown.map((c) => (
              <li key={c.name}>
                <AnimatedCard bare as="a" className="itk-cat" href={toolUrl(c.href)} {...ext} style={{ '--itk-c': c.color } as CSSProperties}>
                  <span className="itk-cat-ico"><Icon kind={c.icon} /></span>
                  <strong>{c.name}</strong>
                  <span>{c.count} tools</span>
                  <span className="sr-only"> (opens tools.innovativeais.com in a new tab)</span>
                </AnimatedCard>
              </li>
            ))}
          </Reveal>

          <div className="itk-ctas">
            <a className="ui-btn ui-btn-primary" href={toolUrl('/tools/')} {...ext}>Explore All Tools <span aria-hidden="true">↗</span></a>
            <a className="ui-btn ui-btn-ghost itk-try" href={toolUrl('/tools/whiteboard/')} {...ext}><span aria-hidden="true">⚡</span> Try a free tool</a>
          </div>
        </div>

        <div className="itk-stage" aria-hidden="true">
          <div className="itk-laptop">
            <div className="itk-screen">
              <div className="itk-bar">
                <span className="itk-dots"><i /><i /><i /></span>
                <span className="itk-url">{TOOLS_SITE.replace('https://', '')}</span>
                <span className="itk-live"><i />Live</span>
              </div>
              <div className="itk-view">
                <img className="itk-shot" src="/assets/innovative-tools/tools-site-960.webp"
                  srcSet="/assets/innovative-tools/tools-site-640.webp 640w, /assets/innovative-tools/tools-site-960.webp 960w"
                  sizes="(max-width: 900px) 90vw, 560px" alt="" width={960} height={1950} loading="lazy" decoding="async" />
              </div>
            </div>
            <div className="itk-base" />
          </div>
          {chips.map((t, i) => (
            <span key={`${i}-${t.name}`} className={`itk-chip itk-chip-${i}`} style={{ '--itk-c': t.color } as CSSProperties}>
              <span className="itk-chip-ico"><Icon kind={t.icon} /></span>{t.name}
            </span>
          ))}
        </div>
      </div>
    </section>
  )
}
