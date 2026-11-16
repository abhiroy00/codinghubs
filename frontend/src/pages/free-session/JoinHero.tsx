import { useState } from 'react'

export function BatchAnnouncement() {
  const [open, setOpen] = useState(true)
  if (!open) return null
  return (
    <aside className="join-bar" aria-label="New batch announcement">
      <span className="join-bar-dot" aria-hidden="true" />
      <p>Admissions open — new Generative AI and Full Stack batches are filling up.</p>
      <a className="join-bar-apply" href="#register" data-cta="bar-demo">Book free demo <span aria-hidden="true">↗</span></a>
      <button type="button" className="join-bar-close" aria-label="Dismiss announcement" onClick={() => setOpen(false)}>
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18" /></svg>
      </button>
    </aside>
  )
}
