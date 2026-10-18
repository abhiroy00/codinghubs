import { Link } from 'react-router-dom'
import { Counter } from '../Counter'
import { useModal } from '../../lib/modal-context'

export function RiskCards() {
  const { openModal } = useModal()

  return (
    <section className="section" style={{ overflow: 'hidden' }} aria-labelledby="risk-heading">
      <span
        aria-hidden="true"
        style={{
          pointerEvents: 'none', position: 'absolute', insetInline: 0, top: 0, height: '28rem',
          background: 'radial-gradient(70% 100% at 50% 0%,rgba(217,119,6,.09),rgba(217,119,6,0) 70%)',
        }}
      ></span>
      <div className="container-x" style={{ position: 'relative' }}>
        <div className="narrow center">
          <p className="amber-eyebrow rv">
            <i></i>Real results
          </p>
          <h2 id="risk-heading" className="display-lg mt-4">
            <span className="line-mask">
              <span>Every career is about to change.</span>
            </span>
          </h2>
          <p className="lede rv" style={{ maxWidth: '42rem', margin: '1.25rem auto 0' }}>
            Not promises. Four things our students and hiring partners have actually done — every one from a real
            Coding Hubs batch.
          </p>
        </div>
        <ul className="cards4 mt-14">
          <li className="rv-up">
            <article className="risk">
              <div className="art" style={{ background: 'linear-gradient(135deg,#fff1e6,#ffe1cc)' }}>
                <svg viewBox="0 0 64 64" fill="none" stroke="#c2410c" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="24" cy="22" r="9" />
                  <path d="M8 52c0-9 7-15 16-15s16 6 16 15" />
                  <circle cx="44" cy="20" r="7" opacity=".5" />
                  <path d="M44 34c7 0 13 5 13 13" opacity=".5" />
                </svg>
              </div>
              <div className="body">
                <Counter to={3200} suffix="+" color="#c2410c" />
                <p className="txt">
                  students trained and placed across AI, Data Science, Full Stack and Cloud roles — from freshers to
                  career-switchers.
                </p>
                <div className="foot">
                  <p>Placement record</p>
                  <p>All batches, Delhi NCR centres</p>
                  <Link to="/#learners">See their stories →</Link>
                </div>
              </div>
            </article>
          </li>
          <li className="rv-up">
            <article className="risk">
              <div className="art" style={{ background: 'linear-gradient(135deg,#eef2ff,#dfe3ff)' }}>
                <svg viewBox="0 0 64 64" fill="none" stroke="#4f46e5" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="32" cy="22" r="10" />
                  <path d="M14 54c0-10 8-17 18-17s18 7 18 17" />
                </svg>
              </div>
              <div className="body">
                <p className="txt" style={{ marginTop: 0, fontSize: '1.0625rem', lineHeight: 1.45, letterSpacing: '-.01em', color: 'var(--color-ink)' }}>
                  “Coding Hubs School of AI helped me switch my career into AI. The mentorship and real projects were
                  amazing!”
                </p>
                <div className="foot">
                  <p>Rahul Sharma</p>
                  <p>AI Engineer @ TCS · Alumni</p>
                  <Link to="/#learners">Read the story →</Link>
                </div>
              </div>
            </article>
          </li>
          <li className="rv-up">
            <article className="risk">
              <div className="art" style={{ background: 'linear-gradient(135deg,#e7f8f3,#d3f1e8)' }}>
                <svg viewBox="0 0 64 64" fill="none" stroke="#0f766e" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="10" y="20" width="44" height="32" rx="4" />
                  <path d="M24 20v-6a4 4 0 0 1 4-4h8a4 4 0 0 1 4 4v6" />
                  <path d="M10 34h44" />
                </svg>
              </div>
              <div className="body">
                <p className="txt" style={{ marginTop: 0, fontSize: '1.0625rem', lineHeight: 1.45, letterSpacing: '-.01em', color: 'var(--color-ink)' }}>
                  “Best institute for Full Stack. Placement support is real, not fake like others.”
                </p>
                <div className="foot">
                  <p>Priya Verma</p>
                  <p>Frontend Developer @ Infosys · Alumni</p>
                  <Link to="/#learners">Read the story →</Link>
                </div>
              </div>
            </article>
          </li>
          <li className="rv-up">
            <article className="risk">
              <div className="art" style={{ background: 'linear-gradient(135deg,#fff0f3,#ffdfe6)' }}>
                <svg viewBox="0 0 64 64" fill="none" stroke="#be123c" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M8 50 24 34l10 8 20-22" />
                  <path d="M42 20h12v12" />
                  <path d="M8 58h48" />
                </svg>
              </div>
              <div className="body">
                <p className="big" style={{ color: '#be123c' }}>
                  ₹34 LPA
                </p>
                <p className="txt">
                  highest package offered to a Coding Hubs student — with an average 3X salary growth for learners
                  who switched careers.
                </p>
                <div className="foot">
                  <p>Highest package</p>
                  <p>Coding Hubs placement drive</p>
                  <Link to="/#compare">Compare programs →</Link>
                </div>
              </div>
            </article>
          </li>
        </ul>
        <div className="mt-14 center">
          <p className="rv" style={{ maxWidth: '36rem', marginInline: 'auto', fontSize: '.9375rem', lineHeight: 1.625, color: 'var(--color-muted)' }}>
            None of this is a reason to panic. It is a reason to start — and it takes one free demo class.
          </p>
          <div className="rv mt-8">
            <button type="button" className="btn btn-lime" onClick={() => openModal('demo')}>
              <span className="shine"></span>
              <span>Join the free demo class</span>
            </button>
          </div>
        </div>
      </div>
    </section>
  )
}
