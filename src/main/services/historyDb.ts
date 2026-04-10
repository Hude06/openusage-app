import { app } from 'electron'
import path from 'path'
import type { HistoryPoint } from '../../shared/types'

let db: ReturnType<typeof import('better-sqlite3')> | null = null

function getDb() {
  if (db) return db
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const Database = require('better-sqlite3')
  const dbPath = path.join(app.getPath('userData'), 'history.db')
  db = new Database(dbPath)
  db!.exec(`
    CREATE TABLE IF NOT EXISTS snapshots (
      id           INTEGER PRIMARY KEY AUTOINCREMENT,
      provider     TEXT NOT NULL,
      window_name  TEXT NOT NULL,
      sampled_at   INTEGER NOT NULL,
      used_percent REAL NOT NULL,
      resets_at    INTEGER
    );
    CREATE INDEX IF NOT EXISTS idx_snapshots
      ON snapshots(provider, window_name, sampled_at);
  `)
  return db!
}

export function writeSnapshot(
  provider: 'claude' | 'codex',
  windowName: string,
  usedPercent: number,
  resetsAt: string | null
) {
  try {
    const d = getDb()
    const resetsAtMs = resetsAt ? new Date(resetsAt).getTime() : null
    d.prepare(
      'INSERT INTO snapshots (provider, window_name, sampled_at, used_percent, resets_at) VALUES (?, ?, ?, ?, ?)'
    ).run(provider, windowName, Date.now(), usedPercent, resetsAtMs)
    // Prune old data (keep 30 days)
    const cutoff = Date.now() - 30 * 24 * 60 * 60 * 1000
    d.prepare('DELETE FROM snapshots WHERE sampled_at < ?').run(cutoff)
  } catch {
    // DB not critical — don't crash
  }
}

export function getRange(
  provider: 'claude' | 'codex',
  windowName: string,
  startMs: number,
  endMs: number
): HistoryPoint[] {
  try {
    const d = getDb()
    const rows = d
      .prepare(
        'SELECT sampled_at, used_percent FROM snapshots WHERE provider=? AND window_name=? AND sampled_at BETWEEN ? AND ? ORDER BY sampled_at ASC'
      )
      .all(provider, windowName, startMs, endMs) as { sampled_at: number; used_percent: number }[]
    return rows.map((r) => ({ sampledAt: r.sampled_at, usedPercent: r.used_percent }))
  } catch {
    return []
  }
}
