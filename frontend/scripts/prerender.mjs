// Build-time prerender. Writes real HTML (content + per-page metadata + JSON-LD) for every public page:
//   home.html, program/<slug>.html, faq.html, policies.html, locations/**/index.html, 404.html
// plus dist/sitemap.xml. dist/index.html stays the neutral, noindex SPA shell used for app-only routes
// (login, register, dashboard, checkout, admin panel). nginx maps URLs to these files (see nginx.conf).
import { createHash } from 'node:crypto'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { pathToFileURL } from 'node:url'

const root = path.resolve(import.meta.dirname, '..')
const dist = path.join(root, 'dist')
const SITE = 'https://codinghubs.in'
const FONTS = 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&family=Poppins:wght@600;700;800&display=swap'

const esc = (s) => s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

const { renderAll } = await import(pathToFileURL(path.join(root, 'dist-ssr', 'entry-server.js')).href)
const template = await readFile(path.join(dist, 'index.html'), 'utf8')
const cssVersion = createHash('md5').update(await readFile(path.join(dist, 'free-session.css'))).digest('hex').slice(0, 8)

function buildHead(page) {
  const canonical = `${SITE}${page.path}`
  const tags = [
    `<title>${esc(page.title)}</title>`,
    `<meta name="description" content="${esc(page.description)}" />`,
    `<meta name="robots" content="${page.indexable ? 'index, follow, max-image-preview:large' : 'noindex, follow'}" />`,
  ]
  if (page.indexable) tags.push(`<link rel="canonical" href="${canonical}" />`)
  tags.push(
    `<meta property="og:type" content="website" />`,
    `<meta property="og:site_name" content="Coding Hubs School of AI" />`,
    `<meta property="og:locale" content="en_IN" />`,
    `<meta property="og:title" content="${esc(page.title)}" />`,
    `<meta property="og:description" content="${esc(page.description)}" />`,
    `<meta property="og:url" content="${canonical}" />`,
    `<meta property="og:image" content="${page.image}" />`,
    `<meta name="twitter:card" content="summary_large_image" />`,
    `<meta name="twitter:title" content="${esc(page.title)}" />`,
    `<meta name="twitter:description" content="${esc(page.description)}" />`,
    `<meta name="twitter:image" content="${page.image}" />`,
  )
  // free-session pages: stylesheet in <head> AFTER the app stylesheet so it wins the cascade
  if (page.fsDesign) {
    tags.push(`<link rel="stylesheet" href="/free-session.css?v=${cssVersion}" />`)
    tags.push(`<link rel="preload" as="style" href="${FONTS}" onload="this.onload=null;this.rel='stylesheet'" />`)
    tags.push(`<noscript><link rel="stylesheet" href="${FONTS}" /></noscript>`)
  }
  if (page.jsonLd) tags.push(`<script type="application/ld+json">${JSON.stringify(page.jsonLd).replace(/</g, '\\u003c')}</script>`)
  return tags.join('\n    ')
}

function render(page) {
  let html = template
  html = html.replace('<html lang="en">', '<html lang="en-IN">')
  html = html.replace(/\s*<title>[\s\S]*?<\/title>/, '')
  html = html.replace(/\s*<meta name="robots"[^>]*>/, '')
  html = html.replace(/\s*<meta name="description"[^>]*>/, '')
  html = html.replace(/\s*<meta property="og:[^>]*>/g, '')
  html = html.replace(/\s*<!-- Home and program pages[\s\S]*?<\/script>/, '') // dynamic CSS loader, replaced by the static <link>
  if (page.fsDesign) {
    // The generic font request (4 families, 3 unused on these pages) is render-blocking: swap it for the two families
    // these pages use, loaded without blocking first paint (font-display: swap).
    html = html.replace(/\s*<link href="https:\/\/fonts\.googleapis\.com\/css2[^"]*" rel="stylesheet" \/>/, '')
  }
  html = html.replace('</head>', `    ${page.rawHead ?? buildHead(page)}\n  </head>`)
  if (page.html) html = html.replace('<div id="root"></div>', `<div id="root">${page.html}</div>`)
  return html
}

// App shell for server-rendered content pages (blog, case studies): the backend fills the two markers.
await writeFile(path.join(dist, 'content-shell.html'), render({ fsDesign: true, rawHead: `<!--SEO_HEAD-->\n    <link rel="stylesheet" href="/free-session.css?v=${cssVersion}" />\n    <link rel="preload" as="style" href="${FONTS}" onload="this.onload=null;this.rel='stylesheet'" />`, html: '<!--SSR_ROOT-->' }))

const pages = renderAll({ skipMissing: process.env.ALLOW_MISSING_LOCATIONS === '1' })
for (const page of pages) {
  const file = path.join(dist, page.file)
  await mkdir(path.dirname(file), { recursive: true })
  await writeFile(file, render(page))
}

// sitemap: indexable canonical URLs only; no <lastmod> (we do not track real content-change dates)
const urls = pages.filter((p) => p.indexable).map((p) => `${SITE}${p.path}`)
const sitemap = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls
  .map((u) => `  <url><loc>${u}</loc></url>`)
  .join('\n')}\n</urlset>\n`
await writeFile(path.join(dist, 'sitemap.xml'), sitemap)

console.log(`prerendered ${pages.length} pages and wrote sitemap.xml (${urls.length} URLs)`)
