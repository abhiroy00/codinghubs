import { useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { PROJECTS, PROJECT_CATEGORIES } from '../../data/projects'
import { FsIcon } from './icons'
import { useProjectSlideshow } from './useProjectSlideshow'
import './home-projects.css'

const number = (value: number) => String(value).padStart(2, '0')

/** Reference-inspired split section, using the same real portfolio as /our-work. */
export function HomeProjects() {
  const { ref: carouselRef, index, paused, running, reduced, go, togglePlayback, setHovered, setFocused } = useProjectSlideshow(PROJECTS.length)
  const touch = useRef<{ x: number; y: number } | null>(null)
  const [failed, setFailed] = useState<string[]>([])
  const selected = PROJECTS[index]

  return (
    <section className="sec home-projects" id="project-showcase" aria-labelledby="hp-title">
      <div className="wrap hp-layout">
        <div className="hp-carousel" ref={carouselRef} role="region" aria-roledescription="carousel" aria-label="Project showcase"
          onFocusCapture={() => setFocused(true)}
          onBlur={event => { if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setFocused(false) }}
          onKeyDown={event => {
            if (event.target instanceof HTMLSelectElement) return
            if (event.key === 'ArrowRight' || event.key === 'ArrowLeft') {
              event.preventDefault()
              go(index + (event.key === 'ArrowRight' ? 1 : -1))
            }
          }}>
          <div className="hp-stage" tabIndex={0} role="group" aria-label="Project previews; use left and right arrow keys"
            onPointerEnter={event => { if (event.pointerType === 'mouse') setHovered(true) }}
            onPointerLeave={() => setHovered(false)}
            onTouchStart={event => { touch.current = { x: event.touches[0].clientX, y: event.touches[0].clientY } }}
            onTouchEnd={event => {
              if (!touch.current) return
              const dx = event.changedTouches[0].clientX - touch.current.x
              const dy = event.changedTouches[0].clientY - touch.current.y
              touch.current = null
              if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy)) go(index + (dx < 0 ? 1 : -1))
            }} onTouchCancel={() => { touch.current = null }}>
            <div className="hp-track" aria-live={running ? 'off' : 'polite'} aria-atomic="true">
              {PROJECTS.map((project, slideIndex) => {
                const offset = (slideIndex - index + PROJECTS.length) % PROJECTS.length
                const active = offset === 0
                const position = active ? 'is-active' : offset === 1 ? 'is-next' : offset === PROJECTS.length - 1 ? 'is-prev' : 'is-hidden'
                return (
                  <figure key={project.image} className={`hp-slide ${position}`} role="group" aria-roledescription="slide"
                    aria-label={`${slideIndex + 1} of ${PROJECTS.length}: ${project.name}`} aria-hidden={!active} inert={!active}>
                    {position !== 'is-hidden' && (failed.includes(project.image)
                      ? <div className="hp-unavailable"><FsIcon id="i-code" /><span>Project preview unavailable</span></div>
                      : <img src={`/assets/our-work/${project.image}.webp`} alt={`${project.name} project screenshot`}
                        width={800} height={500} loading="lazy" decoding="async"
                        onError={() => setFailed(current => [...current, project.image])} />)}
                    <figcaption>
                      <span className="hp-category">{number(slideIndex + 1)} <span aria-hidden="true">—</span> {project.category}</span>
                      <h3>{project.name}</h3>
                      {project.href
                        ? <a href={project.href} target="_blank" rel="noopener noreferrer" tabIndex={active ? 0 : -1}
                            aria-label={`View ${project.name} project (opens in a new tab)`}>View project <span aria-hidden="true">↗</span></a>
                        : <span className="hp-private">Private client project</span>}
                    </figcaption>
                  </figure>
                )
              })}
            </div>
          </div>
          <div className="hp-controls">
            <p className="hp-count"><strong>{number(index + 1)}</strong><span aria-hidden="true"> / </span>{number(PROJECTS.length)}<span className="sr-only"> projects</span></p>
            <div className="hp-control-buttons">
              <button type="button" onClick={() => go(index - 1)} aria-label="Previous project">←</button>
              {!reduced && <button type="button" onClick={togglePlayback}
                aria-label={paused ? 'Play project slideshow' : 'Pause project slideshow'} aria-pressed={paused}>
                <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">{paused ? <path d="m8 5 11 7-11 7z" /> : <path d="M7 5h4v14H7zM14 5h4v14h-4z" />}</svg>
              </button>}
              <button type="button" onClick={() => go(index + 1)} aria-label="Next project">→</button>
            </div>
          </div>
          <label className="hp-picker"><span>Choose a project</span>
            <select value={index} onChange={event => go(Number(event.target.value))}>
              {PROJECTS.map((project, index) => <option key={project.image} value={index}>{number(index + 1)} · {project.name}</option>)}
            </select>
          </label>
          <p className="hp-summary" aria-live={running ? 'off' : 'polite'} aria-atomic="true">{selected.summary}</p>
        </div>

        <div className="hp-copy">
          <p className="eyebrow">From ideas to working products</p>
          <h2 id="hp-title" className="h2">Real projects.{' '}<br /><span className="marker">Real-world impact.</span></h2>
          <p className="hp-intro">Explore the AI applications, business platforms and websites in our portfolio. See how code becomes a product that solves a real problem.</p>
          <ul className="hp-highlights">
            <li><span aria-hidden="true">✓</span>AI applications &amp; intelligent workflows</li>
            <li><span aria-hidden="true">✓</span>Websites &amp; full stack platforms</li>
            <li><span aria-hidden="true">✓</span>E-commerce &amp; business systems</li>
            <li><span aria-hidden="true">✓</span>Real screenshots &amp; live project links</li>
          </ul>
          <div className="hp-stats" aria-label="Portfolio at a glance">
            <p><strong>{PROJECTS.length}</strong><span>Projects to explore</span></p>
            <p><strong>{PROJECT_CATEGORIES.length}</strong><span>Disciplines</span></p>
            <p><strong>{PROJECTS.filter(project => project.href).length}</strong><span>Live links</span></p>
          </div>
          <Link className="btn hp-all" to="/our-work">View all {PROJECTS.length} projects <FsIcon id="i-arrow" /></Link>
          <p className="hp-note">Browse every project above, or open the full portfolio.</p>
        </div>
      </div>
    </section>
  )
}
