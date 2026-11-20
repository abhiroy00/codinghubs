import { describe, expect, it } from 'vitest'
import { RELATED_COURSE_SLUGS } from '../learning/relatedArticles'
import { COURSE_BY_SLUG } from '../learning/catalog'

// Blog slugs are checked against the seeded posts in scripts/validate-seo.mjs (it can read the backend folder).
describe('course related guides', () => {
  it('belong to courses that exist', () => {
    expect(RELATED_COURSE_SLUGS.filter((slug) => !COURSE_BY_SLUG.has(slug))).toEqual([])
  })
})
