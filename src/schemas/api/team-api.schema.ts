/**
 * Team API Schemas (Phase 7)
 *
 * Zod schemas for validating team API requests and responses.
 * Covers all team-related endpoints including CRUD operations and member management.
 */

import { z } from 'zod'

// ============================================================================
// ENUMS & CONSTANTS
// ============================================================================

export const TeamStatusEnum = z.enum(['active', 'inactive'])

export const TeamMemberRoleEnum = z.enum(['leader', 'member'])

// ============================================================================
// VALIDATION HELPERS
// ============================================================================

/**
 * Validate team number format (e.g., TM-001, TM-999)
 */
export function validateTeamNumber(teamNumber: string): boolean {
  return /^TM-\d{3,5}$/.test(teamNumber)
}

// ============================================================================
// REQUEST SCHEMAS
// ============================================================================

/**
 * Schema for creating a new team
 */
export const TeamCreateRequestSchema = z.object({
  name: z.string()
    .min(2, 'Team name must be at least 2 characters')
    .max(100, 'Team name must be less than 100 characters')
    .trim(),

  description: z.string()
    .max(500, 'Description must be less than 500 characters')
    .nullable(),

  team_number: z.string()
    .refine(validateTeamNumber, {
      message: 'Invalid team number format (e.g., TM-001)',
    }),

  status: TeamStatusEnum.default('active'),

  capacity: z.number()
    .int('Capacity must be an integer')
    .min(1, 'Capacity must be at least 1')
    .max(50, 'Capacity must be 50 or less')
    .nullable(),

  tags: z.array(z.string().max(50, 'Tag must be less than 50 characters'))
    .max(10, 'Maximum 10 tags allowed')
    .nullable(),
})

/**
 * Schema for updating an existing team
 */
export const TeamUpdateRequestSchema = z.object({
  name: z.string()
    .min(2, 'Team name must be at least 2 characters')
    .max(100, 'Team name must be less than 100 characters')
    .trim()
    .optional(),

  description: z.string()
    .max(500, 'Description must be less than 500 characters')
    .nullable()
    .optional(),

  team_number: z.string()
    .refine(validateTeamNumber, {
      message: 'Invalid team number format (e.g., TM-001)',
    })
    .optional(),

  status: TeamStatusEnum.optional(),

  capacity: z.number()
    .int('Capacity must be an integer')
    .min(1, 'Capacity must be at least 1')
    .max(50, 'Capacity must be 50 or less')
    .nullable()
    .optional(),

  tags: z.array(z.string().max(50, 'Tag must be less than 50 characters'))
    .max(10, 'Maximum 10 tags allowed')
    .nullable()
    .optional(),
})

/**
 * Schema for adding a team member
 */
export const TeamMemberAddRequestSchema = z.object({
  team_id: z.string().uuid('Invalid team ID'),
  profile_id: z.string().uuid('Invalid staff ID'),
  role: TeamMemberRoleEnum.default('member'),
  joined_at: z.string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format')
    .default(() => new Date().toISOString().split('T')[0]),
})

/**
 * Schema for updating a team member
 */
export const TeamMemberUpdateRequestSchema = z.object({
  role: TeamMemberRoleEnum.optional(),
})

/**
 * Schema for removing a team member
 */
export const TeamMemberRemoveRequestSchema = z.object({
  team_id: z.string().uuid('Invalid team ID'),
  profile_id: z.string().uuid('Invalid staff ID'),
})

// ============================================================================
// RESPONSE SCHEMAS
// ============================================================================

/**
 * Base team response schema (without relations)
 */
export const TeamBaseResponseSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  description: z.string().nullable(),
  team_number: z.string(),
  status: TeamStatusEnum,
  capacity: z.number().nullable(),
  tags: z.array(z.string()).nullable(),

  created_at: z.string(),
  updated_at: z.string(),
  deleted_at: z.string().nullable(),
})

/**
 * Team member relation schema
 */
