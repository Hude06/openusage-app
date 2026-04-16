export interface Env {
  DB: D1Database
  GITHUB_CLIENT_ID: string
  GITHUB_CLIENT_SECRET: string
}

export interface SubmitPayload {
  date: string
  claudeTokens: number
  codexTokens: number
  claudeCostUSD: number
  modelsUsed: Record<string, number>
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

export interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: string
}
