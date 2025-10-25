/**
 * Supabase Relation Types
 *
 * Type definitions for Supabase queries with nested relations.
 * These types handle the complexity of Supabase's relational queries
 * where related data can be returned as either single objects or arrays.
 *
 * @module types/supabase-relations
 */

import type { ServicePackage, Customer } from './index'

// ============================================================================
// BOOKING RELATIONS
// ============================================================================

/**
 * Booking with nested service package relation
 *
 * Supabase can return related data as either:
 * - Single object (when using .single())
 * - Array with one item (default behavior)
 * - null (if relation not found)
 */
export interface BookingWithServicePackage {
  id: string
  booking_date: string
  start_time: string
  end_time: string
  status: string
  staff_id: string | null
  team_id: string | null
  customer_id: string
  service_packages: ServicePackage[] | ServicePackage | null
}

/**
 * Booking with nested customer relation
 */
export interface BookingWithCustomer {
  id: string
  booking_date: string
  start_time: string
  end_time: string
  status: string
  staff_id: string | null
  team_id: string | null
  customers: Customer[] | Customer | null
}

/**
 * Booking with both service package and customer relations
 *
 * This is the most common type returned by Supabase queries
 * Used in: availability checks, booking lists, conflict detection
 */
export interface BookingWithRelations {
  id: string
  booking_date: string
  start_time: string
  end_time: string
  status: string
  staff_id: string | null
  team_id: string | null
  customer_id: string
  service_packages: ServicePackage[] | ServicePackage | null
  customers: Customer[] | Customer | null
}

/**
 * Minimal booking data for availability/conflict checks
 *
 * Used when we only need time slot information
 * without full booking details
 */
export interface BookingTimeSlot {
  id: string
  booking_date: string
  start_time: string
  end_time: string
  staff_id: string | null
  team_id: string | null
}

// ============================================================================
// TEAM RELATIONS
// ============================================================================

/**
 * Team member profile (minimal version for nested queries)
 */
export interface TeamMemberProfile {
  id: string
  full_name: string
  skills: string[] | null
  email?: string
  avatar_url?: string | null
}

/**
 * Team member data with profile relation
 *
 * Supabase returns profiles as array or single object
 */
export interface TeamMemberData {
  id: string
  team_id: string
  user_id: string
  role: 'leader' | 'member'
  joined_at: string
  profiles: TeamMemberProfile[] | TeamMemberProfile
}

/**
 * Team with members and their profiles
 *
 * Used in: staff availability checks, team selection
 */
export interface TeamWithMemberProfiles {
  id: string
  name: string
  is_active: boolean
  description: string | null
  team_members: TeamMemberData[]
}

// ============================================================================
// STAFF RELATIONS
// ============================================================================

/**
 * Staff member with team memberships
 *
 * Used to find which teams a staff member belongs to
 */
export interface StaffWithTeamMemberships {
  id: string
  full_name: string
  email: string
  staff_number: string | null
  skills: string[] | null
  team_members: Array<{
    team_id: string
    role: 'leader' | 'member'
    teams: {
      id: string
      name: string
      is_active: boolean
    }
  }>
}

/**
 * Staff performance data from nested query
 */
export interface StaffWithReviews {
  id: string
  full_name: string
  staff_number: string | null
  reviews: Array<{
    rating: number
    comment: string | null
    created_at: string
  }>
}

// ============================================================================
// AVAILABILITY & SCHEDULE RELATIONS
// ============================================================================

/**
 * Staff availability period
 *
 * From staff_availability table
 */
export interface StaffAvailabilityPeriod {
  id: string
  staff_id: string
  unavailable_date: string
  start_time: string | null
  end_time: string | null
  is_available: boolean
  reason: string | null
  notes: string | null
  created_at: string
}

/**
 * Staff with availability periods
 */
export interface StaffWithAvailability {
  id: string
  full_name: string
  email: string
  staff_availability: StaffAvailabilityPeriod[]
}

// ============================================================================
// UTILITY TYPES
// ============================================================================

/**
 * Type helper สำหรับ Supabase query results
 *
 * Supabase queries always return { data, error } structure
 */
export interface SupabaseQueryResult<T> {
  data: T | null
  error: Error | null
}

/**
 * Type helper สำหรับ array query results
 */
export interface SupabaseArrayResult<T> {
  data: T[] | null
  error: Error | null
}

/**
 * Normalize Supabase relation to single object
 *
 * Helper type to extract single object from array or object
 */
export type NormalizeRelation<T> = T extends Array<infer U> ? U : T extends null ? null : T

/**
 * Extract single item from Supabase relation
 *
 * Utility function to safely extract first item from array or return object
 *
 * @template T - Type of the relation
 * @param relation - Relation data (array, object, or null)
 * @returns Single object or null
 *
 * @example
 * const servicePackage = extractSingle(booking.service_packages)
 * // servicePackage is now ServicePackage | null
 */
export function extractSingle<T>(relation: T[] | T | null): T | null {
  if (Array.isArray(relation)) {
    return relation[0] || null
  }
  return relation
}

/**
 * Extract array from Supabase relation
 *
 * Ensures result is always an array
 *
 * @template T - Type of the relation items
 * @param relation - Relation data (array, object, or null)
 * @returns Array of items (empty array if null)
 *
 * @example
 * const packages = extractArray(booking.service_packages)
 * // packages is now ServicePackage[]
 */
export function extractArray<T>(relation: T[] | T | null): T[] {
  if (Array.isArray(relation)) {
    return relation
  }
  if (relation === null) {
    return []
  }
  return [relation]
}

/**
 * Safe data extractor from Supabase query result
 *
 * Returns empty array if data is null
 *
 * @template T - Type of data items
 * @param result - Supabase query result
 * @returns Array of data items
 *
 * @example
 * const { data, error } = await supabase.from('bookings').select('*')
 * const bookings = safeExtractData(data) // Always returns array
 */
export function safeExtractData<T>(data: T[] | null): T[] {
  return data || []
}

/**
 * Safe single item extractor from Supabase query
 *
 * @template T - Type of data item
 * @param data - Supabase query single result
 * @param defaultValue - Default value if data is null
 * @returns Data item or default value
 *
 * @example
 * const { data, error } = await supabase.from('bookings').select('*').single()
 * const booking = safeExtractSingle(data, null)
 */
export function safeExtractSingle<T>(data: T | null, defaultValue: T | null = null): T | null {
  return data ?? defaultValue
}
