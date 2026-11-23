#!/usr/bin/env node
// Content-completeness audit of the built public learning pages.
//
//   cd frontend && npm run build && node ../seo/content-audit.mjs [--learn-base http://127.0.0.1:8000]
//
// Reads frontend/dist (the HTML crawlers receive) and scores every /interview/** and /courses/** page.
// With --learn-base, also fetches the Django-rendered /learn/** pages from a running backend.
// Writes seo/content-audit.csv and seo/content-audit-summary.md. Thresholds come from
// frontend/src/seo/robots.ts, the same module that decides the robots tag on the pages.
import fs from 'node:fs'
import path from 'node:path'
import { createRequire } from 'node:module'

const root = path.resolve(import.meta.dirname, '..')
const dist = path.join(root, 'frontend/dist')
const SITE = 'https://codinghubs.in'
const require = createRequire(path.join(root, 'frontend/package.json'))
const ts = require('typescript')
const rulesTs = fs.readFileSync(path.join(root, 'frontend/src/seo/robots.ts'), 'utf8')
const rulesJs = ts.transpileModule(rulesTs, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText
const R = await import('data:text/javascript;base64,' + Buffer.from(rulesJs).toString('base64'))
const roadmaps = JSON.parse(fs.readFileSync(path.join(root, 'frontend/src/learning/course-roadmaps/manifest.json'), 'utf8'))
const arg = name => { const i = process.argv.indexOf(name); return i > 0 ? process.argv[i + 1] : undefined }
if (!fs.existsSync(path.join(dist, 'sitemap.xml'))) { console.error('Build first: cd frontend && npm run build'); process.exit(1) }

// ---------- HTML helpers (the build output is machine-generated and regular) ----------
const decode = s => s.replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#x27;|&#39;/g, "'").replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(+n))
const attr = (html, re) => (html.match(re) || [])[1]
function head(html) {
  return {
    robots: attr(html, /<meta name="robots" content="([^"]*)"/) ?? '',
    canonical: attr(html, /<link rel="canonical" href="([^"]*)"/) ?? '',
  }
}
function mainHtml(html) {
  const m = html.match(/<main[^>]*>([\s\S]*)<\/main>/)
  let b = m ? m[1] : html.replace(/^[\s\S]*<body[^>]*>/, '')
  // Remove non-content chrome: scripts, styles, navigation, forms and buttons.
  for (const tag of ['script', 'style', 'nav', 'header', 'footer', 'form', 'button', 'select', 'noscript', 'svg']) b = b.replace(new RegExp(`<${tag}[\\s>][\\s\\S]*?</${tag}>`, 'g'), ' ')
  return b
}
/** Text blocks: each block-level element's own text, normalised. */
function blocks(html) {
  return html.split(/<\/?(?:p|li|h[1-6]|pre|summary|dt|dd|td|th|blockquote|figcaption|div|section|article|details)\b[^>]*>/)
    .map(s => decode(s.replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim()).filter(s => s.split(' ').length >= 3)
}
const norm = s => s.toLowerCase().replace(/\d+/g, '#')
const words = s => s.split(/\s+/).filter(w => /[\p{L}\p{N}]/u.test(w))
function shingles(text, k = 8) {
  const w = words(text.toLowerCase()), out = new Set()
  for (let i = 0; i + k <= w.length; i++) out.add(w.slice(i, i + k).join(' '))
  return out
}
function questionsOf(html) {
  // <article class="genai-question"><details><summary>Q</summary><h3>Answer</h3><p>A</p>…
  return [...html.matchAll(/<article[^>]*class="genai-question"[^>]*>([\s\S]*?)<\/article>/g)].map(m => {
    const text = s => decode(s.replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim()
    const q = text((m[1].match(/<summary[^>]*>([\s\S]*?)<\/summary>/) || [, ''])[1])
    const a = text((m[1].replace(/^[\s\S]*?<\/summary>/, '').match(/<p[^>]*>([\s\S]*?)<\/p>/) || [, ''])[1])
    return { q, a }
  }).filter(x => x.q && x.a.split(' ').length >= 5)
}

// ---------- Collect pages ----------
function walk(dir, out = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name)
    if (e.isDirectory()) walk(p, out); else if (e.name === 'index.html') out.push(p)
  }
  return out
}
function classify(urlPath) {
  let m
  if ((m = urlPath.match(/^\/interview\/guides\/([^/]+)\/$/))) return { type: 'guide', course: 'guides', slug: m[1] }
  if ((m = urlPath.match(/^\/interview\/([^/]+)\/levels\/(\d+)\/articles\/([^/]+)\/$/))) return { type: 'article', course: m[1], level: +m[2], slug: m[3], day: +(m[3].match(/^day-(\d+)$/)?.[1] ?? NaN) || undefined }
  if ((m = urlPath.match(/^\/interview\/([^/]+)\/levels\/(\d+)\/days\/(\d+)\/$/))) return { type: 'day', course: m[1], level: +m[2], day: +m[3] }
  if ((m = urlPath.match(/^\/interview\/([^/]+)\/levels\/(\d+)\/$/))) return { type: 'level', course: m[1], level: +m[2] }
  if ((m = urlPath.match(/^\/interview\/([^/]+)\/$/))) return { type: 'course-hub', course: m[1] }
  if (urlPath === '/interview/') return { type: 'hub', course: '' }
  if ((m = urlPath.match(/^\/courses\/([^/]+)\/$/))) return { type: 'course-page', course: m[1] }
  if (urlPath === '/courses/') return { type: 'hub', course: '' }
  if ((m = urlPath.match(/^\/learn\/([^/]+)\/([^/]+)\/$/))) return { type: 'learn-concept', course: m[1], slug: m[2] }
  if ((m = urlPath.match(/^\/learn\/([^/]+)\/$/))) return { type: 'learn-hub', course: m[1] }
  if (urlPath === '/learn/') return { type: 'hub', course: '' }
  return null
}
const pages = []
for (const file of walk(dist)) {
  const urlPath = '/' + path.relative(dist, path.dirname(file)).split(path.sep).join('/') + '/'
  const info = classify(urlPath)
  if (!info) continue
  pages.push({ url: SITE + urlPath, path: urlPath, ...info, html: fs.readFileSync(file, 'utf8') })
}
const learnBase = arg('--learn-base')
if (learnBase) {
  const seen = new Set(), queue = ['/learn/']
  while (queue.length) {
    const p = queue.shift()
    if (seen.has(p)) continue
    seen.add(p)
    const res = await fetch(learnBase + p, { redirect: 'manual' })
    const html = await res.text()
    if (res.status !== 200) { console.warn(`learn: ${p} → ${res.status}`); continue }
    const info = classify(p)
    if (info) pages.push({ url: SITE + p, path: p, ...info, html })
    for (const [, href] of mainHtml(html).matchAll(/href="(\/learn\/[^"#?]*\/)"/g)) if (!seen.has(href)) queue.push(href)
  }
}

// ---------- Template text: blocks repeated across courses, or across many pages of one course ----------
const blockCourses = new Map(), blockPages = new Map()
for (const p of pages) {
  p.main = mainHtml(p.html)
  p.blocks = [...new Set(blocks(p.main).map(norm))]
  for (const b of p.blocks) {
    if (!blockCourses.has(b)) { blockCourses.set(b, new Set()); blockPages.set(b, new Map()) }
    blockCourses.get(b).add(p.course)
    const byCourse = blockPages.get(b); byCourse.set(p.course, (byCourse.get(p.course) ?? 0) + 1)
  }
}
const isTemplate = (b, course) => blockCourses.get(b).size >= 3 || (blockPages.get(b).get(course) ?? 0) >= 6
const primaryOf = course => roadmaps[course]?.primary ?? course

for (const p of pages) {
  const unique = p.blocks.filter(b => !isTemplate(b, p.course))
  // Nested blocks repeat their children's text; count each word sequence once.
  const text = unique.filter((b, i) => !unique.some((o, j) => j !== i && o.length > b.length && o.includes(b))).join(' ')
  p.uniqueText = text
  // Count each sentence once per page: repeating a paragraph inside every answer adds no content.
  const sentences = [...new Set(text.split(/(?<=[.!?])\s+/).map(x => x.trim().toLowerCase()).filter(Boolean))]
  p.words = words(sentences.join(' ')).length
  p.sh = shingles(text)
  const qs = questionsOf(p.main)
  p.questions = qs.length
  p.genericQuestions = qs.filter(q => { const b = norm(q.a); return blockCourses.has(b) && blockCourses.get(b).size >= 3 }).length
  p.subjectQuestions = p.questions - p.genericQuestions
  const full = decode(p.main.replace(/<[^>]+>/g, ' '))
  p.markers = R.placeholderPhrases(full)
  Object.assign(p, head(p.html))
}

// ---------- Near-duplicates: same course (all pages) and same level/day across courses ----------
const byCourse = new Map(), bySlot = new Map()
for (const p of pages) {
  if (!['article', 'day', 'level', 'learn-concept', 'guide'].includes(p.type)) continue
  ;(byCourse.get(p.course) ?? byCourse.set(p.course, []).get(p.course)).push(p)
  if (p.type === 'day') { const k = `${p.level}/${p.day}`; (bySlot.get(k) ?? bySlot.set(k, []).get(k)).push(p) }
}
function compare(a, b) {
  if (!a.sh.size || !b.sh.size) return
  let inter = 0
  for (const s of a.sh) if (b.sh.has(s)) inter++
  const ca = inter / a.sh.size, cb = inter / b.sh.size
  if (ca > (a.sim ?? 0)) { a.sim = ca; a.simTo = b.path }
  if (cb > (b.sim ?? 0)) { b.sim = cb; b.simTo = a.path }
}
for (const group of [...byCourse.values(), ...bySlot.values()])
  for (let i = 0; i < group.length; i++) for (let j = i + 1; j < group.length; j++) if (group[i].course !== group[j].course || group === byCourse.get(group[i].course)) compare(group[i], group[j])

// ---------- Status ----------
const rank = { article: 0, 'learn-concept': 0, day: 1, level: 2 }
for (const p of pages) {
  const issues = []
  const alias = ['article', 'day', 'level', 'course-hub'].includes(p.type) && roadmaps[p.course] && primaryOf(p.course) !== p.course
  if (alias) issues.push(`alias of /interview/${primaryOf(p.course)}/`)
  if (p.markers.length) issues.push('markers: ' + p.markers.join('|'))
  if (p.genericQuestions) issues.push(`${p.genericQuestions} generic/template answers`)
  // A day page whose lesson is the same as an article page duplicates that article (the article is preferred).
  const dupOf = (p.sim ?? 0) >= R.COMPLETENESS.maxDuplicateContainment && p.simTo ? pages.find(o => o.path === p.simTo) : undefined
  const duplicate = !!dupOf && (rank[p.type] ?? 9) >= (rank[dupOf.type] ?? 9) && p.type !== 'level'
  if (dupOf) issues.push(`${Math.round(p.sim * 100)}% contained in ${p.simTo}`)
  if (['article', 'day', 'learn-concept'].includes(p.type)) {
    p.status = R.lessonStatus({ words: p.words, questions: p.subjectQuestions, placeholder: p.markers.length > 0, duplicate })
    if (p.words < R.COMPLETENESS.lessonMinWords) issues.push(`unique words < ${R.COMPLETENESS.lessonMinWords}`)
    if (p.subjectQuestions < R.COMPLETENESS.lessonMinQuestions) issues.push(`subject Q&As < ${R.COMPLETENESS.lessonMinQuestions}`)
  } else if (p.type === 'guide') {
    p.status = R.guideStatus({ words: p.words, placeholder: p.markers.length > 0 })
  }
  p.issues = issues
}
// Hubs and levels depend on their complete lessons.
const completeLessons = (course, level) => pages.filter(o => o.course === course && (level === undefined || o.level === level) && ['article', 'day', 'learn-concept'].includes(o.type) && o.status === 'COMPLETE').length
for (const p of pages) {
  if (p.status) continue
  if (p.type === 'level' || p.type === 'course-hub' || p.type === 'learn-hub') {
    const n = completeLessons(primaryOf(p.course), p.level)
    p.status = R.hubStatus(n)
    p.issues.push(`${n} complete lessons`)
  } else p.status = p.words >= 300 ? 'COMPLETE' : 'THIN'
}

// ---------- Output ----------
pages.sort((a, b) => a.path.localeCompare(b.path, 'en', { numeric: true }))
const csvCell = v => { const s = v === undefined || v === null || Number.isNaN(v) ? '' : String(v); return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s }
const header = ['url', 'canonical_url', 'course', 'level', 'day', 'word_count', 'status', 'issues', 'current_robots', 'page_type', 'subject_qas', 'max_similarity', 'most_similar_url', 'rule_agrees']
const rows = pages.map(p => {
  const indexed = R.isIndexable(p.robots)
  // Rule agreement: indexed pages must be COMPLETE; COMPLETE primaries should be indexed.
  // Alias pages stay reachable for their learners and consolidate via rel=canonical to the primary URL.
  const alias = p.issues.some(i => i.startsWith('alias of'))
  const agrees = (indexed ? p.status === 'COMPLETE' : p.status !== 'COMPLETE' || p.type === 'course-page') && (!alias || !indexed || p.canonical !== p.url)
  p.agrees = agrees
  return [p.url, p.canonical, p.course, p.level, p.day, p.words, p.status, p.issues.join('; '), p.robots, p.type, p.subjectQuestions || '', p.sim ? p.sim.toFixed(2) : '', p.simTo ? SITE + p.simTo : '', agrees ? 'yes' : 'NO']
})
fs.mkdirSync(path.join(root, 'seo'), { recursive: true })
fs.writeFileSync(path.join(root, 'seo/content-audit.csv'), [header, ...rows].map(r => r.map(csvCell).join(',')).join('\n') + '\n')

// Summary
const PRIORITY = [
  ['cissp', 'CISSP'], ['aws-certified-solutions-architect', 'AWS Solutions Architect'], ['aws-developer-associate', 'AWS Developer Associate'],
  ['azure-administrator-az-104', 'Azure AZ-104'], ['azure-solutions-architect-expert-az-305', 'Azure AZ-305'],
  ['python-training-course', 'Python'], ['data-science', 'Data Science'], ['ai-engineering-diploma', 'AI Engineering'],
  ['ethical-hacker-ceh-v13', 'Ethical Hacking (CEH v13)'], ['mern-stack', 'MERN'],
]
const primaries = Object.values(roadmaps).filter(c => c.primary === c.slug).map(c => c.slug).concat('generative-ai')
const genaiDays = [1, 2, 3, 4].flatMap(n => JSON.parse(fs.readFileSync(path.join(root, `frontend/src/learning/genai-generated/level-${n}.json`), 'utf8')).days.map(d => ({ day: d.day, level: n, articles: d.articles })))
const lessonDaysComplete = course => {
  const complete = new Set(pages.filter(p => p.course === course && p.type === 'article' && p.status === 'COMPLETE').map(p => p.slug))
  if (course === 'generative-ai') return new Set(genaiDays.filter(d => d.articles.length && d.articles.every(a => complete.has(a))).map(d => d.day))
  return new Set([...complete].map(s => +(s.match(/^day-(\d+)$/)?.[1] ?? 0)).filter(Boolean))
}
const courseRows = primaries.map(c => {
  const done = lessonDaysComplete(c)
  const all = pages.filter(p => p.course === c)
  return { c, name: roadmaps[c]?.name ?? 'Generative AI', done: done.size, pct: Math.round(done.size / 30 * 100), indexed: all.filter(p => R.isIndexable(p.robots)).length, total: all.length, missing: Array.from({ length: 30 }, (_, i) => i + 1).filter(d => !done.has(d)) }
}).sort((a, b) => b.pct - a.pct || a.c.localeCompare(b.c))
const top = [], cursors = PRIORITY.map(([slug, name]) => ({ slug, name, missing: [...(courseRows.find(r => r.c === slug)?.missing ?? [])] }))
while (top.length < 20 && cursors.some(c => c.missing.length)) for (const c of cursors) {
  if (top.length >= 20 || !c.missing.length) continue
  const day = c.missing.shift(), level = day <= 7 ? 1 : day <= 14 ? 2 : day <= 22 ? 3 : 4
  const title = roadmaps[c.slug]?.levels[level - 1]?.days.find(d => d.day === day)?.title ?? ''
  top.push(`| ${top.length + 1} | ${c.name} | Day ${day}: ${title} | \`/interview/${c.slug}/levels/${level}/articles/day-${day}/\` |`)
}
const count = (f) => pages.filter(f).length
const byType = [...new Set(pages.map(p => p.type))].map(t => `| ${t} | ${count(p => p.type === t)} | ${count(p => p.type === t && p.status === 'COMPLETE')} | ${count(p => p.type === t && p.status === 'THIN')} | ${count(p => p.type === t && p.status === 'PLACEHOLDER')} | ${count(p => p.type === t && R.isIndexable(p.robots))} |`)
const disagreements = pages.filter(p => !p.agrees)
const md = `# Content-completeness audit

Generated ${new Date().toISOString().slice(0, 10)} from \`frontend/dist\`${learnBase ? ` and ${learnBase}/learn/` : ' (the /learn/ pages are served by Django; rerun with --learn-base to include them)'}. ${pages.length} pages scored. Full rows: [content-audit.csv](content-audit.csv).

## Rule (from \`frontend/src/seo/robots.ts\`)

- **Lesson (article/day/learn concept) COMPLETE**: at least ${R.COMPLETENESS.lessonMinWords} unique words, at least ${R.COMPLETENESS.lessonMinQuestions} subject-specific answered questions, no placeholder phrases, and not a ≥${R.COMPLETENESS.maxDuplicateContainment * 100}% copy of a preferred URL.
- **Guide COMPLETE**: at least ${R.COMPLETENESS.guideMinWords} unique words and no placeholder phrases.
- **Hub / level COMPLETE**: at least ${R.COMPLETENESS.hubMinCompleteLessons} COMPLETE lesson beneath it. Alias courses (separate catalog courses sharing a curriculum) keep their status but must canonicalize to the primary course and stay out of sitemaps.
- The build rates lessons from their authored source (scripts/sync-course-roadmaps.mjs and sync-genai-content.mjs); this audit measures the rendered page, so a page near a threshold can differ.
- **PLACEHOLDER**: placeholder phrases (${R.PLACEHOLDER_PHRASES.map(p => `"${p}"`).join(', ')}) or no complete lessons. **THIN**: the rest.
- Unique words exclude navigation, forms, buttons and any text block that appears in 3+ courses or on 6+ pages of one course (template text). "Generic answers" are question answers whose text appears in 3+ courses.

## Pages by type

| Type | Pages | COMPLETE | THIN | PLACEHOLDER | Currently indexed |
|---|---|---|---|---|---|
${byType.join('\n')}

Pages where the current robots tag disagrees with the rule: **${disagreements.length}**${disagreements.length ? ' (first 15 below)' : ''}.
${disagreements.slice(0, 15).map(p => `- \`${p.path}\` — ${p.status}, robots "${p.robots}"; ${p.issues.join('; ')}`).join('\n')}

