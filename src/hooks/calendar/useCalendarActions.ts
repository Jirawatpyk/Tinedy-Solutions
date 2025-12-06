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
import { supabase } from '@/lib/supabase'
import { useToast } from '@/hooks/use-toast'
import { mapErrorToUserMessage } from '@/lib/error-messages'
import { getBangkokDateString } from '@/lib/utils'
import { getAvailableStatuses } from '@/lib/booking-badges'
import { useSoftDelete } from '@/hooks/use-soft-delete'
import type { Booking } from '@/types/booking'

/**
 * Parameters for useCalendarActions hook
 */
export interface UseCalendarActionsParams {
  /** Currently selected booking in the modal */
  selectedBooking: Booking | null
  /** Function to update the selected booking state */
  setSelectedBooking: (booking: Booking | null) => void
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
  isUpdatingPayment: boolean

  // Delete operations
  handleDelete: (bookingId: string) => Promise<void>
  handleArchive: (bookingId: string) => Promise<void>
  isDeleting: boolean
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
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false)
  const [isUpdatingPayment, setIsUpdatingPayment] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  /**
   * Update booking status
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
    if (currentStatus === newStatus) return

    setIsUpdatingStatus(true)

    try {
      const { error } = await supabase
        .from('bookings')
        .update({ status: newStatus })
        .eq('id', bookingId)

      if (error) throw error

      toast({
        title: 'Success',
        description: `Status changed to ${newStatus}`,
      })

      // Update selected booking if it's the same one
      if (selectedBooking && selectedBooking.id === bookingId) {
        setSelectedBooking({ ...selectedBooking, status: newStatus })
      }

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
      setIsUpdatingStatus(false)
    }
  }, [toast, selectedBooking, setSelectedBooking, refetchBookings])

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

    // Validate transition using shared utility
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
  }, [bookings, handleStatusChange, toast])

  /**
   * Mark booking as paid
   *
   * @param bookingId - ID of booking to update
   * @param method - Payment method (default: 'cash')
   */
  const handleMarkAsPaid = useCallback(async (
    bookingId: string,
    method: string = 'cash'
  ) => {
    setIsUpdatingPayment(true)

    try {
      const { error } = await supabase
        .from('bookings')
        .update({
          payment_status: 'paid',
          payment_method: method,
          amount_paid: selectedBooking?.total_price || 0,
          payment_date: getBangkokDateString(),
        })
        .eq('id', bookingId)

      if (error) throw error

      toast({
        title: 'Success',
        description: 'Booking marked as paid',
      })

      if (selectedBooking) {
        setSelectedBooking({
          ...selectedBooking,
          payment_status: 'paid',
          payment_method: method,
          amount_paid: selectedBooking.total_price,
          payment_date: getBangkokDateString(),
        })
      }

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
      setIsUpdatingPayment(false)
    }
  }, [toast, selectedBooking, setSelectedBooking, refetchBookings])

  /**
   * Verify payment (admin verification)
   *
   * @param bookingId - ID of booking to verify
   */
  const handleVerifyPayment = useCallback(async (bookingId: string) => {
    setIsUpdatingPayment(true)

    try {
      const { error } = await supabase
        .from('bookings')
        .update({
          payment_status: 'paid',
          payment_date: getBangkokDateString(),
        })
        .eq('id', bookingId)

      if (error) throw error

      toast({
        title: 'Success',
        description: 'Payment verified successfully',
      })

      if (selectedBooking) {
        setSelectedBooking({
          ...selectedBooking,
          payment_status: 'paid',
          payment_date: getBangkokDateString(),
        })
      }

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
      setIsUpdatingPayment(false)
    }
  }, [toast, selectedBooking, setSelectedBooking, refetchBookings])

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
    isUpdatingStatus,

    // Payment operations
    handleMarkAsPaid,
    handleVerifyPayment,
    isUpdatingPayment,

    // Delete operations
    handleDelete,
    handleArchive,
    isDeleting,
  }
}
