import React, { useEffect, useState } from 'react'
import * as Dialog from '@radix-ui/react-dialog'
import * as Switch from '@radix-ui/react-switch'
import type { AppSettings } from '@shared/types'
import { RefreshCw, LogOut, ExternalLink } from 'lucide-react'

const INTERVALS = [
  { label: '30S', ms: 30_000 },
  { label: '1M', ms: 60_000 },
  { label: '2M', ms: 120_000 },
  { label: '5M', ms: 300_000 },
]

interface Props {
  open: boolean
  onClose: () => void
}

function ToggleRow({
  label,
  checked,
  onCheckedChange,
}: {
  label: string
  checked: boolean
  onCheckedChange: (checked: boolean) => void
}) {
  return (
    <div className="flex items-center justify-between py-1">
      <span className="label-sm">{label}</span>
      <Switch.Root
        checked={checked}
        onCheckedChange={onCheckedChange}
        className="w-10 h-5 rounded-full transition-colors"
        style={{
          background: checked ? 'var(--text-display)' : 'var(--border-visible)',
        }}
      >
        <Switch.Thumb
          className="block w-4 h-4 rounded-full transition-transform"
          style={{
            background: checked ? 'var(--black)' : 'var(--text-disabled)',
            transform: checked ? 'translateX(22px)' : 'translateX(2px)',
          }}
        />
      </Switch.Root>
    </div>
  )
}

