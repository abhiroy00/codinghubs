import { useEffect, useRef } from 'react'

/** Thin gradient line at the very top of the window that fills as the page is scrolled. */
export function ScrollProgress() {
  const bar = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const onScroll = () => {
      const h = document.documentElement.scrollHeight - window.innerHeight
      if (bar.current) bar.current.style.transform = `scaleX(${h > 0 ? Math.min(1, window.scrollY / h) : 0})`
    }
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])
  return <div className="sp-bar" ref={bar} aria-hidden="true" />
}
