import { useEffect, useRef, useState } from 'react'
import students from './placed-students.json'
import './student-placements.css'

// Names, employers, packages and portraits supplied by codingnowai.in's placement showcase.
export function StudentPlacements() {
  const rootRef = useRef<HTMLElement>(null)
  const [paused, setPaused] = useState(false)

  useEffect(() => {
    const root = rootRef.current
    if (!root) return
    let visible = true
    const sync = () => { root.dataset.active = String(visible && !document.hidden) }
    const observer = new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; sync() })
    observer.observe(root)
    document.addEventListener('visibilitychange', sync)
    return () => { observer.disconnect(); document.removeEventListener('visibilitychange', sync) }
  }, [])

  return (
    <section className="student-placements" id="program" aria-labelledby="placements-title" ref={rootRef} data-paused={paused}>
      <header className="placements-heading">
        <h2 id="placements-title">Our <span>Placed Students</span></h2>
        <p className="placements-subtitle">In top MNC companies</p>
        <ul className="placements-benefits" aria-label="Learning and career support">
          {['Industry Oriented Training', 'Real Projects', 'Placement Support', 'Bright Future'].map(text => <li key={text}><span aria-hidden="true">✓</span> {text}</li>)}
        </ul>
      </header>
      <div className="placements-rows">
        {[0, 1].map(row => (
          <div className={`placements-viewport${row ? ' placements-reverse' : ''}`} key={row} tabIndex={0} role="region" aria-label={`Student placements, ${row ? 'second' : 'first'} row`} data-lenis-prevent>
            <div className="placements-track">
              {[0, 1].map(copy => (
                <ul className="placements-group" key={copy} aria-hidden={copy ? true : undefined} inert={copy ? true : undefined}>
                  {students.filter((_, index) => index % 2 === row).map(student => (
                    <li className="placements-card" key={student.name}>
                      <div className="placements-portrait">
                        <span aria-hidden="true">{student.name.split(' ').map(word => word[0]).slice(0, 2).join('')}</span>
                        {student.image && <img src={`/assets/placed-students/${student.image}`} alt={student.name} width={104} height={144} loading="lazy" decoding="async" onError={event => { event.currentTarget.hidden = true }} />}
                      </div>
                      <div className="placements-info">
                        <strong className="placements-name">{student.name}</strong>
                        <span className="placements-company">{student.company}</span>
                        {student.package && <span className="placements-package">{student.package}</span>}
                      </div>
                    </li>
                  ))}
                </ul>
              ))}
            </div>
          </div>
        ))}
      </div>
      <button className="placements-pause" type="button" aria-pressed={paused} onClick={() => setPaused(value => !value)}>{paused ? 'Resume scrolling' : 'Pause scrolling'}</button>
    </section>
  )
}
