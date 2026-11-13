import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../lib/api'

// One public availability request per app session; the backend owns the launch gate.
let gigsStatus: Promise<boolean> | undefined
const pilotEnabled = () => gigsStatus ??= api.get('/gigs/status/').then(r => r.data.enabled === true).catch(() => false)

const LINKS = [
  ['/blog', 'Blog'],
  ['/case-studies', 'Case Studies'],
  ['/projects', 'Projects'],
  ['/#session', 'About the Session'],
  ['/#contact', 'Contact'],
] as const

/** "Resources" header item: a button that opens a short list (hover, tap or keyboard). Inline list inside the burger menu. */
export function ResourcesMenu() {
  const [open, setOpen] = useState(false)
  const [gigsEnabled, setGigsEnabled] = useState(false)
  useEffect(() => { let active = true; pilotEnabled().then(value => { if (active) setGigsEnabled(value) }); return () => { active = false } }, [])
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!open) return
    const close = (e: MouseEvent | KeyboardEvent) => {
      if (e instanceof KeyboardEvent ? e.key === 'Escape' : !ref.current?.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', close)
    document.addEventListener('keydown', close)
    return () => {
      document.removeEventListener('mousedown', close)
      document.removeEventListener('keydown', close)
    }
  }, [open])
  return (
    <div className={`res${open ? ' open' : ''}`} ref={ref} onMouseEnter={() => window.matchMedia('(hover:hover)').matches && setOpen(true)} onMouseLeave={() => setOpen(false)}>
      <button type="button" className="res-btn" aria-expanded={open} aria-haspopup="true" onClick={() => setOpen((o) => (window.matchMedia('(hover:hover)').matches && o ? true : !o))}>
        Resources
        <svg className="res-chev" viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="m6 9 6 6 6-6" />
        </svg>
      </button>
      <ul className="res-list" onClick={() => setOpen(false)}>
        {LINKS.map(([href, label]) => (
          <li key={href}>
            <Link to={href}>{label}</Link>
          </li>
        ))}
        {gigsEnabled && <li><Link to="/gigs">Gigs pilot</Link></li>}
      </ul>
    </div>
  )
}

