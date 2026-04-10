import { BrowserWindow } from 'electron'
import { readClaudeData } from './claudeReader'
import { readCodexData } from './codexReader'
import { writeSnapshot } from './historyDb'
import { settingsStore } from './settingsStore'
import { IPC } from '../../shared/ipc-channels'
import type { AllData } from '../../shared/types'

let intervalId: ReturnType<typeof setInterval> | null = null
let lastData: AllData = { claude: null, codex: null }

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
  }

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

  lastData = data
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
