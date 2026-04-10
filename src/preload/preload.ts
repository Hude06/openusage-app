import { contextBridge, ipcRenderer } from 'electron'
import { IPC } from '../shared/ipc-channels'
import type { AllData, AppSettings, HistoryRange, HistoryPoint } from '../shared/types'

const api = {
  getAll: (): Promise<AllData> => ipcRenderer.invoke(IPC.USAGE_GET_ALL),

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
}

contextBridge.exposeInMainWorld('tokenPulse', api)

export type TokenPulseAPI = typeof api
