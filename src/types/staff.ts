/**
 * Staff Type Definitions
 *
 * Centralized type definitions for Staff entity and related types.
 * Staff extends UserProfile with staff-specific fields.
 * Use these types instead of creating local interfaces.
 */

import type { UserProfile } from './common'

/**
 * Staff member record (extends UserProfile)
 *
 * Staff members are users with role='staff' plus additional staff-specific fields.
 * This is the base staff type for most use cases.
 */
export interface StaffRecord extends UserProfile {
  // Additional staff-specific fields beyond UserProfile
  is_active: boolean
  specializations?: string[]
  hourly_rate?: number
}

/**
 * Team membership information for staff
 */
export interface StaffTeamMembership {
  id: string
  team_id: string
  user_id: string
  role: 'leader' | 'member'
  joined_at: string
  teams: {
    id: string
    name: string
    is_active: boolean
    description: string | null
  }
}

/**
 * Staff with team relations
 *
 * Use this when you need staff data with their team memberships.
 * Common in team management, scheduling, and staff directory pages.
 */
export interface StaffWithTeams extends StaffRecord {
  team_members: StaffTeamMembership[]
}

/**
 * Staff availability time slot
 *
 * Represents a time period when staff is available or unavailable.
 * Used in scheduling, calendar, and booking conflict detection.
 */
export interface StaffAvailabilitySlot {
  staff_id: string
  date: string // ISO date format (YYYY-MM-DD)
  start_time: string // Time format (HH:MM)
  end_time: string // Time format (HH:MM)
  is_available: boolean
  reason?: string // Reason if unavailable (e.g., "On leave", "Personal time")
}

/**
 * Staff performance metrics for analytics
 *
 * Aggregated performance data for a specific time period.
 * Used in dashboards, reports, and performance reviews.
 */
export interface StaffPerformanceMetrics {
  staff_id: string
  full_name: string
  total_bookings: number
  completed_bookings: number
  cancelled_bookings: number
  completion_rate: number // Percentage (0-100)
  total_revenue: number // Total revenue generated
  average_rating: number // Average customer rating (0-5)
  total_hours_worked: number // Total hours worked
  on_time_rate: number // Percentage of on-time arrivals (0-100)
}

/**
 * Staff with performance data
 *
 * Staff record combined with their performance metrics.
 * Use in performance dashboards and staff analytics pages.
 */
export interface StaffWithPerformance extends StaffRecord {
  performance: StaffPerformanceMetrics
}

/**
 * Staff booking assignment
 *
 * Represents a staff member assigned to a booking.
 * Used in booking management and scheduling.
 */
export interface StaffBookingAssignment {
  booking_id: string
  staff_id: string
  assigned_at: string
  role?: 'primary' | 'assistant' // Role in this specific booking
}

/**
 * Form data for creating a new staff member
 */
export interface StaffCreateFormData {
  email: string
  full_name: string
  phone?: string
  avatar_url?: string
  staff_number?: string
  skills?: string[]
  is_active?: boolean
  specializations?: string[]
  hourly_rate?: number
}

/**
 * Form data for updating staff information
 */
export interface StaffUpdateFormData {
  full_name?: string
  phone?: string
  avatar_url?: string
  staff_number?: string
  skills?: string[]
  is_active?: boolean
  specializations?: string[]
  hourly_rate?: number
}

/**
 * Staff selection option for dropdowns/selects
 */
export interface StaffSelectOption {
  value: string // staff user_id
  label: string // full_name
  staff_number?: string
  avatar_url?: string | null
  is_active: boolean
  teams?: string[] // Array of team names
}

/**
 * Staff schedule entry
 *
 * Represents a scheduled work period for a staff member.
 * Used in weekly schedules and calendar views.
 */
export interface StaffScheduleEntry {
  staff_id: string
  date: string // ISO date (YYYY-MM-DD)
  start_time: string // Time (HH:MM)
  end_time: string // Time (HH:MM)
  booking_id?: string // If this schedule is for a booking
  type: 'booking' | 'available' | 'unavailable' | 'break'
  notes?: string
}

/**
 * Staff with rating (for staff list page)
 *
 * Staff record with calculated average rating from reviews.
 * Used in Staff management page with performance indicators.
 */
export interface StaffWithRating extends StaffRecord {
  average_rating?: number
}

/**
 * Staff list item (minimal - for dropdowns/selects)
 *
 * Minimal staff information for dropdowns in Dashboard, Bookings, Calendar.
 * Optimized for performance with only essential fields.
 */
export interface StaffListItem {
  id: string
  full_name: string
  email: string
  role: 'admin' | 'manager' | 'staff'
  avatar_url?: string | null
}
