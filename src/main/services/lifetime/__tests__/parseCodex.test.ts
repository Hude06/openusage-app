import { describe, it, expect } from 'vitest'
import fs from 'fs'
import path from 'path'
import { parseCodexJsonl, createCodexLineParser } from '../parseCodex'

const fixturesDir = path.join(__dirname, 'fixtures')

function readFixture(name: string): string {
  return fs.readFileSync(path.join(fixturesDir, name), 'utf8')
}

describe('parseCodexJsonl', () => {
  it('emits one event per non-empty token_count payload', () => {
    const text = readFixture('codex-basic.jsonl')
    const events = parseCodexJsonl(text)
    expect(events).toHaveLength(2)
  })

  it('sums per-turn deltas to the cumulative total (excluding reasoning)', () => {
    const text = readFixture('codex-basic.jsonl')
    const events = parseCodexJsonl(text)
    const totalEmitted =
      events[0].inputTokens + events[0].cacheReadTokens + events[0].outputTokens +
      events[1].inputTokens + events[1].cacheReadTokens + events[1].outputTokens
    // Codex reports total_tokens = input + output, reasoning is a subset of output
    expect(totalEmitted).toBe(28471)
  })

  it('splits cached input from raw input tokens', () => {
    const text = readFixture('codex-basic.jsonl')
    const [first] = parseCodexJsonl(text)
    expect(first.cacheReadTokens).toBe(9600)
    expect(first.inputTokens).toBe(2180) // 11780 - 9600 (uncached)
    expect(first.outputTokens).toBe(1021)
    expect(first.reasoningTokens).toBe(820)
  })

  it('carries session id and model forward', () => {
    const text = readFixture('codex-basic.jsonl')
    const events = parseCodexJsonl(text)
    expect(events[0].sessionId).toBe('sess-001')
    expect(events[0].model).toBe('gpt-5.3-codex')
  })

  it('handles legacy sessions missing turn_context', () => {
    const text = readFixture('codex-legacy.jsonl')
    const events = parseCodexJsonl(text)
    expect(events).toHaveLength(1)
    expect(events[0].sessionId).toBe('sess-legacy')
    expect(events[0].model).toBeNull()
  })

  it('generates unique requestIds per event in a session', () => {
    const text = readFixture('codex-basic.jsonl')
    const events = parseCodexJsonl(text)
    const ids = new Set(events.map((e) => e.requestId))
    expect(ids.size).toBe(events.length)
    expect(events[0].requestId).toBe('sess-001:1')
    expect(events[1].requestId).toBe('sess-001:2')
  })

  it('skips token_count with info=null', () => {
    const line = '{"type":"event_msg","payload":{"type":"token_count","info":null}}'
    const parser = createCodexLineParser()
    expect(parser.parseLine(line)).toBeNull()
  })

  it('skips malformed JSON', () => {
    const events = parseCodexJsonl('{broken\n{"type":"session_meta","payload":{"id":"s"}}')
    expect(events).toHaveLength(0)
  })
})
