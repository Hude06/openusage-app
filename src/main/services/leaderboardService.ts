import https from 'https'
import type { AllData, LeaderboardResponse } from '../../shared/types'

const API_HOSTNAME = 'api.opentokenusage.com'

interface AuthResult {
  userId: string
  login: string
  avatarUrl: string
  token: string
}

interface GithubOAuthConfig {
  clientId: string
}

function request<T>(
  options: https.RequestOptions,
  body?: string
): Promise<T> {
  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      let data = ''
      res.on('data', (chunk) => (data += chunk))
      res.on('end', () => {
        if (res.statusCode !== 200) {
          try {
            const parsed = JSON.parse(data)
            reject(new Error(parsed.error ?? `HTTP ${res.statusCode}`))
          } catch {
            reject(new Error(`HTTP ${res.statusCode}`))
          }
          return
        }
        try {
          const parsed = JSON.parse(data)
          if (parsed.success === false) {
            reject(new Error(parsed.error ?? 'Request failed'))
            return
          }
          resolve(parsed.data as T)
        } catch {
          reject(new Error('Invalid JSON response'))
        }
      })
    })
    req.on('error', (err) => reject(err))
    req.on('timeout', () => {
      req.destroy()
      reject(new Error('Request timeout'))
    })
    if (body) {
      req.end(body)
    } else {
      req.end()
    }
  })
}

export async function exchangeGithubCode(code: string): Promise<AuthResult> {
  return request<AuthResult>(
    {
      hostname: API_HOSTNAME,
      path: '/api/auth/github',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'OpenUsage/1.0',
      },
      timeout: 15000,
    },
    JSON.stringify({ code })
  )
}

export async function getGithubOAuthConfig(): Promise<GithubOAuthConfig> {
  return request<GithubOAuthConfig>({
    hostname: API_HOSTNAME,
    path: '/api/auth/github/config',
    method: 'GET',
    headers: {
      'User-Agent': 'OpenUsage/1.0',
    },
    timeout: 10000,
  })
}

export async function submitDailyUsage(
  githubToken: string,
  data: AllData
): Promise<void> {
  const today = new Date().toISOString().slice(0, 10)
  const claudeTokens = data.claude?.tokensToday ?? 0
  const codexTokens = data.codex?.creditsUsedToday ?? 0
  const claudeCostUSD = data.claude?.costToday ?? 0

  const modelsUsed: Record<string, number> = {}
  if (data.claude?.modelBreakdown) {
    for (const m of data.claude.modelBreakdown) {
      modelsUsed[m.model] = m.inputTokens + m.outputTokens
    }
  }

  const payload = {
    date: today,
    claudeTokens,
    codexTokens,
    claudeCostUSD,
    modelsUsed,
  }

  await request<void>(
    {
      hostname: API_HOSTNAME,
      path: '/api/submit',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${githubToken}`,
        'User-Agent': 'OpenUsage/1.0',
      },
      timeout: 15000,
    },
    JSON.stringify(payload)
  )
}

export async function getLeaderboard(
  period: string
): Promise<LeaderboardResponse> {
  return request<LeaderboardResponse>({
    hostname: API_HOSTNAME,
    path: `/api/leaderboard?period=${encodeURIComponent(period)}`,
    method: 'GET',
    headers: {
      'User-Agent': 'OpenUsage/1.0',
    },
    timeout: 10000,
  })
}
