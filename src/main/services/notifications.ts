import { Notification } from 'electron'
import type { AllData, AppSettings, WindowUsage } from '../../shared/types'

// Track which thresholds have already fired to prevent spam
// Key format: "provider:windowName:threshold"
const firedThresholds = new Set<string>()

function formatTimeRemaining(resetsAt: string | null): string {
  if (!resetsAt) return ''
  const ms = new Date(resetsAt).getTime() - Date.now()
  if (ms <= 0) return 'resetting now'
  const hours = Math.floor(ms / 3600000)
  const minutes = Math.floor((ms % 3600000) / 60000)
  if (hours > 24) return `${Math.floor(hours / 24)}d ${hours % 24}h`
  if (hours > 0) return `${hours}h ${minutes}m`
  return `${minutes}m`
}

function checkWindow(
  provider: string,
  windowName: string,
  window: WindowUsage | null,
  prevWindow: WindowUsage | null,
  thresholds: number[]
): void {
  if (!window) return

  for (const threshold of thresholds) {
    const key = `${provider}:${windowName}:${threshold}`

    // Already fired for this window cycle
    if (firedThresholds.has(key)) continue

    // Check if usage crossed threshold upward
    const prevUsed = prevWindow?.usedPercent ?? 0
    if (window.usedPercent >= threshold && prevUsed < threshold) {
      firedThresholds.add(key)

      const remaining = formatTimeRemaining(window.resetsAt)
      const body = remaining
        ? `${windowName} window resets in ${remaining}`
        : `${windowName} window`

      new Notification({
        title: `${provider.toUpperCase()} — ${threshold}% USED`,
        body,
      }).show()
    }
  }
}

export function checkThresholds(
  prev: AllData,
  current: AllData,
  settings: AppSettings
): void {
  if (!settings.notificationsEnabled) return

  const thresholds = settings.notificationThresholds

  // Claude windows
  checkWindow('claude', 'Session', current.claude?.session ?? null, prev.claude?.session ?? null, thresholds)
  checkWindow('claude', 'Weekly', current.claude?.weekly ?? null, prev.claude?.weekly ?? null, thresholds)

  // Codex windows
  checkWindow('codex', 'Session', current.codex?.session ?? null, prev.codex?.session ?? null, thresholds)
  checkWindow('codex', 'Weekly', current.codex?.weekly ?? null, prev.codex?.weekly ?? null, thresholds)
}

/**
 * Clear fired thresholds for a provider+window when the window resets.
 * Called when we detect usedPercent dropped significantly (window rolled over).
 */
export function clearThresholdsForWindow(provider: string, windowName: string): void {
  const prefix = `${provider}:${windowName}:`
  for (const key of firedThresholds) {
    if (key.startsWith(prefix)) {
      firedThresholds.delete(key)
    }
  }
}

/**
 * Detect window resets by checking if usedPercent dropped by >20%.
 */
export function detectResets(prev: AllData, current: AllData): void {
  const pairs = [
    { provider: 'claude', name: 'Session', prev: prev.claude?.session, curr: current.claude?.session },
    { provider: 'claude', name: 'Weekly', prev: prev.claude?.weekly, curr: current.claude?.weekly },
    { provider: 'codex', name: 'Session', prev: prev.codex?.session, curr: current.codex?.session },
    { provider: 'codex', name: 'Weekly', prev: prev.codex?.weekly, curr: current.codex?.weekly },
  ]

  for (const { provider, name, prev: p, curr: c } of pairs) {
    if (p && c && p.usedPercent - c.usedPercent > 20) {
      clearThresholdsForWindow(provider, name)
    }
  }
}
