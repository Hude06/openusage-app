import { useState, useEffect, useCallback } from 'react'
import type { HistoryPoint, HistoryRange } from '@shared/types'

const DAY_MS = 24 * 60 * 60 * 1000

export function useHistory(
  provider: 'claude' | 'codex',
  windowName: string
): HistoryPoint[] {
  const [points, setPoints] = useState<HistoryPoint[]>([])

  const fetch = useCallback(async () => {
    try {
      const now = Date.now()
      const range: HistoryRange = {
        provider,
        windowName,
        startMs: now - DAY_MS,
        endMs: now,
      }
      const data = await window.tokenPulse.getHistory(range)
      setPoints(data)
    } catch {
      // Silently degrade — sparkline just stays empty
    }
  }, [provider, windowName])

  useEffect(() => {
    fetch()
    const unsub = window.tokenPulse.onDataUpdated(() => {
      fetch()
    })
    return unsub
  }, [fetch])

  return points
}
