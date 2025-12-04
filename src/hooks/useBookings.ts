/**
 * useBookings Hooks
 *
 * Hooks สำหรับโหลด Bookings ด้วย React Query
 *
 * Features:
 * - ใช้ React Query สำหรับ caching และ data fetching
 * - Cache อัตโนมัติ 3 นาที
 * - รองรับ archived bookings filter
 * - รองรับ date range queries (for Calendar, Weekly Schedule)
 * - Shared cache ข้ามหน้าต่างๆ
 */

import { useQuery, useQueryClient, keepPreviousData } from '@tanstack/react-query'
import { useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { queryKeys } from '@/lib/query-keys'
import { bookingQueryOptions, type BookingFilters } from '@/lib/queries/booking-queries'
import type { Booking } from '@/types/booking'

// ================================
// useBookings (List - for Bookings page)
// ================================

interface UseBookingsOptions {
  /** แสดง bookings ที่ archived (soft-deleted) ด้วยหรือไม่ */
  showArchived?: boolean
  /** Enable realtime subscription หรือไม่ */
  enableRealtime?: boolean
}

interface UseBookingsReturn {
  /** รายการ bookings ทั้งหมด */
  bookings: Booking[]
  /** กำลังโหลดหรือไม่ */
  loading: boolean
  /** Error message (ถ้ามี) */
  error: string | null
  /** Refresh bookings manually */
  refresh: () => Promise<void>
}

/**
 * Hook สำหรับโหลด Bookings ด้วย React Query
 *
 * @example
 * ```tsx
 * const { bookings, loading, error, refresh } = useBookings({
 *   showArchived: false,
 *   enableRealtime: true
 * })
 * ```
 */
export function useBookings(options: UseBookingsOptions = {}): UseBookingsReturn {
  const { showArchived = false, enableRealtime = true } = options
  const queryClient = useQueryClient()

  // Fetch bookings list
  const {
    data: bookings = [],
    isLoading: loading,
    error,
    refetch,
  } = useQuery(bookingQueryOptions.list(showArchived))

  // Realtime subscription - invalidate queries when bookings change
  useEffect(() => {
    if (!enableRealtime) return

    console.log('[Bookings] Setting up realtime subscription')

    const channel = supabase
      .channel('bookings-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'bookings',
        },
        (payload) => {
          console.log('[Bookings] Booking changed:', payload.eventType)
          // Invalidate all booking queries to refetch
          queryClient.invalidateQueries({ queryKey: queryKeys.bookings.all })
        }
      )
      .subscribe()

    return () => {
      console.log('[Bookings] Cleanup subscription')
      supabase.removeChannel(channel)
    }
  }, [queryClient, enableRealtime])

  // Refresh function - refetch current query
  const refresh = async () => {
    await refetch()
  }

  return {
    bookings,
    loading,
    error: error?.message || null,
    refresh,
  }
}

// ================================
// useBookingsByDateRange (for Calendar, Weekly Schedule)
// ================================

interface UseBookingsByDateRangeOptions {
  /** Date range (YYYY-MM-DD format) */
  dateRange: {
    start: string
    end: string
  }
  /** Filters */
  filters?: BookingFilters
  /** Enable realtime subscription หรือไม่ */
  enableRealtime?: boolean
  /** Enable query หรือไม่ (ใช้สำหรับ disable query ถ้า date range ยังไม่พร้อม) */
  enabled?: boolean
}

interface UseBookingsByDateRangeReturn {
  /** รายการ bookings */
  bookings: Booking[]
  /** กำลังโหลดครั้งแรกหรือไม่ (แสดง skeleton) */
  isLoading: boolean
  /** กำลัง refetch อยู่หรือไม่ (แสดง spinner/overlay) */
  isFetching: boolean
  /** Error message (ถ้ามี) */
  error: string | null
  /** Refresh bookings manually */
  refetch: () => Promise<void>
}

/**
 * Hook สำหรับโหลด Bookings by Date Range
 *
 * ใช้สำหรับ Calendar (month view) และ Weekly Schedule (week view)
 *
 * @example
 * ```tsx
 * // For calendar (month view)
 * const { bookings, isLoading, isFetching, refetch } = useBookingsByDateRange({
 *   dateRange: {
 *     start: format(startOfMonth(currentDate), 'yyyy-MM-dd'),
 *     end: format(endOfMonth(currentDate), 'yyyy-MM-dd')
 *   },
 *   filters: {
 *     viewMode: 'staff',
 *     staffId: selectedStaff !== 'all' ? selectedStaff : undefined,
 *     status: selectedStatus !== 'all' ? selectedStatus : undefined
 *   },
 *   enableRealtime: true
 * })
 * ```
 *
 * @example
 * ```tsx
 * // For weekly schedule
 * const { bookings, isLoading, isFetching, refetch } = useBookingsByDateRange({
 *   dateRange: {
 *     start: formatLocalDate(weekDates[0]),
 *     end: formatLocalDate(weekDates[6])
 *   },
 *   filters: { viewMode, staffId, teamId },
 *   enableRealtime: true,
 *   enabled: weekDates.length === 7  // Only fetch when weekDates is ready
 * })
 * ```
 */
