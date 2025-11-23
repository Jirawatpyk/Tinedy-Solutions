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
}

export interface TeamMembership {
  userId: string
  teamIds: string[]
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
  totalEarnings: number // current month
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

/**
 * Build filter condition for staff + teams bookings
 */
function buildFilterCondition(userId: string, teamIds: string[]): string | null {
  if (teamIds.length > 0) {
    return `staff_id.eq.${userId},team_id.in.(${teamIds.join(',')})`
  }
  return null
}

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

// ============================================================================
// QUERY FUNCTIONS
// ============================================================================

/**
 * Fetch Staff Team Membership
 * Check which teams the staff is a member or lead of
 */
export async function fetchStaffTeamMembership(userId: string): Promise<TeamMembership> {
  try {
    // Get teams where user is a member
    const { data: memberTeams, error: memberError } = await supabase
      .from('team_members')
      .select('team_id')
      .eq('staff_id', userId)
      .eq('is_active', true)

    if (memberError) throw memberError

    // Get teams where user is the lead
    const { data: leadTeams, error: leadError } = await supabase
      .from('teams')
      .select('id')
      .eq('team_lead_id', userId)
      .eq('is_active', true)

    if (leadError) throw leadError

    const memberTeamIds = memberTeams?.map(m => m.team_id) || []
    const leadTeamIds = leadTeams?.map(t => t.id) || []

    // Combine and deduplicate
    const allTeamIds = [...new Set([...memberTeamIds, ...leadTeamIds])]

    const membership: TeamMembership = {
      userId,
      teamIds: allTeamIds,
      isLead: leadTeamIds.length > 0,
      memberOfTeams: memberTeamIds.length,
      leadOfTeams: leadTeamIds.length,
      totalTeams: allTeamIds.length,
    }

    logger.debug('Team Membership', membership, { context: 'StaffBookings' })

    return membership
  } catch (err) {
    logger.error('Error fetching team membership', { error: err, userId }, { context: 'StaffBookings' })
    // Return empty membership on error
    return {
      userId,
      teamIds: [],
      isLead: false,
      memberOfTeams: 0,
      leadOfTeams: 0,
      totalTeams: 0,
    }
  }
}

/**
 * Fetch Staff Bookings for Today
 */
export async function fetchStaffBookingsToday(
  userId: string,
  teamIds: string[]
): Promise<StaffBooking[]> {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const todayStr = formatDate(today)

  const filterCondition = buildFilterCondition(userId, teamIds)

  let query = supabase
    .from('bookings')
    .select(`
      *,
      customers:customer_id (id, full_name, phone, avatar_url),
      service_packages (id, name, service_type, duration_minutes, price),
      service_packages_v2:package_v2_id (id, name, service_type)
    `)
    .eq('booking_date', todayStr)
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

  logger.debug('Today Bookings', { count: data?.length || 0 }, { context: 'StaffBookings' })

  return mergePackageData(data || [])
}

/**
 * Fetch Staff Upcoming Bookings (next 7 days)
 */
export async function fetchStaffBookingsUpcoming(
  userId: string,
  teamIds: string[]
): Promise<StaffBooking[]> {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const tomorrow = new Date(today)
  tomorrow.setDate(tomorrow.getDate() + 1)
  const nextWeek = new Date(today)
  nextWeek.setDate(nextWeek.getDate() + 7)

  const tomorrowStr = formatDate(tomorrow)
  const nextWeekStr = formatDate(nextWeek)

  const filterCondition = buildFilterCondition(userId, teamIds)

  let query = supabase
    .from('bookings')
    .select(`
      *,
      customers:customer_id (id, full_name, phone, avatar_url),
      service_packages (id, name, service_type, duration_minutes, price),
      service_packages_v2:package_v2_id (id, name, service_type)
    `)
    .gte('booking_date', tomorrowStr)
    .lte('booking_date', nextWeekStr)
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

  logger.debug('Upcoming Bookings', { count: data?.length || 0 }, { context: 'StaffBookings' })

  return mergePackageData(data || [])
}

/**
 * Fetch Staff Completed Bookings (last 30 days)
 */
export async function fetchStaffBookingsCompleted(
  userId: string,
  teamIds: string[]
): Promise<StaffBooking[]> {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const thirtyDaysAgo = new Date(today)
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

  const thirtyDaysAgoStr = formatDate(thirtyDaysAgo)
  const yesterdayStr = formatDate(new Date(today.getTime() - 24 * 60 * 60 * 1000))

  const filterCondition = buildFilterCondition(userId, teamIds)

  let query = supabase
    .from('bookings')
    .select(`
      *,
      customers:customer_id (id, full_name, phone, avatar_url),
      service_packages (id, name, service_type, duration_minutes, price),
      service_packages_v2:package_v2_id (id, name, service_type)
    `)
    .gte('booking_date', thirtyDaysAgoStr)
    .lte('booking_date', yesterdayStr)
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

  logger.debug('Completed Bookings', { count: data?.length || 0 }, { context: 'StaffBookings' })

  return mergePackageData(data || [])
}

/**
 * Fetch Staff Statistics (6 metrics)
 * - Jobs today count
 * - Jobs this week count
 * - Completion rate (30 days)
 * - Average rating
 * - Total earnings (current month)
 */
export async function fetchStaffStats(
  userId: string,
  teamIds: string[]
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

    const filterCondition = buildFilterCondition(userId, teamIds)

    // Run all queries in parallel
    const [
      jobsTodayResult,
      jobsWeekResult,
      totalJobsResult,
      completedJobsResult,
      reviewsResult,
      earningsResult,
    ] = await Promise.all([
      // Jobs today
      (async () => {
        let query = supabase
          .from('bookings')
          .select('*', { count: 'exact', head: true })
          .eq('booking_date', todayStr)
        if (filterCondition) {
          query = query.or(filterCondition)
        } else {
          query = query.eq('staff_id', userId)
        }
        const r = await query
        return r.count || 0
      })(),

      // Jobs this week
      (async () => {
        let query = supabase
          .from('bookings')
          .select('*', { count: 'exact', head: true })
          .gte('booking_date', startOfWeekStr)
          .lte('booking_date', endOfWeekStr)
        if (filterCondition) {
          query = query.or(filterCondition)
        } else {
          query = query.eq('staff_id', userId)
        }
        const r = await query
        return r.count || 0
      })(),

      // Total jobs (30 days)
      (async () => {
        let query = supabase
          .from('bookings')
          .select('*', { count: 'exact', head: true })
          .gte('booking_date', thirtyDaysAgoStr)
          .lte('booking_date', todayStr)
        if (filterCondition) {
          query = query.or(filterCondition)
        } else {
          query = query.eq('staff_id', userId)
        }
        const r = await query
        return r.count || 0
      })(),

      // Completed jobs (30 days)
      (async () => {
        let query = supabase
          .from('bookings')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'completed')
          .gte('booking_date', thirtyDaysAgoStr)
          .lte('booking_date', todayStr)
        if (filterCondition) {
          query = query.or(filterCondition)
        } else {
          query = query.eq('staff_id', userId)
        }
        const r = await query
        return r.count || 0
      })(),

      // Average rating from reviews
      (async () => {
        const { data: reviews, error } = await supabase
          .from('reviews')
          .select('rating')
          .eq('staff_id', userId)

        if (error) {
          logger.error('Error fetching reviews', { error, userId }, { context: 'StaffBookings' })
          return 0
        }

        if (!reviews || reviews.length === 0) return 0

        const totalRating = reviews.reduce((sum, review) => sum + (review.rating || 0), 0)
        return Math.round((totalRating / reviews.length) * 10) / 10
      })(),

      // Total earnings (current month)
      (async () => {
        let query = supabase
          .from('bookings')
          .select('total_price')
          .eq('status', 'completed')
          .eq('payment_status', 'paid')
          .gte('booking_date', startOfMonthStr)
          .lte('booking_date', todayStr)

        if (filterCondition) {
          query = query.or(filterCondition)
        } else {
          query = query.eq('staff_id', userId)
        }

        const { data: bookings } = await query

        if (!bookings || bookings.length === 0) return 0

        return bookings.reduce((sum, booking) => sum + (booking.total_price || 0), 0)
      })(),
    ])

