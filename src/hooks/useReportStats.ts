/**
 * useReportStats Hook
 *
 * Combined hook for Reports page data fetching.
 * Replaces 9 useState hooks and 306 lines of manual fetching code.
 *
 * Parallel fetches 4 datasets:
 * - Bookings with services (V1 + V2)
 * - Customers with bookings
 * - Staff with bookings (includes team bookings)
 * - Teams with bookings
 *
 * Includes realtime subscription for automatic updates when data changes.
 */

import { useEffect } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { queryKeys } from '@/lib/query-keys'
import {
  reportsQueryOptions,
  type BookingWithService,
  type CustomerRecord,
  type CustomerWithBookings,
  type Staff,
  type StaffWithBookings,
  type Team,
  type TeamWithBookings,
} from '@/lib/queries/reports-queries'

export interface UseReportStatsReturn {
  // Data
  bookings: BookingWithService[]
  customers: CustomerRecord[]
  customersWithBookings: CustomerWithBookings[]
  staff: Staff[]
  staffWithBookings: StaffWithBookings[]
  teams: Team[]
  teamsWithBookings: TeamWithBookings[]

  // States
  isLoading: boolean
  isFetching: boolean
  error: Error | null

  // Actions
  refetch: () => void
}

/**
 * Hook for fetching Reports analytics data
 *
 * @example
 * ```tsx
 * function AdminReports() {
 *   const {
 *     bookings,
 *     customers,
 *     customersWithBookings,
 *     staff,
 *     staffWithBookings,
 *     teams,
 *     teamsWithBookings,
 *     isLoading,
 *     error,
 *   } = useReportStats()
 *
 *   if (isLoading) return <div>Loading...</div>
 *   if (error) return <div>Error: {error.message}</div>
 *
 *   // Use data for charts and metrics...
 * }
 * ```
 */
export function useReportStats(): UseReportStatsReturn {
  const queryClient = useQueryClient()

  // Parallel fetch all 4 datasets
  const bookingsQuery = useQuery(reportsQueryOptions.bookings)
  const customersQuery = useQuery(reportsQueryOptions.customers)
  const staffQuery = useQuery(reportsQueryOptions.staff)
  const teamsQuery = useQuery(reportsQueryOptions.teams)

  // Setup realtime subscription for automatic updates
  useEffect(() => {
    const channel = supabase
      .channel('reports-realtime')
      .on(
        'postgres_changes',
        {
          event: '*', // INSERT, UPDATE, DELETE
          schema: 'public',
          table: 'bookings',
        },
        () => {
          queryClient.invalidateQueries({ queryKey: queryKeys.reports.bookings() })
          queryClient.invalidateQueries({ queryKey: queryKeys.reports.customers() })
          queryClient.invalidateQueries({ queryKey: queryKeys.reports.staff() })
          queryClient.invalidateQueries({ queryKey: queryKeys.reports.teams() })
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'customers',
        },
        () => {
          queryClient.invalidateQueries({ queryKey: queryKeys.reports.customers() })
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'profiles',
        },
        () => {
          queryClient.invalidateQueries({ queryKey: queryKeys.reports.staff() })
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'teams',
        },
        () => {
          queryClient.invalidateQueries({ queryKey: queryKeys.reports.teams() })
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'team_members',
        },
        () => {
          queryClient.invalidateQueries({ queryKey: queryKeys.reports.teams() })
          queryClient.invalidateQueries({ queryKey: queryKeys.reports.staff() })
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'service_packages',
        },
        () => {
          queryClient.invalidateQueries({ queryKey: queryKeys.reports.bookings() })
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'service_packages_v2',
        },
        () => {
          queryClient.invalidateQueries({ queryKey: queryKeys.reports.bookings() })
        }
      )
      .subscribe((status, err) => {
        if (err) {
          console.error('[Reports Realtime] Error:', err)
        }
        if (status === 'CHANNEL_ERROR') {
          console.error('[Reports Realtime] Channel error occurred')
        }
      })

    return () => {
      supabase.removeChannel(channel)
    }
  }, [queryClient])

  // Combined loading state (all must finish loading)
  const isLoading =
    bookingsQuery.isLoading ||
    customersQuery.isLoading ||
    staffQuery.isLoading ||
    teamsQuery.isLoading

  // Combined fetching state (any is fetching)
  const isFetching =
    bookingsQuery.isFetching ||
    customersQuery.isFetching ||
    staffQuery.isFetching ||
    teamsQuery.isFetching

  // Combined error state (first error encountered)
  const error =
    bookingsQuery.error ||
    customersQuery.error ||
    staffQuery.error ||
    teamsQuery.error ||
    null

  // Refetch all queries
  const refetch = () => {
    bookingsQuery.refetch()
    customersQuery.refetch()
    staffQuery.refetch()
    teamsQuery.refetch()
  }

  return {
    // Bookings data
    bookings: bookingsQuery.data || [],

    // Customers data
    customers: customersQuery.data?.customers || [],
    customersWithBookings: customersQuery.data?.customersWithBookings || [],

    // Staff data
    staff: staffQuery.data?.staff || [],
    staffWithBookings: staffQuery.data?.staffWithBookings || [],

    // Teams data
    teams: teamsQuery.data?.teams || [],
    teamsWithBookings: teamsQuery.data?.teamsWithBookings || [],

    // States
    isLoading,
    isFetching,
    error: error as Error | null,

    // Actions
    refetch,
  }
}
