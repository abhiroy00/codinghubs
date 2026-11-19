import type { CSSProperties } from 'react'
import { Link } from 'react-router-dom'
import { Reveal } from '../../components/ui'
import { useRegisterPopup } from '../../lib/register-popup'
import './career-launch.css'

const LEFT = ['Industry-aligned AI curriculum', 'Hands-on GenAI projects', 'Classroom in Pitampura + live online'] as const
const RIGHT = ['Placement support & job alerts', '1:1 mentor guidance', 'Certificate on completion'] as const

function Pill({ text, side, i }: { text: string; side: 'l' | 'r'; i: number }) {
  return (
    <li className={`cl-pill cl-pill-${side}`} style={{ '--cl-i': i } as CSSProperties}>
      <span className="cl-check" aria-hidden="true">
        <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="m5 12 5 5 9-10" /></svg>
      </span>
      {text}
    </li>
  )
}

/** Centered career CTA: headline, two buttons, floating benefit pills on both sides and the students photo over an arc. */
export function CareerLaunch() {
  const { open } = useRegisterPopup()
  return (
    <section className="cl" id="start-career" aria-labelledby="cl-title">
      <span className="cl-glow cl-glow-a" aria-hidden="true" />
      <span className="cl-glow cl-glow-b" aria-hidden="true" />
      <div className="wrap cl-wrap">
        <ul className="cl-pills cl-pills-l" aria-label="What you get">
          {LEFT.map((t, i) => <Pill key={t} text={t} side="l" i={i} />)}
        </ul>
        <Reveal className="cl-copy">
          <h2 id="cl-title" className="cl-title">
            Join <span className="cl-brand">Coding Hub</span>
            <br />Start Your AI Career Today
          </h2>
          <p className="cl-sub">AI, Data Science and Generative AI courses in Pitampura, Delhi. Our counsellors help you choose the right path. Get a free career consultation now.</p>
          <div className="cl-actions">
            <Link className="ui-btn ui-btn-ghost cl-btn" to="/courses">View Courses</Link>
            <button type="button" className="ui-btn ui-btn-primary cl-btn" aria-haspopup="dialog" onClick={() => open()}>Enquire Now</button>
          </div>
        </Reveal>
        <ul className="cl-pills cl-pills-r" aria-label="Career support">
          {RIGHT.map((t, i) => <Pill key={t} text={t} side="r" i={i} />)}
        </ul>
      </div>
      <div className="cl-stage">
        <span className="cl-arc" aria-hidden="true" />
        <img className="cl-students" src="/img/students.webp" alt="Five smiling Coding Hub students holding laptops and notebooks" width={1400} height={665} loading="lazy" decoding="async" />
      </div>
    </section>
  )
}
