/**
 * Booking Conflict Detection Hook
 *
 * This custom hook provides functionality to detect and manage booking conflicts
 * for staff members and teams. It is critical business logic that prevents
 * double-booking scenarios.
 *
 * @module hooks/useConflictDetection
 */

import { useState, useCallback, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import type { BookingRecord } from '@/types/booking'

/**
 * Parameters for checking booking conflicts
 *
 * @interface ConflictCheckParams
 *
 * @property {string | null} [staffId] - Optional staff member ID to check conflicts for
 * @property {string | null} [teamId] - Optional team ID to check conflicts for
 * @property {string} bookingDate - Date of the booking in YYYY-MM-DD format
 * @property {string} startTime - Start time of the booking in HH:MM format
 * @property {string | null} [endTime] - End time of the booking in HH:MM format
 * @property {string} [excludeBookingId] - Booking ID to exclude from conflict check (when editing existing booking)
 */
export interface ConflictCheckParams {
  staffId?: string | null
  teamId?: string | null
  bookingDate: string
  startTime: string
  endTime?: string | null
  excludeBookingId?: string
}

/**
 * Represents a detected booking conflict
 *
 * @interface BookingConflict
 *
 * @property {BookingRecord} booking - The conflicting booking record
 * @property {'staff' | 'team' | 'both'} conflictType - Type of conflict detected
 * @property {string} message - Human-readable description of the conflict
 */
export interface BookingConflict {
  booking: BookingRecord
  conflictType: 'staff' | 'team' | 'both'
  message: string
}

/**
 * Custom hook for detecting booking conflicts
 *
 * This hook provides comprehensive conflict detection for staff and team bookings.
 * It checks if a staff member or team is already booked at the requested time slot.
 *
 * Key features:
 * - Time overlap detection using proper interval logic
 * - Excludes cancelled and no-show bookings from conflict checks
 * - Supports both staff and team assignment checking
 * - Can exclude a specific booking (useful when editing)
 * - Auto-check mode when params are provided
 *
 * @param {ConflictCheckParams} [params] - Optional params for auto-checking conflicts
 *
 * @returns {Object} Conflict detection state and methods
 * @returns {BookingConflict[]} conflicts - Array of detected conflicts
 * @returns {boolean} isChecking - Loading state during conflict check
 * @returns {string | null} error - Error message if conflict check failed
 * @returns {Function} checkConflicts - Manual conflict check function
 * @returns {Function} clearConflicts - Clears all conflicts and errors
 * @returns {boolean} hasConflicts - Convenience flag indicating if conflicts exist
 *
 * @example
 * // Auto-check mode
 * const { conflicts, isChecking, hasConflicts } = useConflictDetection({
 *   staffId: 'staff-123',
 *   bookingDate: '2025-10-24',
 *   startTime: '09:00',
 *   endTime: '11:00'
 * })
 *
 * @example
 * // Manual check mode
 * const { checkConflicts, hasConflicts } = useConflictDetection()
 *
 * const handleSubmit = async () => {
 *   const conflicts = await checkConflicts({
 *     staffId: formData.staffId,
 *     bookingDate: formData.date,
 *     startTime: formData.startTime,
 *     endTime: formData.endTime
 *   })
 *
 *   if (conflicts.length > 0) {
 *     // Show warning
 *   }
 * }
 */
export function useConflictDetection(params?: ConflictCheckParams) {
  const [conflicts, setConflicts] = useState<BookingConflict[]>([])
  const [isChecking, setIsChecking] = useState(false)
  const [error, setError] = useState<string | null>(null)

  /**
   * Check for booking conflicts
   *
   * This function queries the database for overlapping bookings and returns
   * any conflicts found. It uses interval overlap logic: two time ranges overlap
   * if (start1 < end2) AND (end1 > start2).
   *
   * @param {ConflictCheckParams} checkParams - Parameters for the conflict check
   * @returns {Promise<BookingConflict[]>} Array of detected conflicts
   */
  const checkConflicts = useCallback(async (
    checkParams: ConflictCheckParams
  ): Promise<BookingConflict[]> => {
    const { staffId, teamId, bookingDate, startTime, endTime, excludeBookingId } = checkParams

    // Validation: Skip check if no staff or team assigned
    if (!staffId && !teamId) {
      return []
    }

    // Validation: Skip check if required fields are missing
    if (!bookingDate || !startTime) {
      return []
    }

    setIsChecking(true)
    setError(null)

    try {
      // Build query to find potentially overlapping bookings on the same date
      let query = supabase
        .from('bookings')
        .select('*')
        .eq('booking_date', bookingDate)
        .not('status', 'in', '(cancelled,no_show)') // Exclude cancelled/no-show bookings

      // Exclude current booking if editing (to avoid self-conflict)
      if (excludeBookingId) {
        query = query.neq('id', excludeBookingId)
      }

      // Filter by staff OR team (based on what's being checked)
      if (staffId) {
        query = query.eq('staff_id', staffId)
      } else if (teamId) {
        query = query.eq('team_id', teamId)
      }

      const { data: overlappingBookings, error: queryError } = await query

      if (queryError) throw queryError

      // Check for time overlaps using proper interval logic
      const detectedConflicts: BookingConflict[] = []

      overlappingBookings?.forEach((booking) => {
        const hasOverlap = checkTimeOverlap(
          startTime,
          endTime || startTime, // Use startTime as endTime if not provided
          booking.start_time,
          booking.end_time || booking.start_time
        )

        if (hasOverlap) {
          detectedConflicts.push({
            booking: booking as BookingRecord,
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
      return []
    } finally {
      setIsChecking(false)
    }
  }, [])

  /**
   * Check if two time ranges overlap
   *
   * Uses standard interval overlap logic: two intervals [start1, end1] and [start2, end2]
   * overlap if and only if (start1 < end2) AND (end1 > start2).
   *
   * Time strings are converted to minutes since midnight for accurate comparison.
   *
   * @param {string} start1 - Start time of first interval (HH:MM)
   * @param {string} end1 - End time of first interval (HH:MM)
   * @param {string} start2 - Start time of second interval (HH:MM)
   * @param {string} end2 - End time of second interval (HH:MM)
   * @returns {boolean} True if the time ranges overlap
   *
   * @example
   * checkTimeOverlap('09:00', '11:00', '10:00', '12:00') // true (overlap)
   * checkTimeOverlap('09:00', '11:00', '11:00', '12:00') // false (adjacent, no overlap)
   * checkTimeOverlap('09:00', '11:00', '13:00', '14:00') // false (completely separate)
   */
  const checkTimeOverlap = (
    start1: string,
    end1: string,
    start2: string,
    end2: string
  ): boolean => {
    // Convert time strings (HH:MM or HH:MM:SS) to minutes since midnight
    const toMinutes = (time: string): number => {
      const [hours, minutes] = time.split(':').map(Number)
      return hours * 60 + minutes
    }

    const s1 = toMinutes(start1)
    const e1 = toMinutes(end1)
    const s2 = toMinutes(start2)
    const e2 = toMinutes(end2)

    // Overlap condition: (start1 < end2) AND (end1 > start2)
    return s1 < e2 && e1 > s2
  }

  /**
   * Auto-check when params change
   *
   * If params are provided to the hook, automatically run conflict check
   * whenever the params change. We destructure params into primitive values
   * to prevent infinite re-renders from object reference changes.
   */
  useEffect(() => {
    if (params) {
      checkConflicts(params)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    params?.staffId,
    params?.teamId,
    params?.bookingDate,
    params?.startTime,
    params?.endTime,
    params?.excludeBookingId,
    checkConflicts
  ])

  /**
   * Clear all conflicts and errors
   *
   * Useful for resetting state when form is cleared or dialog is closed.
   */
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
