/**
 * Team Query Functions
 *
 * React Query functions สำหรับ Teams
 *
 * Features:
 * - Automatic caching (3-5 minutes stale time)
 * - Support with/without details (members, lead, ratings)
 * - Shared cache across pages
 * - Type-safe query keys
 * - Soft delete support
 */

import { supabase } from '@/lib/supabase'
import { queryKeys } from '@/lib/query-keys'
import type { TeamWithDetails, TeamListItem, TeamMember } from '@/types/team'

/**
 * Fetch Teams with Full Details
 *
 * ดึง teams ทั้งหมดพร้อม team_lead, members, ratings
 * ใช้สำหรับหน้า Teams management
 *
 * @param showArchived - แสดง teams ที่ถูก archive หรือไม่
 * @returns Promise<TeamWithDetails[]>
 */
export async function fetchTeamsWithDetails(
  showArchived: boolean = false
): Promise<TeamWithDetails[]> {
  // Fetch teams with member count and team lead
  // Note: team_members includes left_at for soft delete filtering
  let query = supabase
    .from('teams')
    .select(`
      id,
      name,
      description,
      created_at,
      deleted_at,
      team_lead_id,
      team_lead:profiles!teams_team_lead_id_fkey (
        id,
        full_name,
        email,
        phone,
        avatar_url,
        role
      ),
      team_members (
        id,
        is_active,
        left_at,
        profiles (
          id,
          full_name,
          email,
          phone,
          avatar_url,
          role
        )
      )
    `)

  // Filter by archived status
  if (!showArchived) {
    query = query.is('deleted_at', null)
  }

  const { data: teamsData, error: teamsError } = await query.order('created_at', {
    ascending: false,
  })

  if (teamsError) throw new Error(`Failed to fetch teams: ${teamsError.message}`)

  interface TeamData {
    id: string
    name: string
    description: string | null
    created_at: string
    deleted_at: string | null
    team_lead_id: string | null
    team_lead: TeamMember[] | TeamMember | null
    team_members: Array<{
      id: string
      is_active: boolean
      left_at: string | null
      profiles: TeamMember[] | TeamMember
    }> | null
  }

  const formattedTeams: TeamWithDetails[] = (teamsData || []).map((team: TeamData) => {
    // Handle team_lead as array or single object
    const teamLead = Array.isArray(team.team_lead) ? team.team_lead[0] : team.team_lead

    // Filter out members who have left (soft deleted) - only show active members
    const activeMembers = team.team_members?.filter((tm) => tm.left_at === null) || []

    return {
      id: team.id,
      name: team.name,
      description: team.description,
      created_at: team.created_at,
      deleted_at: team.deleted_at,
      team_lead_id: team.team_lead_id,
      team_lead: teamLead,
      member_count: activeMembers.length,
      members: activeMembers
        .map((tm) => {
          // Handle profiles as array or single object
          const profile = Array.isArray(tm.profiles) ? tm.profiles[0] : tm.profiles
          return {
            ...profile,
            is_active: tm.is_active,
            membership_id: tm.id,
          }
        })
        .filter(Boolean),
      average_rating: undefined,
    }
  })

  // Fetch ratings for all teams
  const teamIds = formattedTeams.map((t) => t.id)
  if (teamIds.length > 0) {
    const { data: ratingsData } = await supabase
      .from('reviews')
      .select('rating, bookings!inner(team_id)')
      .in('bookings.team_id', teamIds)

    // Calculate average rating for each team
    const teamRatings: Record<string, number[]> = {}

    interface ReviewData {
      rating: number
      bookings: { team_id: string } | { team_id: string }[]
    }

    ratingsData?.forEach((review: ReviewData) => {
      const bookings = Array.isArray(review.bookings) ? review.bookings[0] : review.bookings
      if (bookings && bookings.team_id) {
        const teamId = bookings.team_id
        if (!teamRatings[teamId]) {
          teamRatings[teamId] = []
        }
        teamRatings[teamId].push(review.rating)
      }
    })

    // Add average rating to teams
    formattedTeams.forEach((team) => {
      const ratings = teamRatings[team.id]
      if (ratings && ratings.length > 0) {
        team.average_rating = ratings.reduce((a, b) => a + b, 0) / ratings.length
      }
    })
  }

  return formattedTeams
}

