import { useState, useCallback } from 'react'
import type { ReactElement, Dispatch, SetStateAction } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useToast } from '@/hooks/use-toast'
import { supabase } from '@/lib/supabase'
import { StatusBadge, getBookingStatusVariant, getBookingStatusLabel, getPaymentStatusVariant, getPaymentStatusLabel } from '@/components/common/StatusBadge'
import { mapErrorToUserMessage } from '@/lib/error-messages'
import { queryKeys } from '@/lib/query-keys'
import { usePaymentActions } from '@/hooks/usePaymentActions'
import { getStatusLabel, getAvailableStatuses, getValidTransitions } from '@/lib/booking-utils'
import type { BookingBase } from '@/types/booking'
import type { Booking } from '@/types/booking'

interface PendingStatusChange {
  bookingId: string
  currentStatus: string
  newStatus: string
}

interface UseBookingStatusManagerProps<T extends BookingBase> {
  selectedBooking: T | null
  setSelectedBooking: Dispatch<SetStateAction<T | null>>
  onSuccess: () => void
}

interface UseBookingStatusManagerReturn {
  showStatusConfirmDialog: boolean
  setShowStatusConfirmDialog: (show: boolean) => void
  pendingStatusChange: PendingStatusChange | null
  getStatusBadge: (status: string) => ReactElement
  getPaymentStatusBadge: (status?: string) => ReactElement
  getValidTransitions: (status: string) => string[]
  getAvailableStatuses: (status: string) => string[]
  getStatusLabel: (status: string) => string
  getStatusTransitionMessage: (currentStatus: string, newStatus: string) => string
  handleStatusChange: (bookingId: string, currentStatus: string, newStatus: string) => void
  confirmStatusChange: () => Promise<void>
  cancelStatusChange: () => void
  markAsPaid: (bookingId: string, method?: string) => Promise<void>
  isUpdatingStatus: boolean
}

/**
 * Custom hook for managing booking status transitions and payments
 *
 * Handles status validation, workflow transitions, confirmation dialogs,
 * and payment status updates.
 */
