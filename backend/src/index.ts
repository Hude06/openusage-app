import { Hono } from 'hono'
import { cors } from 'hono/cors'
import type { Env } from './types'
import authRoutes from './routes/auth'
import submitRoutes from './routes/submit'
import leaderboardRoutes from './routes/leaderboard'

export function createApp() {
  const app = new Hono<{ Bindings: Env }>()

  app.use('*', cors({
    origin: '*',
    allowMethods: ['GET', 'POST', 'OPTIONS'],
    allowHeaders: ['Content-Type', 'Authorization'],
  }))

  app.route('/api/auth', authRoutes)
  app.route('/api/submit', submitRoutes)
  app.route('/api/leaderboard', leaderboardRoutes)

  app.get('/health', (c) => c.json({ success: true, data: { status: 'ok' } }))

  return app
}

const app = createApp()

export default app
