/**
 * usePaymentActions Hook
 *
 * Shared hook for payment-related actions (mark as paid, verify payment)
 * Centralizes payment logic to eliminate duplicate code across hooks
 */

import { useCallback } from 'react'
import { useToast } from '@/hooks/use-toast'
import { mapErrorToUserMessage } from '@/lib/error-messages'
import {
  markAsPaid as markAsPaidService,
  verifyPayment as verifyPaymentService,
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

export interface PaymentActions {
  /** Mark a booking as paid */
  markAsPaid: (bookingId: string, method?: string) => Promise<void>
  /** Verify a pending payment */
  verifyPayment: (bookingId: string) => Promise<void>
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

  const markAsPaid = useCallback(
    async (bookingId: string, method: string = 'cash') => {
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
      }
    },
    [selectedBooking, setSelectedBooking, toast, onSuccess]
  )

  const verifyPayment = useCallback(
    async (bookingId: string) => {
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
      }
    },
    [selectedBooking, setSelectedBooking, toast, onSuccess]
  )

  return { markAsPaid, verifyPayment }
}
