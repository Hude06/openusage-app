import fs from 'fs'
import path from 'path'
import https from 'https'
import { getClaudeToken } from './claudeAuth'
import type { ClaudeData, DailyTokens, ModelUsage, WindowUsage } from '../../shared/types'

interface OAuthUsageWindow {
  utilization?: number
  resets_at?: string
}

interface ApiUsageResponse {
  five_hour?: OAuthUsageWindow
  seven_day?: OAuthUsageWindow
  seven_day_sonnet?: OAuthUsageWindow
  seven_day_opus?: OAuthUsageWindow
}

async function fetchLiveUsage(token: string): Promise<ApiUsageResponse | null> {
  return new Promise((resolve) => {
    const req = https.request(
      {
        hostname: 'api.anthropic.com',
        path: '/api/oauth/usage',
        method: 'GET',
        headers: {
          Authorization: `Bearer ${token}`,
          'anthropic-beta': 'oauth-2025-04-20',
          'User-Agent': 'claude-code/2.1.80',
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

function readStatsCache(claudeDataPath: string): {
  dailyTokens: DailyTokens[]
  modelUsage: ModelUsage[]
  costToday: number
  tokensToday: number
  costLast30Days: number
  tokensLast30Days: number
} {
  const cachePath = path.join(claudeDataPath, 'stats-cache.json')
  try {
    if (fs.existsSync(cachePath)) {
      const raw = JSON.parse(fs.readFileSync(cachePath, 'utf8'))

      const dailyTokens: DailyTokens[] = (raw.dailyModelTokens ?? []).map(
        (d: { date: string; tokensByModel: Record<string, number> }) => ({
          date: d.date,
          total: Object.values(d.tokensByModel as Record<string, number>).reduce((a, b) => a + b, 0),
          byModel: d.tokensByModel ?? {},
        })
      )

      const modelUsage: ModelUsage[] = Object.entries(
        (raw.modelUsage ?? {}) as Record<
          string,
          {
            inputTokens: number
            outputTokens: number
            cacheReadInputTokens: number
            cacheCreationInputTokens: number
            costUSD: number
          }
        >
      ).map(([model, data]) => ({
        model,
        inputTokens: data.inputTokens ?? 0,
        outputTokens: data.outputTokens ?? 0,
        cacheReadTokens: data.cacheReadInputTokens ?? 0,
        cacheWriteTokens: data.cacheCreationInputTokens ?? 0,
        costUSD: data.costUSD ?? 0,
      }))

      const now = new Date()
      const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
      const todayEntry = dailyTokens.find((d) => d.date === today)
      const tokensToday = todayEntry?.total ?? 0

      const totalCost = modelUsage.reduce((a, m) => a + m.costUSD, 0)
      const totalTokens = modelUsage.reduce((a, m) => a + m.inputTokens + m.outputTokens, 0)

      // last 30 calendar days (not just last 30 entries)
      const cutoff = new Date(now)
      cutoff.setDate(cutoff.getDate() - 30)
      const cutoffStr = `${cutoff.getFullYear()}-${String(cutoff.getMonth() + 1).padStart(2, '0')}-${String(cutoff.getDate()).padStart(2, '0')}`
      const last30 = dailyTokens.filter((d) => d.date >= cutoffStr)
      const tokens30 = last30.reduce((a, d) => a + d.total, 0)

      return {
        dailyTokens,
        modelUsage,
        costToday: 0, // not available per-day in stats-cache
        tokensToday,
        costLast30Days: totalCost,
        tokensLast30Days: tokens30 || totalTokens,
      }
    }
  } catch {
    // ignore
  }
  return {
    dailyTokens: [],
    modelUsage: [],
    costToday: 0,
    tokensToday: 0,
    costLast30Days: 0,
    tokensLast30Days: 0,
  }
}

function makeDefaultWindow(label: string, windowMinutes: number): WindowUsage {
  return { usedPercent: 0, resetsAt: null, windowMinutes, label }
}

export async function readClaudeData(claudeDataPath: string): Promise<ClaudeData> {
  const statsData = readStatsCache(claudeDataPath)
  let session: WindowUsage = makeDefaultWindow('Session', 300)
  let weekly: WindowUsage = makeDefaultWindow('Weekly', 10080)
  let opus: WindowUsage | null = null
  let sonnet: WindowUsage | null = null
  let authStatus: ClaudeData['authStatus'] = 'no_token'
  let error: string | null = null

  try {
    const token = await getClaudeToken(claudeDataPath)
    if (!token) {
      authStatus = 'no_token'
      error = 'No Claude credentials found. Make sure Claude CLI is installed and logged in.'
    } else {
      const usage = await fetchLiveUsage(token)
      if (usage) {
        authStatus = 'ok'
        if (usage.five_hour) {
          session = {
            usedPercent: usage.five_hour.utilization ?? 0,
            resetsAt: usage.five_hour.resets_at ?? null,
            windowMinutes: 300,
            label: 'Session',
          }
        }
        if (usage.seven_day) {
          weekly = {
            usedPercent: usage.seven_day.utilization ?? 0,
            resetsAt: usage.seven_day.resets_at ?? null,
            windowMinutes: 10080,
            label: 'Weekly',
          }
        }
        if (usage.seven_day_sonnet) {
          sonnet = {
            usedPercent: usage.seven_day_sonnet.utilization ?? 0,
            resetsAt: usage.seven_day_sonnet.resets_at ?? null,
            windowMinutes: 10080,
            label: 'Sonnet',
          }
        }
        if (usage.seven_day_opus) {
          opus = {
            usedPercent: usage.seven_day_opus.utilization ?? 0,
            resetsAt: usage.seven_day_opus.resets_at ?? null,
            windowMinutes: 10080,
            label: 'Opus',
          }
        }
      } else {
        authStatus = 'error'
        error = 'Could not fetch live Claude usage data.'
      }
    }
  } catch (e) {
    authStatus = 'error'
    error = String(e)
  }

  return {
    session,
    weekly,
    opus,
    sonnet,
    costToday: statsData.costToday,
    tokensToday: statsData.tokensToday,
    costLast30Days: statsData.costLast30Days,
    tokensLast30Days: statsData.tokensLast30Days,
    dailyTokens: statsData.dailyTokens,
    modelBreakdown: statsData.modelUsage,
    lastUpdated: new Date().toISOString(),
    error,
    authStatus,
  }
}
