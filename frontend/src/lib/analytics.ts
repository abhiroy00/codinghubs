/**
 * GA4 events for conversions. The tag itself is loaded in index.html; if it is missing or blocked these are no-ops.
 * Never pass names, phone numbers, emails or free text: only categories such as the course name and page path.
 */
type Gtag = (command: 'event', name: string, params?: Record<string, string>) => void

export function track(name: string, params: Record<string, string> = {}) {
  if (typeof window === 'undefined') return
  const gtag = (window as unknown as { gtag?: Gtag }).gtag
  if (typeof gtag === 'function') gtag('event', name, { page_path: window.location.pathname, ...params })
}

/** Set once any lead form is accepted: the automatic free demo popup then stays away from this browser. */
export const ENQUIRED_KEY = 'ch_enquired'

/** A lead form was accepted by the server (demo registration, admission enquiry or location enquiry). */
export function trackLead(form: 'demo' | 'enquiry' | 'location_enquiry', course: string, campaignId?: number | null) {
  try {
    localStorage.setItem(ENQUIRED_KEY, '1')
  } catch {
    /* private mode: the popup may show again, which is harmless */
  }
  track('generate_lead', { form, course: course || 'not_selected', ...(campaignId ? { campaign_id: String(campaignId) } : {}) })
}

/** Counts phone, WhatsApp and email link clicks anywhere on the site with one listener. */
export function trackContactClicks() {
  if (typeof document === 'undefined') return
  document.addEventListener('click', (event) => {
    const link = (event.target as Element | null)?.closest?.('a[href]')
    const href = link?.getAttribute('href') ?? ''
    const method = href.startsWith('tel:') ? 'phone' : /wa\.me|api\.whatsapp\.com/.test(href) ? 'whatsapp' : href.startsWith('mailto:') ? 'email' : ''
    if (method) track('contact', { method })
  }, { capture: true })
}
