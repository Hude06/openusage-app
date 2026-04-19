import type { Provider } from '../../../shared/lifetime-types'

/**
 * Per-million-token rates in USD, matching public API pricing.
 * Subscribers on Max/Pro plans don't actually pay these — this is the
 * "retail equivalent" of their usage.
 * Source: anthropic.com/pricing, openai.com/api/pricing (captured April 2026).
 */
export interface ModelPricing {
  inputPerMTok: number
  outputPerMTok: number
  cacheReadPerMTok: number
  cacheWritePerMTok: number
}

const CLAUDE_PRICES: Record<string, ModelPricing> = {
  // Claude 4.x family
  'opus': { inputPerMTok: 15, outputPerMTok: 75, cacheReadPerMTok: 1.5, cacheWritePerMTok: 18.75 },
  'sonnet': { inputPerMTok: 3, outputPerMTok: 15, cacheReadPerMTok: 0.3, cacheWritePerMTok: 3.75 },
  'haiku': { inputPerMTok: 1, outputPerMTok: 5, cacheReadPerMTok: 0.1, cacheWritePerMTok: 1.25 },
}

const CODEX_PRICES: Record<string, ModelPricing> = {
  // OpenAI GPT-5 family (reasoning models; reasoning tokens billed as output)
  'gpt-5': { inputPerMTok: 1.25, outputPerMTok: 10, cacheReadPerMTok: 0.125, cacheWritePerMTok: 0 },
  'gpt-5-codex': { inputPerMTok: 1.25, outputPerMTok: 10, cacheReadPerMTok: 0.125, cacheWritePerMTok: 0 },
  'gpt-5.3-codex': { inputPerMTok: 1.25, outputPerMTok: 10, cacheReadPerMTok: 0.125, cacheWritePerMTok: 0 },
  'o1': { inputPerMTok: 15, outputPerMTok: 60, cacheReadPerMTok: 7.5, cacheWritePerMTok: 0 },
  'o3': { inputPerMTok: 2, outputPerMTok: 8, cacheReadPerMTok: 0.5, cacheWritePerMTok: 0 },
}

// Fallback if we can't match a model name — mid-range Sonnet-ish
const UNKNOWN_CLAUDE: ModelPricing = CLAUDE_PRICES.sonnet
const UNKNOWN_CODEX: ModelPricing = CODEX_PRICES['gpt-5']

export function priceForModel(provider: Provider, model: string | null): ModelPricing {
  const key = (model ?? '').toLowerCase()
  if (provider === 'claude') {
    if (key.includes('opus')) return CLAUDE_PRICES.opus
    if (key.includes('haiku')) return CLAUDE_PRICES.haiku
    if (key.includes('sonnet')) return CLAUDE_PRICES.sonnet
    return UNKNOWN_CLAUDE
  }
  // codex
  if (key.includes('gpt-5.3-codex')) return CODEX_PRICES['gpt-5.3-codex']
  if (key.includes('gpt-5-codex')) return CODEX_PRICES['gpt-5-codex']
  if (key.includes('gpt-5')) return CODEX_PRICES['gpt-5']
  if (key.startsWith('o1')) return CODEX_PRICES.o1
  if (key.startsWith('o3')) return CODEX_PRICES.o3
  return UNKNOWN_CODEX
}

export interface TokenBreakdown {
  inputTokens: number
  outputTokens: number
  cacheReadTokens: number
  cacheWriteTokens: number
}

export function computeCost(price: ModelPricing, t: TokenBreakdown): number {
  return (
    (t.inputTokens / 1_000_000) * price.inputPerMTok +
    (t.outputTokens / 1_000_000) * price.outputPerMTok +
    (t.cacheReadTokens / 1_000_000) * price.cacheReadPerMTok +
    (t.cacheWriteTokens / 1_000_000) * price.cacheWritePerMTok
  )
}
