import { ArrowIcon } from '../lib/icons'
import { useModal } from '../lib/modal-context'

export function ExpertCTA() {
  const { openModal } = useModal()

  return (
    <section className="section bg-2" aria-labelledby="expert-heading">
      <div className="container-x">
        <div className="center" style={{ maxWidth: '42rem', marginInline: 'auto' }}>
          <h2 id="expert-heading" className="display-md">
            <span className="line-mask">
              <span>Have questions? Talk to an expert.</span>
            </span>
          </h2>
          <p className="lede rv mt-5">Leave your number. We will call you back.</p>
          <div className="rv mt-8">
            <button type="button" className="btn btn-ink" onClick={() => openModal()}>
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
