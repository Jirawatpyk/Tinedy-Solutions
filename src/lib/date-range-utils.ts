/**
 * Date Range Utilities for Multi-Day Booking Support
 *
 * Pure functions for date range formatting, overlap detection, and iteration.
 * All functions support the new multi-day booking model where end_date is nullable
 * (null = single-day booking, same as booking_date).
 *
 * IMPORTANT — Thai Timezone:
 * For date-only strings, ALWAYS use `new Date(date + 'T00:00:00')` (local time).
 * NEVER use `parseISO(date)` — parseISO parses as UTC midnight which can shift
 * the date by a day in Thailand (UTC+7).
 *
 * @module lib/date-range-utils
 */

import { format, differenceInDays } from 'date-fns'
import { th } from 'date-fns/locale'

/**
 * Minimal booking shape required by overlap functions
 */
interface BookingDateRange {
  booking_date: string     // YYYY-MM-DD
  end_date?: string | null // YYYY-MM-DD or null (single-day)
}

/**
 * Parse a YYYY-MM-DD string as local midnight (timezone-safe)
 * Use this instead of parseISO for date-only strings
 */
function parseLocalDate(dateStr: string): Date {
  return new Date(`${dateStr}T00:00:00`)
}

/**
 * Format a single date as Thai short string: "19 ก.พ."
 */
function formatThaiDate(dateStr: string, includeYear = false): string {
  const date = parseLocalDate(dateStr)
  if (includeYear) {
    return format(date, 'd MMM yyyy', { locale: th })
  }
  return format(date, 'd MMM', { locale: th })
}

/**
 * Format a date range as a Thai string.
 *
 * Rules:
 * - Single day (end_date = null OR end_date = booking_date): "19 ก.พ."
 * - Same-month range: "19–20 ก.พ."
 * - Cross-month, same-year range: "28 ก.พ. – 2 มี.ค."
 * - Cross-year range: "31 ธ.ค. – 1 ม.ค. 2027" (year shown on end date)
 *
 * @example
 * formatDateRange('2026-02-19', null)             // "19 ก.พ."
 * formatDateRange('2026-02-19', '2026-02-19')     // "19 ก.พ."
 * formatDateRange('2026-02-19', '2026-02-20')     // "19–20 ก.พ."
 * formatDateRange('2026-02-28', '2026-03-02')     // "28 ก.พ. – 2 มี.ค."
 * formatDateRange('2026-12-31', '2027-01-01')     // "31 ธ.ค. – 1 ม.ค. 2027"
 */
export function formatDateRange(start: string, end: string | null | undefined): string {
  // Single day: no end_date or end_date equals start
  if (!end || end === start) {
    return formatThaiDate(start)
  }

  const startDate = parseLocalDate(start)
  const endDate = parseLocalDate(end)

  const startYear = startDate.getFullYear()
  const endYear = endDate.getFullYear()
  const startMonth = startDate.getMonth()
  const endMonth = endDate.getMonth()

  // Cross-year: show year on end date
  if (startYear !== endYear) {
    return `${formatThaiDate(start)} – ${formatThaiDate(end, true)}`
  }

  // Same month, same year: "19–20 ก.พ."
  if (startMonth === endMonth) {
    const startDay = format(startDate, 'd')
    const endPart = format(endDate, 'd MMM', { locale: th })
    return `${startDay}–${endPart}`
  }

  // Cross-month, same year: "28 ก.พ. – 2 มี.ค."
  return `${formatThaiDate(start)} – ${formatThaiDate(end)}`
}

/**
 * Get all dates between two dates (inclusive)
 *
 * @param start - Start date (YYYY-MM-DD)
 * @param end - End date (YYYY-MM-DD)
 * @returns Array of date strings in YYYY-MM-DD format
 *
 * @example
 * getDatesBetween('2026-02-19', '2026-02-21')
 * // ["2026-02-19", "2026-02-20", "2026-02-21"]
 */
export function getDatesBetween(start: string, end: string): string[] {
  const dates: string[] = []
  const current = parseLocalDate(start)
  const endDate = parseLocalDate(end)

  while (current <= endDate) {
    dates.push(format(current, 'yyyy-MM-dd'))
    current.setDate(current.getDate() + 1)
  }

  return dates
}

/**
 * Check if a booking overlaps a specific date
 *
 * A booking overlaps a date if:
 *   booking_date <= date AND effectiveEndDate >= date
 *
 * Where effectiveEndDate = end_date ?? booking_date (null = single day)
 *
 * @param booking - Booking record with booking_date and optional end_date
 * @param date - Date string to check (YYYY-MM-DD)
 * @returns true if booking covers that date
 *
 * @example
 * bookingOverlapsDate({ booking_date: '2026-02-19', end_date: '2026-02-21' }, '2026-02-20') // true
 * bookingOverlapsDate({ booking_date: '2026-02-19', end_date: null }, '2026-02-20')         // false
 */
export function bookingOverlapsDate(booking: BookingDateRange, date: string): boolean {
  const effectiveEnd = booking.end_date ?? booking.booking_date
  return booking.booking_date <= date && effectiveEnd >= date
}

/**
 * Check if a booking overlaps a date range [rangeStart, rangeEnd]
 *
 * Two date ranges overlap if:
 *   booking.start <= rangeEnd AND booking.effectiveEnd >= rangeStart
 *
 * Where effectiveEnd = end_date ?? booking_date (null = single day)
 *
 * Note: Adjacent bookings (end = rangeStart - 1 day) do NOT conflict.
 *
 * @param booking - Booking record with booking_date and optional end_date
 * @param rangeStart - Start of the range to check (YYYY-MM-DD)
 * @param rangeEnd - End of the range to check (YYYY-MM-DD)
 * @returns true if booking overlaps the range
 *
 * @example
 * // 2-day booking (Feb 19-20) overlaps Feb 19-25 range
 * bookingOverlapsRange({ booking_date: '2026-02-19', end_date: '2026-02-20' }, '2026-02-19', '2026-02-25') // true
 *
 * // Adjacent: booking ends Feb 19, range starts Feb 20 — NO conflict
 * bookingOverlapsRange({ booking_date: '2026-02-18', end_date: '2026-02-19' }, '2026-02-20', '2026-02-21') // false
 */
export function bookingOverlapsRange(
  booking: BookingDateRange,
  rangeStart: string,
  rangeEnd: string
): boolean {
  // Normalize: treat null end_date as same-day
  const effectiveEnd = booking.end_date ?? booking.booking_date

  // Overlap condition: booking.start <= rangeEnd AND booking.effectiveEnd >= rangeStart
  return booking.booking_date <= rangeEnd && effectiveEnd >= rangeStart
}

/**
 * Calculate number of days a booking spans (1 = single day)
 *
 * @param booking - Booking record with booking_date and optional end_date
 * @returns Number of days (minimum 1)
 */
export function bookingDurationDays(booking: BookingDateRange): number {
  if (!booking.end_date || booking.end_date === booking.booking_date) {
    return 1
  }
  const start = parseLocalDate(booking.booking_date)
  const end = parseLocalDate(booking.end_date)
  return differenceInDays(end, start) + 1
}
