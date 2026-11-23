import fs from 'node:fs'
import path from 'node:path'
const root = path.resolve(import.meta.dirname, '..')
const generated = path.join(root, 'src/learning/genai-generated')
const dist = path.join(root, 'dist')
const manifest = JSON.parse(fs.readFileSync(path.join(generated, 'manifest.json'), 'utf8'))
const sitemap = fs.readFileSync(path.join(dist, 'sitemap.xml'), 'utf8')
const redirects = fs.readFileSync(path.join(root, 'dist-nginx/lesson-days.map'), 'utf8')
const site = 'https://codinghubs.in'
const assert = (ok, message) => { if (!ok) throw new Error(message) }
const roadmapCss = fs.readdirSync(path.join(dist, 'assets')).filter(n => n.endsWith('.css') && fs.readFileSync(path.join(dist, 'assets', n), 'utf8').includes('.genai-roadmap{'))
const seen = new Set()
let pages = 0, answers = 0, indexedPages = 0
const graph = html => [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].flatMap(m => JSON.parse(m[1])['@graph'] ?? [])
for (const level of manifest) {
  const base = `/interview/generative-ai/levels/${level.level}/`
  const data = JSON.parse(fs.readFileSync(path.join(generated, `level-${level.level}.json`), 'utf8'))
  // Days are not pages: each 301s to its first article, which carries the day's assignment.
  for (const day of level.days) {
    assert(!fs.existsSync(path.join(dist, base.slice(1), `days/${day.day}/index.html`)), 'Duplicate day still prerendered: ' + base + `days/${day.day}/`)
    assert(redirects.includes(`${base}days/${day.day}/ ${base}articles/${day.article}/;`), 'Missing day redirect: ' + base + `days/${day.day}/`)
  }
  const completeInLevel = level.articleSlugs.filter(a => a.status === 'COMPLETE').length
  const routes = [{ suffix: '', complete: completeInLevel > 0 }, ...level.articleSlugs.map(article => ({ suffix: `articles/${article.slug}/`, article, complete: article.status === 'COMPLETE' }))]
  for (const route of routes) {
    const url = base + route.suffix
    const html = fs.readFileSync(path.join(dist, url.slice(1), 'index.html'), 'utf8')
    // Indexing follows the shared rule (src/seo/robots.ts): only COMPLETE articles, and levels that contain one.
    const indexed = /<meta name="robots" content="index, follow/.test(html)
    assert(indexed === route.complete, 'Robots does not follow article status: ' + url)
    assert(sitemap.includes(`<loc>${site + url}</loc>`) === indexed, 'Sitemap gate mismatch: ' + url)
    if (indexed) indexedPages++
    assert((html.match(/<main\b/g) ?? []).length === 1, 'Nested main landmarks: ' + url)
    assert(roadmapCss.some(n => html.includes(`/assets/${n}`)), 'Missing first-paint roadmap CSS: ' + url)
    const description = html.match(/<meta name="description" content="([^"]+)"/)?.[1]
    assert(description && !seen.has(description), 'Duplicate or missing description: ' + url)
    seen.add(description)
    const nodes = graph(html)
    const resource = nodes.find(n => n['@type'] === 'LearningResource' && n.url === site + url)
    if (indexed) assert(resource?.name && resource.isAccessibleForFree === true, 'Missing truthful resource schema: ' + url)
    assert(!nodes.some(n => ['FAQPage', 'QAPage', 'Review', 'AggregateRating'].includes(n['@type'])), 'Unsupported rich-result markup: ' + url)
    if (route.article) {
      if (indexed) for (const source of route.article.sources) assert(resource.citation?.includes(source), 'Missing article citation: ' + url)
      for (const q of data.questions.filter(q => q.article === route.article.slug)) {
        assert(html.includes(`id="${q.id}"`), 'Question not available in prerendered article: ' + q.id)
        answers++
      }
    }
    pages++
  }
}
const landing = fs.readFileSync(path.join(dist, 'interview/generative-ai/index.html'), 'utf8')
assert(graph(landing).some(n => n['@type'] === 'ItemList' && n.numberOfItems === 4), 'Missing four-level roadmap schema')
assert(answers === 400, 'Not all interview answers are discoverable in article HTML')
console.log(`PASS: ${pages} GenAI pages (${indexedPages} indexed by the completeness rule), 30 day URLs redirected to articles, distinct descriptions, first-paint CSS and ${answers} prerendered question answers.`)
