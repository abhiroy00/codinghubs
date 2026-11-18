import { useId, useRef, type ReactNode } from 'react'

export const DESKTOP_NAV_QUERY = '(min-width: 1101px) and (hover: hover) and (pointer: fine)'
export const MOBILE_NAV_QUERY = '(max-width: 1100px), (hover: none), (pointer: coarse)'

export interface DropdownControl {
  open: boolean
  onOpenChange: (open: boolean) => void
}

/** A navigation disclosure: native buttons and links, shared by mouse, touch and keyboard. */
export function HeaderDropdown({ label, open, onOpenChange, children, className = '' }: DropdownControl & { label: string; children: ReactNode; className?: string }) {
  const listId = useId()
  const trigger = useRef<HTMLButtonElement>(null)
  const hoveredOpen = useRef(false)
  return (
    <div className={`sh-res ${className}`} data-header-dropdown={label}
      onPointerEnter={(event) => {
        if (event.pointerType === 'mouse' && window.matchMedia(DESKTOP_NAV_QUERY).matches && !open) {
          hoveredOpen.current = true
          onOpenChange(true)
        }
      }}
      onPointerLeave={(event) => {
        if (event.pointerType === 'mouse' && window.matchMedia(DESKTOP_NAV_QUERY).matches && !event.currentTarget.contains(document.activeElement)) {
          hoveredOpen.current = false
          onOpenChange(false)
        }
      }}
      onBlur={(event) => {
        // Keep inline touch menus stable between pointerdown (focus) and click.
        // Another trigger/link inside the navigation closes this menu when selected.
        if (!event.currentTarget.closest('.sh-nav')?.contains(event.relatedTarget as Node | null)) onOpenChange(false)
      }}
      onKeyDown={(event) => {
        if (event.key === 'Escape' && open) {
          event.preventDefault()
          event.stopPropagation()
          onOpenChange(false)
          trigger.current?.focus()
        }
      }}>
      <button ref={trigger} type="button" className="sh-res-button" aria-expanded={open} aria-controls={listId}
        onClick={(event) => {
          // The first mouse click keeps a hover-opened menu open; the next toggles it.
          onOpenChange(event.detail > 0 && hoveredOpen.current && open ? true : !open)
          hoveredOpen.current = false
        }}>
        {label}
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m6 9 6 6 6-6" /></svg>
      </button>
      <ul className="sh-res-list" id={listId} hidden={!open} onClick={(event) => { if ((event.target as Element).closest('a')) onOpenChange(false) }}>{children}</ul>
    </div>
  )
}
