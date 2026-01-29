/**
 * Tests for BookingSearchHeader component
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { BookingSearchHeader } from '../booking-search-header'

describe('BookingSearchHeader', () => {
  const defaultProps = {
    searchInput: '',
    onSearchChange: vi.fn(),
    onClear: vi.fn(),
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should render title and search input', () => {
    render(<BookingSearchHeader {...defaultProps} />)

    expect(screen.getByText('My Bookings')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('Search bookings...')).toBeInTheDocument()
  })

  it('should call onSearchChange when typing', async () => {
    render(<BookingSearchHeader {...defaultProps} />)

    const input = screen.getByPlaceholderText('Search bookings...')
    await userEvent.type(input, 'test')

    expect(defaultProps.onSearchChange).toHaveBeenCalled()
  })

  it('should show clear button when searchInput is non-empty', () => {
    render(<BookingSearchHeader {...defaultProps} searchInput="hello" />)

    expect(screen.getByTitle('Clear search')).toBeInTheDocument()
  })

  it('should not show clear button when searchInput is empty', () => {
    render(<BookingSearchHeader {...defaultProps} searchInput="" />)

    expect(screen.queryByTitle('Clear search')).not.toBeInTheDocument()
  })

  it('should call onClear when clear button clicked', async () => {
    render(<BookingSearchHeader {...defaultProps} searchInput="hello" />)

    await userEvent.click(screen.getByTitle('Clear search'))

    expect(defaultProps.onClear).toHaveBeenCalled()
  })

  it('should have accessible search label', () => {
    render(<BookingSearchHeader {...defaultProps} />)

    expect(screen.getByLabelText('Search bookings by ID, customer, package, address, or status')).toBeInTheDocument()
  })
})
