/**
 * Staff API Schemas (Phase 7)
 *
 * Zod schemas for validating staff API requests and responses.
 * Covers all staff-related endpoints including CRUD operations and performance stats.
 */

import { z } from 'zod'

// ============================================================================
// ENUMS & CONSTANTS
// ============================================================================

export const StaffRoleEnum = z.enum(['admin', 'manager', 'staff'])

export const StaffStatusEnum = z.enum(['active', 'inactive', 'on_leave'])

// ============================================================================
// VALIDATION HELPERS
// ============================================================================

/**
 * Validate staff number format (e.g., ST-001, ST-999)
 */
export function validateStaffNumber(staffNumber: string): boolean {
  return /^ST-\d{3,5}$/.test(staffNumber)
}

/**
 * Validate skill format
 */
export function validateSkill(skill: string): boolean {
  return skill.length >= 2 && skill.length <= 50
}

// ============================================================================
// REQUEST SCHEMAS
// ============================================================================

/**
 * Schema for creating a new staff member via Edge Function
 */
export const StaffCreateRequestSchema = z.object({
  email: z.string()
    .email('Invalid email format')
    .max(255, 'Email must be less than 255 characters')
    .toLowerCase(),

  password: z.string()
    .min(6, 'Password must be at least 6 characters')
    .max(72, 'Password must be less than 72 characters'),

  full_name: z.string()
    .min(2, 'Full name must be at least 2 characters')
    .max(100, 'Full name must be less than 100 characters')
    .trim(),

  phone: z.string()
    .min(9, 'Phone number must be at least 9 digits')
    .max(15, 'Phone number must be less than 15 characters')
    .nullable(),

  role: StaffRoleEnum.default('staff'),

  staff_number: z.string()
    .refine(validateStaffNumber, {
      message: 'Invalid staff number format (e.g., ST-001)',
    })
    .nullable(),

  skills: z.array(z.string().refine(validateSkill, {
    message: 'Skill must be between 2 and 50 characters',
  }))
    .max(20, 'Maximum 20 skills allowed')
    .nullable(),

  bio: z.string()
    .max(1000, 'Bio must be less than 1000 characters')
    .nullable(),

  hourly_rate: z.number()
    .min(0, 'Hourly rate must be non-negative')
    .max(100000, 'Hourly rate seems unreasonably high')
    .nullable(),

  commission_rate: z.number()
    .min(0, 'Commission rate must be non-negative')
    .max(100, 'Commission rate must be 100% or less')
    .nullable(),
})

/**
 * Schema for updating staff profile
 */
export const StaffUpdateRequestSchema = z.object({
  full_name: z.string()
    .min(2, 'Full name must be at least 2 characters')
    .max(100, 'Full name must be less than 100 characters')
    .trim()
    .optional(),

  phone: z.string()
    .min(9, 'Phone number must be at least 9 digits')
    .max(15, 'Phone number must be less than 15 characters')
    .nullable()
    .optional(),

  role: StaffRoleEnum.optional(),

  staff_number: z.string()
    .refine(validateStaffNumber, {
      message: 'Invalid staff number format (e.g., ST-001)',
    })
    .nullable()
    .optional(),

  skills: z.array(z.string().refine(validateSkill, {
    message: 'Skill must be between 2 and 50 characters',
  }))
    .max(20, 'Maximum 20 skills allowed')
    .nullable()
    .optional(),

  bio: z.string()
    .max(1000, 'Bio must be less than 1000 characters')
    .nullable()
    .optional(),

  hourly_rate: z.number()
    .min(0, 'Hourly rate must be non-negative')
    .max(100000, 'Hourly rate seems unreasonably high')
    .nullable()
    .optional(),

  commission_rate: z.number()
    .min(0, 'Commission rate must be non-negative')
    .max(100, 'Commission rate must be 100% or less')
    .nullable()
    .optional(),

  avatar_url: z.string()
    .url('Invalid avatar URL')
    .nullable()
    .optional(),
})

// ============================================================================
// RESPONSE SCHEMAS
// ============================================================================

/**
 * Base staff response schema (without relations)
 */
export const StaffBaseResponseSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  full_name: z.string(),
  phone: z.string().nullable(),
  avatar_url: z.string().nullable(),

  role: StaffRoleEnum,
  staff_number: z.string().nullable(),
  skills: z.array(z.string()).nullable(),
  bio: z.string().nullable(),

  hourly_rate: z.number().nullable(),
  commission_rate: z.number().nullable(),

  created_at: z.string(),
  updated_at: z.string(),
  deleted_at: z.string().nullable(),
})

/**
 * Rating relation schema
 */
export const StaffRatingRelationSchema = z.object({
  id: z.string().uuid(),
  booking_id: z.string().uuid(),
  rating: z.number().min(1).max(5),
  comment: z.string().nullable(),
  created_at: z.string(),

  // Customer info
  customers: z.object({
    id: z.string().uuid(),
    full_name: z.string(),
  }).nullable(),
})

/**
 * Booking relation schema for staff detail
 */
export const StaffBookingRelationSchema = z.object({
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
 * Staff with ratings response
 */
export const StaffWithRatingsResponseSchema = StaffBaseResponseSchema.extend({
  average_rating: z.number().min(0).max(5).nullable(),
  total_ratings: z.number().min(0),
  reviews: z.array(StaffRatingRelationSchema).nullable(),
})

/**
 * Full staff response with all relations
 */
export const StaffResponseSchema = StaffBaseResponseSchema.extend({
  average_rating: z.number().min(0).max(5).nullable(),
  total_ratings: z.number().min(0),
  reviews: z.array(StaffRatingRelationSchema).nullable(),
  bookings: z.array(StaffBookingRelationSchema).nullable(),
})

/**
 * Staff list item (minimal info for dropdowns)
 */
export const StaffListItemSchema = z.object({
  id: z.string().uuid(),
  full_name: z.string(),
  email: z.string().email(),
  staff_number: z.string().nullable(),
  avatar_url: z.string().nullable(),
  role: StaffRoleEnum,
  skills: z.array(z.string()).nullable(),
  average_rating: z.number().min(0).max(5).nullable(),
})

/**
 * Performance stats schema
 */
export const StaffPerformanceStatsSchema = z.object({
  totalJobs: z.number().min(0),
  completedJobs: z.number().min(0),
  completionRate: z.number().min(0).max(100),
  averageRating: z.number().min(0).max(5),
  totalRevenue: z.number().min(0),

  monthlyData: z.array(z.object({
    month: z.string().regex(/^\d{4}-\d{2}$/, 'Month must be in YYYY-MM format'),
    jobs: z.number().min(0),
    revenue: z.number().min(0),
  })),
})

// ============================================================================
// TYPE EXPORTS
// ============================================================================

export type StaffCreateRequest = z.infer<typeof StaffCreateRequestSchema>
export type StaffUpdateRequest = z.infer<typeof StaffUpdateRequestSchema>

export type StaffResponse = z.infer<typeof StaffResponseSchema>
export type StaffBaseResponse = z.infer<typeof StaffBaseResponseSchema>
export type StaffWithRatingsResponse = z.infer<typeof StaffWithRatingsResponseSchema>
export type StaffListItem = z.infer<typeof StaffListItemSchema>
export type StaffPerformanceStats = z.infer<typeof StaffPerformanceStatsSchema>

export type StaffRole = z.infer<typeof StaffRoleEnum>
export type StaffStatus = z.infer<typeof StaffStatusEnum>
export type StaffRatingRelation = z.infer<typeof StaffRatingRelationSchema>
export type StaffBookingRelation = z.infer<typeof StaffBookingRelationSchema>
