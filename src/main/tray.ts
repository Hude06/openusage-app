import { Tray, Menu, nativeImage, BrowserWindow } from 'electron'
import type { AllData } from '../shared/types'

let tray: Tray | null = null

export function getStatusColor(data: AllData): 'green' | 'yellow' | 'red' | 'gray' {
  const percents: number[] = []

  if (data.claude) {
    percents.push(data.claude.session.usedPercent)
    percents.push(data.claude.weekly.usedPercent)
  }
  if (data.codex) {
    percents.push(data.codex.session.usedPercent)
    percents.push(data.codex.weekly.usedPercent)
  }

  if (percents.length === 0) return 'gray'

  const maxUsed = Math.max(...percents)
  if (maxUsed >= 90) return 'red'
  if (maxUsed >= 75) return 'yellow'
  return 'green'
}

function createTrayIcon(color: 'green' | 'yellow' | 'red' | 'gray'): Electron.NativeImage {
  const colors: Record<string, string> = {
    green: '#4A9E5C',
    yellow: '#D4A843',
    red: '#D71921',
    gray: '#666666',
  }
  const fill = colors[color]

  // 32x32 circle icon (2x for retina)
  const svg = `<svg width="32" height="32" xmlns="http://www.w3.org/2000/svg">
    <circle cx="16" cy="16" r="6" fill="${fill}"/>
  </svg>`

  return nativeImage.createFromBuffer(Buffer.from(svg))
}

function buildContextMenu(data: AllData, win: BrowserWindow | null): Menu {
  const items: Electron.MenuItemConstructorOptions[] = []

  if (data.claude) {
    const remaining = 100 - data.claude.session.usedPercent
    items.push({
      label: `CLAUDE: ${Math.round(remaining)}% remaining`,
      enabled: false,
    })
  }

  if (data.codex) {
    const remaining = 100 - data.codex.session.usedPercent
    items.push({
      label: `CODEX: ${Math.round(remaining)}% remaining`,
      enabled: false,
    })
  }

  if (items.length === 0) {
    items.push({ label: 'No data yet', enabled: false })
  }

  items.push({ type: 'separator' })
  items.push({
    label: 'Show',
    click: () => {
      win?.show()
      win?.focus()
    },
  })
  items.push({
    label: 'Quit',
    click: () => {
      if (win) {
        win.destroy()
      }
      require('electron').app.quit()
    },
  })

  return Menu.buildFromTemplate(items)
}

export function createTray(win: BrowserWindow): void {
  const icon = createTrayIcon('gray')
  tray = new Tray(icon)
  tray.setToolTip('Open Usage')

  tray.on('click', () => {
    if (win.isVisible()) {
      win.hide()
    } else {
      win.show()
      win.focus()
    }
  })

  updateTray({ claude: null, codex: null, lifetime: null }, win)
}

export function updateTray(data: AllData, win: BrowserWindow): void {
  if (!tray) return

  const color = getStatusColor(data)
  tray.setImage(createTrayIcon(color))
  tray.setContextMenu(buildContextMenu(data, win))
}

export function destroyTray(): void {
  tray?.destroy()
  tray = null
}
