import { describe, expect, it, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, within } from '@testing-library/react'

const get = vi.fn()
vi.mock('../lib/api', () => ({ api: { get: (...args: unknown[]) => get(...args) } }))
import { TechFeed, type FeedPayload } from './TechFeed'

const item = (n: number, categories: string[]) => ({
  title: `Headline ${n}`, url: `https://example.com/${n}`, summary: `Summary ${n}`, published_at: '2026-11-17T08:00:00Z',
  categories, source: 'src', source_name: 'Example Source', source_url: 'https://example.com/',
})
const payload = (over: Partial<FeedPayload> = {}): FeedPayload => ({
  refreshed_at: '2026-11-18T10:00:00Z', stale: false,
  categories: [{ id: 'ai', label: 'AI & machine learning', count: 1 }, { id: 'data', label: 'Data & databases', count: 13 }],
  sources: [{ id: 'src', name: 'Example Source', url: 'https://example.com/', ok: true, fetched_at: null }],
  items: [item(0, ['ai']), ...Array.from({ length: 13 }, (_, i) => item(i + 1, ['data']))],
  ...over,
})

describe('TechFeed', () => {
  beforeEach(() => get.mockReset())

  it('shows a loading state, then items with source, date and an external link', async () => {
    get.mockResolvedValue({ data: payload() })
    render(<TechFeed />)
    expect(screen.getByText('Loading technology news…')).toBeTruthy()
    const link = await screen.findByRole('link', { name: /Headline 0/ })
    expect(link.getAttribute('href')).toBe('https://example.com/0')
    expect(link.getAttribute('rel')).toContain('noopener')
    expect(screen.getAllByText('Example Source').length).toBeGreaterThan(0)
    expect(screen.getAllByRole('listitem').filter((li) => li.className === 'tf-card')).toHaveLength(12)
    fireEvent.click(screen.getByRole('button', { name: 'Show more headlines' }))
    expect(screen.getAllByRole('listitem').filter((li) => li.className === 'tf-card')).toHaveLength(14)
  })

  it('filters by topic', async () => {
    get.mockResolvedValue({ data: payload() })
    render(<TechFeed />)
    fireEvent.click(await screen.findByRole('button', { name: /AI & machine learning/ }))
    const cards = screen.getAllByRole('listitem').filter((li) => li.className === 'tf-card')
    expect(cards).toHaveLength(1)
    expect(within(cards[0]).getByText('Headline 0')).toBeTruthy()
  })

  it('shows an honest empty state', async () => {
    get.mockResolvedValue({ data: payload({ items: [], categories: [] }) })
    render(<TechFeed />)
    expect(await screen.findByText(/No technology news is available/)).toBeTruthy()
  })

  it('treats a malformed response as an error and can retry', async () => {
    get.mockResolvedValueOnce({ data: [] }).mockResolvedValueOnce({ data: payload() })
    render(<TechFeed />)
    expect(await screen.findByRole('alert')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }))
    expect(await screen.findByRole('link', { name: /Headline 0/ })).toBeTruthy()
  })

  it('explains when a source failed and saved headlines are shown', async () => {
    get.mockRejectedValueOnce(new Error('network'))
    render(<TechFeed />)
    expect(await screen.findByText(/could not be loaded right now/)).toBeTruthy()
    get.mockResolvedValue({ data: payload({ sources: [{ id: 'src', name: 'Example Source', url: '', ok: false, fetched_at: null }] }) })
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }))
    expect(await screen.findByText(/Some sources could not be reached just now \(Example Source\)/)).toBeTruthy()
  })
})
