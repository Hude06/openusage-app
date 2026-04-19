import { ipcMain, shell } from 'electron'
import { IPC } from '../../shared/ipc-channels'
import { settingsStore } from '../services/settingsStore'
import { getRange } from '../services/historyDb'
import { getLastData, restartPolling } from '../services/pollScheduler'
import { clearClaudeTokenCache } from '../services/claudeAuth'
import { clearCodexTokenCache } from '../services/codexAuth'
import { submitDailyUsage } from '../services/leaderboardService'
import { forceRescan as forceRescanLifetime, getBreakdown as getLifetimeBreakdown } from '../services/lifetime'
import type { BrowserWindow } from 'electron'
import type { HistoryRange } from '../../shared/types'

const GITHUB_CLIENT_ID = process.env.GITHUB_CLIENT_ID ?? ''

export function registerHandlers(win: BrowserWindow) {
  ipcMain.handle(IPC.USAGE_GET_ALL, () => {
    return getLastData()
  })

  ipcMain.handle(IPC.USAGE_FORCE_REFRESH, () => {
    restartPolling(win)
    return { ok: true }
  })

  ipcMain.handle(IPC.HISTORY_GET_RANGE, (_event, range: HistoryRange) => {
    return getRange(range.provider, range.windowName, range.startMs, range.endMs)
  })

  ipcMain.handle(IPC.SETTINGS_GET, () => {
    return settingsStore.load()
  })

  ipcMain.handle(IPC.SETTINGS_SAVE, (_event, settings) => {
    const saved = settingsStore.save(settings)
    restartPolling(win)
    return saved
  })

  ipcMain.handle(IPC.SHELL_OPEN_URL, (_event, url: string) => {
    // Only allow https URLs
    if (url.startsWith('https://')) {
      shell.openExternal(url)
    }
  })

  ipcMain.handle(IPC.AUTH_REFRESH_CLAUDE, () => {
    clearClaudeTokenCache()
    restartPolling(win)
    return { ok: true }
  })

  ipcMain.handle(IPC.AUTH_REFRESH_CODEX, () => {
    clearCodexTokenCache()
    restartPolling(win)
    return { ok: true }
  })

  ipcMain.handle(IPC.LEADERBOARD_AUTH, () => {
    const authUrl = `https://github.com/login/oauth/authorize?client_id=${GITHUB_CLIENT_ID}&scope=read:user&redirect_uri=openusage://callback`
    shell.openExternal(authUrl)
    return { ok: true }
  })

  ipcMain.handle(IPC.LEADERBOARD_SUBMIT, async () => {
    const settings = settingsStore.load()
    const { leaderboard } = settings
    if (!leaderboard.enabled || !leaderboard.githubToken) {
      return { ok: false, error: 'Leaderboard not configured' }
    }
    const data = getLastData()
    await submitDailyUsage(leaderboard.githubToken, data)
    const today = new Date().toISOString().slice(0, 10)
    settingsStore.save({ leaderboard: { ...leaderboard, lastSubmittedDate: today } })
    return { ok: true }
  })

  ipcMain.handle(IPC.LIFETIME_FORCE_RESCAN, async () => {
    await forceRescanLifetime()
    restartPolling(win)
    return { ok: true }
  })

  ipcMain.handle(IPC.LIFETIME_GET_BREAKDOWN, (_event, range?: { startMs: number; endMs: number }) => {
    return getLifetimeBreakdown(range)
  })

  ipcMain.handle(IPC.LEADERBOARD_LOGOUT, () => {
    const settings = settingsStore.load()
    settingsStore.save({
      leaderboard: {
        ...settings.leaderboard,
        enabled: false,
        githubToken: null,
        githubLogin: null,
        githubAvatarUrl: null,
        userId: null,
        lastSubmittedDate: null,
      },
    })
    return { ok: true }
  })

}
