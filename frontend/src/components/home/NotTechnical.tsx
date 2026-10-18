import { ArrowIcon } from '../../lib/icons'
import { useModal } from '../../lib/modal-context'

const WHO = [
  ['🎓', 'Students'], ['💼', 'Working Professionals'], ['📊', 'Non-IT Graduates'],
  ['🚀', 'Business Owners'], ['🔄', 'Career Restart'], ['🌱', 'Freshers'],
]

export function NotTechnical() {
  const { openModal } = useModal()

  return (
    <section className="section" aria-labelledby="not-technical-heading">
      <div className="container-x">
        <div className="narrow center">
          <h2 id="not-technical-heading" className="display-lg">
            <span className="line-mask">
              <span>You don’t need to be a tech expert to start.</span>
            </span>
          </h2>
          <p className="lede rv mt-6" style={{ maxWidth: '42rem', marginInline: 'auto' }}>
            No CS degree. No prior coding. Our courses go step by step, from the basics to advanced.
          </p>
        </div>
        <ul className="who">
          {WHO.map(([emoji, label]) => (
            <li className="rv-pop" key={label}>
              <span className="e" aria-hidden="true">
                {emoji}
              </span>
              <span className="t">{label}</span>
            </li>
          ))}
        </ul>
        <div className="rv mt-12 center">
          <button type="button" className="btn btn-ink" onClick={() => openModal('demo')}>
            <span className="shine"></span>
            <span>Start with the free demo class</span>
            <ArrowIcon />
          </button>
        </div>
      </div>
    </section>
  )
}
