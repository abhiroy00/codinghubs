import { Beams } from './Beams'

const ITEMS = [
  {
    bar: '#4f46e5',
    svg: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 10 12 5 2 10l10 5 10-5Z"/><path d="M6 12v5c3 2 9 2 12 0v-5"/></svg>',
    title: 'Industry-oriented training',
    text: 'A curriculum built with hiring partners, not textbooks.',
  },
  {
    bar: '#7c6cf0',
    svg: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m16 18 6-6-6-6M8 6l-6 6 6 6"/></svg>',
    title: 'Real projects',
    text: 'Ship 50+ industry-level apps your interviewer can open.',
  },
  {
    bar: '#4338ca',
    svg: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 4-6 8-6s8 2 8 6"/></svg>',
    title: 'Live mentorship',
    text: 'Gurukul-style teaching — you don’t just learn, you understand.',
  },
  {
    bar: '#6366f1',
    svg: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>',
    title: 'Placement support',
    text: 'Resume, mock interviews, portfolio and job referrals.',
  },
]

export function Opportunity() {
  return (
    <section className="section bg-2" style={{ overflow: 'hidden' }} aria-labelledby="opportunity-heading">
      <div aria-hidden="true" style={{ pointerEvents: 'none', position: 'absolute', inset: 0, overflow: 'hidden' }}>
        <div
          className="orb"
          style={{ left: '-10rem', top: '-10rem', width: '34rem', height: '34rem', background: 'radial-gradient(circle,color-mix(in srgb,var(--color-brand) 12%,transparent) 0%,transparent 68%)', opacity: 0.6 }}
        ></div>
        <div
          className="orb"
          style={{ right: '-8rem', bottom: '-13rem', width: '38rem', height: '38rem', background: 'radial-gradient(circle,color-mix(in srgb,#7c6cf0 11%,transparent) 0%,transparent 68%)', opacity: 0.6 }}
        ></div>
        <Beams index={0} />
      </div>
      <div className="container-x" style={{ position: 'relative' }}>
        <div className="narrow center">
          <h2 id="opportunity-heading" className="display-md" style={{ color: 'var(--color-muted)' }}>
            <span className="line-mask">
              <span>But AI isn’t just a threat.</span>
            </span>
          </h2>
          <p className="display-xl mt-4 rv-zoom">
            It’s an <span className="grad-text">opportunity</span>.
          </p>
        </div>
        <ul className="cards4 tight mt-16">
          {ITEMS.map((item) => (
            <li className="rv-up opp" key={item.title}>
              <span className="bar" style={{ background: item.bar }}></span>
              <span className="ic" style={{ background: `${item.bar}18`, color: item.bar }} dangerouslySetInnerHTML={{ __html: item.svg }} />
              <h3>{item.title}</h3>
              <p>{item.text}</p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}
