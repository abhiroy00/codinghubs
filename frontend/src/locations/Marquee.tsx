import { Link } from 'react-router-dom'

export interface MarqueeItem {
  label: string
  href: string
  /** internal route (client-side link) or a plain anchor */
  internal?: boolean
}

/** Infinite horizontal ticker. The list is rendered twice (second copy hidden from assistive tech) so the loop is seamless. */
export function Marquee({ title, items, reverse = false, tone = 'yellow' }: { title: string; items: MarqueeItem[]; reverse?: boolean; tone?: 'yellow' | 'navy' }) {
  return (
    <section className={`mq mq-${tone}${reverse ? ' mq-rev' : ''}`} aria-label={title}>
      <div className="mq-track">
        {[0, 1].map((copy) => (
          <ul key={copy} aria-hidden={copy === 1 ? true : undefined}>
            {items.map((it) => (
              <li key={it.label}>
                {it.internal ? (
                  <Link to={it.href} tabIndex={copy === 1 ? -1 : undefined}>{it.label}</Link>
                ) : (
                  <a href={it.href} tabIndex={copy === 1 ? -1 : undefined}>{it.label}</a>
                )}
              </li>
            ))}
          </ul>
        ))}
      </div>
    </section>
  )
}
