import { createElement } from 'react'

/** Ported from the `.words` stagger-reveal in main.js. */
export function Words({ text, className = '', as = 'p' }: { text: string; className?: string; as?: 'p' | 'h3' }) {
  const words = text.split(' ')
  return createElement(
    as,
    { className: `words ${className}`.trim() },
    <span aria-hidden="true" key="visible">
      {words.map((w, i) => (
        <span className="w" key={i}>
          <span style={{ transitionDelay: `${i * 70}ms` }}>{w}&nbsp;</span>
        </span>
      ))}
    </span>,
    <span className="sr-only" key="sr">
      {text}
    </span>,
  )
}
