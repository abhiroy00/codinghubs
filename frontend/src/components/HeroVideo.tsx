import { useEffect, useRef, useState } from 'react'
import './hero-video.css'
import homePoster from '../assets/hero/home-poster-1280.webp'
import homePosterSmall from '../assets/hero/home-poster-768.webp'
import homePosterAvif from '../assets/hero/home-poster-1280.avif'
import homePosterSmallAvif from '../assets/hero/home-poster-768.avif'
import { PageBannerArt } from './PageBannerArt'

/**
 * Page hero media. Inner-page clips select static editorial artwork; the home page keeps its background video.
 * The host element gets the `hv-host` class (see hero-video.css and page-banner.css).
 * Sources and licenses: public/assets/hero/video/SOURCE.md (Pexels clips, Pexels License).
 *
 * Without `clip` it plays the home page clip (720p/540p by screen width).
 *
 * The server render and first client paint show only the static poster. The video is added after
 * hydration when the viewer has a tablet or larger screen, has not asked for reduced motion and is not
 * on a data saver or 2G connection. Otherwise the poster stays as a still background.
 */
const BASE = '/assets/hero/video/team-coding-review'
const POSTER = homePoster
const POSTER_SM = homePosterSmall

/** Retained page identifiers select the matching static banner illustration. */
export type HeroClip =
  | 'courses' | 'course-detail' | 'interview-prep' | 'interview-prep-detail' | 'faq' | 'ai' | 'ai-tools'
  | 'blog' | 'blog-article' | 'projects' | 'project-guides' | 'book-a-tutor' | 'latest-jobs' | 'our-work'
  | 'learn' | 'locations' | 'location-detail' | 'policies'
const VIDEO_MIN_WIDTH = 768
const HD_MIN_WIDTH = 1100

type NetworkInformation = { saveData?: boolean; effectiveType?: string }

function saverOn() {
  const c = (navigator as Navigator & { connection?: NetworkInformation }).connection
  return Boolean(c && (c.saveData || /(^|-)2g$/.test(c.effectiveType ?? '')))
}

export function HeroVideo({ clip }: { clip?: HeroClip } = {}) {
  return clip ? <PageBannerArt clip={clip} /> : <HomeHeroVideo />
}

function HomeHeroVideo() {
  const poster = POSTER
  const posterSm = POSTER_SM
  const posterAvif = homePosterAvif
  const posterSmAvif = homePosterSmallAvif
  // The still as a real image (the only copy: no CSS background or video poster repeats it): it is the LCP element on most pages, and an
  // <img> with decoding="sync" paints in the first frame, whereas a background image is decoded asynchronously and
  // painted a frame later, after the app JS has taken the main thread. Same files and media split as the preloads
  // in scripts/prerender.mjs, so nothing is downloaded twice. AVIF first (about a third smaller), WebP fallback.
  const still = (
    <picture>
      <source media="(max-width: 767px)" srcSet={posterSmAvif} type="image/avif" />
      <source media="(max-width: 767px)" srcSet={posterSm} type="image/webp" />
      <source srcSet={posterAvif} type="image/avif" />
      <img className="hv-still" src={poster} alt="" width={1280} height={720} decoding="sync" fetchPriority="high" />
    </picture>
  )
  const videoRef = useRef<HTMLVideoElement>(null)
  const [src, setSrc] = useState<string | null>(null)
  const [playing, setPlaying] = useState(false)
  const [visible, setVisible] = useState(true)
  const [failed, setFailed] = useState(false)

  // Decide whether to use video at all, and react to reduced-motion or viewport changes.
  useEffect(() => {
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)')
    const wide = window.matchMedia(`(min-width: ${VIDEO_MIN_WIDTH}px)`)
    const sync = () => {
      const allowed = !reduce.matches && wide.matches && !saverOn()
      setSrc((current) => {
        if (!allowed) return null
        // Keep the first chosen size so a resize never restarts the download.
        return current ?? `${BASE}-${window.innerWidth >= HD_MIN_WIDTH ? '720p' : '540p'}.mp4`
      })
    }
    // Start the clip only after the page has loaded (plus a short pause): the poster holds the first screen during
    // load, the video does not compete for bandwidth, and the first screen settles quickly.
    let timer: number | undefined
    const start = () => { timer = window.setTimeout(sync, 2500) }
    if (document.readyState === 'complete') start()
    else window.addEventListener('load', start, { once: true })
    reduce.addEventListener('change', sync)
    wide.addEventListener('change', sync)
    return () => {
      window.clearTimeout(timer)
      window.removeEventListener('load', start)
      reduce.removeEventListener('change', sync)
      wide.removeEventListener('change', sync)
    }
  }, [])

  // Pause while the hero is scrolled away or the tab is hidden, to save CPU and battery.
  useEffect(() => {
    const video = videoRef.current
    if (!src || !video) return
    let inView = true
    const update = () => setVisible(inView && document.visibilityState === 'visible')
    const io = 'IntersectionObserver' in window
      ? new IntersectionObserver(([entry]) => {
          inView = entry.isIntersecting
          update()
        })
      : null
    io?.observe(video)
    document.addEventListener('visibilitychange', update)
    return () => {
      io?.disconnect()
      document.removeEventListener('visibilitychange', update)
    }
  }, [src])

  useEffect(() => {
    const video = videoRef.current
    if (!src || !video) return
    // React does not reliably reflect `muted` as an attribute; browsers need it set before play().
    video.muted = true
    if (!visible) {
      video.pause()
      return
    }
    const attempt = video.play()
    // Autoplay can be refused (power saving, browser policy). The poster stays visible, so nothing breaks.
    attempt?.catch(() => setPlaying(false))
  }, [src, visible])

  if (!src || failed) {
    return <div className="hv-bg" aria-hidden="true">{still}</div>
  }

  return (
    <div className={`hv-bg${playing ? ' is-playing' : ''}`} aria-hidden="true">
      {still}
      <video
        ref={videoRef}
        className="hv-video"
        autoPlay
        muted
        loop
        playsInline
        preload="metadata"
        tabIndex={-1}
        disablePictureInPicture
        disableRemotePlayback
        onPlaying={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
      >
        {/* A missing or undecodable file falls back to the still background. */}
        <source src={src} type="video/mp4" onError={() => setFailed(true)} />
      </video>
    </div>
  )
}
