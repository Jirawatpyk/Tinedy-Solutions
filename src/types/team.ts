/**
 * Team Type Definitions
 *
 * Centralized type definitions for Team entity and related types.
 * Use these types instead of creating local interfaces.
 */

/**
 * Team entity from database (teams table)
 */
export interface TeamRecord {
  id: string
  name: string
  description: string | null
  is_active: boolean
  created_at: string
  updated_at: string
}

/**
 * Team member entity from database (team_members table)
 */
export interface TeamMemberRecord {
  id: string
  team_id: string
  user_id: string
  role: 'leader' | 'member'
  joined_at: string
}

/**
 * User profile for team members (minimal version)
 */
export interface TeamMemberProfile {
  id: string
  full_name: string
  avatar_url: string | null
  email: string
}

/**
 * Team member with user profile relation
 */
export interface TeamMemberWithProfile extends TeamMemberRecord {
  profiles: TeamMemberProfile
}

/**
 * Team with staff members relation
 * Use this when you need team data with member list
 */
export interface TeamWithMembers extends TeamRecord {
  team_members: TeamMemberRecord[]
}

/**
 * Team with full relations (members + their profiles)
 * Use this when you need complete team information including member details
 */
export interface TeamWithRelations extends TeamRecord {
  team_members: TeamMemberWithProfile[]
}

/**
 * Team statistics for analytics and reporting
 */
export interface TeamStats {
  total_bookings: number
  completed_bookings: number
  cancelled_bookings: number
  pending_bookings: number
  total_revenue: number
  member_count: number
  average_completion_rate: number
}

/**
 * Team with statistics (for dashboard/analytics)
 * Use this in dashboard and reports pages
 */
export interface TeamWithStats extends TeamRecord {
  stats: TeamStats
}

/**
 * Form data for creating a new team
 */
export interface TeamCreateFormData {
  name: string
  description?: string
  is_active?: boolean
  member_ids?: string[]
  leader_id?: string
}

/**
 * Form data for updating an existing team
 */
export interface TeamUpdateFormData {
  name?: string
  description?: string | null
  is_active?: boolean
}

/**
 * Team selection option for dropdowns/selects
 */
export interface TeamSelectOption {
  value: string
  label: string
  is_active: boolean
  member_count?: number
}
