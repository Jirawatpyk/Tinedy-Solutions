import { useState, useCallback, useEffect, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { useToast } from '@/hooks/use-toast'
import { useSoftDelete } from '@/hooks/use-soft-delete'
import { mapErrorToUserMessage } from '@/lib/error-messages'
import { useBookingStatusManager } from '@/hooks/useBookingStatusManager'
import { usePaymentActions } from '@/hooks/usePaymentActions'
import type { Booking } from '@/types/booking'

export interface UseBookingDetailModalProps {
  /**
   * Callback to refresh data after actions
   */
  refresh: () => void
  /**
   * Bookings array for syncing selectedBooking with realtime updates
   */
  bookings?: Booking[]
}

export interface UseBookingDetailModalReturn {
  selectedBooking: Booking | null
  isOpen: boolean
  openDetail: (booking: Booking) => void
  closeDetail: () => void
  showStatusConfirm: boolean
  pendingStatusChange: { bookingId: string; currentStatus: string; newStatus: string } | null
  confirmStatusChange: () => Promise<void>
  cancelStatusChange: () => void
  getStatusTransitionMessage: (currentStatus: string, newStatus: string) => string
  modalProps: {
    booking: Booking | null
    isOpen: boolean
    onClose: () => void
    onEdit?: (booking: Booking) => void
    onCancel: (bookingId: string) => void
    onDelete: (bookingId: string) => void
    onStatusChange: (bookingId: string, currentStatus: string, newStatus: string) => void
    onMarkAsPaid: (bookingId: string, method: string) => void
    onVerifyPayment?: (bookingId: string) => void
    onRequestRefund?: (bookingId: string) => void
    onCompleteRefund?: (bookingId: string) => void
    onCancelRefund?: (bookingId: string) => void
    getStatusBadge: (status: string) => React.ReactNode
    getPaymentStatusBadge: (status?: string) => React.ReactNode
    getAvailableStatuses: (currentStatus: string) => string[]
    getStatusLabel: (status: string) => string
  }
}

/**
 * Custom hook for managing booking detail modal
 *
 * Provides state management and action handlers for booking detail modal
 * Used in StaffRecentBookings, TeamRecentBookings, and other components
 *
 * @param props - Configuration options
 * @returns Modal state, handlers, and props
 */
export function useBookingDetailModal({
  refresh,
  bookings = [],
}: UseBookingDetailModalProps): UseBookingDetailModalReturn {
  const { toast } = useToast()
  const { softDelete } = useSoftDelete('bookings')

  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null)
  const [isOpen, setIsOpen] = useState(false)

  // Sync selectedBooking with bookings array when data updates (realtime)
  // Optimized to prevent flickering by comparing only important fields
  const lastSyncedBooking = useRef<Booking | null>(null)

  useEffect(() => {
    // Only sync if modal is open and booking is selected
    if (!selectedBooking || !isOpen) {
      lastSyncedBooking.current = null
      return
    }

    if (bookings.length === 0) return

    const updatedBooking = bookings.find((b) => b.id === selectedBooking.id)
    if (!updatedBooking) return

    // Compare only important fields that might change via realtime
    const prev = lastSyncedBooking.current
    const hasImportantChanges = !prev ||
      updatedBooking.status !== prev.status ||
      updatedBooking.payment_status !== prev.payment_status ||
      updatedBooking.payment_method !== prev.payment_method ||
      updatedBooking.payment_date !== prev.payment_date ||
      (updatedBooking as { payment_slip_url?: string }).payment_slip_url !== (prev as { payment_slip_url?: string }).payment_slip_url

    if (hasImportantChanges) {
      lastSyncedBooking.current = updatedBooking
      setSelectedBooking(updatedBooking)
    }
    // Note: We intentionally use selectedBooking?.id instead of selectedBooking
    // to avoid infinite loop when setSelectedBooking is called
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bookings, selectedBooking?.id, isOpen])

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
    confirmStatusChange,
    cancelStatusChange,
    markAsPaid: handleMarkAsPaid,
  } = useBookingStatusManager({
    selectedBooking,
    setSelectedBooking,
    onSuccess: refresh,
  })

  // Use centralized payment actions for verify and refund
  const {
    verifyPayment: handleVerifyPayment,
    requestRefund: handleRequestRefund,
    completeRefund: handleCompleteRefund,
    cancelRefund: handleCancelRefund,
  } = usePaymentActions({
    selectedBooking,
    setSelectedBooking,
    onSuccess: refresh,
  })

  const openDetail = useCallback((booking: Booking) => {
    setSelectedBooking(booking)
    setIsOpen(true)
  }, [])

  const closeDetail = useCallback(() => {
    setIsOpen(false)
    setSelectedBooking(null)
  }, [])

  const archiveBooking = useCallback(
    async (bookingId: string) => {
      const result = await softDelete(bookingId)
      if (result.success) {
        closeDetail()
        refresh()
      }
    },
    [softDelete, closeDetail, refresh]
  )

  const deleteBooking = useCallback(
    async (bookingId: string) => {
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

        closeDetail()
        refresh()
      } catch (error) {
        const errorMsg = mapErrorToUserMessage(error, 'booking')
        toast({
          title: errorMsg.title,
          description: errorMsg.description,
          variant: 'destructive',
        })
      }
    },
    [toast, closeDetail, refresh]
  )

  return {
    selectedBooking,
    isOpen,
    openDetail,
    closeDetail,
    showStatusConfirm: showStatusConfirmDialog,
    pendingStatusChange,
    confirmStatusChange,
    cancelStatusChange,
    getStatusTransitionMessage,
    modalProps: {
      booking: selectedBooking,
      isOpen,
      onClose: closeDetail,
      onCancel: archiveBooking,
      onDelete: deleteBooking,
      onStatusChange: handleStatusChange,
      onMarkAsPaid: handleMarkAsPaid,
      onVerifyPayment: handleVerifyPayment,
      onRequestRefund: handleRequestRefund,
      onCompleteRefund: handleCompleteRefund,
      onCancelRefund: handleCancelRefund,
      getStatusBadge,
      getPaymentStatusBadge,
      getAvailableStatuses,
      getStatusLabel,
    },
  }
}
