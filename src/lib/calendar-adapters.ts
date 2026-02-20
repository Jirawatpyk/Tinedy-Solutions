/**
 * Calendar Data Adapters
 *
 * Utility functions to convert between different calendar data formats.
 * Enables reuse of shared calendar components across Admin and Staff portals.
 *
 * Key Conversions:
 * - CalendarEvent (Staff) → Booking (Admin)
 * - Booking (Admin) → CalendarEvent (Staff)
 */

import { format } from 'date-fns'
import { getDatesBetween } from '@/lib/date-range-utils'
import type { Booking } from '@/types/booking'
import type { CalendarEvent } from '@/lib/queries/staff-calendar-queries'
import type { StaffBooking } from '@/lib/queries/staff-bookings-queries'

// ============================================================================
// STAFF → ADMIN (CalendarEvent → Booking)
// ============================================================================

/**
 * Convert Staff Portal CalendarEvent to Admin Booking format
 *
 * This allows Staff Portal to reuse Admin's shared calendar components
 * (MobileCalendar, BookingListSidebar, etc.)
 *
 * @param event - CalendarEvent from Staff Portal
 * @returns Booking - Compatible with Admin calendar components
 *
 * @example
 * ```tsx
 * const staffEvents = useStaffCalendar()
 * const bookings = staffEvents.map(calendarEventToBooking)
 * // Now use with <MobileCalendar bookings={bookings} />
 * ```
 */
export function calendarEventToBooking(event: CalendarEvent): Booking {
  return {
    id: event.booking_id,
    customer_id: '',
    staff_id: event.staff_id,
    team_id: event.team_id,
    booking_date: format(event.start, 'yyyy-MM-dd'),
    end_date: event.end_date ?? null,
    job_name: event.job_name ?? null,
    start_time: format(event.start, 'HH:mm:ss'),
    end_time: format(event.end, 'HH:mm:ss'),
    status: event.status,
    total_price: event.service_price,
    notes: event.notes,
    created_at: new Date().toISOString(),
    payment_status: 'unpaid',
    address: event.address,
    city: event.city,
    state: event.state || '',
    zip_code: event.zip_code || '',
    // Related data - matching Booking interface exactly
    customers: {
      id: '',
      full_name: event.customer_name,
      phone: event.customer_phone || null,
      email: '',
    },
    service_packages: {
      name: event.service_name,
      service_type: event.service_type,
    },
    profiles: event.staff_name
      ? { full_name: event.staff_name }
      : null,
    teams: event.team_name
      ? { name: event.team_name }
      : null,
  }
}

/**
 * Convert array of CalendarEvents to Bookings
 */
export function calendarEventsToBookings(events: CalendarEvent[]): Booking[] {
  return events.map(calendarEventToBooking)
}

// ============================================================================
// ADMIN → STAFF (Booking → CalendarEvent)
// ============================================================================

/**
 * Convert Admin Booking to Staff Portal CalendarEvent format
 *
 * Useful if Admin components need to display in Staff format
 *
 * @param booking - Booking from Admin Portal
 * @returns CalendarEvent - Compatible with Staff calendar
 */
export function bookingToCalendarEvent(booking: Booking): CalendarEvent {
  const startDate = new Date(`${booking.booking_date}T${booking.start_time}`)
  // T4.1: Multi-day support — use end_date if present, otherwise use booking_date
  const endDateStr = booking.end_date ?? booking.booking_date
  const endDate = new Date(`${endDateStr}T${booking.end_time}`)

  return {
    id: booking.id,
    title: `${booking.customers?.full_name || 'Unknown'} - ${booking.job_name ?? booking.service_packages_v2?.name ?? booking.service_packages?.name ?? 'Unknown Service'}`,
    start: startDate,
    end: endDate,
    status: booking.status,
    customer_name: booking.customers?.full_name || 'Unknown Customer',
    customer_phone: booking.customers?.phone || '',
    customer_avatar: null,
    service_name: booking.job_name ?? booking.service_packages_v2?.name ?? booking.service_packages?.name ?? 'Unknown Service',
    service_type: booking.service_packages?.service_type || 'cleaning',
    service_price: booking.total_price,
    service_duration: 60, // Default duration (minutes) — Booking doesn't carry duration_minutes directly
    notes: booking.notes,
    booking_id: booking.id,
    end_date: booking.end_date ?? null,
    job_name: booking.job_name ?? null,
    address: booking.address || '',
    city: booking.city || '',
    state: booking.state || '',
    zip_code: booking.zip_code || '',
    staff_id: booking.staff_id,
    team_id: booking.team_id,
    staff_name: booking.profiles?.full_name || null,
    team_name: booking.teams?.name || null,
    area_sqm: null,
    frequency: null,
    recurring_sequence: booking.recurring_sequence || null,
    recurring_total: booking.recurring_total || null,
    created_at: booking.created_at || new Date().toISOString(), // Pass through for team member filtering
    // Map teams data for BookingDetailsModal
    teams: booking.teams ? {
      id: booking.team_id || '',
      name: booking.teams.name,
      team_lead_id: booking.teams.team_lead?.id || null,
      team_lead: booking.teams.team_lead || null,
    } : null,
  }
}

