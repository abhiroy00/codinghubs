import { useCallback, useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { api } from '../lib/api'
import { track } from '../lib/analytics'
import { useRegisterPopup } from '../lib/register-popup'
import { COURSE_BY_SLUG } from '../learning/catalog'
import { useLenisRef } from '../lib/lenis-context'
import { OfferClaimForm } from './OfferClaimForm'
import './offer-campaign.css'

/** Public fields of an admin-managed course offer (backend: apps/leads Campaign). */
interface Campaign {
  id: number
  title: string
  offer_text: string
  offer_label: string
  coupon_code: string
  terms: string
  cta_label: string
  cta_url: string
  presentation: 'bar' | 'card' | 'modal'
  frequency: 'once' | 'daily' | 'session'
  ends_at: string | null
  show_countdown: boolean
  updated_at: string
}

/** Offers never appear on sign-in, account, checkout or admin screens. */
const PRIVATE = /^\/(login|register|forgot-password|reset-password|my-account|dashboard|enroll|admin-panel|interview-studio|ai)(\/|$)/
const DAY = 86_400_000

const dismissKey = (c: Campaign) => `ch_offer_${c.id}_${c.updated_at}`

function wasDismissed(c: Campaign): boolean {
  try {
    if (c.frequency === 'session') return sessionStorage.getItem(dismissKey(c)) !== null
    const at = Number(localStorage.getItem(dismissKey(c)) ?? 0)
    if (!at) return false
    return c.frequency === 'once' || Date.now() - at < DAY
  } catch {
    return false
  }
}

function rememberDismissal(c: Campaign) {
  try {
    ;(c.frequency === 'session' ? sessionStorage : localStorage).setItem(dismissKey(c), String(Date.now()))
  } catch {
    // Storage blocked: the offer simply stays hidden until the next page load.
  }
}

/** The course the visitor is looking at, from /courses/<slug>/ or /interview/<slug>/... */
function courseFromPath(pathname: string) {
  const slug = pathname.match(/^\/(?:courses|interview)\/([a-z0-9-]+)\//)?.[1] ?? ''
  const course = COURSE_BY_SLUG.get(slug)
  return { slug: course ? slug : '', name: course?.name ?? '', category: course?.category ?? '' }
}

function remaining(endsAt: string, now: number) {
  const ms = new Date(endsAt).getTime() - now
  if (ms <= 0) return null
  const s = Math.floor(ms / 1000)
  const d = Math.floor(s / 86400), h = Math.floor((s % 86400) / 3600), m = Math.floor((s % 3600) / 60), sec = s % 60
  return d > 0 ? `${d}d ${h}h ${m}m` : `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`
}

/**
 * Shows at most one live offer for the current page. It renders nothing on the server and on first paint, then asks
 * the API (never cached) for the matching offer, so an expired or paused offer cannot linger.
 */
export function OfferCampaign() {
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const popup = useRegisterPopup()
  const lenisRef = useLenisRef()
  const [campaign, setCampaign] = useState<Campaign | null>(null)
  const [now, setNow] = useState(() => Date.now())
  const viewed = useRef<number | null>(null)
  const dialogRef = useRef<HTMLDivElement>(null)
  const returnFocus = useRef<HTMLElement | null>(null)
  const course = courseFromPath(pathname)

  useEffect(() => {
    setCampaign(null)
    if (PRIVATE.test(pathname)) return
    let live = true
    api.get<{ campaign: Campaign | null }>('/leads/campaigns/active/', { params: { path: pathname, course: course.slug, category: course.category } })
      .then(({ data }) => { if (live && data.campaign && !wasDismissed(data.campaign)) setCampaign(data.campaign) })
      .catch(() => undefined)
    return () => { live = false }
  }, [pathname, course.slug, course.category])

  // Expiry is checked against the real end time every second, so the offer disappears exactly when it ends.
  useEffect(() => {
    if (!campaign?.ends_at) return
    const timer = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(timer)
  }, [campaign])
  const expired = !!campaign?.ends_at && new Date(campaign.ends_at).getTime() <= now
  const visible = campaign && !expired ? campaign : null

  useEffect(() => {
    if (visible && viewed.current !== visible.id) {
      viewed.current = visible.id
      track('offer_view', { campaign_id: String(visible.id), presentation: visible.presentation })
    }
  }, [visible])

  const dismiss = useCallback(() => {
    if (!campaign) return
    rememberDismissal(campaign)
    setCampaign(null)
    returnFocus.current?.focus?.()
  }, [campaign])

  const act = useCallback(() => {
    if (!campaign) return
    track('offer_click', { campaign_id: String(campaign.id) })
    if (campaign.presentation === 'modal') { rememberDismissal(campaign); setCampaign(null) }
    if (campaign.cta_url === '#demo') popup.open(course.name || undefined, campaign.id)
    else if (campaign.cta_url.startsWith('/')) navigate(campaign.cta_url)
    else window.location.assign(campaign.cta_url)
  }, [campaign, course.name, navigate, popup])

  // Modal: move focus in, keep Tab inside, close on Escape, give focus back on close.
  useEffect(() => {
    if (visible?.presentation !== 'modal') return
    returnFocus.current = document.activeElement as HTMLElement | null
    const dialog = dialogRef.current
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    lenisRef.current?.stop()
    dialog?.querySelector<HTMLElement>('button, a[href]')?.focus()
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { event.preventDefault(); dismiss(); return }
      if (event.key !== 'Tab' || !dialog) return
      const items = [...dialog.querySelectorAll<HTMLElement>('button:not(:disabled), a[href], input:not(:disabled), summary, [tabindex="0"]')]
        .filter(element => element.tabIndex >= 0 && element.getClientRects().length > 0)
      if (!items.length) return
      const first = items[0], last = items[items.length - 1]
      if (event.shiftKey && (document.activeElement === first || !dialog.contains(document.activeElement))) { event.preventDefault(); last.focus() }
      else if (!event.shiftKey && (document.activeElement === last || !dialog.contains(document.activeElement))) { event.preventDefault(); first.focus() }
    }
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = previousOverflow
      lenisRef.current?.start()
      returnFocus.current?.focus?.()
    }
  }, [visible, dismiss, lenisRef])

  if (!visible) return null
  const countdown = visible.show_countdown && visible.ends_at ? remaining(visible.ends_at, now) : null
  const body = (
    <>
      <div className="oc-copy">
        {visible.offer_label && <span className="oc-label">{visible.offer_label}</span>}
        <strong className="oc-title" id={`oc-title-${visible.id}`}>{visible.title}</strong>
        <span className="oc-text">{visible.offer_text}</span>
        {visible.coupon_code && <span className="oc-code">Code <b>{visible.coupon_code}</b></span>}
        {countdown && <span className="oc-timer" aria-live="off">Ends in <time dateTime={visible.ends_at!}>{countdown}</time></span>}
        {visible.terms && <details className="oc-terms"><summary>Terms</summary><p>{visible.terms}</p></details>}
      </div>
      <div className="oc-actions">
        <button type="button" className="oc-cta" onClick={act}>{visible.cta_label}</button>
        <button type="button" className="oc-close" onClick={dismiss} aria-label="Dismiss offer">×</button>
      </div>
    </>
  )
  if (visible.presentation === 'modal') {
    const percentage = visible.offer_label.match(/(\d+)\s*%/)?.[1]
    const welcomeOffer = visible.title === '20% off course fees' && percentage === '20'
    const timerParts = visible.ends_at && countdown
      ? Math.max(0, Math.floor((new Date(visible.ends_at).getTime() - now) / 1000))
      : null
    const units = timerParts === null ? [] : [Math.floor(timerParts / 3600), Math.floor(timerParts / 60) % 60, timerParts % 60]
    return (
      <div className="oc-overlay" onClick={(event) => { if (event.target === event.currentTarget) dismiss() }}>
        <div className="oc-modal" role="dialog" aria-modal="true" aria-labelledby={`oc-title-${visible.id}`} ref={dialogRef} data-lenis-prevent>
          <button type="button" className="oc-close" onClick={dismiss} aria-label="Dismiss offer">×</button>
          <div className="oc-offer-panel">
            <span className="oc-bubble oc-bubble-one" aria-hidden="true" />
            <span className="oc-bubble oc-bubble-two" aria-hidden="true" />
            <span className="oc-bubble oc-bubble-three" aria-hidden="true" />
            <span className="oc-offer-badge">{visible.ends_at ? 'LIMITED TIME' : 'WELCOME OFFER'}</span>
            {percentage ? <><div className="oc-percent">{percentage}<span>%</span></div><div className="oc-off">OFF</div></> : <div className="oc-off">{visible.offer_label || 'Course offer'}</div>}
            <p className="oc-offer-sub">{course.name || 'On all AI & Full Stack Courses'}</p>
            <div className="oc-stars" aria-label="5 stars">★★★★★</div>
            <p className="oc-rating">Rated 4.8 by 3,200+ students</p>
          </div>
          <div className="oc-offer-main">
            <p className="oc-eyebrow">🎉 Exclusive Welcome Offer</p>
            <h2 id={`oc-title-${visible.id}`} className="oc-offer-title">{welcomeOffer ? 'Grab Your 20% Discount Before It Expires!' : visible.title}</h2>
            <p className="oc-description">{welcomeOffer && visible.cta_url === '#demo' ? 'Enter your details and our team will reach out with your personalised course offer.' : visible.offer_text}</p>
            {units.length > 0 && <div className="oc-countdown" role="timer" aria-label="Time remaining for this offer">
              {units.map((value, index) => <div className="oc-unit" key={index}><span>{String(value).padStart(2, '0')}</span><small>{['HOURS', 'MINS', 'SECS'][index]}</small></div>)}
            </div>}
            {visible.cta_url === '#demo'
              ? <OfferClaimForm key={visible.id} campaignId={visible.id} course={course.name} label={visible.offer_label || 'Course Offer'} couponCode={visible.coupon_code} />
              : <div className="oc-actions">{visible.coupon_code && <span className="oc-code">Code <b>{visible.coupon_code}</b></span>}<button type="button" className="oc-claim-button" onClick={act}>{visible.cta_label}</button></div>}
            {visible.terms && <details className="oc-terms"><summary>Offer terms</summary><p>{visible.terms}</p></details>}
          </div>
        </div>
      </div>
    )
  }
  return <aside className={`oc-${visible.presentation}`} aria-label="Course offer">{body}</aside>
}
