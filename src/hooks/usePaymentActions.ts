/**
 * usePaymentActions Hook
 *
 * Shared hook for payment-related actions (mark as paid, verify payment, refund)
 * Centralizes payment logic to eliminate duplicate code across hooks
 */

import { useCallback, useState } from 'react'
import { useToast } from '@/hooks/use-toast'
import { mapErrorToUserMessage } from '@/lib/error-messages'
import {
  markAsPaid as markAsPaidService,
  verifyPayment as verifyPaymentService,
  requestRefund as requestRefundService,
  completeRefund as completeRefundService,
  cancelRefund as cancelRefundService,
} from '@/services/payment-service'
import type { Booking } from '@/types/booking'

export interface UsePaymentActionsOptions {
  /** Currently selected booking */
  selectedBooking: Booking | null
  /** Callback to update selected booking state */
  setSelectedBooking?: (booking: Booking) => void
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
  const { toast } = useToast()

  const [isLoading, setIsLoading] = useState<PaymentActionsLoading>({
    markAsPaid: false,
    verifyPayment: false,
    refund: false,
  })

  const markAsPaid = useCallback(
    async (bookingId: string, method: string = 'cash') => {
      setIsLoading(prev => ({ ...prev, markAsPaid: true }))
      try {
        const result = await markAsPaidService({
          bookingId,
          recurringGroupId: selectedBooking?.recurring_group_id,
          paymentMethod: method,
          amount: selectedBooking?.total_price || 0,
        })

        if (!result.success) throw new Error(result.error)

        toast({
          title: 'Success',
          description:
            result.count > 1
              ? `${result.count} bookings marked as paid`
              : 'Booking marked as paid',
        })

        // Update local state
        if (selectedBooking && setSelectedBooking) {
          setSelectedBooking({
            ...selectedBooking,
            payment_status: 'paid',
            payment_method: method,
            amount_paid: selectedBooking.total_price || 0,
          })
        }

        onSuccess()
      } catch (error) {
        const errorMsg = mapErrorToUserMessage(error, 'booking')
        toast({
          title: errorMsg.title,
          description: errorMsg.description,
          variant: 'destructive',
        })
      } finally {
        setIsLoading(prev => ({ ...prev, markAsPaid: false }))
      }
    },
    [selectedBooking, setSelectedBooking, toast, onSuccess]
  )

  const verifyPayment = useCallback(
    async (bookingId: string) => {
      setIsLoading(prev => ({ ...prev, verifyPayment: true }))
      try {
        const result = await verifyPaymentService({
          bookingId,
          recurringGroupId: selectedBooking?.recurring_group_id,
        })

        if (!result.success) throw new Error(result.error)

        toast({
          title: 'Success',
          description:
            result.count > 1
              ? `${result.count} bookings verified successfully`
              : 'Payment verified successfully',
        })

        // Update local state
        if (selectedBooking && setSelectedBooking) {
          setSelectedBooking({
            ...selectedBooking,
            payment_status: 'paid',
          })
        }

        onSuccess()
      } catch (error) {
        const errorMsg = mapErrorToUserMessage(error, 'booking')
        toast({
          title: errorMsg.title,
          description: errorMsg.description,
          variant: 'destructive',
        })
      } finally {
        setIsLoading(prev => ({ ...prev, verifyPayment: false }))
      }
    },
    [selectedBooking, setSelectedBooking, toast, onSuccess]
  )

  const requestRefund = useCallback(
    async (bookingId: string) => {
      setIsLoading(prev => ({ ...prev, refund: true }))
      try {
        const result = await requestRefundService({
          bookingId,
          recurringGroupId: selectedBooking?.recurring_group_id,
        })

        if (!result.success) throw new Error(result.error)

        toast({
          title: 'Refund Requested',
          description:
            result.count > 1
              ? `${result.count} bookings marked for refund`
              : 'Booking marked for refund',
        })

        onSuccess()
      } catch (error) {
        const errorMsg = mapErrorToUserMessage(error, 'booking')
        toast({
          title: errorMsg.title,
          description: errorMsg.description,
          variant: 'destructive',
        })
      } finally {
        setIsLoading(prev => ({ ...prev, refund: false }))
      }
    },
    [selectedBooking?.recurring_group_id, toast, onSuccess]
  )

  const completeRefund = useCallback(
    async (bookingId: string) => {
      setIsLoading(prev => ({ ...prev, refund: true }))
      try {
        const result = await completeRefundService({
          bookingId,
          recurringGroupId: selectedBooking?.recurring_group_id,
        })

        if (!result.success) throw new Error(result.error)

        toast({
          title: 'Refund Completed',
          description:
            result.count > 1
              ? `${result.count} bookings refunded`
              : 'Booking refunded successfully',
        })

        onSuccess()
      } catch (error) {
        const errorMsg = mapErrorToUserMessage(error, 'booking')
        toast({
          title: errorMsg.title,
          description: errorMsg.description,
          variant: 'destructive',
        })
      } finally {
        setIsLoading(prev => ({ ...prev, refund: false }))
      }
    },
    [selectedBooking?.recurring_group_id, toast, onSuccess]
  )

  const cancelRefund = useCallback(
    async (bookingId: string) => {
      setIsLoading(prev => ({ ...prev, refund: true }))
      try {
        const result = await cancelRefundService({
          bookingId,
          recurringGroupId: selectedBooking?.recurring_group_id,
        })

        if (!result.success) throw new Error(result.error)

        toast({
          title: 'Refund Cancelled',
          description: 'Booking restored to paid status',
        })

        onSuccess()
      } catch (error) {
        const errorMsg = mapErrorToUserMessage(error, 'booking')
        toast({
          title: errorMsg.title,
          description: errorMsg.description,
          variant: 'destructive',
        })
      } finally {
        setIsLoading(prev => ({ ...prev, refund: false }))
      }
    },
    [selectedBooking?.recurring_group_id, toast, onSuccess]
  )

  return { markAsPaid, verifyPayment, requestRefund, completeRefund, cancelRefund, isLoading }
}
