// Build-time prerender for the location pages: writes dist/locations/<slug>/index.html with the full
// article, metadata and JSON-LD already in the HTML, plus dist/sitemap.xml. The SPA then takes over.
import { createHash } from 'node:crypto'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { pathToFileURL } from 'node:url'

const root = path.resolve(import.meta.dirname, '..')
const dist = path.join(root, 'dist')
const SITE = 'https://codinghubs.in'
const LOGO = `${SITE}/assets/coding-hubs-school-of-ai-logo.jpeg`

const esc = (s) => s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

const { renderAll } = await import(pathToFileURL(path.join(root, 'dist-ssr', 'entry-server.js')).href)
const template = await readFile(path.join(dist, 'index.html'), 'utf8')
const cssVersion = createHash('md5').update(await readFile(path.join(dist, 'free-session.css'))).digest('hex').slice(0, 8)

function buildHead(page) {
  const ld = JSON.stringify(page.jsonLd).replace(/</g, '\\u003c')
  return [
    `<title>${esc(page.title)}</title>`,
    `<meta name="description" content="${esc(page.description)}" />`,
    `<meta name="robots" content="index, follow" />`,
    `<link rel="canonical" href="${page.canonical}" />`,
    `<meta property="og:type" content="website" />`,
    `<meta property="og:site_name" content="Coding Hubs School of AI" />`,
    `<meta property="og:title" content="${esc(page.title)}" />`,
    `<meta property="og:description" content="${esc(page.description)}" />`,
    `<meta property="og:url" content="${page.canonical}" />`,
    `<meta property="og:image" content="${LOGO}" />`,
    `<meta property="og:locale" content="en_IN" />`,
    `<meta name="twitter:card" content="summary" />`,
    `<link rel="stylesheet" href="/free-session.css?v=${cssVersion}" />`,
    `<script type="application/ld+json">${ld}</script>`,
  ].join('\n    ')
}

function render(page) {
  let html = template
  html = html.replace('<html lang="en">', '<html lang="en-IN">')
  // drop the home page's own title/description/OG tags; each location page carries its own.
  html = html.replace(/\s*<title>[\s\S]*?<\/title>/, '')
  html = html.replace(/\s*<meta name="description"[^>]*>/, '')
  html = html.replace(/\s*<meta property="og:[^>]*>/g, '')
  html = html.replace('</head>', `    ${buildHead(page)}\n  </head>`)
  html = html.replace('<div id="root"></div>', `<div id="root">${page.html}</div>`)
  return html
}

const pages = renderAll({ skipMissing: process.env.ALLOW_MISSING_LOCATIONS === '1' })
for (const page of pages) {
  const dir = path.join(dist, page.path)
  await mkdir(dir, { recursive: true })
  await writeFile(path.join(dir, 'index.html'), render(page))
}

const today = new Date().toISOString().slice(0, 10)
const urls = [`${SITE}/`, ...pages.map((p) => p.canonical)]
const sitemap = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls
  .map((u) => `  <url><loc>${u}</loc><lastmod>${today}</lastmod></url>`)
  .join('\n')}\n</urlset>\n`
await writeFile(path.join(dist, 'sitemap.xml'), sitemap)

console.log(`prerendered ${pages.length} pages and wrote sitemap.xml (${urls.length} URLs)`)
