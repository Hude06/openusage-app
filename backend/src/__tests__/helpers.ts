import { vi } from 'vitest'

export interface MockD1Result {
  results?: Record<string, unknown>[]
  first?: Record<string, unknown> | null
  success?: boolean
}

export function createMockD1(options: {
  allResults?: Record<string, unknown>[]
  firstResult?: Record<string, unknown> | null
  runSuccess?: boolean
} = {}) {
  const { allResults = [], firstResult = null, runSuccess = true } = options

  const run = vi.fn().mockResolvedValue({ success: runSuccess })
  const first = vi.fn().mockResolvedValue(firstResult)
  const all = vi.fn().mockResolvedValue({ results: allResults })
  const bindObj: Record<string, unknown> = { run, first, all }
  const bind = vi.fn().mockImplementation((..._args: unknown[]) => bindObj)
  bindObj.bind = bind
  const prepare = vi.fn().mockReturnValue({ bind, run, first, all })
  const batch = vi.fn().mockResolvedValue([])

  return {
    prepare,
    batch,
    _mocks: { prepare, bind, run, first, all, batch },
  }
}

export function createMockEnv(dbOverrides: Parameters<typeof createMockD1>[0] = {}) {
  return {
    DB: createMockD1(dbOverrides) as unknown as D1Database,
    GITHUB_CLIENT_ID: 'test-client-id',
    GITHUB_CLIENT_SECRET: 'test-client-secret',
  }
}
