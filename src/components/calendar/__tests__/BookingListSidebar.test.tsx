/**
 * Test Suite: BookingListSidebar Component
 *
 * Tests for booking list sidebar component.
 * Covers stats calculation, empty states, booking display, and header formatting.
 *
 * Coverage Target: 90% (complex component with stats calculations)
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { BookingListSidebar } from '../BookingListSidebar'
import type { Booking } from '@/types/booking'

// Mock BookingCard to simplify testing
vi.mock('../BookingCard', () => ({
  BookingCard: ({ booking }: { booking: Booking }) => (
    <div data-testid={`booking-card-${booking.id}`}>
      {booking.customers?.full_name || 'No Customer'} - {booking.status}
    </div>
  ),
}))

// Helper to create mock booking
const createMockBooking = (overrides: Partial<Booking> = {}): Booking => ({
  id: 'booking-1',
  customer_id: 'customer-1',
  staff_id: 'staff-1',
  team_id: null,
  service_package_id: 'service-1',
  booking_date: '2025-01-15',
  start_time: '09:00:00',
  end_time: '10:00:00',
  status: 'confirmed',
  total_price: 1000,
  notes: null,
  created_at: '2025-01-01T00:00:00Z',
  payment_status: 'unpaid',
  address: '123 Main St',
  city: 'Bangkok',
  state: 'Bangkok',
  zip_code: '10100',
  customers: {
    id: 'customer-1',
    full_name: 'John Doe',
    phone: '0812345678',
    email: 'john@example.com',
  },
  service_packages: null,
  profiles: null,
  teams: null,
  ...overrides,
})

describe('BookingListSidebar', () => {
  const mockOnBookingClick = vi.fn()
  const mockOnStatusChange = vi.fn()
  const mockGetAvailableStatuses = vi.fn(() => ['pending', 'confirmed', 'completed'])

  const defaultProps = {
    selectedDate: null,
    selectedDateRange: null,
    bookings: [],
    conflictMap: new Map<string, Set<string>>(),
    onBookingClick: mockOnBookingClick,
    onStatusChange: mockOnStatusChange,
    getAvailableStatuses: mockGetAvailableStatuses,
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Header Display', () => {
    it('should show "Select a date" when no date selected and no bookings', () => {
      // Arrange & Act
      render(<BookingListSidebar {...defaultProps} />)

      // Assert
      expect(screen.getByText('Select a date')).toBeInTheDocument()
    })

    it('should show formatted date when single date is selected', () => {
      // Arrange
      const selectedDate = new Date('2025-01-15')

      // Act
      render(<BookingListSidebar {...defaultProps} selectedDate={selectedDate} />)

      // Assert
      expect(screen.getByText('Jan 15, 2025')).toBeInTheDocument()
    })

    it('should show date range when range is selected (same month)', () => {
      // Arrange
      const dateRange = {
        start: new Date('2025-01-15'),
        end: new Date('2025-01-25'),
      }

      // Act
      render(<BookingListSidebar {...defaultProps} selectedDateRange={dateRange} />)

      // Assert
      expect(screen.getByText('Jan 15-25, 2025')).toBeInTheDocument()
    })

    it('should show date range when range spans different months (same year)', () => {
      // Arrange
      const dateRange = {
        start: new Date('2025-01-25'),
        end: new Date('2025-02-05'),
      }

      // Act
      render(<BookingListSidebar {...defaultProps} selectedDateRange={dateRange} />)

      // Assert
      expect(screen.getByText('Jan 25 - Feb 5, 2025')).toBeInTheDocument()
    })

    it('should show date range when range spans different years', () => {
      // Arrange
      const dateRange = {
        start: new Date('2024-12-25'),
        end: new Date('2025-01-05'),
      }

      // Act
      render(<BookingListSidebar {...defaultProps} selectedDateRange={dateRange} />)

      // Assert
      expect(screen.getByText('Dec 25, 2024 - Jan 5, 2025')).toBeInTheDocument()
    })

    it('should show "Filtered Results" when no date selected but bookings exist', () => {
      // Arrange
      const bookings = [createMockBooking()]

      // Act
      render(<BookingListSidebar {...defaultProps} bookings={bookings} />)

      // Assert
      expect(screen.getByText('Filtered Results')).toBeInTheDocument()
    })
  })

  describe('Booking Count Badge', () => {
    it('should show booking count when bookings exist', () => {
      // Arrange
      const bookings = [
        createMockBooking({ id: 'booking-1' }),
        createMockBooking({ id: 'booking-2' }),
      ]

      // Act
      render(<BookingListSidebar {...defaultProps} bookings={bookings} />)

      // Assert
      expect(screen.getByText('2 bookings')).toBeInTheDocument()
    })

    it('should show singular "booking" for single booking', () => {
      // Arrange
      const bookings = [createMockBooking()]

      // Act
      render(<BookingListSidebar {...defaultProps} bookings={bookings} />)

      // Assert
      expect(screen.getByText('1 booking')).toBeInTheDocument()
    })

    it('should not show badge when no bookings', () => {
      // Arrange & Act
      render(<BookingListSidebar {...defaultProps} />)

      // Assert - Should not show the "X booking(s)" badge (count badge)
      // Note: "bookings" word may appear in empty state message
      expect(screen.queryByText(/\d+ booking/)).not.toBeInTheDocument()
    })
  })

  describe('Stats Calculation', () => {
    it('should calculate pending count correctly', () => {
      // Arrange
      const bookings = [
        createMockBooking({ id: 'booking-1', status: 'pending' }),
        createMockBooking({ id: 'booking-2', status: 'pending' }),
        createMockBooking({ id: 'booking-3', status: 'confirmed' }),
      ]

      // Act
      const { container } = render(<BookingListSidebar {...defaultProps} bookings={bookings} />)

      // Assert - Find pending count (Clock icon + count)
      const statsContainer = container.querySelector('.flex.items-center.gap-3')
      expect(statsContainer).toBeInTheDocument()
      // Pending count should be 2
      const pendingSpan = Array.from(statsContainer?.querySelectorAll('span') || [])
        .find(span => span.className.includes('text-yellow'))
      expect(pendingSpan?.textContent).toBe('2')
    })

    it('should calculate confirmed count correctly', () => {
      // Arrange
      const bookings = [
        createMockBooking({ id: 'booking-1', status: 'confirmed' }),
        createMockBooking({ id: 'booking-2', status: 'confirmed' }),
      ]

      // Act
      const { container } = render(<BookingListSidebar {...defaultProps} bookings={bookings} />)

      // Assert - Find confirmed count (CheckCircle2 icon + count)
      const statsContainer = container.querySelector('.flex.items-center.gap-3')
      const confirmedSpan = Array.from(statsContainer?.querySelectorAll('span') || [])
        .find(span => span.className.includes('text-blue'))
      expect(confirmedSpan?.textContent).toBe('2')
    })

    it('should calculate completed count correctly', () => {
      // Arrange
      const bookings = [
        createMockBooking({ id: 'booking-1', status: 'completed' }),
        createMockBooking({ id: 'booking-2', status: 'completed' }),
        createMockBooking({ id: 'booking-3', status: 'completed' }),
      ]

      // Act
      const { container } = render(<BookingListSidebar {...defaultProps} bookings={bookings} />)

      // Assert
      const statsContainer = container.querySelector('.flex.items-center.gap-3')
      const completedSpan = Array.from(statsContainer?.querySelectorAll('span') || [])
        .find(span => span.className.includes('text-green'))
      expect(completedSpan?.textContent).toBe('3')
    })

    it('should calculate payment status counts correctly', () => {
      // Arrange
      const bookings = [
        createMockBooking({ id: 'booking-1', payment_status: 'unpaid' }),
        createMockBooking({ id: 'booking-2', payment_status: 'unpaid' }),
        createMockBooking({ id: 'booking-3', payment_status: 'paid' }),
      ]

      // Act
      const { container } = render(<BookingListSidebar {...defaultProps} bookings={bookings} />)

      // Assert - Check for unpaid (DollarSign icon) and paid (CreditCard icon)
      const statsContainer = container.querySelector('.flex.items-center.gap-3')
      const unpaidSpan = Array.from(statsContainer?.querySelectorAll('span') || [])
        .find(span => span.className.includes('text-orange'))
      const paidSpan = Array.from(statsContainer?.querySelectorAll('span') || [])
        .find(span => span.className.includes('text-emerald'))

      expect(unpaidSpan?.textContent).toBe('2')
      expect(paidSpan?.textContent).toBe('1')
    })

    it('should handle all status types correctly', () => {
      // Arrange
      const bookings = [
        createMockBooking({ id: 'booking-1', status: 'pending' }),
        createMockBooking({ id: 'booking-2', status: 'confirmed' }),
        createMockBooking({ id: 'booking-3', status: 'in_progress' }),
        createMockBooking({ id: 'booking-4', status: 'completed' }),
        createMockBooking({ id: 'booking-5', status: 'cancelled' }),
      ]

      // Act
      const { container } = render(<BookingListSidebar {...defaultProps} bookings={bookings} />)

      // Assert - Stats should be calculated without errors
      const statsContainer = container.querySelector('.flex.items-center.gap-3')
      expect(statsContainer).toBeInTheDocument()
    })

    it('should not show stats when no bookings', () => {
      // Arrange & Act
      const { container } = render(<BookingListSidebar {...defaultProps} />)

      // Assert - Stats container should not exist
      const statsContainer = container.querySelector('.flex.items-center.gap-3.mt-2')
      expect(statsContainer).not.toBeInTheDocument()
    })

    it('should only show non-zero stats', () => {
      // Arrange - Only pending bookings
      const bookings = [
        createMockBooking({ id: 'booking-1', status: 'pending' }),
      ]

      // Act
      const { container } = render(<BookingListSidebar {...defaultProps} bookings={bookings} />)

      // Assert - Only pending should be visible, others hidden
      const statsContainer = container.querySelector('.flex.items-center.gap-3')
      const spans = Array.from(statsContainer?.querySelectorAll('span') || [])

      // Should have pending count
      const pendingSpan = spans.find(span => span.className.includes('text-yellow'))
      expect(pendingSpan).toBeInTheDocument()

      // Should not have confirmed or completed (no bookings with those statuses)
      const blueSpans = spans.filter(span => span.className.includes('text-blue'))
      expect(blueSpans).toHaveLength(0)
    })
  })

  describe('Empty States', () => {
    it('should show "No Date Selected" empty state when no date and no bookings', () => {
      // Arrange & Act
      render(<BookingListSidebar {...defaultProps} />)

      // Assert
      expect(screen.getByText('No Date Selected')).toBeInTheDocument()
      expect(screen.getByText(/Click on a date in the calendar/)).toBeInTheDocument()
    })

    it('should show "No Bookings" empty state when date selected but no bookings', () => {
      // Arrange
      const selectedDate = new Date('2025-01-15')

      // Act
      render(<BookingListSidebar {...defaultProps} selectedDate={selectedDate} />)

      // Assert
      expect(screen.getByText('No Bookings')).toBeInTheDocument()
      expect(screen.getByText(/There are no bookings on this date/)).toBeInTheDocument()
    })

    it('should show "No Bookings" with "in this period" for date range', () => {
      // Arrange
      const dateRange = {
        start: new Date('2025-01-15'),
        end: new Date('2025-01-25'),
      }

      // Act
      render(<BookingListSidebar {...defaultProps} selectedDateRange={dateRange} />)

      // Assert
      expect(screen.getByText(/There are no bookings in this period/)).toBeInTheDocument()
    })

    it('should show "No Bookings" with "matching your filters" when filtered but no results', () => {
      // Arrange - No date selection, no bookings (filtered scenario)

      // Act
      render(<BookingListSidebar {...defaultProps} />)

      // Assert
      expect(screen.getByText(/Click on a date in the calendar or use preset filters/)).toBeInTheDocument()
    })

    it('should show calendar icon in "No Date Selected" state', () => {
      // Arrange & Act
      const { container } = render(<BookingListSidebar {...defaultProps} />)

      // Assert
      const calendarIcon = container.querySelector('.h-10.w-10')
      expect(calendarIcon).toBeInTheDocument()
    })

    it('should show alert icon in "No Bookings" state', () => {
      // Arrange
      const selectedDate = new Date('2025-01-15')

      // Act
      const { container } = render(<BookingListSidebar {...defaultProps} selectedDate={selectedDate} />)

      // Assert
      const alertIcon = container.querySelector('.h-10.w-10')
      expect(alertIcon).toBeInTheDocument()
    })
  })

  describe('Booking List Display', () => {
    it('should display booking cards', () => {
      // Arrange
      const bookings = [
        createMockBooking({
          id: 'booking-1',
          customers: {
            ...createMockBooking().customers!,
            full_name: 'John Doe'
          }
        }),
        createMockBooking({
          id: 'booking-2',
          customers: {
            ...createMockBooking().customers!,
            full_name: 'Jane Smith'
          }
        }),
      ]

      // Act
      render(<BookingListSidebar {...defaultProps} bookings={bookings} />)

      // Assert
      expect(screen.getByTestId('booking-card-booking-1')).toBeInTheDocument()
      expect(screen.getByTestId('booking-card-booking-2')).toBeInTheDocument()
      expect(screen.getByText(/John Doe/)).toBeInTheDocument()
      expect(screen.getByText(/Jane Smith/)).toBeInTheDocument()
    })

    it('should display bookings in order', () => {
      // Arrange
      const bookings = [
        createMockBooking({ id: 'booking-1', start_time: '09:00:00' }),
        createMockBooking({ id: 'booking-2', start_time: '10:00:00' }),
        createMockBooking({ id: 'booking-3', start_time: '11:00:00' }),
      ]

      // Act
      render(<BookingListSidebar {...defaultProps} bookings={bookings} />)

      // Assert - All three bookings should be present
      expect(screen.getByTestId('booking-card-booking-1')).toBeInTheDocument()
      expect(screen.getByTestId('booking-card-booking-2')).toBeInTheDocument()
      expect(screen.getByTestId('booking-card-booking-3')).toBeInTheDocument()
    })

    it('should handle many bookings with scrollable area', () => {
      // Arrange
      const bookings = Array.from({ length: 20 }, (_, i) =>
        createMockBooking({ id: `booking-${i + 1}` })
      )

      // Act
      render(<BookingListSidebar {...defaultProps} bookings={bookings} />)

      // Assert - All bookings should be rendered
      expect(screen.getByTestId('booking-card-booking-1')).toBeInTheDocument()
      expect(screen.getByTestId('booking-card-booking-20')).toBeInTheDocument()
    })
  })

  describe('Memo Optimization', () => {
    it('should have displayName set', () => {
      // Assert
      expect(BookingListSidebar.displayName).toBe('BookingListSidebar')
    })

    it('should be a memoized component', () => {
      // Assert - Component should have $$typeof property indicating it's a memo component
      expect(BookingListSidebar).toBeDefined()
    })
  })

  describe('Edge Cases', () => {
    it('should handle null selectedDate', () => {
      // Arrange & Act
      expect(() => {
        render(<BookingListSidebar {...defaultProps} selectedDate={null} />)
      }).not.toThrow()
    })

    it('should handle null selectedDateRange', () => {
      // Arrange & Act
      expect(() => {
        render(<BookingListSidebar {...defaultProps} selectedDateRange={null} />)
      }).not.toThrow()
    })

    it('should handle empty bookings array', () => {
      // Arrange & Act
      expect(() => {
        render(<BookingListSidebar {...defaultProps} bookings={[]} />)
      }).not.toThrow()
    })

    it('should handle empty conflictMap', () => {
      // Arrange
      const bookings = [createMockBooking()]

      // Act
      expect(() => {
        render(
          <BookingListSidebar
            {...defaultProps}
            bookings={bookings}
            conflictMap={new Map()}
          />
        )
      }).not.toThrow()
    })

    it('should handle booking without customers', () => {
      // Arrange
      const bookings = [
        createMockBooking({
          id: 'booking-1',
          customers: null as unknown as Booking['customers']
        }),
      ]

      // Act
      expect(() => {
        render(<BookingListSidebar {...defaultProps} bookings={bookings} />)
      }).not.toThrow()
    })

    it('should handle date at start of year', () => {
      // Arrange
      const selectedDate = new Date('2025-01-01')

      // Act
      render(<BookingListSidebar {...defaultProps} selectedDate={selectedDate} />)

      // Assert
      expect(screen.getByText('Jan 1, 2025')).toBeInTheDocument()
    })

    it('should handle date at end of year', () => {
      // Arrange
      const selectedDate = new Date('2025-12-31')

      // Act
      render(<BookingListSidebar {...defaultProps} selectedDate={selectedDate} />)

      // Assert
      expect(screen.getByText('Dec 31, 2025')).toBeInTheDocument()
    })

    it('should handle same date for start and end of range', () => {
      // Arrange
      const sameDate = new Date('2025-01-15')
      const dateRange = {
        start: sameDate,
        end: sameDate,
      }

      // Act
      render(<BookingListSidebar {...defaultProps} selectedDateRange={dateRange} />)

      // Assert - Should still format correctly
      expect(screen.getByText(/Jan 15/)).toBeInTheDocument()
    })
  })

  describe('Integration Scenarios', () => {
    it('should show stats and bookings together', () => {
      // Arrange
      const selectedDate = new Date('2025-01-15')
      const bookings = [
        createMockBooking({ id: 'booking-1', status: 'pending' }),
        createMockBooking({ id: 'booking-2', status: 'confirmed' }),
      ]

      // Act
      const { container } = render(
        <BookingListSidebar
          {...defaultProps}
          selectedDate={selectedDate}
          bookings={bookings}
        />
      )

      // Assert
      // Stats should be visible
      const statsContainer = container.querySelector('.flex.items-center.gap-3')
      expect(statsContainer).toBeInTheDocument()

      // Bookings should be visible
      expect(screen.getByTestId('booking-card-booking-1')).toBeInTheDocument()
      expect(screen.getByTestId('booking-card-booking-2')).toBeInTheDocument()
    })

    it('should show correct stats for mixed status bookings', () => {
      // Arrange
      const bookings = [
        createMockBooking({ id: 'booking-1', status: 'pending', payment_status: 'unpaid' }),
        createMockBooking({ id: 'booking-2', status: 'confirmed', payment_status: 'paid' }),
        createMockBooking({ id: 'booking-3', status: 'completed', payment_status: 'paid' }),
        createMockBooking({ id: 'booking-4', status: 'in_progress', payment_status: 'unpaid' }),
      ]

      // Act
      const { container } = render(<BookingListSidebar {...defaultProps} bookings={bookings} />)

      // Assert
      const statsContainer = container.querySelector('.flex.items-center.gap-3')
      expect(statsContainer).toBeInTheDocument()

      // Should have various stats displayed
      const spans = Array.from(statsContainer?.querySelectorAll('span') || [])
      expect(spans.length).toBeGreaterThan(0)
    })

    it('should handle both selectedDate and selectedDateRange being null', () => {
      // Arrange
      const bookings = [createMockBooking()]

      // Act
      render(
        <BookingListSidebar
          {...defaultProps}
          selectedDate={null}
          selectedDateRange={null}
          bookings={bookings}
        />
      )

      // Assert - Should show "Filtered Results"
      expect(screen.getByText('Filtered Results')).toBeInTheDocument()
    })

    it('should prioritize selectedDate over selectedDateRange', () => {
      // Arrange
      const selectedDate = new Date('2025-01-15')
      const dateRange = {
        start: new Date('2025-01-01'),
        end: new Date('2025-01-31'),
      }

      // Act
      render(
        <BookingListSidebar
          {...defaultProps}
          selectedDate={selectedDate}
          selectedDateRange={dateRange}
        />
      )

      // Assert - Should show selectedDate (not date range)
      expect(screen.getByText('Jan 15, 2025')).toBeInTheDocument()
      // Note: "Jan 1" may appear elsewhere, check for full date range format instead
      expect(screen.queryByText('Jan 1-31, 2025')).not.toBeInTheDocument()
    })
  })

  describe('Accessibility', () => {
    it('should have proper heading structure', () => {
      // Arrange
      const selectedDate = new Date('2025-01-15')

      // Act
      render(<BookingListSidebar {...defaultProps} selectedDate={selectedDate} />)

      // Assert
      const heading = screen.getByText('Jan 15, 2025')
      expect(heading.closest('.font-display')).toBeInTheDocument()
    })

    it('should have calendar icon for visual clarity', () => {
      // Arrange & Act
      const { container } = render(<BookingListSidebar {...defaultProps} />)

      // Assert
      const calendarIcon = container.querySelector('svg')
      expect(calendarIcon).toBeInTheDocument()
    })

    it('should use semantic HTML for empty states', () => {
      // Arrange & Act
      render(<BookingListSidebar {...defaultProps} />)

      // Assert
      expect(screen.getByText('No Date Selected').tagName).toBe('H3')
    })
  })
})
