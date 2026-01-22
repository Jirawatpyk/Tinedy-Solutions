import { supabase } from './supabase'

export interface Review {
  id: string
  staff_id: string | null
  team_id: string | null
  booking_id: string
  customer_id: string
  rating: number // 1-5
  comment?: string
  created_at: string
  updated_at: string
}

export interface ReviewStats {
  averageRating: number
  reviewCount: number
}

export interface MembershipPeriod {
  teamId: string
  joinedAt: string
  leftAt: string | null
}

/**
 * Check if a date falls within any membership period for a specific team
 * Exported for reuse in staff-bookings-queries.ts to avoid code duplication
 */
export function isWithinMembershipPeriod(
  reviewCreatedAt: Date,
  teamId: string,
  membershipPeriods: MembershipPeriod[]
): boolean {
  // Get all membership periods for this team
  const periodsForTeam = membershipPeriods.filter(p => p.teamId === teamId)

  if (periodsForTeam.length === 0) {
    return false
  }

  // Check if review falls within ANY of the membership periods
  return periodsForTeam.some(period => {
    const joinedAt = new Date(period.joinedAt)
    const leftAt = period.leftAt ? new Date(period.leftAt) : null

    // Review must be created AFTER staff joined
    if (reviewCreatedAt < joinedAt) {
      return false
    }

    // Review must be created BEFORE staff left (if they left)
    if (leftAt && reviewCreatedAt > leftAt) {
      return false
    }

    return true
  })
}

/**
 * Fetch review statistics for a staff member
 * Includes reviews from direct staff assignments and team assignments
 * Filters team reviews by membership period for consistency with booking calculations
 *
 * @param staffId - The staff member's ID
 * @param membershipPeriods - Array of team membership periods (include all historical for consistency)
 * @returns ReviewStats with average rating and review count
 */
export async function fetchStaffReviewStats(
  staffId: string,
  membershipPeriods: MembershipPeriod[] = []
): Promise<ReviewStats> {
  const defaultResult: ReviewStats = { averageRating: 0, reviewCount: 0 }

  // Get unique team IDs from membership periods
  const teamIds = [...new Set(membershipPeriods.map(p => p.teamId))]

  let reviewQuery = supabase
    .from('reviews')
    .select('rating, staff_id, team_id, created_at')

  if (teamIds.length > 0) {
    // Include reviews for direct staff assignments OR team assignments
    reviewQuery = reviewQuery.or(
      `staff_id.eq.${staffId},team_id.in.(${teamIds.join(',')})`
    )
  } else {
    // Only direct staff assignments
    reviewQuery = reviewQuery.eq('staff_id', staffId)
  }

  const { data: reviews, error } = await reviewQuery

  if (error) throw error
  if (!reviews || reviews.length === 0) return defaultResult

  // Filter team reviews by membership period (consistent with booking calculations)
  const filteredReviews = reviews.filter(review => {
    // Direct staff assignment - always include
    if (review.staff_id === staffId) {
      return true
    }

    // Team review - check if staff was a member when review was created
    if (review.team_id) {
      const reviewCreatedAt = new Date(review.created_at)
      return isWithinMembershipPeriod(reviewCreatedAt, review.team_id, membershipPeriods)
    }

    return true
  })

  if (filteredReviews.length === 0) return defaultResult

  const totalRating = filteredReviews.reduce((sum, r) => sum + (r.rating || 0), 0)
  const averageRating = Math.round((totalRating / filteredReviews.length) * 10) / 10

  return {
    averageRating,
    reviewCount: filteredReviews.length,
  }
}
