import { useEffect, type RefObject } from 'react'

const SELECTOR = '.rv,.rv-up,.rv-left,.rv-pop,.rv-zoom,.line-mask,.words,[data-io]'

/**
 * Re-implements the IntersectionObserver reveal-on-scroll from the original main.js.
 * Also watches for DOM mutations so elements rendered later (e.g. after an API
 * fetch resolves) still get observed instead of staying stuck at opacity:0.
 */
export function useReveal(containerRef: RefObject<HTMLElement | null>) {
  useEffect(() => {
    const root = containerRef.current ?? document.body
    const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches
    // Scoped per effect run (not a DOM attribute) — React StrictMode tears down
    // and re-runs this effect once in dev, recreating the IntersectionObserver
    // each time. A DOM-attribute dedupe would survive that teardown and block
    // the second (live) observer from ever observing already-"bound" elements.
    const bound = new WeakSet<Element>()

    const applyDelays = (scope: ParentNode) => {
      scope.querySelectorAll('ul,ol').forEach((list) => {
        Array.from(list.children).forEach((child, i) => {
          if (/\brv-/.test(child.className)) {
            ;(child as HTMLElement).style.transitionDelay = `${i * 70}ms`
          }
        })
      })
      scope.querySelectorAll<HTMLElement>('[data-d]').forEach((el) => {
        el.style.transitionDelay = `${el.dataset.d}ms`
      })
    }

    let io: IntersectionObserver | undefined
    if (!reduce) {
      io = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              entry.target.classList.add('in')
              io!.unobserve(entry.target)
            }
          })
        },
        { threshold: 0.15, rootMargin: '0px 0px -6% 0px' },
      )
    }

    const bind = (el: HTMLElement) => {
      if (bound.has(el)) return
      bound.add(el)
      if (reduce) el.classList.add('in')
      else io!.observe(el)
    }

    root.querySelectorAll<HTMLElement>(SELECTOR).forEach(bind)
    applyDelays(root)

    const mo = new MutationObserver((mutations) => {
      for (const m of mutations) {
        m.addedNodes.forEach((node) => {
          if (!(node instanceof HTMLElement)) return
          if (node.matches(SELECTOR)) bind(node)
          node.querySelectorAll<HTMLElement>(SELECTOR).forEach(bind)
          applyDelays(node)
        })
      }
    })
    mo.observe(root, { childList: true, subtree: true })

    return () => {
      io?.disconnect()
      mo.disconnect()
    }
  }, [containerRef])
}
