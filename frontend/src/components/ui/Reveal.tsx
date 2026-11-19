import { useEffect, useRef, type CSSProperties, type ElementType, type ReactNode } from 'react'
import './ui.css'

type RevealProps = {
  children: ReactNode
  as?: ElementType
  className?: string
  /** Delay in ms, or use `stagger` so each direct child enters one after another. */
  delay?: number
  stagger?: boolean
  style?: CSSProperties
} & Record<string, unknown>

/**
 * Scroll reveal using IntersectionObserver + CSS. Content is fully visible without JS (SSR/prerender);
 * the hidden start state is only armed after mount, and reduced-motion users skip the animation.
 */
export function Reveal({ children, as: Tag = 'div', className = '', delay = 0, stagger = false, style, ...rest }: RevealProps) {
  const ref = useRef<HTMLElement>(null)

  useEffect(() => {
    const el = ref.current
    if (!el || window.matchMedia('(prefers-reduced-motion: reduce)').matches || !('IntersectionObserver' in window)) return
    if (stagger) Array.from(el.children).forEach((child, i) => (child as HTMLElement).style.setProperty('--ui-i', String(i)))
    el.classList.add('ui-armed')
    const io = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) return
      el.classList.add('ui-in')
      io.disconnect()
    }, { threshold: 0, rootMargin: '0px 0px -60px 0px' })
    io.observe(el)
    return () => io.disconnect()
  }, [stagger])

  return (
    <Tag ref={ref} className={`${stagger ? 'ui-stagger' : 'ui-reveal'} ${className}`.trim()} style={{ ...style, '--ui-delay': `${delay}ms` } as CSSProperties} {...rest}>
      {children}
    </Tag>
  )
}
