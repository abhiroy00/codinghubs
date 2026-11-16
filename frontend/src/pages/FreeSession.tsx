import { useEffect, useRef, useState } from 'react'
import { SITE_FONTS } from '../lib/fonts'
import { useLocation } from 'react-router-dom'
import { useLenisRef } from '../lib/lenis-context'
import { useRegisterPopup } from '../lib/register-popup'
import { FS_CSS } from '../lib/fs-css'
import { useScopedStylesheet } from '../hooks/useScopedStylesheet'
import { FsFooter } from '../locations/FsShell'
import { Header } from '../components/Header'
import { BatchAnnouncement } from './free-session/JoinHero'
import './free-session/home.css'
import './free-session/home-theme.css'
import { useFsReveal } from './free-session/useFsReveal'
import { HomeAbout, HomeDemoClasses, HomeFaq, HomeGuidedProjects, HomeHero, HomeHow, HomePathways, HomePrograms, HomeReviews, HomeSession, HomeVisit, HomeWhy } from './home/HomeSections'
import { HomeOurWork } from './home/HomeOurWork'
import { HomeAiTools } from './home/HomeAiTools'
import './home/home.css'
import { HOME_META, pageSeo } from '../seo/site'
import { useSeo } from '../seo/useSeo'

const HOME_SEO = pageSeo(HOME_META)

export function FreeSession() {
  useSeo(HOME_SEO)
  useScopedStylesheet([
    FS_CSS,
    SITE_FONTS,
  ])

  const rootRef = useRef<HTMLDivElement>(null)
  const lenisRef = useLenisRef()
  const popup = useRegisterPopup()
  const location = useLocation()
  useFsReveal(rootRef)

  const [pastHero, setPastHero] = useState(false)

  useEffect(() => {
    if (!('IntersectionObserver' in window)) return
    const heroTopEl = rootRef.current?.querySelector('.join-copy')
    const io2 = heroTopEl
      ? new IntersectionObserver(([en]) => setPastHero(!en.isIntersecting && en.boundingClientRect.top < 0))
      : null
    if (heroTopEl && io2) io2.observe(heroTopEl)
    return () => {
      io2?.disconnect()
    }
  }, [])

  function goToForm(course?: string) {
    popup.open(course)
  }

  // Arriving from another page (/#register, /#courses): scroll to the section once the page has laid out.
  useEffect(() => {
    const id = location.hash.slice(1)
    if (!id) return
    const t = setTimeout(() => {
      if (id === 'register') goToForm()
      else {
        const el = document.getElementById(id)
        if (el) (lenisRef.current ? lenisRef.current.scrollTo(el, { offset: -72 }) : el.scrollIntoView({ behavior: 'smooth', block: 'start' }))
      }
    }, 120)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.hash])

  function handleRootClick(e: React.MouseEvent) {
    const target = e.target as HTMLElement
    const cta = target.closest('[data-cta]') as HTMLElement | null
    if (cta) {
      if (cta.getAttribute('href') === '#register') {
        e.preventDefault()
        goToForm()
      }
    }
  }

  const showSticky = pastHero

  return (
    <div ref={rootRef} className="fs-page ch-home" onClick={handleRootClick}>
      <BatchAnnouncement />
      <Header />

      <main id="main">
        <HomeHero />
        <HomePathways />
        <HomeSession />
        <HomePrograms />
        <HomeDemoClasses onJoin={() => goToForm()} />
        <HomeGuidedProjects />
        <HomeOurWork />
        <HomeAiTools />
        <HomeWhy />
        <HomeHow />
        <HomeAbout />
        <HomeVisit />
        <HomeReviews />
        <HomeFaq />
      </main>

      <FsFooter home />

      <div className={`sticky-cta${showSticky ? ' show' : ''}`} aria-hidden={!showSticky}>
        <div>
          <strong>Free 2-hour live session</strong>
          <span>Online · Free</span>
        </div>
        <a href="#register" className="btn btn-anim btn-yellow btn-sm" data-cta="sticky-mobile" tabIndex={showSticky ? 0 : -1}>
          Register Free
        </a>
      </div>
    </div>
  )
}
