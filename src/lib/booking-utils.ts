/**
 * Booking Utility Functions
 *
 * Pure utility functions for booking-related operations.
 * These functions have no side effects and can be used across the application.
 */

import { BOOKING_STATUS_LABELS } from '@/constants/booking-status'
import { BookingStatus } from '@/types/booking'

// ============================================================================
// STATUS TRANSITIONS - Single Source of Truth
// ============================================================================

/**
 * Status transition rules - defines what statuses each status can transition to
 * This is the single source of truth for status flow across the application
 *
 * Note: Status transitions are forward-only (no reverting cancelled → pending)
 */
export const STATUS_TRANSITIONS: Record<BookingStatus, BookingStatus[]> = {
  [BookingStatus.Pending]: [BookingStatus.Pending, BookingStatus.Confirmed, BookingStatus.Cancelled],
  [BookingStatus.Confirmed]: [BookingStatus.Confirmed, BookingStatus.InProgress, BookingStatus.Cancelled, BookingStatus.NoShow],
  [BookingStatus.InProgress]: [BookingStatus.InProgress, BookingStatus.Completed, BookingStatus.Cancelled],
  [BookingStatus.Completed]: [BookingStatus.Completed],
  [BookingStatus.Cancelled]: [BookingStatus.Cancelled],
  [BookingStatus.NoShow]: [BookingStatus.NoShow],
}

/**
 * Get human-readable label for a booking status
 *
 * @param status - The booking status key
 * @returns Human-readable status label
 *
 * @example
 * getStatusLabel('in_progress')
 * // Returns: "In Progress"
 */
export function getStatusLabel(status: string): string {
  return BOOKING_STATUS_LABELS[status as keyof typeof BOOKING_STATUS_LABELS] || status
}

/**
 * Get all booking statuses with their labels
 *
 * @returns Array of [value, label] pairs for all booking statuses
 *
 * @example
 * getAllStatusOptions()
 * // Returns: [['pending', 'Pending'], ['confirmed', 'Confirmed'], ...]
 */
export function getAllStatusOptions(): [string, string][] {
  return Object.entries(BOOKING_STATUS_LABELS)
}

/**
 * Get all available statuses that a booking can be changed to from current status
 * This includes the current status itself
 *
 * @param currentStatus - The current booking status
 * @returns Array of available status options including current
 *
 * @example
 * getAvailableStatuses('pending')
 * // Returns: ['pending', 'confirmed', 'cancelled']
 */
export function getAvailableStatuses(currentStatus: string): string[] {
  return STATUS_TRANSITIONS[currentStatus as BookingStatus] || [currentStatus]
}

/**
 * Get only the statuses that a booking can transition TO (excluding current)
 *
 * @param currentStatus - The current booking status
 * @returns Array of valid transition statuses (excluding current)
 *
 * @example
 * getValidTransitions('pending')
 * // Returns: ['confirmed', 'cancelled']
 */
export function getValidTransitions(currentStatus: string): string[] {
  const all = STATUS_TRANSITIONS[currentStatus as BookingStatus] || []
  return all.filter((s: BookingStatus) => s !== currentStatus)
}

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
  if (!time) return ''
  return time.split(':').slice(0, 2).join(':')
}

/**
 * Calculate duration between start and end time
 *
 * @param startTime - Start time in HH:MM:SS format
 * @param endTime - End time in HH:MM:SS format
 * @returns Human-readable duration string (e.g., "2 hours", "1 hour 30 minutes")
 *
 * @example
 * calculateDuration('09:00:00', '11:30:00')
 * // Returns: "2 hours 30 minutes"
 */
export function calculateDuration(startTime: string, endTime: string): string {
  if (!startTime || !endTime) return 'N/A'

  const [startHours, startMinutes] = startTime.split(':').map(Number)
  const [endHours, endMinutes] = endTime.split(':').map(Number)
  const durationMinutes =
    endHours * 60 + endMinutes - (startHours * 60 + startMinutes)

  if (durationMinutes <= 0) return 'N/A'

  const hours = Math.floor(durationMinutes / 60)
  const minutes = durationMinutes % 60

  if (hours > 0 && minutes > 0) {
    return `${hours} ${hours === 1 ? 'hour' : 'hours'} ${minutes} ${minutes === 1 ? 'minute' : 'minutes'}`
  } else if (hours > 0) {
    return `${hours} ${hours === 1 ? 'hour' : 'hours'}`
  } else {
    return `${minutes} ${minutes === 1 ? 'minute' : 'minutes'}`
  }
}

/**
 * Supabase query string for fetching teams with their team lead
 * This is used in Supabase select queries to fetch team data along with the team lead's profile
 */
export const TEAMS_WITH_LEAD_QUERY = 'teams(id, name, team_lead:team_lead_id(id, full_name))'

/**
 * Aliased version for explicit foreign key reference (team_id)
 * Use this when you need to specify the foreign key explicitly
 */
export const TEAMS_WITH_LEAD_ALIASED_QUERY = 'teams:team_id(id, name, team_lead:team_lead_id(id, full_name))'

export interface TeamLead {
  id: string
  full_name: string
  email?: string
  avatar_url?: string | null
}

export interface TeamData {
  id?: string
  name?: string
  team_lead?: TeamLead | TeamLead[] | null
}

/**
 * Transform teams data from Supabase query result
 * Converts the nested team_lead structure to a flat structure
 *
 * @param teams - Raw teams data from Supabase (can be any shape from Supabase)
 * @returns Transformed teams object or null
 */
export function transformTeamsData(teams: unknown): TeamData | null {
  if (!teams) return null

  // Type guard to check if it's an object
  if (typeof teams !== 'object') return null

  // If teams is already in the correct format, return as is
  if ('name' in teams && !Array.isArray(teams)) {
    return teams as TeamData
  }

  // Handle array of teams (shouldn't happen in current schema)
  if (Array.isArray(teams) && teams.length > 0) {
    return teams[0] as TeamData
  }

  return null
}
