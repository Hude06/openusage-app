import { useEffect, useState } from 'react'
import type { LifetimeScanProgress } from '@shared/lifetime-types'

export function useLifetimeScan(): LifetimeScanProgress | null {
  const [progress, setProgress] = useState<LifetimeScanProgress | null>(null)

  useEffect(() => {
    return window.tokenUsage.onLifetimeScanProgress((p) => {
      if (p.phase === 'idle') {
        // Brief linger so the UI can show "done"
        setProgress(p)
        const t = setTimeout(() => setProgress(null), 1500)
        return () => clearTimeout(t)
      }
      setProgress(p)
    })
  }, [])

  return progress
}
