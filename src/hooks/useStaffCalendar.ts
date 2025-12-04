/**
 * useStaffCalendar Hook
 *
 * Combined hook for Staff Portal "My Calendar" page.
 * Replaces use-staff-calendar.ts (242 lines → ~95 lines)
 *
 * Features:
 * - Fetches team membership
 * - Fetches calendar events (3 months ahead)
 * - Real-time subscriptions
 *
 * Pattern: Same as useStaffDashboard (Phase 2 migration)
 */

import { useEffect, useMemo } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/contexts/auth-context'
import { supabase } from '@/lib/supabase'
import { queryKeys } from '@/lib/query-keys'
import { logger } from '@/lib/logger'
import {
  staffCalendarQueryOptions,
  type CalendarEvent,
  type TeamMembership,
} from '@/lib/queries/staff-calendar-queries'

// ============================================================================
// HOOK INTERFACE
// ============================================================================

export interface UseStaffCalendarReturn {
  // Team Membership
  teamMembership: TeamMembership | undefined
  teamIds: string[]

  // Calendar Data
  events: CalendarEvent[]

  // Loading States
  loading: boolean
  isLoadingTeams: boolean
  isLoadingEvents: boolean

  // Error State
  error: Error | null

  // Actions
  refresh: () => void
}

// ============================================================================
// MAIN HOOK
// ============================================================================

/**
 * Hook for Staff Calendar data
 *
 * @example
 * ```tsx
 * function StaffCalendar() {
 *   const {
 *     events,
 *     loading,
 *     refresh,
 *   } = useStaffCalendar()
 *
 *   if (loading) return <div>Loading...</div>
 *
 *   return <Calendar events={events} />
 * }
 * ```
 */
export function useStaffCalendar(): UseStaffCalendarReturn {
  const { user } = useAuth()
  const queryClient = useQueryClient()

  const userId = user?.id || ''

  // Step 1: Fetch team membership first (required for events query)
  const teamMembershipQuery = useQuery({
    ...staffCalendarQueryOptions.teamMembership(userId),
    enabled: !!userId,
  })

  const teamIds = useMemo(() => teamMembershipQuery.data?.teamIds || [], [teamMembershipQuery.data?.teamIds])
  const teamsLoaded = teamMembershipQuery.isSuccess

  // Step 2: Fetch calendar events (enabled only after teams loaded)
  const eventsQuery = useQuery({
    ...staffCalendarQueryOptions.events(userId, teamIds),
    enabled: !!userId && teamsLoaded,
  })

  // Combined loading states
  const isLoadingTeams = teamMembershipQuery.isLoading
  const isLoadingEvents = eventsQuery.isLoading
  const loading = isLoadingTeams || isLoadingEvents

  // Combined error state
  const error = teamMembershipQuery.error || eventsQuery.error || null

  // Real-time subscriptions
  useEffect(() => {
    if (!userId || !teamsLoaded) return

    logger.debug('Setting up calendar real-time subscription', { userId, teamIds }, { context: 'StaffCalendar' })

    const channel = supabase
      .channel('staff-calendar')
      .on(
        'postgres_changes',
        {
          event: '*', // INSERT, UPDATE, DELETE
          schema: 'public',
          table: 'bookings',
        },
        (payload) => {
          logger.debug('Calendar real-time update received', { event: payload.eventType }, { context: 'StaffCalendar' })

          // Invalidate calendar events query to refetch
          queryClient.invalidateQueries({ queryKey: queryKeys.staffCalendar.events(userId, teamIds) })
        }
      )
      .subscribe()

    return () => {
      logger.debug('Cleaning up calendar real-time subscription', {}, { context: 'StaffCalendar' })
      supabase.removeChannel(channel)
    }
  }, [userId, teamsLoaded, teamIds, queryClient])

  // Refetch all queries
  const refresh = () => {
    teamMembershipQuery.refetch()
    eventsQuery.refetch()
  }

  return {
    // Team Membership
    teamMembership: teamMembershipQuery.data,
    teamIds,

    // Calendar Data
    events: eventsQuery.data || [],

    // Loading States
    loading,
    isLoadingTeams,
    isLoadingEvents,

    // Error State
    error: error as Error | null,

    // Actions
    refresh,
  }
}
