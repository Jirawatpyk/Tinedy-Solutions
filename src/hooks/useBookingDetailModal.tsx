import { useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { useToast } from '@/hooks/use-toast'
import { useSoftDelete } from '@/hooks/use-soft-delete'
import { mapErrorToUserMessage } from '@/lib/error-messages'
import { Badge } from '@/components/ui/badge'
import { getPaymentStatusBadge as getPaymentBadge } from '@/lib/booking-badges'
import { BOOKING_STATUS_COLORS, BOOKING_STATUS_LABELS, type BookingStatus } from '@/constants/booking-status'
import { markAsPaid as markAsPaidService, verifyPayment as verifyPaymentService } from '@/services/payment-service'
import type { Booking } from '@/types/booking'

export interface UseBookingDetailModalProps {
  /**
   * Callback to refresh data after actions
   */
  refresh: () => void
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
  refresh
}: UseBookingDetailModalProps): UseBookingDetailModalReturn {
  const { toast } = useToast()
  const { softDelete } = useSoftDelete('bookings')

  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null)
  const [isOpen, setIsOpen] = useState(false)

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

  const handleMarkAsPaid = useCallback(
    async (bookingId: string, method: string = 'cash') => {
      try {
        const result = await markAsPaidService({
          bookingId,
          recurringGroupId: selectedBooking?.recurring_group_id,
          paymentMethod: method,
          amount: selectedBooking?.total_price || 0,
        })

        if (!result.success) throw new Error(result.error)

        // Update local state immediately
        if (selectedBooking && selectedBooking.id === bookingId) {
          setSelectedBooking({
            ...selectedBooking,
            payment_status: 'paid',
            payment_method: method,
            amount_paid: selectedBooking.total_price || 0,
          })
        }

        toast({
          title: 'Success',
          description: result.count > 1
            ? `${result.count} bookings marked as paid`
            : 'Payment marked as paid',
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

  const handleVerifyPayment = useCallback(
    async (bookingId: string) => {
      try {
        const result = await verifyPaymentService({
          bookingId,
          recurringGroupId: selectedBooking?.recurring_group_id,
        })

        if (!result.success) throw new Error(result.error)

        // Update local state immediately
        if (selectedBooking && selectedBooking.id === bookingId) {
          setSelectedBooking({
            ...selectedBooking,
            payment_status: 'paid',
          })
        }

        toast({
          title: 'Success',
          description: result.count > 1
            ? `${result.count} bookings verified successfully`
            : 'Payment verified successfully',
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

  const getAvailableStatuses = useCallback((currentStatus: string) => {
    const statusFlow: Record<string, string[]> = {
      pending: ['pending', 'confirmed', 'cancelled', 'no_show'],
      confirmed: ['confirmed', 'in_progress', 'cancelled', 'no_show'],
      in_progress: ['in_progress', 'completed', 'cancelled'],
      completed: ['completed'],
      cancelled: ['cancelled', 'pending'],
      no_show: ['no_show', 'pending'],
    }
    return statusFlow[currentStatus] || [currentStatus]
  }, [])

  const getStatusLabel = useCallback((status: string) => {
    const labels: Record<string, string> = {
      pending: 'Pending',
      confirmed: 'Confirmed',
      in_progress: 'In Progress',
      completed: 'Completed',
      cancelled: 'Cancelled',
      no_show: 'No Show',
    }
    return labels[status] || status
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
      getStatusBadge,
      getPaymentStatusBadge,
      getAvailableStatuses,
      getStatusLabel,
    },
  }
}