/**
 * Convert array of Bookings to CalendarEvents
 */
export function bookingsToCalendarEvents(bookings: Booking[]): CalendarEvent[] {
  return bookings.map(bookingToCalendarEvent)
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Group bookings by date key (yyyy-MM-dd)
 *
 * Multi-day bookings are indexed under every date they span,
 * so a Feb 19–21 booking appears in Feb 19, Feb 20, and Feb 21 cells.
 */
export function groupBookingsByDate(bookings: Booking[]): Map<string, Booking[]> {
  const map = new Map<string, Booking[]>()

  for (const booking of bookings) {
    const dates = booking.end_date
      ? getDatesBetween(booking.booking_date, booking.end_date)
      : [booking.booking_date]

    for (const dateKey of dates) {
      const existing = map.get(dateKey) || []
      existing.push(booking)
      map.set(dateKey, existing)
    }
  }

  return map
}

/**
 * Group CalendarEvents by date key (yyyy-MM-dd)
 */
export function groupCalendarEventsByDate(events: CalendarEvent[]): Map<string, CalendarEvent[]> {
  const map = new Map<string, CalendarEvent[]>()

  for (const event of events) {
    const dateKey = format(event.start, 'yyyy-MM-dd')
    const existing = map.get(dateKey) || []
    existing.push(event)
    map.set(dateKey, existing)
  }

  return map
}

/**
 * Create empty conflict map (Staff Portal doesn't track conflicts)
 */
export function createEmptyConflictMap(): Map<string, Set<string>> {
  return new Map()
}

// ============================================================================
// CALENDAR EVENT → STAFF BOOKING (For BookingDetailsModal)
// ============================================================================

/**
 * Convert CalendarEvent to StaffBooking format
 *
 * Used when passing data to BookingDetailsModal which expects StaffBooking type.
 * Ensures proper time format (HH:mm:ss) and all required fields.
 *
 * @param event - CalendarEvent from Staff Calendar
 * @returns StaffBooking - Compatible with BookingDetailsModal
 */
export function calendarEventToStaffBooking(event: CalendarEvent): StaffBooking {
  return {
    id: event.booking_id,
    booking_date: format(event.start, 'yyyy-MM-dd'),
    end_date: event.end_date ?? null,
    job_name: event.job_name ?? null,
    start_time: format(event.start, 'HH:mm:ss'), // Must be HH:mm:ss format
    end_time: format(event.end, 'HH:mm:ss'),     // Must be HH:mm:ss format
    status: event.status,
    payment_status: 'unpaid',
    total_price: event.service_price,
    notes: event.notes,
    address: event.address,
    city: event.city,
    state: event.state || '',
    zip_code: event.zip_code || '',
    customer_id: '',
    staff_id: event.staff_id,
    team_id: event.team_id,
    package_v2_id: null,
    created_at: event.created_at, // Use actual booking created_at for team member filtering
    area_sqm: event.area_sqm,
    frequency: event.frequency,
    recurring_sequence: event.recurring_sequence,
    recurring_total: event.recurring_total,
    customers: {
      id: '',
      full_name: event.customer_name,
      phone: event.customer_phone || null,
      avatar_url: event.customer_avatar,
    },
    service_packages: {
      id: '',
      name: event.service_name,
      service_type: event.service_type,
      duration_minutes: event.service_duration,
      price: event.service_price,
    },
    service_packages_v2: null,
    // Map teams data for BookingDetailsModal to display team info
    teams: event.teams ? {
      id: event.teams.id,
      name: event.teams.name,
      team_lead_id: event.teams.team_lead_id,
      team_lead: event.teams.team_lead,
      team_members: [], // Will be fetched separately in BookingDetailsModal
    } : null,
  }
}
