import { useEffect, useRef, useState } from 'react'
import { VIDEOS } from './data'
import { FsIcon } from './icons'

export function VideoReels() {
  const listRef = useRef<HTMLOListElement>(null)
  const videoRefs = useRef<(HTMLVideoElement | null)[]>([])
  const [playingIndex, setPlayingIndex] = useState<number | null>(null)
  const [dotCount, setDotCount] = useState(1)
  const [activeDot, setActiveDot] = useState(0)
  const [scrollable, setScrollable] = useState(true)
  const holdRef = useRef(false)

  const step = () => {
    const list = listRef.current
    if (!list || !list.firstElementChild) return 0
    const first = list.firstElementChild as HTMLElement
    const gap = parseFloat(getComputedStyle(list).columnGap || '0')
    return first.getBoundingClientRect().width + gap
  }
  const maxScroll = () => {
    const list = listRef.current
    return list ? list.scrollWidth - list.clientWidth : 0
  }

  function syncDots() {
    const list = listRef.current
    if (!list) return
    const s = step()
    setActiveDot(s ? Math.round(list.scrollLeft / s) : 0)
    setScrollable(maxScroll() > 4)
  }

  function buildDots() {
    const s = step()
    const n = Math.max(1, Math.round(maxScroll() / (s || 1)) + 1)
    setDotCount(n)
    syncDots()
  }

  useEffect(() => {
    buildDots()
    const onResize = () => buildDots()
    window.addEventListener('resize', onResize)
    const list = listRef.current
    const onScroll = () => requestAnimationFrame(syncDots)
    list?.addEventListener('scroll', onScroll, { passive: true })
    return () => {
      window.removeEventListener('resize', onResize)
      list?.removeEventListener('scroll', onScroll)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function go(dir: 1 | -1) {
    const list = listRef.current
    if (!list) return
    const ms = maxScroll()
    if (dir > 0 && list.scrollLeft >= ms - 4) list.scrollTo({ left: 0, behavior: 'smooth' })
    else if (dir < 0 && list.scrollLeft <= 4) list.scrollTo({ left: ms, behavior: 'smooth' })
    else list.scrollBy({ left: dir * step(), behavior: 'smooth' })
  }

  function play(i: number) {
    videoRefs.current.forEach((v, idx) => {
      if (v && idx !== i) {
        v.pause()
        v.controls = false
      }
    })
    const v = videoRefs.current[i]
    if (v) {
      v.controls = true
      v.play().catch(() => {})
    }
    setPlayingIndex(i)
  }

  useEffect(() => {
    const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches
    if (reduced) return
    const id = setInterval(() => {
      if (holdRef.current || document.hidden || playingIndex !== null || maxScroll() <= 4) return
      go(1)
    }, 3500)
    return () => clearInterval(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playingIndex])

  const holdOn = () => (holdRef.current = true)
  const holdOff = () => (holdRef.current = false)
  const holdOffDelayed = () => setTimeout(() => (holdRef.current = false), 4000)

  return (
    <>
      <div
        className="reel-carousel reveal"
        aria-roledescription="carousel"
        aria-label="Demo class videos"
        onMouseEnter={holdOn}
        onMouseLeave={holdOff}
        onFocus={holdOn}
        onBlur={holdOff}
        onTouchStart={holdOn}
        onTouchEnd={holdOffDelayed}
      >
        <button type="button" className="rc-arrow rc-prev" hidden={!scrollable} aria-label="Previous videos" onClick={() => go(-1)}>
          <svg className="ico" aria-hidden="true" style={{ transform: 'scaleX(-1)' }}>
            <use href="#i-arrow" />
          </svg>
        </button>
        <ol className="reels" id="vlist" ref={listRef}>
          {VIDEOS.map((v, i) => (
            <li className={`reel${playingIndex === i ? ' is-playing' : ''}`} key={v.src}>
              <div className="reel-frame">
                <video
                  ref={(el) => {
                    videoRefs.current[i] = el
                  }}
                  src={`${v.src}#t=0.5`}
                  preload="metadata"
                  playsInline
                  onEnded={() => setPlayingIndex(null)}
                />
                <button type="button" className="reel-btn" aria-label={`Play video: ${v.title}`} onClick={() => play(i)}>
                  <span className="n">VIDEO {String(i + 1).padStart(2, '0')}</span>
                  {v.duration && <span className="d">{v.duration}</span>}
                  <span className="pl" aria-hidden="true">
                    <FsIcon id="i-play" />
                  </span>
                </button>
              </div>
              <h4>{v.title}</h4>
            </li>
          ))}
        </ol>
        <button type="button" className="rc-arrow rc-next" hidden={!scrollable} aria-label="Next videos" onClick={() => go(1)}>
          <FsIcon id="i-arrow" />
        </button>
      </div>
      <div className="rc-dots" aria-hidden="true">
        {dotCount > 1 &&
          Array.from({ length: dotCount }, (_, k) => (
            <button
              key={k}
              type="button"
              tabIndex={-1}
              className={k === activeDot ? 'on' : ''}
              onClick={() => listRef.current?.scrollTo({ left: k * step(), behavior: 'smooth' })}
            />
          ))}
      </div>
    </>
  )
}
