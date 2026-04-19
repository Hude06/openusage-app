import type { LifetimeScanProgress } from '@shared/lifetime-types'

interface Props {
  progress: LifetimeScanProgress | null
}

function formatPhase(p: LifetimeScanProgress): string {
  if (p.phase === 'discover') return 'DISCOVERING LOGS'
  if (p.phase === 'parse') return 'INDEXING'
  return 'COMPLETE'
}

export function LifetimeScanBanner({ progress }: Props) {
  if (!progress) return null
  const percent =
    progress.filesTotal > 0
      ? Math.round((progress.filesDone / progress.filesTotal) * 100)
      : progress.phase === 'idle'
        ? 100
        : 0

  return (
    <div
      className="fade-1 mx-4 mt-1 mb-2 px-3 py-2 flex items-center gap-3"
      style={{
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        borderRadius: '8px',
      }}
      role="status"
      aria-live="polite"
    >
      <span
        className="inline-block w-1.5 h-1.5 rounded-full"
        style={{
          background: progress.phase === 'idle' ? 'var(--text-display)' : 'var(--warning)',
          animation: progress.phase === 'idle' ? 'none' : 'blink 1s infinite',
        }}
      />
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <span className="label-sm truncate">{formatPhase(progress)}</span>
          <span
            className="font-mono text-caption tabular-nums"
            style={{ color: 'var(--text-disabled)' }}
          >
            {progress.filesDone}/{progress.filesTotal || '?'} · {percent}%
          </span>
        </div>
        <div
          className="mt-1.5 h-1 overflow-hidden"
          style={{ background: 'var(--border)', borderRadius: '1px' }}
        >
          <div
            style={{
              width: `${percent}%`,
              height: '100%',
              background: 'var(--text-display)',
              transition: 'width 0.3s ease',
            }}
          />
        </div>
      </div>
    </div>
  )
}
