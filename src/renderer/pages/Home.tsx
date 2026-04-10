import React, { useState } from 'react'
import type { AllData, ClaudeData, CodexData, WindowUsage } from '@shared/types'
import { SegmentedBar } from '../components/SegmentedBar'
import { Sparkline } from '../components/Sparkline'
import { CountdownTimer } from '../components/CountdownTimer'
import { StatRow } from '../components/StatRow'
import { AuthBadge } from '../components/AuthBadge'
import { SettingsModal } from '../components/SettingsModal'
import { useHistory } from '../hooks/useHistory'
import { Settings } from 'lucide-react'
import { fmt, fmtCost } from '../lib/utils'

interface Props {
  data: AllData
  lastUpdated?: string
}

// ─── Status color for remaining % ─────────────────────────
function remainingColor(usedPercent: number): string {
  const remaining = 100 - usedPercent
  if (remaining <= 10) return 'var(--accent)'
  if (remaining <= 25) return 'var(--warning)'
  return 'var(--text-display)'
}

// ─── Window bar row (segmented bar + label + countdown) ───
function WindowRow({
  window: w,
  label,
}: {
  window: WindowUsage | null
  label: string
}) {
  if (!w) {
    return (
      <div className="space-y-1" style={{ opacity: 0.3 }}>
        <div className="flex items-center justify-between">
          <span className="label-sm">{label}</span>
          <span className="font-mono text-body-sm" style={{ color: 'var(--text-disabled)' }}>—</span>
        </div>
        <SegmentedBar percent={0} size="standard" label={`${label} usage`} />
      </div>
    )
  }

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="label-sm">{label}</span>
          <span
            className="font-mono text-[10px] tracking-[0.06em]"
            style={{
              color: 'var(--text-disabled)',
              border: '1px solid var(--border)',
              borderRadius: '4px',
              padding: '1px 5px',
            }}
          >
            {w.windowMinutes === 300 ? '5HR' : '7D'}
          </span>
        </div>
        <CountdownTimer resetsAt={w.resetsAt} />
      </div>
      <SegmentedBar percent={w.usedPercent} size="standard" label={`${label} usage`} />
    </div>
  )
}

// ─── Model breakdown bar (compact) ────────────────────────
function ModelRow({
  label,
  usedPercent,
}: {
  label: string
  usedPercent: number | null
}) {
  if (usedPercent == null) return null

  const remaining = 100 - usedPercent

  return (
    <div className="flex items-center gap-3">
      <span className="label-sm w-16 shrink-0">{label}</span>
      <div className="flex-1">
        <SegmentedBar percent={usedPercent} size="compact" segments={16} label={`${label} usage`} />
      </div>
      <span
        className="font-mono text-caption tabular-nums w-10 text-right"
        style={{ color: remainingColor(usedPercent) }}
      >
        {Math.round(remaining)}%
      </span>
    </div>
  )
}

