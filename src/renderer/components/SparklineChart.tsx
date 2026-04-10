import React from 'react'
import { AreaChart, Area, ResponsiveContainer, YAxis } from 'recharts'
import type { HistoryPoint } from '@shared/types'

interface Props {
  points: HistoryPoint[]
  height?: number
  className?: string
}

export default function SparklineChart({ points, height = 32, className }: Props) {
  return (
    <div className={className} style={{ width: '100%', height }}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={points} margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
          <defs>
            <linearGradient id="sparkFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--text-display)" stopOpacity={0.1} />
              <stop offset="100%" stopColor="var(--text-display)" stopOpacity={0} />
            </linearGradient>
          </defs>
          <YAxis domain={[0, 100]} hide />
          <Area
            type="monotone"
            dataKey="usedPercent"
            stroke="var(--text-display)"
            strokeWidth={1.5}
            strokeOpacity={0.4}
            fill="url(#sparkFill)"
            dot={false}
            isAnimationActive={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}
