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
    console.log('='.repeat(60))
    console.log('[Reports Realtime] 🚀 Initializing subscription')
    console.log('[Reports Realtime] Timestamp:', new Date().toISOString())
    console.log('='.repeat(60))

    const channel = supabase
      .channel('reports-realtime')
      .on(
        'postgres_changes',
        {
          event: '*', // INSERT, UPDATE, DELETE
          schema: 'public',
          table: 'bookings',
        },
        (payload) => {
          console.log('\n' + '='.repeat(60))
          console.log('[Reports Realtime] 📦 BOOKINGS EVENT RECEIVED')
          console.log('[Reports Realtime] Event Type:', payload.eventType)
          console.log('[Reports Realtime] Timestamp:', new Date().toISOString())
          console.log('[Reports Realtime] Old Record:', payload.old)
          console.log('[Reports Realtime] New Record:', payload.new)
          console.log('='.repeat(60))

          console.log('[Reports Realtime] 🔄 Invalidating queries...')
          queryClient.invalidateQueries({ queryKey: queryKeys.reports.bookings() })
          queryClient.invalidateQueries({ queryKey: queryKeys.reports.customers() })
          queryClient.invalidateQueries({ queryKey: queryKeys.reports.staff() })
          queryClient.invalidateQueries({ queryKey: queryKeys.reports.teams() })
          console.log('[Reports Realtime] ✅ Queries invalidated\n')
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'customers',
        },
        (payload) => {
          console.log('\n' + '='.repeat(60))
          console.log('[Reports Realtime] 👥 CUSTOMERS EVENT RECEIVED')
          console.log('[Reports Realtime] Event Type:', payload.eventType)
          console.log('='.repeat(60))

          queryClient.invalidateQueries({ queryKey: queryKeys.reports.customers() })
          console.log('[Reports Realtime] ✅ Query invalidated\n')
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'profiles',
        },
        (payload) => {
          console.log('\n' + '='.repeat(60))
          console.log('[Reports Realtime] 👤 PROFILES EVENT RECEIVED')
          console.log('[Reports Realtime] Event Type:', payload.eventType)
          console.log('='.repeat(60))

          queryClient.invalidateQueries({ queryKey: queryKeys.reports.staff() })
          console.log('[Reports Realtime] ✅ Query invalidated\n')
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'teams',
        },
        (payload) => {
          console.log('\n' + '='.repeat(60))
          console.log('[Reports Realtime] 🏢 TEAMS EVENT RECEIVED')
          console.log('[Reports Realtime] Event Type:', payload.eventType)
          console.log('='.repeat(60))

          queryClient.invalidateQueries({ queryKey: queryKeys.reports.teams() })
          console.log('[Reports Realtime] ✅ Query invalidated\n')
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'team_members',
        },
        (payload) => {
          console.log('\n' + '='.repeat(60))
          console.log('[Reports Realtime] 👥 TEAM_MEMBERS EVENT RECEIVED')
          console.log('[Reports Realtime] Event Type:', payload.eventType)
          console.log('='.repeat(60))

          queryClient.invalidateQueries({ queryKey: queryKeys.reports.teams() })
          queryClient.invalidateQueries({ queryKey: queryKeys.reports.staff() })
          console.log('[Reports Realtime] ✅ Queries invalidated\n')
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'service_packages',
        },
        (payload) => {
          console.log('\n' + '='.repeat(60))
          console.log('[Reports Realtime] 📦 SERVICE_PACKAGES EVENT RECEIVED')
          console.log('[Reports Realtime] Event Type:', payload.eventType)
          console.log('='.repeat(60))

          queryClient.invalidateQueries({ queryKey: queryKeys.reports.bookings() })
          console.log('[Reports Realtime] ✅ Query invalidated\n')
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'service_packages_v2',
        },
        (payload) => {
          console.log('\n' + '='.repeat(60))
          console.log('[Reports Realtime] 📦 SERVICE_PACKAGES_V2 EVENT RECEIVED')
          console.log('[Reports Realtime] Event Type:', payload.eventType)
          console.log('='.repeat(60))

          queryClient.invalidateQueries({ queryKey: queryKeys.reports.bookings() })
          console.log('[Reports Realtime] ✅ Query invalidated\n')
        }
      )
      .subscribe((status, err) => {
        console.log('\n' + '='.repeat(60))
        console.log('[Reports Realtime] 📡 SUBSCRIPTION STATUS CHANGE')
        console.log('[Reports Realtime] Status:', status)
        console.log('[Reports Realtime] Timestamp:', new Date().toISOString())

        if (err) {
          console.error('[Reports Realtime] ❌ ERROR:', err)
        }

        if (status === 'SUBSCRIBED') {
          console.log('[Reports Realtime] ✅ Successfully subscribed to all channels!')
          console.log('[Reports Realtime] Listening for changes on:')
          console.log('  - bookings')
          console.log('  - customers')
          console.log('  - profiles')
          console.log('  - teams')
          console.log('  - team_members')
          console.log('  - service_packages')
          console.log('  - service_packages_v2')
        } else if (status === 'CLOSED') {
          console.warn('[Reports Realtime] ⚠️  Channel closed')
        } else if (status === 'CHANNEL_ERROR') {
          console.error('[Reports Realtime] ❌ Channel error occurred')
        }
        console.log('='.repeat(60) + '\n')
      })

    return () => {
      console.log('\n' + '='.repeat(60))
      console.log('[Reports Realtime] 🧹 Cleaning up subscription')
      console.log('[Reports Realtime] Timestamp:', new Date().toISOString())
      console.log('='.repeat(60) + '\n')
      supabase.removeChannel(channel)
    }
  }, [queryClient])

  // Monitor query fetch status
  useEffect(() => {
    if (bookingsQuery.isFetching) {
      console.log('[Reports Query] 🔄 Bookings fetching...')
    }
  }, [bookingsQuery.isFetching])

  useEffect(() => {
    if (customersQuery.isFetching) {
      console.log('[Reports Query] 🔄 Customers fetching...')
    }
  }, [customersQuery.isFetching])

  useEffect(() => {
    if (staffQuery.isFetching) {
      console.log('[Reports Query] 🔄 Staff fetching...')
    }
  }, [staffQuery.isFetching])

  useEffect(() => {
    if (teamsQuery.isFetching) {
      console.log('[Reports Query] 🔄 Teams fetching...')
    }
  }, [teamsQuery.isFetching])

  // Monitor data updates
  useEffect(() => {
    if (bookingsQuery.data && !bookingsQuery.isFetching) {
      console.log('[Reports Query] ✅ Bookings data updated:', bookingsQuery.data.length, 'records')
      console.log('[Reports Query] Last updated:', new Date().toISOString())
    }
  }, [bookingsQuery.data, bookingsQuery.isFetching])

  useEffect(() => {
    if (customersQuery.data && !customersQuery.isFetching) {
      console.log('[Reports Query] ✅ Customers data updated:', customersQuery.data.customers.length, 'records')
      console.log('[Reports Query] Last updated:', new Date().toISOString())
    }
  }, [customersQuery.data, customersQuery.isFetching])

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
