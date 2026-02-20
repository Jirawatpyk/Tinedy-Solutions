/**
 * Integration Tests for useOptimisticPayment
 *
 * ทดสอบ payment operations พร้อม optimistic updates:
 * - markAsPaid (single & group)
 * - verifyPayment (single & group)
 * - requestRefund
 * - completeRefund
 * - cancelRefund
 * - Toast messages
 * - Error rollback
 */

import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { useOptimisticPayment } from '../use-optimistic-payment'
import React, { type ReactNode } from 'react'
import type { Booking } from '@/types/booking'

// Mock sonner toast (code uses toast.success/toast.error from sonner)
const mockToastSuccess = vi.fn()
const mockToastError = vi.fn()
vi.mock('sonner', () => ({
  toast: {
    success: (...args: unknown[]) => mockToastSuccess(...args),
    error: (...args: unknown[]) => mockToastError(...args),
  },
}))

// Mock mapErrorToUserMessage
vi.mock('@/lib/error-messages', () => ({
  mapErrorToUserMessage: (error: unknown) => ({
    title: 'Error',
    description: error instanceof Error ? error.message : 'Unknown error',
  }),
}))

// Mock payment service
const mockMarkAsPaidService = vi.fn()
const mockVerifyPaymentService = vi.fn()
const mockRequestRefundService = vi.fn()
const mockCompleteRefundService = vi.fn()
const mockCancelRefundService = vi.fn()

vi.mock('@/services/payment-service', () => ({
  markAsPaid: (...args: unknown[]) => mockMarkAsPaidService(...args),
  verifyPayment: (...args: unknown[]) => mockVerifyPaymentService(...args),
  requestRefund: (...args: unknown[]) => mockRequestRefundService(...args),
  completeRefund: (...args: unknown[]) => mockCompleteRefundService(...args),
  cancelRefund: (...args: unknown[]) => mockCancelRefundService(...args),
}))

// Mock queryKeys
vi.mock('@/lib/query-keys', () => ({
  queryKeys: {
    bookings: {
      all: ['bookings'],
    },
  },
}))

