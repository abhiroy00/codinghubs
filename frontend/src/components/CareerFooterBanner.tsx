import { useRegisterPopup } from '../lib/register-popup'
import { INSTITUTE } from '../pages/free-session/data'
import { FsIcon } from '../pages/free-session/icons'
import './career-footer-banner.css'

export function CareerFooterBanner() {
  const popup = useRegisterPopup()
  return (
    <section className="career-footer-banner" aria-labelledby="career-footer-title">
      <div className="career-footer-card">
        <div>
          <h2 id="career-footer-title">Start your AI career with Coding Hubs</h2>
          <p>Free career counselling · Live industry projects · 100% placement support</p>
        </div>
        <div className="career-footer-actions">
          <a className="career-footer-call" href={INSTITUTE.phoneHref}><FsIcon id="i-phone" />Call Us</a>
          <button type="button" onClick={() => popup.openEnrollment('')}>Enroll Now <span aria-hidden="true">→</span></button>
        </div>
      </div>
    </section>
  )
}
