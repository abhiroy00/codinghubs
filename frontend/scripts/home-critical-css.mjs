import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { JSDOM } from 'jsdom'
import { transform } from 'lightningcss'

/** Extract first-viewport rules from the actual home markup, preserving the original CSS cascade. */
export async function inlineHomeCriticalCss(html, dist) {
  const dom = new JSDOM(html)
  const document = dom.window.document
  // Keep the header, announcement, hero, their ancestors and floating contact controls.
  document.querySelectorAll('main > :not(#home), #site-footer, .ch-band').forEach(el => el.remove())
  const classes = new Set(), ids = new Set(), tags = new Set(['strong', 'small'])
  for (const element of document.querySelectorAll('*')) {
    element.classList.forEach(name => classes.add(name))
    if (element.id) ids.add(element.id)
    tags.add(element.localName)
  }
  dom.window.close()

  const states = new Set(['is-open', 'has-account', 'hs-still', 'hv-video', 'is-playing'])
  const possible = selector => selector.every(token => {
    // Header/account and hero controls must work while the complete CSS is still loading.
    if (token.type === 'class') return classes.has(token.name) || token.name.startsWith('sh-') || states.has(token.name)
    if (token.type === 'id') return ids.has(token.name)
    if (token.type === 'type') return tags.has(token.name)
    if (token.type === 'pseudo-class' && ['is', 'where', 'has'].includes(token.kind)) return token.selectors.some(possible)
    // Retain interactive/pseudo-element rules and negations conservatively.
    return true
  })
  const links = [...html.matchAll(/<link\b[^>]*\brel="stylesheet"[^>]*>/g)]
  const rules = []
  for (const [link] of links) {
    const href = link.match(/\bhref="([^"]+)"/)?.[1]
    if (!href?.startsWith('/')) continue
    const code = await readFile(path.join(dist, href.split('?')[0]))
    const critical = transform({
      filename: href, code, minify: true,
      unusedSymbols: ['__ch_outside_first_view'],
      visitor: { Selector(selector) {
        // Only replace selectors. Returning whole rules would round-trip unrelated declarations.
        if (!possible(selector)) return [{ type: 'class', name: '__ch_outside_first_view' }]
      } },
    }).code.toString()
    rules.push(critical)
    // Download the complete sheet immediately without making first paint wait for it.
    // noscript retains the complete design for visitors without JavaScript.
    html = html.replace(link, `${link.replace('rel="stylesheet"', 'rel="preload" as="style" onload="this.onload=null;this.rel=\'stylesheet\'"')}<noscript>${link}</noscript>`)
  }
  return html.replace('</head>', `<style data-home-critical>${rules.join('\n').replace(/<\/style/gi, '<\\/style')}</style></head>`)
}
