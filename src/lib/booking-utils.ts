/**
 * Booking Utility Functions
 *
 * Pure utility functions for booking-related operations.
 * These functions have no side effects and can be used across the application.
 */

/**
 * Interface for booking address fields
 */
interface BookingAddress {
  address: string
  city: string
  state: string
  zip_code: string
}

/**
 * Format booking address into a single comma-separated string
 *
 * @param booking - Object containing address fields
 * @returns Formatted address string with empty parts filtered out
 *
 * @example
 * formatFullAddress({ address: "123 Main St", city: "Bangkok", state: "BKK", zip_code: "10110" })
 * // Returns: "123 Main St, Bangkok, BKK, 10110"
 */
export function formatFullAddress(booking: BookingAddress): string {
  const parts = [
    booking.address,
    booking.city,
    booking.state,
    booking.zip_code
  ].filter(part => part && part.trim())

  return parts.join(', ')
}

/**
 * Calculate end time from start time and duration
 *
 * @param startTime - Start time in HH:MM or HH:MM:SS format
 * @param durationMinutes - Duration in minutes
 * @returns End time in HH:MM format
 *
 * @example
 * calculateEndTime("09:00", 90)
 * // Returns: "10:30"
 */
export function calculateEndTime(startTime: string, durationMinutes: number): string {
  if (!startTime) return ''
  const [hours, minutes] = startTime.split(':').map(Number)
  const totalMinutes = hours * 60 + minutes + durationMinutes
  const endHours = Math.floor(totalMinutes / 60) % 24
  const endMinutes = totalMinutes % 60
  return `${String(endHours).padStart(2, '0')}:${String(endMinutes).padStart(2, '0')}`
}

/**
 * Format time by removing seconds (HH:MM:SS → HH:MM)
 *
 * @param time - Time string in HH:MM:SS format
 * @returns Time string in HH:MM format
 *
 * @example
 * formatTime("14:30:00")
 * // Returns: "14:30"
 */
export function formatTime(time: string): string {
  return time.split(':').slice(0, 2).join(':')
}
