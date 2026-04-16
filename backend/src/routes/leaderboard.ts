import { Hono } from 'hono'
import type { Env, LeaderboardEntry } from '../types'

const VALID_PERIODS = ['today', 'alltime'] as const
type Period = typeof VALID_PERIODS[number]

const leaderboard = new Hono<{ Bindings: Env }>()

leaderboard.get('/', async (c) => {
  const period = (c.req.query('period') || 'today') as string

  if (!VALID_PERIODS.includes(period as Period)) {
    return c.json({
      success: false,
      error: `Invalid period. Must be one of: ${VALID_PERIODS.join(', ')}`,
    }, 400)
  }

  const today = new Date().toISOString().slice(0, 10)

  let query: string
  let bindings: string[]

  if (period === 'today') {
    query = `
      SELECT u.github_login, u.avatar_url,
             d.total_tokens, d.claude_tokens, d.codex_tokens
      FROM daily_usage d
      JOIN users u ON u.id = d.user_id
      WHERE d.date = ?
      ORDER BY d.total_tokens DESC
      LIMIT 100
    `
    bindings = [today]
  } else {
    query = `
      SELECT u.github_login, u.avatar_url,
             SUM(d.total_tokens) as total_tokens,
             SUM(d.claude_tokens) as claude_tokens,
             SUM(d.codex_tokens) as codex_tokens
      FROM daily_usage d
      JOIN users u ON u.id = d.user_id
      GROUP BY d.user_id
      ORDER BY total_tokens DESC
      LIMIT 100
    `
    bindings = []
  }

  const stmt = bindings.length > 0
    ? c.env.DB.prepare(query).bind(...bindings)
    : c.env.DB.prepare(query)

  const result = await stmt.all<{
    github_login: string
    avatar_url: string
    total_tokens: number
    claude_tokens: number
    codex_tokens: number
  }>()

  const entries: LeaderboardEntry[] = (result.results ?? []).map((row, i) => ({
    rank: i + 1,
    githubLogin: row.github_login,
    avatarUrl: row.avatar_url,
    totalTokens: row.total_tokens,
    claudeTokens: row.claude_tokens,
    codexTokens: row.codex_tokens,
  }))

  return c.json({
    success: true,
    data: {
      period,
      entries,
      updatedAt: new Date().toISOString(),
    },
  })
})

export default leaderboard
