import { app } from 'electron'
import path from 'path'
import type { ScanCursor, TokenEvent } from '../../../shared/lifetime-types'

type SqliteDatabase = ReturnType<typeof import('better-sqlite3')>

let db: SqliteDatabase | null = null
let dbPath: string | null = null

const SCHEMA_VERSION = 1

const SCHEMA = `
  PRAGMA journal_mode = WAL;
  PRAGMA synchronous = NORMAL;
  PRAGMA temp_store = MEMORY;

  CREATE TABLE IF NOT EXISTS events (
    provider             TEXT NOT NULL,
    request_id           TEXT NOT NULL,
    session_id           TEXT,
    model                TEXT,
    ts_ms                INTEGER NOT NULL,
    input_tokens         INTEGER NOT NULL DEFAULT 0,
    output_tokens        INTEGER NOT NULL DEFAULT 0,
    cache_read_tokens    INTEGER NOT NULL DEFAULT 0,
    cache_write_tokens   INTEGER NOT NULL DEFAULT 0,
    reasoning_tokens     INTEGER NOT NULL DEFAULT 0,
    service_tier         TEXT,
    PRIMARY KEY (provider, request_id)
  );

  CREATE INDEX IF NOT EXISTS idx_events_ts       ON events(ts_ms);
  CREATE INDEX IF NOT EXISTS idx_events_prov_ts  ON events(provider, ts_ms);

  CREATE TABLE IF NOT EXISTS file_cursors (
    path          TEXT PRIMARY KEY,
    inode         INTEGER NOT NULL,
    size          INTEGER NOT NULL,
    mtime_ms      INTEGER NOT NULL,
    last_offset   INTEGER NOT NULL,
    last_scan_ms  INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS meta (
    key   TEXT PRIMARY KEY,
    value TEXT NOT NULL
  );
`

export interface OpenDbOptions {
  filePath?: string
}

export function openLifetimeDb(opts: OpenDbOptions = {}): SqliteDatabase {
  if (db) return db
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const Database = require('better-sqlite3')
  const resolvedPath =
    opts.filePath ?? path.join(app.getPath('userData'), 'lifetime.db')
  dbPath = resolvedPath
  db = new Database(resolvedPath)
  db!.exec(SCHEMA)
  db!
    .prepare('INSERT OR REPLACE INTO meta(key, value) VALUES (?, ?)')
    .run('schema_version', String(SCHEMA_VERSION))
  return db!
}

export function closeLifetimeDb() {
  if (db) {
    try {
      db.close()
    } catch {
      // ignore
    }
  }
  db = null
  dbPath = null
}

export function getDbPath(): string | null {
  return dbPath
}

function requireDb(): SqliteDatabase {
  if (!db) throw new Error('Lifetime DB not opened')
  return db
}

export function insertEvents(events: TokenEvent[]): number {
  if (!events.length) return 0
  const d = requireDb()
  const stmt = d.prepare(`
    INSERT OR IGNORE INTO events (
      provider, request_id, session_id, model, ts_ms,
      input_tokens, output_tokens, cache_read_tokens, cache_write_tokens,
      reasoning_tokens, service_tier
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `)
  const txn = d.transaction((rows: TokenEvent[]) => {
    let inserted = 0
    for (const e of rows) {
      const info = stmt.run(
        e.provider,
        e.requestId,
        e.sessionId,
        e.model,
        e.tsMs,
        e.inputTokens,
        e.outputTokens,
        e.cacheReadTokens,
        e.cacheWriteTokens,
        e.reasoningTokens,
        e.serviceTier
      )
      inserted += info.changes
    }
    return inserted
  })
  return txn(events)
}

export interface SumResult {
  claudeTokens: number
  codexTokens: number
}

export function sumLifetime(sinceMs: number): SumResult {
  const d = requireDb()
  const row = d
    .prepare(
      `
      SELECT
        COALESCE(SUM(CASE WHEN provider='claude' THEN input_tokens + output_tokens + cache_read_tokens + cache_write_tokens ELSE 0 END), 0) AS claude,
        COALESCE(SUM(CASE WHEN provider='codex'  THEN input_tokens + output_tokens + cache_read_tokens + cache_write_tokens ELSE 0 END), 0) AS codex
      FROM events
      WHERE ts_ms >= ?
    `
    )
    .get(sinceMs) as { claude: number; codex: number }
  return { claudeTokens: Number(row.claude), codexTokens: Number(row.codex) }
}

export function countEvents(): number {
  const d = requireDb()
  const row = d.prepare('SELECT COUNT(*) AS c FROM events').get() as { c: number }
  return Number(row.c)
}

