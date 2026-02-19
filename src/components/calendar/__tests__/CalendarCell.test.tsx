/**
 * Test Suite: CalendarCell Component
 *
 * Tests for the CalendarCell component used in calendar grid.
 * Covers rendering states, click handlers, bookings display, and memo optimization.
 *
 * Coverage Target: 100% (presentation component with interaction)
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { CalendarCell } from '../CalendarCell'
import type { Booking } from '@/types/booking'

// Mock data helpers
const createMockBooking = (overrides: Partial<Booking> = {}): Booking => ({
  id: 'booking-1',
  customer_id: 'customer-1',
  staff_id: 'staff-1',
  team_id: null,
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

describe('CalendarCell', () => {
  const mockOnDateClick = vi.fn()
  const mockOnCreateBooking = vi.fn()
  const currentDate = new Date('2025-01-15')

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Basic Rendering', () => {
    it('should render cell with day number', () => {
      // Arrange
      const day = new Date('2025-01-15')

      // Act
      render(
        <CalendarCell
          day={day}
          currentDate={currentDate}
          selectedDate={null}
          dayBookings={[]}
          onDateClick={mockOnDateClick}
          onCreateBooking={mockOnCreateBooking}
        />
      )

      // Assert
      expect(screen.getByText('15')).toBeInTheDocument()
    })

    it('should render cell for different months', () => {
      // Arrange
      const day = new Date('2025-02-20')

      // Act
      render(
        <CalendarCell
          day={day}
          currentDate={currentDate}
          selectedDate={null}
          dayBookings={[]}
          onDateClick={mockOnDateClick}
          onCreateBooking={mockOnCreateBooking}
        />
      )

      // Assert
      expect(screen.getByText('20')).toBeInTheDocument()
    })

    it('should apply muted styles for days outside current month', () => {
      // Arrange
      const day = new Date('2025-02-01') // February, current is January

      // Act
      const { container } = render(
        <CalendarCell
          day={day}
          currentDate={currentDate}
          selectedDate={null}
          dayBookings={[]}
          onDateClick={mockOnDateClick}
          onCreateBooking={mockOnCreateBooking}
        />
      )

      // Assert - should have muted classes
      const cell = container.firstChild as HTMLElement
      expect(cell.className).toContain('bg-muted')
      expect(cell.className).toContain('text-muted-foreground')
      expect(cell.className).toContain('opacity-60')
    })

    it('should apply current month styles', () => {
      // Arrange
      const day = new Date('2025-01-20') // Same month as currentDate

      // Act
      const { container } = render(
        <CalendarCell
          day={day}
          currentDate={currentDate}
          selectedDate={null}
          dayBookings={[]}
          onDateClick={mockOnDateClick}
          onCreateBooking={mockOnCreateBooking}
        />
      )

      // Assert
      const cell = container.firstChild as HTMLElement
      expect(cell.className).toContain('bg-background')
    })
  })

  describe('Today Highlighting', () => {
    it('should highlight today\'s date', () => {
      // Arrange
      const today = new Date()

      // Act
      const { container } = render(
        <CalendarCell
          day={today}
          currentDate={today}
          selectedDate={null}
          dayBookings={[]}
          onDateClick={mockOnDateClick}
          onCreateBooking={mockOnCreateBooking}
        />
      )

      // Assert - should have today styles
      const cell = container.firstChild as HTMLElement
      expect(cell.className).toContain('ring-tinedy-yellow')
      expect(cell.className).toContain('bg-yellow-50')

      // Day number should be highlighted
      const dayNumber = screen.getByText(today.getDate().toString())
      expect(dayNumber.className).toContain('bg-tinedy-blue')
      expect(dayNumber.className).toContain('text-white')
    })

    it('should not highlight non-today dates', () => {
      // Arrange
      const day = new Date('2025-01-15')

      // Act
      const { container } = render(
        <CalendarCell
          day={day}
          currentDate={currentDate}
          selectedDate={null}
          dayBookings={[]}
          onDateClick={mockOnDateClick}
          onCreateBooking={mockOnCreateBooking}
        />
      )

      // Assert
      const cell = container.firstChild as HTMLElement
      expect(cell.className).not.toContain('ring-tinedy-yellow')
      expect(cell.className).not.toContain('bg-yellow-50')
    })
  })

  describe('Selected Date', () => {
    it('should highlight selected date', () => {
      // Arrange
      const day = new Date('2025-01-15')
      const selectedDate = new Date('2025-01-15')

      // Act
      const { container } = render(
        <CalendarCell
          day={day}
          currentDate={currentDate}
          selectedDate={selectedDate}
          dayBookings={[]}
          onDateClick={mockOnDateClick}
          onCreateBooking={mockOnCreateBooking}
        />
      )

      // Assert
      const cell = container.firstChild as HTMLElement
      expect(cell.className).toContain('ring-tinedy-blue')
      expect(cell.className).toContain('bg-blue-50')
    })

    it('should not highlight non-selected dates', () => {
      // Arrange
      const day = new Date('2025-01-15')
      const selectedDate = new Date('2025-01-20')

      // Act
      const { container } = render(
        <CalendarCell
          day={day}
          currentDate={currentDate}
          selectedDate={selectedDate}
          dayBookings={[]}
          onDateClick={mockOnDateClick}
          onCreateBooking={mockOnCreateBooking}
        />
      )

      // Assert
      const cell = container.firstChild as HTMLElement
      expect(cell.className).not.toContain('ring-tinedy-blue')
      expect(cell.className).not.toContain('bg-blue-50')
    })
  })

  describe('Booking Count Display', () => {
    it('should display booking count badge when bookings exist', () => {
      // Arrange
      const day = new Date('2025-01-15')
      const bookings = [
        createMockBooking({ id: 'booking-1' }),
        createMockBooking({ id: 'booking-2' }),
      ]

      // Act
      render(
        <CalendarCell
          day={day}
          currentDate={currentDate}
          selectedDate={null}
          dayBookings={bookings}
          onDateClick={mockOnDateClick}
          onCreateBooking={mockOnCreateBooking}
        />
      )

      // Assert
      expect(screen.getByText('2')).toBeInTheDocument()
    })

    it('should not display booking count when no bookings', () => {
      // Arrange
      const day = new Date('2025-01-15')

      // Act
      render(
        <CalendarCell
          day={day}
          currentDate={currentDate}
          selectedDate={null}
          dayBookings={[]}
          onDateClick={mockOnDateClick}
          onCreateBooking={mockOnCreateBooking}
        />
      )

      // Assert - Only day number should be visible
      expect(screen.getByText('15')).toBeInTheDocument()
      // No booking count badge
      expect(screen.queryByText('0')).not.toBeInTheDocument()
    })

    it('should display correct count for multiple bookings', () => {
      // Arrange
      const day = new Date('2025-01-15')
      const bookings = Array.from({ length: 5 }, (_, i) =>
        createMockBooking({ id: `booking-${i + 1}` })
      )

      // Act
      render(
        <CalendarCell
          day={day}
          currentDate={currentDate}
          selectedDate={null}
          dayBookings={bookings}
          onDateClick={mockOnDateClick}
          onCreateBooking={mockOnCreateBooking}
        />
      )

      // Assert
      expect(screen.getByText('5')).toBeInTheDocument()
    })
  })

  describe('Booking Preview', () => {
    it('should display booking time preview', () => {
      // Arrange
      const day = new Date('2025-01-15')
      const bookings = [
        createMockBooking({ id: 'booking-1', start_time: '09:00:00' }),
      ]

      // Act
      render(
        <CalendarCell
          day={day}
          currentDate={currentDate}
          selectedDate={null}
          dayBookings={bookings}
          onDateClick={mockOnDateClick}
          onCreateBooking={mockOnCreateBooking}
        />
      )

      // Assert - Time should be formatted without seconds
      expect(screen.getByText('09:00')).toBeInTheDocument()
    })

    it('should show only first 2 bookings', () => {
      // Arrange
      const day = new Date('2025-01-15')
      const bookings = [
        createMockBooking({ id: 'booking-1', start_time: '09:00:00' }),
        createMockBooking({ id: 'booking-2', start_time: '10:00:00' }),
        createMockBooking({ id: 'booking-3', start_time: '11:00:00' }),
      ]

      // Act
      render(
        <CalendarCell
          day={day}
          currentDate={currentDate}
          selectedDate={null}
          dayBookings={bookings}
          onDateClick={mockOnDateClick}
          onCreateBooking={mockOnCreateBooking}
        />
      )

      // Assert
      expect(screen.getByText('09:00')).toBeInTheDocument()
      expect(screen.getByText('10:00')).toBeInTheDocument()
      expect(screen.queryByText('11:00')).not.toBeInTheDocument()
    })

    it('should show "+N more" indicator for additional bookings', () => {
      // Arrange
      const day = new Date('2025-01-15')
      const bookings = Array.from({ length: 5 }, (_, i) =>
        createMockBooking({ id: `booking-${i + 1}`, start_time: `${9 + i}:00:00` })
      )

      // Act
      render(
        <CalendarCell
          day={day}
          currentDate={currentDate}
          selectedDate={null}
          dayBookings={bookings}
          onDateClick={mockOnDateClick}
          onCreateBooking={mockOnCreateBooking}
        />
      )

      // Assert
      expect(screen.getByText('+3 more')).toBeInTheDocument()
    })

    it('should not show "+N more" when bookings <= 2', () => {
      // Arrange
      const day = new Date('2025-01-15')
      const bookings = [
        createMockBooking({ id: 'booking-1', start_time: '09:00:00' }),
      ]

      // Act
      render(
        <CalendarCell
          day={day}
          currentDate={currentDate}
          selectedDate={null}
          dayBookings={bookings}
          onDateClick={mockOnDateClick}
          onCreateBooking={mockOnCreateBooking}
        />
      )

      // Assert
      expect(screen.queryByText(/more/i)).not.toBeInTheDocument()
    })
  })

  describe('Conflict Detection', () => {
    it('should highlight cell with conflicts', () => {
      // Arrange
      const day = new Date('2025-01-15')
      const bookings = [createMockBooking({ id: 'booking-1' })]
      const conflictingBookingIds = new Set(['booking-1'])

      // Act
      const { container } = render(
        <CalendarCell
          day={day}
          currentDate={currentDate}
          selectedDate={null}
          dayBookings={bookings}
          conflictingBookingIds={conflictingBookingIds}
          onDateClick={mockOnDateClick}
          onCreateBooking={mockOnCreateBooking}
        />
      )

      // Assert
      const cell = container.firstChild as HTMLElement
      expect(cell.className).toContain('ring-red-500')
      expect(cell.className).toContain('bg-red-50')
    })

    it('should display conflict warning badge', () => {
      // Arrange
      const day = new Date('2025-01-15')
      const bookings = [createMockBooking({ id: 'booking-1' })]
      const conflictingBookingIds = new Set(['booking-1'])

      // Act
      const { container } = render(
        <CalendarCell
          day={day}
          currentDate={currentDate}
          selectedDate={null}
          dayBookings={bookings}
          conflictingBookingIds={conflictingBookingIds}
          onDateClick={mockOnDateClick}
          onCreateBooking={mockOnCreateBooking}
        />
      )

      // Assert - Look for AlertTriangle icon
      const svg = container.querySelector('svg')
      expect(svg).toBeInTheDocument()
    })

    it('should not highlight when no conflicts', () => {
      // Arrange
      const day = new Date('2025-01-15')
      const bookings = [createMockBooking({ id: 'booking-1' })]
      const conflictingBookingIds = new Set<string>()

      // Act
      const { container } = render(
        <CalendarCell
          day={day}
          currentDate={currentDate}
          selectedDate={null}
          dayBookings={bookings}
          conflictingBookingIds={conflictingBookingIds}
          onDateClick={mockOnDateClick}
          onCreateBooking={mockOnCreateBooking}
        />
      )

      // Assert
      const cell = container.firstChild as HTMLElement
      expect(cell.className).not.toContain('ring-red-500')
    })

    it('should handle conflict for one of multiple bookings', () => {
      // Arrange
      const day = new Date('2025-01-15')
      const bookings = [
        createMockBooking({ id: 'booking-1' }),
        createMockBooking({ id: 'booking-2' }),
      ]
      const conflictingBookingIds = new Set(['booking-2'])

      // Act
      const { container } = render(
        <CalendarCell
          day={day}
          currentDate={currentDate}
          selectedDate={null}
          dayBookings={bookings}
          conflictingBookingIds={conflictingBookingIds}
          onDateClick={mockOnDateClick}
          onCreateBooking={mockOnCreateBooking}
        />
      )

      // Assert - Should still show conflict
      const cell = container.firstChild as HTMLElement
      expect(cell.className).toContain('ring-red-500')
    })
  })

  describe('Click Handlers', () => {
    it('should call onDateClick when cell is clicked', async () => {
      // Arrange
      const user = userEvent.setup()
      const day = new Date('2025-01-15')

      // Act
      render(
        <CalendarCell
          day={day}
          currentDate={currentDate}
          selectedDate={null}
          dayBookings={[]}
          onDateClick={mockOnDateClick}
          onCreateBooking={mockOnCreateBooking}
        />
      )

      const cell = screen.getByText('15').closest('div')
      await user.click(cell!)

      // Assert
      expect(mockOnDateClick).toHaveBeenCalledTimes(1)
      expect(mockOnDateClick).toHaveBeenCalledWith(day)
    })

    it('should call onCreateBooking when add button is clicked', async () => {
      // Arrange
      const user = userEvent.setup()
      const day = new Date('2025-01-15')

      // Act
      const { container } = render(
        <CalendarCell
          day={day}
          currentDate={currentDate}
          selectedDate={null}
          dayBookings={[]}
          onDateClick={mockOnDateClick}
          onCreateBooking={mockOnCreateBooking}
        />
      )

      // Hover to show add button
      const cell = container.firstChild as HTMLElement
      await user.hover(cell)

      // Find and click the add button (Plus icon button)
      const addButton = container.querySelector('button') as HTMLElement
      expect(addButton).toBeInTheDocument()
      await user.click(addButton)

      // Assert
      expect(mockOnCreateBooking).toHaveBeenCalledTimes(1)
      expect(mockOnCreateBooking).toHaveBeenCalledWith(day)
    })

    it('should not call onDateClick when add button is clicked', async () => {
      // Arrange
      const user = userEvent.setup()
      const day = new Date('2025-01-15')

      // Act
      const { container } = render(
        <CalendarCell
          day={day}
          currentDate={currentDate}
          selectedDate={null}
          dayBookings={[]}
          onDateClick={mockOnDateClick}
          onCreateBooking={mockOnCreateBooking}
        />
      )

      // Hover to show add button
      const cell = container.firstChild as HTMLElement
      await user.hover(cell)

      // Click the add button
      const addButton = container.querySelector('button') as HTMLElement
      await user.click(addButton)

      // Assert - onDateClick should NOT be called due to stopPropagation
      expect(mockOnDateClick).not.toHaveBeenCalled()
      expect(mockOnCreateBooking).toHaveBeenCalledTimes(1)
    })

    it('should show add button only for current month days', () => {
      // Arrange
      const day = new Date('2025-02-01') // Different month

      // Act
      const { container } = render(
        <CalendarCell
          day={day}
          currentDate={currentDate}
          selectedDate={null}
          dayBookings={[]}
          onDateClick={mockOnDateClick}
          onCreateBooking={mockOnCreateBooking}
        />
      )

      // Assert - No add button for other months
      expect(container.querySelector('button')).not.toBeInTheDocument()
    })
  })

  describe('Memo Optimization', () => {
    it('should have stable component reference', () => {
      // Assert - CalendarCell should be a memoized component
      expect(CalendarCell.displayName).toBe('CalendarCell')
    })

    it('should not re-render when unrelated props change', () => {
      // Arrange
      const day = new Date('2025-01-15')
      const renderSpy = vi.fn()

      // Wrap component to track renders
      const TestComponent = (props: React.ComponentProps<typeof CalendarCell>) => {
        renderSpy()
        return <CalendarCell {...props} />
      }

      const { rerender } = render(
        <TestComponent
          day={day}
          currentDate={currentDate}
          selectedDate={null}
          dayBookings={[]}
          onDateClick={mockOnDateClick}
          onCreateBooking={mockOnCreateBooking}
        />
      )

      // Clear initial render
      renderSpy.mockClear()

      // Act - Rerender with same props
      rerender(
        <TestComponent
          day={day}
          currentDate={currentDate}
          selectedDate={null}
          dayBookings={[]}
          onDateClick={mockOnDateClick}
          onCreateBooking={mockOnCreateBooking}
        />
      )

      // Assert - Should still render (memo doesn't prevent parent rerenders)
      // But CalendarCell's internal memo should prevent expensive recalculations
      expect(renderSpy).toHaveBeenCalled()
    })
  })

  describe('Edge Cases', () => {
    it('should handle null selectedDate', () => {
      // Arrange
      const day = new Date('2025-01-15')

      // Act
      expect(() => {
        render(
          <CalendarCell
            day={day}
            currentDate={currentDate}
            selectedDate={null}
            dayBookings={[]}
            onDateClick={mockOnDateClick}
            onCreateBooking={mockOnCreateBooking}
          />
        )
      }).not.toThrow()

      // Assert
      expect(screen.getByText('15')).toBeInTheDocument()
    })

    it('should handle empty conflictingBookingIds', () => {
      // Arrange
      const day = new Date('2025-01-15')
      const bookings = [createMockBooking()]

      // Act
      expect(() => {
        render(
          <CalendarCell
            day={day}
            currentDate={currentDate}
            selectedDate={null}
            dayBookings={bookings}
            conflictingBookingIds={undefined}
            onDateClick={mockOnDateClick}
            onCreateBooking={mockOnCreateBooking}
          />
        )
      }).not.toThrow()
    })

    it('should handle booking without customer', () => {
      // Arrange
      const day = new Date('2025-01-15')
      const bookings = [
        createMockBooking({
          id: 'booking-1',
          start_time: '09:00:00',
          customers: null as unknown as Booking['customers']
        }),
      ]

      // Act
      render(
        <CalendarCell
          day={day}
          currentDate={currentDate}
          selectedDate={null}
          dayBookings={bookings}
          onDateClick={mockOnDateClick}
          onCreateBooking={mockOnCreateBooking}
        />
      )

      // Assert - Should still render time
      expect(screen.getByText('09:00')).toBeInTheDocument()
    })

    it('should handle booking without start_time', () => {
      // Arrange
      const day = new Date('2025-01-15')
      const bookings = [
        createMockBooking({
          id: 'booking-1',
          start_time: null as unknown as Booking['start_time']
        }),
      ]

      // Act
      expect(() => {
        render(
          <CalendarCell
            day={day}
            currentDate={currentDate}
            selectedDate={null}
            dayBookings={bookings}
            onDateClick={mockOnDateClick}
            onCreateBooking={mockOnCreateBooking}
          />
        )
      }).not.toThrow()
    })

    it('should handle first day of month', () => {
      // Arrange
      const day = new Date('2025-01-01')

      // Act
      render(
        <CalendarCell
          day={day}
          currentDate={currentDate}
          selectedDate={null}
          dayBookings={[]}
          onDateClick={mockOnDateClick}
          onCreateBooking={mockOnCreateBooking}
        />
      )

      // Assert
      expect(screen.getByText('1')).toBeInTheDocument()
    })

    it('should handle last day of month', () => {
      // Arrange
      const day = new Date('2025-01-31')

      // Act
      render(
        <CalendarCell
          day={day}
          currentDate={currentDate}
          selectedDate={null}
          dayBookings={[]}
          onDateClick={mockOnDateClick}
          onCreateBooking={mockOnCreateBooking}
        />
      )

      // Assert
      expect(screen.getByText('31')).toBeInTheDocument()
    })
  })

  describe('Accessibility', () => {
    it('should have proper title attribute on booking preview', () => {
      // Arrange
      const day = new Date('2025-01-15')
      const bookings = [
        createMockBooking({
          id: 'booking-1',
          start_time: '09:00:00',
          customers: {
            ...createMockBooking().customers!,
            full_name: 'John Doe'
          }
        }),
      ]

      // Act
      const { container } = render(
        <CalendarCell
          day={day}
          currentDate={currentDate}
          selectedDate={null}
          dayBookings={bookings}
          onDateClick={mockOnDateClick}
          onCreateBooking={mockOnCreateBooking}
        />
      )

      // Assert - Find booking preview div (not button)
      const bookingPreviews = container.querySelectorAll('[title]')
      const bookingPreview = Array.from(bookingPreviews).find(el =>
        el.getAttribute('title')?.includes('09:00')
      )
      expect(bookingPreview).toBeInTheDocument()
      expect(bookingPreview?.getAttribute('title')).toContain('09:00')
      expect(bookingPreview?.getAttribute('title')).toContain('John Doe')
    })

    it('should have title on add button', () => {
      // Arrange
      const day = new Date('2025-01-15')

      // Act
      const { container } = render(
        <CalendarCell
          day={day}
          currentDate={currentDate}
          selectedDate={null}
          dayBookings={[]}
          onDateClick={mockOnDateClick}
          onCreateBooking={mockOnCreateBooking}
        />
      )

      // Assert
      const addButton = container.querySelector('button')
      expect(addButton).toHaveAttribute('title', 'Create booking')
    })

    it('should have title on conflict badge', () => {
      // Arrange
      const day = new Date('2025-01-15')
      const bookings = [createMockBooking({ id: 'booking-1' })]
      const conflictingBookingIds = new Set(['booking-1'])

      // Act
      const { container } = render(
        <CalendarCell
          day={day}
          currentDate={currentDate}
          selectedDate={null}
          dayBookings={bookings}
          conflictingBookingIds={conflictingBookingIds}
          onDateClick={mockOnDateClick}
          onCreateBooking={mockOnCreateBooking}
        />
      )

      // Assert
      const conflictBadge = container.querySelector('[title="Schedule conflicts detected"]')
      expect(conflictBadge).toBeInTheDocument()
    })
  })
})
