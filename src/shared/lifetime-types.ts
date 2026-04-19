export type Provider = 'claude' | 'codex'

export interface TokenEvent {
  provider: Provider
  requestId: string
  sessionId: string | null
  model: string | null
  tsMs: number
  inputTokens: number
  outputTokens: number
  cacheReadTokens: number
  cacheWriteTokens: number
  reasoningTokens: number
  serviceTier: string | null
}

export interface ScanCursor {
  path: string
  inode: number
  size: number
  mtimeMs: number
  lastOffset: number
  lastScanMs: number
}

export interface LifetimeScanProgress {
  phase: 'discover' | 'parse' | 'idle'
  filesTotal: number
  filesDone: number
  eventsInserted: number
  bytesRead: number
  startedAt: number
}

export interface LifetimeBreakdown {
  byDay: { date: string; claude: number; codex: number }[]
  byModel: { model: string; provider: Provider; tokens: number }[]
}

export interface LifetimeSummary {
  claudeTokens: number
  codexTokens: number
  claudeCost: number
  codexCost: number
  installedAt: string
  lastScanAt: string | null
  scanning: boolean
  scanProgress?: LifetimeScanProgress
}

/**
 * Sum of billable tokens for an event.
 * Reasoning tokens are excluded — Codex reports them as a breakdown of output_tokens,
 * not as additional tokens. Including them would double-count.
 */
export function sumEventTokens(e: TokenEvent): number {
  return (
    e.inputTokens +
    e.outputTokens +
    e.cacheReadTokens +
    e.cacheWriteTokens
  )
}
