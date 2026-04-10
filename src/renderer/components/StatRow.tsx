import React from 'react'
import { cn } from '../lib/utils'

interface Props {
  label: string
  value: string
  secondaryValue?: string
  statusColor?: string
  className?: string
}

export function StatRow({ label, value, secondaryValue, statusColor, className }: Props) {
  return (
    <div className={cn('flex items-center justify-between', className)}>
      <span className="label">{label}</span>
      <div className="flex items-center gap-3">
        {secondaryValue && (
          <span
            className="font-mono text-caption"
            style={{ color: 'var(--text-disabled)' }}
          >
            {secondaryValue}
          </span>
        )}
        <span
          className="font-mono text-body-sm tabular-nums"
          style={{ color: statusColor ?? 'var(--text-primary)' }}
        >
          {value}
        </span>
      </div>
    </div>
  )
}
