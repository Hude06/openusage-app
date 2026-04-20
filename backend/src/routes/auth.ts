import { Hono } from 'hono'
import type { Env } from '../types'

const auth = new Hono<{ Bindings: Env }>()

auth.get('/github/config', async (c) => {
  if (!c.env.GITHUB_CLIENT_ID) {
    return c.json({ success: false, error: 'GitHub OAuth is not configured' }, 500)
  }

  return c.json({
    success: true,
    data: {
      clientId: c.env.GITHUB_CLIENT_ID,
    },
  })
})

auth.post('/github', async (c) => {
  const body = await c.req.json<{ code?: string }>().catch(() => ({}))

  if (!body.code) {
    return c.json({ success: false, error: 'code is required' }, 400)
  }

  const tokenRes = await fetch('https://github.com/login/oauth/access_token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    },
    body: JSON.stringify({
      client_id: c.env.GITHUB_CLIENT_ID,
      client_secret: c.env.GITHUB_CLIENT_SECRET,
      code: body.code,
    }),
  })

  const tokenData = await tokenRes.json<{ access_token?: string; error?: string }>()

  if (!tokenData.access_token) {
    return c.json({ success: false, error: 'GitHub authentication failed' }, 401)
  }

  const userRes = await fetch('https://api.github.com/user', {
    headers: {
      'Authorization': `Bearer ${tokenData.access_token}`,
      'User-Agent': 'OpenUsage-API',
    },
  })

  if (!userRes.ok) {
    return c.json({ success: false, error: 'Failed to fetch GitHub profile' }, 401)
  }

  const user = await userRes.json<{ id: number; login: string; avatar_url: string }>()

  await c.env.DB.prepare(
    `INSERT INTO users (id, github_login, avatar_url)
     VALUES (?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET github_login = excluded.github_login, avatar_url = excluded.avatar_url`
  ).bind(String(user.id), user.login, user.avatar_url).run()

  return c.json({
    success: true,
    data: {
      userId: String(user.id),
      login: user.login,
      avatarUrl: user.avatar_url,
      token: tokenData.access_token,
    },
  })
})

export default auth
