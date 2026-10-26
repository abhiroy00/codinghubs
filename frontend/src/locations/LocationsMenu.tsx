import { useEffect, useId, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { GROUP_LABELS, GROUP_ORDER, LOCATIONS, locationPath } from './registry'

/** "Locations" dropdown / mega menu for the free-session style header. Click, tap or keyboard — never hover-only. */
export function LocationsMenu({ onNavigate }: { onNavigate?: () => void }) {
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)
  const panelId = useId()

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpen(false)
        rootRef.current?.querySelector<HTMLElement>('button.loc-btn')?.focus()
      }
    }
    const onDown = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('keydown', onKey)
    document.addEventListener('mousedown', onDown)
    return () => {
      document.removeEventListener('keydown', onKey)
      document.removeEventListener('mousedown', onDown)
    }
  }, [open])

  function handleNavigate() {
    setOpen(false)
    onNavigate?.()
  }

  return (
    <div className="loc-menu" ref={rootRef}>
      <button type="button" className="loc-btn" aria-expanded={open} aria-controls={panelId} onClick={() => setOpen((o) => !o)}>
        Locations
        <svg className="loc-caret" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
          <path d="m6 9 6 6 6-6" />
        </svg>
      </button>
      <div className="loc-panel" id={panelId} hidden={!open}>
        <div className="loc-cols">
          {GROUP_ORDER.map((g) => {
            const items = LOCATIONS.filter((l) => l.group === g)
            if (!items.length) return null
            return (
              <div key={g} className="loc-col">
                <p className="loc-col-h">{GROUP_LABELS[g]}</p>
                <ul>
                  {items.map((l) => (
                    <li key={l.slug}>
                      <Link to={locationPath(l.slug)} onClick={handleNavigate}>
                        AI Course in {l.short}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            )
          })}
        </div>
        <Link to="/locations/" className="loc-all" onClick={handleNavigate}>
          View All Locations
        </Link>
      </div>
    </div>
  )
}
