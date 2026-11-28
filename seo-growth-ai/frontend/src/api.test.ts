import { afterEach, describe, expect, it, vi } from 'vitest'
import { api, dateLabel, number, setCsrf } from './api'

afterEach(() => vi.unstubAllGlobals())
describe('measured data presentation', () => {
  it('distinguishes missing measurements from measured zeros', () => {
    expect(number(null)).toBe('—')
    expect(number(undefined)).toBe('—')
    expect(number(0)).toBe('0')
    expect(number(8048)).toBe('8,048')
    expect(number(1.565606, 2)).toBe('1.57')
  })
  it('keeps exported calendar dates in Kolkata time', () => {
    expect(dateLabel('2026-11-26')).toContain('26 Nov 2026')
    expect(dateLabel('2026-11-26T20:00:00Z')).toContain('27 Nov 2026')
  })
})
describe('authenticated local API boundary', () => {
  it('adds CSRF only to writes and does not put secrets into URLs', async () => {
    const fetch = vi.fn().mockResolvedValue(new Response('{"ok":true}', { status: 200 }))
    vi.stubGlobal('fetch', fetch)
    setCsrf('local-test-csrf')
    await api('/sites/fixture/jobs', { method: 'POST', body: { kind: 'analyze' } })
    const [url, options] = fetch.mock.calls[0]
    expect(url).toBe('/api/sites/fixture/jobs')
    expect(options.headers['X-CSRF-Token']).toBe('local-test-csrf')
    expect(options.credentials).toBe('same-origin')
  })
  it('lets the browser set multipart boundaries for uploads', async () => {
    const fetch = vi.fn().mockResolvedValue(new Response('{"files":[]}', { status: 200 }))
    vi.stubGlobal('fetch', fetch)
    await api('/sites/fixture/imports', { method: 'POST', files: new FormData() })
    expect(fetch.mock.calls[0][1].headers['Content-Type']).toBeUndefined()
  })
  it('surfaces validation failures rather than treating them as success', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('{"error":{"message":"Wrong source context"}}', { status: 422 })))
    await expect(api('/sites/fixture/chatgpt/import', { method: 'POST', body: {} })).rejects.toThrow('Wrong source context')
  })
})
