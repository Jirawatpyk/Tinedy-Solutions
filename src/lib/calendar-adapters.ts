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
    service_package_id: '',
    booking_date: format(event.start, 'yyyy-MM-dd'),
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
      service_type: 'cleaning',
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
  const endDate = new Date(`${booking.booking_date}T${booking.end_time}`)

  return {
    id: booking.id,
    title: `${booking.customers?.full_name || 'Unknown'} - ${booking.service_packages?.name || 'Unknown Service'}`,
    start: startDate,
    end: endDate,
    status: booking.status,
    customer_name: booking.customers?.full_name || 'Unknown Customer',
    customer_phone: booking.customers?.phone || '',
    customer_avatar: null,
    service_name: booking.service_packages?.name || 'Unknown Service',
    service_price: booking.total_price,
    service_duration: 60, // Default duration
    notes: booking.notes,
    booking_id: booking.id,
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
 * Creates a Map for efficient lookup by date
 */
export function groupBookingsByDate(bookings: Booking[]): Map<string, Booking[]> {
  const map = new Map<string, Booking[]>()

  for (const booking of bookings) {
    const dateKey = booking.booking_date
    const existing = map.get(dateKey) || []
    existing.push(booking)
    map.set(dateKey, existing)
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
    service_package_id: '',
    package_v2_id: null,
    created_at: new Date().toISOString(),
    area_sqm: event.area_sqm,
    frequency: event.frequency,
    customers: {
      id: '',
      full_name: event.customer_name,
      phone: event.customer_phone || null,
      avatar_url: event.customer_avatar,
    },
    service_packages: {
      id: '',
      name: event.service_name,
      service_type: 'cleaning',
      duration_minutes: event.service_duration,
      price: event.service_price,
    },
    service_packages_v2: null,
  }
}