export function useBookingsByDateRange(
  options: UseBookingsByDateRangeOptions
): UseBookingsByDateRangeReturn {
  const {
    dateRange,
    filters,
    enableRealtime = true,
    enabled = true,
  } = options
  const queryClient = useQueryClient()

  // Fetch bookings
  const {
    data: bookings = [],
    isLoading,
    isFetching,
    error,
    refetch: refetchQuery,
  } = useQuery({
    ...bookingQueryOptions.byDateRange(dateRange.start, dateRange.end, filters),
    enabled: enabled && !!dateRange.start && !!dateRange.end, // Only fetch if date range is valid
    placeholderData: keepPreviousData, // Keep showing previous data while refetching (prevents flash)
  })

  // Realtime subscription - invalidate when bookings change
  useEffect(() => {
    if (!enableRealtime) return

    console.log('[Bookings DateRange] Setting up realtime subscription')

    const channel = supabase
      .channel('bookings-daterange-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'bookings',
        },
        (payload) => {
          console.log('[Bookings DateRange] Booking changed:', payload.eventType)
          // Invalidate bookings queries
          queryClient.invalidateQueries({ queryKey: queryKeys.bookings.all })
        }
      )
      .subscribe()

    return () => {
      console.log('[Bookings DateRange] Cleanup subscription')
      supabase.removeChannel(channel)
    }
  }, [queryClient, enableRealtime])

  // Refresh function
  const refetch = async () => {
    await refetchQuery()
  }

  return {
    bookings,
    isLoading,
    isFetching,
    error: error?.message || null,
    refetch,
  }
}

// ================================
// useBookingsByCustomer (for Customer Detail page)
// ================================

interface UseBookingsByCustomerOptions {
  /** Customer ID */
  customerId: string
  /** แสดง bookings ที่ archived (soft-deleted) ด้วยหรือไม่ */
  showArchived?: boolean
  /** Enable realtime subscription หรือไม่ */
  enableRealtime?: boolean
  /** Enable query หรือไม่ */
  enabled?: boolean
}

interface UseBookingsByCustomerReturn {
  /** รายการ bookings ของ customer */
  bookings: Booking[]
  /** กำลังโหลดครั้งแรกหรือไม่ */
  isLoading: boolean
  /** กำลัง refetch อยู่หรือไม่ */
  isFetching: boolean
  /** Error message (ถ้ามี) */
  error: string | null
  /** Refresh bookings manually */
  refetch: () => Promise<void>
}

/**
 * Hook สำหรับโหลด Bookings ของ Customer คนใดคนหนึ่ง
 *
 * ใช้สำหรับ Customer Detail page - ดึงประวัติ bookings ทั้งหมดของ customer
 *
 * @example
 * ```tsx
 * const { bookings, isLoading, refetch } = useBookingsByCustomer({
 *   customerId: '123',
 *   showArchived: false,
 *   enableRealtime: true
 * })
 * ```
 */
export function useBookingsByCustomer(
  options: UseBookingsByCustomerOptions
): UseBookingsByCustomerReturn {
  const {
    customerId,
    showArchived = false,
    enableRealtime = true,
    enabled = true,
  } = options
  const queryClient = useQueryClient()

  // Fetch customer bookings
  const {
    data: bookings = [],
    isLoading,
    isFetching,
    error,
    refetch: refetchQuery,
  } = useQuery({
    ...bookingQueryOptions.byCustomer(customerId, showArchived),
    enabled: enabled && !!customerId, // Only fetch if customerId is valid
  })

  // Realtime subscription - invalidate when bookings change
  useEffect(() => {
    if (!enableRealtime) return

    console.log('[Bookings Customer] Setting up realtime subscription')

    const channel = supabase
      .channel('bookings-customer-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'bookings',
        },
        (payload) => {
          console.log('[Bookings Customer] Booking changed:', payload.eventType)
          // Invalidate customer bookings query
          queryClient.invalidateQueries({
            queryKey: queryKeys.bookings.byCustomer(customerId, showArchived),
          })
        }
      )
      .subscribe()

    return () => {
      console.log('[Bookings Customer] Cleanup subscription')
      supabase.removeChannel(channel)
    }
  }, [queryClient, enableRealtime, customerId, showArchived])

  // Refresh function
  const refetch = async () => {
    await refetchQuery()
  }

  return {
    bookings,
    isLoading,
    isFetching,
    error: error?.message || null,
    refetch,
  }
}
