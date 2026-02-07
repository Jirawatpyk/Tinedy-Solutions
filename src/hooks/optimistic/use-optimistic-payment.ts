/**
 * useOptimisticPayment Hook
 *
 * Wrapper hook สำหรับ payment operations พร้อม optimistic updates
 * รองรับทั้ง single และ recurring bookings (group operations)
 *
 * Operations:
 * - markAsPaid: เปลี่ยนสถานะเป็นจ่ายแล้ว (unpaid → paid)
 * - verifyPayment: ยืนยันการชำระเงิน (pending_verification → paid)
 * - requestRefund: ขอคืนเงิน (paid → refund_pending)
 * - completeRefund: ยืนยันคืนเงินแล้ว (refund_pending → refunded)
 * - cancelRefund: ยกเลิกการขอคืนเงิน (refund_pending → paid)
 */

import { useOptimisticMutation } from './use-optimistic-mutation'
import { queryKeys } from '@/lib/query-keys'
import type { Booking } from '@/types/booking'
import {
  markAsPaid as markAsPaidService,
  verifyPayment as verifyPaymentService,
  requestRefund as requestRefundService,
  completeRefund as completeRefundService,
  cancelRefund as cancelRefundService,
} from '@/services/payment-service'
import type { PaymentResult } from '@/services/payment-service'

// ===== Types =====

interface PaymentVariables {
  bookingId: string
  recurringGroupId?: string | null
  paymentMethod?: string
  amount?: number
}

interface UseOptimisticPaymentOptions {
  selectedBooking: Booking | null
  setSelectedBooking?: (booking: Booking | null) => void
  onSuccess: () => void | Promise<void>
}

interface PaymentOperation {
  mutate: (variables: PaymentVariables) => Promise<void>
  mutateAsync: (variables: PaymentVariables) => Promise<void>
  isLoading: boolean
  error: unknown | null
  reset: () => void
}

export interface UseOptimisticPaymentReturn {
  markAsPaid: PaymentOperation
  verifyPayment: PaymentOperation
  requestRefund: PaymentOperation
  completeRefund: PaymentOperation
  cancelRefund: PaymentOperation
}

// ===== Helper Functions =====

/**
 * Update booking payment status in cache
 */
function updateBookingPaymentInCache(
  oldData: Booking[] | undefined,
  variables: PaymentVariables,
  updates: Partial<Booking>
): Booking[] | undefined {
  if (!oldData || !Array.isArray(oldData)) return oldData

  // If recurringGroupId exists, update all bookings in group
  if (variables.recurringGroupId) {
    return oldData.map((booking) =>
      booking.recurring_group_id === variables.recurringGroupId
        ? { ...booking, ...updates }
        : booking
    )
  }

  // Otherwise, update single booking
  return oldData.map((booking) =>
    booking.id === variables.bookingId ? { ...booking, ...updates } : booking
  )
}

// ===== Main Hook =====

/**
 * Wrapper hook สำหรับ payment operations พร้อม optimistic updates
 *
 * @example
 * ```tsx
 * const payment = useOptimisticPayment({
 *   selectedBooking,
 *   setSelectedBooking,
 *   onSuccess: refetchBookings
 * })
 *
 * // Mark as paid
 * await payment.markAsPaid.mutate({
 *   bookingId: 'xxx',
 *   paymentMethod: 'cash',
 *   amount: 1000
 * })
 * ```
 */
