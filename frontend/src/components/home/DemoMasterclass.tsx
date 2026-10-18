import { ArrowIcon } from '../../lib/icons'
import { useModal } from '../../lib/modal-context'
import { Beams } from './Beams'

const JOURNEY_SVG = `
<defs>
  <linearGradient id="jlg" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="var(--color-brand)" stop-opacity=".15"/><stop offset="50%" stop-color="var(--color-brand)" stop-opacity=".6"/><stop offset="100%" stop-color="#7c6cf0" stop-opacity=".2"/></linearGradient>
  <linearGradient id="jsg" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="var(--color-brand)" stop-opacity="0"/><stop offset="50%" stop-color="var(--color-brand)" stop-opacity=".9"/><stop offset="100%" stop-color="var(--color-brand)" stop-opacity="0"/></linearGradient>
</defs>
<path class="jl" pathLength="1" d="M200,86 C160,124 160,146 200,176 M200,224 C160,262 160,286 200,316" fill="none" stroke="url(#jlg)" stroke-width="1.5" stroke-linecap="round"/>
<path class="animate-beam" d="M200,86 C160,124 160,146 200,176 M200,224 C160,262 160,286 200,316" fill="none" stroke="url(#jsg)" stroke-width="2.5" stroke-linecap="round" stroke-dasharray="40 460" style="animation-duration:4.5s"/>
<path class="jl" pathLength="1" d="M200,86 C240,124 240,146 200,176 M200,224 C240,262 240,286 200,316" fill="none" stroke="url(#jlg)" stroke-width="1.5" stroke-linecap="round"/>
<path class="animate-beam" d="M200,86 C240,124 240,146 200,176 M200,224 C240,262 240,286 200,316" fill="none" stroke="url(#jsg)" stroke-width="2.5" stroke-linecap="round" stroke-dasharray="40 460" style="animation-duration:4.5s;animation-delay:.9s"/>
<g class="jn"><circle cx="200" cy="60" r="26" fill="var(--color-surface)" stroke="var(--color-brand)" stroke-opacity=".35" stroke-width="1.5"/><text x="200" y="65" text-anchor="middle" font-size="13" font-weight="700" fill="var(--color-ink)">You</text></g>
<g class="jn" style="transition-delay:.4s"><circle cx="200" cy="200" r="40" fill="var(--color-brand)" fill-opacity=".08"/><circle cx="200" cy="200" r="34" fill="var(--color-brand)"/><text x="200" y="206" text-anchor="middle" font-size="17" font-weight="700" fill="#fff">AI</text></g>
<g class="jn" style="transition-delay:.8s"><circle cx="200" cy="340" r="26" fill="var(--color-surface)" stroke="var(--color-brand)" stroke-opacity=".35" stroke-width="1.5"/><text x="200" y="345" text-anchor="middle" font-size="13" font-weight="700" fill="var(--color-ink)">→</text>
  <text x="200" y="392" text-anchor="middle" font-size="14" font-weight="600" fill="var(--color-ink)">A job-ready career</text><text x="200" y="410" text-anchor="middle" font-size="11.5" fill="var(--color-muted)" style="font-family:var(--font-sans)">AI, Data, Full Stack, Cloud</text></g>
`

const STEPS = [
  { n: '01', title: 'Understand the path', text: 'Which role fits you, and what it really takes to get there.' },
  { n: '02', title: 'Experience a live class', text: 'Build something with a mentor. Live, not on a slide.' },
  { n: '03', title: 'Get your roadmap', text: 'Your course, timeline and realistic salary — in one session.' },
]

export function DemoMasterclass() {
  const { openModal } = useModal()

  return (
    <section className="section" id="demo" style={{ overflow: 'hidden' }} aria-labelledby="mc-heading">
      <div className="grid-lines" aria-hidden="true" style={{ pointerEvents: 'none', position: 'absolute', inset: 0, opacity: 0.3 }}></div>
      <div aria-hidden="true" style={{ pointerEvents: 'none', position: 'absolute', inset: 0, overflow: 'hidden' }}>
        <div
          className="orb"
          style={{ left: '-10rem', top: '-10rem', width: '34rem', height: '34rem', background: 'radial-gradient(circle,color-mix(in srgb,var(--color-brand) 12%,transparent) 0%,transparent 68%)', opacity: 0.75 }}
        ></div>
        <div
          className="orb"
          style={{ right: '-8rem', bottom: '-13rem', width: '38rem', height: '38rem', background: 'radial-gradient(circle,color-mix(in srgb,#7c6cf0 11%,transparent) 0%,transparent 68%)', opacity: 0.75 }}
        ></div>
        <Beams index={1} />
      </div>
      <div className="container-x" style={{ position: 'relative' }}>
        <div className="narrow center">
          <div className="rv">
            <span className="free-pill">100% free demo class</span>
          </div>
          <h2 id="mc-heading" className="display-lg mt-6">
            <span className="line-mask">
              <span>One class that could change how you see tech.</span>
            </span>
          </h2>
          <p className="lede rv mt-5" style={{ maxWidth: '36rem', marginInline: 'auto' }}>
            Stop wondering if coding is for you. Find out what it can do for you.
          </p>
        </div>
        <div className="mc-grid mt-14">
          <ol className="steps">
            {STEPS.map((step) => (
              <li className="rv-left" key={step.n}>
                <span className="n">{step.n}</span>
                <div>
                  <h3>{step.title}</h3>
                  <p>{step.text}</p>
                </div>
              </li>
            ))}
          </ol>
          <div className="journey2" data-io>
            <svg viewBox="0 0 400 420" aria-hidden="true" dangerouslySetInnerHTML={{ __html: JOURNEY_SVG }} />
            <div className="lab" style={{ top: '14.3%' }}>
              <p>You</p>
              <p>Wherever you are starting from</p>
            </div>
            <div className="lab" style={{ top: '47.6%', transitionDelay: '.4s' }}>
              <p>AI + Code</p>
              <p>Live classes, real projects</p>
            </div>
          </div>
        </div>
        <div className="mc-cta">
          <p className="meta-row">
            <span>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <rect x="3" y="4" width="18" height="18" rx="3" />
                <path d="M16 2v4M8 2v4M3 10h18" />
              </svg>
              Mon – Sat · 9:00 AM – 7:00 PM
            </span>
          </p>
          <p className="price">
            <span className="old strike">Paid</span>
            <span className="new">FREE</span>
          </p>
          <div className="btn-row">
            <button type="button" className="btn btn-ink" onClick={() => openModal('demo')}>
              <span className="shine"></span>
              <span>Begin with the free demo class</span>
              <ArrowIcon />
            </button>
            <button type="button" className="btn btn-ghost" onClick={() => openModal()}>
              <span className="shine"></span>
              <span>Talk to an expert</span>
              <ArrowIcon />
            </button>
          </div>
        </div>
      </div>
    </section>
  )
}
