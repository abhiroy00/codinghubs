import { useCallback, useEffect, useRef, useState } from 'react'

type Slide = {
  /** File stem inside /assets/hero/. */
  name: string
  /** Available WebP widths (never upscaled beyond the source). */
  widths: number[]
  width: number
  height: number
  alt: string
  caption: string
  /** cover fills the frame; contain keeps wide photos and their banner text whole over a soft blurred fill. */
  fit: 'cover' | 'contain'
  position?: string
}

const SLIDES: Slide[] = [
  {
    name: 'classroom-live-coding-session',
    widths: [720, 1440],
    width: 1440,
    height: 1080,
    alt: 'Students with laptops around a classroom table while a trainer walks through code on a wall screen',
    caption: 'Small-group classroom session',
    fit: 'cover',
    position: '50% 55%',
  },
  {
    name: 'gitm-student-group-photo',
    widths: [720, 1440],
    width: 1440,
    height: 681,
    alt: 'Large group photo of students and trainers on stage at Ganga Institute of Technology and Management',
    caption: 'With students at Ganga Institute of Technology and Management',
    fit: 'contain',
  },
  {
    name: 'team-festive-celebration',
    widths: [720, 1200],
    width: 1200,
    height: 1600,
    alt: 'Three people in festive clothes exchanging a gift in an office decorated with marigold garlands',
    caption: 'Celebrating together',
    fit: 'cover',
    position: '50% 32%',
  },
  {
    name: 'gitm-aarambh-data-science-careers-talk',
    widths: [720, 1440],
    width: 1440,
    height: 1080,
    alt: 'Trainer presenting a slide on top data science careers at the Aarambh 2026 student induction programme',
    caption: 'Talk on data science careers at Aarambh 2026',
    fit: 'cover',
    position: '45% 40%',
  },
  {
    name: 'gitm-aarambh-felicitation',
    widths: [714],
    width: 714,
    height: 319,
    alt: 'Four people on stage exchanging a certificate at the Aarambh 2026 student induction programme',
    caption: 'Felicitation at the Aarambh 2026 induction programme',
    fit: 'contain',
  },
]

const INTERVAL = 4500
const SIZES = '(max-width: 900px) 92vw, 46vw'
const src = (s: Slide) => `/assets/hero/${s.name}.jpg`
const srcSet = (s: Slide) => s.widths.map((w) => `/assets/hero/${s.name}-${w}.webp ${w}w`).join(', ')

function SlideImage({ slide, eager, decorative }: { slide: Slide; eager?: boolean; decorative?: boolean }) {
  return (
    <picture>
      <source type="image/webp" srcSet={srcSet(slide)} sizes={SIZES} />
      <img
        src={src(slide)}
        alt={decorative ? '' : slide.alt}
        width={slide.width}
        height={slide.height}
        loading={eager ? 'eager' : 'lazy'}
        fetchPriority={eager ? 'high' : 'auto'}
        decoding={eager ? 'sync' : 'async'}
        style={slide.position ? { objectPosition: slide.position } : undefined}
      />
    </picture>
  )
}

