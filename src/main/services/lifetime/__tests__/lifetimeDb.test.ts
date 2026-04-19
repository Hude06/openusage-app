import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import {
  openLifetimeDb,
  closeLifetimeDb,
  insertEvents,
  sumLifetime,
  countEvents,
  upsertCursor,
  getCursor,
  deleteCursor,
  getMeta,
  setMeta,
  getDailyBreakdown,
  getModelBreakdown,
} from '../lifetimeDb'
import type { TokenEvent } from '../../../../shared/lifetime-types'

function makeEvent(partial: Partial<TokenEvent>): TokenEvent {
  return {
    provider: 'claude',
    requestId: `req-${Math.random().toString(36).slice(2, 10)}`,
    sessionId: 'sess-1',
    model: 'claude-opus-4-6',
    tsMs: Date.parse('2026-04-10T09:00:00Z'),
    inputTokens: 10,
    outputTokens: 20,
    cacheReadTokens: 0,
    cacheWriteTokens: 0,
    reasoningTokens: 0,
    serviceTier: null,
    ...partial,
  }
}

beforeEach(() => {
  openLifetimeDb({ filePath: ':memory:' })
})

afterEach(() => {
  closeLifetimeDb()
})

describe('lifetimeDb', () => {
  it('inserts events and counts them', () => {
    const events = [
      makeEvent({ requestId: 'a' }),
      makeEvent({ requestId: 'b' }),
    ]
    const inserted = insertEvents(events)
    expect(inserted).toBe(2)
    expect(countEvents()).toBe(2)
  })

  it('dedups on (provider, request_id) via INSERT OR IGNORE', () => {
    insertEvents([makeEvent({ requestId: 'dup' })])
    const second = insertEvents([makeEvent({ requestId: 'dup', inputTokens: 999 })])
    expect(second).toBe(0)
    expect(countEvents()).toBe(1)
  })

  it('allows same requestId across different providers', () => {
    insertEvents([makeEvent({ provider: 'claude', requestId: 'x' })])
    insertEvents([makeEvent({ provider: 'codex', requestId: 'x' })])
    expect(countEvents()).toBe(2)
  })

  it('sums lifetime totals by provider, filtered by since', () => {
    const old = Date.parse('2026-01-01T00:00:00Z')
    const recent = Date.parse('2026-04-10T00:00:00Z')
    insertEvents([
      makeEvent({ provider: 'claude', requestId: 'c1', tsMs: recent, inputTokens: 100, outputTokens: 50 }),
      makeEvent({ provider: 'claude', requestId: 'c2', tsMs: old, inputTokens: 1000, outputTokens: 500 }),
      makeEvent({ provider: 'codex', requestId: 'x1', tsMs: recent, inputTokens: 40, outputTokens: 10 }),
    ])
    const since = Date.parse('2026-04-01T00:00:00Z')
    const summary = sumLifetime(since)
    expect(summary.claudeTokens).toBe(150)
    expect(summary.codexTokens).toBe(50)
  })

  it('includes cache tokens in lifetime totals', () => {
    insertEvents([
      makeEvent({ requestId: 'cache1', inputTokens: 5, outputTokens: 5, cacheReadTokens: 100, cacheWriteTokens: 50 }),
    ])
    const summary = sumLifetime(0)
    expect(summary.claudeTokens).toBe(160)
  })

  it('upserts and retrieves cursor rows', () => {
    const cursor = {
      path: '/tmp/a.jsonl',
      inode: 123,
      size: 4096,
      mtimeMs: Date.now(),
      lastOffset: 2048,
      lastScanMs: Date.now(),
    }
    upsertCursor(cursor)
    expect(getCursor(cursor.path)).toMatchObject({ inode: 123, size: 4096, lastOffset: 2048 })

    upsertCursor({ ...cursor, size: 8192, lastOffset: 4096 })
    expect(getCursor(cursor.path)).toMatchObject({ size: 8192, lastOffset: 4096 })

    deleteCursor(cursor.path)
    expect(getCursor(cursor.path)).toBeNull()
  })

  it('stores and reads meta keys', () => {
    setMeta('installedAt', '2026-04-18T00:00:00Z')
    expect(getMeta('installedAt')).toBe('2026-04-18T00:00:00Z')
    expect(getMeta('missing')).toBeNull()
  })

  it('schema_version is populated on open', () => {
    expect(getMeta('schema_version')).toBe('1')
  })

  it('daily breakdown groups by UTC date and provider', () => {
    const day1 = Date.parse('2026-04-10T12:00:00Z')
    const day2 = Date.parse('2026-04-11T12:00:00Z')
    insertEvents([
      makeEvent({ provider: 'claude', requestId: 'd1-c', tsMs: day1, inputTokens: 10, outputTokens: 10 }),
      makeEvent({ provider: 'codex', requestId: 'd1-x', tsMs: day1, inputTokens: 5, outputTokens: 5 }),
      makeEvent({ provider: 'claude', requestId: 'd2-c', tsMs: day2, inputTokens: 100, outputTokens: 0 }),
    ])
    const rows = getDailyBreakdown(0, Date.now())
    expect(rows).toHaveLength(2)
    const [r1, r2] = rows
    expect(r1.date).toBe('2026-04-10')
    expect(r1.claude).toBe(20)
    expect(r1.codex).toBe(10)
    expect(r2.date).toBe('2026-04-11')
    expect(r2.claude).toBe(100)
  })

  it('model breakdown sums by model + provider', () => {
    insertEvents([
      makeEvent({ model: 'claude-opus-4-6', requestId: 'm1', inputTokens: 100, outputTokens: 0 }),
      makeEvent({ model: 'claude-opus-4-6', requestId: 'm2', inputTokens: 50, outputTokens: 0 }),
      makeEvent({ model: 'claude-sonnet-4-6', requestId: 'm3', inputTokens: 30, outputTokens: 0 }),
    ])
    const rows = getModelBreakdown(0)
    expect(rows).toHaveLength(2)
    expect(rows[0]).toMatchObject({ model: 'claude-opus-4-6', tokens: 150 })
    expect(rows[1]).toMatchObject({ model: 'claude-sonnet-4-6', tokens: 30 })
  })
})
