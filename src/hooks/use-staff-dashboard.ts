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
import { BookingStatus } from '@/types/booking'

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
  revertToInProgress: (bookingId: string) => Promise<void>

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
  // Get ALL membership periods for filtering team bookings (supports re-join with multiple periods)
  const allMembershipPeriods = useMemo(() => teamMembershipQuery.data?.allMembershipPeriods || [], [teamMembershipQuery.data?.allMembershipPeriods])
  const teamsLoaded = teamMembershipQuery.isSuccess

  // Step 2: Fetch bookings (enabled only after teams loaded)
  // Pass allMembershipPeriods to filter bookings - staff only sees bookings from their membership periods
  const todayQuery = useQuery({
    ...staffBookingsQueryOptions.today(userId, teamIds, allMembershipPeriods),
    enabled: !!userId && teamsLoaded,
  })

  const upcomingQuery = useQuery({
    ...staffBookingsQueryOptions.upcoming(userId, teamIds, allMembershipPeriods),
    enabled: !!userId && teamsLoaded,
  })

  const completedQuery = useQuery({
    ...staffBookingsQueryOptions.completed(userId, teamIds, allMembershipPeriods),
    enabled: !!userId && teamsLoaded,
  })

  // Step 3: Fetch statistics (enabled only after teams loaded)
  // Pass allMembershipPeriods to filter earnings - staff only earns from bookings in their membership periods
  const statsQuery = useQuery({
    ...staffBookingsQueryOptions.stats(userId, teamIds, allMembershipPeriods),
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
  // Note: We fetch latest membership data inside callback to avoid race condition
  // when membership changes cause re-subscription and potentially miss events
  useEffect(() => {
    if (!userId || !teamsLoaded) return

    logger.debug('Setting up real-time subscription', { userId }, { context: 'StaffDashboard' })

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
          const booking = payload.new as { staff_id?: string; team_id?: string; created_at?: string } | null
          const oldBooking = payload.old as { staff_id?: string; team_id?: string; created_at?: string } | null

          // For DELETE events, check old booking data
          const relevantBooking = booking || oldBooking

          // Check if this booking is relevant to this staff
          const isMyBooking = relevantBooking?.staff_id === userId

          // Get LATEST membership data from cache to avoid race condition
          // This ensures we use current membership data even if it changed since subscription started
          const latestMembership = queryClient.getQueryData(
            queryKeys.staffBookings.teamMembership(userId)
          ) as TeamMembership | undefined

          const currentTeamIds = latestMembership?.teamIds || []
          const currentPeriods = latestMembership?.allMembershipPeriods || []

          // For team bookings, also check if staff was a member when booking was created
          let isMyTeamBooking = false
          if (relevantBooking?.team_id && currentTeamIds.includes(relevantBooking.team_id)) {
            // Get membership periods for this team
            const periodsForTeam = currentPeriods.filter(p => p.teamId === relevantBooking.team_id)

            if (periodsForTeam.length > 0 && relevantBooking.created_at) {
              const bookingCreatedAt = new Date(relevantBooking.created_at)

              // Check if booking was created during ANY of the membership periods
              isMyTeamBooking = periodsForTeam.some(period => {
                const staffJoinedAt = new Date(period.joinedAt)
                const staffLeftAt = period.leftAt ? new Date(period.leftAt) : null

                // Booking must be created AFTER staff joined
                if (bookingCreatedAt < staffJoinedAt) return false

                // Booking must be created BEFORE staff left (if they left)
                if (staffLeftAt && bookingCreatedAt > staffLeftAt) return false

                return true
              })
            }
          }

          if (!isMyBooking && !isMyTeamBooking) {
            // Not relevant to this staff (either not their booking or outside membership period)
            return
          }
          logger.debug('Real-time update received', { event: payload.eventType }, { context: 'StaffDashboard' })

          // Use moderate delay for UPDATE events to avoid conflict with mutations
          const delay = payload.eventType === 'UPDATE' ? 300 : 100

          setTimeout(async () => {
            // IMPORTANT: Invalidate teamMembership FIRST to ensure fresh membership data
            // Then wait a bit for React Query to refetch before invalidating bookings
            // This prevents stale closure issue where queryFn uses old allMembershipPeriods
            await queryClient.invalidateQueries({ queryKey: queryKeys.staffBookings.teamMembership(userId) })

            // Wait for membership refetch to complete before invalidating bookings
            await queryClient.refetchQueries({ queryKey: queryKeys.staffBookings.teamMembership(userId) })

            // Now invalidate ALL staff bookings queries using partial key match
            // This ensures all queries with any membershipHash are invalidated
            // The useQuery hooks will automatically refetch with current allMembershipPeriods
            queryClient.invalidateQueries({
              queryKey: ['staff-bookings'],
              predicate: (query) => {
                const key = query.queryKey as string[]
                // Match queries for this user
                return key.includes(userId)
              }
            })
          }, delay)
        }
      )
      .subscribe()

    return () => {
      logger.debug('Cleaning up real-time subscription', {}, { context: 'StaffDashboard' })
      supabase.removeChannel(channel)
    }
  }, [userId, teamsLoaded, queryClient]) // Removed teamIds and allMembershipPeriods to avoid re-subscription

  // Helper to get current queryKey for today bookings (includes membershipHash)
  const getTodayQueryKey = () => staffBookingsQueryOptions.today(userId, teamIds, allMembershipPeriods).queryKey

  // Helper to invalidate all staff bookings queries for this user
  const invalidateStaffBookings = () => {
    queryClient.invalidateQueries({
      queryKey: ['staff-bookings'],
      predicate: (query) => {
        const key = query.queryKey as string[]
        return key.includes(userId)
      }
    })
  }

  // Mutation: Start Progress
  const startProgressMutation = useMutation({
    mutationFn: async (bookingId: string) => {
      logger.debug('Starting mutation: updating booking to in_progress', { bookingId }, { context: 'StaffDashboard' })

      const { error } = await supabase
        .from('bookings')
        .update({ status: BookingStatus.InProgress })
        .eq('id', bookingId)

      if (error) {
        logger.error('Failed to update booking status', { error, bookingId }, { context: 'StaffDashboard' })
        throw error
      }

      logger.debug('Booking status updated to in_progress', { bookingId }, { context: 'StaffDashboard' })
    },
    onMutate: async (bookingId) => {
      const todayKey = getTodayQueryKey()
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: todayKey })

      // Snapshot previous value
      const previousBookings = queryClient.getQueryData(todayKey)

      // Optimistically update cache
      queryClient.setQueryData(
        todayKey,
        (old: StaffBooking[] | undefined) =>
          old?.map((b) => (b.id === bookingId ? { ...b, status: BookingStatus.InProgress } : b))
      )

      logger.debug('Optimistically updated booking status', { bookingId }, { context: 'StaffDashboard' })

      return { previousBookings, todayKey }
    },
    onError: (error, bookingId, context) => {
      logger.error('Mutation error', { error, bookingId }, { context: 'StaffDashboard' })
      // Rollback on error
      if (context?.previousBookings && context?.todayKey) {
        queryClient.setQueryData(
          context.todayKey,
          context.previousBookings
        )
        logger.debug('Rolled back booking status update', { bookingId }, { context: 'StaffDashboard' })
      }
    },
    onSettled: async () => {
      // Increased delay to ensure DB update is committed before refetch
      await new Promise(resolve => setTimeout(resolve, 300))
      // Invalidate all staff bookings queries
      invalidateStaffBookings()
    },
  })

  // Mutation: Mark as Completed
  const markAsCompletedMutation = useMutation({
    mutationFn: async (bookingId: string) => {
      const { error } = await supabase
        .from('bookings')
        .update({ status: BookingStatus.Completed })
        .eq('id', bookingId)

      if (error) throw error

      logger.debug('Booking status updated to completed', { bookingId }, { context: 'StaffDashboard' })
    },
    onMutate: async (bookingId) => {
      const todayKey = getTodayQueryKey()
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: todayKey })

      // Snapshot previous value
      const previousBookings = queryClient.getQueryData(todayKey)

      // Optimistically update cache
      queryClient.setQueryData(
        todayKey,
        (old: StaffBooking[] | undefined) =>
          old?.map((b) => (b.id === bookingId ? { ...b, status: BookingStatus.Completed } : b))
      )

      logger.debug('Optimistically updated booking status to completed', { bookingId }, { context: 'StaffDashboard' })

      return { previousBookings, todayKey }
    },
    onError: (error, bookingId, context) => {
      logger.error('Mutation error', { error, bookingId }, { context: 'StaffDashboard' })
      // Rollback on error
      if (context?.previousBookings && context?.todayKey) {
        queryClient.setQueryData(
          context.todayKey,
          context.previousBookings
        )
        logger.debug('Rolled back booking status update', { bookingId }, { context: 'StaffDashboard' })
      }
    },
    onSettled: async () => {
      // Small delay to ensure DB update is committed before refetch
      await new Promise(resolve => setTimeout(resolve, 100))
      // Invalidate all staff bookings queries
      invalidateStaffBookings()
    },
  })

  // Mutation: Revert to In Progress (for Undo)
  // M2 note: RLS policies on bookings table control update access
  // Staff can only update bookings assigned to them (staff_id) or their team (team_id)
  // Same RLS applies as markAsCompleted - no additional check needed
  const revertToInProgressMutation = useMutation({
    mutationFn: async (bookingId: string) => {
      const { error } = await supabase
        .from('bookings')
        .update({ status: BookingStatus.InProgress })
        .eq('id', bookingId)

      if (error) throw error

      logger.debug('Booking status reverted to in_progress', { bookingId }, { context: 'StaffDashboard' })
    },
    onMutate: async (bookingId) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['staff-bookings'] })

      // Snapshot all staff-bookings caches for rollback
      const previousData = queryClient.getQueriesData<StaffBooking[]>({
        queryKey: ['staff-bookings'],
      })

      // Optimistically update across ALL tabs
      queryClient.setQueriesData<StaffBooking[]>(
        {
          queryKey: ['staff-bookings'],
          predicate: (query) => Array.isArray(query.state.data),
        },
        (old) => old?.map((b) => (b.id === bookingId ? { ...b, status: BookingStatus.InProgress } : b))
      )

      logger.debug('Optimistically reverted booking status', { bookingId }, { context: 'StaffDashboard' })

      return { previousData }
    },
    onError: (_error, _bookingId, context) => {
      // Rollback ALL caches on error
      context?.previousData?.forEach(([key, data]) => {
        queryClient.setQueryData(key, data)
      })
      logger.debug('Rolled back revertToInProgress optimistic update', {}, { context: 'StaffDashboard' })
    },
    onSettled: async () => {
      await new Promise(resolve => setTimeout(resolve, 100))
      invalidateStaffBookings()
    },
  })

  // Mutation: Add Notes (with optimistic update for all staff-bookings caches)
  const addNotesMutation = useMutation({
    mutationFn: async ({ bookingId, notes }: { bookingId: string; notes: string }) => {
      const { error } = await supabase
        .from('bookings')
        .update({ notes })
        .eq('id', bookingId)

      if (error) throw error

      logger.debug('Booking notes updated', { bookingId }, { context: 'StaffDashboard' })
    },
    onMutate: async ({ bookingId, notes }) => {
      // Cancel all staff-bookings queries to avoid overwriting optimistic update
      await queryClient.cancelQueries({ queryKey: ['staff-bookings'] })

      // Snapshot ALL staff-bookings caches for rollback
      const previousData = queryClient.getQueriesData<StaffBooking[]>({
        queryKey: ['staff-bookings'],
      })

      // Optimistically update across ALL tabs (today, upcoming, past)
      // Use predicate to only update array caches (avoid stats/count caches)
      queryClient.setQueriesData<StaffBooking[]>(
        {
          queryKey: ['staff-bookings'],
          predicate: (query) => Array.isArray(query.state.data),
        },
        (old) => old?.map((b) => (b.id === bookingId ? { ...b, notes } : b))
      )

      return { previousData }
    },
    onError: (_error, _vars, context) => {
      // Rollback ALL caches on error
      context?.previousData?.forEach(([key, data]) => {
        queryClient.setQueryData(key, data)
      })
      logger.debug('Rolled back addNotes optimistic update', {}, { context: 'StaffDashboard' })
    },
    onSettled: () => {
      // Invalidate all staff bookings queries to sync with server
      invalidateStaffBookings()
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
    revertToInProgress: (bookingId: string) => revertToInProgressMutation.mutateAsync(bookingId),

    // Actions
    refetch,
  }
}