export function useBookingStatusManager<T extends BookingBase>({
  selectedBooking,
  setSelectedBooking,
  onSuccess,
}: UseBookingStatusManagerProps<T>): UseBookingStatusManagerReturn {
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const [showStatusConfirmDialog, setShowStatusConfirmDialog] = useState(false)
  const [pendingStatusChange, setPendingStatusChange] = useState<PendingStatusChange | null>(null)
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false)

  // Use centralized payment actions
  const { markAsPaid } = usePaymentActions({
    selectedBooking: selectedBooking as Booking | null,
    setSelectedBooking: setSelectedBooking as unknown as (booking: Booking) => void,
    onSuccess,
  })

  const getStatusBadge = (status: string) => {
    return (
      <StatusBadge variant={getBookingStatusVariant(status)}>
        {getBookingStatusLabel(status)}
      </StatusBadge>
    )
  }

  const isValidTransition = (currentStatus: string, newStatus: string): boolean => {
    const validTransitionsList = getValidTransitions(currentStatus)
    return validTransitionsList.includes(newStatus)
  }

  const getStatusTransitionMessage = (currentStatus: string, newStatus: string): string => {
    const messages: Record<string, Record<string, string>> = {
      pending: {
        confirmed: 'Confirm this booking?',
        cancelled: 'Cancel this booking? This action cannot be undone.',
        no_show: 'Mark this booking as no-show? This action cannot be undone.',
      },
      confirmed: {
        in_progress: 'Mark this booking as in progress?',
        completed: 'Mark this booking as completed?',
        cancelled: 'Cancel this booking? This action cannot be undone.',
        no_show: 'Mark this booking as no-show? This action cannot be undone.',
      },
      in_progress: {
        completed: 'Mark this booking as completed?',
        cancelled: 'Cancel this booking? This action cannot be undone.',
      },
      completed: {
        cancelled: 'Cancel this completed booking? You may need to process a refund.',
      },
    }

    const message = messages[currentStatus]?.[newStatus]
    if (message) return message

    // Fallback with user-friendly labels
    const fromLabel = getStatusLabel(currentStatus)
    const toLabel = getStatusLabel(newStatus)
    return `Change status from ${fromLabel} to ${toLabel}?`
  }

  // Handle status change with validation
  const handleStatusChange = (bookingId: string, currentStatus: string, newStatus: string) => {
    // Same status - ignore
    if (currentStatus === newStatus) return

    // Check if transition is valid
    if (!isValidTransition(currentStatus, newStatus)) {
      toast({
        title: 'Invalid Status Transition',
        description: `Cannot change from "${currentStatus}" to "${newStatus}". Please follow the workflow: ${getValidTransitions(currentStatus).join(', ')}`,
        variant: 'destructive',
      })
      return
    }

    // Show confirmation dialog
    setPendingStatusChange({ bookingId, currentStatus, newStatus })
    setShowStatusConfirmDialog(true)
  }

  // Helper function to update booking status in all cached queries (Optimistic Update)
  const updateBookingStatusInCache = useCallback((bookingId: string, newStatus: string) => {
    // Update all booking-related queries in cache
    queryClient.setQueriesData<Booking[]>(
      { queryKey: queryKeys.bookings.all },
      (oldData) => {
        if (!oldData) return oldData
        return oldData.map((booking) =>
          booking.id === bookingId
            ? { ...booking, status: newStatus }
            : booking
        )
      }
    )
  }, [queryClient])

  // Confirm and execute status change with Optimistic Update
  const confirmStatusChange = useCallback(async () => {
    if (!pendingStatusChange) return

    const { bookingId, currentStatus, newStatus } = pendingStatusChange

    // 1. Close dialog immediately for better UX
    setShowStatusConfirmDialog(false)
    setPendingStatusChange(null)

    // 2. Set loading state
    setIsUpdatingStatus(true)

    // 3. Optimistic Update - Update cache immediately (UI changes instantly)
    const previousData = queryClient.getQueriesData<Booking[]>({
      queryKey: queryKeys.bookings.all,
    })
    updateBookingStatusInCache(bookingId, newStatus)

    // 4. Update selected booking state immediately
    if (selectedBooking && selectedBooking.id === bookingId) {
      setSelectedBooking({ ...selectedBooking, status: newStatus })
    }

    try {
      // 5. Call API in background
      const { error } = await supabase
        .from('bookings')
        .update({ status: newStatus })
        .eq('id', bookingId)

      if (error) throw error

      // 6. Show success toast
      toast({
        title: 'Success',
        description: `Status changed to ${getStatusLabel(newStatus)}`,
      })

      // 7. Trigger background refetch to sync with server
      onSuccess()
    } catch (error) {
      // 8. Rollback on error - restore previous cache data
      previousData.forEach(([queryKey, data]) => {
        if (data) {
          queryClient.setQueryData(queryKey, data)
        }
      })

      // Rollback selected booking
      if (selectedBooking && selectedBooking.id === bookingId) {
        setSelectedBooking({ ...selectedBooking, status: currentStatus })
      }

      const errorMsg = mapErrorToUserMessage(error, 'booking')
      toast({
        title: errorMsg.title,
        description: errorMsg.description,
        variant: 'destructive',
      })
    } finally {
      // 9. Clear loading state
      setIsUpdatingStatus(false)
    }
  }, [pendingStatusChange, selectedBooking, setSelectedBooking, queryClient, toast, onSuccess, updateBookingStatusInCache])

  // Cancel status change
  const cancelStatusChange = () => {
    setShowStatusConfirmDialog(false)
    setPendingStatusChange(null)
  }

  const getPaymentStatusBadge = (status?: string) => {
    const paymentStatus = status || 'unpaid'
    return (
      <StatusBadge variant={getPaymentStatusVariant(paymentStatus)}>
        {getPaymentStatusLabel(paymentStatus)}
      </StatusBadge>
    )
  }

  return {
    showStatusConfirmDialog,
    setShowStatusConfirmDialog,
    pendingStatusChange,
    getStatusBadge,
    getPaymentStatusBadge,
    getValidTransitions,
    getAvailableStatuses,
    getStatusLabel,
    getStatusTransitionMessage,
    handleStatusChange,
    confirmStatusChange,
    cancelStatusChange,
    markAsPaid,
    isUpdatingStatus,
  }
}
