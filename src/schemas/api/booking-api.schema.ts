/**
 * Booking API Schemas (Phase 7)
 *
 * Zod schemas for validating booking API requests and responses.
 * Covers all booking-related endpoints including CRUD operations and recurring bookings.
 */

import { z } from 'zod'

// ============================================================================
// ENUMS & CONSTANTS
// ============================================================================

export const BookingStatusEnum = z.enum([
  'pending',
  'confirmed',
  'in_progress',
  'completed',
  'cancelled',
  'no_show',
])

export const PaymentStatusEnum = z.enum([
  'pending',
  'partial',
  'paid',
  'refunded',
])

export const BookingSourceEnum = z.enum([
  'walk_in',
  'phone',
  'line',
  'facebook',
  'website',
  'other',
])

// ============================================================================
// REQUEST SCHEMAS
// ============================================================================

/**
 * Schema for creating a new booking
 */
export const BookingCreateRequestSchema = z.object({
  customer_id: z.string().uuid('Invalid customer ID'),
  booking_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format'),
  start_time: z.string().regex(/^\d{2}:\d{2}$/, 'Time must be in HH:MM format'),
  end_time: z.string().regex(/^\d{2}:\d{2}$/, 'Time must be in HH:MM format'),

  // Service assignment - must have either staff_id OR team_id
  staff_id: z.string().uuid('Invalid staff ID').nullable(),
  team_id: z.string().uuid('Invalid team ID').nullable(),

  // Package selection - must have either package_id OR package_v2_id
  package_id: z.string().uuid('Invalid package ID').nullable(),
  package_v2_id: z.string().uuid('Invalid package V2 ID').nullable(),
  selected_tier_id: z.string().uuid('Invalid tier ID').nullable(),

  // Pricing
  total_price: z.number().min(0, 'Price must be non-negative'),
  deposit_amount: z.number().min(0, 'Deposit must be non-negative').default(0),

  // Status
  status: BookingStatusEnum.default('pending'),
  payment_status: PaymentStatusEnum.default('pending'),

  // Source & Notes
  source: BookingSourceEnum.default('walk_in'),
  notes: z.string().max(1000, 'Notes must be less than 1000 characters').nullable(),
  special_requests: z.string().max(500, 'Special requests must be less than 500 characters').nullable(),
  internal_notes: z.string().max(1000, 'Internal notes must be less than 1000 characters').nullable(),
}).refine(
  (data) => data.staff_id !== null || data.team_id !== null,
  {
    message: 'Either staff_id or team_id must be provided',
    path: ['staff_id'],
  }
).refine(
  (data) => data.package_id !== null || data.package_v2_id !== null,
  {
    message: 'Either package_id or package_v2_id must be provided',
    path: ['package_id'],
  }
).refine(
  (data) => {
    const start = new Date(`2000-01-01T${data.start_time}:00`)
    const end = new Date(`2000-01-01T${data.end_time}:00`)
    return end > start
  },
  {
    message: 'End time must be after start time',
    path: ['end_time'],
  }
)

/**
 * Schema for updating an existing booking
 */
export const BookingUpdateRequestSchema = z.object({
  booking_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format').optional(),
  start_time: z.string().regex(/^\d{2}:\d{2}$/, 'Time must be in HH:MM format').optional(),
  end_time: z.string().regex(/^\d{2}:\d{2}$/, 'Time must be in HH:MM format').optional(),

  staff_id: z.string().uuid('Invalid staff ID').nullable().optional(),
  team_id: z.string().uuid('Invalid team ID').nullable().optional(),

  package_id: z.string().uuid('Invalid package ID').nullable().optional(),
  package_v2_id: z.string().uuid('Invalid package V2 ID').nullable().optional(),
  selected_tier_id: z.string().uuid('Invalid tier ID').nullable().optional(),

  total_price: z.number().min(0, 'Price must be non-negative').optional(),
  deposit_amount: z.number().min(0, 'Deposit must be non-negative').optional(),

  status: BookingStatusEnum.optional(),
  payment_status: PaymentStatusEnum.optional(),

  source: BookingSourceEnum.optional(),
  notes: z.string().max(1000, 'Notes must be less than 1000 characters').nullable().optional(),
  special_requests: z.string().max(500, 'Special requests must be less than 500 characters').nullable().optional(),
  internal_notes: z.string().max(1000, 'Internal notes must be less than 1000 characters').nullable().optional(),
})

/**
 * Schema for creating recurring bookings
 */
