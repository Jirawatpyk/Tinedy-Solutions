/**
 * useBookingsPage Hook
 *
 * Extracted from bookings.tsx to reduce god component complexity.
 * Manages modal/dialog state (via useReducer), navigation-driven state,
 * recurring booking operations, conflict handling, and CRUD actions.
 */

import React, { useReducer, useEffect, useState, useCallback, useRef, useMemo } from 'react'
import { useLocation } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useBookingFilters } from '@/hooks/use-booking-filters'
import { usePagination } from '@/hooks/use-booking-pagination'
import { useConflictDetection } from '@/hooks/use-conflict-detection'
import { useBookingForm, toBookingForm } from '@/hooks/use-booking-form'
import { useBulkActions } from '@/hooks/use-bulk-actions'
import { useBookingStatusManager } from '@/hooks/use-booking-status-manager'
import { useBookings } from '@/hooks/use-bookings'
import { useStaffList } from '@/hooks/use-staff'
import { toast } from 'sonner'
import { useDebounce } from '@/hooks/use-debounce'
import { useServicePackages } from '@/hooks/use-service-packages'
import { usePaymentActions } from '@/hooks/use-payment-actions'
import { formatTime, TEAMS_WITH_LEAD_QUERY, transformTeamsData } from '@/lib/booking-utils'
import { getLoadErrorMessage, getBookingConflictError, getRecurringBookingError, getDeleteErrorMessage, getArchiveErrorMessage } from '@/lib/error-messages'
import { deleteRecurringBookings } from '@/lib/recurring-booking-service'
import { groupBookingsByRecurringGroup, sortRecurringGroup, countBookingsByStatus, isRecurringBooking } from '@/lib/recurring-utils'
import { logger } from '@/lib/logger'
import type { Booking } from '@/types/booking'
import type { PackageSelectionData } from '@/components/service-packages'
import { RecurringPattern as RecurringPatternValues } from '@/types/recurring-booking'
import type { RecurringEditScope, RecurringPattern, RecurringGroup, CombinedItem } from '@/types/recurring-booking'

// --- Types ---

interface Team {
  id: string
  name: string
}

interface BookingsPageState {
  // Archive filter
  showArchived: boolean
  // Create dialog
  isDialogOpen: boolean
  // Assignment types
  createAssignmentType: 'staff' | 'team' | 'none'
  editAssignmentType: 'staff' | 'team' | 'none'
  // Detail modal
  selectedBooking: Booking | null
  isDetailOpen: boolean
  // Edit modal
  isEditOpen: boolean
  // Package selection
  createPackageSelection: PackageSelectionData | null
  editPackageSelection: PackageSelectionData | null
  // Recurring state
  createRecurringDates: string[]
  createRecurringPattern: RecurringPattern
  showRecurringEditDialog: boolean
  recurringEditAction: 'edit' | 'delete' | 'archive'
  pendingRecurringBooking: Booking | null
  // Conflict state
  showConflictDialog: boolean
  pendingBookingData: Record<string, unknown> | null
  // Availability modals
  isAvailabilityModalOpen: boolean
  isEditAvailabilityModalOpen: boolean
  // Items per page
  itemsPerPage: number
}

