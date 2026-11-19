import { useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import './ui.css'

export interface VideoModalProps {
  /** YouTube video id; the modal (and its iframe) only exists while this is set. */
  videoId: string | null
  title: string
  onClose: () => void
}

/** YouTube player in a dialog: autoplays, unmounts on close, closes on ESC/backdrop, locks body scroll and restores focus. */
export function VideoModal({ videoId, title, onClose }: VideoModalProps) {
  const closeRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (!videoId) return
    const previous = document.activeElement as HTMLElement | null
    const { overflow, paddingRight } = document.body.style
    const gutter = window.innerWidth - document.documentElement.clientWidth
    document.body.style.overflow = 'hidden'
    if (gutter > 0) document.body.style.paddingRight = `${gutter}px`
    closeRef.current?.focus()
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
      // Keep keyboard focus inside the dialog (only the close button and iframe are focusable).
      if (e.key === 'Tab') { e.preventDefault(); closeRef.current?.focus() }
    }
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = overflow
      document.body.style.paddingRight = paddingRight
      previous?.focus?.()
    }
  }, [videoId, onClose])

  if (!videoId || typeof document === 'undefined') return null
  return createPortal(
    <div className="ui-modal" role="dialog" aria-modal="true" aria-label={title} onClick={(e) => { if (e.target === e.currentTarget) onClose() }}>
      <div className="ui-modal-box">
        <button ref={closeRef} type="button" className="ui-modal-close" onClick={onClose} aria-label="Close video">
          <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18" /></svg>
        </button>
        <div className="ui-modal-frame">
          <iframe
            src={`https://www.youtube-nocookie.com/embed/${encodeURIComponent(videoId)}?autoplay=1&rel=0&modestbranding=1&playsinline=1`}
            title={title}
            allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
            allowFullScreen
          />
        </div>
      </div>
    </div>,
    document.body,
  )
}
