import { useState, useCallback } from 'react'
import type { Dispatch, SetStateAction } from 'react'
import { supabase } from '@/lib/supabase'
import { useToast } from '@/hooks/use-toast'
import { useSoftDelete } from '@/hooks/use-soft-delete'
import { useBookingStatusManager } from '@/hooks/use-booking-status-manager'
import { usePaymentActions } from '@/hooks/use-payment-actions'
import { mapErrorToUserMessage } from '@/lib/error-messages'
import type { Booking } from '@/types/booking'
import type { ActionLoading } from '@/types/dashboard'

interface DeleteConfirmState {
  show: boolean
  bookingId: string | null
}

export function useDashboardActions(
  refresh: () => void,
  selectedBooking: Booking | null,
  onBookingUpdate?: Dispatch<SetStateAction<Booking | null>>
) {
  const { toast } = useToast()
  const { softDelete } = useSoftDelete('bookings')
  const [actionLoading, setActionLoading] = useState<ActionLoading>({
    statusChange: false,
    delete: false,
    markAsPaid: false,
    verifyPayment: false,
    refund: false,
  })

  // Delete confirmation dialog state
  const [deleteConfirm, setDeleteConfirm] = useState<DeleteConfirmState>({
    show: false,
    bookingId: null,
  })

  // Wrapper to update booking via callback
  const handleBookingUpdate = useCallback((value: SetStateAction<Booking | null>) => {
    if (onBookingUpdate) {
      onBookingUpdate(value)
    }
  }, [onBookingUpdate])

  // Use useBookingStatusManager for status management
  const {
    showStatusConfirmDialog,
    pendingStatusChange,
    getStatusBadge,
    getPaymentStatusBadge,
    getAvailableStatuses,
    getStatusLabel,
    getStatusTransitionMessage,
    handleStatusChange,
    confirmStatusChange: statusConfirm,
    cancelStatusChange: statusCancel,
    markAsPaid: statusMarkAsPaid,
  } = useBookingStatusManager({
    selectedBooking,
    setSelectedBooking: handleBookingUpdate,
    onSuccess: refresh,
  })

  // Use centralized payment actions for verify and refund (with loading states)
  const {
    verifyPayment: paymentVerifyPayment,
    requestRefund: paymentRequestRefund,
    completeRefund: paymentCompleteRefund,
    cancelRefund: paymentCancelRefund,
    isLoading: paymentLoading,
  } = usePaymentActions({
    selectedBooking,
    setSelectedBooking: handleBookingUpdate,
    onSuccess: refresh,
  })

  // Open delete confirmation dialog
  const deleteBooking = useCallback(
    (bookingId: string) => {
      setDeleteConfirm({ show: true, bookingId })
    },
    []
  )

  // Actually perform the deletion (called after confirmation)
  const confirmDeleteBooking = useCallback(
    async () => {
      if (!deleteConfirm.bookingId) return

      setActionLoading((prev) => ({ ...prev, delete: true }))
      try {
        const { error } = await supabase.from('bookings').delete().eq('id', deleteConfirm.bookingId)

        if (error) throw error

        toast({
          title: 'Success',
          description: 'Booking deleted successfully',
        })

        setDeleteConfirm({ show: false, bookingId: null })
        refresh()
      } catch (error) {
        const errorMsg = mapErrorToUserMessage(error, 'booking')
        toast({
          title: errorMsg.title,
          description: errorMsg.description,
          variant: 'destructive',
        })
      } finally {
        setActionLoading((prev) => ({ ...prev, delete: false }))
      }
    },
    [deleteConfirm.bookingId, toast, refresh]
  )

  // Close delete confirmation dialog
  const cancelDeleteBooking = useCallback(() => {
    setDeleteConfirm({ show: false, bookingId: null })
  }, [])

  // markAsPaid uses useBookingStatusManager (not usePaymentActions)
  // Keep manual loading state since statusMarkAsPaid doesn't provide loading state
  const markAsPaid = useCallback(
    async (bookingId: string, method: string = 'cash') => {
      setActionLoading((prev) => ({ ...prev, markAsPaid: true }))
      try {
        await statusMarkAsPaid(bookingId, method)
      } finally {
        setActionLoading((prev) => ({ ...prev, markAsPaid: false }))
      }
    },
    [statusMarkAsPaid]
  )

  const archiveBooking = useCallback(
    async (bookingId: string) => {
      const result = await softDelete(bookingId)
      if (result.success) {
        refresh()
      }
    },
    [softDelete, refresh]
  )

  // Payment operations now use loading states from usePaymentActions
  // No need to wrap with setActionLoading - just delegate directly
  const verifyPayment = useCallback(
    async (bookingId: string) => {
      await paymentVerifyPayment(bookingId)
    },
    [paymentVerifyPayment]
  )

  const requestRefund = useCallback(
    async (bookingId: string) => {
      await paymentRequestRefund(bookingId)
    },
    [paymentRequestRefund]
  )

  const completeRefund = useCallback(
    async (bookingId: string) => {
      await paymentCompleteRefund(bookingId)
    },
    [paymentCompleteRefund]
  )

  const cancelRefund = useCallback(
    async (bookingId: string) => {
      await paymentCancelRefund(bookingId)
    },
    [paymentCancelRefund]
  )

  return {
    handleStatusChange,
    deleteBooking,
    archiveBooking,
    markAsPaid,
    verifyPayment,
    requestRefund,
    completeRefund,
    cancelRefund,
    // Aggregate loading states: manual + payment operations
    actionLoading: {
      ...actionLoading,
      verifyPayment: paymentLoading.verifyPayment,
      refund: paymentLoading.refund,
    },
    // Delete confirmation dialog
    deleteConfirm,
    confirmDeleteBooking,
    cancelDeleteBooking,
    // Status change confirmation dialog (from useBookingStatusManager)
    statusChangeConfirm: {
      show: showStatusConfirmDialog,
      bookingId: pendingStatusChange?.bookingId || null,
      currentStatus: pendingStatusChange?.currentStatus || null,
      newStatus: pendingStatusChange?.newStatus || null,
    },
    confirmStatusChange: statusConfirm,
    cancelStatusChange: statusCancel,
    // Status utilities (from useBookingStatusManager)
    getStatusBadge,
    getPaymentStatusBadge,
    getAvailableStatuses,
    getStatusLabel,
    getStatusTransitionMessage,
  }
}
