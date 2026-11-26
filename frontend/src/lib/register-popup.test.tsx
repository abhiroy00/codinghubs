import { act, cleanup, render, screen, fireEvent } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { AUTO_OPEN_MS, RegisterPopupProvider } from './register-popup'
import { trackLead } from './analytics'

const dialog = () => screen.queryByRole('dialog', { name: 'Free demo registration' })
const wait = () => act(() => { vi.advanceTimersByTime(AUTO_OPEN_MS) })
const mount = () => render(<MemoryRouter><RegisterPopupProvider><input aria-label="field" /></RegisterPopupProvider></MemoryRouter>)

describe('automatic free demo popup', () => {
  beforeEach(() => { vi.useFakeTimers(); localStorage.clear(); window.history.replaceState(null, '', '/courses/') })
  afterEach(() => { cleanup(); vi.useRealTimers() })

  it('opens after 25 seconds and again 25 seconds after it is closed', () => {
    mount()
    act(() => { vi.advanceTimersByTime(AUTO_OPEN_MS - 1) })
    expect(dialog()).toBeNull()
    act(() => { vi.advanceTimersByTime(1) })
    expect(dialog()).not.toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'Close' }))
    expect(dialog()).toBeNull()
    wait()
    expect(dialog()).not.toBeNull()
  })

  it('stays away from visitors who registered or sent an enquiry', () => {
    localStorage.setItem('ch_registered', '1')
    mount(); wait()
    expect(dialog()).toBeNull()
    cleanup(); localStorage.clear()
    mount(); trackLead('location_enquiry', 'Python'); wait(); wait()
    expect(dialog()).toBeNull()
  })

  it('waits while the visitor is typing', () => {
    mount()
    screen.getByLabelText('field').focus()
    wait()
    expect(dialog()).toBeNull()
    screen.getByLabelText('field').blur()
    wait()
    expect(dialog()).not.toBeNull()
  })

  it('does not open on the login page', () => {
    window.history.replaceState(null, '', '/login')
    mount(); wait(); wait()
    expect(dialog()).toBeNull()
  })
})
