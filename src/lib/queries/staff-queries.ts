/**
 * Staff Query Functions
 *
 * React Query functions สำหรับ Staff
 *
 * Features:
 * - Automatic caching (3-5 minutes stale time)
 * - Support with/without ratings
 * - Shared cache across pages
 * - Type-safe query keys
 * - Team reviews included with membership period filtering
 */

import { supabase } from '@/lib/supabase'
import { queryKeys } from '@/lib/query-keys'
import { isWithinMembershipPeriod, type MembershipPeriod } from '@/lib/review-utils'
import type { StaffWithRating, StaffListItem } from '@/types/staff'
import { UserRole } from '@/types/common'

/**
 * Helper: Validate rating value
 * @param rating - Value to validate
 * @returns true if rating is a valid number between 1-5
 */
function isValidRating(rating: unknown): rating is number {
  return typeof rating === 'number' && !isNaN(rating) && rating >= 1 && rating <= 5
}

/**
 * Helper: Collect ratings for a single staff member
 * Includes both direct staff reviews and team reviews (filtered by membership period)
 * @param staffId - Staff UUID
 * @param membershipPeriods - Array of team membership periods
 * @returns Promise resolving to array of valid rating numbers (1-5)
 */
async function collectStaffRatings(
  staffId: string,
  membershipPeriods: MembershipPeriod[]
): Promise<number[]> {
  const allRatings: number[] = []
  const teamIds = [...new Set(membershipPeriods.map((p) => p.teamId))]

  // Fetch direct staff reviews
  const { data: directReviews, error: directError } = await supabase
    .from('reviews')
    .select('rating')
    .eq('staff_id', staffId)

  if (directError) {
    console.warn(`[staff-queries] Failed to fetch direct reviews for staff ${staffId}:`, directError.message)
  } else if (directReviews) {
    directReviews.forEach((r) => {
      if (isValidRating(r.rating)) {
        allRatings.push(r.rating)
      }
    })
  }

  // Fetch and filter team reviews
  if (teamIds.length > 0) {
    const { data: teamReviews, error: teamError } = await supabase
      .from('reviews')
      .select('rating, created_at, team_id')
      .in('team_id', teamIds)

    if (teamError) {
      console.warn(`[staff-queries] Failed to fetch team reviews for staff ${staffId}:`, teamError.message)
    } else if (teamReviews) {
      teamReviews.forEach((review) => {
        if (!review.team_id || !isValidRating(review.rating)) return
        const reviewCreatedAt = new Date(review.created_at)
        if (isWithinMembershipPeriod(reviewCreatedAt, review.team_id, membershipPeriods)) {
          allRatings.push(review.rating)
        }
      })
    }
  }

  return allRatings
}

/**
 * Fetch Staff List with Ratings
 *
 * ดึง staff ทั้งหมด (admin, manager, staff) พร้อม average rating, booking count, team count
 * รวม reviews จาก direct staff assignment และ team assignment (กรอง membership period)
 * ใช้สำหรับหน้า Staff management
 *
 * @returns Promise<StaffWithRating[]>
 */
