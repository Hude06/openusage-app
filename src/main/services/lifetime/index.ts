import { BrowserWindow } from 'electron'
import { IPC } from '../../../shared/ipc-channels'
import type {
  LifetimeBreakdown,
  LifetimeScanProgress,
  LifetimeSummary,
} from '../../../shared/lifetime-types'
import { settingsStore } from '../settingsStore'
import {
  closeLifetimeDb,
  getDailyBreakdown,
  getMeta,
  getModelBreakdown,
  getTokensByModel,
  openLifetimeDb,
  setMeta,
  sumLifetime,
} from './lifetimeDb'
import { computeCost, priceForModel } from './pricing'
import { runScan } from './scanner'

let initialized = false
let scanInFlight: Promise<void> | null = null
let currentProgress: LifetimeScanProgress | null = null
let lastScanAt: string | null = null
let currentWindow: BrowserWindow | null = null

function broadcastProgress(progress: LifetimeScanProgress) {
  currentProgress = progress
  if (!currentWindow || currentWindow.isDestroyed()) return
  try {
    currentWindow.webContents.send(IPC.LIFETIME_SCAN_PROGRESS, progress)
  } catch {
    // window may have gone away
  }
}

function resolveInstalledAt(): string {
  const existing = getMeta('installed_at')
  if (existing) return existing
  const settings = settingsStore.load()
  const fromSettings = settings.lifetime?.installedAt
  const now = fromSettings ?? new Date().toISOString()
  setMeta('installed_at', now)
  if (!fromSettings) {
    settingsStore.save({
      lifetime: { ...settings.lifetime, installedAt: now },
    })
  }
  return now
}

function kickoffScan(): Promise<void> {
  if (scanInFlight) return scanInFlight
  scanInFlight = (async () => {
    try {
      currentProgress = {
        phase: 'discover',
        filesTotal: 0,
        filesDone: 0,
        eventsInserted: 0,
        bytesRead: 0,
        startedAt: Date.now(),
      }
      broadcastProgress(currentProgress)
      await runScan({ onProgress: broadcastProgress })
      lastScanAt = new Date().toISOString()
      setMeta('last_scan_at', lastScanAt)
    } catch (err) {
      // Don't crash the app on scan failure — surface in next getSummary
      console.error('[lifetime] scan failed:', err)
    } finally {
      scanInFlight = null
      currentProgress = null
    }
  })()
  return scanInFlight
}

export async function startLifetime(win: BrowserWindow): Promise<void> {
  currentWindow = win
  if (!initialized) {
    try {
      openLifetimeDb()
      initialized = true
    } catch (err) {
      console.error('[lifetime] failed to open db:', err)
      return
    }
  }
  resolveInstalledAt()
  // Fire-and-forget initial scan; don't block app startup
  kickoffScan().catch(() => {})
}

export function stopLifetime(): void {
  closeLifetimeDb()
  initialized = false
  currentWindow = null
}

export function isScanning(): boolean {
  return scanInFlight !== null
}

export function getSummary(): LifetimeSummary {
  const installedAt = resolveInstalledAt()

  if (!initialized) {
    return {
      claudeTokens: 0,
      codexTokens: 0,
      claudeCost: 0,
      codexCost: 0,
      installedAt,
      lastScanAt,
      scanning: false,
    }
  }

  // Sum all events (not just post-install) — every token the CLIs ever recorded
  const totals = sumLifetime(0)

  // Price per-model and accumulate (retail API-equivalent cost)
  let claudeCost = 0
  let codexCost = 0
  try {
    const rows = getTokensByModel(0)
    for (const r of rows) {
      const price = priceForModel(r.provider, r.model)
      const cost = computeCost(price, r)
      if (r.provider === 'claude') claudeCost += cost
      else codexCost += cost
    }
  } catch {
    // Pricing is best-effort — don't block the summary
  }

  return {
    claudeTokens: totals.claudeTokens,
    codexTokens: totals.codexTokens,
    claudeCost,
    codexCost,
    installedAt,
    lastScanAt: lastScanAt ?? getMeta('last_scan_at'),
    scanning: isScanning(),
    scanProgress: currentProgress ?? undefined,
  }
}

export async function forceRescan(): Promise<void> {
  if (!initialized) {
    try {
      openLifetimeDb()
      initialized = true
    } catch {
      return
    }
  }
  await kickoffScan()
}

export function getBreakdown(range?: {
  startMs: number
  endMs: number
}): LifetimeBreakdown {
  if (!initialized) return { byDay: [], byModel: [] }
  const installedAt = resolveInstalledAt()
  const installedMs = new Date(installedAt).getTime() || 0
  const startMs = range?.startMs ?? installedMs
  const endMs = range?.endMs ?? Date.now()
  const days = getDailyBreakdown(startMs, endMs)
  const models = getModelBreakdown(startMs).map((row) => ({
    model: row.model,
    provider: row.provider,
    tokens: row.tokens,
  }))
  return { byDay: days, byModel: models }
}
