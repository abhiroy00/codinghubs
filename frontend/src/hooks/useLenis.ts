import Lenis from 'lenis'
import { useEffect, useRef } from 'react'

/** Global smooth-scroll + in-page anchor handling, ported from main.js. */
export function useLenis() {
  const lenisRef = useRef<Lenis | null>(null)

  useEffect(() => {
    const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches
    if (reduce) return

    const lenis = new Lenis({ duration: 1.15, easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)) })
    lenisRef.current = lenis

    let raf = requestAnimationFrame(tick)
    function tick(time: number) {
      lenis.raf(time)
      raf = requestAnimationFrame(tick)
    }

    const onClick = (e: MouseEvent) => {
      if (e.defaultPrevented) return
      const a = (e.target as HTMLElement).closest('a[href*="#"]') as HTMLAnchorElement | null
      if (!a) return
      const url = new URL(a.href, location.href)
      if (url.pathname !== location.pathname || !url.hash || url.hash === '#') return
      const target = document.getElementById(url.hash.slice(1))
      if (!target) return
      e.preventDefault()
      lenis.scrollTo(target, { offset: -72 })
    }
    document.addEventListener('click', onClick)

    return () => {
      cancelAnimationFrame(raf)
      document.removeEventListener('click', onClick)
      lenis.destroy()
      lenisRef.current = null
    }
  }, [])

  return lenisRef
}
