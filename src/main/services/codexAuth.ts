import fs from 'fs'
import path from 'path'
import https from 'https'
import os from 'os'

interface CodexTokens {
  accessToken: string
  refreshToken: string
  idToken?: string
  accountId?: string
  lastRefresh?: number
}

let cachedToken: CodexTokens | null = null
let cacheExpiry = 0
const CACHE_TTL = 30 * 60 * 1000 // 30 minutes
const STALE_AFTER = 8 * 24 * 60 * 60 * 1000 // 8 days
const CODEX_CLIENT_ID = 'app_EMoamEEZ73f0CkXaXp7hrann'

function readAuthFile(codexDataPath: string): CodexTokens | null {
  const authPath = path.join(codexDataPath, 'auth.json')
  try {
    if (fs.existsSync(authPath)) {
      const raw = JSON.parse(fs.readFileSync(authPath, 'utf8'))
      if (raw.tokens?.access_token) {
        return {
          accessToken: raw.tokens.access_token,
          refreshToken: raw.tokens.refresh_token,
          idToken: raw.tokens.id_token,
          accountId: raw.tokens.account_id,
          lastRefresh: raw.last_refresh ? new Date(raw.last_refresh).getTime() : undefined,
        }
      }
    }
  } catch {
    // ignore
  }
  return null
}

async function refreshToken(refreshTok: string): Promise<CodexTokens | null> {
  return new Promise((resolve) => {
    const body = JSON.stringify({
      grant_type: 'refresh_token',
      refresh_token: refreshTok,
      client_id: CODEX_CLIENT_ID,
      scope: 'openid profile email',
    })
    const req = https.request(
      {
        hostname: 'auth.openai.com',
        path: '/oauth/token',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(body),
        },
        timeout: 10000,
      },
      (res) => {
        let data = ''
        res.on('data', (chunk) => (data += chunk))
        res.on('end', () => {
          try {
            const json = JSON.parse(data)
            if (json.access_token) {
              resolve({
                accessToken: json.access_token,
                refreshToken: json.refresh_token ?? refreshTok,
                idToken: json.id_token,
                lastRefresh: Date.now(),
              })
            } else {
              resolve(null)
            }
          } catch {
            resolve(null)
          }
        })
      }
    )
    req.on('error', () => resolve(null))
    req.on('timeout', () => { req.destroy(); resolve(null) })
    req.write(body)
    req.end()
  })
}

export async function getCodexToken(codexDataPath: string): Promise<string | null> {
  const now = Date.now()

  if (cachedToken && now < cacheExpiry) {
    return cachedToken.accessToken
  }

  let tokens = readAuthFile(codexDataPath)
  if (!tokens) return null

  // Check staleness and refresh
  const stale = tokens.lastRefresh ? now - tokens.lastRefresh > STALE_AFTER : false
  if (stale && tokens.refreshToken) {
    const refreshed = await refreshToken(tokens.refreshToken)
    if (refreshed) {
      tokens = refreshed
      // Write back
      const authPath = path.join(codexDataPath, 'auth.json')
      try {
        let existing: Record<string, unknown> = {}
        if (fs.existsSync(authPath)) {
          existing = JSON.parse(fs.readFileSync(authPath, 'utf8'))
        }
        existing.tokens = {
          access_token: tokens.accessToken,
          refresh_token: tokens.refreshToken,
          id_token: tokens.idToken,
          account_id: tokens.accountId,
        }
        existing.last_refresh = new Date(Date.now()).toISOString()
        fs.writeFileSync(authPath, JSON.stringify(existing, null, 2))
      } catch {
        // ignore
      }
    }
  }

  cachedToken = tokens
  cacheExpiry = now + CACHE_TTL
  return tokens.accessToken
}

export function clearCodexTokenCache() {
  cachedToken = null
  cacheExpiry = 0
}

export function getCodexDataPath(): string {
  return path.join(os.homedir(), '.codex')
}
