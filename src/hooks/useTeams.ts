/**
 * useTeams Hooks
 *
 * Hooks สำหรับโหลด Teams ด้วย React Query
 *
 * Features:
 * - ใช้ React Query สำหรับ caching และ data fetching
 * - Cache อัตโนมัติ 3-5 นาที
 * - รองรับ realtime subscription
 * - Shared cache ข้ามหน้าต่างๆ
 * - 2 variants: withDetails (full data) และ listSimple (minimal data)
 */

import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { queryKeys } from '@/lib/query-keys'
import { teamQueryOptions } from '@/lib/queries/team-queries'
import type { TeamWithDetails, TeamListItem } from '@/types/team'

// ================================
// useTeamsWithDetails
// ================================

interface UseTeamsWithDetailsOptions {
  /** แสดง teams ที่ถูก archive หรือไม่ */
  showArchived?: boolean
  /** Enable realtime subscription หรือไม่ */
  enableRealtime?: boolean
}

interface UseTeamsWithDetailsReturn {
  /** รายการ teams ทั้งหมดพร้อม details */
  teams: TeamWithDetails[]
  /** กำลังโหลดหรือไม่ */
  loading: boolean
  /** Error message (ถ้ามี) */
  error: string | null
  /** Refresh teams manually */
  refresh: () => Promise<void>
}

/**
 * Hook สำหรับโหลด Teams พร้อม Full Details (for Teams management page)
 *
 * @example
 * ```tsx
 * const { teams, loading, error, refresh } = useTeamsWithDetails({
 *   showArchived: false,
 *   enableRealtime: true
 * })
 * ```
 */
export function useTeamsWithDetails(
  options: UseTeamsWithDetailsOptions = {}
): UseTeamsWithDetailsReturn {
  const { showArchived = false, enableRealtime = true } = options
  const queryClient = useQueryClient()

  // Fetch teams with details
  const {
    data: teams = [],
    isLoading: loading,
    error,
    refetch,
  } = useQuery(teamQueryOptions.withDetails(showArchived))

  // Realtime subscription - invalidate queries when teams/members/reviews change
  useEffect(() => {
    if (!enableRealtime) return

    const teamsChannel = supabase
      .channel('teams-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'teams',
        },
        () => {
          queryClient.invalidateQueries({ queryKey: queryKeys.teams.all })
        }
      )
      .subscribe()

    const membersChannel = supabase
      .channel('team-members-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'team_members',
        },
        () => {
          queryClient.invalidateQueries({ queryKey: queryKeys.teams.all })
        }
      )
      .subscribe()

    const reviewsChannel = supabase
      .channel('team-reviews-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'reviews',
        },
        () => {
          // Invalidate teams queries when reviews change (affects ratings)
          queryClient.invalidateQueries({ queryKey: queryKeys.teams.all })
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(teamsChannel)
      supabase.removeChannel(membersChannel)
      supabase.removeChannel(reviewsChannel)
    }
  }, [queryClient, enableRealtime, showArchived])

  // Refresh function - refetch current query
  const refresh = async () => {
    await refetch()
  }

  return {
    teams,
    loading,
    error: error?.message || null,
    refresh,
  }
}

// ================================
// useTeamsList
// ================================

interface UseTeamsListOptions {
  /** Enable realtime subscription หรือไม่ */
  enableRealtime?: boolean
}

interface UseTeamsListReturn {
  /** รายการ teams แบบ minimal (for dropdowns) */
  teamsList: TeamListItem[]
  /** กำลังโหลดหรือไม่ */
  loading: boolean
  /** Error message (ถ้ามี) */
  error: string | null
  /** Refresh teams list manually */
  refresh: () => Promise<void>
}

/**
 * Hook สำหรับโหลด Teams List แบบ minimal (for dropdowns in Dashboard, Bookings, Calendar)
 *
 * @example
 * ```tsx
 * const { teamsList, loading } = useTeamsList({ enableRealtime: false })
 * ```
 */
export function useTeamsList(options: UseTeamsListOptions = {}): UseTeamsListReturn {
  const { enableRealtime = true } = options
  const queryClient = useQueryClient()

  // Fetch teams list (minimal data)
  const {
    data: teamsList = [],
    isLoading: loading,
    error,
    refetch,
  } = useQuery(teamQueryOptions.listSimple())

  // Realtime subscription - invalidate when teams change
  useEffect(() => {
    if (!enableRealtime) return

    const channel = supabase
      .channel('teams-list-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'teams',
        },
        () => {
          // Invalidate teams list queries
          queryClient.invalidateQueries({ queryKey: queryKeys.teams.all })
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [queryClient, enableRealtime])

  // Refresh function
  const refresh = async () => {
    await refetch()
  }

  return {
    teamsList,
    loading,
    error: error?.message || null,
    refresh,
  }
}
