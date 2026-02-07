/**
 * Staff Bookings Query Functions
 *
 * Query functions for Staff Portal "My Bookings" page.
 * Migrated from use-staff-bookings.ts hook (~410 lines of manual fetching)
 *
 * Features:
 * - Team membership (member + lead)
 * - Today/Upcoming/Completed bookings
 * - Statistics (6 metrics)
 * - Supports both individual staff and team bookings
 */

import { supabase } from '@/lib/supabase'
import { queryKeys } from '@/lib/query-keys'
import { logger } from '@/lib/logger'
import { calculateBookingRevenue, buildTeamFilterCondition } from '@/lib/team-revenue-utils'
import { isWithinMembershipPeriod } from '@/lib/review-utils'
import { BookingStatus } from '@/types/booking'

// ============================================================================
// TYPES
// ============================================================================

export interface StaffBooking {
  id: string
  booking_date: string
  start_time: string
  end_time: string
  status: string
  payment_status: string
  total_price: number
  notes: string | null
  // Address fields
  address: string
  city: string
  state: string
  zip_code: string
  customer_id: string
  staff_id: string | null
  team_id: string | null
  service_package_id: string
  package_v2_id: string | null
  created_at: string
  // Package V2 specific fields
  area_sqm?: number | null
  frequency?: 1 | 2 | 4 | 8 | null
  // Recurring booking fields
  recurring_sequence?: number | null
  recurring_total?: number | null
  // Relations
  customers: {
    id: string
    full_name: string
    phone: string | null
    avatar_url: string | null
  } | null
  service_packages: {
    id: string
    name: string
    service_type: string
    duration_minutes: number
    price: number
  } | null
  service_packages_v2: {
    id: string
    name: string
    service_type: string
  } | null
  // Team relation (for team bookings)
  teams: {
    id: string
    name: string
    team_lead_id: string | null
    team_lead: {
      id: string
      full_name: string
    } | null
    team_members: {
      id: string
      is_active: boolean
      profiles: {
        id: string
        full_name: string
      } | null
    }[]
  } | null
}

export interface TeamMembershipDetail {
  teamId: string
  joinedAt: string // ISO date string
  isLead: boolean
}

export interface TeamMembershipPeriod {
  joinedAt: string
  leftAt: string | null // null = still active
}

export interface TeamMembership {
  userId: string
  teamIds: string[]
  /** Map of teamId to joined date - used to filter team bookings (active only) */
  teamJoinedDates: Map<string, string>
  /** Array of ALL membership periods (supports multiple periods per team after re-join) */
  allMembershipPeriods: Array<{ teamId: string; joinedAt: string; leftAt: string | null }>
  isLead: boolean
  memberOfTeams: number
  leadOfTeams: number
  totalTeams: number
}

export interface StaffStats {
  jobsToday: number
  jobsThisWeek: number
  completionRate: number // percentage
  averageRating: number
  reviewCount: number // number of reviews used for average
  totalEarnings: number // current month
  // Extended stats for enhanced Stats tab
  totalTasks6Months: number
  monthlyData: {
    month: string
    jobs: number
    revenue: number
  }[]
}

// ============================================================================
// HELPER TYPES
// ============================================================================

/**
 * Raw booking type from Supabase before merging service packages
 */
