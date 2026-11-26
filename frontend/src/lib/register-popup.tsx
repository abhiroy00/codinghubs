import { createContext, lazy, Suspense, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
const RegisterForm = lazy(() => import('../pages/free-session/RegisterForm').then((m) => ({ default: m.RegisterForm })))
import { useLenisRef } from './lenis-context'
import { FS_CSS } from './fs-css'
import { useScopedStylesheet } from '../hooks/useScopedStylesheet'
import './demo-dialog.css'

function PopupStyles() {
  useScopedStylesheet([FS_CSS])
  return null
}

const KEY = 'ch_registered'

interface PopupApi {
  /**
   * Opens the "Reserve your free seat" form (only when a visitor asks for it: it never opens by itself). After the
   * visitor has registered it takes them to the courses instead. `campaignId` records the offer that led here.
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

function readFlag() {
  try {
    return localStorage.getItem(KEY) === '1'
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
    showPopup('demo', c, campaign)
  }, [navigate, showPopup])

  const openEnrollment = useCallback((c: string) => showPopup('enrollment', c), [showPopup])

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
      if (!dialog?.contains(document.activeElement)) input.focus()
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
              <p className="rp-story-brand">CODING HUB <span>SCHOOL OF AI</span></p>
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
