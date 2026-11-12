import { useEffect, useState } from 'react'
import type { Article } from './api'

export function ArticleToc({ items }: { items: Article['toc'] }) {
  const [active, setActive] = useState('')
  useEffect(() => {
    let frame = 0
    const update = () => {
      const offset = (document.getElementById('hdr')?.getBoundingClientRect().height ?? 80) + 48
      let current = items[0]?.id ?? ''
      for (const item of items) {
        const heading = document.getElementById(item.id)
        if (heading && heading.getBoundingClientRect().top <= offset) current = item.id
      }
      setActive(current)
      frame = 0
    }
    const onScroll = () => { if (!frame) frame = requestAnimationFrame(update) }
    update()
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll)
    return () => {
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onScroll)
      cancelAnimationFrame(frame)
    }
  }, [items])
  if (!items.length) return null
  return (
    <nav className="bl-reader-toc" aria-label="On this page">
      <h2>On this page</h2>
      <ol>
        {items.map((item) => (
          <li key={item.id} className={`l${item.level}`}>
            <a href={`#${item.id}`} aria-current={(active || items[0]?.id) === item.id ? 'location' : undefined}>{item.text}</a>
          </li>
        ))}
      </ol>
    </nav>
  )
}
