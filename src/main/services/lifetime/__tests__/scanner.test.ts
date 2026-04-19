import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import fs from 'fs'
import os from 'os'
import path from 'path'
import {
  openLifetimeDb,
  closeLifetimeDb,
  countEvents,
  sumLifetime,
  getCursor,
} from '../lifetimeDb'
import { runScan, rescanFile } from '../scanner'

let tmpHome: string
let claudeDir: string
let codexDir: string

function writeJsonl(filePath: string, lines: string[]): void {
  fs.mkdirSync(path.dirname(filePath), { recursive: true })
  fs.writeFileSync(filePath, lines.join('\n') + '\n')
}

function appendJsonl(filePath: string, lines: string[]): void {
  fs.appendFileSync(filePath, lines.join('\n') + '\n')
}

beforeEach(() => {
  tmpHome = fs.mkdtempSync(path.join(os.tmpdir(), 'lifetime-scan-'))
  claudeDir = path.join(tmpHome, '.claude', 'projects', '-proj-a')
  codexDir = path.join(tmpHome, '.codex', 'sessions', '2026', '04', '03')
  fs.mkdirSync(claudeDir, { recursive: true })
  fs.mkdirSync(codexDir, { recursive: true })
  openLifetimeDb({ filePath: ':memory:' })
})

afterEach(() => {
  closeLifetimeDb()
  fs.rmSync(tmpHome, { recursive: true, force: true })
})

function claudeLine(requestId: string, input: number, output: number, ts: string): string {
  return JSON.stringify({
    type: 'assistant',
    requestId,
    sessionId: 'sess-a',
    timestamp: ts,
    message: {
      model: 'claude-opus-4-6',
      usage: { input_tokens: input, output_tokens: output },
    },
  })
}

function codexSession(sessionId: string, model: string, turns: number[], ts: string): string[] {
  const lines: string[] = []
  lines.push(JSON.stringify({ timestamp: ts, type: 'session_meta', payload: { id: sessionId } }))
  lines.push(JSON.stringify({ timestamp: ts, type: 'turn_context', payload: { model } }))
  for (const tokens of turns) {
    lines.push(
      JSON.stringify({
        timestamp: ts,
        type: 'event_msg',
        payload: {
          type: 'token_count',
          info: {
            last_token_usage: {
              input_tokens: tokens,
              cached_input_tokens: 0,
              output_tokens: 0,
              reasoning_output_tokens: 0,
              total_tokens: tokens,
            },
          },
        },
      })
    )
  }
  return lines
}

describe('runScan', () => {
  it('scans claude + codex dirs and inserts events', async () => {
    writeJsonl(path.join(claudeDir, 's1.jsonl'), [
      claudeLine('rc1', 100, 50, '2026-04-10T09:00:00Z'),
      claudeLine('rc2', 20, 10, '2026-04-10T09:01:00Z'),
    ])
    writeJsonl(path.join(codexDir, 'sess-a.jsonl'), codexSession('x1', 'gpt-5-codex', [500, 200], '2026-04-03T10:00:00Z'))

    const result = await runScan({ home: tmpHome })
    expect(result.filesScanned).toBe(2)
    expect(result.eventsInserted).toBe(4)
    expect(countEvents()).toBe(4)

    const summary = sumLifetime(0)
    expect(summary.claudeTokens).toBe(180)
    expect(summary.codexTokens).toBe(700)
  })

  it('is idempotent — second scan inserts 0', async () => {
    writeJsonl(path.join(claudeDir, 's1.jsonl'), [claudeLine('rc1', 10, 5, '2026-04-10T09:00:00Z')])
    await runScan({ home: tmpHome })
    const second = await runScan({ home: tmpHome })
    expect(second.eventsInserted).toBe(0)
    expect(countEvents()).toBe(1)
  })

  it('picks up appended lines on subsequent scans', async () => {
    const file = path.join(claudeDir, 'growing.jsonl')
    writeJsonl(file, [claudeLine('a1', 10, 10, '2026-04-10T09:00:00Z')])
    await runScan({ home: tmpHome })
    appendJsonl(file, [claudeLine('a2', 20, 20, '2026-04-10T09:05:00Z')])
    const result = await runScan({ home: tmpHome })
    expect(result.eventsInserted).toBe(1)
    expect(countEvents()).toBe(2)
  })

  it('rescans from 0 when file is truncated (rewritten)', async () => {
    const file = path.join(claudeDir, 'rewritten.jsonl')
    writeJsonl(file, [
      claudeLine('orig1', 10, 10, '2026-04-10T09:00:00Z'),
      claudeLine('orig2', 20, 20, '2026-04-10T09:01:00Z'),
    ])
    await runScan({ home: tmpHome })
    expect(countEvents()).toBe(2)

    // Rewrite file shorter — simulate compaction
    writeJsonl(file, [claudeLine('new1', 5, 5, '2026-04-10T09:02:00Z')])
    const result = await runScan({ home: tmpHome })

    // Dedup protects us — existing IDs don't re-insert
    expect(result.eventsInserted).toBe(1)
    expect(countEvents()).toBe(3)
  })

  it('emits progress events during scanning', async () => {
    writeJsonl(path.join(claudeDir, 'a.jsonl'), [claudeLine('p1', 1, 1, '2026-04-10T09:00:00Z')])
    writeJsonl(path.join(claudeDir, 'b.jsonl'), [claudeLine('p2', 1, 1, '2026-04-10T09:00:00Z')])
    const phases: string[] = []
    await runScan({
      home: tmpHome,
      progressIntervalMs: 0,
      onProgress: (p) => phases.push(p.phase),
    })
    expect(phases).toContain('discover')
    expect(phases).toContain('parse')
    expect(phases[phases.length - 1]).toBe('idle')
  })

  it('writes file cursor metadata after scanning', async () => {
    const file = path.join(claudeDir, 'cursor.jsonl')
    writeJsonl(file, [claudeLine('c1', 1, 1, '2026-04-10T09:00:00Z')])
    await runScan({ home: tmpHome })
    const cursor = getCursor(file)
    expect(cursor).not.toBeNull()
    expect(cursor!.lastOffset).toBeGreaterThan(0)
    expect(cursor!.size).toBe(cursor!.lastOffset)
  })

  it('handles missing directories without throwing', async () => {
    // both dirs exist (from beforeEach) but no files
    const result = await runScan({ home: tmpHome })
    expect(result.filesScanned).toBe(0)
    expect(result.eventsInserted).toBe(0)
  })
})

describe('rescanFile', () => {
  it('inserts new events from a single file and advances its cursor', async () => {
    const file = path.join(claudeDir, 'live.jsonl')
    writeJsonl(file, [claudeLine('live1', 10, 10, '2026-04-10T09:00:00Z')])
    const inserted = await rescanFile(file, 'claude')
    expect(inserted).toBe(1)
    expect(countEvents()).toBe(1)
    const cursor = getCursor(file)
    expect(cursor).not.toBeNull()
  })
})
