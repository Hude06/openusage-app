import React from 'react'

interface Props {
  status: 'ok' | 'no_token' | 'expired' | 'error'
}

const CONFIG = {
  no_token: { color: 'var(--warning)', border: 'var(--warning)', label: 'NO CREDENTIALS' },
  expired: { color: 'var(--warning)', border: 'var(--warning)', label: 'EXPIRED' },
  error: { color: 'var(--accent)', border: 'var(--accent)', label: 'ERROR' },
} as const

export function AuthBadge({ status }: Props) {
  if (status === 'ok') return null

  const cfg = CONFIG[status]

  return (
    <span
      className="font-mono tabular-nums"
      style={{
        fontSize: '10px',
        lineHeight: '1.2',
        letterSpacing: '0.08em',
        textTransform: 'uppercase',
        color: cfg.color,
        border: `1px solid ${cfg.border}`,
        borderRadius: '999px',
        padding: '2px 8px',
      }}
    >
      {cfg.label}
    </span>
  )
}
