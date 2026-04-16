import { contextBridge, ipcRenderer } from 'electron'
import { IPC } from '../shared/ipc-channels'
import type { AllData, AppSettings, HistoryRange, HistoryPoint, LeaderboardResponse } from '../shared/types'

const api = {
  getAll: (): Promise<AllData> => ipcRenderer.invoke(IPC.USAGE_GET_ALL),

  forceRefresh: (): Promise<{ ok: boolean }> =>
    ipcRenderer.invoke(IPC.USAGE_FORCE_REFRESH),

  getHistory: (range: HistoryRange): Promise<HistoryPoint[]> =>
    ipcRenderer.invoke(IPC.HISTORY_GET_RANGE, range),

  getSettings: (): Promise<AppSettings> => ipcRenderer.invoke(IPC.SETTINGS_GET),

  saveSettings: (settings: Partial<AppSettings>): Promise<AppSettings> =>
    ipcRenderer.invoke(IPC.SETTINGS_SAVE, settings),

  openUrl: (url: string): Promise<void> => ipcRenderer.invoke(IPC.SHELL_OPEN_URL, url),

  refreshClaudeAuth: (): Promise<{ ok: boolean }> =>
    ipcRenderer.invoke(IPC.AUTH_REFRESH_CLAUDE),

  refreshCodexAuth: (): Promise<{ ok: boolean }> =>
    ipcRenderer.invoke(IPC.AUTH_REFRESH_CODEX),

  onDataUpdated: (cb: (data: AllData) => void) => {
    const handler = (_event: Electron.IpcRendererEvent, data: AllData) => cb(data)
    ipcRenderer.on(IPC.USAGE_DATA_UPDATED, handler)
    return () => ipcRenderer.removeListener(IPC.USAGE_DATA_UPDATED, handler)
  },

  onMenuOpenSettings: (cb: () => void) => {
    const handler = () => cb()
    ipcRenderer.on('menu:openSettings', handler)
    return () => ipcRenderer.removeListener('menu:openSettings', handler)
  },

  leaderboardAuth: (): Promise<{ ok: boolean }> =>
    ipcRenderer.invoke(IPC.LEADERBOARD_AUTH),

  leaderboardSubmit: (): Promise<{ ok: boolean }> =>
    ipcRenderer.invoke(IPC.LEADERBOARD_SUBMIT),

  leaderboardLogout: (): Promise<{ ok: boolean }> =>
    ipcRenderer.invoke(IPC.LEADERBOARD_LOGOUT),

  onLeaderboardOAuthCallback: (cb: (code: string) => void) => {
    const handler = (_event: Electron.IpcRendererEvent, code: string) => cb(code)
    ipcRenderer.on('leaderboard:oauthCallback', handler)
    return () => ipcRenderer.removeListener('leaderboard:oauthCallback', handler)
  },

  onLeaderboardAuthSuccess: (cb: (result: { userId: string; login: string; avatarUrl: string }) => void) => {
    const handler = (_event: Electron.IpcRendererEvent, result: { userId: string; login: string; avatarUrl: string }) => cb(result)
    ipcRenderer.on('leaderboard:authSuccess', handler)
    return () => ipcRenderer.removeListener('leaderboard:authSuccess', handler)
  },

  onLeaderboardAuthError: (cb: (error: string) => void) => {
    const handler = (_event: Electron.IpcRendererEvent, error: string) => cb(error)
    ipcRenderer.on('leaderboard:authError', handler)
    return () => ipcRenderer.removeListener('leaderboard:authError', handler)
  },
}

contextBridge.exposeInMainWorld('tokenPulse', api)

export type TokenPulseAPI = typeof api
