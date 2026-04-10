import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import React from 'react'
import { StatRow } from '../StatRow'

describe('StatRow', () => {
  it('renders label and value', () => {
    render(<StatRow label="TODAY" value="$4.20" />)
    expect(screen.getByText('TODAY')).toBeInTheDocument()
    expect(screen.getByText('$4.20')).toBeInTheDocument()
  })

  it('renders secondary value when provided', () => {
    render(<StatRow label="TODAY" value="$4.20" secondaryValue="182K tok" />)
    expect(screen.getByText('182K tok')).toBeInTheDocument()
  })

  it('does not render secondary value when not provided', () => {
    const { container } = render(<StatRow label="TODAY" value="$4.20" />)
    const spans = container.querySelectorAll('span')
    expect(spans).toHaveLength(2) // label + value only
  })

  it('applies status color to value', () => {
    render(<StatRow label="CREDITS" value="$2.00" statusColor="var(--accent)" />)
    const value = screen.getByText('$2.00')
    expect(value.style.color).toBe('var(--accent)')
  })

  it('uses text-primary when no status color', () => {
    render(<StatRow label="TODAY" value="$4.20" />)
    const value = screen.getByText('$4.20')
    expect(value.style.color).toBe('var(--text-primary)')
  })
})
