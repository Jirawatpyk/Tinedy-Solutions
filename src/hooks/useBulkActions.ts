import { useState } from 'react'
import { useToast } from '@/hooks/use-toast'
import { supabase } from '@/lib/supabase'
import { formatFullAddress, getValidTransitions } from '@/lib/booking-utils'
import { mapErrorToUserMessage } from '@/lib/error-messages'
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
  // Delete confirmation dialog state
  showDeleteConfirm: boolean
  setShowDeleteConfirm: (show: boolean) => void
  confirmBulkDelete: () => Promise<void>
  isDeleting: boolean
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
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

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

  // getValidTransitions imported from @/lib/booking-utils

  const handleBulkStatusUpdate = async () => {
    if (!bulkStatus || selectedBookings.length === 0) return

    // Get selected bookings data
    const selectedBookingsData = bookings.filter(b => selectedBookings.includes(b.id))

    // Validate transitions for all selected bookings
    const invalidBookings = selectedBookingsData.filter(booking => {
      const validTransitions = getValidTransitions(booking.status)
      return !validTransitions.includes(bulkStatus) && booking.status !== bulkStatus
    })

    if (invalidBookings.length > 0) {
      const invalidStatuses = [...new Set(invalidBookings.map(b => b.status))].join(', ')
      toast({
        title: 'Invalid Status Transition',
        description: `Cannot change ${invalidBookings.length} booking(s) with status "${invalidStatuses}" to "${bulkStatus}". Please check the status workflow.`,
        variant: 'destructive',
      })
      return
    }

    // Filter out bookings that are already in the target status
    const bookingsToUpdate = selectedBookingsData.filter(b => b.status !== bulkStatus)

    if (bookingsToUpdate.length === 0) {
      toast({
        title: 'No Changes',
        description: 'All selected bookings are already in this status.',
      })
      return
    }

    try {
      const { error } = await supabase
        .from('bookings')
        .update({ status: bulkStatus })
        .in('id', bookingsToUpdate.map(b => b.id))

      if (error) throw error

      toast({
        title: 'Success',
        description: `Updated ${bookingsToUpdate.length} booking(s) to ${bulkStatus}`,
      })
      setSelectedBookings([])
      setBulkStatus('')
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

  // Open delete confirmation dialog
  const handleBulkDelete = async () => {
    if (selectedBookings.length === 0) return
    setShowDeleteConfirm(true)
  }

  // Actually perform the deletion (called after confirmation)
  const confirmBulkDelete = async () => {
    if (selectedBookings.length === 0) return

    setIsDeleting(true)
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
      setShowDeleteConfirm(false)
      onSuccess()
    } catch (error) {
      const errorMsg = mapErrorToUserMessage(error, 'booking')
      toast({
        title: errorMsg.title,
        description: errorMsg.description,
        variant: 'destructive',
      })
    } finally {
      setIsDeleting(false)
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
    // Delete confirmation dialog
    showDeleteConfirm,
    setShowDeleteConfirm,
    confirmBulkDelete,
    isDeleting,
  }
}
