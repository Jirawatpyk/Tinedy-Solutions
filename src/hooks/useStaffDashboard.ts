/**
 * useStaffDashboard Hook
 *
 * Combined hook for Staff Portal "My Bookings" dashboard.
 * Replaces use-staff-bookings.ts (587 lines → ~80 lines)
 *
 * Features:
 * - Fetches team membership
 * - Fetches today/upcoming/completed bookings
 * - Fetches statistics (6 metrics)
 * - Real-time subscriptions
 * - Mutations (start progress, mark completed, add notes)
 *
 * Pattern: Same as useReportStats (Phase 2 migration)
 */

import { useEffect, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/contexts/auth-context'
import { supabase } from '@/lib/supabase'
import { queryKeys } from '@/lib/query-keys'
import { logger } from '@/lib/logger'
import {
  staffBookingsQueryOptions,
  type StaffBooking,
  type TeamMembership,
  type StaffStats,
} from '@/lib/queries/staff-bookings-queries'

// ============================================================================
// HOOK INTERFACE
// ============================================================================

export interface UseStaffDashboardReturn {
  // Team Membership
  teamMembership: TeamMembership | undefined
  teamIds: string[]

  // Bookings Data
  todayBookings: StaffBooking[]
  upcomingBookings: StaffBooking[]
  completedBookings: StaffBooking[]

  // Statistics
  stats: StaffStats | undefined

  // Loading States
  isLoading: boolean
  isLoadingTeams: boolean
  isLoadingBookings: boolean
  isLoadingStats: boolean

  // Error State
  error: Error | null

  // Mutations
  startProgress: (bookingId: string) => Promise<void>
  markAsCompleted: (bookingId: string) => Promise<void>
  addNotes: (bookingId: string, notes: string) => Promise<void>

  // Actions
  refetch: () => Promise<void>
}

// ============================================================================
// MAIN HOOK
// ============================================================================

/**
 * Hook for Staff Dashboard data
 *
 * @example
 * ```tsx
 * function StaffDashboard() {
 *   const {
 *     todayBookings,
 *     upcomingBookings,
 *     stats,
 *     isLoading,
 *     startProgress,
 *     markAsCompleted,
 *   } = useStaffDashboard()
 *
 *   if (isLoading) return <div>Loading...</div>
 *
 *   return <div>...</div>
 * }
 * ```
 */
export function useStaffDashboard(): UseStaffDashboardReturn {
  const { user } = useAuth()
  const queryClient = useQueryClient()

  const userId = user?.id || ''

  // Step 1: Fetch team membership first (required for other queries)
  const teamMembershipQuery = useQuery({
    ...staffBookingsQueryOptions.teamMembership(userId),
    enabled: !!userId,
  })

  const teamIds = useMemo(() => teamMembershipQuery.data?.teamIds || [], [teamMembershipQuery.data?.teamIds])
  const teamsLoaded = teamMembershipQuery.isSuccess

  // Step 2: Fetch bookings (enabled only after teams loaded)
  const todayQuery = useQuery({
    ...staffBookingsQueryOptions.today(userId, teamIds),
    enabled: !!userId && teamsLoaded,
  })

  const upcomingQuery = useQuery({
    ...staffBookingsQueryOptions.upcoming(userId, teamIds),
    enabled: !!userId && teamsLoaded,
  })

  const completedQuery = useQuery({
    ...staffBookingsQueryOptions.completed(userId, teamIds),
    enabled: !!userId && teamsLoaded,
  })

  // Step 3: Fetch statistics (enabled only after teams loaded)
  const statsQuery = useQuery({
    ...staffBookingsQueryOptions.stats(userId, teamIds),
    enabled: !!userId && teamsLoaded,
  })

  // Combined loading states
  const isLoadingTeams = teamMembershipQuery.isLoading
  const isLoadingBookings =
    todayQuery.isLoading || upcomingQuery.isLoading || completedQuery.isLoading
  const isLoadingStats = statsQuery.isLoading
  const isLoading = isLoadingTeams || isLoadingBookings || isLoadingStats

  // Combined error state
  const error =
    teamMembershipQuery.error ||
    todayQuery.error ||
    upcomingQuery.error ||
    completedQuery.error ||
    statsQuery.error ||
    null

  // Real-time subscriptions
  useEffect(() => {
    if (!userId || !teamsLoaded) return

    logger.debug('Setting up real-time subscription', { userId, teamIds }, { context: 'StaffDashboard' })

    const channel = supabase
      .channel('staff-bookings')
      .on(
        'postgres_changes',
        {
          event: '*', // INSERT, UPDATE, DELETE
          schema: 'public',
          table: 'bookings',
          // No filter - listen to all booking changes, then filter in callback
        },
        (payload) => {
          // Filter relevant bookings in callback
          const booking = payload.new as { staff_id?: string; team_id?: string } | null
          const oldBooking = payload.old as { staff_id?: string; team_id?: string } | null

          // For DELETE events, check old booking data
          const relevantBooking = booking || oldBooking

          // Check if this booking is relevant to this staff
          const isMyBooking = relevantBooking?.staff_id === userId
          const isMyTeamBooking = relevantBooking?.team_id && teamIds.includes(relevantBooking.team_id)

          if (!isMyBooking && !isMyTeamBooking) {
            // Not relevant to this staff, skip
            return
          }

          logger.debug('Real-time update received', { event: payload.eventType }, { context: 'StaffDashboard' })

          // Use moderate delay for UPDATE events to avoid conflict with mutations
          // Reduced from 1000ms to 300ms to improve UX while maintaining safety
          const delay = payload.eventType === 'UPDATE' ? 300 : 100

          logger.debug(`Scheduling invalidation with ${delay}ms delay`, { eventType: payload.eventType }, { context: 'StaffDashboard' })

          setTimeout(() => {
            // Invalidate all bookings queries to refetch
            queryClient.invalidateQueries({ queryKey: queryKeys.staffBookings.today(userId, teamIds) })
            queryClient.invalidateQueries({ queryKey: queryKeys.staffBookings.upcoming(userId, teamIds) })
            queryClient.invalidateQueries({ queryKey: queryKeys.staffBookings.completed(userId, teamIds) })
            queryClient.invalidateQueries({ queryKey: queryKeys.staffBookings.stats(userId, teamIds) })
          }, delay)
        }
      )
      .subscribe()

    return () => {
      logger.debug('Cleaning up real-time subscription', {}, { context: 'StaffDashboard' })
      supabase.removeChannel(channel)
    }
  }, [userId, teamsLoaded, teamIds, queryClient])

  // Mutation: Start Progress
  const startProgressMutation = useMutation({
    mutationFn: async (bookingId: string) => {
      logger.debug('Starting mutation: updating booking to in_progress', { bookingId }, { context: 'StaffDashboard' })

      const { error } = await supabase
        .from('bookings')
        .update({ status: 'in_progress' })
        .eq('id', bookingId)

      if (error) {
        logger.error('Failed to update booking status', { error, bookingId }, { context: 'StaffDashboard' })
        throw error
      }

      logger.debug('Booking status updated to in_progress', { bookingId }, { context: 'StaffDashboard' })
    },
    onMutate: async (bookingId) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: queryKeys.staffBookings.today(userId, teamIds) })

      // Snapshot previous value
      const previousBookings = queryClient.getQueryData(queryKeys.staffBookings.today(userId, teamIds))

      // Optimistically update cache
      queryClient.setQueryData(
        queryKeys.staffBookings.today(userId, teamIds),
        (old: StaffBooking[] | undefined) =>
          old?.map((b) => (b.id === bookingId ? { ...b, status: 'in_progress' as const } : b))
      )

      logger.debug('Optimistically updated booking status', { bookingId }, { context: 'StaffDashboard' })

      return { previousBookings }
    },
    onError: (error, bookingId, context) => {
      logger.error('Mutation error', { error, bookingId }, { context: 'StaffDashboard' })
      // Rollback on error
      if (context?.previousBookings) {
        queryClient.setQueryData(
          queryKeys.staffBookings.today(userId, teamIds),
          context.previousBookings
        )
        logger.debug('Rolled back booking status update', { bookingId }, { context: 'StaffDashboard' })
      }
    },
    onSettled: async () => {
      // Increased delay to ensure DB update is committed before refetch
      await new Promise(resolve => setTimeout(resolve, 300))
      // Always refetch after mutation
      queryClient.invalidateQueries({ queryKey: queryKeys.staffBookings.today(userId, teamIds) })
      queryClient.invalidateQueries({ queryKey: queryKeys.staffBookings.stats(userId, teamIds) })
    },
  })

  // Mutation: Mark as Completed
  const markAsCompletedMutation = useMutation({
    mutationFn: async (bookingId: string) => {
      const { error } = await supabase
        .from('bookings')
        .update({ status: 'completed' })
        .eq('id', bookingId)

      if (error) throw error

      logger.debug('Booking status updated to completed', { bookingId }, { context: 'StaffDashboard' })
    },
    onMutate: async (bookingId) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: queryKeys.staffBookings.today(userId, teamIds) })

      // Snapshot previous value
      const previousBookings = queryClient.getQueryData(queryKeys.staffBookings.today(userId, teamIds))

      // Optimistically update cache
      queryClient.setQueryData(
        queryKeys.staffBookings.today(userId, teamIds),
        (old: StaffBooking[] | undefined) =>
          old?.map((b) => (b.id === bookingId ? { ...b, status: 'completed' as const } : b))
      )

      logger.debug('Optimistically updated booking status to completed', { bookingId }, { context: 'StaffDashboard' })

      return { previousBookings }
    },
    onError: (error, bookingId, context) => {
      logger.error('Mutation error', { error, bookingId }, { context: 'StaffDashboard' })
      // Rollback on error
      if (context?.previousBookings) {
        queryClient.setQueryData(
          queryKeys.staffBookings.today(userId, teamIds),
          context.previousBookings
        )
        logger.debug('Rolled back booking status update', { bookingId }, { context: 'StaffDashboard' })
      }
    },
    onSettled: async () => {
      // Small delay to ensure DB update is committed before refetch
      await new Promise(resolve => setTimeout(resolve, 100))
      // Always refetch after mutation
      queryClient.invalidateQueries({ queryKey: queryKeys.staffBookings.today(userId, teamIds) })
      queryClient.invalidateQueries({ queryKey: queryKeys.staffBookings.completed(userId, teamIds) })
      queryClient.invalidateQueries({ queryKey: queryKeys.staffBookings.stats(userId, teamIds) })
    },
  })

  // Mutation: Add Notes
  const addNotesMutation = useMutation({
    mutationFn: async ({ bookingId, notes }: { bookingId: string; notes: string }) => {
      const { error } = await supabase
        .from('bookings')
        .update({ notes })
        .eq('id', bookingId)

      if (error) throw error

      logger.debug('Booking notes updated', { bookingId }, { context: 'StaffDashboard' })
    },
    onSuccess: () => {
      // Invalidate queries to refetch
      queryClient.invalidateQueries({ queryKey: queryKeys.staffBookings.today(userId, teamIds) })
      queryClient.invalidateQueries({ queryKey: queryKeys.staffBookings.upcoming(userId, teamIds) })
      queryClient.invalidateQueries({ queryKey: queryKeys.staffBookings.completed(userId, teamIds) })
    },
  })

  // Refetch all queries
  const refetch = async () => {
    await Promise.all([
      teamMembershipQuery.refetch(),
      todayQuery.refetch(),
      upcomingQuery.refetch(),
      completedQuery.refetch(),
      statsQuery.refetch(),
    ])
  }

  return {
    // Team Membership
    teamMembership: teamMembershipQuery.data,
    teamIds,

    // Bookings Data
    todayBookings: todayQuery.data || [],
    upcomingBookings: upcomingQuery.data || [],
    completedBookings: completedQuery.data || [],

    // Statistics
    stats: statsQuery.data,

    // Loading States
    isLoading,
    isLoadingTeams,
    isLoadingBookings,
    isLoadingStats,

    // Error State
    error: error as Error | null,

    // Mutations
    startProgress: (bookingId: string) => startProgressMutation.mutateAsync(bookingId),
    markAsCompleted: (bookingId: string) => markAsCompletedMutation.mutateAsync(bookingId),
    addNotes: (bookingId: string, notes: string) => addNotesMutation.mutateAsync({ bookingId, notes }),

    // Actions
    refetch,
  }
}
