import { createContext, lazy, Suspense, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
const RegisterForm = lazy(() => import('../pages/free-session/RegisterForm').then((m) => ({ default: m.RegisterForm })))
import { useLenisRef } from './lenis-context'
import { useOptionalAuth } from './auth-context'
import { ENQUIRED_KEY } from './analytics'
import { FS_CSS } from './fs-css'
import { useScopedStylesheet } from '../hooks/useScopedStylesheet'
import './demo-dialog.css'

function PopupStyles() {
  useScopedStylesheet([FS_CSS])
  return null
}

const KEY = 'ch_registered'
/** How long after page load, and after each close, the free demo form opens by itself. */
export const AUTO_OPEN_MS = 25_000
/** Sign-in, account and working screens, where an uninvited popup would get in the way. */
const NO_AUTO_OPEN = /^\/(login|register|forgot-password|reset-password|dashboard|my-account|admin|enroll\/|ai\/|interview-studio\/.|gigs\/workspace|certificates\/verify|newsletter\/(confirm|unsubscribe)|policies)/

/** True while the visitor is busy: another tab, another dialog, or typing in a form or the code editor. */
function visitorIsBusy() {
  if (document.hidden || NO_AUTO_OPEN.test(window.location.pathname)) return true
  if (document.querySelector('[aria-modal="true"], .oc-modal, #modal.open')) return true
  const active = document.activeElement as HTMLElement | null
  return !!active && (active.isContentEditable || /^(INPUT|TEXTAREA|SELECT|IFRAME)$/.test(active.tagName))
}

interface PopupApi {
  /**
   * Opens the "Reserve your free seat" form (it also opens by itself every AUTO_OPEN_MS for visitors who have not
   * registered or signed in). After the visitor has registered it takes them to the courses instead. `campaignId` records the offer that led here.
   */
  open: (course?: string, campaignId?: number) => void
  /** Enrollment enquiries remain available after a previous demo registration. */
  openEnrollment: (course: string) => void
  registered: boolean
  /** Call when a registration form was submitted successfully. */
  markRegistered: () => void
}

const FALLBACK: PopupApi = { open: () => undefined, openEnrollment: () => undefined, registered: false, markRegistered: () => undefined }
const PopupContext = createContext<PopupApi>(FALLBACK)

export function useRegisterPopup() {
  return useContext(PopupContext)
}

function readFlag(key = KEY) {
  try {
    return localStorage.getItem(key) === '1'
  } catch {
    return false
  }
}

export function RegisterPopupProvider({ children }: { children: ReactNode }) {
  const navigate = useNavigate()
  const lenisRef = useLenisRef()
  const [registered, setRegistered] = useState(false)
  const [isOpen, setOpen] = useState(false)
  const [course, setCourse] = useState<string | null>(null)
  const [campaignId, setCampaignId] = useState<number | null>(null)
  const [intent, setIntent] = useState<'demo' | 'enrollment'>('demo')
  const [token, setToken] = useState(0)
  const returnFocus = useRef<HTMLElement | null>(null)
  const openedByItself = useRef(false)
  const auth = useOptionalAuth()
  const signedInOrChecking = !!auth && (auth.loading || !!auth.user)

  useEffect(() => setRegistered(readFlag()), [])

  const close = useCallback(() => {
    setOpen(false)
    document.body.style.overflow = ''
    lenisRef.current?.start()
    returnFocus.current?.focus?.()
  }, [lenisRef])

  const showPopup = useCallback(
    (nextIntent: 'demo' | 'enrollment', c?: string, campaign?: number) => {
      returnFocus.current = document.activeElement as HTMLElement | null
      setIntent(nextIntent)
      setCourse(c ?? null)
      setCampaignId(campaign ?? null)
      setToken((t) => t + 1)
      setOpen(true)
      document.body.style.overflow = 'hidden'
      lenisRef.current?.stop()
    },
    [lenisRef],
  )

  const open = useCallback((c?: string, campaign?: number) => {
    if (readFlag()) { navigate('/courses/'); return }
    openedByItself.current = false
    showPopup('demo', c, campaign)
  }, [navigate, showPopup])

  const openEnrollment = useCallback((c: string) => { openedByItself.current = false; showPopup('enrollment', c) }, [showPopup])

  // The timer restarts each time the popup closes. It is not tied to the route, so browsing does not postpone it.
  useEffect(() => {
    if (isOpen || registered || signedInOrChecking) return
    let timer = window.setTimeout(function tryOpen() {
      if (readFlag() || readFlag(ENQUIRED_KEY)) return
      if (visitorIsBusy()) { timer = window.setTimeout(tryOpen, AUTO_OPEN_MS); return }
      openedByItself.current = true
      showPopup('demo')
    }, AUTO_OPEN_MS)
    return () => window.clearTimeout(timer)
  }, [isOpen, registered, signedInOrChecking, showPopup])

  useEffect(() => {
    if (!isOpen) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close()
      if (e.key !== 'Tab') return
      const dialog = document.querySelector<HTMLElement>('.rp-dialog')
      const focusable = Array.from(dialog?.querySelectorAll<HTMLElement>('button:not(:disabled), a[href], input:not(:disabled), select:not(:disabled), [tabindex="0"]') ?? [])
        .filter((el) => el.tabIndex >= 0 && el.getClientRects().length > 0)
      const first = focusable[0]
      const last = focusable.at(-1)
      if (!first || !last) return
      if (e.shiftKey && (document.activeElement === first || !dialog?.contains(document.activeElement))) {
        e.preventDefault()
        last.focus()
      } else if (!e.shiftKey && (document.activeElement === last || !dialog?.contains(document.activeElement))) {
        e.preventDefault()
        first.focus()
      }
    }
    document.addEventListener('keydown', onKey)
    const dialog = document.querySelector<HTMLElement>('.rp-dialog')
    const focusInitial = () => {
      const input = document.getElementById('rp-f-name')
      if (!input) return
      // The lazy form may load after the visitor has already started tabbing.
      if (!dialog?.contains(document.activeElement)) (openedByItself.current ? dialog?.querySelector<HTMLElement>('.rp-close') : input)?.focus()
      loading.disconnect()
    }
    const loading = new MutationObserver(focusInitial)
    if (dialog) loading.observe(dialog, { childList: true, subtree: true })
    focusInitial()
    return () => {
      document.removeEventListener('keydown', onKey)
      loading.disconnect()
    }
  }, [isOpen, close])

  const onThanks = useCallback((shown: boolean) => {
    if (!shown) return
    try {
      localStorage.setItem(KEY, '1')
    } catch {
      /* private mode: the popup may show again, which is harmless */
    }
    setRegistered(true)
  }, [])

  const markRegistered = useCallback(() => onThanks(true), [onThanks])
  const api = useMemo(() => ({ open, openEnrollment, registered, markRegistered }), [open, openEnrollment, registered, markRegistered])

  return (
    <PopupContext.Provider value={api}>
      {children}
      {isOpen && (
        <div className="rp-overlay" role="presentation" onMouseDown={(e) => e.target === e.currentTarget && close()}>
          <PopupStyles />
          <div className={`rp-dialog fs-page${intent === 'demo' ? ' rp-consultation' : ''}`} role="dialog" aria-modal="true" aria-label={intent === 'enrollment' ? 'Enrollment enquiry' : 'Free demo registration'} data-intent={intent} data-lenis-prevent>
            <button type="button" className="rp-close" aria-label="Close" onClick={close}>
              ×
            </button>
            {intent === 'demo' && <aside className="rp-story">
              <p className="rp-story-brand"><img src="/assets/coding-hubs-school-of-ai-logo-wide.png" alt="Coding Hubs School of AI" width={720} height={208} /></p>
              <div className="rp-story-heading">
                <span className="rp-story-kicker"><span /> A little curiosity. A new direction.</span>
                <h2>Your next chapter<br /> starts with <em>you.</em></h2>
                <p>Bring your questions. Meet a mentor. Find the skills you want to build next.</p>
              </div>
              <div className="rp-path" aria-label="Your learning journey">
                <div><span>01</span><p>Find your path<small>AI, data, development &amp; more</small></p></div>
                <div><span>02</span><p>Try a live class<small>2 hours. Online. Completely free.</small></p></div>
                <div><span>03</span><p>Build from there<small>Learn with mentors and real projects</small></p></div>
              </div>
              <p className="rp-story-foot"><span aria-hidden="true">↗</span> Big ideas begin with a small first step.</p>
            </aside>}
            <div className="form-card">
              <Suspense fallback={<p className="rp-loading" role="status">Loading…</p>}>
                <RegisterForm key={token} idPrefix="rp-" intent={intent} compact={intent === 'demo'} onThanksChange={intent === 'demo' ? onThanks : undefined} prefillCourse={course} prefillToken={token} campaignId={campaignId} />
              </Suspense>
            </div>
          </div>
        </div>
      )}
    </PopupContext.Provider>
  )
}
