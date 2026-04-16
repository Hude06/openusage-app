const MIN_ELAPSED_MS = 60 * 60 * 1000 // 1 hour minimum data

/**
 * Projects cost by end of window based on current burn rate.
 * Returns null if not enough data elapsed (<1h) or invalid inputs.
 */
export function projectCost(
  costSoFar: number,
  elapsedMs: number,
  windowMs: number
): number | null {
  if (elapsedMs < MIN_ELAPSED_MS) return null
  if (elapsedMs <= 0 || windowMs <= 0) return null
  if (costSoFar <= 0) return null

  const rate = costSoFar / elapsedMs
  return rate * windowMs
}