    // Calculate completion rate
    const completionRate =
      totalJobsResult > 0 ? Math.round((completedJobsResult / totalJobsResult) * 100) : 0

    const stats: StaffStats = {
      jobsToday: jobsTodayResult,
      jobsThisWeek: jobsWeekResult,
      completionRate,
      averageRating: reviewsResult,
      totalEarnings: earningsResult,
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
      totalEarnings: 0,
    }
  }
}

// ============================================================================
// QUERY OPTIONS
// ============================================================================

export const staffBookingsQueryOptions = {
  teamMembership: (userId: string) => ({
    queryKey: queryKeys.staffBookings.teamMembership(userId),
    queryFn: () => fetchStaffTeamMembership(userId),
    staleTime: 10 * 60 * 1000, // 10 minutes (team membership doesn't change often)
    enabled: !!userId,
  }),

  today: (userId: string, teamIds: string[]) => ({
    queryKey: queryKeys.staffBookings.today(userId, teamIds),
    queryFn: () => fetchStaffBookingsToday(userId, teamIds),
    staleTime: 1 * 60 * 1000, // 1 minute (today's bookings change frequently)
    refetchOnMount: 'always' as const, // Always refetch when component mounts
    refetchOnWindowFocus: true, // Refetch when window regains focus
    refetchInterval: 3 * 60 * 1000, // Background refetch every 3 minutes
    enabled: !!userId,
  }),

  upcoming: (userId: string, teamIds: string[]) => ({
    queryKey: queryKeys.staffBookings.upcoming(userId, teamIds),
    queryFn: () => fetchStaffBookingsUpcoming(userId, teamIds),
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchOnMount: 'always' as const, // Always refetch when component mounts
    refetchOnWindowFocus: true, // Refetch when window regains focus
    enabled: !!userId,
  }),

  completed: (userId: string, teamIds: string[]) => ({
    queryKey: queryKeys.staffBookings.completed(userId, teamIds),
    queryFn: () => fetchStaffBookingsCompleted(userId, teamIds),
    staleTime: 10 * 60 * 1000, // 10 minutes (completed bookings rarely change)
    refetchOnMount: 'always' as const, // Always refetch when component mounts
    refetchOnWindowFocus: true, // Refetch when window regains focus
    enabled: !!userId,
  }),

  stats: (userId: string, teamIds: string[]) => ({
    queryKey: queryKeys.staffBookings.stats(userId, teamIds),
    queryFn: () => fetchStaffStats(userId, teamIds),
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchOnMount: 'always' as const, // Always refetch when component mounts
    refetchOnWindowFocus: true, // Refetch when window regains focus
    enabled: !!userId,
  }),
}
