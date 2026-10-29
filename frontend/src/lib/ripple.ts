const SELECTOR = '.btn, .pj-chips button, .st-chips button, .lx-tab, .pj-pill'

export function initRipple() {
  if (typeof document === 'undefined' || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
  document.addEventListener(
    'pointerdown',
    (e) => {
      const el = (e.target as Element | null)?.closest<HTMLElement>(SELECTOR)
      if (!el || (el as HTMLButtonElement).disabled || el.getAttribute('aria-disabled') === 'true') return
      const r = el.getBoundingClientRect()
      const size = Math.max(r.width, r.height) * 2
      const dot = document.createElement('span')
      dot.className = 'fx-ripple'
      dot.style.cssText = `width:${size}px;height:${size}px;left:${e.clientX - r.left - size / 2}px;top:${e.clientY - r.top - size / 2}px`
      el.appendChild(dot)
      dot.addEventListener('animationend', () => dot.remove())
    },
    { passive: true },
  )
}
