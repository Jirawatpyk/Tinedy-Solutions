/**
 * Calendar Actions Hook
 *
 * Handles all CRUD operations for calendar bookings including:
 * - Status changes (inline and from detail modal)
 * - Payment operations (mark as paid, verify payment)
 * - Delete operations (soft delete)
 *
 * @module hooks/calendar/useCalendarActions
 */

import { useState, useCallback } from 'react'
import type { Dispatch, SetStateAction } from 'react'
import { supabase } from '@/lib/supabase'
import { useToast } from '@/hooks/use-toast'
import { mapErrorToUserMessage } from '@/lib/error-messages'
import { useSoftDelete } from '@/hooks/use-soft-delete'
import { usePaymentActions } from '@/hooks/usePaymentActions'
import { useBookingStatusManager } from '@/hooks/useBookingStatusManager'
import type { Booking } from '@/types/booking'

/**
 * Parameters for useCalendarActions hook
 */
export interface UseCalendarActionsParams {
  /** Currently selected booking in the modal */
  selectedBooking: Booking | null
  /** Function to update the selected booking state */
  setSelectedBooking: Dispatch<SetStateAction<Booking | null>>
  /** Function to refetch bookings after mutations */
  refetchBookings: () => Promise<void>
  /** All bookings (for inline status change validation) */
  bookings: Booking[]
  /** Function to close detail modal after delete */
  closeDetailModal: () => void
}

/**
 * Return type for useCalendarActions hook
 */
export interface UseCalendarActionsReturn {
  // Status operations
  handleStatusChange: (bookingId: string, currentStatus: string, newStatus: string) => Promise<void>
  handleInlineStatusChange: (bookingId: string, newStatus: string) => Promise<void>
  isUpdatingStatus: boolean

  // Payment operations
  handleMarkAsPaid: (bookingId: string, method?: string) => Promise<void>
  handleVerifyPayment: (bookingId: string) => Promise<void>
  handleRequestRefund: (bookingId: string) => Promise<void>
  handleCompleteRefund: (bookingId: string) => Promise<void>
  handleCancelRefund: (bookingId: string) => Promise<void>
  isUpdatingPayment: boolean

  // Delete operations
  handleDelete: (bookingId: string) => Promise<void>
  handleArchive: (bookingId: string) => Promise<void>
  isDeleting: boolean

  // Status utilities (from useBookingStatusManager)
  getStatusBadge: (status: string) => JSX.Element
  getPaymentStatusBadge: (status?: string) => JSX.Element
  getAvailableStatuses: (currentStatus: string) => string[]
  getStatusLabel: (status: string) => string
  getStatusTransitionMessage: (currentStatus: string, newStatus: string) => string

  // Status confirmation dialog state
  showStatusConfirmDialog: boolean
  pendingStatusChange: { bookingId: string; currentStatus: string; newStatus: string } | null
  confirmStatusChange: () => Promise<void>
  cancelStatusChange: () => void
}

/**
 * Custom hook for calendar booking CRUD operations
 *
 * Provides all mutation operations needed for the calendar page including
 * status changes, payment updates, and deletion with proper loading states
 * and error handling.
 *
 * @param params - Hook parameters
 * @returns CRUD operations and loading states
 *
 * @example
 * ```tsx
 * const actions = useCalendarActions({
 *   selectedBooking,
 *   setSelectedBooking,
 *   refetchBookings,
 *   bookings,
 *   closeDetailModal: () => setIsDetailOpen(false)
 * })
 *
 * // Use in components
 * <Button onClick={() => actions.handleMarkAsPaid(booking.id, 'cash')}>
 *   Mark as Paid
 * </Button>
 * ```
 */