interface RawBooking extends Omit<StaffBooking, 'service_packages'> {
  service_packages: StaffBooking['service_packages']
  service_packages_v2: StaffBooking['service_packages_v2']
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Get date string in YYYY-MM-DD format
 */
function formatDate(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

// Note: buildFilterCondition replaced by buildTeamFilterCondition from team-revenue-utils

/**
 * Merge V1 and V2 package data
 * Prioritizes V1 (service_packages) over V2 (service_packages_v2)
 */
function mergePackageData(bookings: RawBooking[]): StaffBooking[] {
  return bookings.map(booking => ({
    ...booking,
    service_packages: booking.service_packages || booking.service_packages_v2
  })) as StaffBooking[]
}

/** Type for membership period array */
type MembershipPeriodArray = Array<{ teamId: string; joinedAt: string; leftAt: string | null }>

/**
 * Minimal booking type for membership period filtering
 * Only contains fields required by filterBookingsByMembershipPeriods()
 */
interface FilterableBooking {
  staff_id: string | null
  team_id: string | null
  created_at: string
}

/**
 * Filter team bookings by membership periods
 * Staff should only see team bookings created during their membership period(s)
 * This prevents new team members from seeing/earning from old bookings
 * IMPORTANT: Supports multiple periods per team (after re-join)
 *
 * @param bookings - Array of bookings to filter (must have staff_id, team_id, created_at)
 * @param userId - Current user ID
 * @param allMembershipPeriods - Array of ALL membership periods (supports re-join)
 * @returns Filtered bookings (same type as input)
 */
function filterBookingsByMembershipPeriods<T extends FilterableBooking>(
  bookings: T[],
  userId: string,
  allMembershipPeriods: MembershipPeriodArray
): T[] {
  return bookings.filter(booking => {
    // Direct staff assignment - always show
    if (booking.staff_id === userId) {
      return true
    }

    // Team booking - check if staff was a member when booking was created
    if (booking.team_id) {
      // Get ALL membership periods for this team (may have multiple after re-join)
      const periodsForTeam = allMembershipPeriods.filter(p => p.teamId === booking.team_id)

      if (periodsForTeam.length === 0) {
        // Staff is not in this team - shouldn't happen but exclude just in case
        return false
      }

      // Use booking.created_at for filtering
      const bookingCreatedAt = new Date(booking.created_at)

      // Check if booking falls within ANY of the membership periods
      return periodsForTeam.some(period => {
        const staffJoinedAt = new Date(period.joinedAt)
        const staffLeftAt = period.leftAt ? new Date(period.leftAt) : null

        // Booking must be created AFTER staff joined
        if (bookingCreatedAt < staffJoinedAt) {
          return false
        }

        // Booking must be created BEFORE staff left (if they left)
        if (staffLeftAt && bookingCreatedAt > staffLeftAt) {
          return false
        }

        return true
      })
    }

    return true
  })
}

// ============================================================================
// QUERY FUNCTIONS
// ============================================================================

/**
 * Fetch Staff Team Membership
 * Check which teams the staff is a member or lead of
 *
 * Important: For revenue calculation, we include BOTH active and former members
 * - Active members (left_at IS NULL): See current team bookings
 * - Former members (left_at IS NOT NULL): Still see historical bookings for revenue
 */
export async function fetchStaffTeamMembership(userId: string): Promise<TeamMembership> {
  try {
    // Get ALL team memberships (active + former) with joined_at and left_at dates
    // This preserves revenue history even after staff leaves the team
    // IMPORTANT: Do NOT filter by is_active - we need former memberships for historical booking visibility
    const { data: memberTeams, error: memberError } = await supabase
      .from('team_members')
      .select('team_id, joined_at, left_at')
      .eq('staff_id', userId)

    if (memberError) throw memberError

    // Get teams where user is the lead (leads see all team bookings regardless of joined date)
    const { data: leadTeams, error: leadError } = await supabase
      .from('teams')
      .select('id, created_at')
      .eq('team_lead_id', userId)
      .is('deleted_at', null)

    if (leadError) throw leadError

    // Build data structures for filtering
    // teamJoinedDates: For active teams only (dashboard/current bookings)
    // allMembershipPeriods: Array of ALL periods (supports multiple periods per team after re-join)
    const teamJoinedDates = new Map<string, string>()
    const allMembershipPeriods: Array<{ teamId: string; joinedAt: string; leftAt: string | null }> = []

    // Track both active and ALL team IDs for different purposes:
    // - activeMemberTeamIds: Only for display/counts (teams staff is currently in)
    // - allMemberTeamIds: For querying bookings (includes former teams for historical visibility)
    const activeMemberTeamIds: string[] = []
    const allMemberTeamIds: string[] = []

    memberTeams?.forEach((m: { team_id: string; joined_at: string | null; left_at?: string | null }) => {
      const joinedAt = m.joined_at || '2020-01-01T00:00:00Z'
      const leftAt = m.left_at || null

      // Store ALL membership periods (staff can have multiple periods for same team after re-join)
      allMembershipPeriods.push({ teamId: m.team_id, joinedAt, leftAt })

      // Add ALL teams to allMemberTeamIds (for booking queries - includes former teams)
      if (!allMemberTeamIds.includes(m.team_id)) {
        allMemberTeamIds.push(m.team_id)
      }

      // Only add to active teams if not left (left_at IS NULL)
      if (!leftAt) {
        teamJoinedDates.set(m.team_id, joinedAt)
        activeMemberTeamIds.push(m.team_id)
      }
    })

    const leadTeamIds = leadTeams?.map(t => t.id) || []

    leadTeams?.forEach(t => {
      // Leads can see all bookings - use very old date
      // Only set if not already set as member (prioritize member joined_at if both)
      if (!teamJoinedDates.has(t.id)) {
        teamJoinedDates.set(t.id, '2020-01-01T00:00:00Z')
      }
      // Also add to membership periods for consistency (only if not already exists for this team)
      const hasLeadPeriod = allMembershipPeriods.some(p => p.teamId === t.id)
      if (!hasLeadPeriod) {
        allMembershipPeriods.push({ teamId: t.id, joinedAt: '2020-01-01T00:00:00Z', leftAt: null })
      }
    })

    // Combine ALL member teams (including former) + lead teams for booking queries
    // This ensures staff can see historical bookings from teams they've left
    const allTeamIds = [...new Set([...allMemberTeamIds, ...leadTeamIds])]

    const membership: TeamMembership = {
      userId,
      teamIds: allTeamIds,
      teamJoinedDates,
      allMembershipPeriods,
      isLead: leadTeamIds.length > 0,
      memberOfTeams: activeMemberTeamIds.length,
      leadOfTeams: leadTeamIds.length,
      totalTeams: allTeamIds.length,
    }

    logger.debug('Team Membership', {
      ...membership,
      teamJoinedDates: Object.fromEntries(teamJoinedDates),
      allMembershipPeriods,
    }, { context: 'StaffBookings' })

    return membership
  } catch (err) {
    logger.error('Error fetching team membership', { error: err, userId }, { context: 'StaffBookings' })
    // Return empty membership on error
    return {
      userId,
      teamIds: [],
      teamJoinedDates: new Map(),
      allMembershipPeriods: [],
      isLead: false,
      memberOfTeams: 0,
      leadOfTeams: 0,
      totalTeams: 0,
    }
  }
}

/**
 * Fetch Staff Bookings for Today
 * @param userId - Staff user ID
 * @param teamIds - Array of team IDs staff belongs to
 * @param allMembershipPeriods - Array of ALL membership periods (supports re-join)
 */
export async function fetchStaffBookingsToday(
  userId: string,
  teamIds: string[],
  allMembershipPeriods: MembershipPeriodArray = []
): Promise<StaffBooking[]> {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const todayStr = formatDate(today)

  const filterCondition = buildTeamFilterCondition(userId, teamIds)

  let query = supabase
    .from('bookings')
    .select(`
      *,
      customers:customer_id (id, full_name, phone, avatar_url),
      service_packages (id, name, service_type, duration_minutes, price),
      service_packages_v2:package_v2_id (id, name, service_type),
      teams:team_id (
        id,
        name,
        team_lead_id,
        team_lead:team_lead_id (id, full_name),
        team_members (
          id,
          is_active,
          profiles:staff_id (id, full_name)
        )
      )
    `)
    .eq('booking_date', todayStr)
    .is('deleted_at', null) // Exclude archived bookings
    .order('start_time', { ascending: true })

  if (filterCondition) {
    query = query.or(filterCondition)
  } else {
    query = query.eq('staff_id', userId)
  }

  const { data, error } = await query

  if (error) {
    logger.error('Error fetching today bookings', { error, userId }, { context: 'StaffBookings' })
    throw new Error(`Failed to fetch today's bookings: ${error.message}`)
  }

  // Filter team bookings by membership periods (staff only sees bookings created during their membership)
  const mergedData = mergePackageData(data || [])
  const filteredData = filterBookingsByMembershipPeriods(mergedData, userId, allMembershipPeriods)

  logger.debug('Today Bookings', { total: data?.length || 0, afterFilter: filteredData.length }, { context: 'StaffBookings' })

  return filteredData
}

/**
 * Fetch Staff Upcoming Bookings (next 7 days)
 * @param userId - Staff user ID
 * @param teamIds - Array of team IDs staff belongs to
 * @param allMembershipPeriods - Array of ALL membership periods (supports re-join)
 */
export async function fetchStaffBookingsUpcoming(
  userId: string,
  teamIds: string[],
  allMembershipPeriods: MembershipPeriodArray = []
): Promise<StaffBooking[]> {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const tomorrow = new Date(today)
  tomorrow.setDate(tomorrow.getDate() + 1)
  const nextWeek = new Date(today)
  nextWeek.setDate(nextWeek.getDate() + 7)

  const tomorrowStr = formatDate(tomorrow)
  const nextWeekStr = formatDate(nextWeek)

  const filterCondition = buildTeamFilterCondition(userId, teamIds)

  let query = supabase
    .from('bookings')
    .select(`
      *,
      customers:customer_id (id, full_name, phone, avatar_url),
      service_packages (id, name, service_type, duration_minutes, price),
      service_packages_v2:package_v2_id (id, name, service_type),
      teams:team_id (
        id,
        name,
        team_lead_id,
        team_lead:team_lead_id (id, full_name),
        team_members (
          id,
          is_active,
          profiles:staff_id (id, full_name)
        )
      )
    `)
    .gte('booking_date', tomorrowStr)
    .lte('booking_date', nextWeekStr)
    .is('deleted_at', null) // Exclude archived bookings
    .order('booking_date', { ascending: true })
    .order('start_time', { ascending: true })

  if (filterCondition) {
    query = query.or(filterCondition)
  } else {
    query = query.eq('staff_id', userId)
  }

  const { data, error } = await query

  if (error) {
    logger.error('Error fetching upcoming bookings', { error, userId }, { context: 'StaffBookings' })
    throw new Error(`Failed to fetch upcoming bookings: ${error.message}`)
  }

  // Filter team bookings by membership periods (staff only sees bookings created during their membership)
  const mergedData = mergePackageData(data || [])
  const filteredData = filterBookingsByMembershipPeriods(mergedData, userId, allMembershipPeriods)

  logger.debug('Upcoming Bookings', { total: data?.length || 0, afterFilter: filteredData.length }, { context: 'StaffBookings' })

  return filteredData
}

/**
 * Fetch Staff Completed Bookings (last 30 days)
 * @param userId - Staff user ID
 * @param teamIds - Array of team IDs staff belongs to
 * @param allMembershipPeriods - Array of ALL membership periods (supports re-join)
 */
export async function fetchStaffBookingsCompleted(
  userId: string,
  teamIds: string[],
  allMembershipPeriods: MembershipPeriodArray = []
): Promise<StaffBooking[]> {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const thirtyDaysAgo = new Date(today)
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

  const thirtyDaysAgoStr = formatDate(thirtyDaysAgo)
  const yesterdayStr = formatDate(new Date(today.getTime() - 24 * 60 * 60 * 1000))

  const filterCondition = buildTeamFilterCondition(userId, teamIds)

  let query = supabase
    .from('bookings')
    .select(`
      *,
      customers:customer_id (id, full_name, phone, avatar_url),
      service_packages (id, name, service_type, duration_minutes, price),
      service_packages_v2:package_v2_id (id, name, service_type),
      teams:team_id (
        id,
        name,
        team_lead_id,
        team_lead:team_lead_id (id, full_name),
        team_members (
          id,
          is_active,
          profiles:staff_id (id, full_name)
        )
      )
    `)
    .gte('booking_date', thirtyDaysAgoStr)
    .lte('booking_date', yesterdayStr)
    .is('deleted_at', null) // Exclude archived bookings
    .order('booking_date', { ascending: false })
    .order('start_time', { ascending: false })

  if (filterCondition) {
    query = query.or(filterCondition)
  } else {
    query = query.eq('staff_id', userId)
  }

  const { data, error } = await query

  if (error) {
    logger.error('Error fetching completed bookings', { error, userId }, { context: 'StaffBookings' })
    throw new Error(`Failed to fetch completed bookings: ${error.message}`)
  }

  // Filter team bookings by membership periods (staff only sees bookings created during their membership)
  const mergedData = mergePackageData(data || [])
  const filteredData = filterBookingsByMembershipPeriods(mergedData, userId, allMembershipPeriods)

  logger.debug('Completed Bookings', { total: data?.length || 0, afterFilter: filteredData.length }, { context: 'StaffBookings' })

  return filteredData
}

/**
 * Fetch Staff Statistics (6 metrics)
 * - Jobs today count
 * - Jobs this week count
 * - Completion rate (30 days)
 * - Average rating
 * - Total earnings (current month)
 * @param userId - Staff user ID
 * @param teamIds - Array of team IDs staff belongs to
 * @param allMembershipPeriods - Array of ALL membership periods (supports re-join)
 */
export async function fetchStaffStats(
  userId: string,
  teamIds: string[],
  allMembershipPeriods: MembershipPeriodArray = []
): Promise<StaffStats> {
  try {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const todayStr = formatDate(today)

    // Get start of week (Monday)
    const startOfWeek = new Date(today)
    const day = startOfWeek.getDay()
    const diff = startOfWeek.getDate() - day + (day === 0 ? -6 : 1)
    startOfWeek.setDate(diff)
    const startOfWeekStr = formatDate(startOfWeek)

    // Get end of week (Sunday)
    const endOfWeek = new Date(startOfWeek)
    endOfWeek.setDate(endOfWeek.getDate() + 6)
    const endOfWeekStr = formatDate(endOfWeek)

    const thirtyDaysAgo = new Date(today)
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
    const thirtyDaysAgoStr = formatDate(thirtyDaysAgo)

    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1)
    const startOfMonthStr = formatDate(startOfMonth)

    // 6 months ago for extended stats
    const sixMonthsAgo = new Date(today)
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6)
    const sixMonthsAgoStr = formatDate(sixMonthsAgo)

    const filterCondition = buildTeamFilterCondition(userId, teamIds)

    // Run all queries in parallel
    const [
      jobsTodayResult,
      jobsWeekResult,
      totalJobsResult,
      completedJobsResult,
      reviewsResult,
      earningsResult,
      totalTasks6MonthsResult,
      monthlyDataResult,
    ] = await Promise.all([
      // Jobs today - filter by membership periods
      (async () => {
        let query = supabase
          .from('bookings')
          .select('id, staff_id, team_id, created_at')
          .eq('booking_date', todayStr)
          .is('deleted_at', null) // Exclude archived bookings
        if (filterCondition) {
          query = query.or(filterCondition)
        } else {
          query = query.eq('staff_id', userId)
        }
        const { data: bookings } = await query
        if (!bookings || bookings.length === 0) return 0
        // Filter by membership periods
        const filtered = filterBookingsByMembershipPeriods(
          bookings,
          userId,
          allMembershipPeriods
        )
        return filtered.length
      })(),

      // Jobs this week - filter by membership periods
      (async () => {
        let query = supabase
          .from('bookings')
          .select('id, staff_id, team_id, created_at')
          .gte('booking_date', startOfWeekStr)
          .lte('booking_date', endOfWeekStr)
          .is('deleted_at', null) // Exclude archived bookings
        if (filterCondition) {
          query = query.or(filterCondition)
        } else {
          query = query.eq('staff_id', userId)
        }
        const { data: bookings } = await query
        if (!bookings || bookings.length === 0) return 0
        // Filter by membership periods
        const filtered = filterBookingsByMembershipPeriods(
          bookings,
          userId,
          allMembershipPeriods
        )
        return filtered.length
      })(),

      // Total jobs (30 days) - filter by membership periods
      (async () => {
        let query = supabase
          .from('bookings')
          .select('id, staff_id, team_id, created_at')
          .gte('booking_date', thirtyDaysAgoStr)
          .lte('booking_date', todayStr)
          .is('deleted_at', null) // Exclude archived bookings
        if (filterCondition) {
          query = query.or(filterCondition)
        } else {
          query = query.eq('staff_id', userId)
        }
        const { data: bookings } = await query
        if (!bookings || bookings.length === 0) return 0
        // Filter by membership periods
        const filtered = filterBookingsByMembershipPeriods(
          bookings,
          userId,
          allMembershipPeriods
        )
        return filtered.length
      })(),

      // Completed jobs (30 days) - filter by membership periods
      (async () => {
        let query = supabase
          .from('bookings')
          .select('id, staff_id, team_id, created_at, status')
          .eq('status', BookingStatus.Completed)
          .gte('booking_date', thirtyDaysAgoStr)
          .lte('booking_date', todayStr)
          .is('deleted_at', null) // Exclude archived bookings
        if (filterCondition) {
          query = query.or(filterCondition)
        } else {
          query = query.eq('staff_id', userId)
        }
        const { data: bookings } = await query
        if (!bookings || bookings.length === 0) return 0
        // Filter by membership periods
        const filtered = filterBookingsByMembershipPeriods(
          bookings,
          userId,
          allMembershipPeriods
        )
        return filtered.length
      })(),

      // Average rating from reviews (staff + team reviews)
      // Filter by membership period for consistency with bookings/earnings
      (async () => {
        // Build filter for staff reviews OR team reviews
        let filterStr = `staff_id.eq.${userId}`
        if (teamIds.length > 0) {
          filterStr += `,team_id.in.(${teamIds.join(',')})`
        }

        const { data: reviews, error } = await supabase
          .from('reviews')
          .select('rating, staff_id, team_id, created_at')
          .or(filterStr)

        if (error) {
          logger.error('Error fetching reviews', { error, userId }, { context: 'StaffBookings' })
          return { averageRating: 0, reviewCount: 0 }
        }

        if (!reviews || reviews.length === 0) return { averageRating: 0, reviewCount: 0 }

        // Filter team reviews by membership period (consistent with bookings)
        // Uses shared isWithinMembershipPeriod utility from review-utils.ts
        const filteredReviews = reviews.filter(review => {
          // Direct staff assignment - always include
          if (review.staff_id === userId) {
            return true
          }

          // Team review - check if staff was a member when review was created
          if (review.team_id && review.created_at) {
            const reviewCreatedAt = new Date(review.created_at)
            return isWithinMembershipPeriod(reviewCreatedAt, review.team_id, allMembershipPeriods)
          }

          return true
        })

        if (filteredReviews.length === 0) return { averageRating: 0, reviewCount: 0 }

        const totalRating = filteredReviews.reduce((sum, review) => sum + (review.rating || 0), 0)
        const averageRating = Math.round((totalRating / filteredReviews.length) * 10) / 10
        return { averageRating, reviewCount: filteredReviews.length }
      })(),

      // Total earnings (current month) - divided by team_member_count stored at booking creation
      // Only count bookings created after staff joined the team
      (async () => {
        let query = supabase
          .from('bookings')
          .select('total_price, team_id, staff_id, team_member_count, created_at')
          .eq('status', BookingStatus.Completed)
          .eq('payment_status', 'paid')
          .gte('booking_date', startOfMonthStr)
          .lte('booking_date', todayStr)
          .is('deleted_at', null) // Exclude archived bookings

        if (filterCondition) {
          query = query.or(filterCondition)
        } else {
          query = query.eq('staff_id', userId)
        }

        const { data: bookings } = await query

        if (!bookings || bookings.length === 0) return 0

        // Filter by membership periods using shared helper
        const filteredBookings = filterBookingsByMembershipPeriods(
          bookings,
          userId,
          allMembershipPeriods
        )

        // Calculate earnings using shared calculateBookingRevenue function
        // Same logic as use-staff-profile.ts for consistency
        return filteredBookings.reduce((sum, booking) => {
          return sum + calculateBookingRevenue(booking, new Map())
        }, 0)
      })(),

      // Total tasks (6 months) - filter by membership periods
      (async () => {
        let query = supabase
          .from('bookings')
          .select('id, staff_id, team_id, created_at')
          .gte('booking_date', sixMonthsAgoStr)
          .lte('booking_date', todayStr)
          .is('deleted_at', null)
        if (filterCondition) {
          query = query.or(filterCondition)
        } else {
          query = query.eq('staff_id', userId)
        }
        const { data: bookings } = await query
        if (!bookings || bookings.length === 0) return 0
        // Filter by membership periods
        const filtered = filterBookingsByMembershipPeriods(
          bookings,
          userId,
          allMembershipPeriods
        )
        return filtered.length
      })(),

      // Monthly breakdown (6 months) for performance chart - revenue divided by team_member_count
      // Revenue only counts completed + paid bookings (same as Earnings)
      // Only count bookings created after staff joined the team
      (async () => {
        let query = supabase
          .from('bookings')
          .select('booking_date, status, payment_status, total_price, team_id, staff_id, team_member_count, created_at')
          .gte('booking_date', sixMonthsAgoStr)
          .lte('booking_date', todayStr)
          .is('deleted_at', null)
          .order('booking_date', { ascending: true })

        if (filterCondition) {
          query = query.or(filterCondition)
        } else {
          query = query.eq('staff_id', userId)
        }

        const { data: bookings } = await query

        if (!bookings || bookings.length === 0) return []

        // Filter by membership periods using shared helper
        const filteredBookings = filterBookingsByMembershipPeriods(
          bookings,
          userId,
          allMembershipPeriods
        )

        // Group by month with revenue divided by team_member_count
        // Revenue only counts completed + paid bookings (same logic as Earnings)
        const monthlyMap = new Map<string, { jobs: number; revenue: number }>()
        filteredBookings.forEach((booking) => {
          const month = booking.booking_date.slice(0, 7) // YYYY-MM
          if (!monthlyMap.has(month)) {
            monthlyMap.set(month, { jobs: 0, revenue: 0 })
          }
          const data = monthlyMap.get(month)!
          data.jobs += 1
          // Revenue: only count if completed AND paid (same as Earnings)
          // Use shared calculateBookingRevenue function for consistency
          if (booking.status === BookingStatus.Completed && booking.payment_status === 'paid') {
            data.revenue += calculateBookingRevenue(booking, new Map())
          }
        })

        return Array.from(monthlyMap.entries())
          .map(([month, data]) => ({
            month,
            jobs: data.jobs,
            revenue: Math.round(data.revenue), // Round to avoid decimal issues
          }))
          .sort((a, b) => a.month.localeCompare(b.month))
      })(),
    ])

    // Calculate completion rate
    const completionRate =
      totalJobsResult > 0 ? Math.round((completedJobsResult / totalJobsResult) * 100) : 0

    const stats: StaffStats = {
      jobsToday: jobsTodayResult,
      jobsThisWeek: jobsWeekResult,
      completionRate,
      averageRating: reviewsResult.averageRating,
      reviewCount: reviewsResult.reviewCount,
      totalEarnings: Math.round(earningsResult), // Round to avoid decimal issues
      totalTasks6Months: totalTasks6MonthsResult,
      monthlyData: monthlyDataResult,
    }

    logger.debug('Staff Stats', stats, { context: 'StaffBookings' })

    return stats
  } catch (err) {
    logger.error('Error fetching staff stats', { error: err, userId }, { context: 'StaffBookings' })
    // Return default stats on error
    return {
      jobsToday: 0,
      jobsThisWeek: 0,
      completionRate: 0,
      averageRating: 0,
      reviewCount: 0,
      totalEarnings: 0,
      totalTasks6Months: 0,
      monthlyData: [],
    }
  }
}

