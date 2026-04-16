import { app, BrowserWindow, Menu, nativeTheme } from 'electron'
import path from 'path'
import { registerHandlers } from './ipc/handlers'
import { startPolling, stopPolling, restartPolling, getLastData } from './services/pollScheduler'
import { settingsStore } from './services/settingsStore'
import { exchangeGithubCode } from './services/leaderboardService'
import { createTray, updateTray, destroyTray } from './tray'
import { IPC } from '../shared/ipc-channels'

const isDev = process.env.ELECTRON_DEV === '1'

let mainWindow: BrowserWindow | null = null

function createWindow() {
  const settings = settingsStore.load()
  const bounds = settings.windowBounds

  nativeTheme.themeSource = 'dark'

  mainWindow = new BrowserWindow({
    width: bounds?.width ?? 480,
    height: bounds?.height ?? 680,
    x: bounds?.x,
    y: bounds?.y,
    minWidth: 400,
    minHeight: 500,
    titleBarStyle: 'hiddenInset',
    backgroundColor: '#000000',
    webPreferences: {
      preload: path.join(__dirname, '../preload/preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  })

  if (isDev) {
    mainWindow.loadURL('http://localhost:5173')
    mainWindow.webContents.openDevTools()
  } else {
    mainWindow.loadFile(path.join(__dirname, '../../renderer/index.html'))
  }

  // Hide to tray instead of closing on macOS
  mainWindow.on('close', (e) => {
    if (mainWindow) {
      const b = mainWindow.getBounds()
      settingsStore.save({ windowBounds: b })

      const currentSettings = settingsStore.load()
      if (currentSettings.minimizeToTray && process.platform === 'darwin') {
        e.preventDefault()
        mainWindow.hide()
        return
      }
    }
  })

  mainWindow.on('closed', () => {
    mainWindow = null
    stopPolling()
  })

  mainWindow.once('ready-to-show', () => {
    mainWindow?.show()
    startPolling(mainWindow!)

    // Create tray after window is ready
    createTray(mainWindow!)
  })

  registerHandlers(mainWindow)
}

// ─── Application menu with keyboard shortcuts ─────────────
function buildMenu() {
  const template: Electron.MenuItemConstructorOptions[] = [
    {
      label: app.name,
      submenu: [
        { role: 'about' },
        { type: 'separator' },
        {
          label: 'Settings',
          accelerator: 'CmdOrCtrl+,',
          click: () => {
            mainWindow?.webContents.send('menu:openSettings')
          },
        },
        { type: 'separator' },
        { role: 'hide' },
        { role: 'hideOthers' },
        { role: 'unhide' },
        { type: 'separator' },
        { role: 'quit' },
      ],
    },
    {
      label: 'View',
      submenu: [
        {
          label: 'Force Refresh',
          accelerator: 'CmdOrCtrl+R',
          click: () => {
            if (mainWindow) {
              restartPolling(mainWindow)
            }
          },
        },
        { type: 'separator' },
        ...(isDev ? [
          { role: 'reload' as const },
          { role: 'toggleDevTools' as const },
        ] : []),
      ],
    },
    {
      label: 'Window',
      submenu: [
        {
          label: 'Close',
          accelerator: 'CmdOrCtrl+W',
          click: () => {
            const settings = settingsStore.load()
            if (settings.minimizeToTray && process.platform === 'darwin') {
              mainWindow?.hide()
            } else {
              mainWindow?.close()
            }
          },
        },
        { role: 'minimize' },
      ],
    },
  ]

  Menu.setApplicationMenu(Menu.buildFromTemplate(template))
}

// ─── Poll data update listener (for tray updates) ────────
function setupTrayUpdates() {
  // Update tray on each poll cycle
  const originalStartPolling = startPolling
  const pollInterval = setInterval(() => {
    if (mainWindow) {
      const data = getLastData()
      updateTray(data, mainWindow)
    }
  }, 5000) // Check every 5s for tray updates

  app.on('before-quit', () => {
    clearInterval(pollInterval)
  })
}

// ─── Custom protocol for GitHub OAuth callback ──────────
app.setAsDefaultProtocolClient('openusage')

app.on('open-url', async (_event, url) => {
  if (!url.startsWith('openusage://callback')) return
  const params = new URL(url).searchParams
  const code = params.get('code')
  if (!code || !mainWindow) return

  try {
    const result = await exchangeGithubCode(code)
    const settings = settingsStore.load()
    settingsStore.save({
      leaderboard: {
        ...settings.leaderboard,
        enabled: true,
        githubToken: result.token,
        githubLogin: result.login,
        githubAvatarUrl: result.avatarUrl,
        userId: result.userId,
      },
    })
    mainWindow.webContents.send('leaderboard:authSuccess', result)
  } catch {
    mainWindow.webContents.send('leaderboard:authError', 'Authentication failed')
  }
})

app.whenReady().then(() => {
  buildMenu()
  createWindow()
  setupTrayUpdates()

  app.on('activate', () => {
    if (mainWindow) {
      mainWindow.show()
      mainWindow.focus()
    } else if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    }
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    destroyTray()
    app.quit()
  }
})

app.on('before-quit', () => {
  destroyTray()
})
