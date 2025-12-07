import { useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { useToast } from '@/hooks/use-toast'
import { useSoftDelete } from '@/hooks/use-soft-delete'
import { getErrorMessage } from '@/lib/error-utils'
import { markAsPaid as markAsPaidService, verifyPayment as verifyPaymentService } from '@/services/payment-service'
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
  })

  // Delete confirmation dialog state
  const [deleteConfirm, setDeleteConfirm] = useState<DeleteConfirmState>({
    show: false,
    bookingId: null,
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
        toast({
          title: 'Error',
          description: getErrorMessage(error),
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
        toast({
          title: 'Error',
          description: 'Failed to delete booking',
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

  const markAsPaid = useCallback(
    async (bookingId: string, method: string = 'cash') => {
      setActionLoading((prev) => ({ ...prev, markAsPaid: true }))
      try {
        const result = await markAsPaidService({
          bookingId,
          paymentMethod: method,
          amount: selectedBooking?.total_price || 0,
        })

        if (!result.success) throw new Error(result.error)

        toast({
          title: 'Success',
          description: result.count > 1
            ? `${result.count} bookings marked as paid`
            : 'Booking marked as paid',
        })

        if (selectedBooking && selectedBooking.id === bookingId && onBookingUpdate) {
          onBookingUpdate({
            ...selectedBooking,
            payment_status: 'paid',
            payment_method: method,
            amount_paid: selectedBooking.total_price || 0,
          })
        }

        refresh()
      } catch (error) {
        toast({
          title: 'Error',
          description: getErrorMessage(error),
          variant: 'destructive',
        })
      } finally {
        setActionLoading((prev) => ({ ...prev, markAsPaid: false }))
      }
    },
    [selectedBooking, toast, refresh, onBookingUpdate]
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
      setActionLoading((prev) => ({ ...prev, markAsPaid: true }))
      try {
        const result = await verifyPaymentService({
          bookingId,
        })

        if (!result.success) throw new Error(result.error)

        toast({
          title: 'Success',
          description: 'Payment verified successfully',
        })

        if (selectedBooking && selectedBooking.id === bookingId && onBookingUpdate) {
          onBookingUpdate({
            ...selectedBooking,
            payment_status: 'paid',
          })
        }

        refresh()
      } catch (error) {
        toast({
          title: 'Error',
          description: getErrorMessage(error),
          variant: 'destructive',
        })
      } finally {
        setActionLoading((prev) => ({ ...prev, markAsPaid: false }))
      }
    },
    [selectedBooking, toast, refresh, onBookingUpdate]
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
