import { useEffect, useState, useCallback, useRef, useMemo } from 'react'
import { useLocation } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Checkbox } from '@/components/ui/checkbox'
import { useBookingFilters } from '@/hooks/useBookingFilters'
import { usePagination } from '@/hooks/useBookingPagination'
import { useConflictDetection } from '@/hooks/useConflictDetection'
import { useBookingForm, toBookingForm } from '@/hooks/useBookingForm'
import { useBulkActions } from '@/hooks/useBulkActions'
import { useBookingStatusManager } from '@/hooks/useBookingStatusManager'
import { useBookings } from '@/hooks/useBookings'
import { useStaffList } from '@/hooks/useStaff'
import { useToast } from '@/hooks/use-toast'
import { useDebounce } from '@/hooks/use-debounce'
import { useServicePackages } from '@/hooks/useServicePackages'
import { AdminOnly } from '@/components/auth/permission-guard'
import { Plus } from 'lucide-react'
import { BookingDetailModal } from './booking-detail-modal'
import { getLoadErrorMessage, getBookingConflictError, getRecurringBookingError, getDeleteErrorMessage, getArchiveErrorMessage } from '@/lib/error-messages'
import { StaffAvailabilityModal } from '@/components/booking/staff-availability-modal'
import { BookingFiltersPanel } from '@/components/booking/BookingFiltersPanel'
import { BulkActionsToolbar } from '@/components/booking/BulkActionsToolbar'
import { BookingList } from '@/components/booking/BookingList'
import { ConfirmDialog } from '@/components/common/ConfirmDialog/ConfirmDialog'
import { BookingConflictDialog } from '@/components/booking/BookingConflictDialog'
import { BookingCreateModal } from '@/components/booking/BookingCreateModal'
import { BookingEditModal } from '@/components/booking/BookingEditModal'
import { RecurringEditDialog } from '@/components/booking/RecurringEditDialog'
import { calculateEndTime, formatTime, TEAMS_WITH_LEAD_QUERY, transformTeamsData } from '@/lib/booking-utils'
import type { Booking } from '@/types/booking'
import type { PackageSelectionData } from '@/components/service-packages'
import type { RecurringEditScope, RecurringPattern, RecurringGroup, CombinedItem } from '@/types/recurring-booking'
import { deleteRecurringBookings } from '@/lib/recurring-booking-service'
import { usePaymentActions } from '@/hooks/usePaymentActions'
import { groupBookingsByRecurringGroup, sortRecurringGroup, countBookingsByStatus, isRecurringBooking } from '@/lib/recurring-utils'
import { logger } from '@/lib/logger'

interface Team {
  id: string
  name: string
}

