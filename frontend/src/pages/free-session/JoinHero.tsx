import { useState } from 'react'
import { FsIcon } from './icons'

const TILES = ['AK', 'SS', 'RV', 'NK', 'MJ', 'PT', 'HK', 'AS', 'DK']

/** Opening screen of the home page: a dismissible batch strip and the community hero. */
export function JoinHero() {
  const [barOpen, setBarOpen] = useState(true)
  return (
    <>
      {barOpen && (
        <aside className="join-bar" aria-label="New batch announcement">
          <span className="join-bar-dot" aria-hidden="true" />
          <p>Admissions open — new Generative AI and Full Stack batches are filling up.</p>
          <div className="join-bar-actions">
            <a className="join-bar-apply" href="#register" data-cta="bar-demo">
              Book free demo
            </a>
            <a className="join-bar-more" href="#courses">
              Explore courses
            </a>
          </div>
          <button type="button" className="join-bar-close" aria-label="Dismiss announcement" onClick={() => setBarOpen(false)}>
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M6 6l12 12M18 6 6 18" />
            </svg>
          </button>
        </aside>
      )}

      <section className="join" id="home" aria-labelledby="hero-title">
        <span className="join-arc" aria-hidden="true" />
        <div className="wrap join-in">
          <div className="join-copy">
            <p className="join-kicker">Join</p>
            <h1 id="hero-title">
              <span className="join-grad">Delhi NCR’s most practical</span>
              <span>AI learning community</span>
            </h1>
            <p className="join-sub">
              Live classes, mentors from the industry and projects you can show. Start with a free 2-hour demo class.
            </p>
            <div className="join-actions">
              <a href="#register" className="btn btn-yellow btn-lg" data-cta="hero-primary">
                Book free demo class <FsIcon id="i-arrow" />
              </a>
              <a href="#courses" className="btn btn-ghost-light btn-lg" data-cta="hero-explore">
                Explore courses
              </a>
            </div>
          </div>

          <div className="join-stage">
            <figure className="join-card join-card-live">
              <div className="join-grid" aria-hidden="true">
                {TILES.map((tile) => (
                  <span key={tile}>{tile}</span>
                ))}
              </div>
              <figcaption>
                <strong>Live sessions</strong>
                <span>Learn together, every week</span>
              </figcaption>
              <span className="join-tag join-tag-a">learn together</span>
            </figure>

            <figure className="join-card join-card-photo">
              <img
                src="/fs-assets/img/modern-virtual-classroom-studio.jpg"
                alt="Coding Hubs learners in a live classroom session"
                width={640}
                height={440}
                loading="lazy"
                decoding="async"
              />
              <figcaption>
                <strong>Community meetups</strong>
                <span>Build a network that lasts</span>
              </figcaption>
              <span className="join-tag join-tag-b">meet in person</span>
            </figure>

            <figure className="join-card join-card-mentor">
              <img
                src="/fs-assets/img/live-python-class-studio.jpg"
                alt="A Coding Hubs mentor walking through code with the cohort"
                width={420}
                height={520}
                loading="lazy"
                decoding="async"
              />
              <figcaption>
                <strong>Mentor reviews</strong>
                <span>Feedback that moves you forward</span>
              </figcaption>
              <span className="join-tag join-tag-c">grow faster</span>
            </figure>
          </div>
        </div>
      </section>
    </>
  )
}