export async function fetchStaffWithRatings(): Promise<StaffWithRating[]> {
  // Fetch profiles
  const { data: staffData, error } = await supabase
    .from('profiles')
    .select('id, email, full_name, avatar_url, role, phone, staff_number, skills, created_at, updated_at')
    .in('role', ['admin', 'manager', 'staff'])
    .order('created_at', { ascending: false })

  if (error) throw new Error(`Failed to fetch staff: ${error.message}`)
  if (!staffData || staffData.length === 0) return []

  const staffIds = staffData.map((s) => s.id)

  // Parallel queries for better performance
  const [
    teamMembershipsResult,
    directReviewsResult,
    bookingsResult,
    activeTeamMembersResult
  ] = await Promise.all([
    // Fetch ALL team memberships (including historical) for membership period filtering
    supabase
      .from('team_members')
      .select('staff_id, team_id, joined_at, left_at')
      .in('staff_id', staffIds),
    // Fetch direct staff reviews
    supabase
      .from('reviews')
      .select('rating, staff_id')
      .in('staff_id', staffIds),
    // Fetch booking counts for all staff (direct assignment only)
    supabase
      .from('bookings')
      .select('staff_id')
      .in('staff_id', staffIds)
      .is('deleted_at', null),
    // Fetch team membership counts for all staff (active only)
    supabase
      .from('team_members')
      .select('staff_id')
      .in('staff_id', staffIds)
      .is('left_at', null)
  ])

  // Log warnings for query failures (non-blocking)
  if (teamMembershipsResult.error) {
    console.warn('[staff-queries] Failed to fetch team memberships:', teamMembershipsResult.error.message)
  }
  if (directReviewsResult.error) {
    console.warn('[staff-queries] Failed to fetch direct reviews:', directReviewsResult.error.message)
  }
  if (bookingsResult.error) {
    console.warn('[staff-queries] Failed to fetch bookings:', bookingsResult.error.message)
  }
  if (activeTeamMembersResult.error) {
    console.warn('[staff-queries] Failed to fetch active team members:', activeTeamMembersResult.error.message)
  }

  const allTeamMemberships = teamMembershipsResult.data || []
  const directReviewsData = directReviewsResult.data || []
  const bookingsData = bookingsResult.data || []
  const activeTeamMembersData = activeTeamMembersResult.data || []

  // Build membership periods map per staff
  const staffMembershipPeriods: Record<string, MembershipPeriod[]> = {}
  allTeamMemberships.forEach((m) => {
    if (!staffMembershipPeriods[m.staff_id]) {
      staffMembershipPeriods[m.staff_id] = []
    }
    staffMembershipPeriods[m.staff_id].push({
      teamId: m.team_id,
      joinedAt: m.joined_at,
      leftAt: m.left_at,
    })
  })

  // Get unique team IDs for querying team reviews
  const allTeamIds = [...new Set(allTeamMemberships.map((m) => m.team_id))]

  // Fetch team reviews (only if there are teams)
  let teamReviewsData: { rating: number; created_at: string; team_id: string }[] = []
  if (allTeamIds.length > 0) {
    const { data, error: teamReviewsError } = await supabase
      .from('reviews')
      .select('rating, created_at, team_id')
      .in('team_id', allTeamIds)

    if (teamReviewsError) {
      console.warn('[staff-queries] Failed to fetch team reviews:', teamReviewsError.message)
    } else if (data) {
      teamReviewsData = data
    }
  }

  // Group direct ratings by staff_id (with validation)
  const staffRatings: Record<string, number[]> = {}

  directReviewsData.forEach((review) => {
    if (review.staff_id && isValidRating(review.rating)) {
      if (!staffRatings[review.staff_id]) {
        staffRatings[review.staff_id] = []
      }
      staffRatings[review.staff_id].push(review.rating)
    }
  })

  // Add team reviews to staff ratings (optimized: iterate staff first, with validation)
  staffIds.forEach((staffId) => {
    const membershipPeriods = staffMembershipPeriods[staffId] || []
    if (membershipPeriods.length === 0) return // Skip staff without teams

    teamReviewsData.forEach((review) => {
      if (!review.team_id || !isValidRating(review.rating)) return

      const reviewCreatedAt = new Date(review.created_at)
      if (isWithinMembershipPeriod(reviewCreatedAt, review.team_id, membershipPeriods)) {
        if (!staffRatings[staffId]) {
          staffRatings[staffId] = []
        }
        staffRatings[staffId].push(review.rating)
      }
    })
  })

  // Count bookings per staff
  const staffBookingCounts: Record<string, number> = {}
  bookingsData.forEach((booking) => {
    if (booking.staff_id) {
      staffBookingCounts[booking.staff_id] = (staffBookingCounts[booking.staff_id] || 0) + 1
    }
  })

  // Count teams per staff (active memberships only)
  const staffTeamCounts: Record<string, number> = {}
  activeTeamMembersData.forEach((member) => {
    if (member.staff_id) {
      staffTeamCounts[member.staff_id] = (staffTeamCounts[member.staff_id] || 0) + 1
    }
  })

  // Calculate average rating for each staff and add counts
  const staffWithRatings: StaffWithRating[] = staffData.map((staff) => {
    const ratings = staffRatings[staff.id]
    const bookingCount = staffBookingCounts[staff.id] || 0
    const teamCount = staffTeamCounts[staff.id] || 0

    if (ratings && ratings.length > 0) {
      const average = ratings.reduce((a, b) => a + b, 0) / ratings.length
      return {
        ...staff,
        average_rating: Math.round(average * 10) / 10, // Round to 1 decimal
        booking_count: bookingCount,
        team_count: teamCount,
      } as StaffWithRating
    }
    return {
      ...staff,
      booking_count: bookingCount,
      team_count: teamCount,
    } as StaffWithRating
  })

  return staffWithRatings
}

