/**
 * useCustomerDetail Hook
 *
 * Extracted from customer-detail.tsx to reduce god component complexity.
 * Manages UI state (via useReducer), data fetching, filtering/pagination,
 * and action handlers for the customer detail page.
 */

import React, { useReducer, useEffect, useCallback, useMemo, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { queryKeys } from '@/lib/query-keys'
import { toast } from 'sonner'
import { useSoftDelete } from '@/hooks/use-soft-delete'
import { useOptimisticPayment, useOptimisticDelete } from '@/hooks/optimistic'
import { useBookingsByCustomer } from '@/hooks/use-bookings'
import { useBookingStatusManager } from '@/hooks/use-booking-status-manager'
import { useServicePackages } from '@/hooks/use-service-packages'
import { useStaffList } from '@/hooks/use-staff'
import { mapErrorToUserMessage, getDeleteErrorMessage } from '@/lib/error-messages'
import { logger } from '@/lib/logger'
import { groupBookingsByRecurringGroup, sortRecurringGroup, countBookingsByStatus, isRecurringBooking } from '@/lib/recurring-utils'
import { formatDate } from '@/lib/utils'
import * as XLSX from 'xlsx'
import type { CustomerRecord } from '@/types'
import type { Booking } from '@/types/booking'
import type { BookingFormState } from '@/hooks/use-booking-form'
import type { PackageSelectionData } from '@/components/service-packages'
import { RecurringPattern as RecurringPatternValues } from '@/types/recurring-booking'
import type { RecurringGroup, RecurringPattern } from '@/types/recurring-booking'
import type { CustomerStats, CustomerBooking, HistoryCombinedItem } from '@/components/customer-detail'
import { StatusBadge, getPaymentStatusVariant, getPaymentStatusLabel } from '@/components/common/StatusBadge'

interface Team {
  id: string
  name: string
}

type ModalName = 'booking' | 'note' | 'edit' | 'detail' | 'bookingEdit' | null

interface CustomerDetailState {
  // Core data
  customer: CustomerRecord | null
  stats: CustomerStats | null
  loading: boolean

  // Dialogs
  activeModal: ModalName
  selectedBookingId: string | null
  selectedBooking: Booking | null

  // Filters & pagination
  searchQuery: string
  statusFilter: string
  paymentStatusFilter: string
  currentPage: number

  // Note form
  noteText: string
  submitting: boolean

  // Create booking state
  createAssignmentType: 'none' | 'staff' | 'team'
  createPackageSelection: PackageSelectionData | null
  createRecurringDates: string[]
  createRecurringPattern: RecurringPattern
  isCreateAvailabilityModalOpen: boolean
  createFormData: {
    booking_date?: string
    start_time?: string
    end_time?: string
    package_v2_id?: string
  } | null
  selectedCreateStaffId: string
  selectedCreateTeamId: string

  // Edit booking state
  editBookingAssignmentType: 'staff' | 'team' | 'none'
  editBookingFormState: BookingFormState
  isEditBookingAvailabilityOpen: boolean
  editPackageSelection: PackageSelectionData | null
  editFormData: {
    booking_date?: string
    start_time?: string
    end_time?: string
    package_v2_id?: string
  } | null
  selectedEditStaffId: string
  selectedEditTeamId: string
}

type CustomerDetailAction =
  | { type: 'SET_CUSTOMER'; payload: CustomerRecord }
  | { type: 'SET_STATS'; payload: CustomerStats | null }
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'OPEN_MODAL'; modal: ModalName; bookingId?: string }
  | { type: 'CLOSE_MODAL' }
  | { type: 'SET_SELECTED_BOOKING'; payload: Booking | null }
  | { type: 'SET_SELECTED_BOOKING_ID'; payload: string | null }
  | { type: 'SET_SEARCH_QUERY'; payload: string }
  | { type: 'SET_STATUS_FILTER'; payload: string }
  | { type: 'SET_PAYMENT_STATUS_FILTER'; payload: string }
  | { type: 'SET_PAGE'; payload: number }
  | { type: 'SET_NOTE_TEXT'; payload: string }
  | { type: 'SET_SUBMITTING'; payload: boolean }
  // Create booking actions
  | { type: 'SET_CREATE_ASSIGNMENT_TYPE'; payload: 'none' | 'staff' | 'team' }
  | { type: 'SET_CREATE_PACKAGE_SELECTION'; payload: PackageSelectionData | null }
  | { type: 'SET_CREATE_RECURRING_DATES'; payload: string[] }
  | { type: 'SET_CREATE_RECURRING_PATTERN'; payload: RecurringPattern }
  | { type: 'SET_CREATE_AVAILABILITY_MODAL'; payload: boolean }
  | { type: 'SET_CREATE_FORM_DATA'; payload: CustomerDetailState['createFormData'] }
  | { type: 'SET_CREATE_STAFF_ID'; payload: string }
  | { type: 'SET_CREATE_TEAM_ID'; payload: string }
  // Edit booking actions
  | { type: 'SET_EDIT_ASSIGNMENT_TYPE'; payload: 'staff' | 'team' | 'none' }
  | { type: 'SET_EDIT_BOOKING_FORM'; payload: BookingFormState }
  | { type: 'SET_EDIT_AVAILABILITY_MODAL'; payload: boolean }
  | { type: 'SET_EDIT_PACKAGE_SELECTION'; payload: PackageSelectionData | null }
  | { type: 'SET_EDIT_FORM_DATA'; payload: CustomerDetailState['editFormData'] }
  | { type: 'SET_EDIT_STAFF_ID'; payload: string }
  | { type: 'SET_EDIT_TEAM_ID'; payload: string }
  | { type: 'OPEN_EDIT_BOOKING'; payload: { booking: Booking; formState: BookingFormState; assignmentType: 'staff' | 'team' | 'none'; packageSelection: PackageSelectionData | null } }
  | { type: 'CLOSE_EDIT_BOOKING' }

