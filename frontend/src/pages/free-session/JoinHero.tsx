import { useState } from 'react'
import { FsIcon } from './icons'
import { HeroSlider } from './HeroSlider'

export function BatchAnnouncement() {
  const [open, setOpen] = useState(true)
  if (!open) return null
  return (
    <aside className="join-bar" aria-label="New batch announcement">
      <span className="join-bar-dot" aria-hidden="true" />
      <p>Admissions open — new Generative AI and Full Stack batches are filling up.</p>
      <a className="join-bar-apply" href="#register" data-cta="bar-demo">Book free demo <span aria-hidden="true">↗</span></a>
      <button type="button" className="join-bar-close" aria-label="Dismiss announcement" onClick={() => setOpen(false)}>
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18" /></svg>
      </button>
    </aside>
  )
}

/** Original Coding Hubs hero: centred headline over a coverflow of the institute's own photographs. */
export function JoinHero() {
  return (
    <section className="join" id="home" aria-labelledby="hero-title">
      <div className="join-arcs" aria-hidden="true"><span /><span /></div>
      <div className="wrap join-in">
        <div className="join-copy">
          <p className="join-kicker"><span aria-hidden="true" />Coding Hubs School of AI</p>
          <h1 id="hero-title">
            <span className="join-line">Delhi NCR’s most practical</span>{' '}
            <span className="join-line join-accent">AI learning community.</span>
          </h1>
          <p className="join-sub">Live classes, mentors from the industry and projects you can show. Start with a free 2-hour demo class.</p>
          <div className="join-actions">
            <a href="#register" className="btn btn-yellow btn-lg" data-cta="hero-primary">Book free demo class <FsIcon id="i-arrow" /></a>
            <a href="/courses/" className="btn btn-lg join-explore">Explore courses</a>
          </div>
        </div>

        <div className="join-media">
          <HeroSlider />
        </div>
        <ul className="join-proof" aria-label="Demo session details">
          <li><FsIcon id="i-check" />Live online</li>
          <li><FsIcon id="i-check" />2 hours</li>
          <li><FsIcon id="i-check" />No payment needed</li>
        </ul>
      </div>
    </section>
  )
}
