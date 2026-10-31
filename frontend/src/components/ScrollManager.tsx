import { useEffect, useRef } from 'react'
import { useLocation, useNavigationType } from 'react-router-dom'
import { trackPath } from '../lib/nav'

/**
 * Scroll behaviour for every route: a new page opens at the top, and Back / Forward returns to the exact
 * place the visitor was (the browser's own restoration is off because pages are rendered after they load).
 */
export function ScrollManager() {
  const { key, pathname, hash } = useLocation()
  const type = useNavigationType()
  const lastPath = useRef(pathname)

  useEffect(() => {
    if ('scrollRestoration' in history) history.scrollRestoration = 'manual'
  }, [])

  useEffect(() => {
    const save = () => {
      try {
        sessionStorage.setItem(`sy:${key}`, String(Math.round(window.scrollY)))
      } catch {
        /* storage blocked: Back simply opens at the top */
      }
    }
    window.addEventListener('scroll', save, { passive: true })
    return () => window.removeEventListener('scroll', save)
  }, [key])

  useEffect(() => {
    const changed = lastPath.current !== pathname
    lastPath.current = pathname
    trackPath(pathname)
    if (type === 'POP') {
      let y = 0
      try {
        y = Number(sessionStorage.getItem(`sy:${key}`) || 0)
      } catch {
        /* ignore */
      }
      if (y <= 0) return
      let tries = 0
      const t = setInterval(() => {
        window.scrollTo(0, y)
        if (Math.abs(window.scrollY - y) < 4 || ++tries > 30) clearInterval(t)
      }, 60)
      return () => clearInterval(t)
    }
    if (changed && !hash) window.scrollTo(0, 0)
    if (hash && pathname !== '/') {
      // in-site link to a section of another page (for example /interview-prep/<course>/#certificate)
      let tries = 0
      const t = setInterval(() => {
        const el = document.getElementById(decodeURIComponent(hash.slice(1)))
        if (el) {
          el.scrollIntoView({ block: 'start' })
          clearInterval(t)
        } else if (++tries > 25) clearInterval(t)
      }, 80)
      return () => clearInterval(t)
    }
  }, [key, pathname, hash, type])

  return null
}
