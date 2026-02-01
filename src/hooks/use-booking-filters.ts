import { useState, useCallback } from 'react'
import { useDebounce } from './use-debounce'
import { getBangkokDateString } from '@/lib/utils'

/**
 * Interface defining UI state for booking filter options
 *
 * Note: This is distinct from the BookingFilters type in src/types/booking.ts
 * which is used for API queries. This interface represents the UI state using
 * single string values (including 'all' for unselected) rather than arrays.
 */
export interface BookingFilterState {
  /** Search query for customer name or service name */
  searchQuery: string
  /** Filter by booking status (pending, confirmed, in_progress, completed, cancelled) */
  status: string
  /** Filter by payment status (unpaid, pending_verification, paid, partial, refunded) */
  paymentStatus: string
  /** Filter by date range - start date */
  dateFrom: string
  /** Filter by date range - end date */
  dateTo: string
  /** Filter by staff member ID or 'unassigned' */
  staffId: string
  /** Filter by team ID */
  teamId: string
  /** Filter by service type (cleaning, training, etc.) */
  serviceType: string
}

/**
 * Default filter values - represents "show all" state
 */
const DEFAULT_FILTERS: BookingFilterState = {
  searchQuery: '',
  status: 'all',
  paymentStatus: 'all',
  dateFrom: '',
  dateTo: '',
  staffId: 'all',
  teamId: 'all',
  serviceType: 'all',
}

/**
 * Custom hook for managing booking filters state
 *
 * This hook consolidates all filter-related state management for the bookings page,
 * reducing the component's useState calls and providing a clean API for filter operations.
 *
 * @param initialFilters - Optional partial filters to initialize with
 *
 * @returns Object containing:
 * - filters: Current filter state
 * - updateFilter: Function to update a single filter
 * - updateFilters: Function to update multiple filters at once
 * - resetFilters: Function to reset all filters to defaults
 * - hasActiveFilters: Function to check if any filters are active
 * - getActiveFilterCount: Function to get count of active filters
 * - setQuickFilter: Function to set common date range filters (today, week, month)
 *
 * @example
 * ```tsx
 * const {
 *   filters,
 *   updateFilter,
 *   resetFilters,
 *   hasActiveFilters
 * } = useBookingFilters()
 *
 * // Update a single filter
 * updateFilter('status', 'confirmed')
 *
 * // Update multiple filters
 * updateFilters({ status: 'pending', staffId: '123' })
 *
 * // Check if filters are active
 * if (hasActiveFilters()) {
 *   // Show clear filters button
 * }
 *
 * // Reset all filters
 * resetFilters()
 * ```
 */
export function useBookingFilters(initialFilters?: Partial<BookingFilterState>) {
  const [filters, setFilters] = useState<BookingFilterState>({
    ...DEFAULT_FILTERS,
    ...initialFilters,
  })

  // Debounce search query to reduce filtering overhead
  const debouncedSearchQuery = useDebounce(filters.searchQuery, 300)

  /**
   * Update a single filter value
   *
   * @param key - The filter key to update
   * @param value - The new value for the filter
   */
  const updateFilter = useCallback(<K extends keyof BookingFilterState>(
    key: K,
    value: BookingFilterState[K]
  ) => {
    setFilters((prev) => ({
      ...prev,
      [key]: value,
    }))
  }, [])

  /**
   * Update multiple filters at once
   *
   * @param updates - Partial filter object with updates
   */
  const updateFilters = useCallback((updates: Partial<BookingFilterState>) => {
    setFilters((prev) => ({
      ...prev,
      ...updates,
    }))
  }, [])

  /**
   * Reset all filters to default values
   */
  const resetFilters = useCallback(() => {
    setFilters(DEFAULT_FILTERS)
  }, [])

  /**
   * Check if any filters are active (different from default values)
   *
   * @returns true if any filter is active, false otherwise
   */
  const hasActiveFilters = useCallback((): boolean => {
    return (
      filters.searchQuery !== '' ||
      filters.status !== 'all' ||
      filters.paymentStatus !== 'all' ||
      filters.dateFrom !== '' ||
      filters.dateTo !== '' ||
      filters.staffId !== 'all' ||
      filters.teamId !== 'all' ||
      filters.serviceType !== 'all'
    )
  }, [filters])

  /**
   * Get the count of active filters
   *
   * @returns Number of active filters
   */
  const getActiveFilterCount = useCallback((): number => {
    let count = 0
    if (filters.searchQuery !== '') count++
    if (filters.status !== 'all') count++
    if (filters.paymentStatus !== 'all') count++
    if (filters.staffId !== 'all') count++
    if (filters.teamId !== 'all') count++
    if (filters.dateFrom !== '') count++
    if (filters.dateTo !== '') count++
    if (filters.serviceType !== 'all') count++
    return count
  }, [filters])

  /**
   * Set quick date range filters (today, this week, this month)
   * ใช้ getBangkokDateString() เพื่อให้วันที่ถูกต้องตาม timezone Bangkok (UTC+7)
   *
   * @param filter - The quick filter type to apply
   */
  const setQuickFilter = useCallback((filter: 'today' | 'week' | 'month') => {
    const now = new Date()
    const todayStr = getBangkokDateString()

    // Helper function to format local date as YYYY-MM-DD
    const formatLocalDate = (date: Date) => {
      const year = date.getFullYear()
      const month = String(date.getMonth() + 1).padStart(2, '0')
      const day = String(date.getDate()).padStart(2, '0')
      return `${year}-${month}-${day}`
    }

    if (filter === 'today') {
      setFilters((prev) => ({
        ...prev,
        dateFrom: todayStr,
        dateTo: todayStr,
      }))
    } else if (filter === 'week') {
      // คำนวณวันแรกและวันสุดท้ายของสัปดาห์ (อาทิตย์ - เสาร์)
      const weekStart = new Date(now)
      weekStart.setDate(now.getDate() - now.getDay()) // วันอาทิตย์
      const weekEnd = new Date(weekStart)
      weekEnd.setDate(weekStart.getDate() + 6) // วันเสาร์

      setFilters((prev) => ({
        ...prev,
        dateFrom: formatLocalDate(weekStart),
        dateTo: formatLocalDate(weekEnd),
      }))
    } else if (filter === 'month') {
      // คำนวณวันแรกและวันสุดท้ายของเดือน
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
      const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0)

      setFilters((prev) => ({
        ...prev,
        dateFrom: formatLocalDate(monthStart),
        dateTo: formatLocalDate(monthEnd),
      }))
    }
  }, [])

  return {
    filters,
    debouncedSearchQuery,
    updateFilter,
    updateFilters,
    resetFilters,
    hasActiveFilters,
    getActiveFilterCount,
    setQuickFilter,
  }
}
