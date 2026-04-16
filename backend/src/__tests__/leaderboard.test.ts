import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createMockD1, createMockEnv } from './helpers'

describe('GET /api/leaderboard', () => {
  let app: ReturnType<typeof import('../index').createApp>

  beforeEach(async () => {
    const mod = await import('../index')
    app = mod.createApp()
  })

  it('returns entries sorted by total_tokens DESC for period=today', async () => {
    const env = createMockEnv({
      allResults: [
        { github_login: 'alice', avatar_url: 'https://a.com/1', total_tokens: 5000, claude_tokens: 3000, codex_tokens: 2000 },
        { github_login: 'bob', avatar_url: 'https://a.com/2', total_tokens: 3000, claude_tokens: 2000, codex_tokens: 1000 },
      ],
    })

    const res = await app.request('/api/leaderboard?period=today', {}, env)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.success).toBe(true)
    expect(body.data.entries).toHaveLength(2)
    expect(body.data.entries[0].rank).toBe(1)
    expect(body.data.entries[0].githubLogin).toBe('alice')
    expect(body.data.entries[1].rank).toBe(2)
  })

  it('returns aggregated entries for period=alltime', async () => {
    const env = createMockEnv({
      allResults: [
        { github_login: 'carol', avatar_url: 'https://a.com/3', total_tokens: 99000, claude_tokens: 50000, codex_tokens: 49000 },
      ],
    })

    const res = await app.request('/api/leaderboard?period=alltime', {}, env)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.data.period).toBe('alltime')
    expect(body.data.entries).toHaveLength(1)
  })

  it('defaults to today when no period given', async () => {
    const env = createMockEnv({ allResults: [] })
    const res = await app.request('/api/leaderboard', {}, env)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.data.period).toBe('today')
  })

  it('returns 400 for invalid period', async () => {
    const env = createMockEnv()
    const res = await app.request('/api/leaderboard?period=invalid', {}, env)
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.success).toBe(false)
    expect(body.error).toContain('period')
  })

  it('returns empty entries for empty database', async () => {
    const env = createMockEnv({ allResults: [] })
    const res = await app.request('/api/leaderboard?period=today', {}, env)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.data.entries).toEqual([])
  })

  it('includes CORS headers', async () => {
    const env = createMockEnv({ allResults: [] })
    const res = await app.request('/api/leaderboard', {}, env)
    expect(res.headers.get('access-control-allow-origin')).toBeTruthy()
  })
})