## Course completion (complete lesson days out of 30)

| Course | Complete days | % | Indexed pages / built pages |
|---|---|---|---|
${courseRows.map(r => `| ${r.name} (\`${r.c}\`) | ${r.done} | ${r.pct}% | ${r.indexed} / ${r.total} |`).join('\n')}

## Top 20 pages to complete first

High-demand courses first (CISSP, AWS, Azure AZ-104/AZ-305, Python, Data Science, AI Engineering, Ethical Hacking, MERN), taking each course's earliest missing day in turn so Level 1 of every priority course fills before Level 2. Each lesson is written in \`backend/apps/courses/prep_content/<curriculum>/day-NN.json\` (see \`seo/templates/lesson-template.md\`); a course without a curriculum folder needs one created and mapped in \`prep-generated/manifest.json\` first.

| # | Course | Lesson | URL once published |
|---|---|---|---|
${top.join('\n')}
`
fs.writeFileSync(path.join(root, 'seo/content-audit-summary.md'), md)
console.log(`audited ${pages.length} pages → seo/content-audit.csv, seo/content-audit-summary.md`)
for (const t of ['COMPLETE', 'THIN', 'PLACEHOLDER']) console.log(t.padEnd(12), count(p => p.status === t))
console.log('rule disagreements', disagreements.length)
