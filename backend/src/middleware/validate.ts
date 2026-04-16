import type { SubmitPayload } from '../types'

const MAX_TOKENS = 50_000_000_000
const MAX_COST = 10_000

export function validateSubmitPayload(body: unknown): { valid: true; data: SubmitPayload } | { valid: false; error: string } {
  if (!body || typeof body !== 'object') {
    return { valid: false, error: 'Request body is required' }
  }

  const b = body as Record<string, unknown>

  if (typeof b.date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(b.date)) {
    return { valid: false, error: 'date must be YYYY-MM-DD format' }
  }

  const today = new Date().toISOString().slice(0, 10)
  if (b.date !== today) {
    return { valid: false, error: 'date must be today' }
  }

  if (typeof b.claudeTokens !== 'number' || b.claudeTokens < 0 || b.claudeTokens > MAX_TOKENS) {
    return { valid: false, error: `claudeTokens must be 0-${MAX_TOKENS}` }
  }

  if (typeof b.codexTokens !== 'number' || b.codexTokens < 0 || b.codexTokens > MAX_TOKENS) {
    return { valid: false, error: `codexTokens must be 0-${MAX_TOKENS}` }
  }

  if (typeof b.claudeCostUSD !== 'number' || b.claudeCostUSD < 0 || b.claudeCostUSD > MAX_COST) {
    return { valid: false, error: `claudeCostUSD must be 0-${MAX_COST}` }
  }

  return {
    valid: true,
    data: {
      date: b.date,
      claudeTokens: Math.floor(b.claudeTokens),
      codexTokens: Math.floor(b.codexTokens),
      claudeCostUSD: b.claudeCostUSD,
      modelsUsed: (b.modelsUsed && typeof b.modelsUsed === 'object')
        ? b.modelsUsed as Record<string, number>
        : {},
    },
  }
}
