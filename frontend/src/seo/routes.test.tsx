import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { PrivateRouteMeta } from './PrivateRouteMeta'
import { NotFound } from '../pages/NotFound'
vi.mock('../lib/fs-css', () => ({ FS_CSS: '/free-session.css' }))

beforeEach(() => {
  document.head.innerHTML = '<title>Public page</title><meta name="robots" content="index, follow"><link rel="canonical" href="https://codinghubs.in/courses/"><script type="application/ld+json">{"@type":"Course"}</script>'
})
describe('route metadata transitions', () => {
  for (const path of ['/forgot-password', '/reset-password']) {
    it(`marks ${path} private and removes inherited canonical/schema`, () => {
      const view = render(<MemoryRouter initialEntries={[path]}><PrivateRouteMeta /></MemoryRouter>)
      expect(document.querySelectorAll('meta[name="robots"]')).toHaveLength(1)
      expect(document.querySelector('meta[name="robots"]')?.getAttribute('content')).toContain('noindex')
      expect(document.querySelector('link[rel="canonical"]')).toBeNull()
      expect(document.querySelector('script[type="application/ld+json"]')).toBeNull()
      view.unmount()
      expect(document.title).toBe('Public page')
      expect(document.querySelector('link[rel="canonical"]')?.getAttribute('href')).toBe('https://codinghubs.in/courses/')
    })
  }
  it('replaces metadata on a missing page and restores it on leaving', () => {
    const view = render(<MemoryRouter><NotFound /></MemoryRouter>)
    expect(document.querySelectorAll('meta[name="robots"]')).toHaveLength(1)
    expect(document.querySelector('meta[name="robots"]')?.getAttribute('content')).toContain('noindex')
    expect(document.querySelector('link[rel="canonical"]')).toBeNull()
    expect(document.querySelector('script[type="application/ld+json"]')).toBeNull()
    view.unmount()
    expect(document.title).toBe('Public page')
  })
})
