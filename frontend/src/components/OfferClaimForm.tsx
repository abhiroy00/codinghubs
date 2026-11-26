import { useEffect, useRef, useState, type FormEvent } from 'react'
import { api } from '../lib/api'
import { track, trackLead } from '../lib/analytics'
import { normalizePhone } from '../pages/free-session/RegisterForm'

export function OfferClaimForm({ campaignId, course, label, couponCode }: { campaignId: number; course: string; label: string; couponCode: string }) {
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')
  const [saved, setSaved] = useState(false)
  const successRef = useRef<HTMLDivElement>(null)
  useEffect(() => { if (saved) successRef.current?.focus() }, [saved])

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (sending) return
    const form = event.currentTarget
    const fields = new FormData(form)
    const name = String(fields.get('name') ?? '').trim().replace(/\s+/g, ' ')
    const phone = normalizePhone(String(fields.get('phone') ?? ''))
    setError('')
    if (name.length < 2) { setError('Please enter your full name.'); return }
    if (!phone) { setError('Enter a valid 10-digit Indian mobile number (starting with 6, 7, 8 or 9).'); return }
    setSending(true)
    track('offer_click', { campaign_id: String(campaignId) })
    try {
      await api.post('/leads/', {
        name, email: String(fields.get('email') ?? '').trim(), phone: '+91' + phone,
        course, mode: 'expert', campaign: campaignId, source_page: window.location.pathname,
        whatsapp_consent: true,
      })
      trackLead('enquiry', course, campaignId)
      setSaved(true)
    } catch (cause) {
      const response = (cause as { response?: { data?: Record<string, unknown> } }).response
      setError(response?.data?.campaign ? 'This offer is no longer available. Please close this window and contact our team.' : 'Your request could not be sent. Please try again.')
    } finally {
      setSending(false)
    }
  }

  if (saved) return (
    <div className="oc-success" role="status" tabIndex={-1} ref={successRef}>
      <strong>Request received!</strong>
      <p>Our team will contact you about your course offer using the details you shared.</p>
      {couponCode && <p>Your coupon code: <b>{couponCode}</b></p>}
    </div>
  )

  return (
    <form className="oc-claim-form" onSubmit={submit}>
      <input name="name" aria-label="Your Full Name" placeholder="Your Full Name" autoComplete="name" minLength={2} maxLength={80} required />
      <input name="email" type="email" aria-label="Your Email Address" placeholder="Your Email Address" autoComplete="email" maxLength={120} required />
      <input name="phone" type="tel" inputMode="tel" aria-label="WhatsApp Number" placeholder="WhatsApp Number" autoComplete="tel" maxLength={20} required />
      <button className="oc-claim-button" type="submit" disabled={sending} aria-busy={sending}>
        {sending ? 'Submitting…' : `Claim My ${label}`} <span aria-hidden="true">→</span>
      </button>
      {error && <p className="oc-form-error" role="alert">{error}</p>}
      <p className="oc-note">✓ No spam. By submitting, you agree to be contacted about this offer on WhatsApp and email. <a href="/policies#privacy">Privacy Policy</a></p>
    </form>
  )
}