export function upsertCursor(cursor: ScanCursor): void {
  const d = requireDb()
  d.prepare(
    `
    INSERT INTO file_cursors (path, inode, size, mtime_ms, last_offset, last_scan_ms)
    VALUES (?, ?, ?, ?, ?, ?)
    ON CONFLICT(path) DO UPDATE SET
      inode=excluded.inode,
      size=excluded.size,
      mtime_ms=excluded.mtime_ms,
      last_offset=excluded.last_offset,
      last_scan_ms=excluded.last_scan_ms
  `
  ).run(
    cursor.path,
    cursor.inode,
    cursor.size,
    cursor.mtimeMs,
    cursor.lastOffset,
    cursor.lastScanMs
  )
}

export function getCursor(filePath: string): ScanCursor | null {
  const d = requireDb()
  const row = d
    .prepare('SELECT * FROM file_cursors WHERE path = ?')
    .get(filePath) as
    | {
        path: string
        inode: number
        size: number
        mtime_ms: number
        last_offset: number
        last_scan_ms: number
      }
    | undefined
  if (!row) return null
  return {
    path: row.path,
    inode: row.inode,
    size: row.size,
    mtimeMs: row.mtime_ms,
    lastOffset: row.last_offset,
    lastScanMs: row.last_scan_ms,
  }
}

export function deleteCursor(filePath: string): void {
  const d = requireDb()
  d.prepare('DELETE FROM file_cursors WHERE path = ?').run(filePath)
}

export function getMeta(key: string): string | null {
  const d = requireDb()
  const row = d.prepare('SELECT value FROM meta WHERE key = ?').get(key) as
    | { value: string }
    | undefined
  return row?.value ?? null
}

export function setMeta(key: string, value: string): void {
  const d = requireDb()
  d.prepare('INSERT OR REPLACE INTO meta(key, value) VALUES (?, ?)').run(key, value)
}

export interface DailyBreakdownRow {
  date: string
  claude: number
  codex: number
}

export function getDailyBreakdown(
  startMs: number,
  endMs: number
): DailyBreakdownRow[] {
  const d = requireDb()
  const rows = d
    .prepare(
      `
      SELECT
        strftime('%Y-%m-%d', ts_ms/1000, 'unixepoch') AS date,
        provider,
        SUM(input_tokens + output_tokens + cache_read_tokens + cache_write_tokens) AS tokens
      FROM events
      WHERE ts_ms BETWEEN ? AND ?
      GROUP BY date, provider
      ORDER BY date ASC
    `
    )
    .all(startMs, endMs) as { date: string; provider: string; tokens: number }[]

  const byDate = new Map<string, DailyBreakdownRow>()
  for (const r of rows) {
    const entry = byDate.get(r.date) ?? { date: r.date, claude: 0, codex: 0 }
    if (r.provider === 'claude') entry.claude = Number(r.tokens)
    else if (r.provider === 'codex') entry.codex = Number(r.tokens)
    byDate.set(r.date, entry)
  }
  return [...byDate.values()]
}

export interface ModelBreakdownRow {
  model: string
  provider: 'claude' | 'codex'
  tokens: number
}

export interface ModelTokenRow {
  provider: 'claude' | 'codex'
  model: string
  inputTokens: number
  outputTokens: number
  cacheReadTokens: number
  cacheWriteTokens: number
}

export function getTokensByModel(sinceMs: number): ModelTokenRow[] {
  const d = requireDb()
  const rows = d
    .prepare(
      `
      SELECT
        provider,
        COALESCE(model, 'unknown') AS model,
        SUM(input_tokens)       AS input_tokens,
        SUM(output_tokens)      AS output_tokens,
        SUM(cache_read_tokens)  AS cache_read_tokens,
        SUM(cache_write_tokens) AS cache_write_tokens
      FROM events
      WHERE ts_ms >= ?
      GROUP BY provider, model
    `
    )
    .all(sinceMs) as {
      provider: string
      model: string
      input_tokens: number
      output_tokens: number
      cache_read_tokens: number
      cache_write_tokens: number
    }[]
  return rows.map((r) => ({
    provider: r.provider as 'claude' | 'codex',
    model: r.model,
    inputTokens: Number(r.input_tokens),
    outputTokens: Number(r.output_tokens),
    cacheReadTokens: Number(r.cache_read_tokens),
    cacheWriteTokens: Number(r.cache_write_tokens),
  }))
}

export function getModelBreakdown(sinceMs: number): ModelBreakdownRow[] {
  const d = requireDb()
  const rows = d
    .prepare(
      `
      SELECT
        COALESCE(model, 'unknown') AS model,
        provider,
        SUM(input_tokens + output_tokens + cache_read_tokens + cache_write_tokens) AS tokens
      FROM events
      WHERE ts_ms >= ?
      GROUP BY model, provider
      ORDER BY tokens DESC
    `
    )
    .all(sinceMs) as { model: string; provider: string; tokens: number }[]
  return rows.map((r) => ({
    model: r.model,
    provider: r.provider as 'claude' | 'codex',
    tokens: Number(r.tokens),
  }))
}
