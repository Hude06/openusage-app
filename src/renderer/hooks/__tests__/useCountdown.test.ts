import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useCountdown } from '../useCountdown'

describe('useCountdown', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('returns dash display for null resetsAt', () => {
    const { result } = renderHook(() => useCountdown(null))
    expect(result.current.display).toBe('—')
    expect(result.current.isUrgent).toBe(false)
    expect(result.current.msRemaining).toBe(0)
  })

  it('shows days and hours for long durations', () => {
    const future = new Date(Date.now() + 2 * 86400_000 + 5 * 3600_000).toISOString()
    const { result } = renderHook(() => useCountdown(future))
    expect(result.current.display).toBe('2d 5h')
    expect(result.current.isUrgent).toBe(false)
  })

  it('shows hours and minutes for medium durations', () => {
    const future = new Date(Date.now() + 3 * 3600_000 + 30 * 60_000).toISOString()
    const { result } = renderHook(() => useCountdown(future))
    expect(result.current.display).toBe('3h 30m')
  })

  it('shows minutes only for short durations', () => {
    const future = new Date(Date.now() + 45 * 60_000).toISOString()
    const { result } = renderHook(() => useCountdown(future))
    expect(result.current.display).toBe('45m')
  })

  it('marks urgent when under 15 minutes', () => {
    const future = new Date(Date.now() + 10 * 60_000).toISOString()
    const { result } = renderHook(() => useCountdown(future))
    expect(result.current.isUrgent).toBe(true)
  })

  it('not urgent at exactly 15 minutes', () => {
    const future = new Date(Date.now() + 15 * 60_000).toISOString()
    const { result } = renderHook(() => useCountdown(future))
    expect(result.current.isUrgent).toBe(false)
  })

  it('shows Resetting... for past dates', () => {
    const past = new Date(Date.now() - 1000).toISOString()
    const { result } = renderHook(() => useCountdown(past))
    expect(result.current.display).toBe('Resetting...')
  })

  it('updates on interval tick', () => {
    const future = new Date(Date.now() + 120_000).toISOString()
    const { result } = renderHook(() => useCountdown(future))
    const initial = result.current.msRemaining

    act(() => {
      vi.advanceTimersByTime(1000)
    })

    expect(result.current.msRemaining).toBeLessThan(initial)
  })
})
