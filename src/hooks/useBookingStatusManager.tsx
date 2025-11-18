import { useState } from 'react'
import type { ReactElement, Dispatch, SetStateAction } from 'react'
import { useToast } from '@/hooks/use-toast'
import { supabase } from '@/lib/supabase'
import { StatusBadge, getBookingStatusVariant, getBookingStatusLabel, getPaymentStatusVariant, getPaymentStatusLabel } from '@/components/common/StatusBadge'
import { mapErrorToUserMessage } from '@/lib/error-messages'
import { getBangkokDateString } from '@/lib/utils'
import type { BookingBase } from '@/types/booking'

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
  const [showStatusConfirmDialog, setShowStatusConfirmDialog] = useState(false)
  const [pendingStatusChange, setPendingStatusChange] = useState<PendingStatusChange | null>(null)

  const getStatusBadge = (status: string) => {
    return (
      <StatusBadge variant={getBookingStatusVariant(status)}>
        {getBookingStatusLabel(status)}
      </StatusBadge>
    )
  }

  // Status Transition Rules
  const getValidTransitions = (currentStatus: string): string[] => {
    const transitions: Record<string, string[]> = {
      pending: ['confirmed', 'cancelled'],
      confirmed: ['in_progress', 'cancelled', 'no_show'],
      in_progress: ['completed', 'cancelled'],
      completed: [], // Final state
      cancelled: [], // Final state
      no_show: [], // Final state
    }
    return transitions[currentStatus] || []
  }

  // Get available status options for dropdown (current + valid transitions)
  const getAvailableStatuses = (currentStatus: string): string[] => {
    const validTransitions = getValidTransitions(currentStatus)
    return [currentStatus, ...validTransitions]
  }

  // Get status label
  const getStatusLabel = (status: string): string => {
    const labels: Record<string, string> = {
      pending: 'Pending',
      confirmed: 'Confirmed',
      in_progress: 'In Progress',
      completed: 'Completed',
      cancelled: 'Cancelled',
      no_show: 'No Show',
    }
    return labels[status] || status
  }

  const isValidTransition = (currentStatus: string, newStatus: string): boolean => {
    const validTransitions = getValidTransitions(currentStatus)
    return validTransitions.includes(newStatus)
  }

  const getStatusTransitionMessage = (currentStatus: string, newStatus: string): string => {
    const messages: Record<string, Record<string, string>> = {
      pending: {
        confirmed: 'Confirm this booking?',
        cancelled: 'Cancel this booking? This action cannot be undone.',
      },
      confirmed: {
        in_progress: 'Mark this booking as in progress?',
        cancelled: 'Cancel this booking? This action cannot be undone.',
        no_show: 'Mark this booking as no-show? This action cannot be undone.',
      },
      in_progress: {
        completed: 'Mark this booking as completed?',
        cancelled: 'Cancel this booking? This action cannot be undone.',
      },
    }
    return messages[currentStatus]?.[newStatus] || `Change status to ${newStatus}?`
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

  // Confirm and execute status change
  const confirmStatusChange = async () => {
    if (!pendingStatusChange) return

    try {
      const { error } = await supabase
        .from('bookings')
        .update({ status: pendingStatusChange.newStatus })
        .eq('id', pendingStatusChange.bookingId)

      if (error) throw error

      toast({
        title: 'Success',
        description: `Status changed to ${pendingStatusChange.newStatus}`,
      })

      // Update selected booking if it's the same one
      if (selectedBooking && selectedBooking.id === pendingStatusChange.bookingId) {
        setSelectedBooking({ ...selectedBooking, status: pendingStatusChange.newStatus })
      }

      setShowStatusConfirmDialog(false)
      setPendingStatusChange(null)
      onSuccess()
    } catch (error) {
      const errorMsg = mapErrorToUserMessage(error, 'booking')
      toast({
        title: errorMsg.title,
        description: errorMsg.description,
        variant: 'destructive',
      })
    }
  }

  // Cancel status change
  const cancelStatusChange = () => {
    setShowStatusConfirmDialog(false)
    setPendingStatusChange(null)
  }

  const markAsPaid = async (bookingId: string, method: string = 'cash') => {
    try {
      // ✅ ตรวจสอบว่าเป็น recurring booking หรือไม่
      const { data: booking, error: fetchError } = await supabase
        .from('bookings')
        .select('id, recurring_group_id, is_recurring, total_price')
        .eq('id', bookingId)
        .single()

      if (fetchError) throw fetchError

      const paymentDate = getBangkokDateString()
      const updateData = {
        payment_status: 'paid',
        payment_method: method,
        amount_paid: booking?.total_price || selectedBooking?.total_price || 0,
        payment_date: paymentDate,
      }

      // ✅ ถ้าเป็น recurring booking ให้อัปเดตทั้ง group
      if (booking?.recurring_group_id) {
        const { error } = await supabase
          .from('bookings')
          .update(updateData)
          .eq('recurring_group_id', booking.recurring_group_id)

        if (error) throw error

        // นับจำนวน booking ที่อัปเดต
        const { count } = await supabase
          .from('bookings')
          .select('id', { count: 'exact', head: true })
          .eq('recurring_group_id', booking.recurring_group_id)

        toast({
          title: 'Success',
          description: `${count || 0} recurring bookings marked as paid`,
        })
      } else {
        // ✅ ถ้าเป็น single booking อัปเดตแค่ตัวเดียว
        const { error } = await supabase
          .from('bookings')
          .update(updateData)
          .eq('id', bookingId)

        if (error) throw error

        toast({
          title: 'Success',
          description: 'Booking marked as paid',
        })
      }

      // Update selected booking in state
      if (selectedBooking) {
        setSelectedBooking({
          ...selectedBooking,
          payment_status: 'paid',
          payment_method: method,
          amount_paid: selectedBooking.total_price,
          payment_date: paymentDate,
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
  }
}
