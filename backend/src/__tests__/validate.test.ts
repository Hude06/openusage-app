import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { validateSubmitPayload } from '../middleware/validate'

function makeValidPayload(overrides: Record<string, unknown> = {}) {
  return {
    date: new Date().toISOString().slice(0, 10),
    claudeTokens: 1000,
    codexTokens: 500,
    claudeCostUSD: 0.05,
    modelsUsed: { 'claude-sonnet-4-20250514': 1000 },
    ...overrides,
  }
}

describe('validateSubmitPayload', () => {
  it('accepts a valid payload', () => {
    const result = validateSubmitPayload(makeValidPayload())
    expect(result.valid).toBe(true)
    if (result.valid) {
      expect(result.data.claudeTokens).toBe(1000)
      expect(result.data.codexTokens).toBe(500)
    }
  })

  it('rejects missing date', () => {
    const { date, ...rest } = makeValidPayload()
    const result = validateSubmitPayload(rest)
    expect(result.valid).toBe(false)
    if (!result.valid) expect(result.error).toContain('date')
  })

  it('rejects date that is not today', () => {
    const result = validateSubmitPayload(makeValidPayload({ date: '2020-01-01' }))
    expect(result.valid).toBe(false)
    if (!result.valid) expect(result.error).toContain('today')
  })

  it('rejects future date', () => {
    const future = new Date(Date.now() + 86400000 * 2).toISOString().slice(0, 10)
    const result = validateSubmitPayload(makeValidPayload({ date: future }))
    expect(result.valid).toBe(false)
    if (!result.valid) expect(result.error).toContain('today')
  })

  it('rejects negative claudeTokens', () => {
    const result = validateSubmitPayload(makeValidPayload({ claudeTokens: -1 }))
    expect(result.valid).toBe(false)
    if (!result.valid) expect(result.error).toContain('claudeTokens')
  })

  it('rejects claudeTokens > 50_000_000_000', () => {
    const result = validateSubmitPayload(makeValidPayload({ claudeTokens: 50_000_000_001 }))
    expect(result.valid).toBe(false)
    if (!result.valid) expect(result.error).toContain('claudeTokens')
  })

  it('rejects negative codexTokens', () => {
    const result = validateSubmitPayload(makeValidPayload({ codexTokens: -1 }))
    expect(result.valid).toBe(false)
    if (!result.valid) expect(result.error).toContain('codexTokens')
  })

  it('rejects codexTokens > 50_000_000_000', () => {
    const result = validateSubmitPayload(makeValidPayload({ codexTokens: 50_000_000_001 }))
    expect(result.valid).toBe(false)
    if (!result.valid) expect(result.error).toContain('codexTokens')
  })

  it('rejects negative claudeCostUSD', () => {
    const result = validateSubmitPayload(makeValidPayload({ claudeCostUSD: -0.01 }))
    expect(result.valid).toBe(false)
    if (!result.valid) expect(result.error).toContain('claudeCostUSD')
  })

  it('rejects claudeCostUSD > 10_000', () => {
    const result = validateSubmitPayload(makeValidPayload({ claudeCostUSD: 10_001 }))
    expect(result.valid).toBe(false)
    if (!result.valid) expect(result.error).toContain('claudeCostUSD')
  })

  it('rejects null body', () => {
    const result = validateSubmitPayload(null)
    expect(result.valid).toBe(false)
    if (!result.valid) expect(result.error).toContain('body')
  })

  it('rejects non-object body', () => {
    const result = validateSubmitPayload('string')
    expect(result.valid).toBe(false)
    if (!result.valid) expect(result.error).toContain('body')
  })

  it('floors fractional token counts', () => {
    const result = validateSubmitPayload(makeValidPayload({ claudeTokens: 100.9, codexTokens: 50.7 }))
    expect(result.valid).toBe(true)
    if (result.valid) {
      expect(result.data.claudeTokens).toBe(100)
      expect(result.data.codexTokens).toBe(50)
    }
  })

  it('defaults modelsUsed to empty object when missing', () => {
    const payload = makeValidPayload()
    delete (payload as Record<string, unknown>).modelsUsed
    const result = validateSubmitPayload(payload)
    expect(result.valid).toBe(true)
    if (result.valid) {
      expect(result.data.modelsUsed).toEqual({})
    }
  })
})