describe('useOptimisticPayment', () => {
  let queryClient: QueryClient

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    })
    mockToastSuccess.mockClear()
    mockToastError.mockClear()
    mockMarkAsPaidService.mockClear()
    mockVerifyPaymentService.mockClear()
    mockRequestRefundService.mockClear()
    mockCompleteRefundService.mockClear()
    mockCancelRefundService.mockClear()
  })

  const wrapper = ({ children }: { children: ReactNode }) => {
    return React.createElement(QueryClientProvider, { client: queryClient }, children)
  }

  const mockBooking: Booking = {
    id: 'booking-1',
    customer_id: 'customer-1',
    booking_date: '2024-01-01',
    start_time: '10:00',
    end_time: '11:00',
    status: 'confirmed',
    payment_status: 'unpaid',
    total_price: 1000,
    created_at: '2024-01-01T00:00:00Z',
    recurring_group_id: null,
    address: '123 Main St',
    city: 'Bangkok',
    state: 'Bangkok',
    zip_code: '10100',
    staff_id: 'staff-1',
    team_id: 'team-1',
    notes: null,
    customers: { id: 'customer-1', full_name: 'Test Customer', email: 'test@example.com' },
    service_packages: { name: 'Basic Service', service_type: 'cleaning', price: 1000 },
    profiles: { full_name: 'Test Staff' },
    teams: { name: 'Test Team' },
  }

  describe('markAsPaid - Single Booking', () => {
    it('should mark single booking as paid with optimistic update', async () => {
      // Setup: Add booking to cache
      const queryKey = ['bookings']
      queryClient.setQueryData(queryKey, [mockBooking])

      // Mock successful API response
      mockMarkAsPaidService.mockResolvedValue({
        success: true,
        count: 1,
      })

      const onSuccess = vi.fn()
      const { result } = renderHook(
        () =>
          useOptimisticPayment({
            selectedBooking: mockBooking,
            setSelectedBooking: undefined,
            onSuccess,
          }),
        { wrapper }
      )

      // Execute
      await result.current.markAsPaid.mutate({
        bookingId: 'booking-1',
        paymentMethod: 'cash',
        amount: 1000,
      })

      // Verify cache updated
      const cachedData = queryClient.getQueryData<Booking[]>(queryKey)
      expect(cachedData?.[0].payment_status).toBe('paid')
      expect(cachedData?.[0].payment_method).toBe('cash')
      expect(cachedData?.[0].amount_paid).toBe(1000)

      // Verify toast called (Sonner: toast.success(title, { description }))
      await waitFor(() => {
        expect(mockToastSuccess).toHaveBeenCalledWith('Success', {
          description: 'Booking marked as paid',
        })
      })

      // Verify onSuccess called
      expect(onSuccess).toHaveBeenCalledTimes(1)
    })

    it('should update selectedBooking state when provided', async () => {
      mockMarkAsPaidService.mockResolvedValue({
        success: true,
        count: 1,
      })

      const setSelectedBooking = vi.fn()
      const { result } = renderHook(
        () =>
          useOptimisticPayment({
            selectedBooking: mockBooking,
            setSelectedBooking,
            onSuccess: vi.fn(),
          }),
        { wrapper }
      )

      await result.current.markAsPaid.mutate({
        bookingId: 'booking-1',
        paymentMethod: 'credit_card',
        amount: 1000,
      })

      // Verify setSelectedBooking called with updated state
      await waitFor(() => {
        expect(setSelectedBooking).toHaveBeenCalledWith(
          expect.objectContaining({
            id: 'booking-1',
            payment_status: 'paid',
            payment_method: 'credit_card',
            amount_paid: 1000,
          })
        )
      })
    })
  })

  describe('markAsPaid - Group Bookings', () => {
    it('should mark multiple bookings as paid for recurring group', async () => {
      // Setup: Add 3 bookings with same recurring_group_id
      const queryKey = ['bookings']
      const groupBookings: Booking[] = [
        { ...mockBooking, id: 'booking-1', recurring_group_id: 'group-1' },
        { ...mockBooking, id: 'booking-2', recurring_group_id: 'group-1' },
        { ...mockBooking, id: 'booking-3', recurring_group_id: 'group-1' },
      ]
      queryClient.setQueryData(queryKey, groupBookings)

      mockMarkAsPaidService.mockResolvedValue({
        success: true,
        count: 3,
      })

      const { result } = renderHook(
        () =>
          useOptimisticPayment({
            selectedBooking: groupBookings[0],
            setSelectedBooking: undefined,
            onSuccess: vi.fn(),
          }),
        { wrapper }
      )

      await result.current.markAsPaid.mutate({
        bookingId: 'booking-1',
        recurringGroupId: 'group-1',
        paymentMethod: 'cash',
      })

      // Verify all 3 bookings updated in cache
      const cachedData = queryClient.getQueryData<Booking[]>(queryKey)
      expect(cachedData).toHaveLength(3)
      cachedData?.forEach((booking) => {
        expect(booking.payment_status).toBe('paid')
        expect(booking.payment_method).toBe('cash')
      })

      // Verify toast shows count
      await waitFor(() => {
        expect(mockToastSuccess).toHaveBeenCalledWith('Success', {
          description: '3 bookings marked as paid',
        })
      })
    })
  })

  describe('verifyPayment - Single Booking', () => {
    it('should verify single booking payment', async () => {
      const queryKey = ['bookings']
      const paidBooking = { ...mockBooking, payment_status: 'paid' as const }
      queryClient.setQueryData(queryKey, [paidBooking])

      mockVerifyPaymentService.mockResolvedValue({
        success: true,
        count: 1,
      })

      const { result } = renderHook(
        () =>
          useOptimisticPayment({
            selectedBooking: paidBooking,
            setSelectedBooking: undefined,
            onSuccess: vi.fn(),
          }),
        { wrapper }
      )

      await result.current.verifyPayment.mutate({
        bookingId: 'booking-1',
      })

      // Verify cache updated to paid (verifyPayment sets to 'paid', not 'verified')
      const cachedData = queryClient.getQueryData<Booking[]>(queryKey)
      expect(cachedData?.[0].payment_status).toBe('paid')

      // Verify toast
      await waitFor(() => {
        expect(mockToastSuccess).toHaveBeenCalledWith('Success', {
          description: 'Payment verified successfully',
        })
      })
    })
  })

  describe('verifyPayment - Group Bookings', () => {
    it('should verify multiple bookings for recurring group', async () => {
      const queryKey = ['bookings']
      const groupBookings: Booking[] = [
        { ...mockBooking, id: 'booking-1', recurring_group_id: 'group-1', payment_status: 'paid' },
        { ...mockBooking, id: 'booking-2', recurring_group_id: 'group-1', payment_status: 'paid' },
        { ...mockBooking, id: 'booking-3', recurring_group_id: 'group-1', payment_status: 'paid' },
      ]
      queryClient.setQueryData(queryKey, groupBookings)

      mockVerifyPaymentService.mockResolvedValue({
        success: true,
        count: 3,
      })

      const { result } = renderHook(
        () =>
          useOptimisticPayment({
            selectedBooking: groupBookings[0],
            setSelectedBooking: undefined,
            onSuccess: vi.fn(),
          }),
        { wrapper }
      )

      await result.current.verifyPayment.mutate({
        bookingId: 'booking-1',
        recurringGroupId: 'group-1',
      })

      // Verify all bookings updated to paid
      const cachedData = queryClient.getQueryData<Booking[]>(queryKey)
      cachedData?.forEach((booking) => {
        expect(booking.payment_status).toBe('paid')
      })

      // Verify toast shows count
      await waitFor(() => {
        expect(mockToastSuccess).toHaveBeenCalledWith('Success', {
          description: '3 bookings verified successfully',
        })
      })
    })
  })

  describe('requestRefund', () => {
    it('should request refund for booking', async () => {
      const queryKey = ['bookings']
      const paidBooking = { ...mockBooking, payment_status: 'verified' as const }
      queryClient.setQueryData(queryKey, [paidBooking])

      mockRequestRefundService.mockResolvedValue({
        success: true,
        count: 1,
      })

      const { result } = renderHook(
        () =>
          useOptimisticPayment({
            selectedBooking: paidBooking,
            setSelectedBooking: undefined,
            onSuccess: vi.fn(),
          }),
        { wrapper }
      )

      await result.current.requestRefund.mutate({
        bookingId: 'booking-1',
      })

      // Verify cache updated (requestRefund uses 'refund_pending')
      const cachedData = queryClient.getQueryData<Booking[]>(queryKey)
      expect(cachedData?.[0].payment_status).toBe('refund_pending')

      // Verify toast
      await waitFor(() => {
        expect(mockToastSuccess).toHaveBeenCalledWith('Success', {
          description: 'Refund requested successfully',
        })
      })
    })
  })

  describe('completeRefund', () => {
    it('should complete refund for booking', async () => {
      const queryKey = ['bookings']
      const refundRequestedBooking = { ...mockBooking, payment_status: 'refund_requested' as const }
      queryClient.setQueryData(queryKey, [refundRequestedBooking])

      mockCompleteRefundService.mockResolvedValue({
        success: true,
        count: 1,
      })

      const { result } = renderHook(
        () =>
          useOptimisticPayment({
            selectedBooking: refundRequestedBooking,
            setSelectedBooking: undefined,
            onSuccess: vi.fn(),
          }),
        { wrapper }
      )

      await result.current.completeRefund.mutate({
        bookingId: 'booking-1',
      })

      // Verify cache updated
      const cachedData = queryClient.getQueryData<Booking[]>(queryKey)
      expect(cachedData?.[0].payment_status).toBe('refunded')

      // Verify toast
      await waitFor(() => {
        expect(mockToastSuccess).toHaveBeenCalledWith('Success', {
          description: 'Refund completed successfully',
        })
      })
    })
  })

  describe('cancelRefund', () => {
    it('should cancel refund request', async () => {
      const queryKey = ['bookings']
      const refundRequestedBooking = { ...mockBooking, payment_status: 'refund_requested' as const }
      queryClient.setQueryData(queryKey, [refundRequestedBooking])

      mockCancelRefundService.mockResolvedValue({
        success: true,
        count: 1,
      })

      const { result } = renderHook(
        () =>
          useOptimisticPayment({
            selectedBooking: refundRequestedBooking,
            setSelectedBooking: undefined,
            onSuccess: vi.fn(),
          }),
        { wrapper }
      )

      await result.current.cancelRefund.mutate({
        bookingId: 'booking-1',
      })

      // Verify cache updated (back to paid, not verified)
      const cachedData = queryClient.getQueryData<Booking[]>(queryKey)
      expect(cachedData?.[0].payment_status).toBe('paid')

      // Verify toast (cancelRefund uses 'Refund cancelled successfully')
      await waitFor(() => {
        expect(mockToastSuccess).toHaveBeenCalledWith('Success', {
          description: 'Refund cancelled successfully',
        })
      })
    })
  })

  describe('Error Handling & Rollback', () => {
    it('should rollback cache on markAsPaid error', async () => {
      const queryKey = ['bookings']
      const originalBooking = { ...mockBooking, payment_status: 'unpaid' as const }
      queryClient.setQueryData(queryKey, [originalBooking])

      // Mock API error
      mockMarkAsPaidService.mockRejectedValue(new Error('Payment processing failed'))

      const { result } = renderHook(
        () =>
          useOptimisticPayment({
            selectedBooking: originalBooking,
            setSelectedBooking: undefined,
            onSuccess: vi.fn(),
          }),
        { wrapper }
      )

      try {
        await result.current.markAsPaid.mutate({
          bookingId: 'booking-1',
          paymentMethod: 'cash',
        })
      } catch (e) {
        // Expected error
      }

      // Verify cache rolled back to original state
      await waitFor(() => {
        const cachedData = queryClient.getQueryData<Booking[]>(queryKey)
        expect(cachedData?.[0].payment_status).toBe('unpaid')
      })

      // Verify error toast shown (Sonner: toast.error(title, { description }))
      await waitFor(() => {
        expect(mockToastError).toHaveBeenCalledWith(
          'Error',
          expect.objectContaining({
            description: 'Payment processing failed',
          })
        )
      })
    })

    it('should rollback selectedBooking state on error', async () => {
      const originalBooking = { ...mockBooking, payment_status: 'unpaid' as const }
      mockVerifyPaymentService.mockRejectedValue(new Error('Verification failed'))

      const setSelectedBooking = vi.fn()
      const { result } = renderHook(
        () =>
          useOptimisticPayment({
            selectedBooking: originalBooking,
            setSelectedBooking,
            onSuccess: vi.fn(),
          }),
        { wrapper }
      )

      try {
        await result.current.verifyPayment.mutate({
          bookingId: 'booking-1',
        })
      } catch (e) {
        // Expected error
      }

      // Verify setSelectedBooking called twice: once for optimistic update, once for rollback
      await waitFor(() => {
        expect(setSelectedBooking).toHaveBeenCalledTimes(2)
        // Last call should restore original state
        expect(setSelectedBooking).toHaveBeenLastCalledWith(
          expect.objectContaining({
            payment_status: 'unpaid',
          })
        )
      })
    })

    it('should rollback group bookings on error', async () => {
      const queryKey = ['bookings']
      const groupBookings: Booking[] = [
        { ...mockBooking, id: 'booking-1', recurring_group_id: 'group-1', payment_status: 'unpaid' },
        { ...mockBooking, id: 'booking-2', recurring_group_id: 'group-1', payment_status: 'unpaid' },
      ]
      queryClient.setQueryData(queryKey, groupBookings)

      mockMarkAsPaidService.mockRejectedValue(new Error('Group payment failed'))

      const { result } = renderHook(
        () =>
          useOptimisticPayment({
            selectedBooking: groupBookings[0],
            setSelectedBooking: undefined,
            onSuccess: vi.fn(),
          }),
        { wrapper }
      )

      try {
        await result.current.markAsPaid.mutate({
          bookingId: 'booking-1',
          recurringGroupId: 'group-1',
          paymentMethod: 'cash',
        })
      } catch (e) {
        // Expected error
      }

      // Verify all bookings rolled back
      await waitFor(() => {
        const cachedData = queryClient.getQueryData<Booking[]>(queryKey)
        cachedData?.forEach((booking) => {
          expect(booking.payment_status).toBe('unpaid')
        })
      })
    })
  })

  describe('Loading States', () => {
    it('should set loading state during mutation', async () => {
      let resolveMutation: (value: { success: boolean; count: number }) => void
      mockMarkAsPaidService.mockImplementation(
        () =>
          new Promise((resolve) => {
            resolveMutation = resolve
          })
      )

      const { result } = renderHook(
        () =>
          useOptimisticPayment({
            selectedBooking: mockBooking,
            setSelectedBooking: undefined,
            onSuccess: vi.fn(),
          }),
        { wrapper }
      )

      const mutatePromise = result.current.markAsPaid.mutate({
        bookingId: 'booking-1',
        paymentMethod: 'cash',
      })

      // Check loading state
      await waitFor(() => {
        expect(result.current.markAsPaid.isLoading).toBe(true)
      })

      // Now resolve the mutation
      resolveMutation!({ success: true, count: 1 })
      await mutatePromise

      // Check loading cleared
      await waitFor(() => {
        expect(result.current.markAsPaid.isLoading).toBe(false)
      })
    })

    it('should have independent loading states for each operation', async () => {
      const { result } = renderHook(
        () =>
          useOptimisticPayment({
            selectedBooking: mockBooking,
            setSelectedBooking: undefined,
            onSuccess: vi.fn(),
          }),
        { wrapper }
      )

      // Initially all false
      expect(result.current.markAsPaid.isLoading).toBe(false)
      expect(result.current.verifyPayment.isLoading).toBe(false)
      expect(result.current.requestRefund.isLoading).toBe(false)
      expect(result.current.completeRefund.isLoading).toBe(false)
      expect(result.current.cancelRefund.isLoading).toBe(false)
    })
  })
})
