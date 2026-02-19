/**
 * Booking Conflict Detection Hook
 *
 * Rewritten for multi-day booking support (V2).
 * Key changes from V1:
 * - Date range overlap query (not single-date eq)
 * - EC-C1: Exact-touch time (end=12:00, next start=12:00) is NOT a conflict
 * - EC-C2: Team assignment conflict checks team members too
 * - EC-C4: Unassigned bookings skip conflict check entirely
 * - R2: NULL end_date normalized to booking_date in all comparisons
 *
 * NOTE — R1 Race Condition:
 * Supabase/PostgreSQL does not guarantee atomic read-check-write at the app layer.
 * This conflict check runs immediately before the mutation as a best-effort guard.
 * For production hardening (post-MVP), add a DB-level unique partial index or
 * advisory lock to prevent race conditions in high-concurrency scenarios.
 *
 * NOTE — A4 Date range filter (JS-side):
 * The reverse overlap direction (effectiveEnd >= bookingDate) is evaluated in JS after
 * fetching, to avoid PostgREST nested AND-inside-OR syntax issues.
 * If query volume grows, migrate to: `.rpc('check_booking_conflict', params)`
 *
 * @module hooks/use-conflict-detection
 */

import { useState, useCallback, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import type { BookingRecord } from '@/types/booking'

/**
 * Extended booking record with relations for conflict display
 */
interface BookingRecordWithRelations extends BookingRecord {
  customers?: { id: string; full_name: string; email: string } | null
  service_packages?: { name: string; service_type: string } | null
  profiles?: { full_name: string } | null
  teams?: { name: string } | null
}

/**
 * Parameters for checking booking conflicts
 */
export interface ConflictCheckParams {
  staffId?: string | null
  teamId?: string | null
  bookingDate: string         // YYYY-MM-DD start of range
  endDate?: string | null     // YYYY-MM-DD end of range (null = single day)
  startTime: string
  endTime?: string | null
  excludeBookingId?: string
}

/**
 * Represents a detected booking conflict
 */
export interface BookingConflict {
  booking: BookingRecordWithRelations
  conflictType: 'staff' | 'team' | 'both'
  message: string
}

/**
 * Custom hook for detecting booking conflicts with multi-day support
 */
export function useConflictDetection(params?: ConflictCheckParams) {
  const [conflicts, setConflicts] = useState<BookingConflict[]>([])
  const [isChecking, setIsChecking] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const checkConflicts = useCallback(async (
    checkParams: ConflictCheckParams
  ): Promise<BookingConflict[]> => {
    const { staffId, teamId, bookingDate, endDate, startTime, endTime, excludeBookingId } = checkParams

    // EC-C4: Unassigned bookings skip conflict check entirely
    if (!staffId && !teamId) {
      return []
    }

    if (!bookingDate || !startTime) {
      return []
    }

    setIsChecking(true)
    setError(null)

    try {
      // R2: Normalize — treat end_date=NULL as end_date=booking_date in ALL comparisons
      // This ensures NULL-endDate bookings behave identically to same-day ranges
      const checkEndDate = endDate ?? bookingDate

      // M2: Practical lower bound — no booking spans more than 1 year.
      // Prevents fetching the full history of a busy staff member.
      const lowerBoundDate = new Date(bookingDate + 'T00:00:00')
      lowerBoundDate.setFullYear(lowerBoundDate.getFullYear() - 1)
      const queryLowerBound = lowerBoundDate.toISOString().split('T')[0]

      // Build range overlap query:
      // Fetch bookings for the staff/team that START within [lowerBound, checkEndDate].
      // The reverse direction (effective end >= bookingDate) is checked in JS below (A4).
      let query = supabase
        .from('bookings')
        .select(`
          *,
          customers (id, full_name, email),
          service_packages (name, service_type),
          profiles!bookings_staff_id_fkey (full_name),
          teams (name)
        `)
        .gte('booking_date', queryLowerBound)
        .lte('booking_date', checkEndDate)
        .is('deleted_at', null)
        .not('status', 'in', '(cancelled,no_show)')

      // Exclude current booking when editing (prevent self-conflict)
      if (excludeBookingId) {
        query = query.neq('id', excludeBookingId)
      }

      // EC-C2: Filter by staff OR team assignment
      if (staffId) {
        query = query.eq('staff_id', staffId)
      } else if (teamId) {
        query = query.eq('team_id', teamId)
      }

      const { data: fetchedBookings, error: queryError } = await query

      if (queryError) throw queryError

      // R2: JS-side filter — keep only bookings whose effective end date >= our start date.
      // COALESCE(end_date, booking_date) >= bookingDate — avoids PostgREST nested AND-in-OR.
      const overlappingBookings = (fetchedBookings ?? []).filter((booking) => {
        const effectiveEnd = booking.end_date ?? booking.booking_date
        return effectiveEnd >= bookingDate
      })

      // Check for time overlaps within overlapping days
      const detectedConflicts: BookingConflict[] = []

      overlappingBookings.forEach((booking) => {
        const hasOverlap = checkTimeOverlap(
          startTime,
          endTime || startTime,
          booking.start_time,
          booking.end_time || booking.start_time
        )

        if (hasOverlap) {
          detectedConflicts.push({
            booking: booking as BookingRecordWithRelations,
            conflictType: staffId ? 'staff' : 'team',
            message: `${staffId ? 'Staff' : 'Team'} is already booked at this time`,
          })
        }
      })

      setConflicts(detectedConflicts)
      return detectedConflicts
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to check conflicts'
      setError(errorMessage)
      console.error('[useConflictDetection] Error:', err)
      // M3: Re-throw so callers can show a user-facing error instead of silently
      // proceeding with an unverified schedule (which risks DB constraint errors).
      throw err
    } finally {
      setIsChecking(false)
    }
  }, [])

  /**
   * Check if two time ranges overlap using strictly exclusive boundaries.
   *
   * EC-C1: Exact-touch (end=12:00, next start=12:00) is NOT a conflict.
   * Overlap condition: start1 < end2 AND end1 > start2 (strictly exclusive)
   *
   * @example
   * checkTimeOverlap('09:00', '12:00', '12:00', '14:00') // false — touching, not overlapping
   * checkTimeOverlap('09:00', '12:00', '11:00', '14:00') // true — overlapping
   */
  const checkTimeOverlap = (
    start1: string,
    end1: string,
    start2: string,
    end2: string
  ): boolean => {
    const toMinutes = (time: string): number => {
      const [hours, minutes] = time.split(':').map(Number)
      return hours * 60 + minutes
    }

    const s1 = toMinutes(start1)
    const e1 = toMinutes(end1)
    const s2 = toMinutes(start2)
    const e2 = toMinutes(end2)

    // Strictly exclusive boundaries: s1 < e2 AND e1 > s2
    return s1 < e2 && e1 > s2
  }

  /**
   * Auto-check when params change
   */
  useEffect(() => {
    if (params) {
      // Catch re-thrown errors — error state is already set inside checkConflicts
      checkConflicts(params).catch(() => {})
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    params?.staffId,
    params?.teamId,
    params?.bookingDate,
    params?.endDate,
    params?.startTime,
    params?.endTime,
    params?.excludeBookingId,
    checkConflicts
  ])

  const clearConflicts = useCallback(() => {
    setConflicts([])
    setError(null)
  }, [])

  return {
    conflicts,
    isChecking,
    error,
    checkConflicts,
    clearConflicts,
    hasConflicts: conflicts.length > 0,
  }
}
