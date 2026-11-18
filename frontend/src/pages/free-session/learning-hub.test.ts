import { describe, expect, it } from 'vitest'
import manifest from '../../learning/genai-generated/manifest.json'
import level1 from '../../learning/genai-generated/level-1.json'
import { COURSE_BY_SLUG } from '../../learning/catalog'
import { HOME_CHALLENGE, HOME_COURSES, HOME_PROJECT, HOME_ROADMAP } from './learning-hub'

describe('homepage learning content stays in sync with its sources', () => {
  it('roadmap levels match the Generative AI manifest', () => {
    expect(HOME_ROADMAP.levels.map(({ level, title, start, end, articles }) => ({ level, title, start, end, articles })))
      .toEqual(manifest.map((l) => ({ level: l.level, title: l.title, start: l.start, end: l.end, articles: l.articleCount })))
  })

  it('challenge code and answer come from the tokenization lesson', () => {
    const article = level1.articles.find((a) => a.slug === 'nlp-tokenization')!
    expect(HOME_CHALLENGE.code).toBe(article.code.trim())
    expect(HOME_CHALLENGE.answer).toBe(article.expected)
    expect(HOME_CHALLENGE.options).toContain(HOME_CHALLENGE.answer)
    expect(new Set(HOME_CHALLENGE.options).size).toBe(HOME_CHALLENGE.options.length)
  })

  it('beginner project matches the catalogue', () => {
    const project = COURSE_BY_SLUG.get('data-analytics-using-python')!.projects[0]
    expect(project.name).toBe(HOME_PROJECT.name)
    expect(project.description).toBe(HOME_PROJECT.description)
    expect(project.steps).toEqual(HOME_PROJECT.steps)
    expect(project.outcome).toBe(HOME_PROJECT.outcome)
    expect(project.skills).toEqual(HOME_PROJECT.skills)
  })

  it('every homepage course links to a real course page', () => {
    for (const course of HOME_COURSES) expect(COURSE_BY_SLUG.get(course.slug)?.name, course.title).toBeTruthy()
  })
})
