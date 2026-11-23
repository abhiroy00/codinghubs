import { describe, expect, it } from 'vitest'
import { courseRoadmapMeta } from '../learning/course-roadmap-seo'
import { genaiMeta } from '../learning/genai-seo'
import { COURSE_ROADMAPS } from '../learning/course-roadmap-content'
import { GENAI_LEVELS } from '../learning/genai-content'

describe('one URL per lesson', () => {
  it('canonicalizes a roadmap day with a published lesson to its article', () => {
    const day = COURSE_ROADMAPS['python-training-course'].levels[0].days.find(d => d.article)!
    const seo = courseRoadmapMeta('python-training-course', 1, undefined, day.day)
    expect(seo.canonical).toBe(`https://codinghubs.in/interview/python-training-course/levels/1/articles/${day.article}/`)
    expect(seo.robots).toBe('noindex, follow')
    expect(courseRoadmapMeta('python-training-course', 1, day.article).robots).toBe('index, follow, max-image-preview:large')
  })
  it('keeps study-brief days and empty levels out of the index', () => {
    const brief = COURSE_ROADMAPS.cissp.levels[1].days[0]
    expect(brief.article).toBeUndefined()
    expect(courseRoadmapMeta('cissp', 2, undefined, brief.day).robots).toBe('noindex, follow')
    expect(courseRoadmapMeta('cissp', 2).robots).toBe('noindex, follow')
  })
  it('maps every GenAI day to its first article', () => {
    for (const level of GENAI_LEVELS) for (const day of level.days) {
      expect(level.articleSlugs.some(a => a.slug === day.article)).toBe(true)
      expect(genaiMeta(level.level, undefined, day.day).canonical).toBe(`https://codinghubs.in/interview/generative-ai/levels/${level.level}/articles/${day.article}/`)
    }
  })
})
