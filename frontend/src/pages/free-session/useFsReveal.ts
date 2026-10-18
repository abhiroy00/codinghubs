import { useEffect, type RefObject } from 'react'

/** Ported from initReveal() in free-session/app.js. */
export function useFsReveal(containerRef: RefObject<HTMLElement | null>) {
  useEffect(() => {
    const root = containerRef.current
    if (!root) return
    const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches
    const els = Array.from(root.querySelectorAll<HTMLElement>('.reveal'))

    if (reduce || !('IntersectionObserver' in window)) {
      els.forEach((el) => el.classList.add('in'))
      return
    }

    root.querySelectorAll('.bento, .v-layout').forEach((group) => {
      Array.from(group.querySelectorAll<HTMLElement>('.reveal')).forEach((el, i) => {
        el.style.setProperty('--d', `${i * 0.09}s`)
      })
    })

    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return
          const el = entry.target as HTMLElement
          el.classList.add('in')
          io.unobserve(el)
          setTimeout(() => el.style.removeProperty('--d'), 1500)
        })
      },
      { threshold: 0.18, rootMargin: '0px 0px -40px 0px' },
    )
    els.forEach((el) => io.observe(el))
    return () => io.disconnect()
  }, [containerRef])
}
