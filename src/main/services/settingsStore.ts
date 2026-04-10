import { app } from 'electron'
import path from 'path'
import os from 'os'
import fs from 'fs'
import type { AppSettings } from '../../shared/types'

const SETTINGS_PATH = path.join(app.getPath('userData'), 'settings.json')

const defaults: AppSettings = {
  claudeDataPath: path.join(os.homedir(), '.claude'),
  codexDataPath: path.join(os.homedir(), '.codex'),
  refreshIntervalMs: 60000,
  windowBounds: null,
}

function load(): AppSettings {
  try {
    if (fs.existsSync(SETTINGS_PATH)) {
      const raw = fs.readFileSync(SETTINGS_PATH, 'utf8')
      return { ...defaults, ...JSON.parse(raw) }
    }
  } catch {
    // ignore
  }
  return { ...defaults }
}

function save(settings: Partial<AppSettings>): AppSettings {
  const current = load()
  const merged = { ...current, ...settings }
  fs.writeFileSync(SETTINGS_PATH, JSON.stringify(merged, null, 2))
  return merged
}

export const settingsStore = { load, save }
