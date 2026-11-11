import fs from 'node:fs'
import path from 'node:path'
const root = path.resolve(import.meta.dirname, '..')
const generated = path.join(root, 'src/learning/genai-generated')
const dist = path.join(root, 'dist')
const manifest = JSON.parse(fs.readFileSync(path.join(generated, 'manifest.json'), 'utf8'))
const sitemap = fs.readFileSync(path.join(dist, 'sitemap.xml'), 'utf8')
const site = 'https://codinghubs.in'
const assert = (ok, message) => { if (!ok) throw new Error(message) }
const seen = new Set()
let pages = 0, answers = 0
const graph = html => [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].flatMap(m => JSON.parse(m[1])['@graph'] ?? [])
for (const level of manifest) {
  const base = `/interview-prep/generative-ai/levels/${level.level}/`
  const data = JSON.parse(fs.readFileSync(path.join(generated, `level-${level.level}.json`), 'utf8'))
  const routes = [{ suffix: '' }, ...level.articleSlugs.map(article => ({ suffix: `articles/${article.slug}/`, article })), ...level.days.map(day => ({ suffix: `days/${day.day}/` }))]
  for (const route of routes) {
    const url = base + route.suffix
    const html = fs.readFileSync(path.join(dist, url.slice(1), 'index.html'), 'utf8')
    assert(sitemap.includes(`<loc>${site + url}</loc>`), 'Missing sitemap URL: ' + url)
    assert((html.match(/<main\b/g) ?? []).length === 1, 'Nested main landmarks: ' + url)
    assert(/\/assets\/genai-roadmap-[^" ]+\.css/.test(html), 'Missing first-paint roadmap CSS: ' + url)
    const description = html.match(/<meta name="description" content="([^"]+)"/)?.[1]
    assert(description && !seen.has(description), 'Duplicate or missing description: ' + url)
    seen.add(description)
    const nodes = graph(html)
    const resource = nodes.find(n => n['@type'] === 'LearningResource' && n.url === site + url)
    assert(resource?.name && resource.isAccessibleForFree === true, 'Missing truthful resource schema: ' + url)
    assert(!nodes.some(n => ['FAQPage', 'QAPage', 'Review', 'AggregateRating'].includes(n['@type'])), 'Unsupported rich-result markup: ' + url)
    if (route.article) {
      for (const source of route.article.sources) assert(resource.citation?.includes(source), 'Missing article citation: ' + url)
      for (const q of data.questions.filter(q => q.article === route.article.slug)) {
        assert(html.includes(`id="${q.id}"`), 'Question not available in prerendered article: ' + q.id)
        answers++
      }
    }
    pages++
  }
}
const landing = fs.readFileSync(path.join(dist, 'interview-prep/generative-ai/index.html'), 'utf8')
assert(graph(landing).some(n => n['@type'] === 'ItemList' && n.numberOfItems === 4), 'Missing four-level roadmap schema')
assert(answers === 400, 'Not all interview answers are discoverable in article HTML')
console.log(`PASS: ${pages} GenAI pages in sitemap, distinct descriptions, learning-resource schema, first-paint CSS and ${answers} prerendered question answers.`)
