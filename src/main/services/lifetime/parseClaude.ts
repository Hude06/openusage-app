import type { TokenEvent } from '../../../shared/lifetime-types'

interface ClaudeUsage {
  input_tokens?: number
  output_tokens?: number
  cache_creation_input_tokens?: number
  cache_read_input_tokens?: number
  service_tier?: string
}

interface ClaudeAssistantLine {
  type?: string
  requestId?: string
  sessionId?: string
  timestamp?: string
  message?: {
    model?: string
    usage?: ClaudeUsage
  }
}

export interface ParseClaudeOptions {
  installedAt?: number
  sourcePath?: string
}

function toEvent(
  line: ClaudeAssistantLine,
  opts: ParseClaudeOptions
): TokenEvent | null {
  if (line.type !== 'assistant') return null
  const requestId = line.requestId
  const usage = line.message?.usage
  if (!requestId || !usage) return null

  const tsMs = line.timestamp ? new Date(line.timestamp).getTime() : Date.now()
  if (!Number.isFinite(tsMs)) return null

  const inputTokens = Number(usage.input_tokens ?? 0)
  const outputTokens = Number(usage.output_tokens ?? 0)
  const cacheReadTokens = Number(usage.cache_read_input_tokens ?? 0)
  const cacheWriteTokens = Number(usage.cache_creation_input_tokens ?? 0)

  if (inputTokens + outputTokens + cacheReadTokens + cacheWriteTokens === 0) {
    return null
  }

  return {
    provider: 'claude',
    requestId,
    sessionId: line.sessionId ?? null,
    model: line.message?.model ?? null,
    tsMs,
    inputTokens,
    outputTokens,
    cacheReadTokens,
    cacheWriteTokens,
    reasoningTokens: 0,
    serviceTier: usage.service_tier ?? null,
  }
}

export function parseClaudeJsonl(
  text: string,
  opts: ParseClaudeOptions = {}
): TokenEvent[] {
  const events: TokenEvent[] = []
  const lines = text.split(/\r?\n/)
  for (const raw of lines) {
    const trimmed = raw.trim()
    if (!trimmed) continue
    let parsed: ClaudeAssistantLine
    try {
      parsed = JSON.parse(trimmed) as ClaudeAssistantLine
    } catch {
      continue
    }
    const event = toEvent(parsed, opts)
    if (event) events.push(event)
  }
  return events
}

export function parseClaudeLine(
  raw: string,
  opts: ParseClaudeOptions = {}
): TokenEvent | null {
  const trimmed = raw.trim()
  if (!trimmed) return null
  try {
    const parsed = JSON.parse(trimmed) as ClaudeAssistantLine
    return toEvent(parsed, opts)
  } catch {
    return null
  }
}
