import { useEffect, useRef } from 'react'

/**
 * Progressive enhancement for location pages: reading-progress bar, scroll-reveal and an active-section
 * highlight. Nothing is hidden until this runs, so the prerendered HTML stays fully visible without JavaScript.
 */
export function LocationFx() {
  const bar = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches

    function onScroll() {
      const h = document.documentElement.scrollHeight - window.innerHeight
      if (bar.current) bar.current.style.transform = `scaleX(${h > 0 ? Math.min(1, window.scrollY / h) : 0})`
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    onScroll()

    // Sections are always visible (no fade-in on scroll), so every visitor sees the full guide straight away.

    const links = Array.from(document.querySelectorAll<HTMLAnchorElement>('.loc-jump a'))
    const targets = links.map((a) => document.getElementById(a.hash.slice(1))).filter((x): x is HTMLElement => !!x)
    let spyIo: IntersectionObserver | null = null
    if (targets.length && 'IntersectionObserver' in window) {
      spyIo = new IntersectionObserver(
        (entries) => {
          for (const e of entries) {
            if (!e.isIntersecting) continue
            links.forEach((a) => a.classList.toggle('is-active', a.hash === `#${e.target.id}`))
          }
        },
        { rootMargin: '-25% 0px -65% 0px' },
      )
      targets.forEach((t) => spyIo?.observe(t))
    }

    const counters = Array.from(document.querySelectorAll<HTMLElement>('[data-count]'))
    let countIo: IntersectionObserver | null = null
    if (!reduce && counters.length && 'IntersectionObserver' in window) {
      countIo = new IntersectionObserver((entries) => {
        for (const e of entries) {
          if (!e.isIntersecting) continue
          const el = e.target as HTMLElement
          countIo?.unobserve(el)
          const to = Number(el.dataset.count)
          const start = performance.now()
          const tick = (now: number) => {
            const p = Math.min(1, (now - start) / 1100)
            el.textContent = String(Math.round(to * (1 - Math.pow(1 - p, 3))))
            if (p < 1) requestAnimationFrame(tick)
          }
          requestAnimationFrame(tick)
        }
      })
      counters.forEach((c) => countIo?.observe(c))
    }

    return () => {
      window.removeEventListener('scroll', onScroll)
      spyIo?.disconnect()
      countIo?.disconnect()
    }
  }, [])

  return <div className="lv-progress" ref={bar} aria-hidden="true"></div>
}
