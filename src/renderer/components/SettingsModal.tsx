import React, { useEffect, useState } from 'react'
import * as Dialog from '@radix-ui/react-dialog'
import type { AppSettings } from '@shared/types'
import { cn } from '../lib/utils'
import { RefreshCw } from 'lucide-react'

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

export function SettingsModal({ open, onClose }: Props) {
  const [settings, setSettings] = useState<AppSettings | null>(null)
  const [status, setStatus] = useState<string | null>(null)

  useEffect(() => {
    if (open) window.tokenPulse.getSettings().then(setSettings)
  }, [open])

  const save = async () => {
    if (!settings) return
    await window.tokenPulse.saveSettings(settings)
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

              {/* Auth */}
              <div className="space-y-3">
                <p className="label-sm">Credentials</p>
                <div className="space-y-2">
                  {[
                    { label: 'RE-READ CLAUDE TOKEN', action: () => window.tokenPulse.refreshClaudeAuth() },
                    { label: 'RE-READ CODEX TOKEN', action: () => window.tokenPulse.refreshCodexAuth() },
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
                OPEN USAGE V1.0.0
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
