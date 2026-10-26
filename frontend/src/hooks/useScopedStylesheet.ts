import { useLayoutEffect } from 'react'

const LOADING_ATTR = 'data-fs-loading'

/**
 * Loads stylesheet(s)/fonts only while the calling component is mounted, then removes them.
 * Same-origin stylesheets (those starting with "/") hide #root until they have loaded (see global.css), so the
 * page never flashes unstyled. If the stylesheet is already in the HTML and loaded, nothing is added or hidden.
 */
export function useScopedStylesheet(hrefs: string[]) {
  useLayoutEffect(() => {
    const html = document.documentElement
    const added: HTMLLinkElement[] = []
    let waiting = 0
    let timer: ReturnType<typeof setTimeout> | undefined

    const finishOne = () => {
      waiting -= 1
      if (waiting <= 0) html.removeAttribute(LOADING_ATTR)
    }

    for (const href of hrefs) {
      const blocking = href.startsWith('/')
      const existing = document.querySelector<HTMLLinkElement>(`link[rel="stylesheet"][href="${href}"]`)
      if (existing && existing.sheet) continue // already in the page and loaded

      const link = document.createElement('link')
      link.rel = 'stylesheet'
      link.href = href
      if (blocking) {
        waiting += 1
        link.addEventListener('load', finishOne, { once: true })
        link.addEventListener('error', finishOne, { once: true })
      }
      document.head.appendChild(link)
      added.push(link)
    }

    if (waiting > 0) {
      html.setAttribute(LOADING_ATTR, '')
      timer = setTimeout(() => html.removeAttribute(LOADING_ATTR), 3000) // never leave the page hidden
    }

    return () => {
      if (timer) clearTimeout(timer)
      html.removeAttribute(LOADING_ATTR)
      added.forEach((link) => link.remove())
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
}
