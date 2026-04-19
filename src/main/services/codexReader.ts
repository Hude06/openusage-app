import fs from 'fs'
import path from 'path'
import https from 'https'
import { getCodexToken } from './codexAuth'
import type { CodexData, DailyCredits, CodexThread, WindowUsage } from '../../shared/types'

interface WhamWindow {
  used_percent?: number
  limit_window_seconds?: number
  reset_at?: number
}

interface WhamUsage {
  rate_limit?: {
    primary_window?: WhamWindow
    secondary_window?: WhamWindow
  }
  credits?: {
    balance?: string | number
  }
}

async function fetchLiveUsage(token: string): Promise<WhamUsage | null> {
  return new Promise((resolve) => {
    const req = https.request(
      {
        hostname: 'chatgpt.com',
        path: '/backend-api/wham/usage',
        method: 'GET',
        headers: {
          Authorization: `Bearer ${token}`,
          'User-Agent': 'OpenTokenUsage/1.0',
          Accept: 'application/json',
        },
        timeout: 10000,
      },
      (res) => {
        let data = ''
        res.on('data', (chunk) => (data += chunk))
        res.on('end', () => {
          if (res.statusCode !== 200) { resolve(null); return }
          try {
            resolve(JSON.parse(data))
          } catch {
            resolve(null)
          }
        })
      }
    )
    req.on('error', () => resolve(null))
    req.on('timeout', () => { req.destroy(); resolve(null) })
    req.end()
  })
}

function readCodexThreads(codexDataPath: string): CodexThread[] {
  const dbPath = path.join(codexDataPath, 'state_5.sqlite')
  if (!fs.existsSync(dbPath)) return []
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const Database = require('better-sqlite3')
    const db = new Database(dbPath, { readonly: true })
    const cutoffMs = Date.now() - 30 * 24 * 60 * 60 * 1000
    const rows = db
      .prepare(
        'SELECT id, created_at, model, tokens_used, cwd FROM threads WHERE tokens_used > 0 AND created_at >= ? ORDER BY created_at DESC'
      )
      .all(cutoffMs) as {
      id: string
      created_at: number
      model: string
      tokens_used: number
      cwd: string
    }[]
    db.close()
    return rows.map((r) => ({
      id: r.id,
      createdAt: r.created_at,
      model: r.model ?? 'unknown',
      tokensUsed: r.tokens_used ?? 0,
      cwd: r.cwd ?? '',
    }))
  } catch {
    return []
  }
}

function buildDailyCreditsFromThreads(threads: CodexThread[]): DailyCredits[] {
  const byDay: Record<string, { total: number; byService: Record<string, number> }> = {}
  for (const t of threads) {
    const date = new Date(t.createdAt).toISOString().split('T')[0]
    if (!byDay[date]) byDay[date] = { total: 0, byService: {} }
    byDay[date].total += t.tokensUsed
    const service = t.model ?? 'unknown'
    byDay[date].byService[service] = (byDay[date].byService[service] ?? 0) + t.tokensUsed
  }
  return Object.entries(byDay)
    .map(([date, v]) => ({ date, ...v }))
    .sort((a, b) => a.date.localeCompare(b.date))
}

function makeDefaultWindow(label: string, windowMinutes: number): WindowUsage {
  return { usedPercent: 0, resetsAt: null, windowMinutes, label }
}

export async function readCodexData(codexDataPath: string): Promise<CodexData> {
  const threads = readCodexThreads(codexDataPath)
  const dailyCredits = buildDailyCreditsFromThreads(threads)

  const today = new Date().toISOString().split('T')[0]
  const todayEntry = dailyCredits.find((d) => d.date === today)
  const creditsUsedToday = todayEntry?.total ?? 0

  let session: WindowUsage = makeDefaultWindow('Session', 300)
  let weekly: WindowUsage = makeDefaultWindow('Weekly', 10080)
  let creditsRemaining: number | null = null
  let authStatus: CodexData['authStatus'] = 'no_token'
  let error: string | null = null

  try {
    const token = await getCodexToken(codexDataPath)
    if (!token) {
      authStatus = 'no_token'
      error = 'No Codex credentials found. Make sure Codex CLI is installed and logged in.'
    } else {
      const usage = await fetchLiveUsage(token)
      if (usage) {
        authStatus = 'ok'
        const primary = usage.rate_limit?.primary_window
        const secondary = usage.rate_limit?.secondary_window
        if (primary) {
          session = {
            usedPercent: primary.used_percent ?? 0,
            resetsAt: primary.reset_at ? new Date(primary.reset_at * 1000).toISOString() : null,
            windowMinutes: primary.limit_window_seconds ? Math.round(primary.limit_window_seconds / 60) : 300,
            label: 'Session',
          }
        }
        if (secondary) {
          weekly = {
            usedPercent: secondary.used_percent ?? 0,
            resetsAt: secondary.reset_at ? new Date(secondary.reset_at * 1000).toISOString() : null,
            windowMinutes: secondary.limit_window_seconds ? Math.round(secondary.limit_window_seconds / 60) : 10080,
            label: 'Weekly',
          }
        }
        const bal = usage.credits?.balance
        creditsRemaining = bal != null ? Number(bal) : null
      } else {
        authStatus = 'error'
        error = 'Could not fetch live Codex usage data.'
      }
    }
  } catch (e) {
    authStatus = 'error'
    error = String(e)
  }

  return {
    session,
    weekly,
    creditsRemaining,
    creditsUsedToday,
    dailyCredits,
    recentThreads: threads.slice(0, 20),
    lastUpdated: new Date().toISOString(),
    error,
    authStatus,
  }
}
