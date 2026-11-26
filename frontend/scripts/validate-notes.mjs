import assert from 'node:assert/strict'
import { readFileSync, readdirSync } from 'node:fs'
import path from 'node:path'

const root = path.resolve(import.meta.dirname, '..')
const read = file => JSON.parse(readFileSync(path.join(root, file), 'utf8'))
const subjects = read('src/notes/catalog.json')
const report = read('src/notes/import-report.json')
const slugs = new Set()
let count = 0
let words = 0
for (const subject of subjects) {
  assert.match(subject.slug, /^[a-z0-9-]+$/)
  assert.ok(!slugs.has(subject.slug), `Duplicate subject: ${subject.slug}`)
  slugs.add(subject.slug)
  assert.ok(subject.title && subject.topics.length > 0)
  assert.equal(subject.topics.length, report.subjectCounts[subject.slug])
  const topicSlugs = new Set()
  for (const topic of subject.topics) {
    assert.match(topic.slug, /^[a-z0-9-]+$/)
    assert.ok(!topicSlugs.has(topic.slug), `Duplicate topic: ${topic.slug}`)
    topicSlugs.add(topic.slug)
    const article = read(`public/notes-content/${subject.slug}/${topic.slug}.json`)
    assert.equal(article.title, topic.title)
    assert.equal(article.slug, topic.slug)
    assert.equal(article.subject, subject.slug)
    assert.equal(article.sourceUrl, `https://codingnowai.in/notes/${subject.slug}/${topic.slug}`)
    assert.ok(article.wordCount > 5 && article.html.length > 40, `Empty article: ${topic.slug}`)
    assert.doesNotMatch(article.html, /<(script|iframe|object|embed|form|input|button|style|svg)\b/i, topic.slug)
    for (const match of article.html.matchAll(/<[a-z][^>]*>/gi)) {
      assert.doesNotMatch(match[0], /\s(?:on[a-z]+|style|srcdoc)\s*=/i, topic.slug)
      assert.doesNotMatch(match[0], /(?:href|src)\s*=\s*["']\s*(?:javascript|data|vbscript):/i, topic.slug)
      assert.doesNotMatch(match[0], /href=["']https?:\/\/(?:www\.)?codingnowai\.in\/notes\//i, topic.slug)
    }
    count++
    words += article.wordCount
  }
  assert.equal(readdirSync(path.join(root, 'public/notes-content', subject.slug)).filter(file => file.endsWith('.json')).length, topicSlugs.size)
}
assert.equal(subjects.length, report.subjects)
assert.equal(count, report.articles)
assert.equal(words, report.words)
console.log(`PASS: ${subjects.length} subjects, ${count} complete imported notes, ${words.toLocaleString('en-IN')} words; content files, source URLs, counts and safe HTML verified.`)
