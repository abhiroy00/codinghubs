import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { learningMeta } from './learning'
import { LearnFrame } from '../learning/LearnFrame'
import { InterviewGuide } from '../interview/InterviewGuide'
import guides from '../interview/guides.json'
import { GENAI_LEVELS } from '../learning/genai-content'

vi.mock('../lib/fs-css', () => ({ FS_CSS: '/free-session.css' }))
vi.mock('../locations/FsShell', () => ({ FsHeader: () => null }))
vi.mock('../components/SiteFooter', () => ({ SiteFooter: () => null }))
vi.mock('../interview/ResourceActions', () => ({ ResourceActions: () => null }))

beforeEach(() => {
  document.head.innerHTML = '<title>Account</title><meta name="robots" content="noindex, nofollow">'
})

describe('published interview indexing', () => {
  for (const slug of ['data-science', 'aws-developer-associate', 'aws-certified-solutions-architect', 'java-full-stack-developer-gen-ai', 'mern-stack', 'agentic-ai']) {
    it(`indexes the ${slug} guide, which has a COMPLETE lesson`, () => {
      const seo = learningMeta('interview', slug)
      expect(seo.robots).not.toContain('noindex')
      expect(seo.canonical).toBe(`https://codinghubs.in/interview/${slug}/`)
    })
  }
  it('indexes the generative-ai guide only once one of its articles is COMPLETE', () => {
    const complete = GENAI_LEVELS.flatMap(l => l.articleSlugs).some(a => a.status === 'COMPLETE')
    const seo = learningMeta('interview', 'generative-ai')
    expect(seo.robots).toBe(complete ? 'index, follow, max-image-preview:large' : 'noindex, follow')
    expect(seo.canonical).toBe('https://codinghubs.in/interview/generative-ai/')
  })
  it('keeps a course without any COMPLETE lesson out of the index', () => {
    expect(learningMeta('interview', 'cissp').robots).toBe('noindex, follow')
  })
  it('consolidates the Data Science alias on its published primary', () => {
    const seo = learningMeta('interview', 'data-science-pro')
    expect(seo.robots).not.toContain('noindex')
    expect(seo.canonical).toBe('https://codinghubs.in/interview/data-science/')
  })
  it('keeps a workspace without a published source excluded', () => {
    expect(learningMeta('interview', 'advanced-digital-marketing').robots).toContain('noindex')
    expect(learningMeta('interview', 'does-not-exist').robots).toContain('noindex')
  })
  it('replaces private metadata when navigating to a published guide', () => {
    render(<MemoryRouter initialEntries={['/interview/data-science/']}><LearnFrame><h1>Data Science</h1></LearnFrame></MemoryRouter>)
    expect(document.querySelectorAll('meta[name="robots"]')).toHaveLength(1)
    expect(document.querySelector('meta[name="robots"]')?.getAttribute('content')).not.toContain('noindex')
    expect(document.querySelector('link[rel="canonical"]')?.getAttribute('href')).toBe('https://codinghubs.in/interview/data-science/')
  })
  for (const guide of guides) {
    it(`preserves topic guide metadata in the browser: ${guide.slug}`, () => {
      const path = `/interview/guides/${guide.slug}/`
      render(<MemoryRouter initialEntries={[path]}><Routes><Route path="/interview/guides/:slug" element={<InterviewGuide />} /></Routes></MemoryRouter>)
      expect(document.querySelector('meta[name="robots"]')?.getAttribute('content')).not.toContain('noindex')
      expect(document.querySelector('link[rel="canonical"]')?.getAttribute('href')).toBe('https://codinghubs.in' + path)
      expect(document.title).toContain(guide.title.slice(0, 30))
      expect(document.querySelector('script[type="application/ld+json"]')?.textContent).toContain('LearningResource')
    })
  }
})
