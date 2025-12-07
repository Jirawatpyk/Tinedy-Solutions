/**
 * Booking Utility Functions
 *
 * Pure utility functions for booking-related operations.
 * These functions have no side effects and can be used across the application.
 */

import { BOOKING_STATUS_LABELS } from '@/constants/booking-status'

// ============================================================================
// STATUS TRANSITIONS - Single Source of Truth
// ============================================================================

/**
 * Status transition rules - defines what statuses each status can transition to
 * This is the single source of truth for status flow across the application
 *
 * Note: Status transitions are forward-only (no reverting cancelled → pending)
 */
export const STATUS_TRANSITIONS: Record<string, string[]> = {
  pending: ['pending', 'confirmed', 'cancelled'],
  confirmed: ['confirmed', 'in_progress', 'cancelled', 'no_show'],
  in_progress: ['in_progress', 'completed', 'cancelled'],
  completed: ['completed'],
  cancelled: ['cancelled'],
  no_show: ['no_show'],
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
  return STATUS_TRANSITIONS[currentStatus] || [currentStatus]
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
  const all = STATUS_TRANSITIONS[currentStatus] || []
  return all.filter(s => s !== currentStatus)
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
 * Supabase query string for fetching teams with their team lead
 * This is used in Supabase select queries to fetch team data along with the team lead's profile
 */
export const TEAMS_WITH_LEAD_QUERY = 'teams(id, name, team_lead:team_lead_id(id, full_name))'

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
