import React, { lazy, Suspense } from 'react'
import type { HistoryPoint } from '@shared/types'

interface Props {
  points: HistoryPoint[]
  height?: number
  className?: string
}

const LazyChart = lazy(() => import('./SparklineChart'))

export function Sparkline({ points, height = 32, className }: Props) {
  if (points.length < 2) return null

  return (
    <Suspense fallback={null}>
      <LazyChart points={points} height={height} className={className} />
    </Suspense>
  )
}
