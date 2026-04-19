import { describe, it, expect } from 'vitest'
import fs from 'fs'
import path from 'path'
import { parseClaudeJsonl, parseClaudeLine } from '../parseClaude'

const fixturesDir = path.join(__dirname, 'fixtures')

function readFixture(name: string): string {
  return fs.readFileSync(path.join(fixturesDir, name), 'utf8')
}

describe('parseClaudeJsonl', () => {
  it('emits events only for assistant lines with usage', () => {
    const text = readFixture('claude-basic.jsonl')
    const events = parseClaudeJsonl(text)
    expect(events).toHaveLength(2)
    expect(events.every((e) => e.provider === 'claude')).toBe(true)
  })

  it('extracts token fields correctly', () => {
    const text = readFixture('claude-basic.jsonl')
    const events = parseClaudeJsonl(text)
    const first = events[0]
    expect(first.requestId).toBe('req_claude_001')
    expect(first.inputTokens).toBe(100)
    expect(first.outputTokens).toBe(50)
    expect(first.cacheReadTokens).toBe(1000)
    expect(first.cacheWriteTokens).toBe(500)
    expect(first.model).toBe('claude-opus-4-6')
    expect(first.sessionId).toBe('session-a')
    expect(first.serviceTier).toBe('standard')
  })

  it('skips malformed JSON lines without throwing', () => {
    const text = '{"type":"assistant","broken":\n{"type":"assistant","requestId":"req_ok","timestamp":"2026-04-10T09:00:00Z","message":{"usage":{"input_tokens":1,"output_tokens":1}}}'
    const events = parseClaudeJsonl(text)
    expect(events).toHaveLength(1)
    expect(events[0].requestId).toBe('req_ok')
  })

  it('skips zero-token events', () => {
    const line = '{"type":"assistant","requestId":"r1","timestamp":"2026-04-10T09:00:00Z","message":{"usage":{"input_tokens":0,"output_tokens":0}}}'
    const events = parseClaudeJsonl(line)
    expect(events).toHaveLength(0)
  })

  it('handles empty lines and whitespace', () => {
    const text = '\n\n   \n\n'
    const events = parseClaudeJsonl(text)
    expect(events).toHaveLength(0)
  })

  it('parses an ISO timestamp into ms', () => {
    const line = '{"type":"assistant","requestId":"r1","timestamp":"2026-04-10T09:00:05.000Z","message":{"usage":{"input_tokens":1,"output_tokens":1}}}'
    const event = parseClaudeLine(line)
    expect(event?.tsMs).toBe(Date.parse('2026-04-10T09:00:05.000Z'))
  })

  it('rejects lines without requestId', () => {
    const line = '{"type":"assistant","timestamp":"2026-04-10T09:00:00Z","message":{"usage":{"input_tokens":1,"output_tokens":1}}}'
    expect(parseClaudeLine(line)).toBeNull()
  })
})
