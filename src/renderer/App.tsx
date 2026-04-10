import React from 'react'
import { Home } from './pages/Home'
import { useUsageData } from './hooks/useUsageData'

export default function App() {
  const { data, loading } = useUsageData()

  const lastUpdated = data.claude?.lastUpdated ?? data.codex?.lastUpdated

  if (loading) {
    return (
      <div
        className="flex items-center justify-center h-full"
        style={{ background: 'var(--black)' }}
      >
        <span className="label" style={{ color: 'var(--text-disabled)' }}>
          [LOADING...]
        </span>
      </div>
    )
  }

  return <Home data={data} lastUpdated={lastUpdated} />
}
