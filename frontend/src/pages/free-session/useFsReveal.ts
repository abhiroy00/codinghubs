import { useEffect, type RefObject } from 'react'

/** Ported from initReveal() in free-session/app.js. */
export function useFsReveal(containerRef: RefObject<HTMLElement | null>) {
  useEffect(() => {
    const root = containerRef.current
    if (!root) return
    const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches
    const timers = new Set<ReturnType<typeof setTimeout>>()

    root.querySelectorAll('.bento, .v-layout').forEach((group) => {
      Array.from(group.querySelectorAll<HTMLElement>('.reveal')).forEach((el, i) => {
        el.style.setProperty('--d', `${i * 0.09}s`)
      })
    })

    const io = !reduce && 'IntersectionObserver' in window ? new IntersectionObserver(
      (entries, observer) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return
          const el = entry.target as HTMLElement
          el.classList.add('in')
          observer.unobserve(el)
          const timer = setTimeout(() => {
            el.style.removeProperty('--d')
            timers.delete(timer)
          }, 1500)
          timers.add(timer)
        })
      },
      { threshold: 0.18, rootMargin: '0px 0px -40px 0px' },
    ) : null
    const observe = (el: HTMLElement) => {
      if (el.classList.contains('in')) return
      if (io) io.observe(el)
      else el.classList.add('in')
    }
    root.querySelectorAll<HTMLElement>('.reveal').forEach(observe)
    // Published projects and reviews arrive after the initial home render.
    const changes = new MutationObserver((records) => {
      for (const record of records) for (const node of record.addedNodes) {
        if (!(node instanceof HTMLElement)) continue
        if (node.matches('.reveal')) observe(node)
        node.querySelectorAll<HTMLElement>('.reveal').forEach(observe)
      }
    })
    changes.observe(root, { childList: true, subtree: true })
    return () => {
      io?.disconnect()
      changes.disconnect()
      timers.forEach(clearTimeout)
    }
  }, [containerRef])
}
