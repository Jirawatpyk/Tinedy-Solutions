/**
 * Calendar Data Orchestrator Hook
 *
 * Main hook that composes all calendar-related hooks into a unified interface.
 * This is the single entry point for calendar.tsx to access all functionality.
 *
 * Composes:
 * - useCalendarDate - Date navigation and selection
 * - useBookingModal - Modal state management
 * - useBookingForm - Form state for Create/Edit
 * - useCalendarFilters - Filter management
 * - useBookingsByDateRange - Data fetching with React Query
 * - useConflictDetection - Booking conflict detection
 * - useCalendarActions - CRUD operations
 *
 * @module hooks/calendar/useCalendarData
 */

import { useMemo } from 'react'
import { useCalendarDate } from './useCalendarDate'
import { useBookingModal } from '@/hooks/dashboard/useBookingModal'
import { useBookingForm } from '@/hooks/useBookingForm'
import { useCalendarFilters } from '@/hooks/useCalendarFilters'
import { useBookingsByDateRange } from '@/hooks/useBookings'
import { useConflictDetection } from '@/hooks/useConflictDetection'
import { useCalendarActions } from './useCalendarActions'
import { BookingStatus, type Booking } from '@/types/booking'
import { isSameDay } from 'date-fns'

/**
 * Main hook for calendar page
 *
 * Orchestrates all calendar functionality including date navigation,
 * booking management, filtering, and CRUD operations.
 *
 * @returns Unified interface for calendar functionality
 *
 * @example
 * ```tsx
 * export default function CalendarPage() {
 *   const calendar = useCalendarData()
 *
 *   // Access everything through single object
 *   const { dateControls, modalControls, filterControls, bookingData, actions } = calendar
 *
 *   return (
 *     <div>
 *       <button onClick={dateControls.goToToday}>Today</button>
 *       <button onClick={dateControls.goToNextMonth}>Next</button>
 *       {bookingData.selectedDateBookings.map(booking => ...)}
 *     </div>
 *   )
 * }
 * ```
 */
