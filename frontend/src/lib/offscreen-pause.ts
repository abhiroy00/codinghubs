/**
 * Pause decorative CSS animations in sections that are off screen.
 *
 * Floating pills, the scrolling laptop, logo marquees and similar loops otherwise keep the browser restyling and
 * repainting the whole page every frame, even far below the fold. Each `section` / `footer` gets a `data-offscreen`
 * attribute while it is out of view, and styles/ui-skin.css pauses every animation inside it. Sections added later
 * (route changes, lazy pages) are picked up by a MutationObserver.
 */
const SELECTOR = 'section, footer, .ch-band'

export function pauseOffscreenAnimations() {
  if (typeof window === 'undefined' || !('IntersectionObserver' in window)) return
  const io = new IntersectionObserver(
    (entries) => { for (const e of entries) e.target.toggleAttribute('data-offscreen', !e.isIntersecting) },
    { rootMargin: '150px 0px' },
  )
  const watch = (root: Element | Document) => {
    if (root instanceof Element && root.matches(SELECTOR)) io.observe(root)
    root.querySelectorAll(SELECTOR).forEach((el) => io.observe(el))
  }
  watch(document)
  new MutationObserver((mutations) => {
    for (const m of mutations) m.addedNodes.forEach((n) => { if (n instanceof Element) watch(n) })
  }).observe(document.body, { childList: true, subtree: true })
}
