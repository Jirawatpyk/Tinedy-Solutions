/**
 * useDashboardStats Hook
 *
 * Hook สำหรับโหลด Dashboard data ด้วย React Query
 * แยก queries ออกเป็นส่วนๆ เพื่อ caching และ performance ที่ดีกว่า
 *
 * Features:
 * - ใช้ React Query สำหรับ caching และ parallel fetching
 * - แต่ละ query มี staleTime ที่แตกต่างกัน (1-10 นาที)
 * - รองรับ realtime subscription
 * - ลด API calls จาก 12 queries → 6 queries with caching
 */

import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { queryKeys } from '@/lib/query-keys'
import { dashboardQueryOptions } from '@/lib/queries/dashboard-queries'

export function useDashboardStats() {
  const queryClient = useQueryClient()

  // Fetch stats (total bookings, revenue, customers, pending)
  const {
    data: stats = { totalBookings: 0, totalRevenue: 0, totalCustomers: 0, pendingBookings: 0 },
    isLoading: loadingStats,
    error: errorStats,
  } = useQuery(dashboardQueryOptions.stats)

  // Fetch today's changes
  const {
    data: statsChange = { bookingsChange: 0, revenueChange: 0, customersChange: 0, pendingChange: 0 },
    isLoading: loadingTodayStats,
    error: errorTodayStats,
  } = useQuery(dashboardQueryOptions.todayStats)

  // Fetch bookings by status (for pie chart)
  const {
    data: bookingsByStatus = [],
    isLoading: loadingByStatus,
    error: errorByStatus,
  } = useQuery(dashboardQueryOptions.byStatus)

  // Fetch today's bookings detail
  const {
    data: todayBookings = [],
    isLoading: loadingTodayBookings,
    error: errorTodayBookings,
  } = useQuery(dashboardQueryOptions.todayBookings)

  // Fetch daily revenue (last 7 days)
  const {
    data: dailyRevenue = [],
    isLoading: loadingRevenue,
    error: errorRevenue,
  } = useQuery(dashboardQueryOptions.revenue(7))

  // Fetch mini stats (top service, avg value, completion rate)
  const {
    data: miniStats = { topService: null, avgBookingValue: 0, completionRate: 0 },
    isLoading: loadingMiniStats,
    error: errorMiniStats,
  } = useQuery(dashboardQueryOptions.miniStats)

  // Individual loading states for each section
  const loadingStates = {
    stats: loadingStats,
    todayStats: loadingTodayStats,
    byStatus: loadingByStatus,
    todayBookings: loadingTodayBookings,
    revenue: loadingRevenue,
    miniStats: loadingMiniStats,
  }

  // Combined loading state (true if ANY query is loading)
  const loading =
    loadingStats ||
    loadingTodayStats ||
    loadingByStatus ||
    loadingTodayBookings ||
    loadingRevenue ||
    loadingMiniStats

  // Combined error state
  const error =
    errorStats?.message ||
    errorTodayStats?.message ||
    errorByStatus?.message ||
    errorTodayBookings?.message ||
    errorRevenue?.message ||
    errorMiniStats?.message ||
    null

  // Realtime subscription - invalidate queries when data changes
  useEffect(() => {
    const channel = supabase
      .channel('dashboard-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'bookings',
        },
        (payload) => {
          // Add delay for UPDATE events to prevent race conditions
          const delay = payload.eventType === 'UPDATE' ? 300 : 100
          setTimeout(() => {
            queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.all })
          }, delay)
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*', // Changed from 'INSERT' to catch all customer changes
          schema: 'public',
          table: 'customers',
        },
        (payload) => {
          const delay = payload.eventType === 'UPDATE' ? 300 : 100
          setTimeout(() => {
            queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.stats() })
            queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.todayStats() })
          }, delay)
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [queryClient])

  // Refresh function - invalidate all dashboard queries
  const refresh = async () => {
    await queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.all })
  }

  return {
    stats,
    statsChange,
    bookingsByStatus,
    todayBookings,
    dailyRevenue,
    miniStats,
    loading,
    loadingStates,
    error,
    refresh,
  }
}