type BookingsPageAction =
  | { type: 'SET_SHOW_ARCHIVED'; payload: boolean }
  | { type: 'SET_DIALOG_OPEN'; payload: boolean }
  | { type: 'SET_CREATE_ASSIGNMENT_TYPE'; payload: 'staff' | 'team' | 'none' }
  | { type: 'SET_EDIT_ASSIGNMENT_TYPE'; payload: 'staff' | 'team' | 'none' }
  | { type: 'SET_SELECTED_BOOKING'; payload: Booking | null }
  | { type: 'OPEN_DETAIL'; payload: Booking }
  | { type: 'CLOSE_DETAIL' }
  | { type: 'SET_EDIT_OPEN'; payload: boolean }
  | { type: 'SET_CREATE_PACKAGE_SELECTION'; payload: PackageSelectionData | null }
  | { type: 'SET_EDIT_PACKAGE_SELECTION'; payload: PackageSelectionData | null }
  | { type: 'SET_CREATE_RECURRING_DATES'; payload: string[] }
  | { type: 'SET_CREATE_RECURRING_PATTERN'; payload: RecurringPattern }
  | { type: 'OPEN_RECURRING_DIALOG'; payload: { action: 'edit' | 'delete' | 'archive'; booking: Booking } }
  | { type: 'CLOSE_RECURRING_DIALOG' }
  | { type: 'SET_CONFLICT_DIALOG'; payload: boolean }
  | { type: 'SET_PENDING_BOOKING_DATA'; payload: Record<string, unknown> | null }
  | { type: 'SET_AVAILABILITY_MODAL'; payload: boolean }
  | { type: 'SET_EDIT_AVAILABILITY_MODAL'; payload: boolean }
  | { type: 'SET_ITEMS_PER_PAGE'; payload: number }
  | { type: 'OPEN_EDIT'; payload: { booking: Booking; assignmentType: 'staff' | 'team' | 'none' } }

const initialState: BookingsPageState = {
  showArchived: false,
  isDialogOpen: false,
  createAssignmentType: 'none',
  editAssignmentType: 'none',
  selectedBooking: null,
  isDetailOpen: false,
  isEditOpen: false,
  createPackageSelection: null,
  editPackageSelection: null,
  createRecurringDates: [],
  createRecurringPattern: RecurringPatternValues.AutoMonthly,
  showRecurringEditDialog: false,
  recurringEditAction: 'delete',
  pendingRecurringBooking: null,
  showConflictDialog: false,
  pendingBookingData: null,
  isAvailabilityModalOpen: false,
  isEditAvailabilityModalOpen: false,
  itemsPerPage: 10,
}

function bookingsPageReducer(state: BookingsPageState, action: BookingsPageAction): BookingsPageState {
  switch (action.type) {
    case 'SET_SHOW_ARCHIVED':
      return { ...state, showArchived: action.payload }
    case 'SET_DIALOG_OPEN':
      return { ...state, isDialogOpen: action.payload }
    case 'SET_CREATE_ASSIGNMENT_TYPE':
      return { ...state, createAssignmentType: action.payload }
    case 'SET_EDIT_ASSIGNMENT_TYPE':
      return { ...state, editAssignmentType: action.payload }
    case 'SET_SELECTED_BOOKING':
      return { ...state, selectedBooking: action.payload }
    case 'OPEN_DETAIL':
      return { ...state, selectedBooking: action.payload, isDetailOpen: true }
    case 'CLOSE_DETAIL':
      return { ...state, isDetailOpen: false }
    case 'SET_EDIT_OPEN':
      return { ...state, isEditOpen: action.payload }
    case 'SET_CREATE_PACKAGE_SELECTION':
      return { ...state, createPackageSelection: action.payload }
    case 'SET_EDIT_PACKAGE_SELECTION':
      return { ...state, editPackageSelection: action.payload }
    case 'SET_CREATE_RECURRING_DATES':
      return { ...state, createRecurringDates: action.payload }
    case 'SET_CREATE_RECURRING_PATTERN':
      return { ...state, createRecurringPattern: action.payload }
    case 'OPEN_RECURRING_DIALOG':
      return {
        ...state,
        pendingRecurringBooking: action.payload.booking,
        recurringEditAction: action.payload.action,
        showRecurringEditDialog: true,
      }
    case 'CLOSE_RECURRING_DIALOG':
      return { ...state, showRecurringEditDialog: false, pendingRecurringBooking: null }
    case 'SET_CONFLICT_DIALOG':
      return { ...state, showConflictDialog: action.payload }
    case 'SET_PENDING_BOOKING_DATA':
      return { ...state, pendingBookingData: action.payload }
    case 'SET_AVAILABILITY_MODAL':
      return { ...state, isAvailabilityModalOpen: action.payload }
    case 'SET_EDIT_AVAILABILITY_MODAL':
      return { ...state, isEditAvailabilityModalOpen: action.payload }
    case 'SET_ITEMS_PER_PAGE':
      return { ...state, itemsPerPage: action.payload }
    case 'OPEN_EDIT':
      return {
        ...state,
        selectedBooking: action.payload.booking,
        editAssignmentType: action.payload.assignmentType,
        isEditOpen: true,
        isDetailOpen: false,
      }
    default:
      return state
  }
}

