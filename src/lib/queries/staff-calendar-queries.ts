/**
 * Staff Calendar Query Functions
 *
 * Query functions for Staff Portal "My Calendar" page.
 * Migrated from use-staff-calendar.ts hook (~242 lines)
 *
 * Features:
 * - Team membership (reuse from staff-bookings-queries)
 * - Calendar events (3 months ahead)
 * - Supports both individual staff and team bookings
 * - Handles V1/V2 packages
 */

import { supabase } from '@/lib/supabase'
import { queryKeys } from '@/lib/query-keys'
import { logger } from '@/lib/logger'
import { fetchStaffTeamMembership, type TeamMembership } from './staff-bookings-queries'

// Re-export team membership function for reuse
export { fetchStaffTeamMembership, type TeamMembership }

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
  service_price: number
  service_duration: number
  notes: string | null
  booking_id: string
  address: string
  city: string
  state: string
  zip_code: string
  staff_id: string | null
  team_id: string | null
  staff_name: string | null
  team_name: string | null
  area_sqm: number | null
  frequency: 1 | 2 | 4 | 8 | null
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
  frequency: 1 | 2 | 4 | 8 | null
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
  }> | {
    name: string
    duration_minutes: number
    price: number
  } | null
  service_packages_v2?: Array<{
    name: string
  }> | {
    name: string
  } | null
  profiles: Array<{
    full_name: string
  }> | {
    full_name: string
  } | null
  teams: Array<{
    name: string
  }> | {
    name: string
  } | null
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Type guard to check if service package is V1 (has price property)
 */
function isServicePackageV1(
  pkg: { name: string; duration_minutes?: number; price?: number } | { name: string } | null | undefined
): pkg is { name: string; duration_minutes: number; price: number } {
  return pkg !== null && pkg !== undefined && 'price' in pkg && typeof pkg.price === 'number'
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
 * Transform booking data to calendar event
 */
function transformToCalendarEvent(booking: BookingData): CalendarEvent {
  const [startHours, startMinutes] = booking.start_time.split(':').map(Number)
  const startDate = new Date(booking.booking_date)
  startDate.setHours(startHours, startMinutes, 0, 0)

  // Use end_time from booking
  const [endHours, endMinutes] = booking.end_time.split(':').map(Number)
  const endDate = new Date(booking.booking_date)
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
    title: `${customer?.full_name || 'Unknown'} - ${servicePackage?.name || 'Unknown Service'}`,
    start: startDate,
    end: endDate,
    status: booking.status,
    customer_name: customer?.full_name || 'Unknown Customer',
    customer_phone: customer?.phone || '',
    customer_avatar: customer?.avatar_url || null,
    service_name: servicePackage?.name || 'Unknown Service',
    service_price: isServicePackageV1(servicePackage) ? servicePackage.price : 0,
    service_duration: actualDurationMinutes,
    notes: booking.notes,
    booking_id: booking.id,
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
  }
}

// ============================================================================
// QUERY FUNCTIONS
// ============================================================================

/**
 * Fetch Staff Calendar Events (all bookings)
 */
export async function fetchStaffCalendarEvents(
  userId: string,
  teamIds: string[]
): Promise<CalendarEvent[]> {
  try {
    const filterCondition = buildFilterCondition(userId, teamIds)

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
        customers (full_name, phone, avatar_url),
        service_packages (name, duration_minutes, price),
        service_packages_v2:package_v2_id (name),
        profiles!bookings_staff_id_fkey (full_name),
        teams (name)
      `)
      .is('deleted_at', null)
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

    // Transform to calendar events
    const calendarEvents = (data as BookingData[] || []).map(transformToCalendarEvent)

    logger.debug('Calendar Events', { count: calendarEvents.length }, { context: 'StaffCalendar' })

    return calendarEvents
  } catch (err) {
    logger.error('Error fetching calendar events', { error: err, userId }, { context: 'StaffCalendar' })
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

  events: (userId: string, teamIds: string[]) => ({
    queryKey: queryKeys.staffCalendar.events(userId, teamIds),
    queryFn: () => fetchStaffCalendarEvents(userId, teamIds),
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchInterval: 5 * 60 * 1000, // Background refetch every 5 minutes
    enabled: !!userId,
  }),
}
