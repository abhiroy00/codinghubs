import type { ElementType, PointerEvent, ReactNode } from 'react'
import './ui.css'

export type AnimatedCardProps = {
  as?: ElementType
  className?: string
  /** Optional media (usually an <img>); it zooms to 1.05 on hover. */
  media?: ReactNode
  /** Badges overlaid on the media's top-left corner. */
  badges?: ReactNode
  /**
   * Keep the card's own markup, background and border: only the shared motion (lift, glow, press, ripple) is added
   * and children are rendered without the padded body wrapper. Mark an image wrapper with `ui-zoom` to zoom it.
   */
  bare?: boolean
  children: ReactNode
} & Record<string, unknown>

/** Spawns a short-lived ripple at the pointer position; skipped for reduced motion. */
function ripple(event: PointerEvent<HTMLElement>) {
  const card = event.currentTarget
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
  const rect = card.getBoundingClientRect()
  const size = Math.max(rect.width, rect.height)
  const dot = document.createElement('span')
  dot.className = 'ui-ripple'
  dot.setAttribute('aria-hidden', 'true')
  dot.style.cssText = `width:${size}px;height:${size}px;left:${event.clientX - rect.left - size / 2}px;top:${event.clientY - rect.top - size / 2}px`
  card.appendChild(dot)
  dot.addEventListener('animationend', () => dot.remove(), { once: true })
}

/** Card with hover lift (-8px), stronger shadow, gradient border glow, media zoom, tap press and ripple. */
export function AnimatedCard({ as: Tag = 'article', className = '', media, badges, bare = false, children, ...rest }: AnimatedCardProps) {
  return (
    <Tag className={`ui-card${bare ? ' ui-card-bare' : ''} ${className}`.trim()} onPointerDown={ripple} {...rest}>
      {media && (
        <div className="ui-card-media">
          {media}
          {badges && <div className="ui-card-badges">{badges}</div>}
        </div>
      )}
      {bare ? children : <div className="ui-card-body">{children}</div>}
    </Tag>
  )
}
