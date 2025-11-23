/**
 * Customer API Schemas (Phase 7)
 *
 * Zod schemas for validating customer API requests and responses.
 * Covers all customer-related endpoints including CRUD operations.
 */

import { z } from 'zod'

// ============================================================================
// VALIDATION HELPERS
// ============================================================================

/**
 * Validate Thai phone number format
 */
export function validateThaiPhone(phone: string): boolean {
  // Accept formats: 0812345678, 081-234-5678, 081 234 5678
  const cleaned = phone.replace(/[-\s]/g, '')
  return /^0[0-9]{9}$/.test(cleaned)
}

/**
 * Validate LINE ID format
 */
export function validateLineId(lineId: string): boolean {
  // LINE ID: alphanumeric, dots, underscores, hyphens (4-20 chars)
  return /^[a-zA-Z0-9._-]{4,20}$/.test(lineId)
}

// ============================================================================
// REQUEST SCHEMAS
// ============================================================================

/**
 * Schema for creating a new customer
 */
export const CustomerCreateRequestSchema = z.object({
  full_name: z.string()
    .min(2, 'Full name must be at least 2 characters')
    .max(100, 'Full name must be less than 100 characters')
    .trim(),

  email: z.string()
    .email('Invalid email format')
    .max(255, 'Email must be less than 255 characters')
    .toLowerCase()
    .nullable(),

  phone: z.string()
    .min(9, 'Phone number must be at least 9 digits')
    .max(15, 'Phone number must be less than 15 characters')
    .refine(validateThaiPhone, {
      message: 'Invalid Thai phone number format (e.g., 0812345678)',
    })
    .nullable(),

  line_id: z.string()
    .min(4, 'LINE ID must be at least 4 characters')
    .max(20, 'LINE ID must be less than 20 characters')
    .refine(validateLineId, {
      message: 'Invalid LINE ID format (alphanumeric, dots, underscores, hyphens only)',
    })
    .nullable(),

  address: z.string()
    .max(500, 'Address must be less than 500 characters')
    .nullable(),

  date_of_birth: z.string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format')
    .refine((date) => {
      const birthDate = new Date(date)
      const today = new Date()
      const age = today.getFullYear() - birthDate.getFullYear()
      return age >= 0 && age <= 150
    }, {
      message: 'Invalid date of birth',
    })
    .nullable(),

  notes: z.string()
    .max(1000, 'Notes must be less than 1000 characters')
    .nullable(),

  tags: z.array(z.string().max(50, 'Tag must be less than 50 characters'))
    .max(10, 'Maximum 10 tags allowed')
    .nullable(),

  preferences: z.record(z.string(), z.any())
    .nullable(),
}).refine(
  (data) => data.email !== null || data.phone !== null || data.line_id !== null,
  {
    message: 'At least one contact method (email, phone, or LINE ID) must be provided',
    path: ['email'],
  }
)

/**
 * Schema for updating an existing customer
 */
export const CustomerUpdateRequestSchema = z.object({
  full_name: z.string()
    .min(2, 'Full name must be at least 2 characters')
    .max(100, 'Full name must be less than 100 characters')
    .trim()
    .optional(),

  email: z.string()
    .email('Invalid email format')
    .max(255, 'Email must be less than 255 characters')
    .toLowerCase()
    .nullable()
    .optional(),

  phone: z.string()
    .min(9, 'Phone number must be at least 9 digits')
    .max(15, 'Phone number must be less than 15 characters')
    .refine(validateThaiPhone, {
      message: 'Invalid Thai phone number format (e.g., 0812345678)',
    })
    .nullable()
    .optional(),

  line_id: z.string()
    .min(4, 'LINE ID must be at least 4 characters')
    .max(20, 'LINE ID must be less than 20 characters')
    .refine(validateLineId, {
      message: 'Invalid LINE ID format (alphanumeric, dots, underscores, hyphens only)',
    })
    .nullable()
    .optional(),

  address: z.string()
    .max(500, 'Address must be less than 500 characters')
    .nullable()
    .optional(),

  date_of_birth: z.string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format')
    .refine((date) => {
      const birthDate = new Date(date)
      const today = new Date()
      const age = today.getFullYear() - birthDate.getFullYear()
      return age >= 0 && age <= 150
    }, {
      message: 'Invalid date of birth',
    })
    .nullable()
    .optional(),

  notes: z.string()
    .max(1000, 'Notes must be less than 1000 characters')
    .nullable()
    .optional(),

  tags: z.array(z.string().max(50, 'Tag must be less than 50 characters'))
    .max(10, 'Maximum 10 tags allowed')
    .nullable()
    .optional(),

  preferences: z.record(z.string(), z.any())
    .nullable()
    .optional(),
})

