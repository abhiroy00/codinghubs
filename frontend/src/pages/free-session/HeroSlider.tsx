import { useCallback, useEffect, useRef, useState } from 'react'

type Slide = {
  /** File stem inside /assets/hero/. */
  name: string
  /** Available WebP widths (never upscaled beyond the source). */
  widths: number[]
  width: number
  height: number
  alt: string
  title: string
  detail: string
  /** cover fills the card; contain keeps wide photos and their banner text whole over a soft blurred fill. */
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
    title: 'Classroom sessions',
    detail: 'Small groups, coding together',
    fit: 'cover',
    position: '50% 55%',
  },
  {
    name: 'gitm-student-group-photo',
    widths: [720, 1440],
    width: 1440,
    height: 681,
    alt: 'Large group photo of students and trainers on stage at Ganga Institute of Technology and Management',
    title: 'Campus sessions',
    detail: 'With students at GITM',
    fit: 'contain',
  },
  {
    name: 'team-festive-celebration',
    widths: [720, 1200],
    width: 1200,
    height: 1600,
    alt: 'Three people in festive clothes exchanging a gift in an office decorated with marigold garlands',
    title: 'Celebrating together',
    detail: 'Festive moments we share',
    fit: 'cover',
    position: '50% 32%',
  },
  {
    name: 'gitm-aarambh-data-science-careers-talk',
    widths: [720, 1440],
    width: 1440,
    height: 1080,
    alt: 'Trainer presenting a slide on top data science careers at the Aarambh 2026 student induction programme',
    title: 'Career talks',
    detail: 'Data science careers at Aarambh 2026',
    fit: 'cover',
    position: '45% 40%',
  },
  {
    name: 'gitm-aarambh-felicitation',
    widths: [714],
    width: 714,
    height: 319,
    alt: 'Four people on stage exchanging a certificate at the Aarambh 2026 student induction programme',
    title: 'Student induction',
    detail: 'Felicitation at the Aarambh 2026 programme',
    fit: 'contain',
  },
]

/** Decorative pills drawn from the hero copy (live classes, mentors, projects, community). */
const TAGS = ['live classes', 'mentors', 'real projects', 'community']

const INTERVAL = 3000
const SIZES = '(max-width: 760px) 82vw, 640px'
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

/** Position of slide i relative to the active one, wrapped to -2..2 for a five-card loop. */
function offset(i: number, index: number, count: number) {
  let d = (i - index) % count
  if (d > count / 2) d -= count
  if (d < -count / 2) d += count
  return d
}

const POS: Record<number, string> = { [-2]: 'is-far-prev', [-1]: 'is-prev', 0: 'is-active', 1: 'is-next', 2: 'is-far-next' }

/** Dependency-free coverflow carousel: autoplays, pauses on hover/focus, and moves by swipe, arrow keys or clicking a side card. */
export function HeroSlider() {
  const count = SLIDES.length
  const [index, setIndex] = useState(0)
  // Images mount only for the active card and its neighbours, so later photos never compete with the first paint.
  const [mounted, setMounted] = useState<Set<number>>(() => new Set([0]))
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
      mount(next, (next + 1) % count, (next - 1 + count) % count, (next + 2) % count)
    },
    [count, mount],
  )

  useEffect(() => {
    // Neighbouring cards load after the first photo has painted.
    const t = window.setTimeout(() => mount(1, count - 1), 900)
    return () => window.clearTimeout(t)
  }, [mount, count])

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

  const running = !reduced && !hovered && !focused && !hidden

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

  return (
    <section
      className={`hs${reduced ? ' hs-still' : ''}`}
      aria-roledescription="carousel"
      aria-label="Coding Hubs in pictures"
      onFocus={() => setFocused(true)}
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setFocused(false)
      }}
      onKeyDown={onKeyDown}
    >
      <div
        className="hs-stage"
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
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
          {SLIDES.map((slide, i) => {
            const d = offset(i, index, count)
            const active = d === 0
            return (
              <div
                key={slide.name}
                className={`hs-slide hs-${slide.fit} ${POS[d]}`}
                role="group"
                aria-roledescription="slide"
                aria-label={`${i + 1} of ${count}: ${slide.title}`}
                aria-hidden={!active}
                // Pointer shortcut only; keyboard users have the labelled previous/next buttons.
                onClick={active ? undefined : () => go(index + d)}
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
                <div className="hs-cap">
                  <p className="hs-cap-title">{slide.title}</p>
                  <p className="hs-cap-detail">{slide.detail}</p>
                </div>
              </div>
            )
          })}
        </div>

        <ul className="hs-tags" aria-hidden="true">
          {TAGS.map((tag, i) => (
            <li key={tag} className={`hs-tag hs-tag-${i + 1}`}>
              {tag}
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}
