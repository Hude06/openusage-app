import { describe, it, expect } from 'vitest'
import { fmt, fmtCost, shortPath } from '../utils'

describe('fmt', () => {
  it('formats billions', () => {
    expect(fmt(2_500_000_000)).toBe('2.50B')
  })

  it('formats millions', () => {
    expect(fmt(1_234_567)).toBe('1.2M')
  })

  it('formats thousands', () => {
    expect(fmt(45_678)).toBe('46K')
  })

  it('formats small numbers', () => {
    expect(fmt(42)).toBe('42')
    expect(fmt(999)).toBe('999')
  })

  it('formats zero', () => {
    expect(fmt(0)).toBe('0')
  })

  it('rounds fractional small numbers', () => {
    expect(fmt(3.7)).toBe('4')
  })
})

describe('fmtCost', () => {
  it('formats with two decimal places', () => {
    expect(fmtCost(4.2)).toBe('$4.20')
  })

  it('formats zero', () => {
    expect(fmtCost(0)).toBe('$0.00')
  })

  it('formats large costs with commas', () => {
    expect(fmtCost(1234.56)).toBe('$1,234.56')
  })
})

describe('shortPath', () => {
  it('returns last two segments', () => {
    expect(shortPath('/Users/jude/xp/token_ussage')).toBe('xp/token_ussage')
  })

  it('returns single segment if only one', () => {
    expect(shortPath('foo')).toBe('foo')
  })

  it('returns dash for empty string', () => {
    expect(shortPath('')).toBe('—')
  })
})
