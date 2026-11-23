import assert from 'node:assert/strict'
import { test } from 'node:test'
import { excludesIndexing, inspectSeoHtml } from './seo-html.mjs'

test('a second robots tag or googlebot directive can exclude an otherwise indexable page', () => {
  for (const tag of ["<meta name='robots' content='noindex, follow'>", '<META CONTENT="NOINDEX" NAME="Googlebot">', '<meta name=googlebot content=none>']) {
    const result = inspectSeoHtml(`<head><meta name="robots" content="index, follow">${tag}</head>`)
    assert.equal(result.robots.length, 2)
    assert.equal(result.noindex, true)
  }
})
test('ignores comments and body text, preserves all canonical tags', () => {
  const result = inspectSeoHtml('<head><!-- <meta name="robots" content="noindex"> --><link href="https://codinghubs.in/interview/" rel="canonical"><link rel="canonical" href="https://codinghubs.in/"></head><body>noindex</body>')
  assert.equal(result.noindex, false)
  assert.deepEqual(result.canonicals, ['https://codinghubs.in/interview/', 'https://codinghubs.in/'])
})
test('recognizes restrictive HTTP directives, including scoped Googlebot headers', () => {
  assert.equal(excludesIndexing('googlebot: noindex, follow'), true)
  assert.equal(excludesIndexing('none'), true)
  assert.equal(excludesIndexing('index, follow, max-image-preview:large'), false)
})