const GithubIcon = ({ size = 12 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-label="GitHub">
    <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
  </svg>
)

export function SettingsModal({ open, onClose }: Props) {
  const [settings, setSettings] = useState<AppSettings | null>(null)
  const [status, setStatus] = useState<string | null>(null)

  useEffect(() => {
    if (open) window.tokenUsage.getSettings().then(setSettings)
  }, [open])

  // Listen for OAuth result from main process
  useEffect(() => {
    const unsubSuccess = window.tokenUsage.onLeaderboardAuthSuccess(() => {
      window.tokenUsage.getSettings().then(setSettings)
    })

    return () => {
      unsubSuccess()
    }
  }, [])

  const save = async () => {
    if (!settings) return
    await window.tokenUsage.saveSettings(settings)
    setStatus('[SAVED]')
    setTimeout(() => { setStatus(null); onClose() }, 900)
  }

  return (
    <Dialog.Root open={open} onOpenChange={v => !v && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay
          className="no-drag fixed inset-0 z-40"
          style={{ background: 'rgba(0,0,0,0.8)' }}
        />
        <Dialog.Content
          className="no-drag fixed z-50 left-1/2 top-1/2 w-[360px] -translate-x-1/2 -translate-y-1/2 focus:outline-none"
          style={{
            background: 'var(--surface)',
            border: '1px solid var(--border-visible)',
            borderRadius: '16px',
            padding: '24px',
          }}
        >
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <Dialog.Title className="label">
              Settings
            </Dialog.Title>
            <Dialog.Close asChild>
              <button
                className="font-mono text-[11px] tracking-[0.06em] uppercase px-2 py-1 transition-colors"
                style={{ color: 'var(--text-secondary)' }}
              >
                [ X ]
              </button>
            </Dialog.Close>
          </div>

          {settings ? (
            <div className="space-y-6">
              {/* Refresh interval — segmented control */}
              <div className="space-y-3">
                <p className="label-sm">Refresh interval</p>
                <div
                  className="flex"
                  style={{
                    border: '1px solid var(--border-visible)',
                    borderRadius: '999px',
                    overflow: 'hidden',
                  }}
                >
                  {INTERVALS.map(({ label, ms }) => {
                    const active = settings.refreshIntervalMs === ms
                    return (
                      <button
                        key={ms}
                        onClick={() => setSettings({ ...settings, refreshIntervalMs: ms })}
                        className="flex-1 font-mono text-[11px] tracking-[0.06em] uppercase py-2 transition-all"
                        style={{
                          background: active ? 'var(--text-display)' : 'transparent',
                          color: active ? 'var(--black)' : 'var(--text-secondary)',
                        }}
                      >
                        {label}
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Behavior toggles */}
              <div className="space-y-2">
                <p className="label-sm">Behavior</p>
                <ToggleRow
                  label="MINIMIZE TO TRAY"
                  checked={settings.minimizeToTray}
                  onCheckedChange={(v) => setSettings({ ...settings, minimizeToTray: v })}
                />
                <ToggleRow
                  label="USAGE NOTIFICATIONS"
                  checked={settings.notificationsEnabled}
                  onCheckedChange={(v) => setSettings({ ...settings, notificationsEnabled: v })}
                />
              </div>

              {/* Leaderboard */}
              <div className="space-y-3">
                <p className="label-sm">Leaderboard</p>
                {settings.leaderboard.githubLogin ? (
                  <div className="space-y-2">
                    <div
                      className="flex items-center gap-3 py-3 px-4"
                      style={{
                        border: '1px solid var(--border)',
                        borderRadius: '8px',
                      }}
                    >
                      {settings.leaderboard.githubAvatarUrl && (
                        <img
                          src={settings.leaderboard.githubAvatarUrl}
                          alt=""
                          className="w-6 h-6 rounded-full"
                        />
                      )}
                      <span
                        className="font-mono text-[11px] tracking-[0.06em] flex-1"
                        style={{ color: 'var(--text-primary)' }}
                      >
                        @{settings.leaderboard.githubLogin}
                      </span>
                      <button
                        onClick={() => {
                          window.tokenUsage.leaderboardLogout()
                          setSettings({
                            ...settings,
                            leaderboard: {
                              ...settings.leaderboard,
                              enabled: false,
                              githubToken: null,
                              githubLogin: null,
                              githubAvatarUrl: null,
                              userId: null,
                              lastSubmittedHour: null,
                              lastSubmittedDate: null,
                            },
                          })
                        }}
                        title="Disconnect"
                        style={{ color: 'var(--text-secondary)' }}
                      >
                        <LogOut size={12} strokeWidth={1.5} />
                      </button>
                    </div>
                    <ToggleRow
                      label="SHARE USAGE ON LEADERBOARD"
                      checked={settings.leaderboard.enabled}
                      onCheckedChange={(v) =>
                        setSettings({
                          ...settings,
                          leaderboard: { ...settings.leaderboard, enabled: v },
                        })
                      }
                    />
                    <button
                      onClick={() => window.tokenUsage.openUrl('https://opentokenusage.com/leaderboard')}
                      className="w-full flex items-center justify-center gap-2 font-mono text-[11px] tracking-[0.06em] uppercase py-2 transition-colors"
                      style={{ color: 'var(--text-secondary)' }}
                    >
                      <ExternalLink size={11} strokeWidth={1.5} />
                      VIEW LEADERBOARD
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => window.tokenUsage.leaderboardAuth()}
                    className="w-full flex items-center justify-center gap-2 font-mono text-[11px] tracking-[0.06em] uppercase py-3 px-4 transition-colors"
                    style={{
                      color: 'var(--text-secondary)',
                      border: '1px solid var(--border)',
                      borderRadius: '8px',
                      background: 'transparent',
                    }}
                  >
                    <GithubIcon size={13} />
                    SIGN IN WITH GITHUB
                  </button>
                )}
              </div>

              {/* Auth */}
              <div className="space-y-3">
                <p className="label-sm">Credentials</p>
                <div className="space-y-2">
                  {[
                    { label: 'RE-READ CLAUDE TOKEN', action: () => window.tokenUsage.refreshClaudeAuth() },
                    { label: 'RE-READ CODEX TOKEN', action: () => window.tokenUsage.refreshCodexAuth() },
                    { label: 'RESCAN LIFETIME TOKENS', action: () => window.tokenUsage.forceRescanLifetime() },
                  ].map(({ label, action }) => (
                    <button
                      key={label}
                      onClick={action}
                      className="w-full flex items-center gap-2 font-mono text-[11px] tracking-[0.06em] uppercase py-3 px-4 transition-colors"
                      style={{
                        color: 'var(--text-secondary)',
                        border: '1px solid var(--border)',
                        borderRadius: '8px',
                        background: 'transparent',
                      }}
                    >
                      <RefreshCw size={12} strokeWidth={1.5} />
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Save */}
              <button
                onClick={save}
                className="w-full font-mono text-[13px] tracking-[0.06em] uppercase py-3 transition-all"
                style={{
                  background: status ? 'transparent' : 'var(--text-display)',
                  color: status ? 'var(--success)' : 'var(--black)',
                  borderRadius: '999px',
                  border: status ? '1px solid var(--success)' : '1px solid transparent',
                }}
              >
                {status ?? 'SAVE'}
              </button>

              {/* Version */}
              <p className="label-sm text-center" style={{ color: 'var(--text-disabled)' }}>
                OPEN USAGE V1.0.1
              </p>
            </div>
          ) : (
            <div className="h-24 flex items-center justify-center">
              <span className="label" style={{ color: 'var(--text-disabled)' }}>[LOADING...]</span>
            </div>
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
