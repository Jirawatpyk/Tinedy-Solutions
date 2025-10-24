import { useState } from 'react'
import { useToast } from '@/hooks/use-toast'
import { supabase } from '@/lib/supabase'
import { formatFullAddress } from '@/lib/booking-utils'
import { getErrorMessage } from '@/lib/error-utils'
import type { Booking } from '@/types/booking'

interface UseBulkActionsProps {
  bookings: Booking[]
  filteredBookings: Booking[]
  onSuccess: () => void
}

interface UseBulkActionsReturn {
  selectedBookings: string[]
  bulkStatus: string
  setBulkStatus: (status: string) => void
  toggleSelectAll: () => void
  toggleSelectBooking: (id: string) => void
  handleBulkStatusUpdate: () => Promise<void>
  handleBulkDelete: () => Promise<void>
  handleBulkExport: () => void
}

/**
 * Custom hook for managing bulk booking operations
 *
 * Handles selection, status updates, deletion, and export functionality
 * for multiple bookings at once.
 *
 * @param bookings - All bookings (for export)
 * @param filteredBookings - Currently filtered bookings (for select all)
 * @param onSuccess - Callback after successful bulk operations
 */
export function useBulkActions({
  bookings,
  filteredBookings,
  onSuccess,
}: UseBulkActionsProps): UseBulkActionsReturn {
  const { toast } = useToast()
  const [selectedBookings, setSelectedBookings] = useState<string[]>([])
  const [bulkStatus, setBulkStatus] = useState('')

  const toggleSelectAll = () => {
    if (selectedBookings.length === filteredBookings.length) {
      setSelectedBookings([])
    } else {
      setSelectedBookings(filteredBookings.map(b => b.id))
    }
  }

  const toggleSelectBooking = (bookingId: string) => {
    if (selectedBookings.includes(bookingId)) {
      setSelectedBookings(selectedBookings.filter(id => id !== bookingId))
    } else {
      setSelectedBookings([...selectedBookings, bookingId])
    }
  }

  const handleBulkStatusUpdate = async () => {
    if (!bulkStatus || selectedBookings.length === 0) return

    try {
      const { error } = await supabase
        .from('bookings')
        .update({ status: bulkStatus })
        .in('id', selectedBookings)

      if (error) throw error

      toast({
        title: 'Success',
        description: `Updated ${selectedBookings.length} bookings to ${bulkStatus}`,
      })
      setSelectedBookings([])
      setBulkStatus('')
      onSuccess()
    } catch (error) {
      toast({
        title: 'Error',
        description: getErrorMessage(error),
        variant: 'destructive',
      })
    }
  }

  const handleBulkDelete = async () => {
    if (selectedBookings.length === 0) return
    if (!confirm(`Are you sure you want to delete ${selectedBookings.length} bookings?`)) return

    try {
      const { error } = await supabase
        .from('bookings')
        .delete()
        .in('id', selectedBookings)

      if (error) throw error

      toast({
        title: 'Success',
        description: `Deleted ${selectedBookings.length} bookings`,
      })
      setSelectedBookings([])
      onSuccess()
    } catch (error) {
      toast({
        title: 'Error',
        description: getErrorMessage(error),
        variant: 'destructive',
      })
    }
  }

  const handleBulkExport = () => {
    if (selectedBookings.length === 0) return

    const bookingsToExport = bookings.filter(b => selectedBookings.includes(b.id))
    const csv = [
      ['Customer', 'Service', 'Date', 'Time', 'Status', 'Price', 'Address'].join(','),
      ...bookingsToExport.map(b => [
        b.customers?.full_name || '',
        b.service_packages?.name || '',
        b.booking_date,
        `${b.start_time}-${b.end_time}`,
        b.status,
        b.total_price,
        formatFullAddress(b)
      ].join(','))
    ].join('\n')

    const blob = new Blob([csv], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `bookings-${new Date().toISOString().split('T')[0]}.csv`
    a.click()

    toast({
      title: 'Success',
      description: `Exported ${selectedBookings.length} bookings to CSV`,
    })
  }

  return {
    selectedBookings,
    bulkStatus,
    setBulkStatus,
    toggleSelectAll,
    toggleSelectBooking,
    handleBulkStatusUpdate,
    handleBulkDelete,
    handleBulkExport,
  }
}
