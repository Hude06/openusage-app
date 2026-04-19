import { useState, useEffect, useCallback } from 'react'
import type { AllData } from '@shared/types'

export function useUsageData() {
  const [data, setData] = useState<AllData>({ claude: null, codex: null, lifetime: null })
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    try {
      const result = await window.tokenUsage.getAll()
      setData(result)
    } catch (e) {
      console.error('Failed to fetch usage data', e)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    refresh()
    const unsub = window.tokenUsage.onDataUpdated((updated) => {
      setData(updated)
      setLoading(false)
    })
    return unsub
  }, [refresh])

  return { data, loading, refresh }
}
