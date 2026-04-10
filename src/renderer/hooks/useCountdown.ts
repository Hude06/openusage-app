import { useState, useEffect } from 'react'

function formatCountdown(ms: number): string {
  if (ms <= 0) return 'Resetting...'
  const totalSeconds = Math.floor(ms / 1000)
  const days = Math.floor(totalSeconds / 86400)
  const hours = Math.floor((totalSeconds % 86400) / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)

  if (days > 0) return `${days}d ${hours}h`
  if (hours > 0) return `${hours}h ${minutes}m`
  return `${minutes}m`
}

export function useCountdown(resetsAt: string | null): {
  display: string
  isUrgent: boolean
  msRemaining: number
} {
  const [msRemaining, setMsRemaining] = useState(() => {
    if (!resetsAt) return 0
    return Math.max(0, new Date(resetsAt).getTime() - Date.now())
  })

  useEffect(() => {
    if (!resetsAt) return
    const tick = () => {
      setMsRemaining(Math.max(0, new Date(resetsAt).getTime() - Date.now()))
    }
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [resetsAt])

  return {
    display: resetsAt ? formatCountdown(msRemaining) : '—',
    isUrgent: msRemaining > 0 && msRemaining < 15 * 60 * 1000,
    msRemaining,
  }
}
