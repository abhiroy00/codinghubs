import { useRef } from 'react'
import { useReveal } from '../hooks/useReveal'

export function Policies() {
  const ref = useRef<HTMLDivElement>(null)
  useReveal(ref)

  return (
    <div ref={ref}>
      <section className="page-hero" aria-labelledby="policies-heading">
        <div className="container-x">
          <div className="narrow center">
            <p className="eyebrow rv">Legal</p>
            <h1 id="policies-heading" className="display-lg mt-4">
              <span className="line-mask">
                <span>Policies.</span>
              </span>
            </h1>
          </div>
        </div>
      </section>

      <section className="section" style={{ maxWidth: '44rem', marginInline: 'auto' }}>
        <div className="container-x" style={{ lineHeight: 1.7, color: 'var(--color-muted)' }}>
          <nav aria-label="Policies" style={{ display: 'flex', flexWrap: 'wrap', gap: '.75rem', marginBottom: '2.5rem' }}>
            <a href="#privacy" className="btn btn-ghost btn-sm">
              Privacy Policy
            </a>
            <a href="#cookies" className="btn btn-ghost btn-sm">
              Cookies
            </a>
            <a href="#terms" className="btn btn-ghost btn-sm">
              Terms &amp; Conditions
            </a>
            <a href="#rescheduling" className="btn btn-ghost btn-sm">
              Session Rescheduling
            </a>
          </nav>

          <h2 id="privacy" className="display-md" style={{ fontSize: '1.4rem', scrollMarginTop: '90px' }}>
            Privacy Policy
          </h2>
          <h3 style={{ marginTop: '1.25rem', fontSize: '1.02rem', color: 'var(--color-ink)' }}>What we collect</h3>
          <p style={{ marginTop: '.6rem' }}>
            When you register for a free demo class or live session we collect your name, mobile number, email address, the
            course you are interested in and, optionally, your current education. We also record basic campaign information
            (such as the advertisement or link you came from) to understand which of our ads are useful.
          </p>
          <h3 style={{ marginTop: '1.25rem', fontSize: '1.02rem', color: 'var(--color-ink)' }}>How we use it</h3>
          <p style={{ marginTop: '.6rem' }}>
            Your information is only used to contact you about the training session and related course information — for
            example, to share the session date, time and joining link, and to answer your questions about the course and
            admission process.
          </p>
          <h3 style={{ marginTop: '1.25rem', fontSize: '1.02rem', color: 'var(--color-ink)' }}>WhatsApp</h3>
          <p style={{ marginTop: '.6rem' }}>We contact you on WhatsApp only if you opt in on the form or message us there first. You can ask us to stop at any time.</p>
          <h3 style={{ marginTop: '1.25rem', fontSize: '1.02rem', color: 'var(--color-ink)' }}>Payments</h3>
          <p style={{ marginTop: '.6rem' }}>
            Course enrollment payments are processed by Razorpay. We do not store your card, UPI or bank details — Razorpay
            handles and secures that information per its own PCI-DSS compliant systems.
          </p>
          <h3 style={{ marginTop: '1.25rem', fontSize: '1.02rem', color: 'var(--color-ink)' }}>Sharing &amp; retention</h3>
          <p style={{ marginTop: '.6rem' }}>
            We do not sell your personal data. It is stored with the service providers we use to run registrations and
            payments, and is kept only as long as needed for these purposes.
          </p>
          <h3 style={{ marginTop: '1.25rem', fontSize: '1.02rem', color: 'var(--color-ink)' }}>Your rights</h3>
          <p style={{ marginTop: '.6rem' }}>
            You can ask us to access, correct or delete your information by contacting us at{' '}
            <a href="mailto:info@codingnowai.in" style={{ textDecoration: 'underline', textUnderlineOffset: '2px' }}>
              info@codingnowai.in
            </a>
            .
          </p>

          <h2 id="cookies" className="display-md" style={{ marginTop: '2.75rem', fontSize: '1.4rem', scrollMarginTop: '90px' }}>
            Cookies
          </h2>
          <p style={{ marginTop: '.6rem' }}>
            With your consent, this site uses analytics and advertising cookies (Google Analytics / Google Ads) to measure
            visits and registrations from our ads. If you reject them, these cookies are not set.
          </p>

          <h2 id="terms" className="display-md" style={{ marginTop: '2.75rem', fontSize: '1.4rem', scrollMarginTop: '90px' }}>
            Terms &amp; Conditions
          </h2>
          <ul style={{ paddingLeft: '1.2rem', marginTop: '.6rem' }}>
            <li>The free demo class is a demonstration and introduction to the selected program. It is not the complete paid course.</li>
            <li>Registering for a free demo class does not create any obligation to enrol in a paid course.</li>
            <li>Paid enrollment fees are charged only after you explicitly confirm and complete payment via Razorpay checkout.</li>
            <li>Session joining details are personal and should not be shared publicly.</li>
            <li>Participants are expected to behave respectfully during live sessions. The trainer may remove participants who disrupt the session.</li>
          </ul>

          <h2 id="rescheduling" className="display-md" style={{ marginTop: '2.75rem', fontSize: '1.4rem', scrollMarginTop: '90px' }}>
            Session Rescheduling &amp; Refund Policy
          </h2>
          <p style={{ marginTop: '.6rem' }}>
            Session dates and times may change due to trainer availability or technical reasons. If a session is
            rescheduled or cancelled, registered students will be informed through the contact details they provided. For
            paid enrollments, refund eligibility is assessed case by case — contact us at the number in the footer within 7
            days of payment.
          </p>
        </div>
      </section>
    </div>
  )
}