// ============================================================================
// QUERY OPTIONS
// ============================================================================

/**
 * Generate a simple hash from membership periods for use in query keys
 * This ensures queries refetch when membership periods change
 */
export function generateMembershipHash(periods: MembershipPeriodArray): string {
  if (!periods || periods.length === 0) return 'empty'
  // Create a simple hash from team IDs, join dates, and left dates
  return periods
    .map(p => `${p.teamId}:${p.joinedAt}:${p.leftAt || 'null'}`)
    .sort()
    .join('|')
}

export const staffBookingsQueryOptions = {
  teamMembership: (userId: string) => ({
    queryKey: queryKeys.staffBookings.teamMembership(userId),
    queryFn: () => fetchStaffTeamMembership(userId),
    staleTime: 10 * 60 * 1000, // 10 minutes (team membership doesn't change often)
    enabled: !!userId,
  }),

  today: (userId: string, teamIds: string[], allMembershipPeriods: MembershipPeriodArray = []) => {
    const membershipHash = generateMembershipHash(allMembershipPeriods)
    return {
      queryKey: queryKeys.staffBookings.today(userId, teamIds, membershipHash),
      queryFn: () => fetchStaffBookingsToday(userId, teamIds, allMembershipPeriods),
      staleTime: 1 * 60 * 1000, // 1 minute (today's bookings change frequently)
      refetchOnMount: 'always' as const, // Always refetch when component mounts
      refetchOnWindowFocus: true, // Refetch when window regains focus
      refetchInterval: 3 * 60 * 1000, // Background refetch every 3 minutes
      enabled: !!userId,
    }
  },

  upcoming: (userId: string, teamIds: string[], allMembershipPeriods: MembershipPeriodArray = []) => {
    const membershipHash = generateMembershipHash(allMembershipPeriods)
    return {
      queryKey: queryKeys.staffBookings.upcoming(userId, teamIds, membershipHash),
      queryFn: () => fetchStaffBookingsUpcoming(userId, teamIds, allMembershipPeriods),
      staleTime: 5 * 60 * 1000, // 5 minutes
      refetchOnMount: 'always' as const, // Always refetch when component mounts
      refetchOnWindowFocus: true, // Refetch when window regains focus
      enabled: !!userId,
    }
  },

  completed: (userId: string, teamIds: string[], allMembershipPeriods: MembershipPeriodArray = []) => {
    const membershipHash = generateMembershipHash(allMembershipPeriods)
    return {
      queryKey: queryKeys.staffBookings.completed(userId, teamIds, membershipHash),
      queryFn: () => fetchStaffBookingsCompleted(userId, teamIds, allMembershipPeriods),
      staleTime: 10 * 60 * 1000, // 10 minutes (completed bookings rarely change)
      refetchOnMount: 'always' as const, // Always refetch when component mounts
      refetchOnWindowFocus: true, // Refetch when window regains focus
      enabled: !!userId,
    }
  },

  stats: (userId: string, teamIds: string[], allMembershipPeriods: MembershipPeriodArray = []) => {
    const membershipHash = generateMembershipHash(allMembershipPeriods)
    return {
      queryKey: queryKeys.staffBookings.stats(userId, teamIds, membershipHash),
      queryFn: () => fetchStaffStats(userId, teamIds, allMembershipPeriods),
      staleTime: 5 * 60 * 1000, // 5 minutes
      refetchOnMount: 'always' as const, // Always refetch when component mounts
      refetchOnWindowFocus: true, // Refetch when window regains focus
      enabled: !!userId,
    }
  },
}
