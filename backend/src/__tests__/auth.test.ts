import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createMockEnv } from './helpers'

describe('POST /api/auth/github', () => {
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

  it('returns GitHub OAuth client id config', async () => {
    const env = createMockEnv()
    const res = await app.request('/api/auth/github/config', {}, env)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.success).toBe(true)
    expect(body.data.clientId).toBe('test-client-id')
  })

  it('returns 400 when code is missing', async () => {
    const env = createMockEnv()
    const res = await app.request('/api/auth/github', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    }, env)
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.success).toBe(false)
    expect(body.error).toContain('code')
  })

  it('returns 401 when GitHub token exchange fails', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ error: 'bad_verification_code' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    )

    const env = createMockEnv()
    const res = await app.request('/api/auth/github', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code: 'invalid_code' }),
    }, env)
    expect(res.status).toBe(401)
    const body = await res.json()
    expect(body.success).toBe(false)
  })

  it('returns user info on successful auth', async () => {
    globalThis.fetch = vi.fn().mockImplementation((url: string | URL | Request) => {
      const urlStr = typeof url === 'string' ? url : url instanceof URL ? url.toString() : url.url
      if (urlStr.includes('github.com/login/oauth/access_token')) {
        return Promise.resolve(new Response(JSON.stringify({ access_token: 'gho_test123' }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }))
      }
      if (urlStr.includes('api.github.com/user')) {
        return Promise.resolve(new Response(JSON.stringify({
          id: 99,
          login: 'octocat',
          avatar_url: 'https://avatars.githubusercontent.com/u/99',
        }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }))
      }
      return Promise.resolve(new Response('Not found', { status: 404 }))
    })

    const env = createMockEnv({ runSuccess: true })
    const res = await app.request('/api/auth/github', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code: 'valid_code' }),
    }, env)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.success).toBe(true)
    expect(body.data.login).toBe('octocat')
    expect(body.data.avatarUrl).toBe('https://avatars.githubusercontent.com/u/99')
    expect(body.data.token).toBe('gho_test123')
  })
})