const initialState: CustomerDetailState = {
  customer: null,
  stats: null,
  loading: true,
  activeModal: null,
  selectedBookingId: null,
  selectedBooking: null,
  searchQuery: '',
  statusFilter: 'all',
  paymentStatusFilter: 'all',
  currentPage: 1,
  noteText: '',
  submitting: false,
  createAssignmentType: 'none',
  createPackageSelection: null,
  createRecurringDates: [],
  createRecurringPattern: RecurringPatternValues.AutoMonthly,
  isCreateAvailabilityModalOpen: false,
  createFormData: null,
  selectedCreateStaffId: '',
  selectedCreateTeamId: '',
  editBookingAssignmentType: 'none',
  editBookingFormState: {},
  isEditBookingAvailabilityOpen: false,
  editPackageSelection: null,
  editFormData: null,
  selectedEditStaffId: '',
  selectedEditTeamId: '',
}

function customerDetailReducer(state: CustomerDetailState, action: CustomerDetailAction): CustomerDetailState {
  switch (action.type) {
    case 'SET_CUSTOMER':
      return { ...state, customer: action.payload }
    case 'SET_STATS':
      return { ...state, stats: action.payload }
    case 'SET_LOADING':
      return { ...state, loading: action.payload }
    case 'OPEN_MODAL':
      return {
        ...state,
        activeModal: action.modal,
        ...(action.bookingId !== undefined ? { selectedBookingId: action.bookingId } : {}),
      }
    case 'CLOSE_MODAL':
      return { ...state, activeModal: null }
    case 'SET_SELECTED_BOOKING':
      return { ...state, selectedBooking: action.payload }
    case 'SET_SELECTED_BOOKING_ID':
      return { ...state, selectedBookingId: action.payload }
    case 'SET_SEARCH_QUERY':
      return { ...state, searchQuery: action.payload, currentPage: 1 }
    case 'SET_STATUS_FILTER':
      return { ...state, statusFilter: action.payload, currentPage: 1 }
    case 'SET_PAYMENT_STATUS_FILTER':
      return { ...state, paymentStatusFilter: action.payload, currentPage: 1 }
    case 'SET_PAGE':
      return { ...state, currentPage: action.payload }
    case 'SET_NOTE_TEXT':
      return { ...state, noteText: action.payload }
    case 'SET_SUBMITTING':
      return { ...state, submitting: action.payload }
    // Create booking
    case 'SET_CREATE_ASSIGNMENT_TYPE':
      return { ...state, createAssignmentType: action.payload }
    case 'SET_CREATE_PACKAGE_SELECTION':
      return { ...state, createPackageSelection: action.payload }
    case 'SET_CREATE_RECURRING_DATES':
      return { ...state, createRecurringDates: action.payload }
    case 'SET_CREATE_RECURRING_PATTERN':
      return { ...state, createRecurringPattern: action.payload }
    case 'SET_CREATE_AVAILABILITY_MODAL':
      return { ...state, isCreateAvailabilityModalOpen: action.payload }
    case 'SET_CREATE_FORM_DATA':
      return { ...state, createFormData: action.payload }
    case 'SET_CREATE_STAFF_ID':
      return { ...state, selectedCreateStaffId: action.payload }
    case 'SET_CREATE_TEAM_ID':
      return { ...state, selectedCreateTeamId: action.payload }
    // Edit booking
    case 'SET_EDIT_ASSIGNMENT_TYPE':
      return { ...state, editBookingAssignmentType: action.payload }
    case 'SET_EDIT_BOOKING_FORM':
      return { ...state, editBookingFormState: action.payload }
    case 'SET_EDIT_AVAILABILITY_MODAL':
      return { ...state, isEditBookingAvailabilityOpen: action.payload }
    case 'SET_EDIT_PACKAGE_SELECTION':
      return { ...state, editPackageSelection: action.payload }
    case 'SET_EDIT_FORM_DATA':
      return { ...state, editFormData: action.payload }
    case 'SET_EDIT_STAFF_ID':
      return { ...state, selectedEditStaffId: action.payload }
    case 'SET_EDIT_TEAM_ID':
      return { ...state, selectedEditTeamId: action.payload }
    case 'OPEN_EDIT_BOOKING':
      return {
        ...state,
        selectedBooking: action.payload.booking,
        editBookingFormState: action.payload.formState,
        editBookingAssignmentType: action.payload.assignmentType,
        editPackageSelection: action.payload.packageSelection,
        activeModal: 'bookingEdit',
      }
    case 'CLOSE_EDIT_BOOKING':
      return {
        ...state,
        activeModal: null,
        editBookingFormState: {},
        editBookingAssignmentType: 'none',
        selectedEditStaffId: '',
        selectedEditTeamId: '',
      }
    default:
      return state
  }
}

