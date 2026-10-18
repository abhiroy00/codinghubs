import { useModal } from '../../lib/modal-context'

const LEARNERS = [
  { n: 'Rahul Sharma', r: 'AI Engineer @ TCS', q: 'Coding Hubs School of AI helped me switch my career into AI. The mentorship and real projects were amazing!', tag: 'Career switch into AI', bg: 'linear-gradient(140deg,#4f46e5,#7c6cf0)', co: 'TCS' },
  { n: 'Priya Verma', r: 'Frontend Developer @ Infosys', q: 'Best institute for Full Stack. Placement support is real, not fake like others.', tag: 'Fresher to frontend developer', bg: 'linear-gradient(140deg,#0ea5a4,#14b8a6)', co: 'Infosys' },
  { n: 'Amit Kumar', r: 'Data Analyst', q: 'Gurukul style teaching is unique. You don’t just learn, you understand deeply.', tag: 'Non-IT graduate to data analyst', bg: 'linear-gradient(140deg,#e11d48,#f43f5e)', co: 'Data Analyst' },
  { n: 'Your name here', r: 'Your dream role @ your dream company', q: '3200+ students have already written their story here. The next one could be yours — it starts with a free demo class.', tag: 'Book a free demo →', bg: 'linear-gradient(140deg,#111218,#2c2f3b)', co: 'Next batch' },
]

const initials = (n: string) => n.split(' ').map((s) => s[0]).join('').slice(0, 2)

const QUOTE_SVG =
  '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M7.2 17.5c-1.6 0-2.9-1.3-2.9-3.3 0-3.3 2.4-6.4 5.5-7.7l.7 1.1c-1.9 1-3.1 2.6-3.3 4.1.3-.1.6-.2 1-.2 1.6 0 2.8 1.2 2.8 2.9 0 1.8-1.5 3.1-3.8 3.1Zm9.1 0c-1.6 0-2.9-1.3-2.9-3.3 0-3.3 2.4-6.4 5.5-7.7l.7 1.1c-1.9 1-3.1 2.6-3.3 4.1.3-.1.6-.2 1-.2 1.6 0 2.8 1.2 2.8 2.9 0 1.8-1.5 3.1-3.8 3.1Z"/></svg>'

export function Learners() {
  const { openModal } = useModal()

  return (
    <section className="section bg-2" id="learners" aria-labelledby="proof-heading">
      <div className="container-x">
        <div className="narrow center">
          <p className="eyebrow rv">Learners</p>
          <h2 id="proof-heading" className="display-lg mt-4">
            <span className="line-mask">
              <span>People are starting their AI journey.</span>
            </span>
          </h2>
        </div>
        <ul className="learners">
          {LEARNERS.map((learner, i) => (
            <li className="rv-up lcard" key={learner.n}>
              <div className="g">
                <div className="ph">
                  <div style={{ background: learner.bg }}>
                    <span className="ini" style={i === 3 ? { color: 'var(--color-lime)' } : undefined}>
                      {i === 3 ? 'You?' : initials(learner.n)}
                    </span>
                  </div>
                  <span className="co">{learner.co}</span>
                </div>
                <figure>
                  <span dangerouslySetInnerHTML={{ __html: QUOTE_SVG }} />
                  <blockquote>{learner.q}</blockquote>
                  <figcaption>
                    <b>{learner.n}</b>
                    <span className="r">{learner.r}</span>
                    {i === 3 ? (
                      <button type="button" className="soft-pill" style={{ cursor: 'pointer' }} onClick={() => openModal('demo')}>
                        {learner.tag}
                      </button>
                    ) : (
                      <span className="soft-pill">{learner.tag}</span>
                    )}
                  </figcaption>
                </figure>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}
