import { BrowserWindow } from 'electron'
import { readClaudeData } from './claudeReader'
import { readCodexData } from './codexReader'
import { writeSnapshot } from './historyDb'
import { settingsStore } from './settingsStore'
import { checkThresholds, detectResets } from './notifications'
import { submitDailyUsage } from './leaderboardService'
import { getSummary as getLifetimeSummary } from './lifetime'
import { IPC } from '../../shared/ipc-channels'
import type { AllData, LifetimeStats } from '../../shared/types'

let intervalId: ReturnType<typeof setInterval> | null = null
let lastData: AllData = { claude: null, codex: null, lifetime: null }

function buildLifetime(): LifetimeStats {
  const settings = settingsStore.load()
  const fallback = settings.lifetime ?? {
    claudeTokens: 0,
    codexTokens: 0,
    claudeCost: 0,
    lastDate: null,
    lastDayClaudeTokens: 0,
    lastDayCodexTokens: 0,
    lastDayClaudeCost: 0,
  }

  let summary
  try {
    summary = getLifetimeSummary()
  } catch {
    return fallback
  }

  const isInitial = summary.scanning && summary.claudeTokens === 0 && summary.codexTokens === 0
  const claudeTokens = isInitial ? fallback.claudeTokens : summary.claudeTokens
  const codexTokens = isInitial ? fallback.codexTokens : summary.codexTokens
  const claudeCost = isInitial ? fallback.claudeCost : summary.claudeCost
  const codexCost = isInitial ? (fallback.codexCost ?? 0) : summary.codexCost

  const merged: LifetimeStats = {
    claudeTokens,
    codexTokens,
    claudeCost,
    codexCost,
    lastDate: new Date().toISOString().slice(0, 10),
    lastDayClaudeTokens: fallback.lastDayClaudeTokens,
    lastDayCodexTokens: fallback.lastDayCodexTokens,
    lastDayClaudeCost: fallback.lastDayClaudeCost,
    installedAt: summary.installedAt,
    lastScanAt: summary.lastScanAt,
    scanning: summary.scanning,
    scanProgress: summary.scanProgress,
  }

  // Persist the canonical totals so fallback stays in sync when the DB is unavailable
  if (!isInitial) {
    settingsStore.save({
      lifetime: {
        ...merged,
        // Drop the runtime-only fields before writing to JSON
        scanProgress: undefined,
      },
    })
  }
  return merged
}

export function getLastData(): AllData {
  return lastData
}

async function fetchAll(): Promise<AllData> {
  const settings = settingsStore.load()
  const [claude, codex] = await Promise.allSettled([
    readClaudeData(settings.claudeDataPath),
    readCodexData(settings.codexDataPath),
  ])

  const data: AllData = {
    claude: claude.status === 'fulfilled' ? claude.value : null,
    codex: codex.status === 'fulfilled' ? codex.value : null,
    lifetime: null,
  }

  // Pull lifetime totals from the authoritative SQLite store
  data.lifetime = buildLifetime()

  // Persist to history DB
  if (data.claude) {
    writeSnapshot('claude', 'session', data.claude.session.usedPercent, data.claude.session.resetsAt)
    writeSnapshot('claude', 'weekly', data.claude.weekly.usedPercent, data.claude.weekly.resetsAt)
    if (data.claude.opus) {
      writeSnapshot('claude', 'opus', data.claude.opus.usedPercent, data.claude.opus.resetsAt)
    }
  }
  if (data.codex) {
    writeSnapshot('codex', 'session', data.codex.session.usedPercent, data.codex.session.resetsAt)
    writeSnapshot('codex', 'weekly', data.codex.weekly.usedPercent, data.codex.weekly.resetsAt)
  }

  // Check notifications and window resets
  detectResets(lastData, data)
  checkThresholds(lastData, data, settings)

  lastData = data

  // Auto-submit to leaderboard if enabled
  const { leaderboard } = settings
  if (leaderboard?.enabled && leaderboard.githubToken) {
    const today = new Date().toISOString().slice(0, 10)
    if (leaderboard.lastSubmittedDate !== today) {
      submitDailyUsage(leaderboard.githubToken, data)
        .then(() => settingsStore.save({
          leaderboard: { ...leaderboard, lastSubmittedDate: today },
        }))
        .catch(() => {}) // silent failure, retry next cycle
    }
  }

  return data
}

export async function startPolling(win: BrowserWindow) {
  // Immediate fetch
  const data = await fetchAll()
  win.webContents.send(IPC.USAGE_DATA_UPDATED, data)

  const settings = settingsStore.load()
  if (intervalId) clearInterval(intervalId)

  intervalId = setInterval(async () => {
    const updated = await fetchAll()
    if (!win.isDestroyed()) {
      win.webContents.send(IPC.USAGE_DATA_UPDATED, updated)
    }
  }, settings.refreshIntervalMs)
}

export function stopPolling() {
  if (intervalId) {
    clearInterval(intervalId)
    intervalId = null
  }
}

export function restartPolling(win: BrowserWindow) {
  stopPolling()
  startPolling(win)
}