export function useCalendarData() {
  // ========== Date Navigation ==========
  const dateControls = useCalendarDate()

  // ========== Filter Management ==========
  const filterControls = useCalendarFilters()

  // ========== Data Fetching ==========
  const {
    bookings,
    isLoading,
    isFetching,
    error,
    refetch: refetchBookings,
  } = useBookingsByDateRange({
    dateRange: {
      start: dateControls.monthStart.toISOString(),
      end: dateControls.monthEnd.toISOString(),
    },
    filters: filterControls.filters,
    enableRealtime: true,
    enabled: true,
  })

  // ========== Modal Management ==========
  const modalControls = useBookingModal()

  // ========== Form State (Create) ==========
  const createFormControls = useBookingForm()

  // ========== Form State (Edit) ==========
  const editFormControls = useBookingForm()

  // ========== Conflict Detection (Create) ==========
  const createConflicts = useConflictDetection({
    staffId: createFormControls.formData.staff_id,
    teamId: createFormControls.formData.team_id,
    bookingDate: createFormControls.formData.booking_date || '',
    startTime: createFormControls.formData.start_time || '',
    endTime: createFormControls.formData.end_time || '',
  })

  // ========== Conflict Detection (Edit) ==========
  const editConflicts = useConflictDetection({
    staffId: editFormControls.formData.staff_id,
    teamId: editFormControls.formData.team_id,
    bookingDate: editFormControls.formData.booking_date || '',
    startTime: editFormControls.formData.start_time || '',
    endTime: editFormControls.formData.end_time || '',
    excludeBookingId: modalControls.selectedBooking?.id,
  })

  // ========== CRUD Actions ==========
  const actions = useCalendarActions({
    selectedBooking: modalControls.selectedBooking as Booking | null,
    setSelectedBooking: modalControls.setSelectedBooking,
    refetchBookings,
    bookings,
    closeDetailModal: modalControls.closeDetail,
  })

  // ========== Computed Values ==========

  /**
   * Get bookings for a specific date
   */
  const getBookingsForDate = useMemo(() => {
    return (date: Date): Booking[] => {
      return bookings.filter((booking) => {
        const bookingDate = new Date(booking.booking_date)
        return isSameDay(bookingDate, date)
      })
    }
  }, [bookings])

  /**
   * Selected date/range bookings
   *
   * Logic:
   * - If single date selected → show bookings for that date
   * - If date range selected → show bookings in range
   * - If filters active (but no date selected) → show all filtered bookings
   * - Otherwise → empty array
   */
  const selectedDateBookings = useMemo(() => {
    // Single date selected
    if (dateControls.selectedDate) {
      return getBookingsForDate(dateControls.selectedDate)
    }

    // Date range selected
    if (dateControls.selectedDateRange) {
      return bookings.filter((booking) => {
        const bookingDate = new Date(booking.booking_date)
        return (
          bookingDate >= dateControls.selectedDateRange!.start &&
          bookingDate <= dateControls.selectedDateRange!.end
        )
      })
    }

    // Filters active (preset, search, staff, team)
    if (filterControls.hasActiveFilters) {
      return bookings
    }

    return []
  }, [
    dateControls.selectedDate,
    dateControls.selectedDateRange,
    getBookingsForDate,
    bookings,
    filterControls.hasActiveFilters,
  ])

  /**
   * Count bookings for a specific date (for calendar dots)
   */
  const getBookingCountForDate = useMemo(() => {
    return (date: Date): number => {
      return getBookingsForDate(date).length
    }
  }, [getBookingsForDate])

  /**
   * Detect time conflicts between bookings
   *
   * Returns a Map of booking IDs that have time conflicts
   */
  const conflictMap = useMemo(() => {
    const conflicts = new Map<string, Set<string>>()

    // Helper: Check if two time ranges overlap
    const checkTimeOverlap = (
      start1: string,
      end1: string,
      start2: string,
      end2: string
    ): boolean => {
      const toMinutes = (time: string): number => {
        const [hours, minutes] = time.split(':').map(Number)
        return hours * 60 + minutes
      }

      const s1 = toMinutes(start1)
      const e1 = toMinutes(end1)
      const s2 = toMinutes(start2)
      const e2 = toMinutes(end2)

      return s1 < e2 && e1 > s2
    }

    // Group bookings by date for efficient comparison
    const bookingsByDate = new Map<string, Booking[]>()
    bookings.forEach((booking) => {
      const dateKey = booking.booking_date
      if (!bookingsByDate.has(dateKey)) {
        bookingsByDate.set(dateKey, [])
      }
      bookingsByDate.get(dateKey)!.push(booking)
    })

    // Check for conflicts within each date
    bookingsByDate.forEach((dateBookings) => {
      for (let i = 0; i < dateBookings.length; i++) {
        const booking1 = dateBookings[i]

        // Skip cancelled/no-show bookings
        if (booking1.status === BookingStatus.Cancelled || booking1.status === BookingStatus.NoShow) {
          continue
        }

        for (let j = i + 1; j < dateBookings.length; j++) {
          const booking2 = dateBookings[j]

          // Skip cancelled/no-show bookings
          if (booking2.status === BookingStatus.Cancelled || booking2.status === BookingStatus.NoShow) {
            continue
          }

          // Check if they share the same staff or team
          const sameStaff = booking1.staff_id && booking2.staff_id &&
                           booking1.staff_id === booking2.staff_id
          const sameTeam = booking1.team_id && booking2.team_id &&
                          booking1.team_id === booking2.team_id

          if (sameStaff || sameTeam) {
            // Check time overlap
            const hasOverlap = checkTimeOverlap(
              booking1.start_time,
              booking1.end_time || booking1.start_time,
              booking2.start_time,
              booking2.end_time || booking2.start_time
            )

            if (hasOverlap) {
              // Add both bookings to conflict map
              if (!conflicts.has(booking1.id)) {
                conflicts.set(booking1.id, new Set())
              }
              if (!conflicts.has(booking2.id)) {
                conflicts.set(booking2.id, new Set())
              }
              conflicts.get(booking1.id)!.add(booking2.id)
              conflicts.get(booking2.id)!.add(booking1.id)
            }
          }
        }
      }
    })

    return conflicts
  }, [bookings])

  /**
   * Get conflict IDs grouped by date
   *
   * Returns a Map where key is date string and value is Set of conflicting booking IDs
   */
  const conflictIdsByDate = useMemo(() => {
    const idsByDate = new Map<string, Set<string>>()

    conflictMap.forEach((_conflictingIds, bookingId) => {
      const booking = bookings.find(b => b.id === bookingId)
      if (booking) {
        const dateKey = booking.booking_date
        if (!idsByDate.has(dateKey)) {
          idsByDate.set(dateKey, new Set())
        }
        idsByDate.get(dateKey)!.add(bookingId)
      }
    })

    return idsByDate
  }, [conflictMap, bookings])

  // ========== Return Unified Interface ==========
  return {
    // Date Controls
    dateControls: {
      currentDate: dateControls.currentDate,
      selectedDate: dateControls.selectedDate,
      selectedDateRange: dateControls.selectedDateRange,
      monthStart: dateControls.monthStart,
      monthEnd: dateControls.monthEnd,
      calendarDays: dateControls.calendarDays,
      currentMonthYear: dateControls.currentMonthYear,
      setCurrentDate: dateControls.setCurrentDate,
      setSelectedDate: dateControls.setSelectedDate,
      setSelectedDateRange: dateControls.setSelectedDateRange,
      goToPreviousMonth: dateControls.goToPreviousMonth,
      goToNextMonth: dateControls.goToNextMonth,
      goToToday: dateControls.goToToday,
      handlePresetDateChange: dateControls.handlePresetDateChange,
      handleDateClick: dateControls.handleDateClick,
    },

    // Filter Controls
    filterControls: {
      filters: filterControls.filters,
      setDateRange: filterControls.setDateRange,
      clearDateRange: filterControls.clearDateRange,
      toggleStaff: filterControls.toggleStaff,
      setStaff: filterControls.setStaff,
      clearStaff: filterControls.clearStaff,
      toggleTeam: filterControls.toggleTeam,
      setTeam: filterControls.setTeam,
      clearTeam: filterControls.clearTeam,
      toggleStatus: filterControls.toggleStatus,
      setStatus: filterControls.setStatus,
      clearStatus: filterControls.clearStatus,
      togglePaymentStatus: filterControls.togglePaymentStatus,
      setPaymentStatus: filterControls.setPaymentStatus,
      clearPaymentStatus: filterControls.clearPaymentStatus,
      setSearch: filterControls.setSearch,
      clearSearch: filterControls.clearSearch,
      toggleArchived: filterControls.toggleArchived,
      setArchived: filterControls.setArchived,
      setPreset: filterControls.setPreset,
      clearAll: filterControls.clearAll,
      hasActiveFilters: filterControls.hasActiveFilters,
      activeFilterCount: filterControls.activeFilterCount,
    },

    // Booking Data
    bookingData: {
      bookings,
      isLoading,
      isFetching,
      error: error as string | null,
      refetchBookings,
      selectedDateBookings,
      getBookingsForDate,
      getBookingCountForDate,
      conflictMap,
      conflictIdsByDate,
    },

    // Modal Controls
    modalControls: {
      selectedBooking: modalControls.selectedBooking,
      isDetailOpen: modalControls.isDetailOpen,
      isEditOpen: modalControls.isEditOpen,
      openDetail: modalControls.openDetail,
      closeDetail: modalControls.closeDetail,
      openEdit: modalControls.openEdit,
      closeEdit: modalControls.closeEdit,
      updateSelectedBooking: modalControls.updateSelectedBooking,
      setSelectedBooking: modalControls.setSelectedBooking,
      setIsDetailOpen: modalControls.setIsDetailOpen,
      setIsEditOpen: modalControls.setIsEditOpen,
    },

    // Create Form Controls
    createForm: {
      formData: createFormControls.formData,
      errors: createFormControls.errors,
      isSubmitting: createFormControls.isSubmitting,
      handleChange: createFormControls.handleChange,
      handleSubmit: createFormControls.handleSubmit,
      validate: createFormControls.validate,
      reset: createFormControls.reset,
      setValues: createFormControls.setValues,
      setErrors: createFormControls.setErrors,
      conflicts: createConflicts.conflicts,
      isCheckingConflicts: createConflicts.isChecking,
      hasConflicts: createConflicts.hasConflicts,
      clearConflicts: createConflicts.clearConflicts,
    },

    // Edit Form Controls
    editForm: {
      formData: editFormControls.formData,
      errors: editFormControls.errors,
      isSubmitting: editFormControls.isSubmitting,
      handleChange: editFormControls.handleChange,
      handleSubmit: editFormControls.handleSubmit,
      validate: editFormControls.validate,
      reset: editFormControls.reset,
      setValues: editFormControls.setValues,
      setErrors: editFormControls.setErrors,
      conflicts: editConflicts.conflicts,
      isCheckingConflicts: editConflicts.isChecking,
      hasConflicts: editConflicts.hasConflicts,
      clearConflicts: editConflicts.clearConflicts,
    },

    // CRUD Actions
    actions: {
      handleStatusChange: actions.handleStatusChange,
      handleInlineStatusChange: actions.handleInlineStatusChange,
      isUpdatingStatus: actions.isUpdatingStatus,
      handleMarkAsPaid: actions.handleMarkAsPaid,
      handleVerifyPayment: actions.handleVerifyPayment,
      handleRequestRefund: actions.handleRequestRefund,
      handleCompleteRefund: actions.handleCompleteRefund,
      handleCancelRefund: actions.handleCancelRefund,
      isUpdatingPayment: actions.isUpdatingPayment,
      handleDelete: actions.handleDelete,
      handleArchive: actions.handleArchive,
      isDeleting: actions.isDeleting,
      // Status utilities (from useBookingStatusManager)
      getStatusBadge: actions.getStatusBadge,
      getPaymentStatusBadge: actions.getPaymentStatusBadge,
      getAvailableStatuses: actions.getAvailableStatuses,
      getStatusLabel: actions.getStatusLabel,
      getStatusTransitionMessage: actions.getStatusTransitionMessage,
      // Status confirmation dialog state
      showStatusConfirmDialog: actions.showStatusConfirmDialog,
      pendingStatusChange: actions.pendingStatusChange,
      confirmStatusChange: actions.confirmStatusChange,
      cancelStatusChange: actions.cancelStatusChange,
    },
  }
}

/**
 * Type for the return value of useCalendarData
 * Export for use in components
 */
export type CalendarData = ReturnType<typeof useCalendarData>