/**
 * Fetch Staff List (Simple - for dropdowns)
 *
 * ดึง staff แบบ minimal data สำหรับ dropdowns ใน Dashboard, Bookings, Calendar
 *
 * @param role - Filter by role: 'staff' | 'all'
 * @returns Promise<StaffListItem[]>
 */
export async function fetchStaffList(role: 'staff' | 'all' = 'all'): Promise<StaffListItem[]> {
  let query = supabase
    .from('profiles')
    .select('id, full_name, email, role, avatar_url')

  // Filter by role
  if (role === UserRole.Staff) {
    query = query.eq('role', 'staff')
  } else {
    query = query.in('role', ['admin', 'manager', 'staff'])
  }

  const { data, error } = await query.order('full_name', { ascending: true })

  if (error) throw new Error(`Failed to fetch staff list: ${error.message}`)

  return (data || []) as StaffListItem[]
}

/**
 * Fetch Single Staff Detail
 *
 * ดึงข้อมูล staff คนเดียวพร้อม rating (รวม team reviews)
 *
 * @param id - Staff ID
 * @returns Promise<StaffWithRating>
 */
export async function fetchStaffDetail(id: string): Promise<StaffWithRating> {
  // Fetch profile
  const { data: staff, error } = await supabase
    .from('profiles')
    .select('id, email, full_name, avatar_url, role, phone, staff_number, skills, created_at, updated_at')
    .eq('id', id)
    .single()

  if (error) throw new Error(`Failed to fetch staff detail: ${error.message}`)

  // Fetch team memberships for this staff (including historical)
  const { data: teamMemberships, error: membershipError } = await supabase
    .from('team_members')
    .select('team_id, joined_at, left_at')
    .eq('staff_id', id)

  // Build membership periods (handle error gracefully - exclude team reviews if failed)
  const membershipPeriods: MembershipPeriod[] = !membershipError && teamMemberships
    ? teamMemberships.map((m) => ({
        teamId: m.team_id,
        joinedAt: m.joined_at,
        leftAt: m.left_at,
      }))
    : []

  // Use shared helper to collect ratings
  const allRatings = await collectStaffRatings(id, membershipPeriods)

  // Calculate average rating
  if (allRatings.length > 0) {
    const average = allRatings.reduce((a, b) => a + b, 0) / allRatings.length
    return { ...staff, average_rating: Math.round(average * 10) / 10 } as StaffWithRating
  }

  return staff as StaffWithRating
}

/**
 * Query Options สำหรับ Staff
 */
export const staffQueryOptions = {
  /**
   * Staff list with ratings (for Staff management page)
   */
  withRatings: () => ({
    queryKey: queryKeys.staff.withRatings(),
    queryFn: () => fetchStaffWithRatings(),
    staleTime: 3 * 60 * 1000, // 3 minutes
  }),

  /**
   * Simple staff list (for dropdowns)
   */
  listSimple: (role: 'staff' | 'all' = 'all') => ({
    queryKey: queryKeys.staff.listSimple(role),
    queryFn: () => fetchStaffList(role),
    staleTime: 5 * 60 * 1000, // 5 minutes (reference data)
  }),

  /**
   * Single staff detail
   */
  detail: (id: string) => ({
    queryKey: queryKeys.staff.detail(id),
    queryFn: () => fetchStaffDetail(id),
    staleTime: 3 * 60 * 1000, // 3 minutes
  }),
}