export const RecurringBookingCreateRequestSchema = z.object({
  customer_id: z.string().uuid('Invalid customer ID'),
  start_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format'),
  end_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format'),
  start_time: z.string().regex(/^\d{2}:\d{2}$/, 'Time must be in HH:MM format'),
  end_time: z.string().regex(/^\d{2}:\d{2}$/, 'Time must be in HH:MM format'),

  recurrence_pattern: z.enum(['daily', 'weekly', 'biweekly', 'monthly']),
  recurrence_days: z.array(z.number().min(0).max(6)).min(1, 'At least one day must be selected'),

  staff_id: z.string().uuid('Invalid staff ID').nullable(),
  team_id: z.string().uuid('Invalid team ID').nullable(),

  package_id: z.string().uuid('Invalid package ID').nullable(),
  package_v2_id: z.string().uuid('Invalid package V2 ID').nullable(),
  selected_tier_id: z.string().uuid('Invalid tier ID').nullable(),

  total_price: z.number().min(0, 'Price must be non-negative'),
  deposit_amount: z.number().min(0, 'Deposit must be non-negative').default(0),

  source: BookingSourceEnum.default('walk_in'),
  notes: z.string().max(1000, 'Notes must be less than 1000 characters').nullable(),
  special_requests: z.string().max(500, 'Special requests must be less than 500 characters').nullable(),
}).refine(
  (data) => data.staff_id !== null || data.team_id !== null,
  {
    message: 'Either staff_id or team_id must be provided',
    path: ['staff_id'],
  }
).refine(
  (data) => data.package_id !== null || data.package_v2_id !== null,
  {
    message: 'Either package_id or package_v2_id must be provided',
    path: ['package_id'],
  }
).refine(
  (data) => new Date(data.end_date) >= new Date(data.start_date),
  {
    message: 'End date must be after or equal to start date',
    path: ['end_date'],
  }
)

// ============================================================================
// RESPONSE SCHEMAS
// ============================================================================

/**
 * Base booking response schema (without relations)
 */
export const BookingBaseResponseSchema = z.object({
  id: z.string().optional(),
  customer_id: z.string().optional(),
  booking_date: z.string().optional(),
  start_time: z.string().optional(),
  end_time: z.string().optional(),

  staff_id: z.string().nullable().optional(),
  team_id: z.string().nullable().optional(),

  package_id: z.string().nullable().optional(),
  package_v2_id: z.string().nullable().optional(),
  selected_tier_id: z.string().nullable().optional(),

  total_price: z.number().optional(),
  deposit_amount: z.number().optional(),

  status: z.string().optional(),
  payment_status: z.string().optional(),

  source: z.string().optional(),
  notes: z.string().nullable().optional(),
  special_requests: z.string().nullable().optional(),
  internal_notes: z.string().nullable().optional(),

  recurring_group_id: z.string().nullable().optional(),

  created_at: z.string().optional(),
  updated_at: z.string().optional(),
  deleted_at: z.string().nullable().optional(),
}).passthrough()

/**
 * Customer relation schema
 */
export const BookingCustomerRelationSchema = z.any().nullable()

/**
 * Staff relation schema
 */
export const BookingStaffRelationSchema = z.any().nullable()

/**
 * Team relation schema
 */
export const BookingTeamRelationSchema = z.any().nullable()

/**
 * Package V1 relation schema
 */
export const BookingPackageV1RelationSchema = z.any().nullable()

/**
 * Package V2 relation schema
 */
export const BookingPackageV2RelationSchema = z.any().nullable()

/**
 * Tier relation schema
 */
export const BookingTierRelationSchema = z.any().nullable()

/**
 * Full booking response with all relations
 */
export const BookingResponseSchema = BookingBaseResponseSchema.extend({
  customers: BookingCustomerRelationSchema.nullable(),
  profiles: BookingStaffRelationSchema.nullable(),
  teams: BookingTeamRelationSchema.nullable(),
  service_packages: BookingPackageV1RelationSchema.nullable(),
  service_packages_v2: BookingPackageV2RelationSchema.nullable(),
  pricing_tiers: BookingTierRelationSchema.nullable(),
})

/**
 * Recurring group response schema
 */
export const RecurringGroupResponseSchema = z.object({
  id: z.string().uuid(),
  customer_id: z.string().uuid(),
  recurrence_pattern: z.string(),
  start_date: z.string(),
  end_date: z.string(),
  created_bookings_count: z.number(),
  created_at: z.string(),
})

/**
 * Recurring booking creation response
 */
export const RecurringBookingCreateResponseSchema = z.object({
  group: RecurringGroupResponseSchema,
  bookings: z.array(BookingBaseResponseSchema),
  success_count: z.number(),
  error_count: z.number(),
  errors: z.array(z.object({
    date: z.string(),
    error: z.string(),
  })).optional(),
})

// ============================================================================
// TYPE EXPORTS
// ============================================================================

export type BookingCreateRequest = z.infer<typeof BookingCreateRequestSchema>
export type BookingUpdateRequest = z.infer<typeof BookingUpdateRequestSchema>
export type RecurringBookingCreateRequest = z.infer<typeof RecurringBookingCreateRequestSchema>

export type BookingResponse = z.infer<typeof BookingResponseSchema>
export type BookingBaseResponse = z.infer<typeof BookingBaseResponseSchema>
export type RecurringGroupResponse = z.infer<typeof RecurringGroupResponseSchema>
export type RecurringBookingCreateResponse = z.infer<typeof RecurringBookingCreateResponseSchema>

export type BookingStatus = z.infer<typeof BookingStatusEnum>
export type PaymentStatus = z.infer<typeof PaymentStatusEnum>
export type BookingSource = z.infer<typeof BookingSourceEnum>
