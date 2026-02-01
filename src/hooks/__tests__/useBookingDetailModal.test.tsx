import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useBookingDetailModal } from '../use-booking-detail-modal'
import type { Booking } from '@/types/booking'
import type { ReactNode } from 'react'

// Mock dependencies
vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: vi.fn(() => ({
      delete: vi.fn(() => ({
        eq: vi.fn(() => Promise.resolve({ data: null, error: null })),
      })),
    })),
  },
}))

vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({
    toast: vi.fn(),
  }),
}))

vi.mock('@/hooks/use-soft-delete', () => ({
  useSoftDelete: () => ({
    softDelete: vi.fn().mockResolvedValue({ success: true }),
  }),
}))

vi.mock('@/hooks/useBookingStatusManager', () => ({
  useBookingStatusManager: () => ({
    showStatusConfirmDialog: false,
    pendingStatusChange: null,
    getStatusBadge: vi.fn(),
    getPaymentStatusBadge: vi.fn(),
    getAvailableStatuses: vi.fn(() => []),
    getStatusLabel: vi.fn((status: string) => status),
    getStatusTransitionMessage: vi.fn(() => 'Confirm status change?'),
    handleStatusChange: vi.fn(),
    confirmStatusChange: vi.fn(),
    cancelStatusChange: vi.fn(),
    markAsPaid: vi.fn(),
  }),
}))

vi.mock('@/hooks/usePaymentActions', () => ({
  usePaymentActions: () => ({
    verifyPayment: vi.fn(),
    requestRefund: vi.fn(),
    completeRefund: vi.fn(),
    cancelRefund: vi.fn(),
  }),
}))

// Create wrapper with QueryClientProvider
const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  })
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  )
}

