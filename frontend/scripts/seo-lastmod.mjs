// Maintains src/seo/lastmod.json: for every sitemap page, a fingerprint of its main content and the date
// that content last changed. scripts/prerender.mjs writes <lastmod> only where the fingerprint still matches,
// so a sitemap never claims a date it cannot support.
//
//   npm run build && npm run seo:lastmod          date pages whose content changed (today) or that are new
//   npm run seo:lastmod -- --check                fail if any sitemap page is undated or stale (CI)
//   npm run seo:lastmod -- --seed                 first run: date each page from the git history of its source
import { execFileSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'

const root = path.resolve(import.meta.dirname, '..')
const repo = path.resolve(root, '..')
const ledgerFile = path.join(root, 'src/seo/lastmod.json')
const hashesFile = path.join(root, 'dist-nginx/content-hashes.json')
if (!fs.existsSync(hashesFile)) { console.error('Run `npm run build` first (dist-nginx/content-hashes.json is missing).'); process.exit(1) }
const hashes = JSON.parse(fs.readFileSync(hashesFile, 'utf8'))
const ledger = fs.existsSync(ledgerFile) ? JSON.parse(fs.readFileSync(ledgerFile, 'utf8')) : {}
const mode = process.argv.includes('--check') ? 'check' : process.argv.includes('--seed') ? 'seed' : 'update'

if (mode === 'check') {
  const stale = Object.keys(hashes).filter(p => ledger[p]?.hash !== hashes[p])
  if (stale.length) {
    console.error(`lastmod ledger is stale for ${stale.length} sitemap pages (e.g. ${stale.slice(0, 3).join(', ')}). Run: npm run seo:lastmod`)
    process.exit(1)
  }
  console.log(`lastmod ledger matches all ${Object.keys(hashes).length} sitemap pages`)
  process.exit(0)
}

/** Seed only: the source file whose history dates a page's content, when one file clearly owns it. */
const prep = JSON.parse(fs.readFileSync(path.join(root, 'src/learning/prep-generated/manifest.json'), 'utf8'))
function sources(p) {
  let m
  if ((m = p.match(/^\/interview\/generative-ai\/levels\/(\d)\/articles\//))) return [`backend/apps/courses/roadmap_content/units-${m[1]}.json`]
  if ((m = p.match(/^\/interview\/([^/]+)\/levels\/\d\/articles\/day-(\d+)\/$/)) && prep[m[1]]) return [`backend/apps/courses/prep_content/${prep[m[1]].curriculum}/day-${m[2].padStart(2, '0')}.json`]
  if (p.startsWith('/interview/guides/')) return ['frontend/src/interview/guides.json']
  if ((m = p.match(/^\/locations\/([^/]+)\/$/)) && fs.existsSync(path.join(root, `src/locations/content/${m[1]}.ts`))) return [`frontend/src/locations/content/${m[1]}.ts`]
  return []
}
const gitDate = files => {
  try { return execFileSync('git', ['log', '-1', '--format=%cs', '--', ...files], { cwd: repo, encoding: 'utf8' }).trim() || null } catch { return null }
}
const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(new Date())

const next = {}
let changed = 0
for (const [p, hash] of Object.entries(hashes)) {
  if (ledger[p]?.hash === hash) { next[p] = ledger[p]; continue }
  changed++
  if (mode === 'seed') {
    const files = sources(p)
    next[p] = { hash, date: files.length ? gitDate(files) : null }
  } else next[p] = { hash, date: today }
}
if (mode === 'seed') {
  // Hubs and level pages change when their lessons do: date them by their newest lesson.
  for (const p of Object.keys(next)) {
    if (next[p].date || !/^\/interview\/[^/]+\/(levels\/\d\/)?$/.test(p)) continue
    const children = Object.keys(next).filter(c => c !== p && c.startsWith(p) && next[c].date).map(c => next[c].date).sort()
    if (children.length) next[p].date = children.at(-1)
  }
}
const sorted = Object.fromEntries(Object.keys(next).sort().map(k => [k, next[k]]))
fs.writeFileSync(ledgerFile, JSON.stringify(sorted, null, 1) + '\n')
const dated = Object.values(sorted).filter(e => e.date).length
console.log(`lastmod ledger: ${changed} updated, ${Object.keys(sorted).length - changed} unchanged; ${dated} of ${Object.keys(sorted).length} sitemap pages carry a date (${Object.keys(ledger).length - Object.keys(ledger).filter(k => k in hashes).length} removed).`)
