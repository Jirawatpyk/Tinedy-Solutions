/**
 * Tests for BookingListSection component
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { BookingListSection } from '../booking-list-section'
import type { StaffBooking } from '@/lib/queries/staff-bookings-queries'

// Mock child components
vi.mock('@/components/staff/simplified-booking-card', () => ({
  SimplifiedBookingCard: ({ booking, onViewDetails }: { booking: StaffBooking; onViewDetails: (b: StaffBooking) => void }) => (
    <div data-testid={`booking-card-${booking.id}`} onClick={() => onViewDetails(booking)}>
      {booking.customers?.full_name}
    </div>
  ),
}))

vi.mock('@/components/staff/empty-state', () => ({
  EmptyState: ({ type }: { type: string }) => (
    <div data-testid="empty-state">Empty: {type}</div>
  ),
}))

const createMockBooking = (id: string, name: string): StaffBooking => ({
  id,
  booking_date: '2025-01-20',
  start_time: '10:00:00',
  end_time: '12:00:00',
  status: 'confirmed',
  payment_status: 'paid',
  total_price: 1500,
  notes: null,
  address: '123 Main St',
  city: 'Bangkok',
  state: 'Bangkok',
  zip_code: '10110',
  customer_id: 'customer-1',
  service_package_id: 'sp-1',
  package_v2_id: null,
  created_at: '2025-01-19T00:00:00Z',
  staff_id: 'staff-1',
  team_id: null,
  area_sqm: null,
  frequency: null,
  customers: { id: 'customer-1', full_name: name, phone: '0812345678', avatar_url: null },
  service_packages: { id: 'sp-1', name: 'Cleaning', service_type: 'cleaning', duration_minutes: 120, price: 1500 },
  service_packages_v2: null,
  teams: null,
})

describe('BookingListSection', () => {
  const defaultProps = {
    bookings: [] as StaffBooking[],
    loading: false,
    limit: 6,
    onLoadMore: vi.fn(),
    onViewDetails: vi.fn(),
    onStartProgress: vi.fn(),
    onMarkCompleted: vi.fn(),
    searchInput: '',
    emptyType: 'today' as const,
    showDate: false,
    startingBookingId: null,
    completingBookingId: null,
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should render loading skeletons when loading', () => {
    const { container } = render(<BookingListSection {...defaultProps} loading={true} />)

    // Skeleton elements should be rendered
    expect(container.querySelectorAll('.h-48').length).toBeGreaterThan(0)
  })

  it('should render empty state when no bookings and no search', () => {
    render(<BookingListSection {...defaultProps} />)

    expect(screen.getByTestId('empty-state')).toHaveTextContent('Empty: today')
  })

  it('should render search empty state when no bookings with search', () => {
    render(<BookingListSection {...defaultProps} searchInput="xyz" />)

    expect(screen.getByText('No results found')).toBeInTheDocument()
  })

  it('should render booking cards', () => {
    const bookings = [
      createMockBooking('b1', 'Alice'),
      createMockBooking('b2', 'Bob'),
    ]

    render(<BookingListSection {...defaultProps} bookings={bookings} />)

    expect(screen.getByTestId('booking-card-b1')).toHaveTextContent('Alice')
    expect(screen.getByTestId('booking-card-b2')).toHaveTextContent('Bob')
  })

  it('should show Load More button when more bookings than limit', async () => {
    const bookings = Array.from({ length: 8 }, (_, i) =>
      createMockBooking(`b${i}`, `User ${i}`)
    )

    render(<BookingListSection {...defaultProps} bookings={bookings} limit={6} />)

    const loadMoreButton = screen.getByText('Load More (2 remaining)')
    expect(loadMoreButton).toBeInTheDocument()

    await userEvent.click(loadMoreButton)
    expect(defaultProps.onLoadMore).toHaveBeenCalled()
  })

  it('should not show Load More when all bookings visible', () => {
    const bookings = [createMockBooking('b1', 'Alice')]

    render(<BookingListSection {...defaultProps} bookings={bookings} limit={6} />)

    expect(screen.queryByText(/Load More/)).not.toBeInTheDocument()
  })
})