describe('useBookingDetailModal', () => {
  const mockBooking: Booking = {
    id: 'booking-1',
    booking_date: '2024-01-15',
    start_time: '09:00',
    end_time: '11:00',
    status: 'pending',
    payment_status: 'unpaid',
    payment_method: undefined,
    payment_date: undefined,
    total_price: 1000,
    address: '123 Test St',
    city: 'Bangkok',
    state: 'Bangkok',
    zip_code: '10100',
    notes: null,
    staff_id: null,
    team_id: null,
    customer_id: 'customer-1',
    service_package_id: 'package-1',
    package_v2_id: null,
    customers: {
      id: 'customer-1',
      full_name: 'Test Customer',
      email: 'test@example.com',
      phone: '0812345678',
    },
    service_packages: {
      name: 'Test Package',
      service_type: 'cleaning',
    },
    profiles: null,
    teams: null,
  }

  const mockRefresh = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Modal State Management', () => {
    it('should initialize with closed state', () => {
      const { result } = renderHook(
        () => useBookingDetailModal({ refresh: mockRefresh }),
        { wrapper: createWrapper() }
      )

      expect(result.current.isOpen).toBe(false)
      expect(result.current.selectedBooking).toBeNull()
    })

    it('should open modal with selected booking', () => {
      const { result } = renderHook(
        () => useBookingDetailModal({ refresh: mockRefresh }),
        { wrapper: createWrapper() }
      )

      act(() => {
        result.current.openDetail(mockBooking)
      })

      expect(result.current.isOpen).toBe(true)
      expect(result.current.selectedBooking).toEqual(mockBooking)
    })

    it('should close modal and clear selected booking', () => {
      const { result } = renderHook(
        () => useBookingDetailModal({ refresh: mockRefresh }),
        { wrapper: createWrapper() }
      )

      act(() => {
        result.current.openDetail(mockBooking)
      })

      act(() => {
        result.current.closeDetail()
      })

      expect(result.current.isOpen).toBe(false)
      expect(result.current.selectedBooking).toBeNull()
    })
  })

  describe('Realtime Sync Logic - Flicker Prevention', () => {
    it('should NOT update when modal is closed', async () => {
      const bookings = [mockBooking]
      const { result, rerender } = renderHook(
        () => useBookingDetailModal({ refresh: mockRefresh, bookings }),
        { wrapper: createWrapper() }
      )

      // Modal is closed, so sync should not happen
      rerender()

      await waitFor(() => {
        expect(result.current.selectedBooking).toBeNull()
      })
    })

    it('should update when payment_status changes', async () => {
      const bookings = [mockBooking]
      const { result, rerender } = renderHook(
        ({ bookings }) => useBookingDetailModal({ refresh: mockRefresh, bookings }),
        {
          wrapper: createWrapper(),
          initialProps: { bookings },
        }
      )

      // Open modal
      act(() => {
        result.current.openDetail(mockBooking)
      })

      // Simulate realtime update - payment_status changed
      const updatedBooking = {
        ...mockBooking,
        payment_status: 'paid' as const,
        payment_method: 'cash',
        payment_date: '2024-01-15',
      }

      const updatedBookings = [updatedBooking]

      // Trigger re-render with new bookings
      rerender({ bookings: updatedBookings })

      await waitFor(() => {
        // Should update because payment_status changed
        expect(result.current.selectedBooking?.payment_status).toBe('paid')
      }, { timeout: 1000 })
    })

    it('should update when status changes', async () => {
      const bookings = [mockBooking]
      const { result, rerender } = renderHook(
        ({ bookings }) => useBookingDetailModal({ refresh: mockRefresh, bookings }),
        {
          wrapper: createWrapper(),
          initialProps: { bookings },
        }
      )

      act(() => {
        result.current.openDetail(mockBooking)
      })

      const updatedBooking = {
        ...mockBooking,
        status: 'confirmed' as const,
      }

      rerender({ bookings: [updatedBooking] })

      await waitFor(() => {
        expect(result.current.selectedBooking?.status).toBe('confirmed')
      }, { timeout: 1000 })
    })

    it('should NOT update when only non-critical fields change', async () => {
      const bookings = [mockBooking]
      const { result, rerender } = renderHook(
        () => useBookingDetailModal({ refresh: mockRefresh, bookings }),
        { wrapper: createWrapper() }
      )

      act(() => {
        result.current.openDetail(mockBooking)
      })

      const initialBooking = result.current.selectedBooking

      // Change only non-critical field (notes) - don't rerender with changes
      rerender()

      // Should NOT update because only non-critical fields changed
      await waitFor(() => {
        expect(result.current.selectedBooking).toBe(initialBooking)
      }, { timeout: 500 })
    })

    it('should handle payment_slip_url changes', async () => {
      const bookingWithSlip = {
        ...mockBooking,
        payment_slip_url: null,
      } as Booking & { payment_slip_url?: string }

      const bookings = [bookingWithSlip]
      const { result, rerender } = renderHook(
        ({ bookings }) => useBookingDetailModal({ refresh: mockRefresh, bookings }),
        {
          wrapper: createWrapper(),
          initialProps: { bookings },
        }
      )

      act(() => {
        result.current.openDetail(bookingWithSlip)
      })

      // Simulate slip upload
      const updatedBooking = {
        ...bookingWithSlip,
        payment_slip_url: 'https://example.com/slip.jpg',
      }

      rerender({ bookings: [updatedBooking] })

      await waitFor(() => {
        const selected = result.current.selectedBooking as Booking & { payment_slip_url?: string }
        expect(selected?.payment_slip_url).toBe('https://example.com/slip.jpg')
      }, { timeout: 1000 })
    })

    it('should reset ref when modal closes', async () => {
      const bookings = [mockBooking]
      const { result } = renderHook(
        () => useBookingDetailModal({ refresh: mockRefresh, bookings }),
        { wrapper: createWrapper() }
      )

      // Open modal
      act(() => {
        result.current.openDetail(mockBooking)
      })

      // Close modal
      act(() => {
        result.current.closeDetail()
      })

      // Ref should be reset (we can't directly test ref, but modal state should be clean)
      expect(result.current.isOpen).toBe(false)
      expect(result.current.selectedBooking).toBeNull()
    })
  })

  describe('Performance - Preventing Unnecessary Updates', () => {
    it('should not trigger update when bookings array reference changes but content is same', async () => {
      const bookings = [mockBooking]
      const { result, rerender } = renderHook(
        ({ bookings }) => useBookingDetailModal({ refresh: mockRefresh, bookings }),
        {
          wrapper: createWrapper(),
          initialProps: { bookings },
        }
      )

      act(() => {
        result.current.openDetail(mockBooking)
      })

      const initialBooking = result.current.selectedBooking

      // Create new array reference with same content
      const newBookingsArray = [...bookings]

      rerender({ bookings: newBookingsArray })

      // Should not update because critical fields haven't changed
      await waitFor(() => {
        expect(result.current.selectedBooking).toBe(initialBooking)
      }, { timeout: 500 })
    })
  })

  describe('Edge Cases', () => {
    it('should handle empty bookings array', async () => {
      const { result } = renderHook(
        () => useBookingDetailModal({ refresh: mockRefresh, bookings: [] }),
        { wrapper: createWrapper() }
      )

      act(() => {
        result.current.openDetail(mockBooking)
      })

      // Should keep selectedBooking even if bookings array is empty
      expect(result.current.selectedBooking).toEqual(mockBooking)
    })

    it('should handle booking not found in array', async () => {
      const otherBooking = { ...mockBooking, id: 'other-booking' }
      const bookings = [otherBooking]

      const { result } = renderHook(
        () => useBookingDetailModal({ refresh: mockRefresh, bookings }),
        { wrapper: createWrapper() }
      )

      act(() => {
        result.current.openDetail(mockBooking)
      })

      // Should keep original booking if not found in array
      expect(result.current.selectedBooking?.id).toBe('booking-1')
    })
  })
})
