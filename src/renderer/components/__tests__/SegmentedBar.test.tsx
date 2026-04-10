import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import React from 'react'
import { SegmentedBar } from '../SegmentedBar'

describe('SegmentedBar', () => {
  it('renders with correct aria attributes', () => {
    render(<SegmentedBar percent={50} label="Session usage" />)
    const meter = screen.getByRole('meter')
    expect(meter).toHaveAttribute('aria-label', 'Session usage')
    expect(meter).toHaveAttribute('aria-valuenow', '50')
    expect(meter).toHaveAttribute('aria-valuemin', '0')
    expect(meter).toHaveAttribute('aria-valuemax', '100')
  })

  it('renders default 20 segments', () => {
    render(<SegmentedBar percent={50} />)
    const meter = screen.getByRole('meter')
    expect(meter.children).toHaveLength(20)
  })

  it('renders custom segment count', () => {
    render(<SegmentedBar percent={50} segments={16} />)
    const meter = screen.getByRole('meter')
    expect(meter.children).toHaveLength(16)
  })

  it('fills correct number of segments at 50%', () => {
    render(<SegmentedBar percent={50} segments={20} />)
    const meter = screen.getByRole('meter')
    const segments = Array.from(meter.children) as HTMLElement[]
    const filled = segments.filter(s => s.style.backgroundColor !== 'var(--border)')
    expect(filled).toHaveLength(10)
  })

  it('fills 0 segments at 0%', () => {
    render(<SegmentedBar percent={0} segments={20} />)
    const meter = screen.getByRole('meter')
    const segments = Array.from(meter.children) as HTMLElement[]
    const filled = segments.filter(s => s.style.backgroundColor !== 'var(--border)')
    expect(filled).toHaveLength(0)
  })

  it('fills all segments at 100%', () => {
    render(<SegmentedBar percent={100} segments={20} />)
    const meter = screen.getByRole('meter')
    const segments = Array.from(meter.children) as HTMLElement[]
    const filled = segments.filter(s => s.style.backgroundColor !== 'var(--border)')
    expect(filled).toHaveLength(20)
  })

  it('clamps values above 100', () => {
    render(<SegmentedBar percent={150} />)
    const meter = screen.getByRole('meter')
    expect(meter).toHaveAttribute('aria-valuenow', '100')
  })

  it('clamps values below 0', () => {
    render(<SegmentedBar percent={-10} />)
    const meter = screen.getByRole('meter')
    expect(meter).toHaveAttribute('aria-valuenow', '0')
  })

  it('uses accent color when remaining <= 10%', () => {
    render(<SegmentedBar percent={95} segments={20} />)
    const meter = screen.getByRole('meter')
    const filled = (Array.from(meter.children) as HTMLElement[]).find(
      s => s.style.backgroundColor !== 'var(--border)'
    )
    expect(filled?.style.backgroundColor).toBe('var(--accent)')
  })

  it('uses warning color when remaining <= 25%', () => {
    render(<SegmentedBar percent={80} segments={20} />)
    const meter = screen.getByRole('meter')
    const filled = (Array.from(meter.children) as HTMLElement[]).find(
      s => s.style.backgroundColor !== 'var(--border)'
    )
    expect(filled?.style.backgroundColor).toBe('var(--warning)')
  })

  it('uses display color when healthy', () => {
    render(<SegmentedBar percent={30} segments={20} />)
    const meter = screen.getByRole('meter')
    const filled = (Array.from(meter.children) as HTMLElement[]).find(
      s => s.style.backgroundColor !== 'var(--border)'
    )
    expect(filled?.style.backgroundColor).toBe('var(--text-display)')
  })

  it('defaults aria-label to Usage when not provided', () => {
    render(<SegmentedBar percent={50} />)
    const meter = screen.getByRole('meter')
    expect(meter).toHaveAttribute('aria-label', 'Usage')
  })
})
