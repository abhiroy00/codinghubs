// Build-time prerender. Writes real HTML (content + per-page metadata + JSON-LD) for every public page:
//   home.html, program/<slug>.html, faq.html, policies.html, locations/**/index.html, 404.html
// plus dist/sitemap.xml. dist/index.html stays the neutral, noindex SPA shell used for app-only routes
// (login, register, dashboard, admin panel). nginx maps URLs to these files (see nginx.conf).
import { createHash } from 'node:crypto'
import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { pathToFileURL } from 'node:url'

const root = path.resolve(import.meta.dirname, '..')
const dist = path.join(root, 'dist')
const SITE = 'https://codinghubs.in'

const esc = (s) => s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

const { renderAll } = await import(pathToFileURL(path.join(root, 'dist-ssr', 'entry-server.js')).href)
const template = await readFile(path.join(dist, 'index.html'), 'utf8')
// Same hash as vite.config.ts (from the source file; the built copy is minified).
const cssVersion = createHash('md5').update(await readFile(path.join(root, 'public', 'free-session.css'))).digest('hex').slice(0, 8)
const learningStyles = (await readdir(path.join(dist, 'assets'))).filter(name => /^(genai-roadmap|learning)-.*\.css$/.test(name))
const visualStyles = (await readdir(path.join(dist, 'assets'))).filter(name => /^(Academy|DiagramPlayer|VisualLab)-.*\.css$/.test(name))
const manifest = JSON.parse(await readFile(path.join(dist, '.vite/manifest.json'), 'utf8'))
const studioCss = manifest['src/studio/Studio.tsx']?.css ?? []
const ourWorkCss = manifest['src/pages/our-work/OurWork.tsx']?.css ?? []
if (!ourWorkCss.length) throw new Error('Missing Our Work styles in build manifest')
const aiToolsCss = manifest['src/pages/ai-tools/AiTools.tsx']?.css ?? []
if (!aiToolsCss.length) throw new Error('Missing AI Tools styles in build manifest')
const poppins700 = (await readdir(path.join(dist, 'assets'))).find(name => /^poppins-700-latin-[A-Za-z0-9_-]{8}\.woff2$/.test(name))
if (!poppins700) throw new Error('Missing self-hosted Poppins 700 font in the build')
// Stylesheets the built app shell (dist/index.html) already links on every page.
const shellCss = new Set([...template.matchAll(/<link rel="stylesheet"[^>]*href="(\/assets\/[^"]+\.css)"/g)].map(m => m[1]))
// CSS of a lazy chunk and everything it imports, minus what the app shell (index.html) already links.
function chunkCss(key) {
  const out = new Set(), seen = new Set()
  const walk = (k) => {
    if (!k || seen.has(k)) return
    seen.add(k)
    for (const file of manifest[k]?.css ?? []) out.add(file)
    for (const dep of manifest[k]?.imports ?? []) walk(dep)
  }
  walk(key)
  return [...out].filter(file => !shellCss.has(`/${file}`))
}
// Pages rendered inside LearnFrame (and the course/interview pages) were prerendered without their chunks' CSS,
// which only arrived once the JS attached it: the page first painted half-styled and then reflowed (CLS 0.21 on
// /courses/, and a late LCP). Link that CSS in <head> like the other lazy pages below.
// Same order as the client's lazy loader inserts them (read from Vite's preload map in the entry chunk), so the cascade
// is identical before and after the JS runs. Falls back to the manifest walk if the map cannot be read.
const entryJs = await readFile(path.join(dist, manifest['index.html'].file), 'utf8')
const preloadFiles = (() => { const i = entryJs.indexOf('m.f=['); return i < 0 ? [] : JSON.parse(entryJs.slice(i + 4, entryJs.indexOf(']', i) + 1)) })()
function clientCssOrder(key) {
  const file = manifest[key]?.file
  for (const call of entryJs.matchAll(/__vite__mapDeps\(\[([0-9,]+)\]\)/g)) {
    const deps = call[1].split(',').map(i => preloadFiles[+i])
    if (deps[0] === file) return deps.filter(dep => dep?.endsWith('.css') && !shellCss.has(`/${dep}`))
  }
  return chunkCss(key)
}
const learnFrameCss = clientCssOrder(Object.keys(manifest).find(k => /(^|\/|_)LearnFrame[.-].*\.(js|tsx)$/.test(k)))
const courseLearningCss = clientCssOrder('src/learning/CourseLearning.tsx')
if (!learnFrameCss.length || !courseLearningCss.length) throw new Error('Missing LearnFrame / CourseLearning styles in build manifest')
const interviewHubCss = clientCssOrder('src/interview/InterviewHub.tsx')
const isLearnFramePage = (p) => /^\/(faq|interview-studio|visual-lab\/|courses\/)/.test(p ?? '') || (/^\/interview\//.test(p ?? '') && !/\/levels\//.test(p))
const isCoursePage = (p) => /^\/courses\//.test(p ?? '') || (/^\/interview\/[^/]+\/$/.test(p ?? '') && !p.startsWith('/interview/guides/'))

// Directory SSR uses the existing page styles before the React chunks load.
const directoryAssets = new Set()
const directoryStyles = new Set()
function collectDirectoryStyles(key) {
  if (directoryAssets.has(key)) return
  directoryAssets.add(key)
  for (const file of manifest[key]?.css ?? []) directoryStyles.add(file)
  for (const dependency of manifest[key]?.imports ?? []) collectDirectoryStyles(dependency)
}
for (const key of ['src/pages/BookTutor.tsx', 'src/pages/LatestJobs.tsx']) collectDirectoryStyles(key)
const directoryCss = [...directoryStyles].filter(file => !manifest['index.html'].css?.includes(file))
if (!directoryCss.length) throw new Error('Missing directory page styles in build manifest')
await writeFile(path.join(dist, 'directory.css'), (await Promise.all(directoryCss.map(file => readFile(path.join(dist, file), 'utf8')))).join('\n'))
directoryAssets.clear()
directoryStyles.clear()
for (const key of ['src/community/Newsletter.tsx','src/community/Brochures.tsx','src/interview/InterviewGuide.tsx']) collectDirectoryStyles(key)
await writeFile(path.join(dist, 'community.css'), (await Promise.all([...directoryStyles].map(file => readFile(path.join(dist,file),'utf8')))).join('\n'))

// Hero banners (HeroVideo.tsx) paint their poster as a CSS background, so the browser only finds it after the
// stylesheets have loaded. It is the LCP element of nearly every page: preload it, one file per screen class
// (the same media split as hero-video.css), so the poster arrives together with the CSS.
const DEFAULT_POSTER_SM = '/assets/hero/video/team-coding-review-poster-768.webp'
const DEFAULT_POSTER_LG = '/assets/hero/video/team-coding-review-poster-1280.webp'
function heroPosterPreloads(html) {
  const m = html?.match(/<div class="hv-bg[^"]*"(?: style="([^"]*)")?/)
  if (!m) return []
  const style = (m[1] ?? '').replace(/&quot;/g, '"')
  const sm = style.match(/--hv-poster-sm:\s*url\("([^"]+)"\)/)?.[1] ?? DEFAULT_POSTER_SM
  const lg = style.match(/--hv-poster:\s*url\("([^"]+)"\)/)?.[1] ?? DEFAULT_POSTER_LG
  return [
    `<link rel="preload" as="image" type="image/webp" href="${esc(sm)}" media="(max-width: 767px)" fetchpriority="high" />`,
    `<link rel="preload" as="image" type="image/webp" href="${esc(lg)}" media="(min-width: 768px)" fetchpriority="high" />`,
  ]
}

function buildHead(page) {
  const canonical = page.canonical ?? `${SITE}${page.path}`
  const imageAlt = page.image?.endsWith('/assets/coding-hubs-school-of-ai-logo.jpeg') ? 'Coding Hubs School of AI logo' : page.title
  const tags = [
    `<title>${esc(page.title)}</title>`,
    `<meta name="description" content="${esc(page.description)}" />`,
    `<meta name="robots" content="${page.robots ?? (page.indexable ? 'index, follow, max-image-preview:large' : 'noindex, follow')}" />`,
  ]
  if (page.path === '/interview-studio') {
    for (const asset of studioCss) tags.push(`<link rel="stylesheet" href="/${esc(asset)}" />`)
  }
  if (page.indexable || page.canonical) tags.push(`<link rel="canonical" href="${canonical}" />`)
  tags.push(
    `<meta property="og:type" content="website" />`,
    `<meta property="og:site_name" content="Coding Hubs School of AI" />`,
    `<meta property="og:locale" content="en_IN" />`,
    `<meta property="og:title" content="${esc(page.title)}" />`,
    `<meta property="og:description" content="${esc(page.description)}" />`,
    `<meta property="og:url" content="${canonical}" />`,
    `<meta property="og:image" content="${page.image}" />`,
    `<meta property="og:image:alt" content="${esc(imageAlt)}" />`,
    `<meta name="twitter:card" content="summary_large_image" />`,
    `<meta name="twitter:title" content="${esc(page.title)}" />`,
    `<meta name="twitter:description" content="${esc(page.description)}" />`,
    `<meta name="twitter:image" content="${page.image}" />`,
    `<meta name="twitter:image:alt" content="${esc(imageAlt)}" />`,
  )
  if (page.image?.endsWith('/assets/coding-hubs-school-of-ai-logo.jpeg')) tags.push('<meta property="og:image:width" content="1254" />', '<meta property="og:image:height" content="1254" />')
  tags.push(...heroPosterPreloads(page.html))
  // Other first-viewport images (home: first hero slide). srcset/sizes come from the component, so they always
  // match the <img> and the preloaded file is the one the page uses.
  for (const img of page.preloadImages ?? []) {
    tags.push(`<link rel="preload" as="image" type="image/webp" imagesrcset="${esc(img.imagesrcset)}" imagesizes="${esc(img.imagesizes)}" fetchpriority="high" />`)
  }
  // free-session pages: stylesheet in <head> AFTER the app stylesheet so it wins the cascade
  if (page.fsDesign) {
    tags.push(`<link rel="stylesheet" href="/free-session.css?v=${cssVersion}" />`)
  }
  if (page.jsonLd) tags.push(`<script type="application/ld+json">${JSON.stringify(page.jsonLd).replace(/</g, '\\u003c')}</script>`)
  if (page.path?.startsWith('/interview/')) {
    for (const file of learningStyles) tags.push(`<link rel="stylesheet" href="/assets/${file}" />`)
  }
  {
    const linked = new Set(tags.join('\n').match(/href="\/assets\/[^"]+\.css"/g)?.map(h => h.slice(6, -1)) ?? [])
    // main.tsx starts the page chunk (CourseLearning) before LearnFrame, so its CSS comes first.
    const extra = [...(page.path === '/interview/' ? interviewHubCss : []), ...(isCoursePage(page.path) ? courseLearningCss : []), ...(isLearnFramePage(page.path) ? learnFrameCss : [])]
    for (const file of new Set(extra)) if (!linked.has(`/${file}`)) tags.push(`<link rel="stylesheet" href="/${esc(file)}" />`)
  }
  if (page.path === '/ai-tools') {
    // Its large two-line H1 (Poppins 700) re-wraps when the font swaps in after the fallback, shifting the whole page
    // (CLS 0.054). Preloading that one file (8 KB) makes it available at first paint.
    tags.push(`<link rel="preload" as="font" type="font/woff2" href="/assets/${poppins700}" crossorigin />`)
    for (const file of aiToolsCss) tags.push(`<link rel="stylesheet" href="/${file}" />`)
  }
  if (page.path.startsWith('/interview/guides/')) tags.push('<link rel="stylesheet" href="/community.css" />')
  if (page.path === '/our-work') {
    for (const file of ourWorkCss) tags.push(`<link rel="stylesheet" href="/${file}" />`)
  }
  if (page.path === '/visual-lab/') {
    // The client's own order for the VisualLab chunk (it also pulls in academy.css, which the filename filter missed).
    const linked = tags.join('\n')
    for (const file of new Set([...clientCssOrder('src/learning/VisualLab.tsx').map(f => f.replace(/^assets\//, '')), ...visualStyles])) {
      if (!linked.includes(`/assets/${file}"`)) tags.push(`<link rel="stylesheet" href="/assets/${file}" />`)
    }
  }
  // LearnFrame's PageFrame always attaches /free-session.css. On pages not prerendered with it, the client appended it
  // last after boot, hiding the page while it loaded and then restyling it (a layout shift). Link it last, as the
  // client does, so the first paint already has the final styles.
  if (isLearnFramePage(page.path) && !page.fsDesign) tags.push(`<link rel="stylesheet" href="/free-session.css?v=${cssVersion}" />`)
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
  if (page.fsDesign || page.path === '/interview-studio') {
    // These pages use only the self-hosted fonts (index CSS): drop the shell's Google accent-font request and preconnect.
    html = html.replace(/\s*<!-- Inter, Poppins and Noto[\s\S]*?-->/, '')
    html = html.replace(/\s*<link rel="preconnect" href="https:\/\/fonts\.gstatic\.com"[^>]*>/, '')
    html = html.replace(/\s*<link rel="preload" as="style" href="https:\/\/fonts\.googleapis\.com[^>]*>/, '')
    html = html.replace(/\s*<noscript><link rel="stylesheet" href="https:\/\/fonts\.googleapis\.com[^>]*><\/noscript>/, '')
  }
  html = html.replace('</head>', `    ${page.rawHead ?? buildHead(page)}\n  </head>`)
  if (page.html) html = html.replace('<div id="root"></div>', `<div id="root">${page.html}</div>`)
  return html
}

// App shell for server-rendered content pages (blog, case studies): the backend fills the two markers.
await writeFile(path.join(dist, 'content-shell.html'), render({ fsDesign: true, rawHead: `<!--SEO_HEAD-->\n    <link rel="stylesheet" href="/free-session.css?v=${cssVersion}" />`, html: '<!--SSR_ROOT-->' }))

const pages = renderAll({ skipMissing: process.env.ALLOW_MISSING_LOCATIONS === '1' })
for (const page of pages) {
  const file = path.join(dist, page.file)
  await mkdir(path.dirname(file), { recursive: true })
  await writeFile(file, render(page))
}

// sitemap: indexable canonical URLs only; no <lastmod> (we do not track real content-change dates)
const urls = pages.filter((p) => p.indexable).map((p) => `${SITE}${p.path}`)
if (new Set(urls).size !== urls.length) throw new Error('Duplicate sitemap URLs')
for (const page of pages.filter(p => p.indexable)) {
  if (page.canonical && page.canonical !== `${SITE}${page.path}`) throw new Error('Noncanonical page in sitemap: ' + page.path)
}
const sitemap = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls
  .map((u) => `  <url><loc>${u}</loc></url>`)
  .join('\n')}\n</urlset>\n`
await writeFile(path.join(dist, 'sitemap.xml'), sitemap)

console.log(`prerendered ${pages.length} pages and wrote sitemap.xml (${urls.length} URLs)`)
