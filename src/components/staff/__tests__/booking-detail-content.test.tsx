import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { BookingDetailContent } from '../booking-detail-content'
import { createMockBooking, createMockTeamBooking } from './fixtures'

// Mock the hooks
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

// Mock the sub-components used by BookingDetailContent (hero layout)
vi.mock('../booking-detail-hero', () => ({
  BookingDetailHero: ({ status }: { status: string }) => (
    <div data-testid="booking-detail-hero">Hero: {status}</div>
  ),
}))

vi.mock('../booking-customer-card', () => ({
  BookingCustomerCard: ({ customer }: { customer: { full_name: string } | null }) => (
    <div data-testid="booking-customer-card">Customer: {customer?.full_name}</div>
  ),
}))

vi.mock('../booking-service-summary', () => ({
  BookingServiceSummary: ({ serviceName }: { serviceName?: string }) => (
    <div data-testid="booking-service-summary">Service: {serviceName}</div>
  ),
}))

const mockBooking = createMockBooking({
  area_sqm: 50,
  frequency: 2,
  recurring_sequence: 2,
  recurring_total: 4,
})

describe('BookingDetailContent', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Content Sections', () => {
    it('renders hero section', () => {
      render(<BookingDetailContent booking={mockBooking} onClose={vi.fn()} />)
      expect(screen.getByTestId('booking-detail-hero')).toBeInTheDocument()
    })

    it('renders customer card', () => {
      render(<BookingDetailContent booking={mockBooking} onClose={vi.fn()} />)
      expect(screen.getByTestId('booking-customer-card')).toBeInTheDocument()
    })

    it('renders service summary', () => {
      render(<BookingDetailContent booking={mockBooking} onClose={vi.fn()} />)
      expect(screen.getByTestId('booking-service-summary')).toBeInTheDocument()
    })

    it('renders More Details section for bookings with extra info', () => {
      render(<BookingDetailContent booking={mockBooking} onClose={vi.fn()} />)
      expect(screen.getByText('More Details')).toBeInTheDocument()
    })

    it('shows area in expanded details', async () => {
      const user = userEvent.setup()
      render(<BookingDetailContent booking={mockBooking} onClose={vi.fn()} />)

      // Expand More Details
      await user.click(screen.getByText('More Details'))

      expect(screen.getByText('50 sqm')).toBeInTheDocument()
    })

    it('shows frequency in expanded details', async () => {
      const user = userEvent.setup()
      render(<BookingDetailContent booking={mockBooking} onClose={vi.fn()} />)

      // Expand More Details
      await user.click(screen.getByText('More Details'))

      // frequency: 2 with recurring 2/4 shows "2/4 (2 times)"
      expect(screen.getByText(/2\/4/)).toBeInTheDocument()
    })
  })

  describe('Action Buttons', () => {
    it('renders Close button when no primary action (completed booking)', () => {
      const completedBooking = { ...mockBooking, status: 'completed' as const }
      render(<BookingDetailContent booking={completedBooking} onClose={vi.fn()} />)
      expect(screen.getByRole('button', { name: /close/i })).toBeInTheDocument()
    })

    it('calls onClose when Close clicked', async () => {
      const completedBooking = { ...mockBooking, status: 'completed' as const }
      const onClose = vi.fn()
      render(<BookingDetailContent booking={completedBooking} onClose={onClose} />)

      await act(async () => {
        fireEvent.click(screen.getByRole('button', { name: /close/i }))
      })

      expect(onClose).toHaveBeenCalledTimes(1)
    })

    it('shows Start Task button for confirmed bookings when onStartProgress provided', () => {
      render(
        <BookingDetailContent
          booking={mockBooking}
          onClose={vi.fn()}
          onStartProgress={vi.fn()}
        />
      )
      expect(screen.getByRole('button', { name: /start task/i })).toBeInTheDocument()
    })

    it('does not show Start Task button when onStartProgress not provided', () => {
      render(<BookingDetailContent booking={mockBooking} onClose={vi.fn()} />)
      expect(screen.queryByRole('button', { name: /start task/i })).not.toBeInTheDocument()
    })

    it('does not show Start Task button for non-confirmed bookings', () => {
      const inProgressBooking = { ...mockBooking, status: 'in_progress' as const }
      render(
        <BookingDetailContent
          booking={inProgressBooking}
          onClose={vi.fn()}
          onStartProgress={vi.fn()}
        />
      )
      expect(screen.queryByRole('button', { name: /start task/i })).not.toBeInTheDocument()
    })

    it('shows Mark as Completed button for in_progress bookings', () => {
      const inProgressBooking = { ...mockBooking, status: 'in_progress' as const }
      render(
        <BookingDetailContent
          booking={inProgressBooking}
          onClose={vi.fn()}
          onMarkCompleted={vi.fn()}
        />
      )
      expect(screen.getByRole('button', { name: /mark as completed/i })).toBeInTheDocument()
    })

    it('does not show Mark as Completed for confirmed bookings', () => {
      render(
        <BookingDetailContent
          booking={mockBooking}
          onClose={vi.fn()}
          onMarkCompleted={vi.fn()}
        />
      )
      expect(screen.queryByRole('button', { name: /mark as completed/i })).not.toBeInTheDocument()
    })

    it('hides all action buttons when showActions is false', () => {
      render(
        <BookingDetailContent
          booking={mockBooking}
          onClose={vi.fn()}
          onStartProgress={vi.fn()}
          showActions={false}
        />
      )
      expect(screen.queryByRole('button', { name: /close/i })).not.toBeInTheDocument()
      expect(screen.queryByRole('button', { name: /start task/i })).not.toBeInTheDocument()
    })
  })

  describe('Notes Section', () => {
    it('renders notes textarea when onAddNotes provided', () => {
      render(
        <BookingDetailContent
          booking={mockBooking}
          onClose={vi.fn()}
          onAddNotes={vi.fn()}
        />
      )
      expect(screen.getByPlaceholderText('Add notes about this booking...')).toBeInTheDocument()
    })

    it('does not render notes textarea when onAddNotes not provided', () => {
      render(<BookingDetailContent booking={mockBooking} onClose={vi.fn()} />)
      expect(screen.queryByPlaceholderText('Add notes about this booking...')).not.toBeInTheDocument()
    })

    it('does not render notes for cancelled bookings', () => {
      const cancelledBooking = { ...mockBooking, status: 'cancelled' as const }
      render(
        <BookingDetailContent
          booking={cancelledBooking}
          onClose={vi.fn()}
          onAddNotes={vi.fn()}
        />
      )
      expect(screen.queryByPlaceholderText('Add notes about this booking...')).not.toBeInTheDocument()
    })

    it('shows Save Notes button when notes are changed', async () => {
      const user = userEvent.setup()
      render(
        <BookingDetailContent
          booking={mockBooking}
          onClose={vi.fn()}
          onAddNotes={vi.fn()}
        />
      )

      const textarea = screen.getByPlaceholderText('Add notes about this booking...')
      await user.type(textarea, 'New notes')

      expect(screen.getByRole('button', { name: /save notes/i })).toBeInTheDocument()
    })

    it('shows unsaved changes warning when notes modified', async () => {
      const user = userEvent.setup()
      render(
        <BookingDetailContent
          booking={mockBooking}
          onClose={vi.fn()}
          onAddNotes={vi.fn()}
        />
      )

      const textarea = screen.getByPlaceholderText('Add notes about this booking...')
      await user.type(textarea, 'New notes')

      expect(screen.getByText('* Unsaved changes')).toBeInTheDocument()
    })
  })

  describe('Sticky Footer', () => {
    it('applies safe-area-inset when stickyFooter is true', () => {
      render(
        <BookingDetailContent
          booking={mockBooking}
          onClose={vi.fn()}
          stickyFooter={true}
        />
      )
      const actionsGroup = screen.getByRole('group', { name: /booking actions/i })
      // stickyFooter adds pb-[max(1rem,env(safe-area-inset-bottom))] class
      expect(actionsGroup.className).toContain('safe-area-inset-bottom')
    })

    it('does not apply safe-area-inset when stickyFooter is false', () => {
      render(
        <BookingDetailContent
          booking={mockBooking}
          onClose={vi.fn()}
          stickyFooter={false}
        />
      )
      const actionsGroup = screen.getByRole('group', { name: /booking actions/i })
      expect(actionsGroup.className).not.toContain('safe-area-inset-bottom')
    })
  })

  describe('Team Bookings', () => {
    it('shows More Details section for team bookings', () => {
      const teamBooking = createMockTeamBooking()
      render(<BookingDetailContent booking={teamBooking} onClose={vi.fn()} />)
      expect(screen.getByText('More Details')).toBeInTheDocument()
    })

    it('shows team details when More Details expanded', async () => {
      const user = userEvent.setup()
      const teamBooking = createMockTeamBooking()
      render(<BookingDetailContent booking={teamBooking} onClose={vi.fn()} />)

      // Expand More Details
      await user.click(screen.getByText('More Details'))

      expect(screen.getByText('Team Details')).toBeInTheDocument()
      expect(screen.getByText('Cleaning Team A')).toBeInTheDocument()
    })
  })

  describe('Accessibility', () => {
    it('has role="group" for action buttons', () => {
      render(<BookingDetailContent booking={mockBooking} onClose={vi.fn()} />)
      expect(screen.getByRole('group', { name: /booking actions/i })).toBeInTheDocument()
    })

    it('has proper aria-label on action buttons container', () => {
      render(<BookingDetailContent booking={mockBooking} onClose={vi.fn()} />)
      const group = screen.getByRole('group')
      expect(group).toHaveAttribute('aria-label', 'Booking actions')
    })
  })
})