/**
 * Fetch Teams List (Simple - for dropdowns)
 *
 * ดึง teams แบบ minimal data สำหรับ dropdowns ใน Dashboard, Bookings, Calendar
 *
 * @returns Promise<TeamListItem[]>
 */
export async function fetchTeamsList(): Promise<TeamListItem[]> {
  const { data, error } = await supabase
    .from('teams')
    .select('id, name')
    .is('deleted_at', null)
    .order('name')

  if (error) throw new Error(`Failed to fetch teams list: ${error.message}`)

  return (data || []) as TeamListItem[]
}

/**
 * Fetch Single Team Detail
 *
 * ดึงข้อมูล team เดียวพร้อม full details
 *
 * @param id - Team ID
 * @returns Promise<TeamWithDetails>
 */
export async function fetchTeamDetail(id: string): Promise<TeamWithDetails> {
  // Note: team_members includes left_at for soft delete filtering
  const { data: team, error } = await supabase
    .from('teams')
    .select(`
      id,
      name,
      description,
      created_at,
      deleted_at,
      team_lead_id,
      team_lead:profiles!teams_team_lead_id_fkey (
        id,
        full_name,
        email,
        phone,
        avatar_url,
        role
      ),
      team_members (
        id,
        is_active,
        left_at,
        profiles (
          id,
          full_name,
          email,
          phone,
          avatar_url,
          role
        )
      )
    `)
    .eq('id', id)
    .single()

  if (error) throw new Error(`Failed to fetch team detail: ${error.message}`)

  interface TeamData {
    id: string
    name: string
    description: string | null
    created_at: string
    deleted_at: string | null
    team_lead_id: string | null
    team_lead: TeamMember[] | TeamMember | null
    team_members: Array<{
      id: string
      is_active: boolean
      left_at: string | null
      profiles: TeamMember[] | TeamMember
    }> | null
  }

  const teamData = team as TeamData

  // Handle team_lead as array or single object
  const teamLead = Array.isArray(teamData.team_lead)
    ? teamData.team_lead[0]
    : teamData.team_lead

  // Filter out members who have left (soft deleted) - only show active members
  const activeMembers = teamData.team_members?.filter((tm) => tm.left_at === null) || []

  const formattedTeam: TeamWithDetails = {
    id: teamData.id,
    name: teamData.name,
    description: teamData.description,
    created_at: teamData.created_at,
    deleted_at: teamData.deleted_at,
    team_lead_id: teamData.team_lead_id,
    team_lead: teamLead,
    member_count: activeMembers.length,
    members: activeMembers
      .map((tm) => {
        const profile = Array.isArray(tm.profiles) ? tm.profiles[0] : tm.profiles
        return {
          ...profile,
          is_active: tm.is_active,
          membership_id: tm.id,
        }
      })
      .filter(Boolean),
  }

  // Fetch ratings for this team
  const { data: ratingsData } = await supabase
    .from('reviews')
    .select('rating, bookings!inner(team_id)')
    .eq('bookings.team_id', id)

  if (ratingsData && ratingsData.length > 0) {
    const ratings = ratingsData.map((r: { rating: number }) => r.rating)
    formattedTeam.average_rating = ratings.reduce((a, b) => a + b, 0) / ratings.length
  }

  return formattedTeam
}

/**
 * Query Options สำหรับ Teams
 */
export const teamQueryOptions = {
  /**
   * Teams list with full details (for Teams management page)
   */
  withDetails: (showArchived: boolean = false) => ({
    queryKey: queryKeys.teams.withDetails(showArchived),
    queryFn: () => fetchTeamsWithDetails(showArchived),
    staleTime: 3 * 60 * 1000, // 3 minutes
  }),

  /**
   * Simple teams list (for dropdowns)
   */
  listSimple: () => ({
    queryKey: queryKeys.teams.listSimple(),
    queryFn: () => fetchTeamsList(),
    staleTime: 5 * 60 * 1000, // 5 minutes (reference data)
  }),

  /**
   * Single team detail
   */
  detail: (id: string) => ({
    queryKey: queryKeys.teams.detail(id),
    queryFn: () => fetchTeamDetail(id),
    staleTime: 3 * 60 * 1000, // 3 minutes
  }),
}
