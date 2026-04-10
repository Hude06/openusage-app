import React from 'react'
import { useCountdown } from '../hooks/useCountdown'
import { cn } from '../lib/utils'

interface Props {
  resetsAt: string | null
  className?: string
}

export function CountdownTimer({ resetsAt, className }: Props) {
  const { display, isUrgent } = useCountdown(resetsAt)

  return (
    <span
      className={cn('font-mono text-body-sm tabular-nums leading-none', className)}
      style={{
        color: isUrgent ? 'var(--accent)' : 'var(--text-primary)',
        transition: `color var(--duration-transition) var(--ease-out)`,
      }}
    >
      {display}
    </span>
  )
}