export const TeamMemberRelationSchema = z.object({
  id: z.string().uuid(),
  team_id: z.string().uuid(),
  profile_id: z.string().uuid(),
  role: TeamMemberRoleEnum,
  joined_at: z.string(),

  // Staff profile info
  profiles: z.object({
    id: z.string().uuid(),
    full_name: z.string(),
    email: z.string().email(),
    phone: z.string().nullable(),
    avatar_url: z.string().nullable(),
    staff_number: z.string().nullable(),
    role: z.enum(['admin', 'manager', 'staff']),
    skills: z.array(z.string()).nullable(),
  }).nullable(),
})

/**
 * Team with members response
 */
export const TeamWithMembersResponseSchema = TeamBaseResponseSchema.extend({
  team_members: z.array(TeamMemberRelationSchema).nullable(),
  member_count: z.number().min(0),
})

/**
 * Booking relation schema for team detail
 */
export const TeamBookingRelationSchema = z.object({
  id: z.string().uuid(),
  booking_date: z.string(),
  start_time: z.string(),
  end_time: z.string(),
  status: z.enum(['pending', 'confirmed', 'in_progress', 'completed', 'cancelled', 'no_show']),
  payment_status: z.enum(['pending', 'partial', 'paid', 'refunded']),
  total_price: z.number(),

  // Customer info
  customers: z.object({
    id: z.string().uuid(),
    full_name: z.string(),
    phone: z.string().nullable(),
  }).nullable(),

  // Package info
  service_packages: z.object({
    id: z.string().uuid(),
    name: z.string(),
  }).nullable(),

  service_packages_v2: z.object({
    id: z.string().uuid(),
    name: z.string(),
  }).nullable(),
})

/**
 * Full team response with all relations
 */
export const TeamResponseSchema = TeamBaseResponseSchema.extend({
  team_members: z.array(TeamMemberRelationSchema).nullable(),
  member_count: z.number().min(0),
  bookings: z.array(TeamBookingRelationSchema).nullable(),
  total_bookings: z.number().min(0).optional(),
  total_revenue: z.number().min(0).optional(),
})

/**
 * Team list item (minimal info for dropdowns)
 */
export const TeamListItemSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  team_number: z.string(),
  status: TeamStatusEnum,
  member_count: z.number().min(0),
  capacity: z.number().nullable(),
  tags: z.array(z.string()).nullable(),
})

/**
 * Team performance stats schema
 */
export const TeamPerformanceStatsSchema = z.object({
  totalJobs: z.number().min(0),
  completedJobs: z.number().min(0),
  completionRate: z.number().min(0).max(100),
  totalRevenue: z.number().min(0),

  monthlyData: z.array(z.object({
    month: z.string().regex(/^\d{4}-\d{2}$/, 'Month must be in YYYY-MM format'),
    jobs: z.number().min(0),
    revenue: z.number().min(0),
  })),

  memberPerformance: z.array(z.object({
    profile_id: z.string().uuid(),
    full_name: z.string(),
    jobs: z.number().min(0),
    revenue: z.number().min(0),
  })),
})

// ============================================================================
// TYPE EXPORTS
// ============================================================================

export type TeamCreateRequest = z.infer<typeof TeamCreateRequestSchema>
export type TeamUpdateRequest = z.infer<typeof TeamUpdateRequestSchema>
export type TeamMemberAddRequest = z.infer<typeof TeamMemberAddRequestSchema>
export type TeamMemberUpdateRequest = z.infer<typeof TeamMemberUpdateRequestSchema>
export type TeamMemberRemoveRequest = z.infer<typeof TeamMemberRemoveRequestSchema>

export type TeamResponse = z.infer<typeof TeamResponseSchema>
export type TeamBaseResponse = z.infer<typeof TeamBaseResponseSchema>
export type TeamWithMembersResponse = z.infer<typeof TeamWithMembersResponseSchema>
export type TeamListItem = z.infer<typeof TeamListItemSchema>
export type TeamPerformanceStats = z.infer<typeof TeamPerformanceStatsSchema>

export type TeamStatus = z.infer<typeof TeamStatusEnum>
export type TeamMemberRole = z.infer<typeof TeamMemberRoleEnum>
export type TeamMemberRelation = z.infer<typeof TeamMemberRelationSchema>
export type TeamBookingRelation = z.infer<typeof TeamBookingRelationSchema>
