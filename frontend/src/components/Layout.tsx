import { useEffect, useState } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { Footer } from './Footer'
import { Header } from './Header'
import { LeadModal } from './LeadModal'
import { LogoWide } from '../locations/FsShell'

export function Layout() {
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
      <div id="preloader" aria-hidden="true" className={loaded ? 'done' : ''}>
        <div className="pl">
          <LogoWide alt="Coding Hubs School of AI" displayWidth={97} style={{ height: '1.75rem', width: 'auto' }} />
          <span className="dot"></span>
        </div>
      </div>
      <Header />

      <main id="main">
        <Outlet />
      </main>

      <Footer />
      <LeadModal />
    </>
  )
}