// ============================================================================
// RESPONSE SCHEMAS
// ============================================================================

/**
 * Base customer response schema (without relations)
 */
export const CustomerBaseResponseSchema = z.object({
  id: z.string().uuid(),
  full_name: z.string(),
  email: z.string().email().nullable(),
  phone: z.string().nullable(),
  line_id: z.string().nullable(),
  address: z.string().nullable(),
  date_of_birth: z.string().nullable(),
  notes: z.string().nullable(),
  tags: z.array(z.string()).nullable(),
  preferences: z.record(z.string(), z.any()).nullable(),

  created_at: z.string(),
  updated_at: z.string(),
  deleted_at: z.string().nullable(),
})

/**
 * Booking relation schema for customer detail
 */
export const CustomerBookingRelationSchema = z.object({
  id: z.string().uuid(),
  booking_date: z.string(),
  start_time: z.string(),
  end_time: z.string(),
  status: z.enum(['pending', 'confirmed', 'in_progress', 'completed', 'cancelled', 'no_show']),
  payment_status: z.enum(['pending', 'partial', 'paid', 'refunded']),
  total_price: z.number(),

  // Package info
  service_packages: z.object({
    id: z.string().uuid(),
    name: z.string(),
    price: z.number(),
  }).nullable(),

  service_packages_v2: z.object({
    id: z.string().uuid(),
    name: z.string(),
  }).nullable(),

  pricing_tiers: z.object({
    id: z.string().uuid(),
    tier_name: z.string(),
    price: z.number(),
  }).nullable(),

  // Staff/Team info
  profiles: z.object({
    id: z.string().uuid(),
    full_name: z.string(),
  }).nullable(),

  teams: z.object({
    id: z.string().uuid(),
    name: z.string(),
  }).nullable(),
})

/**
 * Full customer response with bookings relation
 */
export const CustomerResponseSchema = CustomerBaseResponseSchema.extend({
  bookings: z.array(CustomerBookingRelationSchema).nullable(),
})

/**
 * Customer list item (minimal info for lists)
 */
export const CustomerListItemSchema = z.object({
  id: z.string().uuid(),
  full_name: z.string(),
  email: z.string().email().nullable(),
  phone: z.string().nullable(),
  line_id: z.string().nullable(),
  tags: z.array(z.string()).nullable(),
  created_at: z.string(),

  // Aggregated stats
  total_bookings: z.number().optional(),
  total_spent: z.number().optional(),
  last_booking_date: z.string().nullable().optional(),
})

// ============================================================================
// TYPE EXPORTS
// ============================================================================

export type CustomerCreateRequest = z.infer<typeof CustomerCreateRequestSchema>
export type CustomerUpdateRequest = z.infer<typeof CustomerUpdateRequestSchema>

export type CustomerResponse = z.infer<typeof CustomerResponseSchema>
export type CustomerBaseResponse = z.infer<typeof CustomerBaseResponseSchema>
export type CustomerListItem = z.infer<typeof CustomerListItemSchema>
export type CustomerBookingRelation = z.infer<typeof CustomerBookingRelationSchema>
