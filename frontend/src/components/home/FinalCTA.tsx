import { ArrowIcon } from '../../lib/icons'
import { useModal } from '../../lib/modal-context'
import { Beams } from './Beams'
import { Words } from '../Words'

export function FinalCTA() {
  const { openModal } = useModal()

  return (
    <section className="final" style={{ position: 'relative', isolation: 'isolate' }} aria-labelledby="final-heading">
      <div aria-hidden="true" style={{ pointerEvents: 'none', position: 'absolute', inset: 0, overflow: 'hidden' }}>
        <div
          className="orb"
          style={{ left: '-10rem', top: '-10rem', width: '34rem', height: '34rem', background: 'radial-gradient(circle,color-mix(in srgb,var(--color-brand) 12%,transparent) 0%,transparent 68%)' }}
        ></div>
        <div
          className="orb"
          style={{ right: '-8rem', bottom: '-13rem', width: '38rem', height: '38rem', background: 'radial-gradient(circle,color-mix(in srgb,#7c6cf0 11%,transparent) 0%,transparent 68%)' }}
        ></div>
        <Beams index={2} />
      </div>
      <div
        aria-hidden="true"
        style={{ pointerEvents: 'none', position: 'absolute', insetInline: 0, bottom: 0, zIndex: -1, height: '28rem', background: 'radial-gradient(60% 70% at 50% 100%,var(--color-soft) 0%,transparent 70%)' }}
      ></div>
      <div className="container-x center" style={{ position: 'relative' }}>
        <h2 id="final-heading" className="display-lg" style={{ maxWidth: '56rem', marginInline: 'auto', color: 'var(--color-muted)' }}>
          <span className="line-mask">
            <span>The question isn’t whether AI will change your career.</span>
          </span>
        </h2>
        <Words as="p" className="display-xl mt-6" text="It's whether you'll be ready for it." />
        <p className="lede rv" style={{ maxWidth: '36rem', margin: '1.75rem auto 0' }}>
          Understand AI. Build real projects. Get placed.
        </p>
        <div className="rv mt-10">
          <div className="btn-row c">
            <button type="button" className="btn btn-ink" onClick={() => openModal('demo')}>
              <span className="shine"></span>
              <span>Join the free demo class</span>
              <ArrowIcon />
            </button>
            <button type="button" className="btn btn-ghost" onClick={() => openModal()}>
              <span className="shine"></span>
              <span>Talk to an expert</span>
              <ArrowIcon />
            </button>
          </div>
        </div>
        <div className="rv" style={{ marginTop: '2.25rem', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '.75rem' }}>
          <p className="meta-row">
            <span>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <rect x="3" y="4" width="18" height="18" rx="3" />
                <path d="M16 2v4M8 2v4M3 10h18" />
              </svg>
              Mon – Sat · 9:00 AM – 7:00 PM
            </span>
          </p>
          <p style={{ display: 'flex', alignItems: 'center', gap: '.5rem', fontSize: '.875rem' }}>
            <span className="strike muted">Demo class</span>
            <span className="ok">Value — FREE</span>
          </p>
        </div>
      </div>
    </section>
  )
}
