import { useState, useCallback } from 'react'

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
    if (filters.staffId !== 'all') count++
    if (filters.teamId !== 'all') count++
    if (filters.dateFrom !== '') count++
    if (filters.dateTo !== '') count++
    if (filters.serviceType !== 'all') count++
    return count
  }, [filters])

  /**
   * Set quick date range filters (today, this week, this month)
   *
   * @param filter - The quick filter type to apply
   */
  const setQuickFilter = useCallback((filter: 'today' | 'week' | 'month') => {
    const today = new Date()
    const todayStr = today.toISOString().split('T')[0]

    if (filter === 'today') {
      setFilters((prev) => ({
        ...prev,
        dateFrom: todayStr,
        dateTo: todayStr,
      }))
    } else if (filter === 'week') {
      const weekStart = new Date(today)
      weekStart.setDate(today.getDate() - today.getDay())
      const weekEnd = new Date(weekStart)
      weekEnd.setDate(weekStart.getDate() + 6)
      setFilters((prev) => ({
        ...prev,
        dateFrom: weekStart.toISOString().split('T')[0],
        dateTo: weekEnd.toISOString().split('T')[0],
      }))
    } else if (filter === 'month') {
      const monthStart = new Date(today.getFullYear(), today.getMonth(), 1)
      const monthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0)
      setFilters((prev) => ({
        ...prev,
        dateFrom: monthStart.toISOString().split('T')[0],
        dateTo: monthEnd.toISOString().split('T')[0],
      }))
    }
  }, [])

  return {
    filters,
    updateFilter,
    updateFilters,
    resetFilters,
    hasActiveFilters,
    getActiveFilterCount,
    setQuickFilter,
  }
}
