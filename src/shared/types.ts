export interface WindowUsage {
  usedPercent: number
  resetsAt: string | null // ISO string
  windowMinutes: number
  label: string
}

export interface ClaudeData {
  session: WindowUsage
  weekly: WindowUsage
  opus: WindowUsage | null
  sonnet: WindowUsage | null
  costToday: number
  tokensToday: number
  costLast30Days: number
  tokensLast30Days: number
  dailyTokens: DailyTokens[]
  modelBreakdown: ModelUsage[]
  lastUpdated: string
  error: string | null
  authStatus: 'ok' | 'no_token' | 'expired' | 'error'
}

export interface CodexData {
  session: WindowUsage
  weekly: WindowUsage
  creditsRemaining: number | null
  creditsUsedToday: number
  dailyCredits: DailyCredits[]
  recentThreads: CodexThread[]
  lastUpdated: string
  error: string | null
  authStatus: 'ok' | 'no_token' | 'expired' | 'error'
}

export interface DailyTokens {
  date: string
  total: number
  byModel: Record<string, number>
}

export interface DailyCredits {
  date: string
  total: number
  byService: Record<string, number>
}

export interface ModelUsage {
  model: string
  inputTokens: number
  outputTokens: number
  cacheReadTokens: number
  cacheWriteTokens: number
  costUSD: number
}

export interface CodexThread {
  id: string
  createdAt: number
  model: string
  tokensUsed: number
  cwd: string
}

export interface LifetimeStats {
  claudeTokens: number
  codexTokens: number
  claudeCost: number
  codexCost?: number
  lastDate: string | null
  lastDayClaudeTokens: number
  lastDayCodexTokens: number
  lastDayClaudeCost: number
  installedAt?: string
  lastScanAt?: string | null
  scanning?: boolean
  scanProgress?: {
    phase: 'discover' | 'parse' | 'idle'
    filesTotal: number
    filesDone: number
    eventsInserted: number
    bytesRead: number
    startedAt: number
  }
}

export interface LeaderboardSettings {
  enabled: boolean
  githubToken: string | null
  githubLogin: string | null
  githubAvatarUrl: string | null
  userId: string | null
  lastSubmittedDate: string | null
}

export interface LeaderboardEntry {
  rank: number
  githubLogin: string
  avatarUrl: string
  totalTokens: number
  claudeTokens: number
  codexTokens: number
}

export interface LeaderboardResponse {
  period: string
  entries: LeaderboardEntry[]
  updatedAt: string
}

export interface AppSettings {
  claudeDataPath: string
  codexDataPath: string
  refreshIntervalMs: number
  windowBounds: { x: number; y: number; width: number; height: number } | null
  minimizeToTray: boolean
  notificationsEnabled: boolean
  notificationThresholds: number[]
  leaderboard: LeaderboardSettings
  lifetime: LifetimeStats
}

export interface AllData {
  claude: ClaudeData | null
  codex: CodexData | null
  lifetime: LifetimeStats | null
}

export interface HistoryPoint {
  sampledAt: number
  usedPercent: number
}

export interface HistoryRange {
  provider: 'claude' | 'codex'
  windowName: string
  startMs: number
  endMs: number
}
