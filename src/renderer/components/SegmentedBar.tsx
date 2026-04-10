import React from 'react'
import { cn } from '../lib/utils'

type BarSize = 'hero' | 'standard' | 'compact'

interface Props {
  percent: number
  size?: BarSize
  segments?: number
  label?: string
  className?: string
}

const SIZE_HEIGHT: Record<BarSize, number> = {
  hero: 16,
  standard: 10,
  compact: 5,
}

function getStatusColor(percent: number): string {
  const remaining = 100 - percent
  if (remaining <= 10) return 'var(--accent)'
  if (remaining <= 25) return 'var(--warning)'
  return 'var(--text-display)'
}

export function SegmentedBar({
  percent,
  size = 'standard',
  segments = 20,
  label,
  className,
}: Props) {
  const safe = Math.min(100, Math.max(0, percent))
  const filledCount = Math.round((safe / 100) * segments)
  const height = SIZE_HEIGHT[size]
  const gap = 2
  const color = getStatusColor(safe)

  return (
    <div
      className={cn('flex w-full', className)}
      style={{ gap: `${gap}px`, height: `${height}px` }}
      role="meter"
      aria-label={label ?? 'Usage'}
      aria-valuenow={Math.round(safe)}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      {Array.from({ length: segments }, (_, i) => (
        <div
          key={i}
          style={{
            flex: 1,
            height: '100%',
            backgroundColor: i < filledCount ? color : 'var(--border)',
            transition: `background-color var(--duration-transition) var(--ease-out)`,
          }}
        />
      ))}
    </div>
  )
}
