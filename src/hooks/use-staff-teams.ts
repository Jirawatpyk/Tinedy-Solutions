/**
 * useStaffTeams Hook
 *
 * Hook for Staff Profile page — fetches teams the staff belongs to.
 * Wraps staffTeamsQueryOptions with React Query.
 *
 * Usage:
 * ```tsx
 * const { teams, isLoading } = useStaffTeams()
 * ```
 */

import { useQuery } from '@tanstack/react-query'
import { useAuth } from '@/contexts/auth-context'
import { staffTeamsQueryOptions } from '@/lib/queries/staff-teams-queries'
import type { StaffTeamDetail } from '@/types/team'

export interface UseStaffTeamsReturn {
  teams: StaffTeamDetail[]
  isLoading: boolean
  error: Error | null
}

export function useStaffTeams(): UseStaffTeamsReturn {
  const { user } = useAuth()
  const userId = user?.id || ''

  const { data, isLoading, error } = useQuery({
    ...staffTeamsQueryOptions.details(userId),
    enabled: !!userId,
  })

  return {
    teams: data || [],
    isLoading,
    error: error as Error | null,
  }
}
