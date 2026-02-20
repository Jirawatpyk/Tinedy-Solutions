/**
 * Staff Calendar Query Functions
 *
 * Query functions for Staff Portal "My Calendar" page.
 * Migrated from use-staff-calendar.ts hook (~242 lines)
 *
 * Features:
 * - Team membership (reuse from staff-bookings-queries)
 * - Calendar events (6 months back → 6 months ahead, total 12 months)
 * - Supports both individual staff and team bookings
 * - Handles V1/V2 packages
 * - Performance logging for query optimization
 */

import { supabase } from '@/lib/supabase'
import { queryKeys } from '@/lib/query-keys'
import { logger } from '@/lib/logger'
import { buildTeamFilterCondition } from '@/lib/team-revenue-utils'
import { fetchStaffTeamMembership, generateMembershipHash, type TeamMembership } from './staff-bookings-queries'

// Re-export team membership function for reuse
export { fetchStaffTeamMembership, generateMembershipHash, type TeamMembership }

// Type for membership period array (same as staff-bookings-queries)
type MembershipPeriodArray = Array<{ teamId: string; joinedAt: string; leftAt: string | null }>

// ============================================================================
// TYPES
// ============================================================================

export interface CalendarEvent {
  id: string
  title: string
  start: Date
  end: Date
  status: string
  customer_name: string
  customer_phone: string
  customer_avatar: string | null
  service_name: string
  service_type: string
  service_price: number
  service_duration: number
  notes: string | null
  booking_id: string
  end_date?: string | null   // YYYY-MM-DD, null = single-day
  job_name?: string | null   // Custom job description for price_mode='custom'
  address: string
  city: string
  state: string
  zip_code: string
  staff_id: string | null
  team_id: string | null
  staff_name: string | null
  team_name: string | null
  area_sqm: number | null
  frequency: number | null
  recurring_sequence: number | null
  recurring_total: number | null
  created_at: string // Added for BookingDetailsModal team member filtering
  // Team details for BookingDetailsModal
  teams: {
    id: string
    name: string
    team_lead_id: string | null
    team_lead: {
      id: string
      full_name: string
    } | null
  } | null
}

