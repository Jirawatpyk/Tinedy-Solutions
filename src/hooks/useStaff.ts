/**
 * useStaff Hooks
 *
 * Hooks สำหรับโหลด Staff ด้วย React Query
 *
 * Features:
 * - ใช้ React Query สำหรับ caching และ data fetching
 * - Cache อัตโนมัติ 3-5 นาที
 * - รองรับ realtime subscription
 * - Shared cache ข้ามหน้าต่างๆ
 * - 2 variants: withRatings (full data) และ listSimple (minimal data)
 */

import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { queryKeys } from '@/lib/query-keys'
import { staffQueryOptions } from '@/lib/queries/staff-queries'
import type { StaffWithRating, StaffListItem } from '@/types/staff'

// ================================
// useStaffWithRatings
// ================================

interface UseStaffWithRatingsOptions {
  /** Enable realtime subscription หรือไม่ */
  enableRealtime?: boolean
}

interface UseStaffWithRatingsReturn {
  /** รายการ staff ทั้งหมดพร้อม ratings */
  staff: StaffWithRating[]
  /** กำลังโหลดหรือไม่ */
  loading: boolean
  /** Error message (ถ้ามี) */
  error: string | null
  /** Refresh staff manually */
  refresh: () => Promise<void>
}

/**
 * Hook สำหรับโหลด Staff พร้อม Ratings (for Staff management page)
 *
 * @example
 * ```tsx
 * const { staff, loading, error, refresh } = useStaffWithRatings({
 *   enableRealtime: true
 * })
 * ```
 */
export function useStaffWithRatings(
  options: UseStaffWithRatingsOptions = {}
): UseStaffWithRatingsReturn {
  const { enableRealtime = true } = options
  const queryClient = useQueryClient()

  // Fetch staff with ratings
  const {
    data: staff = [],
    isLoading: loading,
    error,
    refetch,
  } = useQuery(staffQueryOptions.withRatings())

  // Realtime subscription - invalidate queries when staff/reviews change
  useEffect(() => {
    if (!enableRealtime) return

    console.log('[Staff] Setting up realtime subscription')

    const profilesChannel = supabase
      .channel('staff-profiles-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'profiles',
        },
        (payload) => {
          console.log('[Staff] Profile changed:', payload.eventType)
          // Invalidate all staff queries to refetch
          queryClient.invalidateQueries({ queryKey: queryKeys.staff.all })
        }
      )
      .subscribe()

    const reviewsChannel = supabase
      .channel('staff-reviews-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'reviews',
        },
        (payload) => {
          console.log('[Staff] Review changed:', payload.eventType)
          // Invalidate staff queries when reviews change (affects ratings)
          queryClient.invalidateQueries({ queryKey: queryKeys.staff.all })
        }
      )
      .subscribe()

    return () => {
      console.log('[Staff] Cleanup subscriptions')
      supabase.removeChannel(profilesChannel)
      supabase.removeChannel(reviewsChannel)
    }
  }, [queryClient, enableRealtime])

  // Refresh function - refetch current query
  const refresh = async () => {
    await refetch()
  }

  return {
    staff,
    loading,
    error: error?.message || null,
    refresh,
  }
}

// ================================
// useStaffList
// ================================

interface UseStaffListOptions {
  /** Filter by role: 'staff' | 'all' */
  role?: 'staff' | 'all'
  /** Enable realtime subscription หรือไม่ */
  enableRealtime?: boolean
}

interface UseStaffListReturn {
  /** รายการ staff แบบ minimal (for dropdowns) */
  staffList: StaffListItem[]
  /** กำลังโหลดหรือไม่ */
  loading: boolean
  /** Error message (ถ้ามี) */
  error: string | null
  /** Refresh staff list manually */
  refresh: () => Promise<void>
}

/**
 * Hook สำหรับโหลด Staff List แบบ minimal (for dropdowns in Dashboard, Bookings, Calendar)
 *
 * @example
 * ```tsx
 * // Get all staff
 * const { staffList, loading } = useStaffList({ role: 'all' })
 *
 * // Get only staff role
 * const { staffList, loading } = useStaffList({ role: 'staff' })
 * ```
 */
export function useStaffList(options: UseStaffListOptions = {}): UseStaffListReturn {
  const { role = 'all', enableRealtime = true } = options
  const queryClient = useQueryClient()

  // Fetch staff list (minimal data)
  const {
    data: staffList = [],
    isLoading: loading,
    error,
    refetch,
  } = useQuery(staffQueryOptions.listSimple(role))

  // Realtime subscription - invalidate when profiles change
  useEffect(() => {
    if (!enableRealtime) return

    console.log('[StaffList] Setting up realtime subscription')

    const channel = supabase
      .channel('staff-list-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'profiles',
        },
        (payload) => {
          console.log('[StaffList] Profile changed:', payload.eventType)
          // Invalidate staff list queries
          queryClient.invalidateQueries({ queryKey: queryKeys.staff.all })
        }
      )
      .subscribe()

    return () => {
      console.log('[StaffList] Cleanup subscription')
      supabase.removeChannel(channel)
    }
  }, [queryClient, enableRealtime])

  // Refresh function
  const refresh = async () => {
    await refetch()
  }

  return {
    staffList,
    loading,
    error: error?.message || null,
    refresh,
  }
}