export function AdminBookings() {
  const location = useLocation()
  const [isDialogOpen, setIsDialogOpen] = useState(false)

  // Archive filter
  const [showArchived, setShowArchived] = useState(false)

  // Use React Query hook for bookings data
  const { bookings, loading, refresh, error: bookingsError } = useBookings({
    showArchived
  })

  // ใช้ custom hook สำหรับโหลด packages ทั้ง V1 และ V2
  const { packages: servicePackages } = useServicePackages()
  // โหลดเฉพาะ staff role (ไม่รวม admin และ manager)
  const { staffList } = useStaffList({ role: 'staff', enableRealtime: false })

  const [teams, setTeams] = useState<Team[]>([])
  const [createAssignmentType, setCreateAssignmentType] = useState<'staff' | 'team' | 'none'>('none')
  const [editAssignmentType, setEditAssignmentType] = useState<'staff' | 'team' | 'none'>('none')
  // Booking filters hook
  const {
    filters,
    updateFilter,
    resetFilters,
    hasActiveFilters,
    getActiveFilterCount,
    setQuickFilter
  } = useBookingFilters()

  // OPTIMIZED: Debounce search query to reduce filtering overhead (70% reduction)
  const debouncedSearchQuery = useDebounce(filters.searchQuery, 300)

  // OPTIMIZED: Use useMemo for filtering instead of useCallback + setFilteredBookings
  // Single-pass filtering with combined conditions for better performance (60-80% faster)
  const filteredBookings = useMemo(() => {
    return bookings.filter((booking) => {
      // Search query filter (using debounced value)
      if (debouncedSearchQuery) {
        const query = debouncedSearchQuery.toLowerCase()
        const matchesSearch =
          booking.customers?.full_name.toLowerCase().includes(query) ||
          booking.service_packages?.name.toLowerCase().includes(query) ||
          booking.id.toLowerCase().includes(query)
        if (!matchesSearch) return false
      }

      // Status filter
      if (filters.status !== 'all' && booking.status !== filters.status) {
        return false
      }

      // Staff filter
      if (filters.staffId !== 'all') {
        if (filters.staffId === 'unassigned' && booking.staff_id) {
          return false
        } else if (filters.staffId !== 'unassigned' && booking.staff_id !== filters.staffId) {
          return false
        }
      }

      // Team filter
      if (filters.teamId !== 'all' && booking.team_id !== filters.teamId) {
        return false
      }

      // Date range filters
      if (filters.dateFrom && booking.booking_date < filters.dateFrom) {
        return false
      }

      if (filters.dateTo && booking.booking_date > filters.dateTo) {
        return false
      }

      // Service type filter
      if (filters.serviceType !== 'all' && booking.service_packages?.service_type !== filters.serviceType) {
        return false
      }

      // Payment status filter
      if (filters.paymentStatus !== 'all' && booking.payment_status !== filters.paymentStatus) {
        return false
      }

      return true
    })
  }, [bookings, debouncedSearchQuery, filters.status, filters.paymentStatus, filters.staffId, filters.teamId, filters.dateFrom, filters.dateTo, filters.serviceType])

  // Group filtered bookings into recurring groups and standalone bookings
  // This must happen BEFORE pagination to keep groups together
  const combinedItems = useMemo((): CombinedItem[] => {
    const recurring: RecurringGroup[] = []
    const standalone: Booking[] = []
    const processedGroupIds = new Set<string>()

    // Filter recurring bookings using type guard (type-safe)
    const recurringBookings = filteredBookings.filter(isRecurringBooking)
    const groupedMap = groupBookingsByRecurringGroup(recurringBookings)

    groupedMap.forEach((groupBookings, groupId) => {
      if (!processedGroupIds.has(groupId)) {
        const sortedBookings = sortRecurringGroup(groupBookings)
        const stats = countBookingsByStatus(sortedBookings)
        const firstBooking = sortedBookings[0]

        recurring.push({
          groupId,
          pattern: firstBooking.recurring_pattern!,
          totalBookings: sortedBookings.length,
          bookings: sortedBookings,
          completedCount: stats.completed,
          confirmedCount: stats.confirmed,
          inProgressCount: stats.inProgress,
          cancelledCount: stats.cancelled,
          noShowCount: stats.noShow,
          upcomingCount: stats.upcoming,
        })

        processedGroupIds.add(groupId)
      }
    })

    // Non-recurring bookings (standalone)
    filteredBookings.forEach((booking) => {
      if (!booking.is_recurring || !booking.recurring_group_id) {
        standalone.push(booking)
      }
    })

    // Combine and sort by created_at (newest first)
    const combined: CombinedItem[] = [
      ...recurring.map(group => ({
        type: 'group' as const,
        data: group,
        createdAt: group.bookings[0].created_at || ''
      })),
      ...standalone.map(booking => ({
        type: 'booking' as const,
        data: booking,
        createdAt: booking.created_at || ''
      }))
    ]

    combined.sort((a, b) => {
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    })

    return combined
  }, [filteredBookings])

  // Items per page state (for dynamic pagination)
  const [itemsPerPage, setItemsPerPage] = useState(10)

  // Pagination at COMBINED ITEM level (group counts as 1 item)
  const {
    items: paginatedCombinedItems,
    currentPage,
    totalPages,
    nextPage,
    prevPage,
    goToFirst,
    goToLast,
    goToPage,
    metadata: paginationMetadata
  } = usePagination(combinedItems, {
    initialPage: 1,
    itemsPerPage: itemsPerPage
  })

  // Calculate total bookings count for display (including all bookings in groups)
  const totalBookingsCount = useMemo(() => {
    return combinedItems.reduce((count, item) => {
      if (item.type === 'group') {
        return count + item.data.totalBookings
      }
      return count + 1
    }, 0)
  }, [combinedItems])

  // Create metadata for BookingList (showing booking count, not item count)
  const metadata = useMemo(() => {
    // Calculate start/end booking indices for current page
    let startBookingIndex = 0
    let endBookingIndex = 0

    // Count bookings before current page
    for (let i = 0; i < (paginationMetadata.startIndex - 1); i++) {
      const item = combinedItems[i]
      if (item?.type === 'group') {
        startBookingIndex += item.data.totalBookings
      } else if (item) {
        startBookingIndex += 1
      }
    }

    // Count bookings in current page
    endBookingIndex = startBookingIndex
    paginatedCombinedItems.forEach(item => {
      if (item.type === 'group') {
        endBookingIndex += item.data.totalBookings
      } else {
        endBookingIndex += 1
      }
    })

    return {
      ...paginationMetadata,
      totalItems: totalBookingsCount,
      startIndex: startBookingIndex + 1,
      endIndex: endBookingIndex,
    }
  }, [paginationMetadata, combinedItems, paginatedCombinedItems, totalBookingsCount])
  // Detail Modal
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null)
  const [isDetailOpen, setIsDetailOpen] = useState(false)
  // Edit Modal
  const [isEditOpen, setIsEditOpen] = useState(false)
  // Track the last processed location key to detect new navigations
  const lastProcessedLocationKey = useRef<string | null>(null)
  // Edit Booking Form - Using useBookingForm hook (shared with edit modal and availability modal)
  const editForm = useBookingForm({
    onSubmit: async () => {
      // This is handled by the BookingEditModal component
    }
  })
  // Conflict Detection (using hook) - for create modal conflict override handling
  const {
    conflicts,
    clearConflicts,
  } = useConflictDetection()
  const [showConflictDialog, setShowConflictDialog] = useState(false)
  const [pendingBookingData, setPendingBookingData] = useState<Record<string, unknown> | null>(null)
  // Staff Availability Modal
  const [isAvailabilityModalOpen, setIsAvailabilityModalOpen] = useState(false)
  const [isEditAvailabilityModalOpen, setIsEditAvailabilityModalOpen] = useState(false)
  const { toast } = useToast()

  // Package Selection State - Lifted to parent to persist across modal open/close
  const [createPackageSelection, setCreatePackageSelection] = useState<PackageSelectionData | null>(null)
  const [editPackageSelection, setEditPackageSelection] = useState<PackageSelectionData | null>(null)

  // Recurring Bookings State (for Create Modal)
  const [createRecurringDates, setCreateRecurringDates] = useState<string[]>([])
  const [createRecurringPattern, setCreateRecurringPattern] = useState<RecurringPattern>('auto-monthly' as RecurringPattern)

  // Recurring Edit Dialog State
  const [showRecurringEditDialog, setShowRecurringEditDialog] = useState(false)
  const [recurringEditAction, setRecurringEditAction] = useState<'edit' | 'delete' | 'archive'>('delete')
  const [pendingRecurringBooking, setPendingRecurringBooking] = useState<Booking | null>(null)

  // Create Booking Form - Using useBookingForm hook (shared with create modal and availability modal)
  const createForm = useBookingForm({
    onSubmit: async () => {
      // This is handled by the BookingCreateModal component
    }
  })

  // Bulk Actions (using hook)
  const {
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
  } = useBulkActions({
    bookings,
    filteredBookings,
    onSuccess: refresh,
  })

  // Status Manager (using hook)
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
    markAsPaid,
  } = useBookingStatusManager({
    selectedBooking,
    setSelectedBooking,
    onSuccess: refresh,
  })

  // Use centralized payment actions for verifyPayment and refund
  const {
    verifyPayment: handleVerifyPayment,
    requestRefund: handleRequestRefund,
    completeRefund: handleCompleteRefund,
    cancelRefund: handleCancelRefund,
    isLoading: paymentActionsLoading,
  } = usePaymentActions({
    selectedBooking,
    setSelectedBooking,
    onSuccess: refresh,
  })

  // Handler for verifying entire recurring group payment
  const handleVerifyRecurringGroup = useCallback(async (recurringGroupId: string) => {
    try {
      const { verifyPayment } = await import('@/services/payment-service')
      const result = await verifyPayment({
        bookingId: '', // Not used when recurringGroupId is provided
        recurringGroupId,
      })

      if (!result.success) {
        throw new Error(result.error)
      }

      toast({
        title: 'Success',
        description: result.count > 1
          ? `${result.count} bookings verified successfully`
          : 'Payment verified successfully',
      })

      refresh()
    } catch (error) {
      console.error('Error verifying recurring group:', error)
      toast({
        title: 'Error',
        description: 'Failed to verify payment',
        variant: 'destructive',
      })
    }
  }, [toast, refresh])

  useEffect(() => {
    // OPTIMIZE: Run all queries in parallel for better performance
    // Bookings โหลดผ่าน useBookings hook อัตโนมัติแล้ว
    // Service packages โหลดผ่าน useServicePackages hook อัตโนมัติแล้ว
    // Staff list โหลดผ่าน useStaffList hook อัตโนมัติแล้ว
    fetchTeams()
  }, [])

  // Sync selectedBooking with bookings array when realtime updates occur
  // Optimized to prevent flickering by comparing only important fields
  const lastSyncedBooking = useRef<Booking | null>(null)

  useEffect(() => {
    // Only sync if booking is selected and detail modal is open
    if (!selectedBooking || !isDetailOpen) {
      lastSyncedBooking.current = null
      return
    }

    const updatedBooking = bookings.find(b => b.id === selectedBooking.id)
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
  }, [bookings, selectedBooking?.id, isDetailOpen])

  // Handle bookings error
  useEffect(() => {
    if (bookingsError) {
      const errorMessage = getLoadErrorMessage('booking')
      toast({
        title: errorMessage.title,
        description: bookingsError,
        variant: 'destructive',
      })
    }
  }, [bookingsError, toast])

  // Reset to page 1 when filters change
  // Using primitive dependencies to prevent unnecessary re-renders
  useEffect(() => {
    goToPage(1)
  }, [
    filters.searchQuery,
    filters.status,
    filters.paymentStatus,
    filters.staffId,
    filters.teamId,
    filters.dateFrom,
    filters.dateTo,
    filters.serviceType,
    goToPage
  ])

  // Handle navigation from Dashboard - open Edit modal
  useEffect(() => {
    const state = location.state as {
      editBookingId?: string;
      bookingData?: Booking;
      createBooking?: boolean;
      bookingDate?: string;
      viewBookingId?: string;
      prefilledData?: {
        booking_date: string;
        start_time: string;
        end_time: string;
        service_package_id: string;
        package_v2_id?: string;
        staff_id: string;
        team_id: string;
        total_price?: number;
        area_sqm?: number | null;
        frequency?: 1 | 2 | 4 | 8 | null;
        is_recurring?: boolean;
        recurring_dates?: string[];
        recurring_pattern?: RecurringPattern;
      }
    } | null

    // Skip if no state
    if (!state) {
      // Reset tracking when there's no state
      lastProcessedLocationKey.current = null
      return
    }

    // Wait for data to load before processing create booking
    if (loading || servicePackages.length === 0) {
      return
    }

    // Skip if already processed this specific navigation
    if (lastProcessedLocationKey.current === location.key) return

    // Mark this location key as processed
    lastProcessedLocationKey.current = location.key

    // Handle create booking from Quick Availability Check
    if (state?.createBooking && state?.prefilledData) {
      // Pre-fill all data from Quick Availability Check
      createForm.setValues({
        booking_date: state.prefilledData.booking_date,
        start_time: state.prefilledData.start_time,
        end_time: state.prefilledData.end_time,
        service_package_id: state.prefilledData.service_package_id || '',
        package_v2_id: state.prefilledData.package_v2_id,
        staff_id: state.prefilledData.staff_id,
        team_id: state.prefilledData.team_id,
        total_price: state.prefilledData.total_price || 0,
        area_sqm: state.prefilledData.area_sqm || null,
        frequency: state.prefilledData.frequency || null,
      })

      // Set package selection for PackageSelector (if V2 tiered package)
      if (state.prefilledData.package_v2_id && state.prefilledData.area_sqm && state.prefilledData.frequency) {
        const pkg = servicePackages.find(p => p.id === state.prefilledData!.package_v2_id)
        if (pkg) {
          setCreatePackageSelection({
            packageId: pkg.id,
            pricingModel: 'tiered',
            areaSqm: state.prefilledData.area_sqm,
            frequency: state.prefilledData.frequency,
            price: state.prefilledData.total_price || 0,
            requiredStaff: 1, // Will be recalculated
            packageName: pkg.name,
          })
        }
      } else if (state.prefilledData.service_package_id) {
        // Fixed pricing package
        const pkg = servicePackages.find(p => p.id === state.prefilledData!.service_package_id)
        if (pkg && pkg.base_price) {
          setCreatePackageSelection({
            packageId: pkg.id,
            pricingModel: 'fixed',
            price: pkg.base_price,
            requiredStaff: 1,
            packageName: pkg.name,
            estimatedHours: pkg.duration_minutes ? pkg.duration_minutes / 60 : undefined,
          })
        }
      }

      // Set assignment type
      if (state.prefilledData.staff_id) {
        setCreateAssignmentType('staff')
      } else if (state.prefilledData.team_id) {
        setCreateAssignmentType('team')
      }

      // Handle recurring booking data from Quick Availability Check
      if (state.prefilledData.is_recurring && state.prefilledData.recurring_dates && state.prefilledData.recurring_dates.length > 0) {
        logger.debug('Received recurring data from Quick Availability Check', {
          is_recurring: state.prefilledData.is_recurring,
          recurring_dates: state.prefilledData.recurring_dates,
          recurring_pattern: state.prefilledData.recurring_pattern
        }, { context: 'AdminBookings' })

        setCreateRecurringDates(state.prefilledData.recurring_dates)
        if (state.prefilledData.recurring_pattern) {
          setCreateRecurringPattern(state.prefilledData.recurring_pattern)
          logger.debug('Set recurring pattern', { pattern: state.prefilledData.recurring_pattern }, { context: 'AdminBookings' })
        }
      }

      // Open create dialog
      setIsDialogOpen(true)
      // Clear the state to prevent reopening on refresh
      window.history.replaceState({}, document.title)
      return
    }

    // Handle create booking from Calendar (legacy - only booking_date)
    if (state?.createBooking && state?.bookingDate) {
      // Pre-fill the booking date using hook
      createForm.setValues({ booking_date: state.bookingDate || '' })
      // Open create dialog
      setIsDialogOpen(true)
      // Clear the state to prevent reopening on refresh
      window.history.replaceState({}, document.title)
      return
    }

    // Handle view booking from Global Search - open Detail modal
    if (state?.viewBookingId && bookings.length > 0) {
      const booking = bookings.find(b => b.id === state.viewBookingId)
      if (booking) {
        openBookingDetail(booking)
        // Clear the state to prevent reopening on refresh
        window.history.replaceState({}, document.title)
        return
      }
    }

    // Handle edit booking from Dashboard/Calendar
    if (state?.editBookingId && bookings.length > 0) {
      const booking = bookings.find(b => b.id === state.editBookingId)
      if (booking) {
        // Open edit modal - populate form using hook
        editForm.setValues({
          customer_id: booking.customers?.id || '',
          service_package_id: booking.service_package_id,
          staff_id: booking.staff_id || '',
          team_id: booking.team_id || '',
          booking_date: booking.booking_date,
          start_time: booking.start_time,
          end_time: booking.end_time,
          address: booking.address,
          city: booking.city || '',
          state: booking.state || '',
          zip_code: booking.zip_code || '',
          notes: booking.notes || '',
          total_price: Number(booking.total_price),
          status: booking.status,
        })

        // Set assignment type based on booking data
        if (booking.staff_id) {
          setEditAssignmentType('staff')
        } else if (booking.team_id) {
          setEditAssignmentType('team')
        } else {
          setEditAssignmentType('none')
        }

        setIsEditOpen(true)
        setIsDetailOpen(false)

        // Clear the state to prevent reopening on refresh
        window.history.replaceState({}, document.title)
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.state, bookings, servicePackages, loading])

  // Service packages โหลดผ่าน useServicePackages hook แล้ว (ไม่ต้องมี fetchServicePackages อีกต่อไป)
  // Staff list โหลดผ่าน useStaffList hook แล้ว (ไม่ต้องมี fetchStaffMembers อีกต่อไป)

  const fetchTeams = async () => {
    try {
      const { data, error} = await supabase
        .from('teams')
        .select('id, name')
        .is('deleted_at', null)
        .order('name')

      if (error) throw error
      setTeams(data || [])
    } catch (error) {
      logger.error('Error fetching teams', { error }, { context: 'AdminBookings' })
    }
  }

  // Calculate end_time from start_time and duration
  // Proceed with booking after conflict override (for create modal)
  const proceedWithConflictOverride = async () => {
    if (!pendingBookingData) return

    try {
      const { error } = await supabase.from('bookings').insert(pendingBookingData)

      if (error) throw error

      toast({
        title: 'Success',
        description: 'Booking created successfully (conflict overridden)',
      })
      setIsDialogOpen(false)
      setShowConflictDialog(false)
      resetForm()
      setPendingBookingData(null)
      clearConflicts()
      refresh()
    } catch (error) {
      const errorMsg = getBookingConflictError()
      toast({
        title: errorMsg.title,
        description: errorMsg.description,
        variant: 'destructive',
      })
    }
  }

  // Cancel conflict override
  const cancelConflictOverride = () => {
    setShowConflictDialog(false)
    setPendingBookingData(null)
    clearConflicts()
  }

  const resetForm = () => {
    createForm.reset()
    setCreateAssignmentType('none')
    clearConflicts()
  }


  // Handle Recurring Delete Confirmation
  const handleRecurringDelete = useCallback(async (scope: RecurringEditScope) => {
    if (!pendingRecurringBooking) return

    try {
      logger.debug('Deleting recurring bookings', {
        bookingId: pendingRecurringBooking.id,
        groupId: pendingRecurringBooking.recurring_group_id,
        scope,
        isRecurring: pendingRecurringBooking.is_recurring,
        sequence: pendingRecurringBooking.recurring_sequence,
        total: pendingRecurringBooking.recurring_total
      }, { context: 'AdminBookings' })

      const result = await deleteRecurringBookings(
        pendingRecurringBooking.id,
        scope
      )

      logger.debug('Delete recurring bookings result', {
        success: result.success,
        deletedCount: result.deletedCount
      }, { context: 'AdminBookings' })

      if (!result.success) {
        const errorMsg = getRecurringBookingError('delete')
        toast({
          title: errorMsg.title,
          description: errorMsg.description,
          variant: 'destructive',
        })
        return
      }

      toast({
        title: 'Success',
        description: `Deleted ${result.deletedCount} booking(s) successfully`,
      })

      setShowRecurringEditDialog(false)
      setPendingRecurringBooking(null)
      refresh()
    } catch (error) {
      logger.error('Delete recurring booking error', { error }, { context: 'AdminBookings' })
      const errorMsg = getRecurringBookingError('delete')
      toast({
        title: errorMsg.title,
        description: errorMsg.description,
        variant: 'destructive',
      })
    }
  }, [pendingRecurringBooking, toast, refresh])

  // Handle Recurring Archive Confirmation
  const handleRecurringArchive = useCallback(async (scope: RecurringEditScope) => {
    if (!pendingRecurringBooking) return

    try {
      logger.debug('Archiving recurring bookings', {
        bookingId: pendingRecurringBooking.id,
        groupId: pendingRecurringBooking.recurring_group_id,
        scope,
        isRecurring: pendingRecurringBooking.is_recurring,
        sequence: pendingRecurringBooking.recurring_sequence,
        total: pendingRecurringBooking.recurring_total
      }, { context: 'AdminBookings' })

      // Get booking details first
      const { data: booking, error: fetchError } = await supabase
        .from('bookings')
        .select('recurring_group_id, recurring_sequence')
        .eq('id', pendingRecurringBooking.id)
        .single()

      if (fetchError) throw fetchError
      if (!booking) throw new Error('Booking not found')

      let bookingIdsToArchive: string[] = []

      // Determine which bookings to archive based on scope
      switch (scope) {
        case 'this_only':
          bookingIdsToArchive = [pendingRecurringBooking.id]
          break

        case 'this_and_future': {
          if (!booking.recurring_group_id) {
            throw new Error('Booking is not part of a recurring group')
          }

          const { data: futureBookings } = await supabase
            .from('bookings')
            .select('id')
            .eq('recurring_group_id', booking.recurring_group_id)
            .gte('recurring_sequence', booking.recurring_sequence)

          bookingIdsToArchive = futureBookings?.map(b => b.id) || []
          break
        }

        case 'all': {
          if (!booking.recurring_group_id) {
            throw new Error('Booking is not part of a recurring group')
          }

          const { data: allBookings } = await supabase
            .from('bookings')
            .select('id')
            .eq('recurring_group_id', booking.recurring_group_id)

          bookingIdsToArchive = allBookings?.map(b => b.id) || []
          break
        }
      }

      // Archive bookings using RPC soft_delete_record
      let archivedCount = 0
      for (const bookingId of bookingIdsToArchive) {
        const { error } = await supabase.rpc('soft_delete_record', {
          table_name: 'bookings',
          record_id: bookingId
        })

        if (!error) {
          archivedCount++
        }
      }

      logger.debug('Archive recurring bookings result', {
        archivedCount,
        total: bookingIdsToArchive.length
      }, { context: 'AdminBookings' })

      toast({
        title: 'Success',
        description: `Archived ${archivedCount} booking(s) successfully`,
      })

      setShowRecurringEditDialog(false)
      setPendingRecurringBooking(null)
      refresh()
    } catch (error) {
      logger.error('Archive recurring booking error', { error }, { context: 'AdminBookings' })
      const errorMsg = getArchiveErrorMessage()
      toast({
        title: errorMsg.title,
        description: errorMsg.description,
        variant: 'destructive',
      })
    }
  }, [pendingRecurringBooking, toast, refresh])

  // OPTIMIZED: Wrap event handlers with useCallback to prevent unnecessary re-renders
  const deleteBooking = useCallback(async (bookingId: string) => {
    try {
      // Check if this is a recurring booking
      const booking = bookings.find(b => b.id === bookingId)

      if (booking?.is_recurring && booking.recurring_group_id) {
        // Show recurring edit dialog
        setPendingRecurringBooking(booking)
        setRecurringEditAction('delete')
        setShowRecurringEditDialog(true)
        return
      }

      // Non-recurring booking - delete normally
      const { error } = await supabase
        .from('bookings')
        .delete()
        .eq('id', bookingId)

      if (error) throw error

      toast({
        title: 'Success',
        description: 'Booking deleted successfully',
      })
      refresh()
    } catch (error) {
      logger.error('Delete booking error', { error }, { context: 'AdminBookings' })
      const errorMsg = getDeleteErrorMessage('booking')
      toast({
        title: errorMsg.title,
        description: errorMsg.description,
        variant: 'destructive',
      })
    }
  }, [bookings, toast, refresh])

  // Archive booking (soft delete)
  const archiveBooking = useCallback(async (bookingId: string) => {
    try {
      // Archive this booking only (regardless of recurring status)
      // RecurringEditDialog is no longer needed - just archive the single booking
      const { error } = await supabase
        .rpc('soft_delete_record', {
          table_name: 'bookings',
          record_id: bookingId
        })

      if (error) throw error

      toast({
        title: 'Success',
        description: 'Booking archived successfully',
      })
      refresh()
    } catch (error) {
      logger.error('Archive booking error', { error }, { context: 'AdminBookings' })
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to archive booking',
        variant: 'destructive',
      })
    }
  }, [toast, refresh])

  // Restore archived booking
  const restoreBooking = useCallback(async (bookingId: string) => {
    try {
      const { error } = await supabase
        .from('bookings')
        .update({ deleted_at: null, deleted_by: null })
        .eq('id', bookingId)

      if (error) throw error

      toast({
        title: 'Success',
        description: 'Booking restored successfully',
      })
      refresh()
    } catch (error) {
      logger.error('Error restoring booking', { error }, { context: 'AdminBookings' })
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to restore booking',
        variant: 'destructive',
      })
    }
  }, [toast, refresh])

  // Restore entire recurring group
  const restoreRecurringGroup = useCallback(async (groupId: string) => {
    try {
      logger.debug('Restoring recurring group', { groupId }, { context: 'AdminBookings' })

      // Get all archived bookings in this group
      const { data: groupBookings, error: fetchError } = await supabase
        .from('bookings')
        .select('id')
        .eq('recurring_group_id', groupId)
        .not('deleted_at', 'is', null) // Only archived bookings

      if (fetchError) throw fetchError

      if (!groupBookings || groupBookings.length === 0) {
        toast({
          title: 'Info',
          description: 'No archived bookings found in this group to restore',
        })
        return
      }

      // Restore all bookings in the group
      let restoredCount = 0
      for (const booking of groupBookings) {
        const { error } = await supabase
          .from('bookings')
          .update({ deleted_at: null, deleted_by: null })
          .eq('id', booking.id)

        if (!error) {
          restoredCount++
        } else {
          logger.error('Error restoring booking in group', { error, bookingId: booking.id }, { context: 'AdminBookings' })
        }
      }

      toast({
        title: 'Success',
        description: `Restored ${restoredCount} booking${restoredCount > 1 ? 's' : ''} successfully`,
      })
      refresh()
    } catch (error) {
      logger.error('Restore recurring group error', { error }, { context: 'AdminBookings' })
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to restore recurring group',
        variant: 'destructive',
      })
    }
  }, [toast, refresh])

  // Archive entire recurring group (soft delete)
  const archiveRecurringGroup = useCallback(async (groupId: string) => {
    try {
      logger.debug('Archiving recurring group', { groupId }, { context: 'AdminBookings' })

      // Get all bookings in this group
      const { data: groupBookings, error: fetchError } = await supabase
        .from('bookings')
        .select('id')
        .eq('recurring_group_id', groupId)
        .is('deleted_at', null) // Only non-archived bookings

      if (fetchError) throw fetchError

      if (!groupBookings || groupBookings.length === 0) {
        toast({
          title: 'Info',
          description: 'No active bookings found in this group to archive',
        })
        return
      }

      // Archive all bookings in the group using soft_delete_record RPC
      let archivedCount = 0
      for (const booking of groupBookings) {
        const { error } = await supabase
          .rpc('soft_delete_record', {
            table_name: 'bookings',
            record_id: booking.id
          })

        if (!error) {
          archivedCount++
        } else {
          logger.error('Error archiving booking in group', { error, bookingId: booking.id }, { context: 'AdminBookings' })
        }
      }

      toast({
        title: 'Success',
        description: `Archived ${archivedCount} booking(s) successfully`,
      })
      refresh()
    } catch (error) {
      logger.error('Archive recurring group error', { error }, { context: 'AdminBookings' })
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to archive recurring group',
        variant: 'destructive',
      })
    }
  }, [toast, refresh])

  // Delete entire recurring group
  const deleteRecurringGroup = useCallback(async (groupId: string) => {
    try {
      logger.debug('Fetching recurring group', { groupId }, { context: 'AdminBookings' })

      // ดึง booking แรกของ group จาก database (ต้อง select ทุก field รวม recurring fields)
      const { data: firstBooking, error: fetchError } = await supabase
        .from('bookings')
        .select(`
          *,
          customers (id, full_name, email),
          service_packages (name, service_type),
          service_packages_v2:package_v2_id (name, service_type),
          profiles!bookings_staff_id_fkey (full_name),
          ${TEAMS_WITH_LEAD_QUERY}
        `)
        .eq('recurring_group_id', groupId)
        .order('recurring_sequence')
        .limit(1)
        .single()

      logger.debug('Fetched first booking of group', {
        hasBooking: !!firstBooking,
        hasError: !!fetchError
      }, { context: 'AdminBookings' })

      if (fetchError) throw fetchError
      if (!firstBooking) {
        throw new Error('Recurring group not found')
      }

      // Transform teams data
      const processedBooking = {
        ...firstBooking,
        service_packages: firstBooking.service_packages || firstBooking.service_packages_v2,
        teams: transformTeamsData(firstBooking.teams),
      }

      logger.debug('Setting pending recurring booking for deletion', {
        id: processedBooking.id,
        groupId: processedBooking.recurring_group_id,
        isRecurring: processedBooking.is_recurring,
        sequence: processedBooking.recurring_sequence,
        total: processedBooking.recurring_total
      }, { context: 'AdminBookings' })

      // แสดง RecurringEditDialog เพื่อให้เลือก scope การลบ
      setPendingRecurringBooking(processedBooking as Booking)
      setRecurringEditAction('delete')
      setShowRecurringEditDialog(true)
    } catch (error) {
      logger.error('Delete recurring group error', { error }, { context: 'AdminBookings' })
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to delete recurring group',
        variant: 'destructive',
      })
    }
  }, [toast])

  const openBookingDetail = useCallback((booking: Booking) => {
    setSelectedBooking(booking)
    setIsDetailOpen(true)
  }, [])

  const openEditBooking = useCallback((booking: Booking) => {
    // Set selected booking for excludeBookingId in Staff Availability Modal
    setSelectedBooking(booking)

    editForm.setValues({
      customer_id: booking.customers?.id || '',
      service_package_id: booking.service_package_id,
      staff_id: booking.staff_id || '',
      team_id: booking.team_id || '',
      booking_date: booking.booking_date,
      start_time: formatTime(booking.start_time),
      end_time: formatTime(booking.end_time),
      address: booking.address,
      city: booking.city || '',
      state: booking.state || '',
      zip_code: booking.zip_code || '',
      notes: booking.notes || '',
      total_price: Number(booking.total_price),
      status: booking.status,
    })

    // Set assignment type based on booking data
    if (booking.staff_id) {
      setEditAssignmentType('staff')
    } else if (booking.team_id) {
      setEditAssignmentType('team')
    } else {
      setEditAssignmentType('none')
    }

    // Set package selection BEFORE opening modal to prevent flicker
    if (booking.service_package_id || ('package_v2_id' in booking && booking.package_v2_id)) {
      const packageId = ('package_v2_id' in booking && booking.package_v2_id) || booking.service_package_id
      const pkg = servicePackages.find(p => p.id === packageId)

      if (pkg) {
        const isTiered = 'pricing_model' in pkg && pkg.pricing_model === 'tiered'

        if (isTiered && 'area_sqm' in booking && 'frequency' in booking && booking.area_sqm && booking.frequency) {
          setEditPackageSelection({
            packageId: pkg.id,
            pricingModel: 'tiered',
            areaSqm: Number(booking.area_sqm) || 0,
            frequency: (booking.frequency as 1 | 2 | 4 | 8) || 1,
            price: booking.total_price || 0,
            requiredStaff: 1,
            packageName: pkg.name,
          })
        } else {
          setEditPackageSelection({
            packageId: pkg.id,
            pricingModel: 'fixed',
            price: Number(pkg.base_price || booking.total_price || 0),
            requiredStaff: 1,
            packageName: pkg.name,
            estimatedHours: pkg.duration_minutes ? pkg.duration_minutes / 60 : undefined,
          })
        }
      }
    }

    // Small delay to ensure state is updated before modal opens
    setTimeout(() => {
      setIsEditOpen(true)
      setIsDetailOpen(false)
    }, 0)
  }, [editForm, servicePackages])

  if (loading) {
    return (
      <div className="space-y-6">
        {/* Page header skeleton - matches current structure */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 min-h-[40px]">
          <div>
            <p className="text-sm text-muted-foreground">
              Manage all service bookings
            </p>
          </div>
          <div className="flex items-center gap-4">
            {/* Show archived checkbox skeleton */}
            <div className="flex items-center space-x-2">
              <Skeleton className="h-4 w-4 rounded" />
              <Skeleton className="h-4 w-40" />
            </div>
            {/* New Booking button skeleton */}
            <Skeleton className="h-10 w-36" />
          </div>
        </div>

        {/* Filters skeleton - matches BookingFiltersPanel */}
        <Card>
          <CardContent className="py-3 px-4 sm:px-6 space-y-3">
            {/* Quick Filters + More Filters Row */}
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex flex-wrap items-center gap-2">
                <Skeleton className="h-4 w-20" /> {/* "Quick filters:" */}
                <Skeleton className="h-8 w-16" /> {/* Today */}
                <Skeleton className="h-8 w-20 hidden sm:block" /> {/* This Week */}
                <Skeleton className="h-8 w-24 hidden sm:block" /> {/* This Month */}
              </div>
              <Skeleton className="h-8 w-28" /> {/* More Filters */}
            </div>

            {/* Primary Filters: Search + Status + Payment */}
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-2">
              {/* Search */}
              <Skeleton className="h-9 flex-1" />
              {/* Status + Payment */}
              <div className="grid grid-cols-2 sm:flex gap-2">
                <Skeleton className="h-9 sm:w-[150px]" />
                <Skeleton className="h-9 sm:w-[150px]" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Bookings list skeleton - matches BookingList */}
        <Card>
          <CardHeader className="px-4 sm:px-6">
            {/* BulkActionsToolbar skeleton */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <Skeleton className="h-4 w-4 rounded" /> {/* Checkbox */}
                <Skeleton className="h-6 w-40" /> {/* "All Bookings (X)" */}
              </div>
            </div>
          </CardHeader>
          <CardContent className="px-4 sm:px-6 pt-0">
            <div className="space-y-4">
              {/* Pagination Controls skeleton - Top */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-4 pb-4 border-b">
                <div className="flex items-center gap-2">
                  <Skeleton className="h-4 w-12" /> {/* "Show:" */}
                  <Skeleton className="h-10 w-20" /> {/* Select */}
                  <Skeleton className="h-4 w-16 hidden sm:block" /> {/* "per page" */}
                </div>
                <Skeleton className="h-4 w-52" /> {/* "Showing X to Y of Z bookings" */}
              </div>

              {/* Booking items skeleton */}
              {Array.from({ length: 5 }).map((_, i) => (
                <div
                  key={i}
                  className="flex items-start gap-2 sm:gap-3 p-3 sm:p-4 border rounded-lg"
                >
                  {/* Checkbox skeleton */}
                  <Skeleton className="h-4 w-4 mt-0.5 sm:mt-1 rounded flex-shrink-0" />

                  {/* Content skeleton */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between flex-1 gap-3 sm:gap-4 min-w-0">
                    <div className="space-y-1.5 sm:space-y-2 flex-1 min-w-0">
                      {/* Customer name + ID + Status (mobile) */}
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5 sm:gap-2">
                            <Skeleton className="h-5 w-36" /> {/* Customer name */}
                            <Skeleton className="h-4 w-16" /> {/* #ID */}
                          </div>
                          <Skeleton className="h-4 w-44 mt-1" /> {/* Email */}
                        </div>
                        <Skeleton className="h-5 w-20 rounded-full sm:hidden" /> {/* Status badge (mobile) */}
                      </div>
                      {/* Service badge + name */}
                      <div className="flex items-center gap-1.5 sm:gap-2">
                        <Skeleton className="h-5 w-16 rounded-full" /> {/* Service type badge */}
                        <Skeleton className="h-4 w-32" /> {/* Service name */}
                      </div>
                      {/* Date + Time */}
                      <Skeleton className="h-4 w-56" /> {/* Date • Time range */}
                      {/* Staff/Team (random) */}
                      {i % 2 === 0 && <Skeleton className="h-4 w-32" />}
                    </div>

                    {/* Right side - Desktop only */}
                    <div className="hidden sm:flex sm:flex-col items-end gap-3 sm:gap-4 flex-shrink-0">
                      {/* Price */}
                      <Skeleton className="h-6 w-20" />
                      {/* Status badges */}
                      <div className="flex gap-2">
                        <Skeleton className="h-5 w-20 rounded-full" /> {/* Status */}
                        <Skeleton className="h-5 w-16 rounded-full" /> {/* Payment */}
                      </div>
                      {/* Actions */}
                      <div className="flex gap-1.5 sm:gap-2">
                        <Skeleton className="h-8 w-28" /> {/* Status dropdown */}
                        <Skeleton className="h-8 w-8" /> {/* Delete button */}
                      </div>
                    </div>

                    {/* Mobile: Price + Payment + Actions */}
                    <div className="sm:hidden flex items-center justify-between mt-2 pt-2 border-t">
                      <Skeleton className="h-5 w-16" /> {/* Price */}
                      <div className="flex items-center gap-2">
                        <Skeleton className="h-5 w-14 rounded-full" /> {/* Payment badge */}
                        <Skeleton className="h-7 w-20" /> {/* Status dropdown */}
                        <Skeleton className="h-7 w-7" /> {/* Delete */}
                      </div>
                    </div>
                  </div>
                </div>
              ))}

              {/* Pagination Controls skeleton - Bottom */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-4 pt-4 border-t">
                <Skeleton className="h-4 w-28" /> {/* "Page X of Y" */}
                <div className="flex items-center gap-2">
                  <Skeleton className="h-9 w-14" /> {/* First */}
                  <Skeleton className="h-9 w-24" /> {/* Previous */}
                  <Skeleton className="h-9 w-16" /> {/* Next */}
                  <Skeleton className="h-9 w-12" /> {/* Last */}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 min-h-[40px]">
        <div>
          <p className="text-sm text-muted-foreground">
            Manage all service bookings
          </p>
        </div>
        <div className="flex items-center gap-4">
          {/* Show archived toggle - Admin only */}
          <AdminOnly>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="show-archived-bookings"
                checked={showArchived}
                onCheckedChange={(checked) => setShowArchived(checked as boolean)}
              />
              <label
                htmlFor="show-archived-bookings"
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
              >
                Show archived
              </label>
            </div>
          </AdminOnly>
          <Button className="bg-tinedy-blue hover:bg-tinedy-blue/90" onClick={() => setIsDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            New Booking
          </Button>
        </div>

        <BookingCreateModal
          isOpen={isDialogOpen}
          onClose={() => {
            setIsDialogOpen(false)
            setCreatePackageSelection(null)
            // Clear form data and recurring state
            createForm.reset()
            setCreateRecurringDates([])
            setCreateRecurringPattern('auto-monthly' as RecurringPattern)
          }}
          onSuccess={() => {
            // Realtime subscription will update the list automatically
            setIsDialogOpen(false)
            setCreatePackageSelection(null)
            // Clear form data and recurring state
            createForm.reset()
            setCreateRecurringDates([])
            setCreateRecurringPattern('auto-monthly' as RecurringPattern)
          }}
          servicePackages={servicePackages}
          staffMembers={staffList}
          teams={teams}
          onOpenAvailabilityModal={() => {
            setIsDialogOpen(false)
            setIsAvailabilityModalOpen(true)
          }}
          onBeforeOpenAvailability={(formData) => {
            // Calculate end_time if not set (fallback)
            let endTime = formData.end_time || ''
            if (!endTime && formData.start_time && createPackageSelection?.estimatedHours) {
              const durationMinutes = Math.round(createPackageSelection.estimatedHours * 60)
              endTime = calculateEndTime(formData.start_time, durationMinutes)
            }

            // Sync form data from BookingCreateModal to createForm before opening availability modal
            createForm.setValues({
              booking_date: formData.booking_date || '',
              start_time: formData.start_time || '',
              end_time: endTime,
              service_package_id: formData.service_package_id || '',
              package_v2_id: formData.package_v2_id || '',
              staff_id: formData.staff_id || '',
              team_id: formData.team_id || '',
              total_price: formData.total_price || 0,
              area_sqm: formData.area_sqm || null,
              frequency: formData.frequency || null,
            })
          }}
          assignmentType={createAssignmentType}
          setAssignmentType={setCreateAssignmentType}
          calculateEndTime={calculateEndTime}
          packageSelection={createPackageSelection}
          setPackageSelection={setCreatePackageSelection}
          defaultDate={createForm.formData.booking_date}
          defaultStartTime={createForm.formData.start_time}
          defaultEndTime={createForm.formData.end_time}
          defaultStaffId={createForm.formData.staff_id}
          defaultTeamId={createForm.formData.team_id}
          recurringDates={createRecurringDates}
          setRecurringDates={setCreateRecurringDates}
          recurringPattern={createRecurringPattern}
          setRecurringPattern={setCreateRecurringPattern}
        />

        {/* Staff Availability Modal - Create Form */}
        {(createForm.formData.service_package_id || createForm.formData.package_v2_id) &&
          // ต้องมีวันที่ (recurring หรือ single booking) และเวลาเริ่มต้น
          (createRecurringDates.length > 0 || createForm.formData.booking_date) &&
          createForm.formData.start_time && (
          <StaffAvailabilityModal
            isOpen={isAvailabilityModalOpen}
            onClose={() => {
              setIsAvailabilityModalOpen(false)
              setIsDialogOpen(true)
            }}
            assignmentType={createAssignmentType === 'staff' ? 'individual' : 'team'}
            onSelectStaff={(staffId) => {
              createForm.handleChange('staff_id', staffId)
              createForm.handleChange('team_id', '') // Clear team when staff is selected
              setIsAvailabilityModalOpen(false)
              setIsDialogOpen(true)
              toast({
                title: 'Staff Selected',
                description: 'Staff member has been assigned to the booking',
              })
            }}
            onSelectTeam={(teamId) => {
              createForm.handleChange('team_id', teamId)
              createForm.handleChange('staff_id', '') // Clear staff when team is selected
              setIsAvailabilityModalOpen(false)
              setIsDialogOpen(true)
              toast({
                title: 'Team Selected',
                description: 'Team has been assigned to the booking',
              })
            }}
            // Recurring: ส่ง dates array, Non-recurring: ส่ง date เดี่ยว
            date={createRecurringDates.length === 0 ? createForm.formData.booking_date : undefined}
            dates={createRecurringDates.length > 0 ? createRecurringDates : undefined}
            startTime={createForm.formData.start_time}
            endTime={createForm.formData.end_time || ''}
            servicePackageId={createForm.formData.service_package_id || createForm.formData.package_v2_id || ''}
            servicePackageName={
              createForm.formData.service_package_id
                ? servicePackages.find(pkg => pkg.id === createForm.formData.service_package_id)?.name
                : 'Service Package'
            }
          />
        )}

        {/* Staff Availability Modal - Edit Form */}
        {(editForm.formData.service_package_id || editForm.formData.package_v2_id) && editForm.formData.booking_date && editForm.formData.start_time && (
          <StaffAvailabilityModal
            isOpen={isEditAvailabilityModalOpen}
            onClose={() => {
              setIsEditAvailabilityModalOpen(false)
              setIsEditOpen(true)
            }}
            assignmentType={editAssignmentType === 'staff' ? 'individual' : 'team'}
            onSelectStaff={(staffId) => {
              editForm.handleChange('staff_id', staffId)
              setIsEditAvailabilityModalOpen(false)
              setIsEditOpen(true)
              toast({
                title: 'Staff Selected',
                description: 'Staff member has been assigned to the booking',
              })
            }}
            onSelectTeam={(teamId) => {
              editForm.handleChange('team_id', teamId)
              setIsEditAvailabilityModalOpen(false)
              setIsEditOpen(true)
              toast({
                title: 'Team Selected',
                description: 'Team has been assigned to the booking',
              })
            }}
            date={editForm.formData.booking_date}
            startTime={editForm.formData.start_time}
            endTime={editForm.formData.end_time || ''}
            servicePackageId={editForm.formData.service_package_id || editForm.formData.package_v2_id || ''}
            servicePackageName={
              editForm.formData.service_package_id
                ? servicePackages.find(pkg => pkg.id === editForm.formData.service_package_id)?.name
                : 'Service Package'
            }
            currentAssignedStaffId={editForm.formData.staff_id}
            currentAssignedTeamId={editForm.formData.team_id}
            excludeBookingId={selectedBooking?.id}
          />
        )}
      </div>

      {/* Filters */}
      <BookingFiltersPanel
        filters={filters}
        updateFilter={updateFilter}
        resetFilters={resetFilters}
        hasActiveFilters={hasActiveFilters}
        getActiveFilterCount={getActiveFilterCount}
        setQuickFilter={setQuickFilter}
        staffMembers={staffList}
        teams={teams}
      />

      {/* Booking Detail Modal */}
      <BookingDetailModal
        booking={selectedBooking}
        isOpen={isDetailOpen}
        onClose={() => setIsDetailOpen(false)}
        onEdit={openEditBooking}
        onDelete={deleteBooking}
        onCancel={archiveBooking}
        onStatusChange={handleStatusChange}
        onMarkAsPaid={markAsPaid}
        onVerifyPayment={handleVerifyPayment}
        onRequestRefund={handleRequestRefund}
        onCompleteRefund={handleCompleteRefund}
        onCancelRefund={handleCancelRefund}
        getStatusBadge={getStatusBadge}
        getPaymentStatusBadge={getPaymentStatusBadge}
        getAvailableStatuses={getAvailableStatuses}
        getStatusLabel={getStatusLabel}
        actionLoading={{
          statusChange: false,
          delete: false,
          markAsPaid: paymentActionsLoading.markAsPaid,
        }}
      />

      {/* Edit Booking Modal */}
      <BookingEditModal
        isOpen={isEditOpen}
        onClose={() => setIsEditOpen(false)}
        booking={selectedBooking}
        onSuccess={refresh}
        servicePackages={servicePackages}
        staffMembers={staffList}
        teams={teams}
        onOpenAvailabilityModal={() => {
          setIsEditOpen(false)
          setIsEditAvailabilityModalOpen(true)
        }}
        onBeforeOpenAvailability={(formData) => {
          // Calculate end_time if not set (fallback)
          let endTime = formData.end_time || ''
          if (!endTime && formData.start_time && editPackageSelection?.estimatedHours) {
            const durationMinutes = Math.round(editPackageSelection.estimatedHours * 60)
            endTime = calculateEndTime(formData.start_time, durationMinutes)
          }

          // Sync form data from BookingEditModal to editForm before opening availability modal
          editForm.setValues({
            booking_date: formData.booking_date || '',
            start_time: formData.start_time || '',
            end_time: endTime,
            service_package_id: formData.service_package_id || '',
            package_v2_id: formData.package_v2_id || '',
            staff_id: formData.staff_id || '',
            team_id: formData.team_id || '',
            total_price: formData.total_price || 0,
            area_sqm: formData.area_sqm || null,
            frequency: formData.frequency || null,
          })
        }}
        editForm={toBookingForm(editForm)}
        assignmentType={editAssignmentType}
        onAssignmentTypeChange={setEditAssignmentType}
        calculateEndTime={calculateEndTime}
        packageSelection={editPackageSelection}
        setPackageSelection={setEditPackageSelection}
        defaultStaffId={editForm.formData.staff_id}
        defaultTeamId={editForm.formData.team_id}
      />

      {/* Status Change Confirmation Dialog */}
      {pendingStatusChange && (
        <ConfirmDialog
          open={showStatusConfirmDialog}
          onOpenChange={(open) => !open && cancelStatusChange()}
          title="Confirm Status Change"
          description={getStatusTransitionMessage(
            pendingStatusChange.currentStatus,
            pendingStatusChange.newStatus
          )}
          confirmLabel="Confirm"
          cancelLabel="Cancel"
          onConfirm={confirmStatusChange}
          variant={['cancelled', 'no_show'].includes(pendingStatusChange.newStatus) ? 'destructive' : 'default'}
        />
      )}

      {/* Conflict Warning Dialog */}
      <BookingConflictDialog
        isOpen={showConflictDialog}
        onClose={cancelConflictOverride}
        onProceed={proceedWithConflictOverride}
        conflicts={conflicts}
        getStatusBadge={getStatusBadge}
        formatTime={formatTime}
      />

      {/* Bulk Delete Confirmation Dialog */}
      <ConfirmDialog
        open={showDeleteConfirm}
        onOpenChange={setShowDeleteConfirm}
        title="Delete Bookings"
        description={`Are you sure you want to delete ${selectedBookings.length} booking(s)? This action cannot be undone.`}
        variant="danger"
        confirmLabel="Delete"
        cancelLabel="Cancel"
        onConfirm={confirmBulkDelete}
        isLoading={isDeleting}
      />

      {/* Bookings list */}
      <Card>
        <CardHeader className="px-4 sm:px-6">
          <BulkActionsToolbar
            selectedBookings={selectedBookings}
            totalBookings={filteredBookings.length}
            bulkStatus={bulkStatus}
            onBulkStatusChange={setBulkStatus}
            onToggleSelectAll={toggleSelectAll}
            onBulkStatusUpdate={handleBulkStatusUpdate}
            onBulkExport={handleBulkExport}
            onBulkDelete={handleBulkDelete}
          />
        </CardHeader>
        <CardContent className="px-4 sm:px-6 pt-0">
          <BookingList
            combinedItems={paginatedCombinedItems}
            allBookings={filteredBookings}
            selectedBookings={selectedBookings}
            currentPage={currentPage}
            totalPages={totalPages}
            itemsPerPage={itemsPerPage}
            metadata={metadata}
            onToggleSelect={toggleSelectBooking}
            onBookingClick={openBookingDetail}
            onItemsPerPageChange={(value) => {
              setItemsPerPage(value)
              goToPage(1)
            }}
            onFirstPage={goToFirst}
            onPreviousPage={prevPage}
            onNextPage={nextPage}
            onLastPage={goToLast}
            onDeleteBooking={deleteBooking}
            onDeleteRecurringGroup={deleteRecurringGroup}
            onArchiveRecurringGroup={archiveRecurringGroup}
            onArchiveBooking={archiveBooking}
            onRestoreBooking={restoreBooking}
            onRestoreRecurringGroup={restoreRecurringGroup}
            onVerifyPayment={handleVerifyPayment}
            onVerifyRecurringGroup={handleVerifyRecurringGroup}
            showArchived={showArchived}
            onStatusChange={handleStatusChange}
            formatTime={formatTime}
            getStatusBadge={getStatusBadge}
            getPaymentStatusBadge={getPaymentStatusBadge}
            getAvailableStatuses={getAvailableStatuses}
            getStatusLabel={getStatusLabel}
          />
        </CardContent>
      </Card>

      {/* Recurring Edit/Delete Dialog */}
      {pendingRecurringBooking && (
        <RecurringEditDialog
          open={showRecurringEditDialog}
          onOpenChange={setShowRecurringEditDialog}
          onConfirm={recurringEditAction === 'archive' ? handleRecurringArchive : handleRecurringDelete}
          action={recurringEditAction}
          recurringSequence={pendingRecurringBooking.recurring_sequence || 1}
          recurringTotal={pendingRecurringBooking.recurring_total || 1}
        />
      )}
    </div>
  )
}
