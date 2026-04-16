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
  minimizeToTray: true,
  notificationsEnabled: true,
  notificationThresholds: [75, 90, 95],
  lifetime: {
    claudeTokens: 0,
    codexTokens: 0,
    claudeCost: 0,
    lastDate: null,
    lastDayClaudeTokens: 0,
    lastDayCodexTokens: 0,
    lastDayClaudeCost: 0,
  },
  leaderboard: {
    enabled: false,
    githubToken: null,
    githubLogin: null,
    githubAvatarUrl: null,
    userId: null,
    lastSubmittedDate: null,
  },
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
