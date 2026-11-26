import { useState } from 'react'
import campuses from './campuses.json'
import './campus-explore.css'

export function CampusExplore() {
  const [paused, setPaused] = useState(false)
  return (
    <section className="campus-explore" id="campus-explore" aria-labelledby="campus-explore-title" data-paused={paused}>
      <header className="campus-explore-heading">
        <h2 id="campus-explore-title">Explore Our <span>Campus Connect</span></h2>
        <p>Experience industry-oriented learning with live classes, expert mentorship, practical labs, real-world projects, and collaborative student activities.</p>
      </header>
      <div className="campus-explore-viewport" tabIndex={0} role="region" aria-label="Campus Connect colleges" data-lenis-prevent>
        <div className="campus-explore-track">
          {[0, 1].map(copy => (
            <ul className="campus-explore-group" key={copy} aria-hidden={copy ? true : undefined} inert={copy ? true : undefined}>
              {campuses.map(campus => (
                <li className="campus-explore-card" key={campus.name}>
                  <img src={campus.image} alt={`Campus Connect at ${campus.name}`} width={800} height={600} loading="lazy" decoding="async" />
                  <div><h3>{campus.name}</h3><p>Campus Connect Drive</p></div>
                </li>
              ))}
            </ul>
          ))}
        </div>
      </div>
      <button className="campus-explore-pause" type="button" aria-pressed={paused} onClick={() => setPaused(value => !value)}>{paused ? 'Resume campus scrolling' : 'Pause campus scrolling'}</button>
    </section>
  )
}
