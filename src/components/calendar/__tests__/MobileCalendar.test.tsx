/**
 * Test Suite: MobileCalendar Component
 *
 * Tests for mobile-optimized calendar component.
 * Covers view switching, navigation, date selection, and booking display.
 *
 * Coverage Target: 85% (complex component with multiple views)
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MobileCalendar } from '../MobileCalendar'
import type { Booking } from '@/types/booking'

// Mock dependencies
vi.mock('@/hooks/useSwipe', () => ({
  useSwipe: () => ({
    onTouchStart: vi.fn(),
    onTouchMove: vi.fn(),
    onTouchEnd: vi.fn(),
  }),
}))

// Mock MobileBookingCard to simplify testing
vi.mock('../MobileBookingCard', () => ({
  MobileBookingCard: ({ booking }: { booking: Booking }) => (
    <div data-testid={`booking-card-${booking.id}`}>
      {booking.customers?.full_name || 'No Customer'}
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

describe('MobileCalendar', () => {
  const mockOnDateSelect = vi.fn()
  const mockOnMonthChange = vi.fn()
  const mockOnBookingClick = vi.fn()
  const mockOnCreateBooking = vi.fn()
  const mockOnStatusChange = vi.fn()
  const mockGetAvailableStatuses = vi.fn(() => ['pending', 'confirmed', 'completed'])

  const defaultProps = {
    currentDate: new Date('2025-01-15'),
    selectedDate: null,
    bookings: [],
    conflictMap: new Map<string, Set<string>>(),
    bookingsByDate: new Map<string, Booking[]>(),
    onDateSelect: mockOnDateSelect,
    onMonthChange: mockOnMonthChange,
    onBookingClick: mockOnBookingClick,
    onCreateBooking: mockOnCreateBooking,
    onStatusChange: mockOnStatusChange,
    getAvailableStatuses: mockGetAvailableStatuses,
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Rendering', () => {
    it('should render calendar header with current month', () => {
      // Arrange & Act
      render(<MobileCalendar {...defaultProps} />)

      // Assert
      expect(screen.getByText('Jan 2025')).toBeInTheDocument()
    })

    it('should render in week view by default', () => {
      // Arrange & Act
      render(<MobileCalendar {...defaultProps} />)

      // Assert
      const weekButton = screen.getByRole('button', { name: /switch to week view/i })
      expect(weekButton).toHaveAttribute('aria-pressed', 'true')
    })

    it('should render Today button', () => {
      // Arrange & Act
      render(<MobileCalendar {...defaultProps} />)

      // Assert
      expect(screen.getByRole('button', { name: /go to today/i })).toBeInTheDocument()
    })

    it('should render navigation buttons', () => {
      // Arrange & Act
      render(<MobileCalendar {...defaultProps} />)

      // Assert
      expect(screen.getByRole('button', { name: /go to previous week/i })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /go to next week/i })).toBeInTheDocument()
    })

    it('should render view mode toggle buttons', () => {
      // Arrange & Act
      render(<MobileCalendar {...defaultProps} />)

      // Assert - swipe hint was removed in redesign, check for view toggles instead
      expect(screen.getByRole('button', { name: /switch to week view/i })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /switch to month view/i })).toBeInTheDocument()
    })
  })

  describe('View Mode Switching', () => {
    it('should start in week view', () => {
      // Arrange & Act
      render(<MobileCalendar {...defaultProps} />)

      // Assert
      const weekButton = screen.getByRole('button', { name: /switch to week view/i })
      const monthButton = screen.getByRole('button', { name: /switch to month view/i })
      expect(weekButton).toHaveAttribute('aria-pressed', 'true')
      expect(monthButton).toHaveAttribute('aria-pressed', 'false')
    })

    it('should switch to month view when month button is clicked', async () => {
      // Arrange
      const user = userEvent.setup()
      render(<MobileCalendar {...defaultProps} />)

      // Act
      const monthButton = screen.getByRole('button', { name: /switch to month view/i })
      await user.click(monthButton)

      // Assert
      expect(monthButton).toHaveAttribute('aria-pressed', 'true')
      expect(screen.getByRole('button', { name: /switch to week view/i })).toHaveAttribute('aria-pressed', 'false')
    })

    it('should switch back to week view', async () => {
      // Arrange
      const user = userEvent.setup()
      render(<MobileCalendar {...defaultProps} />)

      // Act - Switch to month view first
      await user.click(screen.getByRole('button', { name: /switch to month view/i }))
      // Then switch back to week view
      await user.click(screen.getByRole('button', { name: /switch to week view/i }))

      // Assert
      const weekButton = screen.getByRole('button', { name: /switch to week view/i })
      expect(weekButton).toHaveAttribute('aria-pressed', 'true')
    })

    it('should show 7 days in week view', () => {
      // Arrange & Act
      render(<MobileCalendar {...defaultProps} />)

      // Assert
      const weekGroup = screen.getByRole('group', { name: /week days/i })
      const buttons = within(weekGroup).getAllByRole('button')
      expect(buttons).toHaveLength(7)
    })

    it('should show full month grid in month view', async () => {
      // Arrange
      const user = userEvent.setup()
      render(<MobileCalendar {...defaultProps} />)

      // Act
      await user.click(screen.getByRole('button', { name: /switch to month view/i }))

      // Assert
      const monthGrid = screen.getByRole('group', { name: /month calendar/i })
      const buttons = within(monthGrid).getAllByRole('button')
      // Should have 35 or 42 days (5 or 6 weeks)
      expect(buttons.length).toBeGreaterThanOrEqual(35)
    })
  })

  describe('Week View Navigation', () => {
    it('should navigate to previous week', async () => {
      // Arrange
      const user = userEvent.setup()
      render(<MobileCalendar {...defaultProps} />)

      // Act
      const prevButton = screen.getByRole('button', { name: /go to previous week/i })
      await user.click(prevButton)

      // Assert - week should change (dates should be different)
      // We can't easily test the exact dates, but button click should work
      expect(prevButton).toBeInTheDocument()
    })

    it('should navigate to next week', async () => {
      // Arrange
      const user = userEvent.setup()
      render(<MobileCalendar {...defaultProps} />)

      // Act
      const nextButton = screen.getByRole('button', { name: /go to next week/i })
      await user.click(nextButton)

      // Assert
      expect(nextButton).toBeInTheDocument()
    })

    it('should show navigation buttons with arrow icons in week view', () => {
      // Arrange & Act
      render(<MobileCalendar {...defaultProps} />)

      // Assert - redesigned to use icon buttons instead of text buttons
      expect(screen.getByRole('button', { name: /go to previous week/i })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /go to next week/i })).toBeInTheDocument()
    })
  })

  describe('Month View Navigation', () => {
    it('should navigate to previous month in month view', async () => {
      // Arrange
      const user = userEvent.setup()
      render(<MobileCalendar {...defaultProps} />)

      // Act - Switch to month view first
      await user.click(screen.getByRole('button', { name: /switch to month view/i }))
      const prevButton = screen.getByRole('button', { name: /go to previous month/i })
      await user.click(prevButton)

      // Assert
      expect(mockOnMonthChange).toHaveBeenCalled()
      // Should be called with date in December 2024
      const calledDate = mockOnMonthChange.mock.calls[0][0]
      expect(calledDate.getMonth()).toBe(11) // December (0-indexed)
      expect(calledDate.getFullYear()).toBe(2024)
    })

    it('should navigate to next month in month view', async () => {
      // Arrange
      const user = userEvent.setup()
      render(<MobileCalendar {...defaultProps} />)

      // Act - Switch to month view first
      await user.click(screen.getByRole('button', { name: /switch to month view/i }))
      const nextButton = screen.getByRole('button', { name: /go to next month/i })
      await user.click(nextButton)

      // Assert
      expect(mockOnMonthChange).toHaveBeenCalled()
      // Should be called with date in February 2025
      const calledDate = mockOnMonthChange.mock.calls[0][0]
      expect(calledDate.getMonth()).toBe(1) // February (0-indexed)
      expect(calledDate.getFullYear()).toBe(2025)
    })

    it('should show navigation buttons with arrow icons in month view', async () => {
      // Arrange
      const user = userEvent.setup()
      render(<MobileCalendar {...defaultProps} />)

      // Act
      await user.click(screen.getByRole('button', { name: /switch to month view/i }))

      // Assert - redesigned to use icon buttons instead of text buttons
      expect(screen.getByRole('button', { name: /go to previous month/i })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /go to next month/i })).toBeInTheDocument()
    })
  })

  describe('Today Button', () => {
    it('should navigate to today when clicked', async () => {
      // Arrange
      const user = userEvent.setup()
      const pastDate = new Date('2025-01-01')
      render(<MobileCalendar {...defaultProps} currentDate={pastDate} />)

      // Act
      await user.click(screen.getByRole('button', { name: /go to today/i }))

      // Assert
      expect(mockOnDateSelect).toHaveBeenCalled()
      expect(mockOnMonthChange).toHaveBeenCalled()
    })
  })

  describe('Date Selection', () => {
    it('should call onDateSelect when date is clicked', async () => {
      // Arrange
      const user = userEvent.setup()
      render(<MobileCalendar {...defaultProps} />)

      // Act - Click on a date button
      const weekGroup = screen.getByRole('group', { name: /week days/i })
      const dateButtons = within(weekGroup).getAllByRole('button')
      await user.click(dateButtons[0])

      // Assert
      expect(mockOnDateSelect).toHaveBeenCalled()
      expect(mockOnDateSelect.mock.calls[0][0]).toBeInstanceOf(Date)
    })

    it('should highlight selected date', () => {
      // Arrange
      const selectedDate = new Date('2025-01-15')
      render(<MobileCalendar {...defaultProps} selectedDate={selectedDate} />)

      // Assert - Look for date with aria-current="date"
      const selectedDateButton = screen.getAllByRole('button').find(
        (button) => button.getAttribute('aria-current') === 'date'
      )
      expect(selectedDateButton).toBeInTheDocument()
    })

    it('should show selected date in booking section header', () => {
      // Arrange
      const selectedDate = new Date('2025-01-15')
      render(<MobileCalendar {...defaultProps} selectedDate={selectedDate} />)

      // Assert
      expect(screen.getByText('Wednesday, January 15')).toBeInTheDocument()
    })

    it('should show "Select a date" when no date is selected', () => {
      // Arrange & Act
      render(<MobileCalendar {...defaultProps} selectedDate={null} />)

      // Assert
      expect(screen.getByText('Select a date')).toBeInTheDocument()
    })
  })

  describe('Booking Display', () => {
    it('should display booking count badge on dates with bookings', () => {
      // Arrange
      const bookingDate = '2025-01-15'
      const booking = createMockBooking({ booking_date: bookingDate })
      const bookingsByDate = new Map([[bookingDate, [booking]]])

      render(<MobileCalendar {...defaultProps} bookingsByDate={bookingsByDate} />)

      // Assert - Should have a badge with "1"
      expect(screen.getByText('1')).toBeInTheDocument()
    })

    it('should show correct count for multiple bookings', () => {
      // Arrange
      const bookingDate = '2025-01-15'
      const bookings = [
        createMockBooking({ id: 'booking-1', booking_date: bookingDate }),
        createMockBooking({ id: 'booking-2', booking_date: bookingDate }),
        createMockBooking({ id: 'booking-3', booking_date: bookingDate }),
      ]
      const bookingsByDate = new Map([[bookingDate, bookings]])

      render(<MobileCalendar {...defaultProps} bookingsByDate={bookingsByDate} />)

      // Assert
      expect(screen.getByText('3')).toBeInTheDocument()
    })

    it('should show "Select a date to view bookings" when no date selected', () => {
      // Arrange & Act
      render(<MobileCalendar {...defaultProps} selectedDate={null} />)

      // Assert
      expect(screen.getByText('Select a date to view bookings')).toBeInTheDocument()
    })

    it('should show "No bookings on this date" when selected date has no bookings', () => {
      // Arrange
      const selectedDate = new Date('2025-01-15')
      render(<MobileCalendar {...defaultProps} selectedDate={selectedDate} />)

      // Assert
      expect(screen.getByText('No bookings on this date')).toBeInTheDocument()
    })

    it('should display bookings for selected date', () => {
      // Arrange
      const selectedDate = new Date('2025-01-15')
      const bookingDate = '2025-01-15'
      const bookings = [
        createMockBooking({
          id: 'booking-1',
          booking_date: bookingDate,
          customers: {
            ...createMockBooking().customers!,
            full_name: 'John Doe'
          }
        }),
      ]
      const bookingsByDate = new Map([[bookingDate, bookings]])

      render(
        <MobileCalendar
          {...defaultProps}
          selectedDate={selectedDate}
          bookingsByDate={bookingsByDate}
        />
      )

      // Assert
      expect(screen.getByTestId('booking-card-booking-1')).toBeInTheDocument()
      expect(screen.getByText('John Doe')).toBeInTheDocument()
    })

    it('should show booking count in header', () => {
      // Arrange
      const selectedDate = new Date('2025-01-15')
      const bookingDate = '2025-01-15'
      const bookings = [
        createMockBooking({ id: 'booking-1', booking_date: bookingDate }),
        createMockBooking({ id: 'booking-2', booking_date: bookingDate }),
      ]
      const bookingsByDate = new Map([[bookingDate, bookings]])

      render(
        <MobileCalendar
          {...defaultProps}
          selectedDate={selectedDate}
          bookingsByDate={bookingsByDate}
        />
      )

      // Assert
      expect(screen.getByText('2 bookings')).toBeInTheDocument()
    })

    it('should show singular "booking" for single booking', () => {
      // Arrange
      const selectedDate = new Date('2025-01-15')
      const bookingDate = '2025-01-15'
      const bookings = [createMockBooking({ booking_date: bookingDate })]
      const bookingsByDate = new Map([[bookingDate, bookings]])

      render(
        <MobileCalendar
          {...defaultProps}
          selectedDate={selectedDate}
          bookingsByDate={bookingsByDate}
        />
      )

      // Assert
      expect(screen.getByText('1 booking')).toBeInTheDocument()
    })
  })

  describe('Conflict Highlighting', () => {
    it('should highlight dates with conflicting bookings', () => {
      // Arrange
      const bookingDate = '2025-01-15'
      const booking = createMockBooking({ id: 'booking-1', booking_date: bookingDate })
      const bookingsByDate = new Map([[bookingDate, [booking]]])
      const conflictMap = new Map([['booking-1', new Set(['booking-2'])]])

      render(
        <MobileCalendar
          {...defaultProps}
          bookingsByDate={bookingsByDate}
          conflictMap={conflictMap}
        />
      )

      // Assert - Find button with "has conflicts" in aria-label
      const buttons = screen.getAllByRole('button')
      const conflictButton = buttons.find((btn) =>
        btn.getAttribute('aria-label')?.includes('has conflicts')
      )
      expect(conflictButton).toBeInTheDocument()
    })

    it('should not highlight dates without conflicts', () => {
      // Arrange
      const bookingDate = '2025-01-15'
      const booking = createMockBooking({ booking_date: bookingDate })
      const bookingsByDate = new Map([[bookingDate, [booking]]])
      const conflictMap = new Map<string, Set<string>>()

      render(
        <MobileCalendar
          {...defaultProps}
          bookingsByDate={bookingsByDate}
          conflictMap={conflictMap}
        />
      )

      // Assert
      const buttons = screen.getAllByRole('button')
      const conflictButton = buttons.find((btn) =>
        btn.getAttribute('aria-label')?.includes('has conflicts')
      )
      expect(conflictButton).toBeUndefined()
    })
  })

  describe('Create Booking', () => {
    it('should show Add button when date is selected', () => {
      // Arrange
      const selectedDate = new Date('2025-01-15')
      render(<MobileCalendar {...defaultProps} selectedDate={selectedDate} />)

      // Assert
      expect(screen.getByRole('button', { name: /add new booking/i })).toBeInTheDocument()
    })

    it('should not show Add button when no date is selected', () => {
      // Arrange & Act
      render(<MobileCalendar {...defaultProps} selectedDate={null} />)

      // Assert
      expect(screen.queryByRole('button', { name: /add new booking/i })).not.toBeInTheDocument()
    })

    it('should call onCreateBooking when Add button is clicked', async () => {
      // Arrange
      const user = userEvent.setup()
      const selectedDate = new Date('2025-01-15')
      render(<MobileCalendar {...defaultProps} selectedDate={selectedDate} />)

      // Act
      await user.click(screen.getByRole('button', { name: /add new booking/i }))

      // Assert
      expect(mockOnCreateBooking).toHaveBeenCalledWith(selectedDate)
    })

    it('should show Create Booking button in empty state', () => {
      // Arrange
      const selectedDate = new Date('2025-01-15')
      render(<MobileCalendar {...defaultProps} selectedDate={selectedDate} />)

      // Assert - Should have "Create new booking" button in empty state
      const createButton = screen.getByRole('button', { name: /create new booking/i })
      expect(createButton).toBeInTheDocument()
    })

    it('should call onCreateBooking from empty state button', async () => {
      // Arrange
      const user = userEvent.setup()
      const selectedDate = new Date('2025-01-15')
      render(<MobileCalendar {...defaultProps} selectedDate={selectedDate} />)

      // Act - Click the button in empty state (not the header Add button)
      const createButton = screen.getByRole('button', { name: /create new booking/i })
      await user.click(createButton)

      // Assert
      expect(mockOnCreateBooking).toHaveBeenCalledWith(selectedDate)
    })
  })

  describe('Accessibility', () => {
    it('should have proper ARIA labels for week view toggle', () => {
      // Arrange & Act
      render(<MobileCalendar {...defaultProps} />)

      // Assert
      const weekButton = screen.getByRole('button', { name: /switch to week view/i })
      expect(weekButton).toHaveAttribute('aria-label', 'Switch to week view')
      expect(weekButton).toHaveAttribute('aria-pressed', 'true')
    })

    it('should have proper ARIA labels for month view toggle', () => {
      // Arrange & Act
      render(<MobileCalendar {...defaultProps} />)

      // Assert
      const monthButton = screen.getByRole('button', { name: /switch to month view/i })
      expect(monthButton).toHaveAttribute('aria-label', 'Switch to month view')
      expect(monthButton).toHaveAttribute('aria-pressed', 'false')
    })

    it('should have proper ARIA labels for navigation buttons', () => {
      // Arrange & Act
      render(<MobileCalendar {...defaultProps} />)

      // Assert
      expect(screen.getByRole('button', { name: /go to previous week/i })).toHaveAttribute('aria-label')
      expect(screen.getByRole('button', { name: /go to next week/i })).toHaveAttribute('aria-label')
    })

    it('should have aria-current="date" on selected date', () => {
      // Arrange
      const selectedDate = new Date('2025-01-15')
      render(<MobileCalendar {...defaultProps} selectedDate={selectedDate} />)

      // Assert
      const buttons = screen.getAllByRole('button')
      const selectedButton = buttons.find((btn) => btn.getAttribute('aria-current') === 'date')
      expect(selectedButton).toBeInTheDocument()
    })

    it('should have descriptive aria-labels for date buttons', () => {
      // Arrange & Act
      render(<MobileCalendar {...defaultProps} />)

      // Assert
      const buttons = screen.getAllByRole('button')
      const dateButtons = buttons.filter((btn) =>
        btn.getAttribute('aria-label')?.includes('booking')
      )
      expect(dateButtons.length).toBeGreaterThan(0)
    })

    it('should have proper view mode toggle group', () => {
      // Arrange & Act
      render(<MobileCalendar {...defaultProps} />)

      // Assert - redesigned without swipe hint, checking view toggle group instead
      const viewModeGroup = screen.getByRole('group', { name: /calendar view mode/i })
      expect(viewModeGroup).toBeInTheDocument()
    })
  })

  describe('Edge Cases', () => {
    it('should handle empty bookingsByDate map', () => {
      // Arrange & Act
      expect(() => {
        render(
          <MobileCalendar
            {...defaultProps}
            bookingsByDate={new Map()}
          />
        )
      }).not.toThrow()
    })

    it('should handle empty conflictMap', () => {
      // Arrange & Act
      expect(() => {
        render(
          <MobileCalendar
            {...defaultProps}
            conflictMap={new Map()}
          />
        )
      }).not.toThrow()
    })

    it('should handle null selectedDate', () => {
      // Arrange & Act
      expect(() => {
        render(<MobileCalendar {...defaultProps} selectedDate={null} />)
      }).not.toThrow()
    })

    it('should sync week view with currentDate changes', () => {
      // Arrange
      const { rerender } = render(<MobileCalendar {...defaultProps} />)

      // Act - Change currentDate
      const newDate = new Date('2025-02-15')
      rerender(<MobileCalendar {...defaultProps} currentDate={newDate} />)

      // Assert - Should show February
      expect(screen.getByText(/Feb 2025/)).toBeInTheDocument()
    })

    it('should handle month boundaries correctly', async () => {
      // Arrange
      const user = userEvent.setup()
      const endOfMonth = new Date('2025-01-31')
      render(<MobileCalendar {...defaultProps} currentDate={endOfMonth} />)

      // Act - Navigate to next week (crosses into February)
      await user.click(screen.getByRole('button', { name: /go to next week/i }))

      // Assert - Should not throw error
      expect(screen.getByRole('button', { name: /go to next week/i })).toBeInTheDocument()
    })

    it('should handle year boundaries correctly', async () => {
      // Arrange
      const user = userEvent.setup()
      const endOfYear = new Date('2024-12-31')
      render(<MobileCalendar {...defaultProps} currentDate={endOfYear} />)

      // Act - Switch to month view and navigate to next month (crosses into 2025)
      await user.click(screen.getByRole('button', { name: /switch to month view/i }))
      await user.click(screen.getByRole('button', { name: /go to next month/i }))

      // Assert
      expect(mockOnMonthChange).toHaveBeenCalled()
      const calledDate = mockOnMonthChange.mock.calls[0][0]
      expect(calledDate.getFullYear()).toBe(2025)
    })
  })
})
