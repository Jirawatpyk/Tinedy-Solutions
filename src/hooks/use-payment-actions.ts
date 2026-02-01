/**
 * usePaymentActions Hook
 *
 * Shared hook for payment-related actions (mark as paid, verify payment, refund)
 * Centralizes payment logic to eliminate duplicate code across hooks
 *
 * ✨ Now powered by useOptimisticPayment for instant UI updates!
 */

import { useCallback } from 'react'
import { useOptimisticPayment } from '@/hooks/optimistic'
import type { Booking } from '@/types/booking'

export interface UsePaymentActionsOptions {
  /** Currently selected booking */
  selectedBooking: Booking | null
  /** Callback to update selected booking state */
  setSelectedBooking?: (booking: Booking | null) => void
  /** Callback to run after successful payment action */
  onSuccess: () => void
}

export interface PaymentActionsLoading {
  markAsPaid: boolean
  verifyPayment: boolean
  refund: boolean
}

export interface PaymentActions {
  /** Mark a booking as paid */
  markAsPaid: (bookingId: string, method?: string) => Promise<void>
  /** Verify a pending payment */
  verifyPayment: (bookingId: string) => Promise<void>
  /** Request refund (paid → refund_pending) */
  requestRefund: (bookingId: string) => Promise<void>
  /** Complete refund (refund_pending → refunded) */
  completeRefund: (bookingId: string) => Promise<void>
  /** Cancel refund (refund_pending → paid) */
  cancelRefund: (bookingId: string) => Promise<void>
  /** Loading states for each action */
  isLoading: PaymentActionsLoading
}

/**
 * Hook for handling payment actions on bookings
 *
 * @param options - Configuration options
 * @returns Payment action functions
 *
 * @example
 * const { markAsPaid, verifyPayment } = usePaymentActions({
 *   selectedBooking,
 *   setSelectedBooking,
 *   onSuccess: refresh,
 * })
 */
export function usePaymentActions(options: UsePaymentActionsOptions): PaymentActions {
  const { selectedBooking, setSelectedBooking, onSuccess } = options

  // Use the new optimistic payment hook
  const payment = useOptimisticPayment({
    selectedBooking,
    setSelectedBooking,
    onSuccess,
  })

  // Wrap operations to match the old API signature
  const markAsPaid = useCallback(
    async (bookingId: string, method: string = 'cash') => {
      await payment.markAsPaid.mutate({
        bookingId,
        recurringGroupId: selectedBooking?.recurring_group_id,
        paymentMethod: method,
        amount: selectedBooking?.total_price,
      })
    },
    [payment.markAsPaid, selectedBooking]
  )

  const verifyPayment = useCallback(
    async (bookingId: string) => {
      await payment.verifyPayment.mutate({
        bookingId,
        recurringGroupId: selectedBooking?.recurring_group_id,
      })
    },
    [payment.verifyPayment, selectedBooking]
  )

  const requestRefund = useCallback(
    async (bookingId: string) => {
      await payment.requestRefund.mutate({
        bookingId,
        recurringGroupId: selectedBooking?.recurring_group_id,
      })
    },
    [payment.requestRefund, selectedBooking]
  )

  const completeRefund = useCallback(
    async (bookingId: string) => {
      await payment.completeRefund.mutate({
        bookingId,
        recurringGroupId: selectedBooking?.recurring_group_id,
      })
    },
    [payment.completeRefund, selectedBooking]
  )

  const cancelRefund = useCallback(
    async (bookingId: string) => {
      await payment.cancelRefund.mutate({
        bookingId,
        recurringGroupId: selectedBooking?.recurring_group_id,
      })
    },
    [payment.cancelRefund, selectedBooking]
  )

  // Aggregate loading states from individual operations
  const isLoading: PaymentActionsLoading = {
    markAsPaid: payment.markAsPaid.isLoading,
    verifyPayment: payment.verifyPayment.isLoading,
    refund:
      payment.requestRefund.isLoading ||
      payment.completeRefund.isLoading ||
      payment.cancelRefund.isLoading,
  }

  return { markAsPaid, verifyPayment, requestRefund, completeRefund, cancelRefund, isLoading }
}