interface BookingData {
  id: string
  booking_date: string
  start_time: string
  end_time: string
  status: string
  notes: string | null
  address: string | null
  city: string | null
  state: string | null
  zip_code: string | null
  staff_id: string | null
  team_id: string | null
  area_sqm: number | null
  frequency: number | null
  recurring_sequence: number | null
  recurring_total: number | null
  created_at: string // Added for membership period filtering
  end_date?: string | null
  job_name?: string | null
  customers: Array<{
    full_name: string
    phone: string
    avatar_url: string | null
  }> | {
    full_name: string
    phone: string
    avatar_url: string | null
  } | null
  service_packages: Array<{
    name: string
    duration_minutes: number
    price: number
    service_type: string
  }> | {
    name: string
    duration_minutes: number
    price: number
    service_type: string
  } | null
  service_packages_v2?: Array<{
    name: string
    service_type: string
  }> | {
    name: string
    service_type: string
  } | null
  profiles: Array<{
    full_name: string
  }> | {
    full_name: string
  } | null
  teams: Array<{
    id: string
    name: string
    team_lead_id: string | null
    team_lead: Array<{
      id: string
      full_name: string
    }> | {
      id: string
      full_name: string
    } | null
  }> | {
    id: string
    name: string
    team_lead_id: string | null
    team_lead: Array<{
      id: string
      full_name: string
    }> | {
      id: string
      full_name: string
    } | null
  } | null
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Format date to YYYY-MM-DD for Supabase queries
 */
function formatDate(date: Date): string {
  return date.toISOString().split('T')[0]
}

/**
 * Type guard to check if service package is V1 (has price property)
 */
function isServicePackageV1(
  pkg: { name: string; duration_minutes?: number; price?: number } | { name: string } | null | undefined
): pkg is { name: string; duration_minutes: number; price: number } {
  return pkg !== null && pkg !== undefined && 'price' in pkg && typeof pkg.price === 'number'
}

// Note: buildFilterCondition replaced by buildTeamFilterCondition from team-revenue-utils

/**
 * Filter calendar events by membership periods
 * Staff should only see team bookings created during their membership period(s)
 * Same logic as filterBookingsByMembershipPeriods in staff-bookings-queries.ts
 */
function filterEventsByMembershipPeriods(
  bookings: BookingData[],
  userId: string,
  allMembershipPeriods: MembershipPeriodArray
): BookingData[] {
  return bookings.filter(booking => {
    // Direct staff assignment - always show
    if (booking.staff_id === userId) {
      return true
    }

    // Team booking - check if staff was a member when booking was created
    if (booking.team_id) {
      const periodsForTeam = allMembershipPeriods.filter(p => p.teamId === booking.team_id)

      if (periodsForTeam.length === 0) {
        return false
      }

      const bookingCreatedAt = new Date(booking.created_at)

      return periodsForTeam.some(period => {
        const staffJoinedAt = new Date(period.joinedAt)
        const staffLeftAt = period.leftAt ? new Date(period.leftAt) : null

        if (bookingCreatedAt < staffJoinedAt) return false
        if (staffLeftAt && bookingCreatedAt > staffLeftAt) return false

        return true
      })
    }

    return true
  })
}

/**
 * Transform booking data to calendar event
 */
function transformToCalendarEvent(booking: BookingData): CalendarEvent {
  const [startHours, startMinutes] = booking.start_time.split(':').map(Number)
  const startDate = new Date(booking.booking_date)
  startDate.setHours(startHours, startMinutes, 0, 0)

  // Use end_time from booking — for multi-day bookings, end is on end_date (not booking_date)
  const [endHours, endMinutes] = booking.end_time.split(':').map(Number)
  const endDate = new Date(`${booking.end_date || booking.booking_date}T00:00:00`)
  endDate.setHours(endHours, endMinutes, 0, 0)

  // Calculate actual duration
  const actualDurationMinutes = (endHours * 60 + endMinutes) - (startHours * 60 + startMinutes)

  // Handle customers as array or single object
  const customer = Array.isArray(booking.customers) ? booking.customers[0] : booking.customers

  // Merge V1 and V2 package data
  const packageData = booking.service_packages || booking.service_packages_v2
  const servicePackage = Array.isArray(packageData) ? packageData[0] : packageData

  // Handle profiles (staff) as array or single object
  const profile = Array.isArray(booking.profiles) ? booking.profiles[0] : booking.profiles

  // Handle teams as array or single object
  const team = Array.isArray(booking.teams) ? booking.teams[0] : booking.teams

  return {
    id: booking.id,
    title: `${customer?.full_name || 'Unknown'} - ${booking.job_name || servicePackage?.name || 'Unknown Service'}`,
    start: startDate,
    end: endDate,
    status: booking.status,
    customer_name: customer?.full_name || 'Unknown Customer',
    customer_phone: customer?.phone || '',
    customer_avatar: customer?.avatar_url || null,
    service_name: booking.job_name || servicePackage?.name || 'Unknown Service',
    service_type: servicePackage?.service_type || 'cleaning',
    service_price: isServicePackageV1(servicePackage) ? servicePackage.price : 0,
    service_duration: actualDurationMinutes,
    notes: booking.notes,
    booking_id: booking.id,
    end_date: booking.end_date ?? null,
    job_name: booking.job_name ?? null,
    address: booking.address || '',
    city: booking.city || '',
    state: booking.state || '',
    zip_code: booking.zip_code || '',
    staff_id: booking.staff_id || null,
    team_id: booking.team_id || null,
    staff_name: profile?.full_name || null,
    team_name: team?.name || null,
    area_sqm: booking.area_sqm || null,
    frequency: booking.frequency || null,
    recurring_sequence: booking.recurring_sequence || null,
    recurring_total: booking.recurring_total || null,
    created_at: booking.created_at, // Pass to BookingDetailsModal for team member filtering
    // Include full teams data for BookingDetailsModal
    // Handle team_lead as array or single object
    teams: team ? {
      id: team.id,
      name: team.name,
      team_lead_id: team.team_lead_id,
      team_lead: Array.isArray(team.team_lead) ? team.team_lead[0] || null : team.team_lead || null,
    } : null,
  }
}

// ============================================================================
// QUERY FUNCTIONS
// ============================================================================

/**
 * Fetch Staff Calendar Events
 * Date Range: 6 months back → 6 months ahead (12 months total)
 * @param userId - Staff user ID
 * @param teamIds - Array of team IDs staff belongs to
 * @param allMembershipPeriods - Array of ALL membership periods (supports re-join)
 */
export async function fetchStaffCalendarEvents(
  userId: string,
  teamIds: string[],
  allMembershipPeriods: MembershipPeriodArray = []
): Promise<CalendarEvent[]> {
  const startTime = Date.now()

  try {
    // Calculate date range: 6 months back → 6 months ahead
    const today = new Date()
    const startDate = new Date(today)
    startDate.setMonth(startDate.getMonth() - 6)
    const endDate = new Date(today)
    endDate.setMonth(endDate.getMonth() + 6)

    const startDateStr = formatDate(startDate)
    const endDateStr = formatDate(endDate)

    const filterCondition = buildTeamFilterCondition(userId, teamIds)

    let query = supabase
      .from('bookings')
      .select(`
        id,
        booking_date,
        start_time,
        end_time,
        status,
        notes,
        address,
        city,
        state,
        zip_code,
        staff_id,
        team_id,
        area_sqm,
        frequency,
        recurring_sequence,
        recurring_total,
        created_at,
        end_date,
        job_name,
        customers (full_name, phone, avatar_url),
        service_packages (name, duration_minutes, price, service_type),
        service_packages_v2:package_v2_id (name, service_type),
        profiles!bookings_staff_id_fkey (full_name),
        teams (
          id,
          name,
          team_lead_id,
          team_lead:profiles!teams_team_lead_id_fkey (
            id,
            full_name
          )
        )
      `)
      .is('deleted_at', null)
      .gte('booking_date', startDateStr)
      .lte('booking_date', endDateStr)
      .order('booking_date', { ascending: true })

    if (filterCondition) {
      query = query.or(filterCondition)
    } else {
      query = query.eq('staff_id', userId)
    }

    const { data, error } = await query

    if (error) {
      logger.error('Error fetching calendar events', { error, userId }, { context: 'StaffCalendar' })
      throw new Error(`Failed to fetch calendar events: ${error.message}`)
    }

    // Filter by membership periods first (same logic as staff-bookings-queries)
    const filteredBookings = filterEventsByMembershipPeriods(
      data as BookingData[] || [],
      userId,
      allMembershipPeriods
    )

    // Transform to calendar events
    const calendarEvents = filteredBookings.map(transformToCalendarEvent)

    // Performance logging
    const queryTime = Date.now() - startTime
    if (queryTime > 1000) {
      logger.warn('Slow calendar query detected', {
        queryTime: `${queryTime}ms`,
        eventCount: calendarEvents.length,
        dateRange: `${startDateStr} to ${endDateStr}`,
        userId
      }, { context: 'StaffCalendar' })
    } else {
      logger.debug('Calendar Events', {
        count: calendarEvents.length,
        queryTime: `${queryTime}ms`,
        dateRange: `${startDateStr} to ${endDateStr}`
      }, { context: 'StaffCalendar' })
    }

    return calendarEvents
  } catch (err) {
    const queryTime = Date.now() - startTime
    logger.error('Error fetching calendar events', {
      error: err,
      userId,
      queryTime: `${queryTime}ms`
    }, { context: 'StaffCalendar' })
    return []
  }
}

// ============================================================================
// QUERY OPTIONS
// ============================================================================

export const staffCalendarQueryOptions = {
  teamMembership: (userId: string) => ({
    queryKey: queryKeys.staffCalendar.teamMembership(userId),
    queryFn: () => fetchStaffTeamMembership(userId),
    staleTime: 10 * 60 * 1000, // 10 minutes (team membership doesn't change often)
    enabled: !!userId,
  }),

  events: (userId: string, teamIds: string[], allMembershipPeriods: MembershipPeriodArray = []) => {
    const membershipHash = generateMembershipHash(allMembershipPeriods)
    return {
      queryKey: queryKeys.staffCalendar.events(userId, teamIds, membershipHash),
      queryFn: () => fetchStaffCalendarEvents(userId, teamIds, allMembershipPeriods),
      staleTime: 5 * 60 * 1000, // 5 minutes
      refetchInterval: 5 * 60 * 1000, // Background refetch every 5 minutes
      enabled: !!userId,
    }
  },
}
