/**
 * GA4 events for conversions. The tag itself is loaded in index.html; if it is missing or blocked these are no-ops.
 * Never pass names, phone numbers, emails or free text: only categories such as the course name and page path.
 */
type Gtag = (command: 'event', name: string, params?: Record<string, string>) => void
const PARAMS = new Set(['form', 'course', 'course_slug', 'resource_type', 'campaign_id', 'presentation', 'method'])
const PRIVATE_PATH = /^\/(?:admin(?:-panel)?|login|register|forgot-password|reset-password|my-account|dashboard|enroll|checkout|gigs\/workspace|newsletter\/(?:confirm|unsubscribe))(?:\/|$)/

export function track(name: string, params: Record<string, string> = {}) {
  if (typeof window === 'undefined') return
  if (PRIVATE_PATH.test(window.location.pathname)) return
  const gtag = (window as unknown as { gtag?: Gtag }).gtag
  if (typeof gtag !== 'function') return
  const safe = Object.fromEntries(Object.entries(params).filter(([key, value]) => PARAMS.has(key) && value.length <= 128 && !/@|(?:\+?\d[\s()-]*){8,}/.test(value)))
  let referrer = ''
  try { referrer = document.referrer ? new URL(document.referrer).origin + '/' : '' } catch { /* No valid referrer. */ }
  try {
    gtag('event', name, {
      ...safe, page_path: window.location.pathname,
      page_location: window.location.origin + window.location.pathname,
      page_referrer: referrer,
    })
  } catch { /* Analytics must never change the outcome of a successful form or navigation. */ }
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
  const params = { form, course: course || 'not_selected', ...(campaignId ? { campaign_id: String(campaignId) } : {}) }
  track('generate_lead', params)
  track('form_submission', params)
  track(form === 'demo' ? 'demo_booking' : 'course_enquiry', params)
}

let lastContentPath = ''
/** Custom content events only; automatic GA4 page_view remains controlled by the existing property configuration. */
export function trackContentView(path: string) {
  if (path === lastContentPath) return
  lastContentPath = path
  const course = path.match(/^\/(?:courses|program)\/([a-z0-9-]+)\/?$/)
  const interview = path.match(/^\/interview\/([a-z0-9-]+)(?:\/|$)/)
  if (course) track('course_view', { course_slug: course[1] })
  else if (interview) track('interview_content_view', { course_slug: interview[1] })
}

let contactsInstalled = false
/** Counts phone, WhatsApp and email link clicks anywhere on the site with one listener. */
export function trackContactClicks() {
  if (typeof document === 'undefined' || contactsInstalled) return
  contactsInstalled = true
  document.addEventListener('click', (event) => {
    const link = (event.target as Element | null)?.closest?.('a[href]')
    const href = link?.getAttribute('href') ?? ''
    let url: URL
    try { url = new URL(href, window.location.origin) } catch { return }
    const method = url.protocol === 'tel:' ? 'phone' : ['wa.me', 'api.whatsapp.com'].includes(url.hostname) ? 'whatsapp' : url.protocol === 'mailto:' ? 'email' : ''
    if (method) {
      track('contact', { method })
      if (method !== 'email') track(`${method}_click`, { method })
    }
    const brochure = url.origin === window.location.origin && url.pathname.match(/^\/api\/courses\/brochures\/([a-z0-9-]+)\/download\/$/)
    if (brochure) {
      const params = { course_slug: brochure[1], resource_type: 'course_brochure' }
      track('brochure_download', params)
      track('resource_download', params)
    }
  }, { capture: true })
}
