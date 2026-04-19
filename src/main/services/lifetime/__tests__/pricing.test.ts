import { describe, it, expect } from 'vitest'
import { priceForModel, computeCost } from '../pricing'

describe('priceForModel', () => {
  it('maps claude opus variants to the opus price', () => {
    const p1 = priceForModel('claude', 'claude-opus-4-6')
    const p2 = priceForModel('claude', 'claude-opus-4-7-1m')
    expect(p1).toEqual(p2)
    expect(p1.outputPerMTok).toBe(75)
  })

  it('maps claude sonnet to the sonnet price', () => {
    expect(priceForModel('claude', 'claude-sonnet-4-6').outputPerMTok).toBe(15)
  })

  it('maps codex gpt-5.3-codex to gpt-5 family pricing', () => {
    expect(priceForModel('codex', 'gpt-5.3-codex').inputPerMTok).toBe(1.25)
  })

  it('falls back to sonnet-class pricing for unknown claude models', () => {
    const p = priceForModel('claude', 'claude-future-model-9')
    expect(p.inputPerMTok).toBe(3)
  })

  it('falls back to gpt-5-class pricing for unknown codex models', () => {
    const p = priceForModel('codex', 'some-new-o-series')
    expect(p.inputPerMTok).toBe(1.25)
  })
})

describe('computeCost', () => {
  it('sums per-million rates across token categories', () => {
    const price = priceForModel('claude', 'sonnet')
    const cost = computeCost(price, {
      inputTokens: 1_000_000,
      outputTokens: 1_000_000,
      cacheReadTokens: 1_000_000,
      cacheWriteTokens: 1_000_000,
    })
    // 3 + 15 + 0.3 + 3.75 = 22.05
    expect(cost).toBeCloseTo(22.05, 4)
  })

  it('returns 0 for zero tokens', () => {
    const price = priceForModel('claude', 'opus')
    expect(
      computeCost(price, {
        inputTokens: 0,
        outputTokens: 0,
        cacheReadTokens: 0,
        cacheWriteTokens: 0,
      })
    ).toBe(0)
  })
})
