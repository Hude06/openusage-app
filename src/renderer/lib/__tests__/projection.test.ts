import { describe, it, expect } from 'vitest'
import { projectCost } from '../projection'

const HOUR = 60 * 60 * 1000
const DAY = 24 * HOUR

describe('projectCost', () => {
  it('projects linearly based on burn rate', () => {
    // $2 spent in 2 hours of a 10-hour window = $10 projected
    const result = projectCost(2, 2 * HOUR, 10 * HOUR)
    expect(result).toBeCloseTo(10)
  })

  it('returns null when less than 1 hour elapsed', () => {
    expect(projectCost(1, 30 * 60 * 1000, DAY)).toBeNull()
  })

  it('returns null for zero elapsed time', () => {
    expect(projectCost(1, 0, DAY)).toBeNull()
  })

  it('returns null for negative elapsed time', () => {
    expect(projectCost(1, -1000, DAY)).toBeNull()
  })

  it('returns null for zero window duration', () => {
    expect(projectCost(1, 2 * HOUR, 0)).toBeNull()
  })

  it('returns null for zero cost', () => {
    expect(projectCost(0, 2 * HOUR, DAY)).toBeNull()
  })

  it('returns null for negative cost', () => {
    expect(projectCost(-5, 2 * HOUR, DAY)).toBeNull()
  })

  it('handles exactly 1 hour elapsed', () => {
    const result = projectCost(1, HOUR, 5 * HOUR)
    expect(result).toBeCloseTo(5)
  })

  it('handles fractional costs', () => {
    const result = projectCost(0.5, 2 * HOUR, 8 * HOUR)
    expect(result).toBeCloseTo(2)
  })
})
