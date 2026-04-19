import fs from 'fs'
import readline from 'readline'
import type {
  LifetimeScanProgress,
  Provider,
  TokenEvent,
} from '../../../shared/lifetime-types'
import { parseClaudeLine } from './parseClaude'
import { createCodexLineParser } from './parseCodex'
import {
  deleteCursor,
  getCursor,
  insertEvents,
  setMeta,
  upsertCursor,
} from './lifetimeDb'
import { resolveLifetimePaths, walkJsonl } from './paths'

export type ProgressListener = (progress: LifetimeScanProgress) => void

export interface ScanOptions {
  home?: string
  onProgress?: ProgressListener
  progressIntervalMs?: number
  batchSize?: number
}

export interface ScanResult {
  filesScanned: number
  filesChanged: number
  eventsInserted: number
  bytesRead: number
  durationMs: number
}

interface FileStat {
  path: string
  inode: number
  size: number
  mtimeMs: number
}

interface FilePlan {
  stat: FileStat
  provider: Provider
  startOffset: number
  reason: 'new' | 'append' | 'rewritten' | 'unchanged'
}

function statOrNull(filePath: string): FileStat | null {
  try {
    const s = fs.statSync(filePath)
    return {
      path: filePath,
      inode: s.ino,
      size: s.size,
      mtimeMs: s.mtimeMs,
    }
  } catch {
    return null
  }
}

function planFile(stat: FileStat, provider: Provider): FilePlan {
  const cursor = getCursor(stat.path)
  if (!cursor) return { stat, provider, startOffset: 0, reason: 'new' }

  const truncated = stat.size < cursor.size
  const inodeChanged = cursor.inode !== 0 && stat.inode !== cursor.inode
  const mtimeBackward = stat.mtimeMs < cursor.mtimeMs - 1000

  if (truncated || inodeChanged || mtimeBackward) {
    deleteCursor(stat.path)
    return { stat, provider, startOffset: 0, reason: 'rewritten' }
  }
  if (stat.size === cursor.size && stat.mtimeMs <= cursor.mtimeMs) {
    return { stat, provider, startOffset: cursor.lastOffset, reason: 'unchanged' }
  }
  return { stat, provider, startOffset: cursor.lastOffset, reason: 'append' }
}

async function readFileIncremental(
  plan: FilePlan,
  sink: (events: TokenEvent[]) => void,
  batchSize: number
): Promise<{ bytesRead: number; eventsInserted: number; finalOffset: number }> {
  const { stat, provider, startOffset } = plan
  if (startOffset >= stat.size) {
    return { bytesRead: 0, eventsInserted: 0, finalOffset: startOffset }
  }

  const stream = fs.createReadStream(stat.path, {
    start: startOffset,
    end: stat.size - 1,
    encoding: 'utf8',
  })
  const rl = readline.createInterface({ input: stream, crlfDelay: Infinity })

  let bytesRead = 0
  let eventsInserted = 0
  let buffer: TokenEvent[] = []
  const codexParser = provider === 'codex' ? createCodexLineParser() : null

  const flush = () => {
    if (!buffer.length) return
    eventsInserted += insertEvents(buffer)
    sink(buffer)
    buffer = []
  }

  for await (const line of rl) {
    bytesRead += Buffer.byteLength(line, 'utf8') + 1
    let event: TokenEvent | null = null
    if (provider === 'claude') {
      event = parseClaudeLine(line)
    } else if (codexParser) {
      event = codexParser.parseLine(line)
    }
    if (event) {
      buffer.push(event)
      if (buffer.length >= batchSize) flush()
    }
  }
  flush()

  return {
    bytesRead,
    eventsInserted,
    finalOffset: Math.min(startOffset + bytesRead, stat.size),
  }
}

function progressSnapshot(
  phase: LifetimeScanProgress['phase'],
  filesTotal: number,
  filesDone: number,
  eventsInserted: number,
  bytesRead: number,
  startedAt: number
): LifetimeScanProgress {
  return { phase, filesTotal, filesDone, eventsInserted, bytesRead, startedAt }
}

/**
 * Full incremental scan: walks all known log directories, advances cursors,
 * inserts new events. Safe to call repeatedly; dedup + cursors make it cheap.
 */
export async function runScan(opts: ScanOptions = {}): Promise<ScanResult> {
  const { home, onProgress } = opts
  const batchSize = opts.batchSize ?? 500
  const progressIntervalMs = opts.progressIntervalMs ?? 500
  const startedAt = Date.now()
  const paths = resolveLifetimePaths(home)

  const claudeFiles = paths.claudeProjectsDirs.flatMap((d) => walkJsonl(d))
  const codexFiles = walkJsonl(paths.codexSessionsDir)

  const plans: FilePlan[] = []
  for (const fp of claudeFiles) {
    const stat = statOrNull(fp)
    if (stat) plans.push(planFile(stat, 'claude'))
  }
  for (const fp of codexFiles) {
    const stat = statOrNull(fp)
    if (stat) plans.push(planFile(stat, 'codex'))
  }

  const filesTotal = plans.length
  let filesDone = 0
  let filesChanged = 0
  let totalBytes = 0
  let totalEvents = 0
  let lastProgress = 0

  const emit = (phase: LifetimeScanProgress['phase']) => {
    if (!onProgress) return
    const now = Date.now()
    if (phase !== 'idle' && now - lastProgress < progressIntervalMs) return
    lastProgress = now
    onProgress(
      progressSnapshot(phase, filesTotal, filesDone, totalEvents, totalBytes, startedAt)
    )
  }

  emit('discover')

  for (const plan of plans) {
    if (plan.reason !== 'unchanged') {
      filesChanged += 1
      const { bytesRead, eventsInserted, finalOffset } = await readFileIncremental(
        plan,
        () => {},
        batchSize
      )
      totalBytes += bytesRead
      totalEvents += eventsInserted
      upsertCursor({
        path: plan.stat.path,
        inode: plan.stat.inode,
        size: plan.stat.size,
        mtimeMs: plan.stat.mtimeMs,
        lastOffset: finalOffset,
        lastScanMs: Date.now(),
      })
    }
    filesDone += 1
    emit('parse')
  }

  setMeta('last_full_scan_ms', String(Date.now()))
  emit('idle')

  return {
    filesScanned: filesTotal,
    filesChanged,
    eventsInserted: totalEvents,
    bytesRead: totalBytes,
    durationMs: Date.now() - startedAt,
  }
}

/**
 * Incremental rescan of a single file — used by the watcher on add/change events.
 */
export async function rescanFile(
  filePath: string,
  provider: Provider,
  batchSize = 500
): Promise<number> {
  const stat = statOrNull(filePath)
  if (!stat) return 0
  const plan = planFile(stat, provider)
  if (plan.reason === 'unchanged') return 0
  const { bytesRead, eventsInserted, finalOffset } = await readFileIncremental(
    plan,
    () => {},
    batchSize
  )
  upsertCursor({
    path: stat.path,
    inode: stat.inode,
    size: stat.size,
    mtimeMs: stat.mtimeMs,
    lastOffset: finalOffset,
    lastScanMs: Date.now(),
  })
  if (!bytesRead) return 0
  return eventsInserted
}
