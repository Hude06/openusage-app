import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// Mock https before importing the module
vi.mock('https', () => ({
  default: {
    request: vi.fn(),
  },
}))

import https from 'https'
import {
  exchangeGithubCode,
  submitDailyUsage,
  getLeaderboard,
} from '../leaderboardService'
import type { AllData } from '../../../shared/types'

const mockRequest = vi.mocked(https.request)

function setupMockRequest(statusCode: number, body: unknown) {
  const mockReq = {
    on: vi.fn(),
    end: vi.fn(),
    destroy: vi.fn(),
  }
  mockRequest.mockImplementation((_opts, callback) => {
    const mockRes = {
      statusCode,
      on: vi.fn((event: string, handler: (chunk?: string) => void) => {
        if (event === 'data') handler(JSON.stringify(body))
        if (event === 'end') handler()
      }),
    }
    if (callback) (callback as (res: typeof mockRes) => void)(mockRes)
    return mockReq as unknown as ReturnType<typeof https.request>
  })
  return mockReq
}

describe('leaderboardService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('exchangeGithubCode', () => {
    it('sends code to backend and returns user info', async () => {
      const responseData = {
        success: true,
        data: {
          userId: '12345',
          login: 'testuser',
          avatarUrl: 'https://avatars.githubusercontent.com/u/12345',
          token: 'gho_abc123',
        },
      }
      setupMockRequest(200, responseData)

      const result = await exchangeGithubCode('auth_code_xyz')

      expect(result).toEqual(responseData.data)
      expect(mockRequest).toHaveBeenCalledTimes(1)
      const callOpts = mockRequest.mock.calls[0][0] as unknown as { method: string; path: string }
      expect(callOpts.method).toBe('POST')
      expect(callOpts.path).toBe('/api/auth/github')
    })

    it('throws on non-200 response', async () => {
      setupMockRequest(401, { success: false, error: 'Invalid code' })

      await expect(exchangeGithubCode('bad_code')).rejects.toThrow()
    })

    it('throws on API error response', async () => {
      setupMockRequest(200, { success: false, error: 'Exchange failed' })

      await expect(exchangeGithubCode('bad_code')).rejects.toThrow('Exchange failed')
    })
  })

  describe('submitDailyUsage', () => {
    const mockData: AllData = {
      lifetime: null,
      claude: {
        session: { usedPercent: 50, resetsAt: null, windowMinutes: 300, label: 'Session' },
        weekly: { usedPercent: 20, resetsAt: null, windowMinutes: 10080, label: 'Weekly' },
        opus: null,
        sonnet: null,
        costToday: 4.50,
        tokensToday: 1_500_000,
        costLast30Days: 120,
        tokensLast30Days: 40_000_000,
        dailyTokens: [],
        modelBreakdown: [
          { model: 'opus', inputTokens: 500000, outputTokens: 200000, cacheReadTokens: 0, cacheWriteTokens: 0, costUSD: 3.0 },
          { model: 'sonnet', inputTokens: 300000, outputTokens: 100000, cacheReadTokens: 0, cacheWriteTokens: 0, costUSD: 1.5 },
        ],
        lastUpdated: new Date().toISOString(),
        error: null,
        authStatus: 'ok',
      },
      codex: {
        session: { usedPercent: 10, resetsAt: null, windowMinutes: 300, label: 'Session' },
        weekly: { usedPercent: 5, resetsAt: null, windowMinutes: 10080, label: 'Weekly' },
        creditsRemaining: 50,
        creditsUsedToday: 200_000,
        dailyCredits: [],
        recentThreads: [],
        lastUpdated: new Date().toISOString(),
        error: null,
        authStatus: 'ok',
      },
    }

    it('submits daily usage data to backend', async () => {
      setupMockRequest(200, { success: true })

      await submitDailyUsage('gho_token123', mockData)

      expect(mockRequest).toHaveBeenCalledTimes(1)
      const callOpts = mockRequest.mock.calls[0][0] as unknown as { method: string; path: string; headers: Record<string, string> }
      expect(callOpts.method).toBe('POST')
      expect(callOpts.path).toBe('/api/submit')
      expect(callOpts.headers['Authorization']).toBe('Bearer gho_token123')
    })

    it('extracts correct token counts from AllData', async () => {
      const mockReq = setupMockRequest(200, { success: true })
      let writtenBody = ''
      mockReq.end = vi.fn((data?: string) => { if (data) writtenBody = data }) as typeof mockReq.end

      await submitDailyUsage('gho_token123', mockData)

      const body = JSON.parse(writtenBody)
      expect(body.claudeTokens).toBe(1_500_000)
      expect(body.codexTokens).toBe(200_000)
      expect(body.claudeCostUSD).toBe(4.50)
      expect(body.modelsUsed).toEqual({ opus: 700000, sonnet: 400000 })
    })

    it('handles null claude data gracefully', async () => {
      setupMockRequest(200, { success: true })
      const dataWithNullClaude: AllData = { claude: null, codex: mockData.codex, lifetime: null }

      await submitDailyUsage('gho_token123', dataWithNullClaude)

      expect(mockRequest).toHaveBeenCalledTimes(1)
    })

    it('handles null codex data gracefully', async () => {
      setupMockRequest(200, { success: true })
      const dataWithNullCodex: AllData = { claude: mockData.claude, codex: null, lifetime: null }

      await submitDailyUsage('gho_token123', dataWithNullCodex)

      expect(mockRequest).toHaveBeenCalledTimes(1)
    })

    it('throws on non-200 response', async () => {
      setupMockRequest(429, { success: false, error: 'Rate limited' })

      await expect(submitDailyUsage('gho_token123', mockData)).rejects.toThrow()
    })
  })

  describe('getLeaderboard', () => {
    it('fetches leaderboard for today period', async () => {
      const responseData = {
        success: true,
        data: {
          period: 'today',
          entries: [
            { rank: 1, githubLogin: 'top_user', avatarUrl: 'https://example.com/1.png', totalTokens: 5_000_000_000, claudeTokens: 4_000_000_000, codexTokens: 1_000_000_000 },
          ],
          updatedAt: new Date().toISOString(),
        },
      }
      setupMockRequest(200, responseData)

      const result = await getLeaderboard('today')

      expect(result.period).toBe('today')
      expect(result.entries).toHaveLength(1)
      expect(result.entries[0].githubLogin).toBe('top_user')
      const callOpts = mockRequest.mock.calls[0][0] as unknown as { path: string }
      expect(callOpts.path).toBe('/api/leaderboard?period=today')
    })

    it('fetches leaderboard for alltime period', async () => {
      setupMockRequest(200, {
        success: true,
        data: { period: 'alltime', entries: [], updatedAt: new Date().toISOString() },
      })

      const result = await getLeaderboard('alltime')

      expect(result.period).toBe('alltime')
      const callOpts = mockRequest.mock.calls[0][0] as unknown as { path: string }
      expect(callOpts.path).toBe('/api/leaderboard?period=alltime')
    })

    it('throws on non-200 response', async () => {
      setupMockRequest(500, { success: false, error: 'Server error' })

      await expect(getLeaderboard('today')).rejects.toThrow()
    })
  })
})
