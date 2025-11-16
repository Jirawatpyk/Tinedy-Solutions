import { useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { useToast } from '@/hooks/use-toast'
import { getErrorMessage } from '@/lib/error-utils'
import { getBangkokDateString } from '@/lib/dashboard-utils'
import type { TodayBooking, ActionLoading } from '@/types/dashboard'

export function useDashboardActions(
  refresh: () => void,
  selectedBooking: TodayBooking | null,
  onBookingUpdate?: (booking: TodayBooking) => void
) {
  const { toast } = useToast()
  const [actionLoading, setActionLoading] = useState<ActionLoading>({
    statusChange: false,
    delete: false,
    markAsPaid: false,
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

  const deleteBooking = useCallback(
    async (bookingId: string) => {
      if (!confirm('Are you sure you want to delete this booking?')) return

      setActionLoading((prev) => ({ ...prev, delete: true }))
      try {
        const { error } = await supabase.from('bookings').delete().eq('id', bookingId)

        if (error) throw error

        toast({
          title: 'Success',
          description: 'Booking deleted successfully',
        })

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
    [toast, refresh]
  )

  const markAsPaid = useCallback(
    async (bookingId: string, method: string = 'cash') => {
      setActionLoading((prev) => ({ ...prev, markAsPaid: true }))
      try {
        const updateData = {
          payment_status: 'paid',
          payment_method: method,
          amount_paid: selectedBooking?.total_price || 0,
          payment_date: getBangkokDateString(),
        }

        const { error } = await supabase.from('bookings').update(updateData).eq('id', bookingId)

        if (error) throw error

        toast({
          title: 'Success',
          description: 'Booking marked as paid',
        })

        if (selectedBooking && selectedBooking.id === bookingId && onBookingUpdate) {
          onBookingUpdate({
            ...selectedBooking,
            ...updateData,
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
    markAsPaid,
    actionLoading,
  }
}
