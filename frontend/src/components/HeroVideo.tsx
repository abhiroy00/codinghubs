import { useEffect, useRef, useState, type CSSProperties } from 'react'
import './hero-video.css'

/**
 * Decorative background video for page heroes. The host element gets the `hv-host` class (see hero-video.css).
 * Sources and licenses: public/assets/hero/video/SOURCE.md (Pexels clips, Pexels License).
 *
 * Without `clip` it plays the home page clip (720p/540p by screen width). With `clip` it plays that page's
 * own 720p clip from /assets/hero/video/pages/<clip>.mp4 and uses that clip's posters.
 *
 * The server render and first client paint show only the static poster. The video is added after
 * hydration when the viewer has a tablet or larger screen, has not asked for reduced motion and is not
 * on a data saver or 2G connection. Otherwise the poster stays as a still background.
 */
const BASE = '/assets/hero/video/team-coding-review'
const POSTER = `${BASE}-poster-1280.webp`
const PAGE_BASE = '/assets/hero/video/pages'

/** One clip per page type; files live in public/assets/hero/video/pages/. */
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
  const poster = clip ? `${PAGE_BASE}/${clip}-poster-1280.webp` : POSTER
  // The still background (phones, reduced motion, data saver, before the video starts) is set in CSS from these.
  const stillStyle = clip
    ? ({
        '--hv-poster': `url("${PAGE_BASE}/${clip}-poster-1280.webp")`,
        '--hv-poster-sm': `url("${PAGE_BASE}/${clip}-poster-768.webp")`,
      } as CSSProperties)
    : undefined
  const videoRef = useRef<HTMLVideoElement>(null)
  const [src, setSrc] = useState<string | null>(null)
  const [playing, setPlaying] = useState(false)
  const [userPaused, setUserPaused] = useState(false)
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
        // Page clips come in one size. The home clip keeps its first chosen size so a resize never restarts the download.
        if (clip) return `${PAGE_BASE}/${clip}.mp4`
        return current ?? `${BASE}-${window.innerWidth >= HD_MIN_WIDTH ? '720p' : '540p'}.mp4`
      })
    }
    sync()
    reduce.addEventListener('change', sync)
    wide.addEventListener('change', sync)
    return () => {
      reduce.removeEventListener('change', sync)
      wide.removeEventListener('change', sync)
    }
  }, [clip])

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
    if (userPaused || !visible) {
      video.pause()
      return
    }
    const attempt = video.play()
    // Autoplay can be refused (power saving, browser policy). The poster stays visible and the
    // control offers "Play", so nothing breaks.
    attempt?.catch(() => setPlaying(false))
  }, [src, userPaused, visible])

  function toggle() {
    const video = videoRef.current
    if (!video) return
    if (playing) {
      setUserPaused(true)
      return
    }
    setUserPaused(false)
    // Called inside the click so it counts as a user gesture if autoplay was blocked earlier.
    video.muted = true
    video.play()?.catch(() => setPlaying(false))
  }

  if (!src || failed) {
    return <div className="hv-bg" style={stillStyle} aria-hidden="true" />
  }

  return (
    <>
      <div className={`hv-bg${playing ? ' is-playing' : ''}`} style={stillStyle} aria-hidden="true">
        <video
          ref={videoRef}
          className="hv-video"
          poster={poster}
          autoPlay
          muted
          loop
          playsInline
          preload="auto"
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
      <button
        type="button"
        className="hv-toggle"
        aria-label={playing ? 'Pause background video' : 'Play background video'}
        onClick={toggle}
      >
        {playing ? (
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5h3v14H8zM13 5h3v14h-3z" /></svg>
        ) : (
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5v14l11-7z" /></svg>
        )}
      </button>
    </>
  )
}
