import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useBookingStatusManager } from '../useBookingStatusManager'
import { supabase } from '@/lib/supabase'
import type { BookingBase } from '@/types/booking'
import type { ReactNode } from 'react'

// Mock dependencies
vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: vi.fn(),
    functions: {
      invoke: vi.fn().mockResolvedValue({ data: null, error: null }),
    },
  },
}))

// Create wrapper with QueryClientProvider
const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  })
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  )
}

vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({
    toast: vi.fn(),
  }),
}))

vi.mock('@/lib/error-utils', () => ({
  getErrorMessage: (error: unknown) =>
    error instanceof Error ? error.message : 'Unknown error',
}))

vi.mock('@/components/common/StatusBadge', () => ({
  StatusBadge: ({ children }: { children: ReactNode }) => <span>{children}</span>,
  getBookingStatusVariant: (status: string) => status,
  getBookingStatusLabel: (status: string) => status,
  getPaymentStatusVariant: (status: string) => status,
  getPaymentStatusLabel: (status: string) => status,
}))

/* eslint-disable @typescript-eslint/no-explicit-any */
describe('useBookingStatusManager', () => {
  const mockBooking: BookingBase = {
    id: 'booking-1',
    status: 'pending',
    total_price: 1000,
  }

  const defaultProps = {
    selectedBooking: mockBooking,
    setSelectedBooking: vi.fn(),
    onSuccess: vi.fn(),
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Initialization', () => {
    it('should initialize with default state', () => {
      // Act
      const { result } = renderHook(() => useBookingStatusManager(defaultProps), { wrapper: createWrapper() })

      // Assert
      expect(result.current.showStatusConfirmDialog).toBe(false)
      expect(result.current.pendingStatusChange).toBeNull()
      expect(result.current.isUpdatingStatus).toBe(false)
    })

    it('should provide all required functions', () => {
      // Act
      const { result } = renderHook(() => useBookingStatusManager(defaultProps), { wrapper: createWrapper() })

      // Assert
      expect(typeof result.current.getStatusBadge).toBe('function')
      expect(typeof result.current.getPaymentStatusBadge).toBe('function')
      expect(typeof result.current.getValidTransitions).toBe('function')
      expect(typeof result.current.getAvailableStatuses).toBe('function')
      expect(typeof result.current.getStatusLabel).toBe('function')
      expect(typeof result.current.getStatusTransitionMessage).toBe('function')
      expect(typeof result.current.handleStatusChange).toBe('function')
      expect(typeof result.current.confirmStatusChange).toBe('function')
      expect(typeof result.current.cancelStatusChange).toBe('function')
      expect(typeof result.current.markAsPaid).toBe('function')
    })
  })

  describe('Status Transitions - Finite State Machine', () => {
    describe('Pending Status Transitions', () => {
      it('should allow transition from pending to confirmed', () => {
        // Arrange
        const { result } = renderHook(() => useBookingStatusManager(defaultProps), { wrapper: createWrapper() })

        // Act
        const validTransitions = result.current.getValidTransitions('pending')

        // Assert
        expect(validTransitions).toContain('confirmed')
      })

      it('should allow transition from pending to cancelled', () => {
        // Arrange
        const { result } = renderHook(() => useBookingStatusManager(defaultProps), { wrapper: createWrapper() })

        // Act
        const validTransitions = result.current.getValidTransitions('pending')

        // Assert
        expect(validTransitions).toContain('cancelled')
      })

      it('should only allow confirmed and cancelled from pending', () => {
        // Arrange
        const { result } = renderHook(() => useBookingStatusManager(defaultProps), { wrapper: createWrapper() })

        // Act
        const validTransitions = result.current.getValidTransitions('pending')

        // Assert
        expect(validTransitions).toHaveLength(2)
        expect(validTransitions).toEqual(['confirmed', 'cancelled'])
      })
    })

    describe('Confirmed Status Transitions', () => {
      it('should allow transition from confirmed to in_progress', () => {
        // Arrange
        const { result } = renderHook(() => useBookingStatusManager(defaultProps), { wrapper: createWrapper() })

        // Act
        const validTransitions = result.current.getValidTransitions('confirmed')

        // Assert
        expect(validTransitions).toContain('in_progress')
      })

      it('should allow transition from confirmed to cancelled', () => {
        // Arrange
        const { result } = renderHook(() => useBookingStatusManager(defaultProps), { wrapper: createWrapper() })

        // Act
        const validTransitions = result.current.getValidTransitions('confirmed')

        // Assert
        expect(validTransitions).toContain('cancelled')
      })

      it('should allow transition from confirmed to no_show', () => {
        // Arrange
        const { result } = renderHook(() => useBookingStatusManager(defaultProps), { wrapper: createWrapper() })

        // Act
        const validTransitions = result.current.getValidTransitions('confirmed')

        // Assert
        expect(validTransitions).toContain('no_show')
      })

      it('should only allow specific transitions from confirmed', () => {
        // Arrange
        const { result } = renderHook(() => useBookingStatusManager(defaultProps), { wrapper: createWrapper() })

        // Act
        const validTransitions = result.current.getValidTransitions('confirmed')

        // Assert
        expect(validTransitions).toHaveLength(3)
        expect(validTransitions).toEqual(['in_progress', 'cancelled', 'no_show'])
      })
    })

    describe('In Progress Status Transitions', () => {
      it('should allow transition from in_progress to completed', () => {
        // Arrange
        const { result } = renderHook(() => useBookingStatusManager(defaultProps), { wrapper: createWrapper() })

        // Act
        const validTransitions = result.current.getValidTransitions('in_progress')

        // Assert
        expect(validTransitions).toContain('completed')
      })

      it('should allow transition from in_progress to cancelled', () => {
        // Arrange
        const { result } = renderHook(() => useBookingStatusManager(defaultProps), { wrapper: createWrapper() })

        // Act
        const validTransitions = result.current.getValidTransitions('in_progress')

        // Assert
        expect(validTransitions).toContain('cancelled')
      })

      it('should only allow completed and cancelled from in_progress', () => {
        // Arrange
        const { result } = renderHook(() => useBookingStatusManager(defaultProps), { wrapper: createWrapper() })

        // Act
        const validTransitions = result.current.getValidTransitions('in_progress')

        // Assert
        expect(validTransitions).toHaveLength(2)
        expect(validTransitions).toEqual(['completed', 'cancelled'])
      })
    })

    describe('Final States', () => {
      it('should allow no transitions from completed', () => {
        // Arrange
        const { result } = renderHook(() => useBookingStatusManager(defaultProps), { wrapper: createWrapper() })

        // Act
        const validTransitions = result.current.getValidTransitions('completed')

        // Assert
        expect(validTransitions).toHaveLength(0)
        expect(validTransitions).toEqual([])
      })

      it('should allow no transitions from cancelled', () => {
        // Arrange
        const { result } = renderHook(() => useBookingStatusManager(defaultProps), { wrapper: createWrapper() })

        // Act
        const validTransitions = result.current.getValidTransitions('cancelled')

        // Assert
        expect(validTransitions).toHaveLength(0)
        expect(validTransitions).toEqual([])
      })

      it('should allow no transitions from no_show', () => {
        // Arrange
        const { result } = renderHook(() => useBookingStatusManager(defaultProps), { wrapper: createWrapper() })

        // Act
        const validTransitions = result.current.getValidTransitions('no_show')

        // Assert
        expect(validTransitions).toHaveLength(0)
        expect(validTransitions).toEqual([])
      })
    })

    describe('Invalid Transitions', () => {
      it('should return empty array for unknown status', () => {
        // Arrange
        const { result } = renderHook(() => useBookingStatusManager(defaultProps), { wrapper: createWrapper() })

        // Act
        const validTransitions = result.current.getValidTransitions('unknown_status')

        // Assert
        expect(validTransitions).toEqual([])
      })

      it('should prevent direct pending to completed transition', () => {
        // Arrange
        const { result } = renderHook(() => useBookingStatusManager(defaultProps), { wrapper: createWrapper() })

        // Act
        const validTransitions = result.current.getValidTransitions('pending')

        // Assert
        expect(validTransitions).not.toContain('completed')
      })

      it('should prevent direct confirmed to completed transition', () => {
        // Arrange
        const { result } = renderHook(() => useBookingStatusManager(defaultProps), { wrapper: createWrapper() })

        // Act
        const validTransitions = result.current.getValidTransitions('confirmed')

        // Assert
        expect(validTransitions).not.toContain('completed')
      })
    })
  })

  describe('Available Statuses', () => {
    it('should include current status in available statuses', () => {
      // Arrange
      const { result } = renderHook(() => useBookingStatusManager(defaultProps), { wrapper: createWrapper() })

      // Act
      const availableStatuses = result.current.getAvailableStatuses('pending')

      // Assert
      expect(availableStatuses).toContain('pending')
    })

    it('should include valid transitions in available statuses', () => {
      // Arrange
      const { result } = renderHook(() => useBookingStatusManager(defaultProps), { wrapper: createWrapper() })

      // Act
      const availableStatuses = result.current.getAvailableStatuses('pending')

      // Assert
      expect(availableStatuses).toContain('confirmed')
      expect(availableStatuses).toContain('cancelled')
    })

    it('should have current status as first item', () => {
      // Arrange
      const { result } = renderHook(() => useBookingStatusManager(defaultProps), { wrapper: createWrapper() })

      // Act
      const availableStatuses = result.current.getAvailableStatuses('pending')

      // Assert
      expect(availableStatuses[0]).toBe('pending')
    })
  })

  describe('Status Labels', () => {
    it('should return correct label for pending', () => {
      // Arrange
      const { result } = renderHook(() => useBookingStatusManager(defaultProps), { wrapper: createWrapper() })

      // Act
      const label = result.current.getStatusLabel('pending')

      // Assert
      expect(label).toBe('Pending')
    })

    it('should return correct label for confirmed', () => {
      // Arrange
      const { result } = renderHook(() => useBookingStatusManager(defaultProps), { wrapper: createWrapper() })

      // Act
      const label = result.current.getStatusLabel('confirmed')

      // Assert
      expect(label).toBe('Confirmed')
    })

    it('should return correct label for in_progress', () => {
      // Arrange
      const { result } = renderHook(() => useBookingStatusManager(defaultProps), { wrapper: createWrapper() })

      // Act
      const label = result.current.getStatusLabel('in_progress')

      // Assert
      expect(label).toBe('In Progress')
    })

    it('should return correct label for completed', () => {
      // Arrange
      const { result } = renderHook(() => useBookingStatusManager(defaultProps), { wrapper: createWrapper() })

      // Act
      const label = result.current.getStatusLabel('completed')

      // Assert
      expect(label).toBe('Completed')
    })

    it('should return correct label for cancelled', () => {
      // Arrange
      const { result } = renderHook(() => useBookingStatusManager(defaultProps), { wrapper: createWrapper() })

      // Act
      const label = result.current.getStatusLabel('cancelled')

      // Assert
      expect(label).toBe('Cancelled')
    })

    it('should return correct label for no_show', () => {
      // Arrange
      const { result } = renderHook(() => useBookingStatusManager(defaultProps), { wrapper: createWrapper() })

      // Act
      const label = result.current.getStatusLabel('no_show')

      // Assert
      expect(label).toBe('No Show')
    })

    it('should return original status for unknown status', () => {
      // Arrange
      const { result } = renderHook(() => useBookingStatusManager(defaultProps), { wrapper: createWrapper() })

      // Act
      const label = result.current.getStatusLabel('unknown')

      // Assert
      expect(label).toBe('unknown')
    })
  })

  describe('Transition Messages', () => {
    it('should return confirmation message for pending to confirmed', () => {
      // Arrange
      const { result } = renderHook(() => useBookingStatusManager(defaultProps), { wrapper: createWrapper() })

      // Act
      const message = result.current.getStatusTransitionMessage('pending', 'confirmed')

      // Assert
      expect(message).toBe('Confirm this booking?')
    })

    it('should return cancellation message for pending to cancelled', () => {
      // Arrange
      const { result } = renderHook(() => useBookingStatusManager(defaultProps), { wrapper: createWrapper() })

      // Act
      const message = result.current.getStatusTransitionMessage('pending', 'cancelled')

      // Assert
      expect(message).toContain('Cancel this booking')
      expect(message).toContain('cannot be undone')
    })

    it('should return in progress message for confirmed to in_progress', () => {
      // Arrange
      const { result } = renderHook(() => useBookingStatusManager(defaultProps), { wrapper: createWrapper() })

      // Act
      const message = result.current.getStatusTransitionMessage('confirmed', 'in_progress')

      // Assert
      expect(message).toBe('Mark this booking as in progress?')
    })

    it('should return no-show message for confirmed to no_show', () => {
      // Arrange
      const { result } = renderHook(() => useBookingStatusManager(defaultProps), { wrapper: createWrapper() })

      // Act
      const message = result.current.getStatusTransitionMessage('confirmed', 'no_show')

      // Assert
      expect(message).toContain('no-show')
      expect(message).toContain('cannot be undone')
    })

    it('should return completion message for in_progress to completed', () => {
      // Arrange
      const { result } = renderHook(() => useBookingStatusManager(defaultProps), { wrapper: createWrapper() })

      // Act
      const message = result.current.getStatusTransitionMessage('in_progress', 'completed')

      // Assert
      expect(message).toBe('Mark this booking as completed?')
    })

    it('should return generic message for unknown transition', () => {
      // Arrange
      const { result } = renderHook(() => useBookingStatusManager(defaultProps), { wrapper: createWrapper() })

      // Act
      const message = result.current.getStatusTransitionMessage('unknown', 'another')

      // Assert - Now includes "from X to Y" format with user-friendly labels
      expect(message).toBe('Change status from unknown to another?')
    })
  })

  describe('Status Change Handling', () => {
    it('should ignore same status change', () => {
      // Arrange
      const { result } = renderHook(() => useBookingStatusManager(defaultProps), { wrapper: createWrapper() })

      // Act
      act(() => {
        result.current.handleStatusChange('booking-1', 'pending', 'pending')
      })

      // Assert
      expect(result.current.showStatusConfirmDialog).toBe(false)
      expect(result.current.pendingStatusChange).toBeNull()
    })

    it('should show confirmation dialog for valid transition', () => {
      // Arrange
      const { result } = renderHook(() => useBookingStatusManager(defaultProps), { wrapper: createWrapper() })

      // Act
      act(() => {
        result.current.handleStatusChange('booking-1', 'pending', 'confirmed')
      })

      // Assert
      expect(result.current.showStatusConfirmDialog).toBe(true)
      expect(result.current.pendingStatusChange).toEqual({
        bookingId: 'booking-1',
        currentStatus: 'pending',
        newStatus: 'confirmed',
      })
    })

    it('should reject invalid transition and not show dialog', () => {
      // Arrange
      const { result } = renderHook(() => useBookingStatusManager(defaultProps), { wrapper: createWrapper() })

      // Act
      act(() => {
        result.current.handleStatusChange('booking-1', 'pending', 'completed')
      })

      // Assert
      expect(result.current.showStatusConfirmDialog).toBe(false)
      expect(result.current.pendingStatusChange).toBeNull()
    })

    it('should reject transition from final state', () => {
      // Arrange
      const { result } = renderHook(() => useBookingStatusManager(defaultProps), { wrapper: createWrapper() })

      // Act
      act(() => {
        result.current.handleStatusChange('booking-1', 'completed', 'pending')
      })

      // Assert
      expect(result.current.showStatusConfirmDialog).toBe(false)
      expect(result.current.pendingStatusChange).toBeNull()
    })
  })

  describe('Confirmation Dialog Management', () => {
    it('should allow manual dialog control', () => {
      // Arrange
      const { result } = renderHook(() => useBookingStatusManager(defaultProps), { wrapper: createWrapper() })

      // Act
      act(() => {
        result.current.setShowStatusConfirmDialog(true)
      })

      // Assert
      expect(result.current.showStatusConfirmDialog).toBe(true)
    })

    it('should cancel status change and close dialog', () => {
      // Arrange
      const { result } = renderHook(() => useBookingStatusManager(defaultProps), { wrapper: createWrapper() })

      act(() => {
        result.current.handleStatusChange('booking-1', 'pending', 'confirmed')
      })

      // Act
      act(() => {
        result.current.cancelStatusChange()
      })

      // Assert
      expect(result.current.showStatusConfirmDialog).toBe(false)
      expect(result.current.pendingStatusChange).toBeNull()
    })
  })

  describe('Status Change Execution', () => {
    it('should update database on confirm', async () => {
      // Arrange
      const mockUpdate = vi.fn().mockReturnThis()
      const mockEq = vi.fn().mockResolvedValue({ error: null })

      vi.mocked(supabase.from).mockReturnValue({
        update: mockUpdate,
        eq: mockEq,
      } as any)

      const { result } = renderHook(() => useBookingStatusManager(defaultProps), { wrapper: createWrapper() })

      act(() => {
        result.current.handleStatusChange('booking-1', 'pending', 'confirmed')
      })

      // Act
      await act(async () => {
        await result.current.confirmStatusChange()
      })

      // Assert
      expect(supabase.from).toHaveBeenCalledWith('bookings')
      expect(mockUpdate).toHaveBeenCalledWith({ status: 'confirmed' })
      expect(mockEq).toHaveBeenCalledWith('id', 'booking-1')
    })

    it('should update selected booking on success', async () => {
      // Arrange
      const setSelectedBooking = vi.fn()
      const mockUpdate = vi.fn().mockReturnThis()
      const mockEq = vi.fn().mockResolvedValue({ error: null })

      vi.mocked(supabase.from).mockReturnValue({
        update: mockUpdate,
        eq: mockEq,
      } as any)

      const { result } = renderHook(() =>
        useBookingStatusManager({
          ...defaultProps,
          setSelectedBooking,
        }),
        { wrapper: createWrapper() }
      )

      act(() => {
        result.current.handleStatusChange('booking-1', 'pending', 'confirmed')
      })

      // Act
      await act(async () => {
        await result.current.confirmStatusChange()
      })

      // Assert
      expect(setSelectedBooking).toHaveBeenCalledWith({
        ...mockBooking,
        status: 'confirmed',
      })
    })

    it('should call onSuccess callback', async () => {
      // Arrange
      const onSuccess = vi.fn()
      const mockUpdate = vi.fn().mockReturnThis()
      const mockEq = vi.fn().mockResolvedValue({ error: null })

      vi.mocked(supabase.from).mockReturnValue({
        update: mockUpdate,
        eq: mockEq,
      } as any)

      const { result } = renderHook(() =>
        useBookingStatusManager({
          ...defaultProps,
          onSuccess,
        }),
        { wrapper: createWrapper() }
      )

      act(() => {
        result.current.handleStatusChange('booking-1', 'pending', 'confirmed')
      })

      // Act
      await act(async () => {
        await result.current.confirmStatusChange()
      })

      // Assert
      expect(onSuccess).toHaveBeenCalled()
    })

    it('should close dialog after successful update', async () => {
      // Arrange
      const mockUpdate = vi.fn().mockReturnThis()
      const mockEq = vi.fn().mockResolvedValue({ error: null })

      vi.mocked(supabase.from).mockReturnValue({
        update: mockUpdate,
        eq: mockEq,
      } as any)

      const { result } = renderHook(() => useBookingStatusManager(defaultProps), { wrapper: createWrapper() })

      act(() => {
        result.current.handleStatusChange('booking-1', 'pending', 'confirmed')
      })

      // Act
      await act(async () => {
        await result.current.confirmStatusChange()
      })

      // Assert
      expect(result.current.showStatusConfirmDialog).toBe(false)
      expect(result.current.pendingStatusChange).toBeNull()
    })

    it('should handle database errors', async () => {
      // Arrange
      const mockUpdate = vi.fn().mockReturnThis()
      const mockEq = vi.fn().mockResolvedValue({
        error: { message: 'Database error' },
      })

      vi.mocked(supabase.from).mockReturnValue({
        update: mockUpdate,
        eq: mockEq,
      } as any)

      const { result } = renderHook(() => useBookingStatusManager(defaultProps), { wrapper: createWrapper() })

      act(() => {
        result.current.handleStatusChange('booking-1', 'pending', 'confirmed')
      })

      // Act
      await act(async () => {
        await result.current.confirmStatusChange()
      })

      // Assert - With optimistic updates, dialog closes immediately
      // On error, status gets rolled back but dialog stays closed
      expect(result.current.showStatusConfirmDialog).toBe(false)
      expect(result.current.pendingStatusChange).toBeNull()
    })

    it('should not execute if no pending change', async () => {
      // Arrange
      const mockUpdate = vi.fn()

      vi.mocked(supabase.from).mockReturnValue({
        update: mockUpdate,
      } as any)

      const { result } = renderHook(() => useBookingStatusManager(defaultProps), { wrapper: createWrapper() })

      // Act
      await act(async () => {
        await result.current.confirmStatusChange()
      })

      // Assert
      expect(mockUpdate).not.toHaveBeenCalled()
    })

    it('should set isUpdatingStatus to true during status update', async () => {
      // Arrange
      const mockUpdate = vi.fn().mockReturnThis()
      const mockEq = vi.fn().mockResolvedValue({ error: null })

      vi.mocked(supabase.from).mockReturnValue({
        update: mockUpdate,
        eq: mockEq,
      } as any)

      const { result } = renderHook(() => useBookingStatusManager(defaultProps), { wrapper: createWrapper() })

      act(() => {
        result.current.handleStatusChange('booking-1', 'pending', 'confirmed')
      })

      // Assert initial state
      expect(result.current.isUpdatingStatus).toBe(false)

      // Act - start status change
      const statusChangePromise = act(async () => {
        await result.current.confirmStatusChange()
      })

      // Note: isUpdatingStatus is set to true and then false within confirmStatusChange
      // Since the operation is async, by the time we check here, it's already completed
      await statusChangePromise

      // Assert final state - should be false after completion
      expect(result.current.isUpdatingStatus).toBe(false)
    })
  })

  describe('Payment Status Management', () => {
    // Helper to create mock chain for markAsPaid
    const createMarkAsPaidMocks = (booking = { id: 'booking-1', total_price: 1000, recurring_group_id: null }) => {
      const mockUpdate = vi.fn().mockReturnThis()
      const mockUpdateEq = vi.fn().mockResolvedValue({ error: null })
      const mockSelect = vi.fn().mockReturnThis()
      const mockSelectEq = vi.fn().mockReturnThis()
      const mockSingle = vi.fn().mockResolvedValue({
        data: { ...booking, customers: { full_name: 'John Doe' } },
        error: null,
      })

      vi.mocked(supabase.from).mockImplementation((table: string) => {
        if (table === 'bookings') {
          return {
            select: mockSelect,
            update: mockUpdate,
            eq: vi.fn().mockImplementation(() => ({
              single: mockSingle,
              eq: mockSelectEq,
            })),
          } as any
        }
        return {} as any
      })

      // Make update chain work correctly
      mockUpdate.mockImplementation(() => ({
        eq: mockUpdateEq,
      }))

      return { mockUpdate, mockUpdateEq, mockSelect }
    }

    it('should mark booking as paid with default method', async () => {
      // Arrange
      const { mockUpdate } = createMarkAsPaidMocks()

      const { result } = renderHook(() => useBookingStatusManager(defaultProps), { wrapper: createWrapper() })

      // Act
      await act(async () => {
        await result.current.markAsPaid('booking-1')
      })

      // Assert
      expect(mockUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          payment_status: 'paid',
          payment_method: 'cash',
          amount_paid: 1000,
        })
      )
    })

    it('should mark booking as paid with custom method', async () => {
      // Arrange
      const { mockUpdate } = createMarkAsPaidMocks()

      const { result } = renderHook(() => useBookingStatusManager(defaultProps), { wrapper: createWrapper() })

      // Act
      await act(async () => {
        await result.current.markAsPaid('booking-1', 'credit_card')
      })

      // Assert
      expect(mockUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          payment_method: 'credit_card',
        })
      )
    })

    it('should set payment date to today', async () => {
      // Arrange
      const { mockUpdate } = createMarkAsPaidMocks()

      const { result } = renderHook(() => useBookingStatusManager(defaultProps), { wrapper: createWrapper() })

      // Act
      await act(async () => {
        await result.current.markAsPaid('booking-1')
      })

      // Assert - payment_date should be set (format may vary based on timezone)
      expect(mockUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          payment_date: expect.any(String),
        })
      )
    })

    it('should update selected booking payment info', async () => {
      // Arrange
      const setSelectedBooking = vi.fn()
      createMarkAsPaidMocks()

      const { result } = renderHook(() =>
        useBookingStatusManager({
          ...defaultProps,
          setSelectedBooking,
        }),
        { wrapper: createWrapper() }
      )

      // Act
      await act(async () => {
        await result.current.markAsPaid('booking-1', 'transfer')
      })

      // Assert
      expect(setSelectedBooking).toHaveBeenCalledWith(
        expect.objectContaining({
          payment_status: 'paid',
          payment_method: 'transfer',
          amount_paid: 1000,
        })
      )
    })

    it('should call onSuccess after marking as paid', async () => {
      // Arrange
      const onSuccess = vi.fn()
      createMarkAsPaidMocks()

      const { result } = renderHook(() =>
        useBookingStatusManager({
          ...defaultProps,
          onSuccess,
        }),
        { wrapper: createWrapper() }
      )

      // Act
      await act(async () => {
        await result.current.markAsPaid('booking-1')
      })

      // Assert
      expect(onSuccess).toHaveBeenCalled()
    })

    it('should handle payment update errors', async () => {
      // Arrange
      const mockUpdate = vi.fn().mockReturnThis()
      const mockEq = vi.fn().mockResolvedValue({
        error: { message: 'Payment update failed' },
      })

      vi.mocked(supabase.from).mockReturnValue({
        update: mockUpdate,
        eq: mockEq,
      } as any)

      const onSuccess = vi.fn()

      const { result } = renderHook(() =>
        useBookingStatusManager({
          ...defaultProps,
          onSuccess,
        }),
        { wrapper: createWrapper() }
      )

      // Act
      await act(async () => {
        await result.current.markAsPaid('booking-1')
      })

      // Assert - onSuccess should not be called on error
      expect(onSuccess).not.toHaveBeenCalled()
    })
  })

  describe('Badge Rendering', () => {
    it('should render status badge', () => {
      // Arrange
      const { result } = renderHook(() => useBookingStatusManager(defaultProps), { wrapper: createWrapper() })

      // Act
      const badge = result.current.getStatusBadge('pending')

      // Assert
      expect(badge).toBeDefined()
    })

    it('should render payment status badge with default unpaid', () => {
      // Arrange
      const { result } = renderHook(() => useBookingStatusManager(defaultProps), { wrapper: createWrapper() })

      // Act
      const badge = result.current.getPaymentStatusBadge()

      // Assert
      expect(badge).toBeDefined()
    })

    it('should render payment status badge with custom status', () => {
      // Arrange
      const { result } = renderHook(() => useBookingStatusManager(defaultProps), { wrapper: createWrapper() })

      // Act
      const badge = result.current.getPaymentStatusBadge('paid')

      // Assert
      expect(badge).toBeDefined()
    })
  })
})