// --- Hook ---

export function useCustomerDetail(customerId: string | undefined) {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { softDelete } = useSoftDelete('bookings')
  const basePath = '/admin'

  const [state, dispatch] = useReducer(customerDetailReducer, initialState)

  // React Query hooks for data
  const {
    bookings: rawBookings,
    isLoading: bookingsLoading,
    refetch: refetchBookings,
  } = useBookingsByCustomer({
    customerId: customerId || '',
    showArchived: false,
    enabled: !!customerId,
    enableRealtime: true,
  })

  const bookings = rawBookings as unknown as CustomerBooking[]
  const { packages: servicePackages } = useServicePackages()
  const { staffList } = useStaffList({ role: 'staff', enableRealtime: false })
  const [teams, setTeams] = useReducer(
    (_: Team[], action: Team[]) => action,
    []
  )

  // Optimistic delete for customers
  const customerDeleteOps = useOptimisticDelete({
    table: 'customers',
    onSuccess: () => {
      queryClient.removeQueries({ queryKey: queryKeys.customers.all })
      navigate(`${basePath}/customers`)
    },
  })

  // Wrapper that supports both direct values and function updaters for Dispatch<SetStateAction<T>>
  const setSelectedBooking: React.Dispatch<React.SetStateAction<Booking | null>> = useCallback(
    (valueOrUpdater: React.SetStateAction<Booking | null>) => {
      if (typeof valueOrUpdater === 'function') {
        const updater = valueOrUpdater as (prev: Booking | null) => Booking | null
        const newValue = updater(state.selectedBooking)
        dispatch({ type: 'SET_SELECTED_BOOKING', payload: newValue })
      } else {
        dispatch({ type: 'SET_SELECTED_BOOKING', payload: valueOrUpdater })
      }
    },
    [state.selectedBooking]
  )

  // Booking status manager
  const {
    showStatusConfirmDialog,
    pendingStatusChange,
    getStatusBadge,
    getAvailableStatuses,
    getStatusLabel,
    getStatusTransitionMessage,
    handleStatusChange,
    confirmStatusChange,
    cancelStatusChange,
  } = useBookingStatusManager({
    selectedBooking: state.selectedBooking,
    setSelectedBooking,
    onSuccess: refetchBookings,
  })

  // Optimistic payment hook
  const payment = useOptimisticPayment({
    selectedBooking: state.selectedBooking,
    setSelectedBooking,
    onSuccess: refetchBookings,
  })

  // --- Data Fetching ---

  const fetchStats = useCallback(async () => {
    if (!customerId) return
    try {
      const { data: statsData, error: statsError } = await supabase
        .from('customer_lifetime_value')
        .select('*')
        .eq('id', customerId)
        .single()

      if (statsError) {
        logger.warn('Stats view not available', { error: statsError }, { context: 'CustomerDetail' })
        dispatch({
          type: 'SET_STATS',
          payload: {
            total_bookings: 0,
            lifetime_value: 0,
            avg_booking_value: 0,
            last_booking_date: null,
            first_booking_date: null,
            completed_bookings: 0,
            cancelled_bookings: 0,
            no_show_bookings: 0,
            pending_bookings: 0,
            days_since_last_booking: null,
            customer_tenure_days: 0,
          },
        })
      } else {
        dispatch({ type: 'SET_STATS', payload: statsData })
      }
    } catch (error) {
      logger.error('Error fetching stats', { error }, { context: 'CustomerDetail' })
    }
  }, [customerId])

  const fetchCustomerDetails = useCallback(async () => {
    if (!customerId) return
    try {
      dispatch({ type: 'SET_LOADING', payload: true })
      const { data: customerData, error: customerError } = await supabase
        .from('customers')
        .select('*')
        .eq('id', customerId)
        .is('deleted_at', null)
        .single()

      if (customerError) throw customerError
      dispatch({ type: 'SET_CUSTOMER', payload: customerData })
      await fetchStats()
    } catch (error) {
      logger.error('Error fetching customer details', { error }, { context: 'CustomerDetail' })
      toast.error('Failed to load customer details')
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false })
    }
  }, [customerId, toast, fetchStats])

  const fetchModalData = useCallback(async () => {
    try {
      const { data: teamsData, error: teamsError } = await supabase
        .from('teams')
        .select('id, name')
        .is('deleted_at', null)
        .order('name')
      if (teamsError) throw teamsError
      setTeams(teamsData || [])
    } catch (error) {
      logger.error('Error fetching modal data', { error }, { context: 'CustomerDetail' })
    }
  }, [])

  useEffect(() => {
    if (customerId) {
      Promise.all([fetchCustomerDetails(), fetchModalData()])
    }
  }, [customerId, fetchCustomerDetails, fetchModalData])

  // Sync selectedBooking with bookings array on realtime updates
  const lastSyncedCustomerBooking = useRef<CustomerBooking | null>(null)
  useEffect(() => {
    if (!state.selectedBooking) {
      lastSyncedCustomerBooking.current = null
      return
    }
    const updatedBooking = bookings.find(b => b.id === state.selectedBooking!.id)
    if (!updatedBooking) return
    const prev = lastSyncedCustomerBooking.current
    const hasChanges = !prev ||
      updatedBooking.status !== prev.status ||
      updatedBooking.payment_status !== prev.payment_status ||
      updatedBooking.total_price !== prev.total_price
    if (hasChanges) {
      lastSyncedCustomerBooking.current = updatedBooking
      dispatch({ type: 'SET_SELECTED_BOOKING', payload: updatedBooking as unknown as Booking })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bookings, state.selectedBooking?.id])

  // Refetch stats when bookings change
  const bookingsHash = useMemo(() => {
    return bookings.map(b => `${b.id}:${b.status}:${b.payment_status}:${b.total_price}`).join('|')
  }, [bookings])

  const prevBookingsHashRef = useRef(bookingsHash)
  useEffect(() => {
    if (bookingsHash !== prevBookingsHashRef.current) {
      prevBookingsHashRef.current = bookingsHash
      fetchStats()
    }
  }, [bookingsHash, fetchStats])

  // --- Filtering & Pagination ---

  const filteredBookings = useMemo(() => {
    return bookings.filter((booking) => {
      if (state.searchQuery) {
        const query = state.searchQuery.toLowerCase()
        const matchesSearch = (
          booking.service?.name?.toLowerCase().includes(query) ||
          booking.profiles?.full_name?.toLowerCase().includes(query) ||
          booking.status.toLowerCase().includes(query)
        )
        if (!matchesSearch) return false
      }
      if (state.statusFilter !== 'all' && booking.status !== state.statusFilter) return false
      if (state.paymentStatusFilter !== 'all' && booking.payment_status !== state.paymentStatusFilter) return false
      return true
    })
  }, [bookings, state.searchQuery, state.statusFilter, state.paymentStatusFilter])

  const combinedItems = useMemo((): HistoryCombinedItem[] => {
    const recurring: RecurringGroup[] = []
    const standalone: typeof filteredBookings = []
    const processedGroupIds = new Set<string>()

    const recurringBookings = filteredBookings.filter(isRecurringBooking)
    const groupedMap = groupBookingsByRecurringGroup(recurringBookings)

    groupedMap.forEach((groupBookings, groupId) => {
      if (!processedGroupIds.has(groupId)) {
        const sortedBookings = sortRecurringGroup(groupBookings)
        const bookingStats = countBookingsByStatus(sortedBookings)
        const firstBooking = sortedBookings[0]
        recurring.push({
          groupId,
          pattern: firstBooking.recurring_pattern!,
          totalBookings: sortedBookings.length,
          bookings: sortedBookings,
          completedCount: bookingStats.completed,
          confirmedCount: bookingStats.confirmed,
          inProgressCount: bookingStats.inProgress,
          cancelledCount: bookingStats.cancelled,
          noShowCount: bookingStats.noShow,
          upcomingCount: bookingStats.upcoming,
        })
        processedGroupIds.add(groupId)
      }
    })

    filteredBookings.forEach((booking) => {
      if (!booking.is_recurring || !booking.recurring_group_id) {
        standalone.push(booking)
      }
    })

    const combined: HistoryCombinedItem[] = [
      ...recurring.map(group => ({
        type: 'group' as const,
        data: group,
        createdAt: group.bookings[0].created_at || '',
      })),
      ...standalone.map(booking => ({
        type: 'booking' as const,
        data: booking,
        createdAt: ('created_at' in booking && typeof booking.created_at === 'string') ? booking.created_at : booking.booking_date,
      })),
    ]

    combined.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    return combined
  }, [filteredBookings])

  const itemsPerPage = 10

  const totalBookingsCount = useMemo(() => {
    return combinedItems.reduce((count, item) => {
      if (item.type === 'group') return count + (item.data as RecurringGroup).bookings.length
      return count + 1
    }, 0)
  }, [combinedItems])

  const paginatedItems = useMemo(() => {
    let bookingsSoFar = 0
    const targetStart = (state.currentPage - 1) * itemsPerPage
    const targetEnd = targetStart + itemsPerPage
    const result: HistoryCombinedItem[] = []

    for (const item of combinedItems) {
      const itemBookingsCount = item.type === 'group' ? (item.data as RecurringGroup).bookings.length : 1
      const itemStart = bookingsSoFar
      const itemEnd = bookingsSoFar + itemBookingsCount
      if (itemEnd > targetStart && itemStart < targetEnd) {
        result.push(item)
      }
      bookingsSoFar += itemBookingsCount
      if (bookingsSoFar >= targetEnd) break
    }
    return result
  }, [combinedItems, state.currentPage])

  const totalPages = Math.ceil(totalBookingsCount / itemsPerPage)
  const startIndex = (state.currentPage - 1) * itemsPerPage
  const endIndex = Math.min(startIndex + itemsPerPage, totalBookingsCount)

  // --- Utility ---

  const calculateEndTime = useCallback((startTime: string, durationMinutes: number): string => {
    const [hours, minutes] = startTime.split(':').map(Number)
    const totalMinutes = hours * 60 + minutes + durationMinutes
    const endHours = Math.floor(totalMinutes / 60) % 24
    const endMinutes = totalMinutes % 60
    return `${String(endHours).padStart(2, '0')}:${String(endMinutes).padStart(2, '0')}`
  }, [])

  // --- Actions ---

  const handleCreateBooking = useCallback(() => {
    if (!state.customer) return
    dispatch({ type: 'OPEN_MODAL', modal: 'booking' })
  }, [state.customer])

  const archiveBooking = useCallback(async (bookingId: string) => {
    const result = await softDelete(bookingId)
    if (result.success) {
      dispatch({ type: 'CLOSE_MODAL' })
      dispatch({ type: 'SET_SELECTED_BOOKING_ID', payload: null })
      refetchBookings()
    }
  }, [softDelete, refetchBookings])

  const handleAddNote = useCallback(async () => {
    if (!customerId || !state.noteText.trim()) return
    try {
      dispatch({ type: 'SET_SUBMITTING', payload: true })
      const currentNotes = state.customer?.notes || ''
      const timestamp = new Date().toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' })
      const newNote = `[${timestamp}] ${state.noteText.trim()}`
      const updatedNotes = currentNotes ? `${currentNotes}\n\n${newNote}` : newNote

      const { error } = await supabase.from('customers').update({ notes: updatedNotes }).eq('id', customerId)
      if (error) throw error

      toast.success('Note added successfully')
      dispatch({ type: 'CLOSE_MODAL' })
      dispatch({ type: 'SET_NOTE_TEXT', payload: '' })
      fetchCustomerDetails()
    } catch (error) {
      logger.error('Error adding note', { error }, { context: 'CustomerDetail' })
      const errorMsg = mapErrorToUserMessage(error, 'customer')
      toast.error(errorMsg.title, { description: errorMsg.description })
    } finally {
      dispatch({ type: 'SET_SUBMITTING', payload: false })
    }
  }, [customerId, state.noteText, state.customer?.notes, fetchCustomerDetails])

  const archiveCustomer = useCallback(() => {
    if (!customerId) return
    customerDeleteOps.softDelete.mutate({ id: customerId })
  }, [customerId, customerDeleteOps.softDelete])

  const deleteCustomer = useCallback(async () => {
    try {
      const { error } = await supabase.from('customers').delete().eq('id', customerId)
      if (error) throw error
      toast.success('Customer deleted successfully')
      navigate(`${basePath}/customers`)
    } catch (error) {
      logger.error('Error deleting customer', { error }, { context: 'CustomerDetail' })
      const errorMsg = getDeleteErrorMessage('customer')
      toast.error(errorMsg.title, { description: errorMsg.description })
    }
  }, [customerId, navigate, basePath])

  const handleEditBooking = useCallback((booking: Booking) => {
    const formState: BookingFormState = {
      package_v2_id: 'package_v2_id' in booking ? (booking.package_v2_id || undefined) : undefined,
      area_sqm: 'area_sqm' in booking ? (booking.area_sqm || undefined) : undefined,
      frequency: 'frequency' in booking ? (booking.frequency || undefined) : undefined,
      booking_date: booking.booking_date,
      start_time: booking.start_time,
      end_time: booking.end_time,
      address: booking.address,
      city: booking.city,
      state: booking.state,
      zip_code: booking.zip_code,
      notes: booking.notes || undefined,
      total_price: booking.total_price,
      staff_id: booking.staff_id || '',
      team_id: booking.team_id || '',
      status: booking.status,
    }

    let assignmentType: 'staff' | 'team' | 'none' = 'none'
    if (booking.staff_id) assignmentType = 'staff'
    else if (booking.team_id) assignmentType = 'team'

    let pkgSelection: PackageSelectionData | null = null
    const packageId = 'package_v2_id' in booking ? booking.package_v2_id : null
    if (packageId) {
      const pkg = servicePackages.find(p => p.id === packageId)
      if (pkg) {
        const isTiered = 'pricing_model' in pkg && pkg.pricing_model === 'tiered'
        if (isTiered && 'area_sqm' in booking && 'frequency' in booking && booking.area_sqm && booking.frequency) {
          pkgSelection = {
            packageId: pkg.id,
            pricingModel: 'tiered',
            areaSqm: Number(booking.area_sqm) || 0,
            frequency: (booking.frequency as 1 | 2 | 4 | 8) || 1,
            price: booking.total_price || 0,
            requiredStaff: 1,
            packageName: pkg.name,
          }
        } else {
          pkgSelection = {
            packageId: pkg.id,
            pricingModel: 'fixed',
            price: Number(pkg.base_price || booking.total_price || 0),
            requiredStaff: 1,
            packageName: pkg.name,
            estimatedHours: pkg.duration_minutes ? pkg.duration_minutes / 60 : undefined,
          }
        }
      }
    }

    const bookingForModal: Booking = {
      id: booking.id,
      booking_date: booking.booking_date,
      start_time: booking.start_time,
      end_time: booking.end_time,
      status: booking.status,
      total_price: booking.total_price,
      address: booking.address,
      city: booking.city,
      state: booking.state,
      zip_code: booking.zip_code,
      staff_id: booking.staff_id,
      team_id: booking.team_id,
      package_v2_id: 'package_v2_id' in booking ? booking.package_v2_id : null,
      area_sqm: 'area_sqm' in booking ? booking.area_sqm : null,
      frequency: 'frequency' in booking ? booking.frequency : null,
      notes: booking.notes,
      payment_status: booking.payment_status,
      payment_method: booking.payment_method,
      amount_paid: booking.amount_paid,
      payment_date: booking.payment_date,
      payment_notes: 'payment_notes' in booking ? booking.payment_notes : undefined,
      customers: booking.customers,
      service_packages: booking.service_packages,
      profiles: booking.profiles,
      teams: booking.teams,
    }

    dispatch({
      type: 'OPEN_EDIT_BOOKING',
      payload: {
        booking: bookingForModal,
        formState,
        assignmentType,
        packageSelection: pkgSelection,
      },
    })
  }, [servicePackages])

  const editBookingForm = useMemo(() => ({
    formData: state.editBookingFormState,
    handleChange: <K extends keyof BookingFormState>(field: K, value: BookingFormState[K]) => {
      dispatch({ type: 'SET_EDIT_BOOKING_FORM', payload: { ...state.editBookingFormState, [field]: value } })
    },
    setValues: (values: Partial<BookingFormState>) => {
      dispatch({ type: 'SET_EDIT_BOOKING_FORM', payload: { ...state.editBookingFormState, ...values } })
    },
    reset: () => {
      dispatch({ type: 'CLOSE_EDIT_BOOKING' })
    },
  }), [state.editBookingFormState])

  const exportToExcel = useCallback(() => {
    if (!state.customer) return
    const data = filteredBookings.map((booking) => ({
      'Date': formatDate(booking.booking_date),
      'Time': booking.start_time,
      'Service': booking.service?.name || booking.service_packages?.name || 'N/A',
      'Service Type': booking.service?.service_type || booking.service_packages?.service_type || 'N/A',
      'Staff': booking.profiles?.full_name || 'N/A',
      'Team': booking.teams?.name || 'N/A',
      'Status': booking.status,
      'Amount (฿)': booking.total_price || 0,
      'Payment Status': booking.payment_status || 'unpaid',
      'Notes': booking.notes || '',
    }))

    const workbook = XLSX.utils.book_new()
    const worksheet = XLSX.utils.json_to_sheet(data)
    worksheet['!cols'] = [
      { wch: 12 }, { wch: 10 }, { wch: 25 }, { wch: 15 }, { wch: 20 },
      { wch: 15 }, { wch: 12 }, { wch: 12 }, { wch: 15 }, { wch: 30 },
    ]
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Booking History')
    const filename = `${state.customer.full_name}_booking_history_${new Date().toISOString().split('T')[0]}.xlsx`
    XLSX.writeFile(workbook, filename)
    toast.success('Booking history exported to Excel successfully')
  }, [state.customer, filteredBookings])

  const deleteBookingById = useCallback(async (bookingId: string) => {
    try {
      const { error } = await supabase.from('bookings').delete().eq('id', bookingId)
      if (error) throw error
      toast.success('Booking deleted successfully')
      dispatch({ type: 'CLOSE_MODAL' })
      dispatch({ type: 'SET_SELECTED_BOOKING_ID', payload: null })
      refetchBookings()
    } catch (_error) {
      toast.error('Failed to delete booking')
    }
  }, [refetchBookings])

  const getPaymentStatusBadge = useCallback((status?: string) => {
    const displayStatus = status === 'pending' ? 'unpaid' : (status || 'unpaid')
    return React.createElement(StatusBadge, { variant: getPaymentStatusVariant(displayStatus), children: getPaymentStatusLabel(displayStatus) })
  }, [])

  return {
    // State
    state,
    dispatch,
    bookings,
    bookingsLoading,
    refetchBookings,

    // Data
    servicePackages,
    staffList,
    teams,

    // Filtering / Pagination
    filteredBookings,
    combinedItems,
    paginatedItems,
    totalBookingsCount,
    totalPages,
    startIndex,
    endIndex,

    // Actions
    fetchCustomerDetails,
    handleCreateBooking,
    handleAddNote,
    archiveBooking,
    archiveCustomer,
    deleteCustomer,
    handleEditBooking,
    editBookingForm,
    exportToExcel,
    calculateEndTime,
    deleteBookingById,

    // Status management
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

    // Payment
    payment,

    // Constants
    basePath,
  }
}