export function useOptimisticPayment(
  options: UseOptimisticPaymentOptions
): UseOptimisticPaymentReturn {
  const { selectedBooking, setSelectedBooking, onSuccess } = options

  // ===== Mark as Paid =====

  const markAsPaid = useOptimisticMutation<Booking[], PaymentVariables, Booking>({
    mutationFn: async ({ bookingId, recurringGroupId, paymentMethod = 'cash', amount }) => {
      const result = await markAsPaidService({
        bookingId,
        recurringGroupId,
        paymentMethod,
        amount,
      })
      if (!result.success) throw new Error(result.error)
      return result
    },
    optimisticUpdate: {
      queryKeys: [queryKeys.bookings.all],
      updater: (oldData, variables) => {
        return updateBookingPaymentInCache(oldData, variables, {
          payment_status: 'paid',
          payment_method: variables.paymentMethod || 'cash',
          amount_paid: variables.amount || undefined,
        })
      },
    },
    localStateUpdate: setSelectedBooking
      ? {
          currentState: selectedBooking,
          setState: setSelectedBooking,
          updater: (current, variables) => ({
            ...current,
            payment_status: 'paid',
            payment_method: variables.paymentMethod || 'cash',
            amount_paid: variables.amount || current.total_price,
          }),
          shouldUpdate: (current, variables) => current.id === variables.bookingId,
        }
      : undefined,
    toast: {
      successTitle: 'Success',
      successDescription: (result: unknown) => {
        const paymentResult = result as PaymentResult
        return paymentResult.count > 1
          ? `${paymentResult.count} bookings marked as paid`
          : 'Booking marked as paid'
      },
      errorContext: 'booking',
    },
    onSuccess,
  })

  // ===== Verify Payment =====

  const verifyPayment = useOptimisticMutation<Booking[], PaymentVariables, Booking>({
    mutationFn: async ({ bookingId, recurringGroupId }) => {
      const result = await verifyPaymentService({
        bookingId,
        recurringGroupId,
      })
      if (!result.success) throw new Error(result.error)
      return result
    },
    optimisticUpdate: {
      queryKeys: [queryKeys.bookings.all],
      updater: (oldData, variables) => {
        return updateBookingPaymentInCache(oldData, variables, {
          payment_status: 'paid',
        })
      },
    },
    localStateUpdate: setSelectedBooking
      ? {
          currentState: selectedBooking,
          setState: setSelectedBooking,
          updater: (current) => ({
            ...current,
            payment_status: 'paid',
          }),
          shouldUpdate: (current, variables) => current.id === variables.bookingId,
        }
      : undefined,
    toast: {
      successTitle: 'Success',
      successDescription: (result: unknown) => {
        const paymentResult = result as PaymentResult
        return paymentResult.count > 1
          ? `${paymentResult.count} bookings verified successfully`
          : 'Payment verified successfully'
      },
      errorContext: 'booking',
    },
    onSuccess,
  })

  // ===== Request Refund =====

  const requestRefund = useOptimisticMutation<Booking[], PaymentVariables, Booking>({
    mutationFn: async ({ bookingId, recurringGroupId }) => {
      const result = await requestRefundService({
        bookingId,
        recurringGroupId,
      })
      if (!result.success) throw new Error(result.error)
      return result
    },
    optimisticUpdate: {
      queryKeys: [queryKeys.bookings.all],
      updater: (oldData, variables) => {
        return updateBookingPaymentInCache(oldData, variables, {
          payment_status: 'refund_pending',
        })
      },
    },
    localStateUpdate: setSelectedBooking
      ? {
          currentState: selectedBooking,
          setState: setSelectedBooking,
          updater: (current) => ({
            ...current,
            payment_status: 'refund_pending',
          }),
          shouldUpdate: (current, variables) => current.id === variables.bookingId,
        }
      : undefined,
    toast: {
      successTitle: 'Success',
      successDescription: (result: unknown) => {
        const paymentResult = result as PaymentResult
        return paymentResult.count > 1
          ? `Refund requested for ${paymentResult.count} bookings`
          : 'Refund requested successfully'
      },
      errorContext: 'booking',
    },
    onSuccess,
  })

  // ===== Complete Refund =====

  const completeRefund = useOptimisticMutation<Booking[], PaymentVariables, Booking>({
    mutationFn: async ({ bookingId, recurringGroupId }) => {
      const result = await completeRefundService({
        bookingId,
        recurringGroupId,
      })
      if (!result.success) throw new Error(result.error)
      return result
    },
    optimisticUpdate: {
      queryKeys: [queryKeys.bookings.all],
      updater: (oldData, variables) => {
        return updateBookingPaymentInCache(oldData, variables, {
          payment_status: 'refunded',
        })
      },
    },
    localStateUpdate: setSelectedBooking
      ? {
          currentState: selectedBooking,
          setState: setSelectedBooking,
          updater: (current) => ({
            ...current,
            payment_status: 'refunded',
          }),
          shouldUpdate: (current, variables) => current.id === variables.bookingId,
        }
      : undefined,
    toast: {
      successTitle: 'Success',
      successDescription: (result: unknown) => {
        const paymentResult = result as PaymentResult
        return paymentResult.count > 1
          ? `${paymentResult.count} bookings refunded successfully`
          : 'Refund completed successfully'
      },
      errorContext: 'booking',
    },
    onSuccess,
  })

  // ===== Cancel Refund =====

  const cancelRefund = useOptimisticMutation<Booking[], PaymentVariables, Booking>({
    mutationFn: async ({ bookingId, recurringGroupId }) => {
      const result = await cancelRefundService({
        bookingId,
        recurringGroupId,
      })
      if (!result.success) throw new Error(result.error)
      return result
    },
    optimisticUpdate: {
      queryKeys: [queryKeys.bookings.all],
      updater: (oldData, variables) => {
        return updateBookingPaymentInCache(oldData, variables, {
          payment_status: 'paid',
        })
      },
    },
    localStateUpdate: setSelectedBooking
      ? {
          currentState: selectedBooking,
          setState: setSelectedBooking,
          updater: (current) => ({
            ...current,
            payment_status: 'paid',
          }),
          shouldUpdate: (current, variables) => current.id === variables.bookingId,
        }
      : undefined,
    toast: {
      successTitle: 'Success',
      successDescription: (result: unknown) => {
        const paymentResult = result as PaymentResult
        return paymentResult.count > 1
          ? `Refund cancelled for ${paymentResult.count} bookings`
          : 'Refund cancelled successfully'
      },
      errorContext: 'booking',
    },
    onSuccess,
  })

  return {
    markAsPaid,
    verifyPayment,
    requestRefund,
    completeRefund,
    cancelRefund,
  }
}
