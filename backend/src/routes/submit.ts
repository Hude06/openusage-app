import { Hono } from 'hono'
import type { Env } from '../types'
import { validateSubmitPayload } from '../middleware/validate'

const submit = new Hono<{ Bindings: Env }>()

submit.post('/', async (c) => {
  const authHeader = c.req.header('Authorization')
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return c.json({ success: false, error: 'Authorization header required' }, 401)
  }

  const token = authHeader.slice(7)

  const userRes = await fetch('https://api.github.com/user', {
    headers: {
      'Authorization': `Bearer ${token}`,
      'User-Agent': 'OpenUsage-API',
    },
  })

  if (!userRes.ok) {
    return c.json({ success: false, error: 'Invalid GitHub token' }, 401)
  }

  const ghUser = await userRes.json<{ id: number; login: string; avatar_url: string }>()
  const userId = String(ghUser.id)

  // Upsert user
  await c.env.DB.prepare(
    `INSERT INTO users (id, github_login, avatar_url)
     VALUES (?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET github_login = excluded.github_login, avatar_url = excluded.avatar_url`
  ).bind(userId, ghUser.login, ghUser.avatar_url).run()

  // Check ban
  const user = await c.env.DB.prepare(
    'SELECT banned FROM users WHERE id = ?'
  ).bind(userId).first<{ banned: number }>()

  if (user?.banned) {
    return c.json({ success: false, error: 'User is banned' }, 403)
  }

  const body = await c.req.json().catch(() => null)
  const validation = validateSubmitPayload(body)

  if (!validation.valid) {
    return c.json({ success: false, error: validation.error }, 422)
  }

  const { data } = validation
  const totalTokens = data.claudeTokens + data.codexTokens

  await c.env.DB.prepare(
    `INSERT INTO daily_usage (user_id, date, claude_tokens, codex_tokens, total_tokens, claude_cost_usd, models_used)
     VALUES (?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(user_id, date) DO UPDATE SET
       claude_tokens = excluded.claude_tokens,
       codex_tokens = excluded.codex_tokens,
       total_tokens = excluded.total_tokens,
       claude_cost_usd = excluded.claude_cost_usd,
       models_used = excluded.models_used,
       submitted_at = datetime('now')`
  ).bind(
    userId,
    data.date,
    data.claudeTokens,
    data.codexTokens,
    totalTokens,
    data.claudeCostUSD,
    JSON.stringify(data.modelsUsed),
  ).run()

  return c.json({
    success: true,
    data: { totalTokens, date: data.date },
  })
})

export default submit