export function useCalendarActions(params: UseCalendarActionsParams): UseCalendarActionsReturn {
  const {
    selectedBooking,
    setSelectedBooking,
    refetchBookings,
    bookings,
    closeDetailModal,
  } = params

  const { toast } = useToast()
  const { softDelete } = useSoftDelete('bookings')

  // Loading states
  const [isDeleting, setIsDeleting] = useState(false)

  // Use useBookingStatusManager for status management
  const {
    showStatusConfirmDialog,
    pendingStatusChange,
    getStatusBadge,
    getPaymentStatusBadge,
    getAvailableStatuses,
    getStatusLabel,
    getStatusTransitionMessage,
    handleStatusChange: statusManagerHandleStatusChange,
    confirmStatusChange: statusManagerConfirmStatusChange,
    cancelStatusChange: statusManagerCancelStatusChange,
    isUpdatingStatus,
  } = useBookingStatusManager({
    selectedBooking,
    setSelectedBooking,
    onSuccess: refetchBookings,
  })

  // Use centralized payment actions (now with optimistic updates!)
  const {
    markAsPaid: paymentMarkAsPaid,
    verifyPayment: paymentVerifyPayment,
    requestRefund: paymentRequestRefund,
    completeRefund: paymentCompleteRefund,
    cancelRefund: paymentCancelRefund,
    isLoading: paymentLoading,
  } = usePaymentActions({
    selectedBooking,
    setSelectedBooking,
    onSuccess: async () => { await refetchBookings() },
  })

  /**
   * Update booking status - wraps useBookingStatusManager
   *
   * @param bookingId - ID of booking to update
   * @param currentStatus - Current status (for validation)
   * @param newStatus - New status to set
   */
  const handleStatusChange = useCallback(async (
    bookingId: string,
    currentStatus: string,
    newStatus: string
  ) => {
    // Use statusManager which handles confirmation dialog
    await statusManagerHandleStatusChange(bookingId, currentStatus, newStatus)
  }, [statusManagerHandleStatusChange])

  /**
   * Inline status change handler (for BookingCard)
   *
   * Validates status transition before applying change
   *
   * @param bookingId - ID of booking to update
   * @param newStatus - New status to set
   */
  const handleInlineStatusChange = useCallback(async (
    bookingId: string,
    newStatus: string
  ) => {
    const booking = bookings.find(b => b.id === bookingId)
    if (!booking) return

    // Validate transition using shared utility from useBookingStatusManager
    const availableStatuses = getAvailableStatuses(booking.status)
    if (!availableStatuses.includes(newStatus)) {
      toast({
        title: 'Invalid Status Transition',
        description: `Cannot change from "${booking.status}" to "${newStatus}".`,
        variant: 'destructive',
      })
      return
    }

    await handleStatusChange(bookingId, booking.status, newStatus)
  }, [bookings, handleStatusChange, toast, getAvailableStatuses])

  /**
   * Mark booking as paid
   * ✨ Now with optimistic updates - UI updates instantly!
   *
   * @param bookingId - ID of booking to update
   * @param method - Payment method (default: 'cash')
   */
  const handleMarkAsPaid = useCallback(async (
    bookingId: string,
    method: string = 'cash'
  ) => {
    await paymentMarkAsPaid(bookingId, method)
  }, [paymentMarkAsPaid])

  /**
   * Verify payment (admin verification)
   * ✨ Now with optimistic updates - UI updates instantly!
   *
   * @param bookingId - ID of booking to verify
   */
  const handleVerifyPayment = useCallback(async (bookingId: string) => {
    await paymentVerifyPayment(bookingId)
  }, [paymentVerifyPayment])

  /**
   * Request refund for booking
   * ✨ Now with optimistic updates - UI updates instantly!
   *
   * @param bookingId - ID of booking to request refund
   */
  const handleRequestRefund = useCallback(async (bookingId: string) => {
    await paymentRequestRefund(bookingId)
  }, [paymentRequestRefund])

  /**
   * Complete refund for booking
   * ✨ Now with optimistic updates - UI updates instantly!
   *
   * @param bookingId - ID of booking to complete refund
   */
  const handleCompleteRefund = useCallback(async (bookingId: string) => {
    await paymentCompleteRefund(bookingId)
  }, [paymentCompleteRefund])

  /**
   * Cancel refund for booking
   * ✨ Now with optimistic updates - UI updates instantly!
   *
   * @param bookingId - ID of booking to cancel refund
   */
  const handleCancelRefund = useCallback(async (bookingId: string) => {
    await paymentCancelRefund(bookingId)
  }, [paymentCancelRefund])

  /**
   * Hard delete booking
   *
   * @param bookingId - ID of booking to delete
   */
  const handleDelete = useCallback(async (bookingId: string) => {
    setIsDeleting(true)

    try {
      const { error } = await supabase
        .from('bookings')
        .delete()
        .eq('id', bookingId)

      if (error) throw error

      toast({
        title: 'Success',
        description: 'Booking deleted successfully',
      })

      closeDetailModal()

      // Refetch bookings to update data
      await refetchBookings()
    } catch (error) {
      const errorMsg = mapErrorToUserMessage(error, 'booking')
      toast({
        title: errorMsg.title,
        description: errorMsg.description,
        variant: 'destructive',
      })
    } finally {
      setIsDeleting(false)
    }
  }, [toast, closeDetailModal, refetchBookings])

  /**
   * Soft delete (archive) booking
   *
   * @param bookingId - ID of booking to archive
   */
  const handleArchive = useCallback(async (bookingId: string) => {
    const result = await softDelete(bookingId)
    if (result.success) {
      closeDetailModal()
      // Refetch bookings after delete
      refetchBookings()
    }
  }, [softDelete, closeDetailModal, refetchBookings])

  return {
    // Status operations
    handleStatusChange,
    handleInlineStatusChange,
    isUpdatingStatus, // From useBookingStatusManager

    // Payment operations
    handleMarkAsPaid,
    handleVerifyPayment,
    handleRequestRefund,
    handleCompleteRefund,
    handleCancelRefund,
    isUpdatingPayment: paymentLoading.markAsPaid || paymentLoading.verifyPayment || paymentLoading.refund,

    // Delete operations
    handleDelete,
    handleArchive,
    isDeleting,

    // Status utilities (from useBookingStatusManager)
    getStatusBadge,
    getPaymentStatusBadge,
    getAvailableStatuses,
    getStatusLabel,
    getStatusTransitionMessage,

    // Status confirmation dialog state
    showStatusConfirmDialog,
    pendingStatusChange,
    confirmStatusChange: statusManagerConfirmStatusChange,
    cancelStatusChange: statusManagerCancelStatusChange,
  }
}
