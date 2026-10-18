export const PHONE = '+91 84488 11540'
export const WA = '918448811540'

export const ARROW_SVG =
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M13 6l6 6-6 6"/></svg>'

export const MARK_SVG =
  '<svg viewBox="0 0 100 100" fill="none" aria-hidden="true"><path d="M44 20 L16 50 L44 80" stroke="currentColor" stroke-width="15" stroke-linecap="round" stroke-linejoin="round"/><path d="M72 18 L52 70" stroke="currentColor" stroke-width="15" stroke-linecap="round"/><circle cx="80" cy="80" r="9.5" fill="var(--color-brand)"/></svg>'

export function Icon({ svg, className }: { svg: string; className?: string }) {
  return <span className={className} aria-hidden="true" dangerouslySetInnerHTML={{ __html: svg }} />
}

export function ArrowIcon() {
  return <Icon svg={ARROW_SVG} />
}

export function Logo() {
  return (
    <span className="logo">
      <Icon svg={MARK_SVG} />
      <span className="logo-text">
        CodingHubs<b>AI</b>
      </span>
      <span className="sr-only">Coding Hubs School of AI home</span>
    </span>
  )
}
