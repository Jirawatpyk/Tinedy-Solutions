import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { BookingDetailsSheet } from '../booking-details-sheet'
import { createMockBooking } from './fixtures'

// Mock the hooks used in BookingDetailContent
vi.mock('@/hooks/use-booking-details', () => ({
  useBookingReview: vi.fn(() => ({ review: null, isLoading: false })),
  useBookingTeamMembers: vi.fn(() => ({ teamMembers: [], isLoading: false })),
}))

vi.mock('@/hooks/use-toast', () => ({
  useToast: vi.fn(() => ({ toast: vi.fn() })),
}))

// Mock the booking timeline component (lazy loaded)
vi.mock('../booking-timeline', () => ({
  BookingTimeline: () => <div data-testid="booking-timeline">Timeline</div>,
}))

const mockBooking = createMockBooking()

describe('BookingDetailsSheet', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns null when booking is null', () => {
    const { container } = render(
      <BookingDetailsSheet
        booking={null}
        open={true}
        onClose={vi.fn()}
      />
    )
    expect(container).toBeEmptyDOMElement()
  })

  it('renders sheet when open and booking provided', () => {
    render(
      <BookingDetailsSheet
        booking={mockBooking}
        open={true}
        onClose={vi.fn()}
      />
    )
    expect(screen.getByRole('dialog')).toBeInTheDocument()
  })

  it('renders drag handle', () => {
    render(
      <BookingDetailsSheet
        booking={mockBooking}
        open={true}
        onClose={vi.fn()}
      />
    )
    expect(screen.getByTestId('drag-handle')).toBeInTheDocument()
  })

  it('renders booking time in hero section', () => {
    render(
      <BookingDetailsSheet
        booking={mockBooking}
        open={true}
        onClose={vi.fn()}
      />
    )
    // Hero section shows time (start_time is 09:00:00)
    expect(screen.getByText(/09:00/)).toBeInTheDocument()
  })

  it('renders customer info from booking', () => {
    render(
      <BookingDetailsSheet
        booking={mockBooking}
        open={true}
        onClose={vi.fn()}
      />
    )
    // Customer card shows customer name
    expect(screen.getByText('Test Customer')).toBeInTheDocument()
  })

  it('renders status badge', () => {
    render(
      <BookingDetailsSheet
        booking={mockBooking}
        open={true}
        onClose={vi.fn()}
      />
    )
    expect(screen.getByText('Confirmed')).toBeInTheDocument()
  })

  it('renders service name in summary', () => {
    render(
      <BookingDetailsSheet
        booking={mockBooking}
        open={true}
        onClose={vi.fn()}
      />
    )
    expect(screen.getByText('Deep Cleaning')).toBeInTheDocument()
  })

  it('renders close button', () => {
    render(
      <BookingDetailsSheet
        booking={mockBooking}
        open={true}
        onClose={vi.fn()}
      />
    )
    // There are multiple close buttons (content close + sheet close)
    const closeButtons = screen.getAllByRole('button', { name: /close/i })
    expect(closeButtons.length).toBeGreaterThanOrEqual(1)
  })

  it('renders Start Task button for confirmed bookings', () => {
    render(
      <BookingDetailsSheet
        booking={mockBooking}
        open={true}
        onClose={vi.fn()}
        onStartProgress={vi.fn()}
      />
    )
    expect(screen.getByRole('button', { name: /start task/i })).toBeInTheDocument()
  })

  it('renders Mark as Completed button for in_progress bookings', () => {
    const inProgressBooking = { ...mockBooking, status: 'in_progress' as const }
    render(
      <BookingDetailsSheet
        booking={inProgressBooking}
        open={true}
        onClose={vi.fn()}
        onMarkCompleted={vi.fn()}
      />
    )
    expect(screen.getByRole('button', { name: /mark as completed/i })).toBeInTheDocument()
  })

  it('does not render Start button when onStartProgress not provided', () => {
    render(
      <BookingDetailsSheet
        booking={mockBooking}
        open={true}
        onClose={vi.fn()}
      />
    )
    expect(screen.queryByRole('button', { name: /start task/i })).not.toBeInTheDocument()
  })

  it('has bottom side styling for mobile sheet', () => {
    render(
      <BookingDetailsSheet
        booking={mockBooking}
        open={true}
        onClose={vi.fn()}
      />
    )
    const dialog = screen.getByRole('dialog')
    // Sheet with side="bottom" has inset-x-0 bottom-0 classes
    expect(dialog).toHaveClass('bottom-0')
  })

  it('has 95vh height for content', () => {
    render(
      <BookingDetailsSheet
        booking={mockBooking}
        open={true}
        onClose={vi.fn()}
      />
    )
    const dialog = screen.getByRole('dialog')
    expect(dialog).toHaveClass('h-[95vh]')
  })

  it('has rounded top corners', () => {
    render(
      <BookingDetailsSheet
        booking={mockBooking}
        open={true}
        onClose={vi.fn()}
      />
    )
    const dialog = screen.getByRole('dialog')
    expect(dialog).toHaveClass('rounded-t-xl')
  })
})
