import type { TokenEvent } from '../../../shared/lifetime-types'

interface CodexTokenUsage {
  input_tokens?: number
  cached_input_tokens?: number
  output_tokens?: number
  reasoning_output_tokens?: number
  total_tokens?: number
}

interface CodexLine {
  timestamp?: string
  type?: string
  payload?: {
    type?: string
    id?: string
    model?: string
    info?: {
      last_token_usage?: CodexTokenUsage | null
      total_token_usage?: CodexTokenUsage | null
    } | null
  }
}

export interface ParseCodexOptions {
  sourcePath?: string
}

interface ParseState {
  sessionId: string | null
  model: string | null
  eventIndex: number
}

function freshState(): ParseState {
  return { sessionId: null, model: null, eventIndex: 0 }
}

function toTokenEvent(
  line: CodexLine,
  state: ParseState
): TokenEvent | null {
  if (line.type === 'session_meta') {
    state.sessionId = line.payload?.id ?? state.sessionId
    return null
  }
  if (line.type === 'turn_context') {
    if (line.payload?.model) state.model = line.payload.model
    return null
  }
  if (line.type !== 'event_msg') return null
  if (line.payload?.type !== 'token_count') return null

  const last = line.payload?.info?.last_token_usage
  if (!last) return null

  const inputTokens = Number(last.input_tokens ?? 0)
  const cachedInput = Number(last.cached_input_tokens ?? 0)
  const outputTokens = Number(last.output_tokens ?? 0)
  const reasoning = Number(last.reasoning_output_tokens ?? 0)

  if (inputTokens + cachedInput + outputTokens + reasoning === 0) return null

  const uncachedInput = Math.max(0, inputTokens - cachedInput)
  const tsMs = line.timestamp ? new Date(line.timestamp).getTime() : Date.now()
  if (!Number.isFinite(tsMs)) return null

  state.eventIndex += 1
  const sessionId = state.sessionId ?? 'unknown'
  const requestId = `${sessionId}:${state.eventIndex}`

  return {
    provider: 'codex',
    requestId,
    sessionId,
    model: state.model,
    tsMs,
    inputTokens: uncachedInput,
    outputTokens,
    cacheReadTokens: cachedInput,
    cacheWriteTokens: 0,
    reasoningTokens: reasoning,
    serviceTier: null,
  }
}

export function parseCodexJsonl(
  text: string,
  _opts: ParseCodexOptions = {}
): TokenEvent[] {
  const events: TokenEvent[] = []
  const state = freshState()
  const lines = text.split(/\r?\n/)
  for (const raw of lines) {
    const trimmed = raw.trim()
    if (!trimmed) continue
    let parsed: CodexLine
    try {
      parsed = JSON.parse(trimmed) as CodexLine
    } catch {
      continue
    }
    const event = toTokenEvent(parsed, state)
    if (event) events.push(event)
  }
  return events
}

export function createCodexLineParser() {
  const state = freshState()
  return {
    parseLine(raw: string): TokenEvent | null {
      const trimmed = raw.trim()
      if (!trimmed) return null
      try {
        const line = JSON.parse(trimmed) as CodexLine
        return toTokenEvent(line, state)
      } catch {
        return null
      }
    },
    snapshot(): ParseState {
      return { ...state }
    },
  }
}
