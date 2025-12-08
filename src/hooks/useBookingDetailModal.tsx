import { useState, useCallback, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useToast } from '@/hooks/use-toast'
import { useSoftDelete } from '@/hooks/use-soft-delete'
import { mapErrorToUserMessage } from '@/lib/error-messages'
import { Badge } from '@/components/ui/badge'
import { getPaymentStatusBadge as getPaymentBadge } from '@/lib/booking-badges'
import { BOOKING_STATUS_COLORS, BOOKING_STATUS_LABELS, type BookingStatus } from '@/constants/booking-status'
import { usePaymentActions } from '@/hooks/usePaymentActions'
import { getStatusLabel, getAvailableStatuses } from '@/lib/booking-utils'
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
  useEffect(() => {
    if (selectedBooking && bookings.length > 0) {
      const updatedBooking = bookings.find((b) => b.id === selectedBooking.id)
      if (updatedBooking && JSON.stringify(updatedBooking) !== JSON.stringify(selectedBooking)) {
        setSelectedBooking(updatedBooking)
      }
    }
  }, [bookings, selectedBooking])

  // Use centralized payment actions
  const {
    markAsPaid: handleMarkAsPaid,
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

  const handleStatusChange = useCallback(
    async (bookingId: string, _currentStatus: string, newStatus: string) => {
      try {
        const { error } = await supabase
          .from('bookings')
          .update({ status: newStatus })
          .eq('id', bookingId)

        if (error) throw error

        // Update local state immediately
        if (selectedBooking && selectedBooking.id === bookingId) {
          setSelectedBooking({ ...selectedBooking, status: newStatus })
        }

        toast({
          title: 'Success',
          description: `Status updated to ${newStatus}`,
        })

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
    [selectedBooking, toast, refresh]
  )

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

  const getStatusBadge = useCallback((status: string) => {
    const colorClass = BOOKING_STATUS_COLORS[status as BookingStatus] || 'bg-gray-100 text-gray-800 border-gray-300'
    const label = BOOKING_STATUS_LABELS[status as BookingStatus] || status
    return <Badge variant="outline" className={colorClass}>{label}</Badge>
  }, [])

  const getPaymentStatusBadge = useCallback((status?: string) => {
    return getPaymentBadge(status)
  }, [])

  // Use centralized status utilities (wrapped in useCallback for stable reference)
  const getAvailableStatusesCallback = useCallback((currentStatus: string) => {
    return getAvailableStatuses(currentStatus)
  }, [])

  const getStatusLabelCallback = useCallback((status: string) => {
    return getStatusLabel(status)
  }, [])

  return {
    selectedBooking,
    isOpen,
    openDetail,
    closeDetail,
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
      getAvailableStatuses: getAvailableStatusesCallback,
      getStatusLabel: getStatusLabelCallback,
    },
  }
}
