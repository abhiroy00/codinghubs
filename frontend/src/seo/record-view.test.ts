import { beforeEach, describe, expect, it, vi } from 'vitest'

const post = vi.fn()
vi.mock('../lib/api', () => ({ api: { post: (...args: unknown[]) => post(...args), get: vi.fn() } }))

import { recordView, VIEW_WINDOW_MS } from '../content-pages/api'

describe('recordView', () => {
  beforeEach(() => {
    localStorage.clear()
    post.mockReset()
    post.mockResolvedValue({ status: 204 })
  })

  it('counts the first visit and ignores refreshes within the window', async () => {
    const t = 1_700_000_000_000
    expect(await recordView('blog', 'ai-courses', t)).toBe(true)
    expect(await recordView('blog', 'ai-courses', t + 60_000)).toBe(false)
    expect(post).toHaveBeenCalledTimes(1)
    expect(post).toHaveBeenCalledWith('/blogs/ai-courses/view/')
  })

  it('counts again after the window and counts each post separately', async () => {
    const t = 1_700_000_000_000
    await recordView('blog', 'ai-courses', t)
    expect(await recordView('blog', 'ai-courses', t + VIEW_WINDOW_MS + 1)).toBe(true)
    expect(await recordView('blog', 'another-post', t + 1000)).toBe(true)
    expect(await recordView('case', 'ai-courses', t + 1000)).toBe(true)
    expect(post).toHaveBeenCalledTimes(4)
  })

  it('reports false and never throws when the request fails', async () => {
    post.mockRejectedValueOnce(new Error('network'))
    await expect(recordView('blog', 'offline-post', 1)).resolves.toBe(false)
  })
})
