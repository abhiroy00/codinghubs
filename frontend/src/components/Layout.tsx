import { useEffect, useState } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { Footer } from './Footer'
import { Header } from './Header'
import { LeadModal } from './LeadModal'
import { MobileMenu } from './MobileMenu'

export function Layout() {
  const [scrolled, setScrolled] = useState(false)
  const [progress, setProgress] = useState(0)
  const [menuOpen, setMenuOpen] = useState(false)
  const [loaded, setLoaded] = useState(false)
  const location = useLocation()

  useEffect(() => {
    const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches
    const t = setTimeout(() => setLoaded(true), reduce ? 0 : 550)
    const t2 = setTimeout(() => setLoaded(true), 2500)
    return () => {
      clearTimeout(t)
      clearTimeout(t2)
    }
  }, [])

  useEffect(() => {
    function onScroll() {
      const y = window.scrollY
      const h = document.documentElement.scrollHeight - window.innerHeight
      setScrolled(y > 24)
      setProgress(h > 0 ? y / h : 0)
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    onScroll()
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => {
    document.body.style.overflow = menuOpen ? 'hidden' : ''
  }, [menuOpen])

  useEffect(() => {
    if (location.hash) {
      const el = document.getElementById(location.hash.slice(1))
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' })
        return
      }
    }
    window.scrollTo(0, 0)
  }, [location.pathname, location.hash])

  return (
    <>
      <a href="#main" className="skip">
        Skip to content
      </a>
      <div id="preloader" aria-hidden="true" className={loaded ? 'done' : ''}>
        <div className="pl">
          <svg viewBox="0 0 100 100" fill="none">
            <path d="M44 20 L16 50 L44 80" stroke="#111218" strokeWidth="15" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M72 18 L52 70" stroke="#111218" strokeWidth="15" strokeLinecap="round" />
            <circle cx="80" cy="80" r="9.5" fill="var(--color-brand)" />
          </svg>
          <span className="logo-text" style={{ fontSize: '1.125rem' }}>
            CodingHubs<b>AI</b>
          </span>
          <span className="dot"></span>
        </div>
      </div>
      <div id="progress" aria-hidden="true" style={{ transform: `scaleX(${progress})` }}></div>

      <Header scrolled={scrolled} onOpenMenu={() => setMenuOpen(true)} />
      <MobileMenu open={menuOpen} onClose={() => setMenuOpen(false)} />

      <main id="main">
        <Outlet />
      </main>

      <Footer />
      <LeadModal />
    </>
  )
}
