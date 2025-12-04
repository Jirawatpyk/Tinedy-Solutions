import { supabase } from './supabase'

/**
 * Cache team member counts for efficient revenue calculation
 * @param teamIds - Array of unique team IDs
 * @returns Map of team_id to member count
 */
export async function getTeamMemberCounts(teamIds: string[]): Promise<Map<string, number>> {
  const teamMemberCounts = new Map<string, number>()

  if (teamIds.length === 0) {
    return teamMemberCounts
  }

  try {
    // Query all team member counts in one query
    const { data: teamMembers, error } = await supabase
      .from('team_members')
      .select('team_id')
      .in('team_id', teamIds)

    if (error) {
      console.error('Error fetching team members:', error)
      return teamMemberCounts
    }

    // Count members per team
    teamMembers?.forEach((member) => {
      const currentCount = teamMemberCounts.get(member.team_id) || 0
      teamMemberCounts.set(member.team_id, currentCount + 1)
    })

    // Ensure all teams have at least count 1 (fallback)
    teamIds.forEach((teamId) => {
      if (!teamMemberCounts.has(teamId)) {
        teamMemberCounts.set(teamId, 1)
      }
    })

    return teamMemberCounts
  } catch (error) {
    console.error('Error in getTeamMemberCounts:', error)
    return teamMemberCounts
  }
}

/**
 * Calculate revenue for a booking, dividing by team size if it's a team booking
 * Uses stored team_member_count when available (captured at booking creation time)
 * Falls back to teamMemberCounts map for old bookings without stored count
 *
 * @param booking - Booking with total_price, team_id, staff_id, and optionally team_member_count
 * @param teamMemberCounts - Cached team member counts (fallback for old bookings)
 * @returns Revenue amount for this staff member
 */
export function calculateBookingRevenue(
  booking: {
    total_price: number
    team_id: string | null
    staff_id: string | null
    team_member_count?: number | null
  },
  teamMemberCounts: Map<string, number>
): number {
  // If it's a team booking without staff assignment, divide by member count
  if (booking.team_id && !booking.staff_id) {
    // Use stored team_member_count when available (accurate for historical data)
    // Fallback to current member count for old bookings without stored value
    const memberCount = booking.team_member_count
      || teamMemberCounts.get(booking.team_id)
      || 1
    return booking.total_price / memberCount
  }

  // Direct staff booking gets full amount
  return booking.total_price
}

/**
 * Extract unique team IDs from bookings that need member count
 * Only returns team IDs for bookings that don't have stored team_member_count
 * (i.e., old bookings that need fallback to current member count)
 *
 * @param bookings - Array of bookings
 * @returns Array of unique team IDs that need member counts
 */
export function getUniqueTeamIds(
  bookings: Array<{
    team_id: string | null
    staff_id: string | null
    team_member_count?: number | null
  }>
): string[] {
  const teamIds = new Set<string>()

  bookings.forEach((booking) => {
    // Only need to count members for team bookings without staff assignment
    // AND without stored team_member_count (old bookings)
    if (booking.team_id && !booking.staff_id && !booking.team_member_count) {
      teamIds.add(booking.team_id)
    }
  })

  return Array.from(teamIds)
}
