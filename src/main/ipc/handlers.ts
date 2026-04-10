import { ipcMain, shell } from 'electron'
import { IPC } from '../../shared/ipc-channels'
import { settingsStore } from '../services/settingsStore'
import { getRange } from '../services/historyDb'
import { getLastData, restartPolling } from '../services/pollScheduler'
import { clearClaudeTokenCache } from '../services/claudeAuth'
import { clearCodexTokenCache } from '../services/codexAuth'
import type { BrowserWindow } from 'electron'
import type { HistoryRange } from '../../shared/types'

export function registerHandlers(win: BrowserWindow) {
  ipcMain.handle(IPC.USAGE_GET_ALL, () => {
    return getLastData()
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
}
