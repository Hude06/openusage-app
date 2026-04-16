import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createMockEnv } from './helpers'

const MOCK_GITHUB_USER = {
  id: 12345,
  login: 'testuser',
  avatar_url: 'https://avatars.githubusercontent.com/u/12345',
}

function mockFetchGitHub(user: typeof MOCK_GITHUB_USER | null = MOCK_GITHUB_USER) {
  return vi.fn().mockImplementation((url: string) => {
    if (typeof url === 'string' && url.includes('api.github.com/user')) {
      if (!user) {
        return Promise.resolve(new Response('Unauthorized', { status: 401 }))
      }
      return Promise.resolve(new Response(JSON.stringify(user), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }))
    }
    return Promise.resolve(new Response('Not found', { status: 404 }))
  })
}

describe('POST /api/submit', () => {
  let app: ReturnType<typeof import('../index').createApp>
  const originalFetch = globalThis.fetch

  beforeEach(async () => {
    vi.resetModules()
    const mod = await import('../index')
    app = mod.createApp()
  })

  afterEach(() => {
    globalThis.fetch = originalFetch
  })

  it('returns 401 without Authorization header', async () => {
    const env = createMockEnv()
    const res = await app.request('/api/submit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        date: new Date().toISOString().slice(0, 10),
        claudeTokens: 100,
        codexTokens: 50,
        claudeCostUSD: 0.01,
        modelsUsed: {},
      }),
    }, env)
    expect(res.status).toBe(401)
    const body = await res.json()
    expect(body.success).toBe(false)
  })

  it('returns 200 for valid submission', async () => {
    globalThis.fetch = mockFetchGitHub()
    const env = createMockEnv({
      firstResult: { id: '12345', banned: 0 },
      runSuccess: true,
    })

    const res = await app.request('/api/submit', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ghp_testtoken123',
      },
      body: JSON.stringify({
        date: new Date().toISOString().slice(0, 10),
        claudeTokens: 1000,
        codexTokens: 500,
        claudeCostUSD: 0.05,
        modelsUsed: { 'claude-sonnet-4-20250514': 1000 },
      }),
    }, env)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.success).toBe(true)
  })

  it('returns 403 for banned user', async () => {
    globalThis.fetch = mockFetchGitHub()
    const env = createMockEnv({
      firstResult: { id: '12345', banned: 1 },
    })

    const res = await app.request('/api/submit', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ghp_testtoken123',
      },
      body: JSON.stringify({
        date: new Date().toISOString().slice(0, 10),
        claudeTokens: 100,
        codexTokens: 50,
        claudeCostUSD: 0.01,
        modelsUsed: {},
      }),
    }, env)
    expect(res.status).toBe(403)
    const body = await res.json()
    expect(body.success).toBe(false)
    expect(body.error).toContain('banned')
  })

  it('returns 422 for invalid payload', async () => {
    globalThis.fetch = mockFetchGitHub()
    const env = createMockEnv({
      firstResult: { id: '12345', banned: 0 },
    })

    const res = await app.request('/api/submit', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ghp_testtoken123',
      },
      body: JSON.stringify({
        date: '2020-01-01',
        claudeTokens: -1,
        codexTokens: 0,
        claudeCostUSD: 0,
        modelsUsed: {},
      }),
    }, env)
    expect(res.status).toBe(422)
    const body = await res.json()
    expect(body.success).toBe(false)
  })

  it('returns 401 when GitHub token is invalid', async () => {
    globalThis.fetch = mockFetchGitHub(null)
    const env = createMockEnv()

    const res = await app.request('/api/submit', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer invalid_token',
      },
      body: JSON.stringify({
        date: new Date().toISOString().slice(0, 10),
        claudeTokens: 100,
        codexTokens: 50,
        claudeCostUSD: 0.01,
        modelsUsed: {},
      }),
    }, env)
    expect(res.status).toBe(401)
  })
})
