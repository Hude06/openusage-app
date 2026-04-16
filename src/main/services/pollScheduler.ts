import { BrowserWindow } from 'electron'
import { readClaudeData } from './claudeReader'
import { readCodexData } from './codexReader'
import { writeSnapshot } from './historyDb'
import { settingsStore } from './settingsStore'
import { checkThresholds, detectResets } from './notifications'
import { submitDailyUsage } from './leaderboardService'
import { IPC } from '../../shared/ipc-channels'
import type { AllData, LifetimeStats } from '../../shared/types'

let intervalId: ReturnType<typeof setInterval> | null = null
let lastData: AllData = { claude: null, codex: null, lifetime: null }

function updateLifetime(data: AllData): LifetimeStats {
  const settings = settingsStore.load()
  const prev = { ...settings.lifetime }
  const today = new Date().toISOString().slice(0, 10)

  const claudeToday = data.claude?.tokensToday ?? 0
  const codexToday = data.codex?.creditsUsedToday ?? 0
  const claudeCostToday = data.claude?.costToday ?? 0

  if (prev.lastDate && prev.lastDate !== today) {
    // New day — finalize previous day's totals into lifetime
    prev.claudeTokens += prev.lastDayClaudeTokens
    prev.codexTokens += prev.lastDayCodexTokens
    prev.claudeCost += prev.lastDayClaudeCost
  }

  const updated: LifetimeStats = {
    claudeTokens: prev.claudeTokens,
    codexTokens: prev.codexTokens,
    claudeCost: prev.claudeCost,
    lastDate: today,
    lastDayClaudeTokens: claudeToday,
    lastDayCodexTokens: codexToday,
    lastDayClaudeCost: claudeCostToday,
  }

  settingsStore.save({ lifetime: updated })
  return updated
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

  // Accumulate lifetime stats
  data.lifetime = updateLifetime(data)

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
