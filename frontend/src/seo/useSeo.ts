import { useEffect } from 'react'
import type { Seo } from '../content-pages/api'
import { cleanCanonical } from './robots'

/** Keeps <head> right on client-side navigation (a direct visit already has it from the server). Restores on leave. */
export function useSeo(seo: Seo | null) {
  useEffect(() => {
    if (!seo) return
    const prevTitle = document.title
    const restore: (() => void)[] = []
    document.title = seo.title
    const set = (selector: string, make: () => HTMLElement, attr: string, value: string) => {
      let el = document.head.querySelector<HTMLElement>(selector)
      const created = !el
      if (!el) {
        el = make()
        document.head.appendChild(el)
      }
      const old = el.getAttribute(attr)
      el.setAttribute(attr, value)
      restore.push(() => (created ? el!.remove() : old === null ? el!.removeAttribute(attr) : el!.setAttribute(attr, old)))
    }
    const metaTag = (key: 'name' | 'property', name: string, value: string) => {
      set(
        `meta[${key}="${name}"]`,
        () => {
          const m = document.createElement('meta')
          m.setAttribute(key, name)
          return m
        },
        'content',
        value,
      )
    }
    metaTag('name', 'description', seo.description)
    metaTag('name', 'robots', seo.robots)
    metaTag('property', 'og:title', seo.og.title)
    metaTag('property', 'og:description', seo.og.description)
    metaTag('property', 'og:image', seo.og.image)
    metaTag('property', 'og:url', seo.og.url)
    metaTag('property', 'og:type', seo.og.type)
    const logo = seo.og.image.endsWith('/assets/coding-hubs-school-of-ai-logo.jpeg')
    const imageAlt = seo.og.alt ?? (logo ? 'Coding Hubs School of AI logo' : seo.og.title)
    metaTag('property', 'og:image:alt', imageAlt)
    for (const dimension of ['width', 'height']) {
      if (logo) metaTag('property', 'og:image:' + dimension, '1254')
      else {
        const el = document.head.querySelector('meta[property="og:image:' + dimension + '"]')
        if (el) { el.remove(); restore.push(() => document.head.appendChild(el)) }
      }
    }
    metaTag('name', 'twitter:card', 'summary_large_image')
    metaTag('name', 'twitter:title', seo.og.title)
    metaTag('name', 'twitter:description', seo.og.description)
    metaTag('name', 'twitter:image', seo.og.image)
    metaTag('name', 'twitter:image:alt', imageAlt)
    if (seo.canonical) {
      set('link[rel="canonical"]', () => Object.assign(document.createElement('link'), { rel: 'canonical' }), 'href', cleanCanonical(seo.canonical))
    }
    if (!seo.canonical) {
      const canonical = document.head.querySelector('link[rel="canonical"]')
      if (canonical) { canonical.remove(); restore.push(() => document.head.appendChild(canonical)) }
    }
    const previousLd = [...document.head.querySelectorAll('script[type="application/ld+json"]')]
    const ld = seo.json_ld ? document.createElement('script') : null
    previousLd.forEach(node => node.remove())
    if (ld) {
      ld.type = 'application/ld+json'
      ld.dataset.managed = '1'
      ld.textContent = JSON.stringify(seo.json_ld).replace(/</g, '\\u003c')
      document.head.appendChild(ld)
    }
    return () => {
      document.title = prevTitle
      restore.forEach((r) => r())
      ld?.remove()
      previousLd.forEach(node => document.head.appendChild(node))
    }
  }, [seo])
}
