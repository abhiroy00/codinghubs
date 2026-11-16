import { useEffect, useRef, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { SITE_FONTS } from '../lib/fonts'
import { useLenisRef } from '../lib/lenis-context'
import { useRegisterPopup } from '../lib/register-popup'
import { FS_CSS } from '../lib/fs-css'
import { useScopedStylesheet } from '../hooks/useScopedStylesheet'
import { FsFooter } from '../locations/FsShell'
import { Header } from '../components/Header'
import { BatchAnnouncement } from './free-session/JoinHero'
import { HomeExplore } from './free-session/HomeExplore'
import { useFsReveal } from './free-session/useFsReveal'
import { HomeHero, HomeGallery, HomeQuickLinks, HomeTools, HomeVideos, HomeSession, HomePrograms, HomeWhy, HomeHow, HomeAbout } from './home/HomeSections'
import { HOME_META, pageSeo } from '../seo/site'
import { useSeo } from '../seo/useSeo'
import './free-session/home.css'
import './home/home-redesign.css'

const HOME_SEO = pageSeo(HOME_META)

export function FreeSession() {
  useSeo(HOME_SEO)
  useScopedStylesheet([FS_CSS, SITE_FONTS])
  const rootRef = useRef<HTMLDivElement>(null)
  const lenisRef = useLenisRef()
  const { open } = useRegisterPopup()
  const location = useLocation()
  useFsReveal(rootRef)
  const [pastHero, setPastHero] = useState(false)
  const [nearFooter, setNearFooter] = useState(false)

  useEffect(() => {
    if (!('IntersectionObserver' in window)) return
    const hero = rootRef.current?.querySelector('.join-copy')
    const footer = rootRef.current?.querySelector('.footer-cta')
    const observer = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (entry.target === hero) setPastHero(!entry.isIntersecting && entry.boundingClientRect.top < 0)
        if (entry.target === footer) setNearFooter(entry.isIntersecting || entry.boundingClientRect.top < 0)
      }
    })
    if (hero) observer.observe(hero)
    if (footer) observer.observe(footer)
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    const id = location.hash.slice(1)
    if (!id) return
    const timer = setTimeout(() => {
      if (id === 'register') open()
      else {
        const target = document.getElementById(id)
        if (!target) return
        const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
        if (lenisRef.current) lenisRef.current.scrollTo(target, { offset: -96 })
        else target.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'start' })
      }
    }, 120)
    return () => clearTimeout(timer)
  }, [location.hash, lenisRef, open])

  function handleRootClick(event: React.MouseEvent) {
    const cta = (event.target as Element).closest<HTMLAnchorElement>('a[href="#register"]')
    if (!cta) return
    event.preventDefault()
    open()
  }

  const showSticky = pastHero && !nearFooter
  return (
    <div ref={rootRef} className="fs-page hp-home" onClick={handleRootClick}>
      <BatchAnnouncement />
      <Header />
      <main id="main">
        <HomeHero />
        <HomeGallery />
        <HomeQuickLinks />
        <HomeTools />
        <HomeVideos />
        <HomeSession />
        <HomePrograms />
        <HomeWhy />
        <HomeHow />
        <HomeAbout />
        <HomeExplore />
      </main>
      <FsFooter home />
      <div className={`hp-mobile-cta${showSticky ? ' show' : ''}`} aria-hidden={!showSticky}>
        <div><strong>Free 2-hour demo</strong><span>Live online · No payment needed</span></div>
        <a href="#register" className="hp-btn hp-btn-primary" data-cta="sticky-mobile" tabIndex={showSticky ? 0 : -1}>Book Free Demo</a>
      </div>
    </div>
  )
}
