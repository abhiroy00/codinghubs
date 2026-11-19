import { useCallback, useEffect, useRef, useState } from 'react'
import { DEMO_CHANNEL_URL, DEMO_VIDEOS, getYouTubeId, thumbnailFor, type DemoVideo } from '../data/demoVideos'
import { AnimatedCard, VideoModal } from './ui'
import './demo-videos.css'

type Playable = DemoVideo & { videoId: string }
const AUTO_MS = 4500

function Thumb({ v }: { v: Playable }) {
  const [src, setSrc] = useState(thumbnailFor(v, v.videoId))
  return (
    <img src={src} alt={`${v.course} class at Coding Hub`} width={480} height={360} loading="lazy" decoding="async"
      onError={() => setSrc(`https://i.ytimg.com/vi/${v.videoId}/hqdefault.jpg`)} />
  )
}

function Arrow({ dir }: { dir: 1 | -1 }) {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={dir > 0 ? 'M5 12h14M13 6l6 6-6 6' : 'M19 12H5M11 6l-6 6 6 6'} />
    </svg>
  )
}

/**
 * YouTube classes as an auto-moving carousel: 4 cards per view on laptops (3 / 2 / 1 on smaller screens), and each step
 * moves a whole view. Pauses on hover/focus, off-screen, in background tabs and for reduced motion. Cards open <VideoModal>.
 */
export function DemoVideos({ videos = DEMO_VIDEOS }: { videos?: DemoVideo[] }) {
  const playable = videos.flatMap((v) => { const videoId = getYouTubeId(v.youtubeUrl); return videoId ? [{ ...v, videoId }] : [] })
  const [active, setActive] = useState<Playable | null>(null)
  const [hold, setHold] = useState(false)
  const [visible, setVisible] = useState(false)
  const [pages, setPages] = useState(1)
  const [page, setPage] = useState(0)
  const trackRef = useRef<HTMLUListElement>(null)
  const close = useCallback(() => setActive(null), [])

  const measure = useCallback(() => {
    const el = trackRef.current
    if (!el) return
    setPages(Math.max(1, Math.round(el.scrollWidth / el.clientWidth)))
    setPage(Math.round(el.scrollLeft / el.clientWidth))
  }, [])

  const go = useCallback((dir: 1 | -1) => {
    const el = trackRef.current
    if (!el) return
    const max = el.scrollWidth - el.clientWidth
    const smooth = window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth'
    if (dir > 0 && el.scrollLeft >= max - 4) el.scrollTo({ left: 0, behavior: smooth })
    else if (dir < 0 && el.scrollLeft <= 4) el.scrollTo({ left: max, behavior: smooth })
    else el.scrollBy({ left: dir * el.clientWidth, behavior: smooth })
  }, [])

  // Track size and the current page.
  useEffect(() => {
    const el = trackRef.current
    if (!el) return
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    el.addEventListener('scroll', measure, { passive: true })
    const io = new IntersectionObserver(([entry]) => setVisible(entry.isIntersecting), { threshold: 0.3 })
    io.observe(el)
    return () => { ro.disconnect(); io.disconnect(); el.removeEventListener('scroll', measure) }
  }, [measure, playable.length])

  // Auto-advance one full view at a time.
  useEffect(() => {
    if (hold || !visible || active || pages < 2 || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const id = window.setInterval(() => { if (!document.hidden) go(1) }, AUTO_MS)
    return () => window.clearInterval(id)
  }, [hold, visible, active, pages, go])

  if (!playable.length) return null

  return (
    <div className="dv" onMouseEnter={() => setHold(true)} onMouseLeave={() => setHold(false)}
      onFocus={() => setHold(true)} onBlur={(e) => { if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setHold(false) }}>
      <div className="dv-viewport">
        <button type="button" className="dv-nav dv-prev" onClick={() => go(-1)} aria-label="Previous videos"><Arrow dir={-1} /></button>
        <ul className="dv-track" ref={trackRef} aria-label="Coding Hub YouTube classes" data-lenis-prevent>
          {playable.map((v) => (
            <li key={v.id}>
              <AnimatedCard as="div" className="dv-card" media={<>
                <Thumb v={v} />
                <span className="dv-play" aria-hidden="true">
                  <svg viewBox="0 0 24 24" width="26" height="26"><path d="M8 5v14l11-7z" fill="currentColor" /></svg>
                </span>
              </>}>
                <h3 className="dv-title">
                  <button type="button" onClick={() => setActive(v)} aria-haspopup="dialog">
                    {v.course} <span className="sr-only">: play video</span>
                  </button>
                </h3>
                <p className="dv-meta">Free class · Hindi · Coding Hub</p>
              </AnimatedCard>
            </li>
          ))}
        </ul>
        <button type="button" className="dv-nav dv-next" onClick={() => go(1)} aria-label="Next videos"><Arrow dir={1} /></button>
      </div>
      {pages > 1 && (
        <div className="dv-dots" aria-hidden="true">
          {Array.from({ length: pages }, (_, i) => <span key={i} className={i === page ? 'on' : ''} />)}
        </div>
      )}
      <p className="dv-more">
        <a className="ui-btn ui-btn-ghost" href={DEMO_CHANNEL_URL} target="_blank" rel="noopener noreferrer">View all videos on YouTube <span aria-hidden="true">↗</span></a>
      </p>
      <VideoModal videoId={active?.videoId ?? null} title={active ? `${active.course} video` : ''} onClose={close} />
    </div>
  )
}