/** Accessible, dependency-free hero carousel (WAI-ARIA carousel pattern, autoplay with a pause control). */
export function HeroSlider() {
  const count = SLIDES.length
  const [index, setIndex] = useState(0)
  // Images mount only once a slide is current or next, so later slides never compete with the first paint.
  const [mounted, setMounted] = useState<Set<number>>(() => new Set([0]))
  const [userPaused, setUserPaused] = useState(false)
  const [hovered, setHovered] = useState(false)
  const [focused, setFocused] = useState(false)
  const [hidden, setHidden] = useState(false)
  const [reduced, setReduced] = useState(false)
  const touchX = useRef<number | null>(null)

  const mount = useCallback(
    (...ids: number[]) =>
      setMounted((prev) => {
        if (ids.every((i) => prev.has(i))) return prev
        const copy = new Set(prev)
        ids.forEach((i) => copy.add(i))
        return copy
      }),
    [],
  )

  const go = useCallback(
    (target: number) => {
      const next = ((target % count) + count) % count
      setIndex(next)
      mount(next, (next + 1) % count)
    },
    [count, mount],
  )

  useEffect(() => {
    // Preload the second photo once the first paint is done.
    const t = window.setTimeout(() => mount(1), 1200)
    return () => window.clearTimeout(t)
  }, [mount])

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    const sync = () => setReduced(mq.matches)
    sync()
    mq.addEventListener('change', sync)
    const onVis = () => setHidden(document.visibilityState === 'hidden')
    onVis()
    document.addEventListener('visibilitychange', onVis)
    return () => {
      mq.removeEventListener('change', sync)
      document.removeEventListener('visibilitychange', onVis)
    }
  }, [])

  const autoplayAllowed = !reduced && !userPaused
  const running = autoplayAllowed && !hovered && !focused && !hidden

  useEffect(() => {
    if (!running) return
    const t = window.setTimeout(() => go(index + 1), INTERVAL)
    return () => window.clearTimeout(t)
  }, [running, index, go])

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'ArrowRight') {
      e.preventDefault()
      go(index + 1)
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault()
      go(index - 1)
    }
  }

  const current = SLIDES[index]

  return (
    <section
      className={`hs${reduced ? ' hs-still' : ''}`}
      aria-roledescription="carousel"
      aria-label="Coding Hubs in pictures"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onFocus={() => setFocused(true)}
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setFocused(false)
      }}
      onKeyDown={onKeyDown}
    >
      <div
        className="hs-frame"
        onTouchStart={(e) => {
          touchX.current = e.touches[0].clientX
        }}
        onTouchEnd={(e) => {
          if (touchX.current === null) return
          const dx = e.changedTouches[0].clientX - touchX.current
          touchX.current = null
          if (Math.abs(dx) > 40) go(index + (dx < 0 ? 1 : -1))
        }}
      >
        {/* Announce only user-driven changes; rotation stays silent. */}
        <div className="hs-track" aria-live={running ? 'off' : 'polite'} aria-atomic="false">
          {SLIDES.map((slide, i) => (
            <div
              key={slide.name}
              className={`hs-slide hs-${slide.fit}${i === index ? ' is-active' : ''}`}
              role="group"
              aria-roledescription="slide"
              aria-label={`${i + 1} of ${count}: ${slide.caption}`}
              aria-hidden={i !== index}
            >
              {mounted.has(i) && (
                <>
                  {slide.fit === 'contain' && (
                    <div className="hs-fill" aria-hidden="true">
                      <SlideImage slide={slide} decorative />
                    </div>
                  )}
                  <SlideImage slide={slide} eager={i === 0} />
                </>
              )}
            </div>
          ))}
        </div>
        <div className="hs-dots" role="group" aria-label="Choose slide">
          {SLIDES.map((slide, i) => (
            <button
              key={slide.name}
              type="button"
              className={`hs-dot${i === index ? ' is-active' : ''}`}
              aria-label={`Show slide ${i + 1}: ${slide.caption}`}
              aria-current={i === index ? 'true' : undefined}
              onClick={() => go(i)}
            />
          ))}
        </div>
      </div>

      <div className="hs-bar">
        <div className="hs-controls">
          {!reduced && (
            <button
              type="button"
              className="hs-btn hs-play"
              onClick={() => setUserPaused((v) => !v)}
              aria-label={userPaused ? 'Start slide rotation' : 'Stop slide rotation'}
            >
              {userPaused ? (
                <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5v14l11-7z" /></svg>
              ) : (
                <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 5h4v14H7zM13 5h4v14h-4z" /></svg>
              )}
            </button>
          )}
          <button type="button" className="hs-btn" onClick={() => go(index - 1)} aria-label="Previous slide">
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m15 6-6 6 6 6" /></svg>
          </button>
          <button type="button" className="hs-btn" onClick={() => go(index + 1)} aria-label="Next slide">
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m9 6 6 6-6 6" /></svg>
          </button>
        </div>
        <p className="hs-caption">
          <span className="hs-count">
            {String(index + 1).padStart(2, '0')} / {String(count).padStart(2, '0')}
          </span>
          <span className="hs-caption-text">{current.caption}</span>
        </p>
      </div>
    </section>
  )
}
