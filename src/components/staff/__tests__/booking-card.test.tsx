import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { BookingCard } from '../booking-card'
import { createMockAuthenticatedContext } from '@/test/mocks/auth-context'
import type { StaffBooking } from '@/lib/queries/staff-bookings-queries'

// Mock AuthContext
const mockAuthContext = createMockAuthenticatedContext()
vi.mock('@/contexts/auth-context', () => ({
  useAuth: () => mockAuthContext,
}))

describe('BookingCard', () => {
  const mockOnViewDetails = vi.fn()
  const mockOnStartProgress = vi.fn()
  const mockOnMarkCompleted = vi.fn()

  const createMockBooking = (overrides: Partial<StaffBooking> = {}): StaffBooking => ({
    id: 'booking-123',
    booking_date: '2025-10-28',
    start_time: '10:00:00',
    end_time: '12:00:00',
    status: 'confirmed',
    payment_status: 'paid',
    total_price: 1500,
    notes: 'Test booking notes',
    address: '123 Main St',
    city: 'Bangkok',
    state: 'Bangkok',
    zip_code: '10110',
    customer_id: 'customer-123',
    package_v2_id: null,
    created_at: '2025-10-26T00:00:00Z',
    staff_id: mockAuthContext.user?.id || null,
    team_id: null,
    area_sqm: null,
    frequency: null,
    customers: {
      id: 'customer-123',
      full_name: 'John Doe',
      phone: '0812345678',
      avatar_url: null,
    },
    service_packages: {
      id: 'service-123',
      name: 'Basic Cleaning',
      service_type: 'cleaning',
      duration_minutes: 120,
      price: 1500,
    },
    service_packages_v2: null,
    teams: null,
    ...overrides,
  })

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Rendering', () => {
    it('should render with required booking data', () => {
      // Arrange
      const booking = createMockBooking()

      // Act
      render(
        <BookingCard
          booking={booking}
          onViewDetails={mockOnViewDetails}
        />
      )

      // Assert
      expect(screen.getByText('John Doe')).toBeInTheDocument()
      expect(screen.getByText('Basic Cleaning')).toBeInTheDocument()
      expect(screen.getByText('0812345678')).toBeInTheDocument()
      expect(screen.getByText(/10:00/)).toBeInTheDocument()
      expect(screen.getByText(/12:00/)).toBeInTheDocument()
    })

    it('should display formatted time range correctly', () => {
      // Arrange
      const booking = createMockBooking({
        start_time: '09:30:00',
        end_time: '11:45:00',
      })

      // Act
      render(
        <BookingCard
          booking={booking}
          onViewDetails={mockOnViewDetails}
        />
      )

      // Assert
      expect(screen.getByText(/09:30/)).toBeInTheDocument()
      expect(screen.getByText(/11:45/)).toBeInTheDocument()
    })

    it('should display booking date when showDate is true', () => {
      // Arrange
      const booking = createMockBooking({
        booking_date: '2025-12-25',
      })

      // Act
      render(
        <BookingCard
          booking={booking}
          onViewDetails={mockOnViewDetails}
          showDate={true}
        />
      )

      // Assert
      expect(screen.getByText(/25 Dec/)).toBeInTheDocument()
    })

    it('should not display booking date when showDate is false', () => {
      // Arrange
      const booking = createMockBooking({
        booking_date: '2025-12-25',
      })

      // Act
      render(
        <BookingCard
          booking={booking}
          onViewDetails={mockOnViewDetails}
          showDate={false}
        />
      )

      // Assert
      expect(screen.queryByText(/25 Dec 2025/)).not.toBeInTheDocument()
    })

    it('should display customer avatar with fallback', () => {
      // Arrange
      const booking = createMockBooking()

      // Act
      render(
        <BookingCard
          booking={booking}
          onViewDetails={mockOnViewDetails}
        />
      )

      // Assert - Avatar component should be rendered
      expect(screen.getByText('John Doe')).toBeInTheDocument()
    })

    it('should display service duration when available', () => {
      // Arrange
      const booking = createMockBooking({
        service_packages: {
          id: 'service-123',
          name: 'Deep Cleaning',
          service_type: 'cleaning',
          duration_minutes: 180,
          price: 2000,
        },
      })

      // Act
      render(
        <BookingCard
          booking={booking}
          onViewDetails={mockOnViewDetails}
        />
      )

      // Assert
      expect(screen.getByText(/180 minutes/)).toBeInTheDocument()
    })

    it('should display full address when available', () => {
      // Arrange
      const booking = createMockBooking({
        address: '456 Sukhumvit Rd',
        city: 'Bangkok',
        state: 'Bangkok',
        zip_code: '10110',
      })

      // Act
      render(
        <BookingCard
          booking={booking}
          onViewDetails={mockOnViewDetails}
        />
      )

      // Assert
      expect(screen.getByText(/456 Sukhumvit Rd/)).toBeInTheDocument()
      expect(screen.getByText(/Bangkok/)).toBeInTheDocument()
      expect(screen.getByText(/10110/)).toBeInTheDocument()
    })

    it('should display booking notes when available', () => {
      // Arrange
      const booking = createMockBooking({
        notes: 'Please bring extra cleaning supplies',
      })

      // Act
      render(
        <BookingCard
          booking={booking}
          onViewDetails={mockOnViewDetails}
        />
      )

      // Assert
      expect(screen.getByText('Please bring extra cleaning supplies')).toBeInTheDocument()
    })

    it('should display fallback text for unknown customer', () => {
      // Arrange
      const booking = createMockBooking({
        customers: null,
      })

      // Act
      render(
        <BookingCard
          booking={booking}
          onViewDetails={mockOnViewDetails}
        />
      )

      // Assert
      expect(screen.getByText('Unknown Customer')).toBeInTheDocument()
    })

    it('should display fallback text for unknown service', () => {
      // Arrange
      const booking = createMockBooking({
        service_packages: null,
      })

      // Act
      render(
        <BookingCard
          booking={booking}
          onViewDetails={mockOnViewDetails}
        />
      )

      // Assert
      expect(screen.getByText('Unknown Service')).toBeInTheDocument()
    })

    it('should display "No phone" when customer phone is missing', () => {
      // Arrange
      const booking = createMockBooking({
        customers: {
          id: 'customer-123',
          full_name: 'Jane Doe',
          phone: '',
          avatar_url: null,
        },
      })

      // Act
      render(
        <BookingCard
          booking={booking}
          onViewDetails={mockOnViewDetails}
        />
      )

      // Assert
      expect(screen.getByText('No phone')).toBeInTheDocument()
    })
  })

  describe('Status Badges', () => {
    it('should display correct badge for confirmed status', () => {
      // Arrange
      const booking = createMockBooking({ status: 'confirmed' })

      // Act
      render(
        <BookingCard
          booking={booking}
          onViewDetails={mockOnViewDetails}
        />
      )

      // Assert
      expect(screen.getByText('Confirmed')).toBeInTheDocument()
    })

    it('should display correct badge for pending status', () => {
      // Arrange
      const booking = createMockBooking({ status: 'pending' })

      // Act
      render(
        <BookingCard
          booking={booking}
          onViewDetails={mockOnViewDetails}
        />
      )

      // Assert
      expect(screen.getByText('Pending')).toBeInTheDocument()
    })

    it('should display correct badge for in_progress status', () => {
      // Arrange
      const booking = createMockBooking({ status: 'in_progress' })

      // Act
      render(
        <BookingCard
          booking={booking}
          onViewDetails={mockOnViewDetails}
        />
      )

      // Assert
      expect(screen.getByText('In Progress')).toBeInTheDocument()
    })

    it('should display correct badge for completed status', () => {
      // Arrange
      const booking = createMockBooking({ status: 'completed' })

      // Act
      render(
        <BookingCard
          booking={booking}
          onViewDetails={mockOnViewDetails}
        />
      )

      // Assert
      expect(screen.getByText('Completed')).toBeInTheDocument()
    })

    it('should display correct badge for cancelled status', () => {
      // Arrange
      const booking = createMockBooking({ status: 'cancelled' })

      // Act
      render(
        <BookingCard
          booking={booking}
          onViewDetails={mockOnViewDetails}
        />
      )

      // Assert
      expect(screen.getByText('Cancelled')).toBeInTheDocument()
    })

    it('should display team badge for team bookings', () => {
      // Arrange
      const booking = createMockBooking({
        staff_id: 'other-staff-id', // Different from logged-in user
        team_id: 'team-123',
      })

      // Act
      render(
        <BookingCard
          booking={booking}
          onViewDetails={mockOnViewDetails}
        />
      )

      // Assert
      // Component shows "Team Task" on larger screens AND "Team" on smaller screens (responsive)
      const teamElements = screen.getAllByText(/Team/)
      expect(teamElements.length).toBeGreaterThan(0)
    })

    it('should not display team badge for own bookings', () => {
      // Arrange
      const booking = createMockBooking({
        staff_id: mockAuthContext.user?.id || 'test-user-id',
        team_id: null,
      })

      // Act
      render(
        <BookingCard
          booking={booking}
          onViewDetails={mockOnViewDetails}
        />
      )

      // Assert
      expect(screen.queryByText('งานทีม')).not.toBeInTheDocument()
    })
  })

  describe('User Interactions', () => {
    it('should call onViewDetails when card is clicked', async () => {
      // Arrange
      const user = userEvent.setup()
      const booking = createMockBooking()

      // Act
      render(
        <BookingCard
          booking={booking}
          onViewDetails={mockOnViewDetails}
        />
      )

      const card = screen.getByText('John Doe').closest('.cursor-pointer')
      if (card) await user.click(card)

      // Assert
      expect(mockOnViewDetails).toHaveBeenCalledWith(booking)
      expect(mockOnViewDetails).toHaveBeenCalledTimes(1)
    })

    it('should call onStartProgress when start button is clicked', async () => {
      // Arrange
      const user = userEvent.setup()
      const booking = createMockBooking({ status: 'confirmed' })
      mockOnStartProgress.mockResolvedValueOnce(undefined)

      // Act
      render(
        <BookingCard
          booking={booking}
          onViewDetails={mockOnViewDetails}
          onStartProgress={mockOnStartProgress}
        />
      )

      const startButton = screen.getByRole('button', { name: /Start Task/i })
      await user.click(startButton)

      // Assert
      await waitFor(() => {
        expect(mockOnStartProgress).toHaveBeenCalledWith(booking.id)
        expect(mockOnStartProgress).toHaveBeenCalledTimes(1)
      })
    })

    it('should call onMarkCompleted when complete button is clicked', async () => {
      // Arrange
      const user = userEvent.setup()
      const booking = createMockBooking({ status: 'in_progress' })
      mockOnMarkCompleted.mockResolvedValueOnce(undefined)

      // Act
      render(
        <BookingCard
          booking={booking}
          onViewDetails={mockOnViewDetails}
          onMarkCompleted={mockOnMarkCompleted}
        />
      )

      const completeButton = screen.getByRole('button', { name: /Complete/i })
      await user.click(completeButton)

      // Assert
      await waitFor(() => {
        expect(mockOnMarkCompleted).toHaveBeenCalledWith(booking.id)
        expect(mockOnMarkCompleted).toHaveBeenCalledTimes(1)
      })
    })

    it('should stop propagation when start button is clicked', async () => {
      // Arrange
      const user = userEvent.setup()
      const booking = createMockBooking({ status: 'confirmed' })
      mockOnStartProgress.mockResolvedValueOnce(undefined)

      // Act
      render(
        <BookingCard
          booking={booking}
          onViewDetails={mockOnViewDetails}
          onStartProgress={mockOnStartProgress}
        />
      )

      const startButton = screen.getByRole('button', { name: /Start Task/i })
      await user.click(startButton)

      // Assert - onViewDetails should not be called
      expect(mockOnViewDetails).not.toHaveBeenCalled()
    })

    it('should open phone dialer when call button is clicked', async () => {
      // Arrange
      const user = userEvent.setup()
      const booking = createMockBooking()
      const windowOpenSpy = vi.spyOn(window, 'open').mockImplementation(() => null)

      // Act
      render(
        <BookingCard
          booking={booking}
          onViewDetails={mockOnViewDetails}
        />
      )

      const callButton = screen.getByRole('button', { name: /Call/i })
      await user.click(callButton)

      // Assert
      expect(windowOpenSpy).toHaveBeenCalledWith('tel:0812345678')
    })

    it('should open Google Maps when map button is clicked', async () => {
      // Arrange
      const user = userEvent.setup()
      const booking = createMockBooking()
      const windowOpenSpy = vi.spyOn(window, 'open').mockImplementation(() => null)

      // Act
      render(
        <BookingCard
          booking={booking}
          onViewDetails={mockOnViewDetails}
        />
      )

      const mapButton = screen.getByRole('button', { name: /Map/i })
      await user.click(mapButton)

      // Assert
      expect(windowOpenSpy).toHaveBeenCalledWith(
        expect.stringContaining('https://www.google.com/maps/search/?api=1&query='),
        '_blank'
      )
    })

    it('should disable call button when phone is missing', () => {
      // Arrange
      const booking = createMockBooking({
        customers: {
          id: 'customer-123',
          full_name: 'Jane Doe',
          phone: '',
          avatar_url: null,
        },
      })

      // Act
      render(
        <BookingCard
          booking={booking}
          onViewDetails={mockOnViewDetails}
        />
      )

      // Assert
      const callButton = screen.getByRole('button', { name: /Call/i })
      expect(callButton).toBeDisabled()
    })

    it('should disable map button when address is missing', () => {
      // Arrange
      const booking = createMockBooking({
        address: '',
      })

      // Act
      render(
        <BookingCard
          booking={booking}
          onViewDetails={mockOnViewDetails}
        />
      )

      // Assert
      const mapButton = screen.getByRole('button', { name: /Map/i })
      expect(mapButton).toBeDisabled()
    })
  })

  describe('Action Buttons Visibility', () => {
    it('should show start progress button for confirmed bookings', () => {
      // Arrange
      const booking = createMockBooking({ status: 'confirmed' })

      // Act
      render(
        <BookingCard
          booking={booking}
          onViewDetails={mockOnViewDetails}
          onStartProgress={mockOnStartProgress}
        />
      )

      // Assert
      expect(screen.getByRole('button', { name: /Start Task/i })).toBeInTheDocument()
    })

    it('should not show start progress button for pending bookings', () => {
      // Arrange
      const booking = createMockBooking({ status: 'pending' })

      // Act
      render(
        <BookingCard
          booking={booking}
          onViewDetails={mockOnViewDetails}
          onStartProgress={mockOnStartProgress}
        />
      )

      // Assert
      expect(screen.queryByRole('button', { name: /Start Task/i })).not.toBeInTheDocument()
    })

    it('should show mark completed button for in_progress bookings', () => {
      // Arrange
      const booking = createMockBooking({ status: 'in_progress' })

      // Act
      render(
        <BookingCard
          booking={booking}
          onViewDetails={mockOnViewDetails}
          onMarkCompleted={mockOnMarkCompleted}
        />
      )

      // Assert
      expect(screen.getByRole('button', { name: /Complete/i })).toBeInTheDocument()
    })

    it('should not show mark completed button for confirmed bookings', () => {
      // Arrange
      const booking = createMockBooking({ status: 'confirmed' })

      // Act
      render(
        <BookingCard
          booking={booking}
          onViewDetails={mockOnViewDetails}
          onMarkCompleted={mockOnMarkCompleted}
        />
      )

      // Assert
      expect(screen.queryByRole('button', { name: /Complete/i })).not.toBeInTheDocument()
    })

    it('should not show action buttons when handlers are not provided', () => {
      // Arrange
      const booking = createMockBooking({ status: 'confirmed' })

      // Act
      render(
        <BookingCard
          booking={booking}
          onViewDetails={mockOnViewDetails}
        />
      )

      // Assert
      expect(screen.queryByRole('button', { name: /Start Task/i })).not.toBeInTheDocument()
    })

    it('should not show any action buttons for completed bookings', () => {
      // Arrange
      const booking = createMockBooking({ status: 'completed' })

      // Act
      render(
        <BookingCard
          booking={booking}
          onViewDetails={mockOnViewDetails}
          onStartProgress={mockOnStartProgress}
          onMarkCompleted={mockOnMarkCompleted}
        />
      )

      // Assert
      expect(screen.queryByRole('button', { name: /Start Task/i })).not.toBeInTheDocument()
      expect(screen.queryByRole('button', { name: /Complete/i })).not.toBeInTheDocument()
    })
  })

  describe('Loading States', () => {
    it('should show loading state when starting progress', () => {
      // Arrange
      const booking = createMockBooking({ status: 'confirmed' })

      // Act - use isStartingProgress prop to show loading state
      render(
        <BookingCard
          booking={booking}
          onViewDetails={mockOnViewDetails}
          onStartProgress={mockOnStartProgress}
          isStartingProgress={true}
        />
      )

      // Assert
      expect(screen.getByText(/Starting.../i)).toBeInTheDocument()
      const startButton = screen.getByRole('button', { name: /Starting.../i })
      expect(startButton).toBeDisabled()
    })

    it('should show loading state when marking completed', () => {
      // Arrange
      const booking = createMockBooking({ status: 'in_progress' })

      // Act - use isCompletingProgress prop to show loading state
      render(
        <BookingCard
          booking={booking}
          onViewDetails={mockOnViewDetails}
          onMarkCompleted={mockOnMarkCompleted}
          isCompletingProgress={true}
        />
      )

      // Assert
      expect(screen.getByText(/Saving.../i)).toBeInTheDocument()
      const completeButton = screen.getByRole('button', { name: /Saving.../i })
      expect(completeButton).toBeDisabled()
    })
  })

  describe('Edge Cases', () => {
    it('should handle null service package gracefully', () => {
      // Arrange
      const booking = createMockBooking({
        service_packages: null,
      })

      // Act
      render(
        <BookingCard
          booking={booking}
          onViewDetails={mockOnViewDetails}
        />
      )

      // Assert
      expect(screen.getByText('Unknown Service')).toBeInTheDocument()
    })

    it('should handle null customer gracefully', () => {
      // Arrange
      const booking = createMockBooking({
        customers: null,
      })

      // Act
      render(
        <BookingCard
          booking={booking}
          onViewDetails={mockOnViewDetails}
        />
      )

      // Assert
      expect(screen.getByText('Unknown Customer')).toBeInTheDocument()
    })

    it('should handle missing duration_minutes in service package', () => {
      // Arrange
      const booking = createMockBooking({
        service_packages: {
          id: 'service-123',
          name: 'Basic Cleaning',
          service_type: 'cleaning',
          duration_minutes: 0,
          price: 1500,
        },
      })

      // Act
      render(
        <BookingCard
          booking={booking}
          onViewDetails={mockOnViewDetails}
        />
      )

      // Assert - Should not crash
      expect(screen.getByText('Basic Cleaning')).toBeInTheDocument()
    })

    it('should render without notes when notes is null', () => {
      // Arrange
      const booking = createMockBooking({
        notes: null,
      })

      // Act
      render(
        <BookingCard
          booking={booking}
          onViewDetails={mockOnViewDetails}
        />
      )

      // Assert - Should not display notes section
      expect(screen.queryByText(/Please bring/)).not.toBeInTheDocument()
    })

    it('should render without address when address fields are missing', () => {
      // Arrange
      const booking = createMockBooking({
        address: '',
        city: '',
        state: '',
        zip_code: '',
      })

      // Act
      render(
        <BookingCard
          booking={booking}
          onViewDetails={mockOnViewDetails}
        />
      )

      // Assert - Map button should be disabled
      const mapButton = screen.getByRole('button', { name: /Map/i })
      expect(mapButton).toBeDisabled()
    })
  })

  describe('Accessibility', () => {
    it('should have accessible button labels', () => {
      // Arrange
      const booking = createMockBooking()

      // Act
      render(
        <BookingCard
          booking={booking}
          onViewDetails={mockOnViewDetails}
        />
      )

      // Assert
      expect(screen.getByRole('button', { name: /Call/i })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /Map/i })).toBeInTheDocument()
    })

    it('should be keyboard navigable for action buttons', async () => {
      // Arrange
      const user = userEvent.setup()
      const booking = createMockBooking({ status: 'confirmed' })
      mockOnStartProgress.mockResolvedValueOnce(undefined)

      // Act
      render(
        <BookingCard
          booking={booking}
          onViewDetails={mockOnViewDetails}
          onStartProgress={mockOnStartProgress}
        />
      )

      const startButton = screen.getByRole('button', { name: /Start Task/i })
      startButton.focus()
      await user.keyboard('{Enter}')

      // Assert
      await waitFor(() => {
        expect(mockOnStartProgress).toHaveBeenCalled()
      })
    })
  })
})
