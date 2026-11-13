import { useState } from 'react'
import { FsIcon } from './icons'

export function BatchAnnouncement() {
  const [open, setOpen] = useState(true)
  if (!open) return null
  return (
    <aside className="join-bar" aria-label="New batch announcement">
      <span className="join-bar-dot" aria-hidden="true" />
      <p>Admissions open — new Generative AI and Full Stack batches are filling up.</p>
      <a className="join-bar-apply" href="#register" data-cta="bar-demo">Book free demo <span aria-hidden="true">↗</span></a>
      <a className="join-bar-more" href="#courses">Explore courses</a>
      <button type="button" className="join-bar-close" aria-label="Dismiss announcement" onClick={() => setOpen(false)}>
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18" /></svg>
      </button>
    </aside>
  )
}

/** Original Coding Hubs composition using the institute's existing classroom assets. */
export function JoinHero() {
  return (
    <section className="join" id="home" aria-labelledby="hero-title">
      <div className="join-orbit" aria-hidden="true" />
      <div className="wrap join-in">
        <div className="join-copy">
          <p className="join-kicker"><span aria-hidden="true" /> Join · Coding Hubs School of AI</p>
          <h1 id="hero-title">
            Delhi NCR’s<br />most practical<br />
            <span className="join-grad">AI learning<br />community<span className="join-period">.</span></span>
          </h1>
          <p className="join-sub">Live classes, mentors from the industry and projects you can show. Start with a free 2-hour demo class.</p>
          <div className="join-actions">
            <a href="#register" className="btn btn-yellow btn-lg" data-cta="hero-primary">Book free demo class <FsIcon id="i-arrow" /></a>
            <a href="#courses" className="join-explore">Explore courses <span aria-hidden="true">↗</span></a>
          </div>
          <ul className="join-proof" aria-label="Demo session details">
            <li><FsIcon id="i-check" />Live online</li>
            <li><FsIcon id="i-check" />2 hours</li>
            <li><FsIcon id="i-check" />No payment needed</li>
          </ul>
        </div>

        <div className="join-stage">
          <figure className="join-classroom">
            <img src="/fs-assets/img/modern-virtual-classroom-studio.jpg" alt="Coding Hubs live classroom learning environment" width={1280} height={801} fetchPriority="high" decoding="async" />
            <span className="join-live"><span className="live-dot" aria-hidden="true" />LIVE SESSIONS</span>
            <figcaption><strong>Learn together,<br />every week.</strong><span>Community meetups · Build a network that lasts</span></figcaption>
          </figure>
          <div className="join-editor" aria-hidden="true">
            <div className="join-editor-bar"><span className="join-editor-dots"><i /><i /><i /></span><span>your_next_chapter.py</span><FsIcon id="i-code" /></div>
            <pre><span className="je-comment"># A little curiosity. A lot of possibility.</span>{'\n'}<span className="je-purple">from</span> coding_hubs <span className="je-purple">import</span> future{'\n\n'}journey = future.<span className="je-blue">start</span>({'\n'}    learn=<span className="je-yellow">"by building"</span>,{'\n'}    together=<span className="je-purple">True</span>{'\n'})<span className="join-cursor" /></pre>
            <div className="join-editor-status"><span><i /> Ready to build</span><span>Python · AI · You</span></div>
          </div>
          <figure className="join-mentor">
            <img src="/fs-assets/img/live-python-class-studio.jpg" alt="Coding Hubs practical coding class" width={1280} height={683} decoding="async" />
            <figcaption><span className="join-mentor-icon"><FsIcon id="i-chat" /></span><span><strong>Mentor reviews</strong><small>Feedback that moves you forward</small></span><span aria-hidden="true">↗</span></figcaption>
          </figure>
          <span className="join-note" aria-hidden="true">less scrolling.<br /><em>more building.</em><svg viewBox="0 0 75 48"><path d="M3 5C8 42 52 44 68 20m-17 4 18-7 2 19" /></svg></span>
        </div>
      </div>
      <div className="wrap join-bottom"><span>LEARN. BUILD. GROW.</span><a href="#demo-classes">See how we teach <span aria-hidden="true">↓</span></a><span className="join-bottom-place"><FsIcon id="i-pin" />DELHI NCR · ONLINE</span></div>
    </section>
  )
}
