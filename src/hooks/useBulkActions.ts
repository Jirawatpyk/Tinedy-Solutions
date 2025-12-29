import { useState, useCallback } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useToast } from '@/hooks/use-toast'
import { supabase } from '@/lib/supabase'
import { queryKeys } from '@/lib/query-keys'
import { formatFullAddress, getValidTransitions } from '@/lib/booking-utils'
import { mapErrorToUserMessage } from '@/lib/error-messages'
import { formatCurrency, formatBookingId } from '@/lib/utils'
import { usePermissions } from '@/hooks/use-permissions'
import type { Booking } from '@/types/booking'
import * as XLSX from 'xlsx'

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
  toggleSelectBooking: (id: string | string[]) => void
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
  const queryClient = useQueryClient()
  const { toast } = useToast()
  const { canDelete } = usePermissions()
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

  const toggleSelectBooking = (bookingId: string | string[]) => {
    // Handle array of booking IDs (for group selection)
    if (Array.isArray(bookingId)) {
      const bookingIds = bookingId
      const allSelected = bookingIds.every(id => selectedBookings.includes(id))

      if (allSelected) {
        // Deselect all
        setSelectedBookings(selectedBookings.filter(id => !bookingIds.includes(id)))
      } else {
        // Select all (add missing ones)
        const newIds = bookingIds.filter(id => !selectedBookings.includes(id))
        setSelectedBookings([...selectedBookings, ...newIds])
      }
    } else {
      // Handle single booking ID
      if (selectedBookings.includes(bookingId)) {
        setSelectedBookings(selectedBookings.filter(id => id !== bookingId))
      } else {
        setSelectedBookings([...selectedBookings, bookingId])
      }
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
  // Uses optimistic updates for instant UI feedback on bulk deletes
  // Supports both hard delete (Admin) and soft delete (Manager)
  const confirmBulkDelete = useCallback(async () => {
    if (selectedBookings.length === 0) return

    setIsDeleting(true)
    const count = selectedBookings.length
    const queryKey = queryKeys.bookings.all
    const hasDeletePermission = canDelete('bookings')

    // STEP 1: Save previous cache data (for rollback on error)
    const previousData = queryClient.getQueryData<Booking[]>(queryKey)

    try {
      // STEP 2: Optimistic update - remove bookings from cache immediately
      queryClient.setQueryData<Booking[]>(queryKey, (oldData) => {
        if (!oldData) return oldData
        return oldData.filter((booking) => !selectedBookings.includes(booking.id))
      })

      // STEP 3: Delete based on permission
      if (hasDeletePermission) {
        // Admin: Permanent delete (hard delete)
        const { error } = await supabase
          .from('bookings')
          .delete()
          .in('id', selectedBookings)

        if (error) throw error
      } else {
        // Manager: Soft delete (archive) using RPC
        const deletePromises = selectedBookings.map(id =>
          supabase.rpc('soft_delete_record', {
            table_name: 'bookings',
            record_id: id,
          })
        )

        const results = await Promise.all(deletePromises)
        const errors = results.filter(r => r.error)
        if (errors.length > 0) {
          throw new Error(`Failed to archive ${errors.length} booking${errors.length > 1 ? 's' : ''}`)
        }
      }

      // STEP 4: Show single success toast
      toast({
        title: 'Success',
        description: hasDeletePermission
          ? `Permanently deleted ${count} booking${count > 1 ? 's' : ''}`
          : `Archived ${count} booking${count > 1 ? 's' : ''}`,
      })

      // STEP 5: Clean up and trigger refetch
      setSelectedBookings([])
      setShowDeleteConfirm(false)
      onSuccess()
    } catch (error) {
      // STEP 6: Rollback - restore previous cache data
      if (previousData) {
        queryClient.setQueryData(queryKey, previousData)
      }

      const errorMsg = mapErrorToUserMessage(error, 'booking')
      toast({
        title: errorMsg.title,
        description: errorMsg.description,
        variant: 'destructive',
      })
    } finally {
      setIsDeleting(false)
    }
  }, [selectedBookings, queryClient, toast, onSuccess, canDelete])

  const handleBulkExport = () => {
    if (selectedBookings.length === 0) return

    const bookingsToExport = bookings
      .filter(b => selectedBookings.includes(b.id))
      // Sort: by recurring_group_id first, then by recurring_sequence, then by date
      .sort((a, b) => {
        // ถ้าอยู่ใน recurring group เดียวกัน - เรียงตาม sequence
        if (a.recurring_group_id && b.recurring_group_id && a.recurring_group_id === b.recurring_group_id) {
          return (a.recurring_sequence || 0) - (b.recurring_sequence || 0)
        }
        // ถ้าไม่ใช่ recurring group เดียวกัน - เรียงตามวันที่
        return new Date(a.booking_date).getTime() - new Date(b.booking_date).getTime()
      })

    // Prepare data for Excel
    const excelData = bookingsToExport.map(b => {
      // คำนวณราคารวม recurring group (ถ้าเป็น recurring)
      const groupTotalPrice = b.is_recurring && b.recurring_total
        ? Number(b.total_price) * b.recurring_total
        : Number(b.total_price)

      return {
        'Booking ID': formatBookingId(b.id),
        'Customer': b.customers?.full_name || '',
        'Email': b.customers?.email || '',
        'Phone': b.customers?.phone || '',
        'Service': b.service_packages?.name || b.service_packages_v2?.name || '',
        'Service Type': b.service_packages?.service_type || b.service_packages_v2?.service_type || '',
        'Area (sqm)': b.area_sqm || '-',
        'Frequency': b.frequency ? `${b.frequency} times` : '-',
        'Recurring': b.is_recurring ? `${b.recurring_sequence || '-'}/${b.recurring_total || '-'}` : 'No',
        'Date': b.booking_date,
        'Start Time': b.start_time,
        'End Time': b.end_time,
        'Status': b.status,
        'Payment Status': b.payment_status || 'unpaid',
        'Price (per booking)': formatCurrency(Number(b.total_price)),
        'Total Price': formatCurrency(groupTotalPrice),
        'Staff': b.profiles?.full_name || '',
        'Team': b.teams?.name || '',
        'Address': formatFullAddress(b),
        'Notes': b.notes || '',
        'Created At': b.created_at ? new Date(b.created_at).toLocaleString('th-TH') : '-',
      }
    })

    // Create workbook and worksheet
    const worksheet = XLSX.utils.json_to_sheet(excelData)
    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Bookings')

    // Auto-size columns
    const colWidths = Object.keys(excelData[0] || {}).map(key => ({
      wch: Math.max(key.length, 15)
    }))
    worksheet['!cols'] = colWidths

    // Generate Excel file
    const fileName = `bookings-${new Date().toISOString().split('T')[0]}.xlsx`
    XLSX.writeFile(workbook, fileName)

    toast({
      title: 'Success',
      description: `Exported ${selectedBookings.length} bookings to Excel`,
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
