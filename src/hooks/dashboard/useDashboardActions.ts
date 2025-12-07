import { useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { useToast } from '@/hooks/use-toast'
import { useSoftDelete } from '@/hooks/use-soft-delete'
import { mapErrorToUserMessage } from '@/lib/error-messages'
import { usePaymentActions } from '@/hooks/usePaymentActions'
import type { Booking } from '@/types/booking'
import type { ActionLoading } from '@/types/dashboard'

interface DeleteConfirmState {
  show: boolean
  bookingId: string | null
}

export function useDashboardActions(
  refresh: () => void,
  selectedBooking: Booking | null,
  onBookingUpdate?: (booking: Booking) => void
) {
  const { toast } = useToast()
  const { softDelete } = useSoftDelete('bookings')
  const [actionLoading, setActionLoading] = useState<ActionLoading>({
    statusChange: false,
    delete: false,
    markAsPaid: false,
    verifyPayment: false,
  })

  // Delete confirmation dialog state
  const [deleteConfirm, setDeleteConfirm] = useState<DeleteConfirmState>({
    show: false,
    bookingId: null,
  })

  // Wrapper to update booking via callback
  const handleBookingUpdate = useCallback((booking: Booking) => {
    if (onBookingUpdate) {
      onBookingUpdate(booking)
    }
  }, [onBookingUpdate])

  // Use centralized payment actions
  const { markAsPaid: paymentMarkAsPaid, verifyPayment: paymentVerifyPayment } = usePaymentActions({
    selectedBooking,
    setSelectedBooking: handleBookingUpdate,
    onSuccess: refresh,
  })

  const handleStatusChange = useCallback(
    async (bookingId: string, currentStatus: string, newStatus: string) => {
      if (currentStatus === newStatus) return

      setActionLoading((prev) => ({ ...prev, statusChange: true }))
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

        if (selectedBooking && selectedBooking.id === bookingId && onBookingUpdate) {
          onBookingUpdate({ ...selectedBooking, status: newStatus })
        }

        refresh()
      } catch (error) {
        const errorMsg = mapErrorToUserMessage(error, 'booking')
        toast({
          title: errorMsg.title,
          description: errorMsg.description,
          variant: 'destructive',
        })
      } finally {
        setActionLoading((prev) => ({ ...prev, statusChange: false }))
      }
    },
    [selectedBooking, toast, refresh, onBookingUpdate]
  )

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

  // Wrap payment actions with loading state
  const markAsPaid = useCallback(
    async (bookingId: string, method: string = 'cash') => {
      setActionLoading((prev) => ({ ...prev, markAsPaid: true }))
      try {
        await paymentMarkAsPaid(bookingId, method)
      } finally {
        setActionLoading((prev) => ({ ...prev, markAsPaid: false }))
      }
    },
    [paymentMarkAsPaid]
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

  const verifyPayment = useCallback(
    async (bookingId: string) => {
      setActionLoading((prev) => ({ ...prev, verifyPayment: true }))
      try {
        await paymentVerifyPayment(bookingId)
      } finally {
        setActionLoading((prev) => ({ ...prev, verifyPayment: false }))
      }
    },
    [paymentVerifyPayment]
  )

  return {
    handleStatusChange,
    deleteBooking,
    archiveBooking,
    markAsPaid,
    verifyPayment,
    actionLoading,
    // Delete confirmation dialog
    deleteConfirm,
    confirmDeleteBooking,
    cancelDeleteBooking,
  }
}