// --- Hook ---

export function useBookingsPage() {
  const location = useLocation()
  const [state, dispatch] = useReducer(bookingsPageReducer, initialState)

  // Data hooks
  const { bookings, loading, refresh, error: bookingsError } = useBookings({ showArchived: state.showArchived })
  const { packages: servicePackages } = useServicePackages()
  const { staffList } = useStaffList({ role: 'staff', enableRealtime: false })
  const [teams, setTeams] = useState<Team[]>([])

  // Filter hook
  const {
    filters,
    updateFilter,
    resetFilters,
    hasActiveFilters,
    getActiveFilterCount,
    setQuickFilter,
  } = useBookingFilters()

  const debouncedSearchQuery = useDebounce(filters.searchQuery, 300)

  // Filtering
  const filteredBookings = useMemo(() => {
    return bookings.filter((booking) => {
      if (debouncedSearchQuery) {
        const query = debouncedSearchQuery.toLowerCase()
        const matchesSearch =
          booking.customers?.full_name.toLowerCase().includes(query) ||
          booking.service_packages?.name.toLowerCase().includes(query) ||
          booking.id.toLowerCase().includes(query)
        if (!matchesSearch) return false
      }
      if (filters.status !== 'all' && booking.status !== filters.status) return false
      if (filters.staffId !== 'all') {
        if (filters.staffId === 'unassigned' && booking.staff_id) return false
        else if (filters.staffId !== 'unassigned' && booking.staff_id !== filters.staffId) return false
      }
      if (filters.teamId !== 'all' && booking.team_id !== filters.teamId) return false
      if (filters.dateFrom && booking.booking_date < filters.dateFrom) return false
      if (filters.dateTo && booking.booking_date > filters.dateTo) return false
      if (filters.serviceType !== 'all' && booking.service_packages?.service_type !== filters.serviceType) return false
      if (filters.paymentStatus !== 'all' && booking.payment_status !== filters.paymentStatus) return false
      return true
    })
  }, [bookings, debouncedSearchQuery, filters.status, filters.paymentStatus, filters.staffId, filters.teamId, filters.dateFrom, filters.dateTo, filters.serviceType])

  // Grouping
  const combinedItems = useMemo((): CombinedItem[] => {
    const recurring: RecurringGroup[] = []
    const standalone: Booking[] = []
    const processedGroupIds = new Set<string>()

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

    filteredBookings.forEach((booking) => {
      if (!booking.is_recurring || !booking.recurring_group_id) standalone.push(booking)
    })

    const combined: CombinedItem[] = [
      ...recurring.map(group => ({ type: 'group' as const, data: group, createdAt: group.bookings[0].created_at || '' })),
      ...standalone.map(booking => ({ type: 'booking' as const, data: booking, createdAt: booking.created_at || '' })),
    ]
    combined.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    return combined
  }, [filteredBookings])

  // Pagination
  const {
    items: paginatedCombinedItems,
    currentPage,
    totalPages,
    nextPage,
    prevPage,
    goToFirst,
    goToLast,
    goToPage,
    metadata: paginationMetadata,
  } = usePagination(combinedItems, { initialPage: 1, itemsPerPage: state.itemsPerPage })

  const totalBookingsCount = useMemo(() => {
    return combinedItems.reduce((count, item) => {
      if (item.type === 'group') return count + item.data.totalBookings
      return count + 1
    }, 0)
  }, [combinedItems])

  const metadata = useMemo(() => {
    let startBookingIndex = 0
    let endBookingIndex = 0
    for (let i = 0; i < (paginationMetadata.startIndex - 1); i++) {
      const item = combinedItems[i]
      if (item?.type === 'group') startBookingIndex += item.data.totalBookings
      else if (item) startBookingIndex += 1
    }
    endBookingIndex = startBookingIndex
    paginatedCombinedItems.forEach(item => {
      if (item.type === 'group') endBookingIndex += item.data.totalBookings
      else endBookingIndex += 1
    })
    return { ...paginationMetadata, totalItems: totalBookingsCount, startIndex: startBookingIndex + 1, endIndex: endBookingIndex }
  }, [paginationMetadata, combinedItems, paginatedCombinedItems, totalBookingsCount])

  // Forms
  const lastProcessedLocationKey = useRef<string | null>(null)
  const editForm = useBookingForm({ onSubmit: async () => {} })
  const createForm = useBookingForm({ onSubmit: async () => {} })

  // Conflict detection
  const { conflicts, clearConflicts } = useConflictDetection()

  // Bulk actions
  const bulkActions = useBulkActions({ bookings, filteredBookings, onSuccess: refresh })

  // Wrapper that supports both direct values and function updaters for Dispatch<SetStateAction<T>>
  const setSelectedBooking: React.Dispatch<React.SetStateAction<Booking | null>> = useCallback(
    (valueOrUpdater: React.SetStateAction<Booking | null>) => {
      if (typeof valueOrUpdater === 'function') {
        // Function updater: call with current state
        const updater = valueOrUpdater as (prev: Booking | null) => Booking | null
        const newValue = updater(state.selectedBooking)
        dispatch({ type: 'SET_SELECTED_BOOKING', payload: newValue })
      } else {
        dispatch({ type: 'SET_SELECTED_BOOKING', payload: valueOrUpdater })
      }
    },
    [state.selectedBooking]
  )

  // Status manager
  const statusManager = useBookingStatusManager({
    selectedBooking: state.selectedBooking,
    setSelectedBooking,
    onSuccess: refresh,
  })

  // Payment actions
  const paymentActions = usePaymentActions({
    selectedBooking: state.selectedBooking,
    setSelectedBooking,
    onSuccess: refresh,
  })

  // --- Data Fetching (must be defined before effects) ---

  const fetchTeams = useCallback(async () => {
    try {
      const { data, error } = await supabase.from('teams').select('id, name').is('deleted_at', null).order('name')
      if (error) throw error
      setTeams(data || [])
    } catch (error) {
      logger.error('Error fetching teams', { error }, { context: 'AdminBookings' })
    }
  }, [])

  // --- Effects ---

  useEffect(() => { fetchTeams() }, [fetchTeams])

  // Sync selectedBooking with realtime updates
  const lastSyncedBooking = useRef<Booking | null>(null)
  useEffect(() => {
    if (!state.selectedBooking || !state.isDetailOpen) {
      lastSyncedBooking.current = null
      return
    }
    const updatedBooking = bookings.find(b => b.id === state.selectedBooking!.id)
    if (!updatedBooking) return
    const prev = lastSyncedBooking.current
    const hasImportantChanges = !prev ||
      updatedBooking.status !== prev.status ||
      updatedBooking.payment_status !== prev.payment_status ||
      updatedBooking.payment_method !== prev.payment_method ||
      updatedBooking.payment_date !== prev.payment_date ||
      (updatedBooking as { payment_slip_url?: string }).payment_slip_url !== (prev as { payment_slip_url?: string }).payment_slip_url
    if (hasImportantChanges) {
      lastSyncedBooking.current = updatedBooking
      dispatch({ type: 'SET_SELECTED_BOOKING', payload: updatedBooking })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bookings, state.selectedBooking?.id, state.isDetailOpen])

  useEffect(() => {
    if (bookingsError) {
      const errorMessage = getLoadErrorMessage('booking')
      toast.error(errorMessage.title, { description: bookingsError })
    }
  }, [bookingsError])

  useEffect(() => {
    goToPage(1)
  }, [filters.searchQuery, filters.status, filters.paymentStatus, filters.staffId, filters.teamId, filters.dateFrom, filters.dateTo, filters.serviceType, goToPage])

  // Navigation state handling
  useEffect(() => {
    const locationState = location.state as {
      editBookingId?: string
      bookingData?: Booking
      createBooking?: boolean
      bookingDate?: string
      viewBookingId?: string
      prefilledData?: {
        booking_date: string; start_time: string; end_time: string
        package_v2_id?: string
        staff_id: string; team_id: string; total_price?: number
        area_sqm?: number | null; frequency?: 1 | 2 | 4 | 8 | null
        is_recurring?: boolean; recurring_dates?: string[]; recurring_pattern?: RecurringPattern
      }
    } | null

    if (!locationState) { lastProcessedLocationKey.current = null; return }
    if (loading || servicePackages.length === 0) return
    if (lastProcessedLocationKey.current === location.key) return
    lastProcessedLocationKey.current = location.key

    // Create from Quick Availability
    if (locationState.createBooking && locationState.prefilledData) {
      const pf = locationState.prefilledData
      createForm.setValues({
        booking_date: pf.booking_date, start_time: pf.start_time, end_time: pf.end_time,
        package_v2_id: pf.package_v2_id,
        staff_id: pf.staff_id, team_id: pf.team_id,
        total_price: pf.total_price || 0, area_sqm: pf.area_sqm || null, frequency: pf.frequency || null,
      })

      if (pf.package_v2_id && pf.area_sqm && pf.frequency) {
        const pkg = servicePackages.find(p => p.id === pf.package_v2_id)
        if (pkg) {
          dispatch({ type: 'SET_CREATE_PACKAGE_SELECTION', payload: {
            packageId: pkg.id, pricingModel: 'tiered', areaSqm: pf.area_sqm,
            frequency: pf.frequency, price: pf.total_price || 0, requiredStaff: 1, packageName: pkg.name,
          }})
        }
      }

      if (pf.staff_id) dispatch({ type: 'SET_CREATE_ASSIGNMENT_TYPE', payload: 'staff' })
      else if (pf.team_id) dispatch({ type: 'SET_CREATE_ASSIGNMENT_TYPE', payload: 'team' })

      if (pf.is_recurring && pf.recurring_dates && pf.recurring_dates.length > 0) {
        dispatch({ type: 'SET_CREATE_RECURRING_DATES', payload: pf.recurring_dates })
        if (pf.recurring_pattern) dispatch({ type: 'SET_CREATE_RECURRING_PATTERN', payload: pf.recurring_pattern })
      }

      dispatch({ type: 'SET_DIALOG_OPEN', payload: true })
      window.history.replaceState({}, document.title)
      return
    }

    // Create from Calendar (legacy)
    if (locationState.createBooking && locationState.bookingDate) {
      createForm.setValues({ booking_date: locationState.bookingDate || '' })
      dispatch({ type: 'SET_DIALOG_OPEN', payload: true })
      window.history.replaceState({}, document.title)
      return
    }

    // View from Global Search
    if (locationState.viewBookingId && bookings.length > 0) {
      const booking = bookings.find(b => b.id === locationState.viewBookingId)
      if (booking) {
        dispatch({ type: 'OPEN_DETAIL', payload: booking })
        window.history.replaceState({}, document.title)
        return
      }
    }

    // Edit from Dashboard/Calendar
    if (locationState.editBookingId && bookings.length > 0) {
      const booking = bookings.find(b => b.id === locationState.editBookingId)
      if (booking) {
        editForm.setValues({
          customer_id: booking.customers?.id || '',
          staff_id: booking.staff_id || '', team_id: booking.team_id || '',
          booking_date: booking.booking_date, start_time: booking.start_time,
          end_time: booking.end_time, address: booking.address, city: booking.city || '',
          state: booking.state || '', zip_code: booking.zip_code || '', notes: booking.notes || '',
          total_price: Number(booking.total_price), status: booking.status,
        })
        let assignmentType: 'staff' | 'team' | 'none' = 'none'
        if (booking.staff_id) assignmentType = 'staff'
        else if (booking.team_id) assignmentType = 'team'
        dispatch({ type: 'OPEN_EDIT', payload: { booking, assignmentType } })
        window.history.replaceState({}, document.title)
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.state, bookings, servicePackages, loading])

  // --- Actions ---

  const resetForm = useCallback(() => {
    createForm.reset()
    dispatch({ type: 'SET_CREATE_ASSIGNMENT_TYPE', payload: 'none' })
    clearConflicts()
  }, [createForm, clearConflicts])

  const proceedWithConflictOverride = useCallback(async () => {
    if (!state.pendingBookingData) return
    try {
      const { error } = await supabase.from('bookings').insert(state.pendingBookingData)
      if (error) throw error
      toast.success('Booking created successfully (conflict overridden)')
      dispatch({ type: 'SET_DIALOG_OPEN', payload: false })
      dispatch({ type: 'SET_CONFLICT_DIALOG', payload: false })
      resetForm()
      dispatch({ type: 'SET_PENDING_BOOKING_DATA', payload: null })
      clearConflicts()
      refresh()
    } catch (_error) {
      const errorMsg = getBookingConflictError()
      toast.error(errorMsg.title, { description: errorMsg.description })
    }
  }, [state.pendingBookingData, resetForm, clearConflicts, refresh])

  const cancelConflictOverride = useCallback(() => {
    dispatch({ type: 'SET_CONFLICT_DIALOG', payload: false })
    dispatch({ type: 'SET_PENDING_BOOKING_DATA', payload: null })
    clearConflicts()
  }, [clearConflicts])

  const handleRecurringDelete = useCallback(async (scope: RecurringEditScope) => {
    if (!state.pendingRecurringBooking) return
    try {
      const result = await deleteRecurringBookings(state.pendingRecurringBooking.id, scope)
      if (!result.success) {
        const errorMsg = getRecurringBookingError('delete')
        toast.error(errorMsg.title, { description: errorMsg.description })
        return
      }
      toast.success(`Deleted ${result.deletedCount} booking(s) successfully`)
      dispatch({ type: 'CLOSE_RECURRING_DIALOG' })
      refresh()
    } catch (_error) {
      const errorMsg = getRecurringBookingError('delete')
      toast.error(errorMsg.title, { description: errorMsg.description })
    }
  }, [state.pendingRecurringBooking, refresh])

  const handleRecurringArchive = useCallback(async (scope: RecurringEditScope) => {
    if (!state.pendingRecurringBooking) return
    try {
      const { data: booking, error: fetchError } = await supabase
        .from('bookings').select('recurring_group_id, recurring_sequence')
        .eq('id', state.pendingRecurringBooking.id).single()
      if (fetchError) throw fetchError
      if (!booking) throw new Error('Booking not found')

      let bookingIdsToArchive: string[] = []
      switch (scope) {
        case 'this_only':
          bookingIdsToArchive = [state.pendingRecurringBooking.id]; break
        case 'this_and_future': {
          if (!booking.recurring_group_id) throw new Error('Booking is not part of a recurring group')
          const { data: futureBookings } = await supabase.from('bookings').select('id')
            .eq('recurring_group_id', booking.recurring_group_id)
            .gte('recurring_sequence', booking.recurring_sequence)
            .is('deleted_at', null)
          bookingIdsToArchive = futureBookings?.map(b => b.id) || []; break
        }
        case 'all': {
          if (!booking.recurring_group_id) throw new Error('Booking is not part of a recurring group')
          const { data: allBookings } = await supabase.from('bookings').select('id')
            .eq('recurring_group_id', booking.recurring_group_id)
            .is('deleted_at', null)
          bookingIdsToArchive = allBookings?.map(b => b.id) || []; break
        }
      }

      let archivedCount = 0
      for (const bookingId of bookingIdsToArchive) {
        const { error } = await supabase.rpc('soft_delete_record', { table_name: 'bookings', record_id: bookingId })
        if (!error) archivedCount++
      }
      toast.success(`Archived ${archivedCount} booking(s) successfully`)
      dispatch({ type: 'CLOSE_RECURRING_DIALOG' })
      refresh()
    } catch (_error) {
      const errorMsg = getArchiveErrorMessage()
      toast.error(errorMsg.title, { description: errorMsg.description })
    }
  }, [state.pendingRecurringBooking, refresh])

  const deleteBooking = useCallback(async (bookingId: string) => {
    try {
      const booking = bookings.find(b => b.id === bookingId)
      if (booking?.is_recurring && booking.recurring_group_id) {
        dispatch({ type: 'OPEN_RECURRING_DIALOG', payload: { action: 'delete', booking } })
        return
      }
      const { error } = await supabase.from('bookings').delete().eq('id', bookingId)
      if (error) throw error
      toast.success('Booking deleted successfully')
      refresh()
    } catch (_error) {
      const errorMsg = getDeleteErrorMessage('booking')
      toast.error(errorMsg.title, { description: errorMsg.description })
    }
  }, [bookings, refresh])

  const archiveBooking = useCallback(async (bookingId: string) => {
    try {
      const { error } = await supabase.rpc('soft_delete_record', { table_name: 'bookings', record_id: bookingId })
      if (error) throw error
      toast.success('Booking archived successfully')
      refresh()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to archive booking')
    }
  }, [refresh])

  const restoreBooking = useCallback(async (bookingId: string) => {
    try {
      const { error } = await supabase.from('bookings').update({ deleted_at: null, deleted_by: null }).eq('id', bookingId)
      if (error) throw error
      toast.success('Booking restored successfully')
      refresh()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to restore booking')
    }
  }, [refresh])

  const restoreRecurringGroup = useCallback(async (groupId: string) => {
    try {
      const { data: groupBookings, error: fetchError } = await supabase
        .from('bookings').select('id').eq('recurring_group_id', groupId).not('deleted_at', 'is', null)
      if (fetchError) throw fetchError
      if (!groupBookings || groupBookings.length === 0) {
        toast('No archived bookings found in this group to restore'); return
      }
      let restoredCount = 0
      for (const booking of groupBookings) {
        const { error } = await supabase.from('bookings').update({ deleted_at: null, deleted_by: null }).eq('id', booking.id)
        if (!error) restoredCount++
      }
      toast.success(`Restored ${restoredCount} booking${restoredCount > 1 ? 's' : ''} successfully`)
      refresh()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to restore recurring group')
    }
  }, [refresh])

  const archiveRecurringGroup = useCallback(async (groupId: string) => {
    try {
      const { data: groupBookings, error: fetchError } = await supabase
        .from('bookings').select('id').eq('recurring_group_id', groupId).is('deleted_at', null)
      if (fetchError) throw fetchError
      if (!groupBookings || groupBookings.length === 0) {
        toast('No active bookings found in this group to archive'); return
      }
      let archivedCount = 0
      for (const booking of groupBookings) {
        const { error } = await supabase.rpc('soft_delete_record', { table_name: 'bookings', record_id: booking.id })
        if (!error) archivedCount++
      }
      toast.success(`Archived ${archivedCount} booking(s) successfully`)
      refresh()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to archive recurring group')
    }
  }, [refresh])

  const deleteRecurringGroup = useCallback(async (groupId: string) => {
    try {
      const { data: firstBooking, error: fetchError } = await supabase
        .from('bookings')
        .select(`*, customers (id, full_name, email), service_packages (name, service_type), service_packages_v2:package_v2_id (name, service_type), profiles!bookings_staff_id_fkey (full_name), ${TEAMS_WITH_LEAD_QUERY}`)
        .eq('recurring_group_id', groupId).order('recurring_sequence').limit(1).single()
      if (fetchError) throw fetchError
      if (!firstBooking) throw new Error('Recurring group not found')
      const processedBooking = {
        ...firstBooking,
        service_packages: firstBooking.service_packages || firstBooking.service_packages_v2,
        teams: transformTeamsData(firstBooking.teams),
      }
      dispatch({ type: 'OPEN_RECURRING_DIALOG', payload: { action: 'delete', booking: processedBooking as Booking } })
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to delete recurring group')
    }
  }, [])

  const handleVerifyRecurringGroup = useCallback(async (recurringGroupId: string) => {
    try {
      const { verifyPayment } = await import('@/services/payment-service')
      const result = await verifyPayment({ bookingId: '', recurringGroupId })
      if (!result.success) throw new Error(result.error)
      toast.success(result.count > 1 ? `${result.count} bookings verified successfully` : 'Payment verified successfully')
      refresh()
    } catch (_error) {
      toast.error('Failed to verify payment')
    }
  }, [refresh])

  const openBookingDetail = useCallback((booking: Booking) => {
    dispatch({ type: 'OPEN_DETAIL', payload: booking })
  }, [])

  const openEditBooking = useCallback((booking: Booking) => {
    dispatch({ type: 'SET_SELECTED_BOOKING', payload: booking })
    editForm.setValues({
      customer_id: booking.customers?.id || '',
      staff_id: booking.staff_id || '', team_id: booking.team_id || '',
      booking_date: booking.booking_date, start_time: formatTime(booking.start_time),
      end_time: formatTime(booking.end_time), address: booking.address,
      city: booking.city || '', state: booking.state || '', zip_code: booking.zip_code || '',
      notes: booking.notes || '', total_price: Number(booking.total_price), status: booking.status,
    })
    let assignmentType: 'staff' | 'team' | 'none' = 'none'
    if (booking.staff_id) assignmentType = 'staff'
    else if (booking.team_id) assignmentType = 'team'

    // Set package selection
    if ('package_v2_id' in booking && booking.package_v2_id) {
      const packageId = booking.package_v2_id
      const pkg = servicePackages.find(p => p.id === packageId)
      if (pkg) {
        const isTiered = 'pricing_model' in pkg && pkg.pricing_model === 'tiered'
        if (isTiered && 'area_sqm' in booking && 'frequency' in booking && booking.area_sqm && booking.frequency) {
          dispatch({ type: 'SET_EDIT_PACKAGE_SELECTION', payload: {
            packageId: pkg.id, pricingModel: 'tiered', areaSqm: Number(booking.area_sqm) || 0,
            frequency: (booking.frequency as 1 | 2 | 4 | 8) || 1, price: booking.total_price || 0,
            requiredStaff: 1, packageName: pkg.name,
          }})
        } else {
          dispatch({ type: 'SET_EDIT_PACKAGE_SELECTION', payload: {
            packageId: pkg.id, pricingModel: 'fixed', price: Number(pkg.base_price || booking.total_price || 0),
            requiredStaff: 1, packageName: pkg.name,
            estimatedHours: pkg.duration_minutes ? pkg.duration_minutes / 60 : undefined,
          }})
        }
      }
    }

    setTimeout(() => {
      dispatch({ type: 'OPEN_EDIT', payload: { booking, assignmentType } })
    }, 0)
  }, [editForm, servicePackages])

  return {
    state,
    dispatch,
    // Data
    bookings,
    loading,
    refresh,
    servicePackages,
    staffList,
    teams,
    // Filtering & Pagination
    filters,
    updateFilter,
    resetFilters,
    hasActiveFilters,
    getActiveFilterCount,
    setQuickFilter,
    filteredBookings,
    combinedItems,
    paginatedCombinedItems,
    currentPage,
    totalPages,
    nextPage,
    prevPage,
    goToFirst,
    goToLast,
    goToPage,
    metadata,
    totalBookingsCount,
    // Forms
    editForm,
    createForm: toBookingForm(createForm),
    // Conflict
    conflicts,
    clearConflicts,
    proceedWithConflictOverride,
    cancelConflictOverride,
    // Bulk Actions
    bulkActions,
    // Status Manager
    statusManager,
    // Payment Actions
    paymentActions,
    // Actions
    deleteBooking,
    archiveBooking,
    restoreBooking,
    restoreRecurringGroup,
    archiveRecurringGroup,
    deleteRecurringGroup,
    handleRecurringDelete,
    handleRecurringArchive,
    handleVerifyRecurringGroup,
    openBookingDetail,
    openEditBooking,
    resetForm,
    // Semantic setters that handle function updaters internally
    setCreateRecurringDates: (d: string[] | ((prev: string[]) => string[])) =>
      dispatch({ type: 'SET_CREATE_RECURRING_DATES', payload: typeof d === 'function' ? d(state.createRecurringDates) : d }),
    setCreateRecurringPattern: (p: RecurringPattern | ((prev: RecurringPattern) => RecurringPattern)) =>
      dispatch({ type: 'SET_CREATE_RECURRING_PATTERN', payload: typeof p === 'function' ? p(state.createRecurringPattern) : p }),
    toast,
  }
}