// ─── Generic service card ─────────────────────────────────
function ServiceCard({
  provider,
  name,
  planLabel,
  sessionWindow,
  weeklyWindow,
  authStatus,
  error,
  fadeClass,
  children,
}: {
  provider: 'claude' | 'codex'
  name: string
  planLabel: string
  sessionWindow: WindowUsage | null
  weeklyWindow: WindowUsage | null
  authStatus?: 'ok' | 'no_token' | 'expired' | 'error'
  error?: string | null
  fadeClass: string
  children?: React.ReactNode
}) {
  const authIssue = authStatus && authStatus !== 'ok'
  const heroWindow = sessionWindow ?? weeklyWindow
  const heroRemaining = heroWindow ? 100 - heroWindow.usedPercent : null

  const sessionHistory = useHistory(provider, 'session')
  const weeklyHistory = useHistory(provider, 'weekly')

  return (
    <div
      className={fadeClass}
      style={{
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        borderRadius: '12px',
        padding: '20px',
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2">
          <span className="label" style={{ color: 'var(--text-primary)' }}>{name}</span>
          <span
            className="font-mono text-[10px] tracking-[0.06em] uppercase"
            style={{
              color: 'var(--text-disabled)',
              border: '1px solid var(--border-visible)',
              borderRadius: '999px',
              padding: '2px 8px',
            }}
          >
            {planLabel}
          </span>
          {authIssue && <AuthBadge status={authStatus!} />}
        </div>
      </div>

      {/* Auth error */}
      {authIssue && error && (
        <div
          className="font-mono text-caption mb-4 px-3 py-2"
          style={{
            color: 'var(--accent)',
            border: '1px solid var(--accent)',
            borderRadius: '8px',
          }}
        >
          {error}
        </div>
      )}

      {/* Hero remaining % */}
      <div className="mb-5">
        <span
          className="display text-display-lg"
          style={{ color: heroRemaining != null ? remainingColor(heroWindow!.usedPercent) : 'var(--text-disabled)' }}
        >
          {heroRemaining != null ? Math.round(heroRemaining) : '—'}
          <span
            className="font-mono text-subheading ml-1"
            style={{ color: 'var(--text-secondary)', letterSpacing: '0' }}
          >
            %
          </span>
        </span>
        <div className="label-sm mt-1">REMAINING</div>
      </div>

      {/* Window bars + sparklines */}
      <div className="space-y-3 mb-5">
        <WindowRow window={sessionWindow} label="SESSION" />
        <WindowRow window={weeklyWindow} label="WEEKLY" />
        <Sparkline points={[...sessionHistory, ...weeklyHistory]} height={28} className="mt-1 opacity-60" />
      </div>

      {/* Service-specific stats */}
      {children && (
        <div
          className="space-y-2 pt-4"
          style={{ borderTop: '1px solid var(--border)' }}
        >
          {children}
        </div>
      )}
    </div>
  )
}

// ─── Main Home component ──────────────────────────────────
export function Home({ data, lastUpdated }: Props) {
  const [settingsOpen, setSettingsOpen] = useState(false)

  const timeAgo = React.useMemo(() => {
    if (!lastUpdated) return null
    const s = Math.floor((Date.now() - new Date(lastUpdated).getTime()) / 1000)
    if (s < 10) return 'LIVE'
    if (s < 60) return `${s}S AGO`
    if (s < 3600) return `${Math.floor(s / 60)}M AGO`
    return `${Math.floor(s / 3600)}H AGO`
  }, [lastUpdated])

  const claude = data.claude
  const codex = data.codex

  return (
    <div
      className="flex flex-col h-full"
      style={{ background: 'var(--black)' }}
    >
      {/* macOS titlebar drag region */}
      <div className="drag-region shrink-0" style={{ height: 28 }} />

      {/* Header */}
      <div className="fade-1 shrink-0 flex items-center justify-between px-5 pb-4">
        <span className="label" style={{ color: 'var(--text-disabled)' }}>
          OPEN USAGE
        </span>
        <button
          data-testid="settings-trigger"
          onClick={() => setSettingsOpen(true)}
          className="no-drag flex items-center justify-center w-8 h-8 transition-colors"
          style={{ color: 'var(--text-disabled)', borderRadius: '8px' }}
        >
          <Settings size={14} strokeWidth={1.5} />
        </button>
      </div>

      {/* Body — scrollable */}
      <div className="flex-1 overflow-y-auto px-4 pb-4 space-y-3">
        {/* Claude */}
        <ServiceCard
          provider="claude"
          name="CLAUDE"
          planLabel="MAX"
          sessionWindow={claude?.session ?? null}
          weeklyWindow={claude?.weekly ?? null}
          authStatus={claude?.authStatus}
          error={claude?.error}
          fadeClass="fade-1"
        >
          {claude && (
            <>
              <StatRow
                label="TODAY"
                value={fmtCost(claude.costToday)}
                secondaryValue={`${fmt(claude.tokensToday)} tok`}
              />
              {claude.opus && (
                <ModelRow label="OPUS" usedPercent={claude.opus.usedPercent} />
              )}
              {claude.sonnet && (
                <ModelRow label="SONNET" usedPercent={claude.sonnet.usedPercent} />
              )}
            </>
          )}
        </ServiceCard>

        {/* Codex */}
        <ServiceCard
          provider="codex"
          name="CODEX"
          planLabel="PRO"
          sessionWindow={codex?.session ?? null}
          weeklyWindow={codex?.weekly ?? null}
          authStatus={codex?.authStatus}
          error={codex?.error}
          fadeClass="fade-2"
        >
          {codex && (
            <>
              {codex.creditsRemaining != null && (
                <StatRow
                  label="CREDITS"
                  value={`$${codex.creditsRemaining.toFixed(2)}`}
                  secondaryValue="remaining"
                  statusColor={
                    codex.creditsRemaining < 5 ? 'var(--accent)'
                    : codex.creditsRemaining < 20 ? 'var(--warning)'
                    : 'var(--text-primary)'
                  }
                />
              )}
              {codex.creditsUsedToday > 0 && (
                <StatRow label="TODAY" value={`$${codex.creditsUsedToday.toFixed(2)}`} />
              )}
            </>
          )}
        </ServiceCard>
      </div>

      {/* Footer */}
      <div
        className="fade-4 shrink-0 flex items-center justify-between px-5 py-3"
        style={{ borderTop: '1px solid var(--border)' }}
      >
        <span className="label-sm">
          {timeAgo ? `UPDATED ${timeAgo}` : '—'}
        </span>
        <span className="label-sm" style={{ color: 'var(--text-disabled)' }}>
          V1.0.0
        </span>
      </div>

      <SettingsModal open={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </div>
  )
}
