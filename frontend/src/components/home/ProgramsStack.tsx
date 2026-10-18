import { useEffect, useRef } from 'react'
import { useModal } from '../../lib/modal-context'
import { useCourseCategories } from '../../lib/useCourses'
import { buildStackArt } from './stackArt'

export function ProgramsStack() {
  const { categories } = useCourseCategories()
  const { openModal } = useModal()
  const stackRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches
    const onScroll = () => {
      if (reduce || window.innerWidth < 640 || !stackRef.current) return
      const cards = Array.from(stackRef.current.querySelectorAll<HTMLElement>('.stack-card'))
      cards.forEach((c, i) => {
        const nx = cards[i + 1]
        if (!nx) return
        const gap = nx.getBoundingClientRect().top - c.getBoundingClientRect().top
        const p = Math.max(0, Math.min(1, 1 - gap / c.offsetHeight))
        c.style.transform = `scale(${1 - p * 0.05})`
        c.style.filter = `brightness(${1 - p * 0.04})`
      })
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    onScroll()
    return () => window.removeEventListener('scroll', onScroll)
  }, [categories])

  return (
    <section className="section" id="courses" aria-labelledby="awareness-heading">
      <div className="container-x">
        <div style={{ maxWidth: '48rem' }}>
          <p className="eyebrow rv">Our programs</p>
          <h2 id="awareness-heading" className="display-lg mt-4">
            <span className="line-mask">
              <span>Pick the career you want to build.</span>
            </span>
          </h2>
        </div>
        <div className="mt-14">
          <div className="stack" ref={stackRef}>
            {categories.map((cat, i) => (
              <div className="stack-item" style={{ top: `${6 + i * 1.25}rem` }} key={cat.slug}>
                <article className="stack-card" data-io>
                  <span
                    className="glow"
                    style={{ background: `radial-gradient(120% 100% at 100% 0%,${cat.color}1f 0%,${cat.color}08 38%,transparent 72%)` }}
                  ></span>
                  <span className="topbar" style={{ background: `linear-gradient(to right,${cat.color},${cat.color}00 78%)` }}></span>
                  <div className="stack-in">
                    <div>
                      <div className="stack-head">
                        <span className="num">0{i + 1}</span>
                        <span className="pill" style={{ color: cat.color, background: `${cat.color}14` }}>
                          {cat.name}
                        </span>
                      </div>
                      <p className="ttl">{cat.tagline}</p>
                      <p className="dsc">{cat.description}</p>
                      <div className="stack-chips">
                        {cat.courses.map((course) => (
                          <a
                            key={course.slug}
                            href="#"
                            onClick={(e) => {
                              e.preventDefault()
                              openModal(undefined, course.name)
                            }}
                          >
                            {course.name}
                          </a>
                        ))}
                      </div>
                    </div>
                    <div className="stack-art">
                      <svg viewBox="0 0 280 200" aria-hidden="true" dangerouslySetInnerHTML={{ __html: buildStackArt(i, cat.color) }} />
                    </div>
                  </div>
                </article>
              </div>
            ))}
          </div>
          <p style={{ paddingTop: '.5rem', fontSize: '.75rem', color: 'var(--color-faint)' }}>
            All programs include live classes, recorded sessions for revision and{' '}
            <a href="/faq" style={{ textDecoration: 'underline', textUnderlineOffset: '2px' }}>
              100% placement support
            </a>
            .
          </p>
        </div>
        <div className="hand-line" data-io>
          <span className="hand-wrap">
            <span className="ink">
              <span className="hand">This isn’t the future. It’s already happening.</span>
            </span>
            <svg viewBox="0 0 300 18" preserveAspectRatio="none" aria-hidden="true">
              <path
                d="M4,12 C58,4 104,15 152,9 C198,3 246,13 296,6"
                fill="none"
                stroke="var(--color-brand)"
                strokeWidth="3"
                strokeLinecap="round"
                strokeOpacity=".55"
                pathLength="1"
              />
            </svg>
          </span>
        </div>
      </div>
    </section>
  )
}
