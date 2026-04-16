import { describe, it, expect } from 'vitest'
import { IPC } from '../ipc-channels'

describe('IPC channels', () => {
  it('has stable channel names (snapshot)', () => {
    expect(IPC).toMatchInlineSnapshot(`
      {
        "AUTH_REFRESH_CLAUDE": "auth:refreshClaude",
        "AUTH_REFRESH_CODEX": "auth:refreshCodex",
        "HISTORY_GET_RANGE": "history:getRange",
        "LEADERBOARD_AUTH": "leaderboard:auth",
        "LEADERBOARD_LOGOUT": "leaderboard:logout",
        "LEADERBOARD_SUBMIT": "leaderboard:submit",
        "SETTINGS_GET": "settings:get",
        "SETTINGS_SAVE": "settings:save",
        "SHELL_OPEN_URL": "shell:openUrl",
        "USAGE_DATA_UPDATED": "usage:dataUpdated",
        "USAGE_FORCE_REFRESH": "usage:forceRefresh",
        "USAGE_GET_ALL": "usage:getAll",
      }
    `)
  })

  it('all values are strings', () => {
    for (const [key, value] of Object.entries(IPC)) {
      expect(typeof value).toBe('string')
    }
  })

  it('all values use colon namespace', () => {
    for (const [key, value] of Object.entries(IPC)) {
      expect(value).toMatch(/^[a-z]+:[a-zA-Z]+$/)
    }
  })
})
