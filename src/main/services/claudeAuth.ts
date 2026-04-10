import { execSync } from 'child_process'
import fs from 'fs'
import path from 'path'
import https from 'https'
import os from 'os'

interface OAuthToken {
  accessToken: string
  refreshToken: string | null
  expiresAt: number | null
}

let cachedToken: OAuthToken | null = null
let cacheExpiry = 0
const CACHE_TTL = 30 * 60 * 1000 // 30 minutes
let lastRefreshAttempt = 0
const REFRESH_COOLDOWN = 5 * 60 * 1000 // 5 minutes

function readCredentialsFile(claudeDataPath: string): OAuthToken | null {
  const credPath = path.join(claudeDataPath, '.credentials.json')
  try {
    if (fs.existsSync(credPath)) {
      const raw = JSON.parse(fs.readFileSync(credPath, 'utf8'))
      if (raw.claudeAiOauth?.accessToken) {
        return {
          accessToken: raw.claudeAiOauth.accessToken,
          refreshToken: raw.claudeAiOauth.refreshToken ?? null,
          expiresAt: raw.claudeAiOauth.expiresAt ?? null,
        }
      }
    }
  } catch {
    // ignore
  }
  return null
}

function readKeychain(): OAuthToken | null {
  try {
    const result = execSync(
      '/usr/bin/security find-generic-password -w -s "Claude Code-credentials"',
      { timeout: 2000, stdio: ['pipe', 'pipe', 'pipe'] }
    )
      .toString()
      .trim()
    if (!result) return null
    try {
      const parsed = JSON.parse(result)
      // Keychain stores {"claudeAiOauth":{"accessToken":"...","refreshToken":"...","expiresAt":...}}
      const oauth = parsed.claudeAiOauth ?? parsed
      const accessToken = oauth.accessToken ?? oauth.access_token
      if (!accessToken) return null
      return {
        accessToken,
        refreshToken: oauth.refreshToken ?? oauth.refresh_token ?? null,
        expiresAt: oauth.expiresAt ?? oauth.expires_at ?? null,
      }
    } catch {
      // Not JSON — use raw string as token
      return { accessToken: result, refreshToken: null, expiresAt: null }
    }
  } catch {
    // Keychain item may not exist or user denied
  }
  return null
}

async function refreshToken(refreshTok: string): Promise<OAuthToken | null> {
  return new Promise((resolve) => {
    const body = JSON.stringify({
      grant_type: 'refresh_token',
      refresh_token: refreshTok,
      client_id: 'claude-cli',
    })
    const req = https.request(
      {
        hostname: 'platform.claude.com',
        path: '/v1/oauth/token',
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
                expiresAt: json.expires_in ? Date.now() + json.expires_in * 1000 : null,
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

export async function getClaudeToken(claudeDataPath: string): Promise<string | null> {
  const now = Date.now()

  // Return cached if still valid
  if (cachedToken && now < cacheExpiry) {
    return cachedToken.accessToken
  }

  // Try credentials file first
  let token = readCredentialsFile(claudeDataPath)

  // Fall back to keychain
  if (!token) {
    token = readKeychain()
  }

  if (!token) return null

  // Check if expired and try refresh
  if (token.expiresAt && now >= token.expiresAt && token.refreshToken) {
    if (now - lastRefreshAttempt > REFRESH_COOLDOWN) {
      lastRefreshAttempt = now
      const refreshed = await refreshToken(token.refreshToken)
      if (refreshed) {
        token = refreshed
        // Write back refreshed token
        const credPath = path.join(claudeDataPath, '.credentials.json')
        try {
          let existing: Record<string, unknown> = {}
          if (fs.existsSync(credPath)) {
            existing = JSON.parse(fs.readFileSync(credPath, 'utf8'))
          }
          existing.claudeAiOauth = {
            accessToken: token.accessToken,
            refreshToken: token.refreshToken,
            expiresAt: token.expiresAt,
          }
          fs.writeFileSync(credPath, JSON.stringify(existing, null, 2))
        } catch {
          // ignore write failure
        }
      }
    }
  }

  cachedToken = token
  cacheExpiry = now + CACHE_TTL
  return token.accessToken
}

export function clearClaudeTokenCache() {
  cachedToken = null
  cacheExpiry = 0
}

export function getClaudeDataPath(): string {
  return path.join(os.homedir(), '.claude')
}
