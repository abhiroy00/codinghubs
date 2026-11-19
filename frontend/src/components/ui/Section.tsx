import type { ReactNode } from 'react'
import { Reveal } from './Reveal'
import './ui.css'

export interface SectionProps {
  id?: string
  /** Small pill above the heading. */
  badge?: ReactNode
  title: ReactNode
  subtitle?: ReactNode
  /** id for the heading; the section is labelled by it. Defaults to `${id}-title`. */
  titleId?: string
  align?: 'left' | 'center'
  tone?: 'plain' | 'soft' | 'dark'
  /** Render extra content beside the heading (e.g. a CTA), only for left-aligned sections. */
  aside?: ReactNode
  className?: string
  children?: ReactNode
}

/** Shared page section: soft gradient + blobs, badge, heading, subtext and a scroll reveal. */
export function Section({ id, badge, title, subtitle, titleId, align = 'center', tone = 'plain', aside, className = '', children }: SectionProps) {
  const headingId = titleId ?? (id ? `${id}-title` : undefined)
  return (
    <section id={id} className={`ui-section ui-tone-${tone} ${className}`.trim()} aria-labelledby={headingId}>
      <span className="ui-blob ui-blob-a" aria-hidden="true" />
      <span className="ui-blob ui-blob-b" aria-hidden="true" />
      <Reveal className={`ui-head ui-head-${align}${aside ? ' has-aside' : ''}`}>
        <div className="ui-head-text">
          {badge && <p className="ui-badge"><span aria-hidden="true" />{badge}</p>}
          <h2 id={headingId} className="ui-title">{title}</h2>
          {subtitle && <p className="ui-sub">{subtitle}</p>}
        </div>
        {aside && <div className="ui-head-aside">{aside}</div>}
      </Reveal>
      {children}
    </section>
  )
}
