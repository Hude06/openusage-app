import { app, BrowserWindow, nativeTheme } from 'electron'
import path from 'path'
import { registerHandlers } from './ipc/handlers'
import { startPolling, stopPolling } from './services/pollScheduler'
import { settingsStore } from './services/settingsStore'

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

  mainWindow.on('close', () => {
    if (mainWindow) {
      const b = mainWindow.getBounds()
      settingsStore.save({ windowBounds: b })
    }
  })

  mainWindow.on('closed', () => {
    mainWindow = null
    stopPolling()
  })

  mainWindow.once('ready-to-show', () => {
    mainWindow?.show()
    startPolling(mainWindow!)
  })

  registerHandlers(mainWindow)
}

app.whenReady().then(() => {
  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    }
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})
