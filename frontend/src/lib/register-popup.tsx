import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { RegisterForm } from '../pages/free-session/RegisterForm'
import { useLenisRef } from './lenis-context'

const KEY = 'ch_registered'
const AUTO_MIN_MS = 30_000
const AUTO_MAX_MS = 45_000

interface PopupApi {
  /** Opens the "Reserve your free seat" popup; after the visitor has registered it takes them to the courses instead. */
  open: (course?: string) => void
  registered: boolean
  /** Call when a registration form was submitted successfully. */
  markRegistered: () => void
}

const FALLBACK: PopupApi = { open: () => undefined, registered: false, markRegistered: () => undefined }
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
  const { pathname } = useLocation()
  const lenisRef = useLenisRef()
  const [registered, setRegistered] = useState(false)
  const [isOpen, setOpen] = useState(false)
  const [course, setCourse] = useState<string | null>(null)
  const [token, setToken] = useState(0)
  const returnFocus = useRef<HTMLElement | null>(null)

  useEffect(() => setRegistered(readFlag()), [])

  const close = useCallback(() => {
    setOpen(false)
    document.body.style.overflow = ''
    lenisRef.current?.start()
    returnFocus.current?.focus?.()
  }, [lenisRef])

  const open = useCallback(
    (c?: string) => {
      if (readFlag()) {
        navigate({ pathname: '/', hash: '#courses' })
        return
      }
      returnFocus.current = document.activeElement as HTMLElement | null
      setCourse(c ?? null)
      setToken((t) => t + 1)
      setOpen(true)
      document.body.style.overflow = 'hidden'
      lenisRef.current?.stop()
    },
    [navigate, lenisRef],
  )

  // Home page: bring the popup back every 30-45 seconds until the visitor has registered.
  useEffect(() => {
    if (pathname !== '/' || registered) return
    let timer: ReturnType<typeof setTimeout>
    const schedule = () => {
      timer = setTimeout(() => {
        if (!readFlag() && !document.querySelector('.rp-overlay')) open()
        schedule()
      }, AUTO_MIN_MS + Math.random() * (AUTO_MAX_MS - AUTO_MIN_MS))
    }
    schedule()
    return () => clearTimeout(timer)
  }, [pathname, registered, open])

  useEffect(() => {
    if (!isOpen) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && close()
    document.addEventListener('keydown', onKey)
    const t = setTimeout(() => document.getElementById('rp-f-name')?.focus(), 120)
    return () => {
      document.removeEventListener('keydown', onKey)
      clearTimeout(t)
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
  const api = useMemo(() => ({ open, registered, markRegistered }), [open, registered, markRegistered])

  return (
    <PopupContext.Provider value={api}>
      {children}
      {isOpen && (
        <div className="rp-overlay" role="presentation" onMouseDown={(e) => e.target === e.currentTarget && close()}>
          <div className="rp-dialog fs-page" role="dialog" aria-modal="true" aria-labelledby="rp-form-title">
            <button type="button" className="rp-close" aria-label="Close" onClick={close}>
              ×
            </button>
            <div className="form-card">
              <RegisterForm idPrefix="rp-" onThanksChange={onThanks} prefillCourse={course} prefillToken={token} />
            </div>
          </div>
        </div>
      )}
    </PopupContext.Provider>
  )
}
