import { describe, expect, it } from 'vitest'
import { COMPLETENESS, INDEX, NOINDEX, PRIVATE, cleanCanonical, getRobotsDirective, guideStatus, hubStatus, lessonStatus, placeholderPhrases } from './robots'

const lesson = { words: COMPLETENESS.lessonMinWords, questions: COMPLETENESS.lessonMinQuestions, placeholder: false }

describe('getRobotsDirective', () => {
  it('indexes only COMPLETE self-canonical content', () => {
    expect(getRobotsDirective({ kind: 'content', status: 'COMPLETE', selfCanonical: true })).toBe(INDEX)
    expect(getRobotsDirective({ kind: 'content', status: 'COMPLETE' })).toBe(INDEX)
    expect(getRobotsDirective({ kind: 'content', status: 'COMPLETE', selfCanonical: false })).toBe(NOINDEX)
    expect(getRobotsDirective({ kind: 'content', status: 'THIN', selfCanonical: true })).toBe(NOINDEX)
    expect(getRobotsDirective({ kind: 'content', status: 'PLACEHOLDER', selfCanonical: true })).toBe(NOINDEX)
    expect(getRobotsDirective({ kind: 'content' })).toBe(NOINDEX)
  })
  it('keeps application screens out of the index whatever their status', () => {
    expect(getRobotsDirective({ kind: 'private', status: 'COMPLETE', selfCanonical: true })).toBe(PRIVATE)
  })
  it('emits real directive strings', () => {
    expect(INDEX).toBe('index, follow, max-image-preview:large')
    expect(NOINDEX).toBe('noindex, follow')
    expect(PRIVATE).toBe('noindex, nofollow')
  })
})

describe('content status', () => {
  it('requires words, subject questions and no placeholders for a lesson', () => {
    expect(lessonStatus(lesson)).toBe('COMPLETE')
    expect(lessonStatus({ ...lesson, words: COMPLETENESS.lessonMinWords - 1 })).toBe('THIN')
    expect(lessonStatus({ ...lesson, questions: COMPLETENESS.lessonMinQuestions - 1 })).toBe('THIN')
    expect(lessonStatus({ ...lesson, duplicate: true })).toBe('THIN')
    expect(lessonStatus({ ...lesson, words: 5000, questions: 20, placeholder: true })).toBe('PLACEHOLDER')
  })
  it('rates guides and hubs', () => {
    expect(guideStatus({ words: COMPLETENESS.guideMinWords, placeholder: false })).toBe('COMPLETE')
    expect(guideStatus({ words: COMPLETENESS.guideMinWords - 1, placeholder: false })).toBe('THIN')
    expect(hubStatus(0)).toBe('PLACEHOLDER')
    expect(hubStatus(COMPLETENESS.hubMinCompleteLessons)).toBe('COMPLETE')
  })
  it('detects template placeholder wording but not subject vocabulary', () => {
    expect(placeholderPhrases('Self-guided study brief · detailed lesson and reference solution pending')).toEqual(['reference solution pending', 'self-guided study brief'])
    expect(placeholderPhrases('Curriculum development in progress.')).toEqual(['curriculum development in progress'])
    expect(placeholderPhrases('A promise is pending, then settles. Why are pods pending? Keep appending.')).toEqual([])
    expect(placeholderPhrases('Generics is a core concept in TypeScript')).toEqual(['is a core concept in'])
  })
})

describe('cleanCanonical', () => {
  it('drops tracking and session parameters and fragments', () => {
    expect(cleanCanonical('https://codinghubs.in/interview/data-science/?utm_source=x&utm_medium=y&gclid=1#top')).toBe('https://codinghubs.in/interview/data-science/')
    expect(cleanCanonical('https://codinghubs.in/blog?page=2&utm_campaign=z')).toBe('https://codinghubs.in/blog?page=2')
  })
})
