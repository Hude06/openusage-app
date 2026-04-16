export async function checkSubmitRateLimit(db: D1Database, userId: string): Promise<boolean> {
  const today = new Date().toISOString().slice(0, 10)
  const result = await db.prepare(
    'SELECT COUNT(*) as count FROM daily_usage WHERE user_id = ? AND date = ?'
  ).bind(userId, today).first<{ count: number }>()

  return (result?.count ?? 0) < 48
}
