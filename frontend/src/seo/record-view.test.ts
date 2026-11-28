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

  it('retries a failed view without waiting thirty minutes', async () => {
    const t = 1_700_000_000_000
    post.mockRejectedValueOnce(new Error('network'))
    expect(await recordView('blog', 'retry-post', t)).toBe(false)
    expect(await recordView('blog', 'retry-post', t + 1000)).toBe(true)
    expect(post).toHaveBeenCalledTimes(2)
  })

  it('shares an in-flight view and only marks it counted after success', async () => {
    let resolve: (value: unknown) => void
    post.mockReturnValueOnce(new Promise((done) => { resolve = done }))
    const first = recordView('blog', 'concurrent-post', 1_700_000_000_000)
    const second = recordView('blog', 'concurrent-post', 1_700_000_000_000)
    expect(localStorage.getItem('ch_view_blog_concurrent-post')).toBeNull()
    await Promise.resolve()
    resolve!({ status: 204 })
    expect(await first).toBe(true)
    expect(await second).toBe(true)
    expect(post).toHaveBeenCalledTimes(1)
    expect(localStorage.getItem('ch_view_blog_concurrent-post')).toBe('1700000000000')
  })
})
