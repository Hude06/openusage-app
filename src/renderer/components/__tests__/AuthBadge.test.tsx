import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import React from 'react'
import { AuthBadge } from '../AuthBadge'

describe('AuthBadge', () => {
  it('returns null for ok status', () => {
    const { container } = render(<AuthBadge status="ok" />)
    expect(container.firstChild).toBeNull()
  })

  it('renders NO CREDENTIALS for no_token', () => {
    render(<AuthBadge status="no_token" />)
    expect(screen.getByText('NO CREDENTIALS')).toBeInTheDocument()
  })

  it('renders EXPIRED for expired', () => {
    render(<AuthBadge status="expired" />)
    expect(screen.getByText('EXPIRED')).toBeInTheDocument()
  })

  it('renders ERROR for error', () => {
    render(<AuthBadge status="error" />)
    expect(screen.getByText('ERROR')).toBeInTheDocument()
  })

  it('uses warning color for no_token', () => {
    render(<AuthBadge status="no_token" />)
    const el = screen.getByText('NO CREDENTIALS')
    expect(el.style.color).toBe('var(--warning)')
  })

  it('uses accent color for error', () => {
    render(<AuthBadge status="error" />)
    const el = screen.getByText('ERROR')
    expect(el.style.color).toBe('var(--accent)')
  })

  it('renders with pill border radius', () => {
    render(<AuthBadge status="expired" />)
    const el = screen.getByText('EXPIRED')
    expect(el.style.borderRadius).toBe('999px')
  })
})
