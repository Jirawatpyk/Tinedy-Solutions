/**
 * Staff Teams Query Functions
 *
 * Query functions for Staff Portal "My Teams" section (Profile page).
 * Fetches team details with members via RPC to bypass RLS on profiles table.
 *
 * Uses RPC `get_all_team_members_with_dates` (same as booking-details-modal)
 * because staff RLS only allows reading own profile.
 */

import { supabase } from '@/lib/supabase'
import { queryKeys } from '@/lib/query-keys'
import { logger } from '@/lib/logger'
import type { StaffTeamDetail, StaffTeamMember } from '@/types/team'

// Re-export types for convenience
export type { StaffTeamDetail, StaffTeamMember }

// ============================================================================
// RPC RESPONSE TYPE
// ============================================================================

interface RpcTeamMember {
  staff_id: string
  full_name: string
  avatar_url?: string | null
  left_at: string | null
}

// ============================================================================
// QUERY FUNCTION
// ============================================================================

/**
 * Fetch team details for the staff's profile page.
 *
 * Steps:
 * 1. Get active memberships from team_members (left_at IS NULL)
 * 2. Get team basic info from teams table
 * 3. Get members via RPC (bypasses RLS on profiles)
 * 4. Determine leader status from teams.team_lead_id
 */
export async function fetchStaffTeamDetails(userId: string): Promise<StaffTeamDetail[]> {
  try {
    // Step 1: Get active memberships
    const { data: memberships, error: memberError } = await supabase
      .from('team_members')
      .select('team_id, joined_at')
      .eq('staff_id', userId)
      .is('left_at', null)

    if (memberError) throw memberError
    if (!memberships || memberships.length === 0) return []

    const teamIds = memberships.map(m => m.team_id)

    // Step 2: Get team basic info (no profile joins — RLS would block)
    const { data: teams, error: teamsError } = await supabase
      .from('teams')
      .select('id, name, description, is_active, team_lead_id')
      .in('id', teamIds)
      .is('deleted_at', null)

    if (teamsError) throw teamsError
    if (!teams || teams.length === 0) return []

    // Step 3: Get members via RPC for each team (parallel)
    const memberResults = await Promise.all(
      teams.map(team =>
        supabase.rpc('get_all_team_members_with_dates', { p_team_id: team.id })
      )
    )

    // Step 4: Map to StaffTeamDetail
    return teams.map((team, index) => {
      const membership = memberships.find(m => m.team_id === team.id)
      const rpcData = memberResults[index].data || []

      const activeMembers: StaffTeamMember[] = rpcData
        .filter((m: RpcTeamMember) => m.left_at === null)
        .map((m: RpcTeamMember) => ({
          id: m.staff_id,
          full_name: m.full_name || 'Unknown',
          avatar_url: m.avatar_url || null,
        }))

      const teamLead = team.team_lead_id
        ? activeMembers.find(m => m.id === team.team_lead_id) || null
        : null

      return {
        id: team.id,
        name: team.name,
        description: team.description,
        is_active: team.is_active,
        role: team.team_lead_id === userId ? 'leader' : 'member',
        joined_at: membership?.joined_at || '',
        team_lead: teamLead,
        members: activeMembers,
      } satisfies StaffTeamDetail
    })
  } catch (err) {
    logger.error('Error fetching staff team details', { error: err, userId }, { context: 'StaffTeams' })
    return []
  }
}

// ============================================================================
// QUERY OPTIONS
// ============================================================================

export const staffTeamsQueryOptions = {
  details: (userId: string) => ({
    queryKey: queryKeys.staffTeams.details(userId),
    queryFn: () => fetchStaffTeamDetails(userId),
    staleTime: 10 * 60 * 1000, // 10 minutes — team membership changes infrequently
    enabled: !!userId,
  }),
}
