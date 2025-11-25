import { z } from 'zod'
import {
  emailSchema,
  phoneSchema,
  nameSchema,
  dateStringSchema,
  bookingDateSchema,
  timeStringSchema,
  uuidOptionalSchema,
  positiveNumberSchema,
} from './common.schema'
import { fullAddressSchema } from './address.schema'

/**
 * Booking Validation Schemas
 *
 * Validation schemas for booking-related forms
 * Supports both V1 (fixed pricing) and V2 (tiered pricing) service packages
 */

// Booking Status Enum
export const bookingStatusSchema = z.enum([
  'pending',
  'confirmed',
  'in_progress',
  'completed',
  'cancelled',
  'no_show',
])

// Payment Status Enum
export const paymentStatusSchema = z.enum(['pending', 'paid', 'partially_paid', 'refunded'])

// Frequency Schema (for V2 tiered pricing)
// Note: Using z.union for number literals (z.enum only works with strings)
export const frequencySchema = z.union([
  z.literal(1),
  z.literal(2),
  z.literal(4),
  z.literal(8),
])

// Recurring Pattern Enum
export const recurringPatternSchema = z.enum(['auto_monthly', 'manual'])

// Base Booking Schema (shared fields)
const baseBookingSchema = z.object({
  // Date & Time
  booking_date: bookingDateSchema, // ห้ามเลือกวันย้อนหลัง - ต้องเป็นวันนี้หรืออนาคต
  start_time: timeStringSchema,
  end_time: timeStringSchema.optional().or(z.literal('')),

  // Service Package (V1 or V2)
  service_package_id: uuidOptionalSchema,
  package_v2_id: uuidOptionalSchema,

  // Pricing
  total_price: positiveNumberSchema,
  area_sqm: z.number().positive('Area must be positive').optional(),
  frequency: frequencySchema.optional(),

  // Location (Required for all bookings)
  ...fullAddressSchema.shape,

  // Assignment (Staff OR Team, not both)
  staff_id: uuidOptionalSchema,
  team_id: uuidOptionalSchema,

  // Additional
  notes: z.string().max(1000, 'Notes cannot exceed 1000 characters').optional().or(z.literal('')),
})

// Booking Create Schema (for creating new bookings)
export const bookingCreateSchema = baseBookingSchema
  .extend({
    // Customer Information (for new customer OR existing customer)
    customer_id: uuidOptionalSchema, // If existing customer
    full_name: nameSchema.optional().or(z.literal('')), // If new customer
    email: emailSchema.optional().or(z.literal('')), // If new customer
    phone: phoneSchema.optional().or(z.literal('')), // If new customer
  })
  .refine(
    (data) => {
      // Must have either service_package_id OR package_v2_id (not both, not neither)
      const hasV1 = !!data.service_package_id
      const hasV2 = !!data.package_v2_id
      return (hasV1 && !hasV2) || (!hasV1 && hasV2)
    },
    {
      message: 'Please select either a V1 or V2 service package (not both)',
      path: ['service_package_id'],
    }
  )
  .refine(
    (data) => {
      // Cannot assign to both staff AND team (empty strings are treated as no assignment)
      const hasStaff = !!(data.staff_id && data.staff_id.trim())
      const hasTeam = !!(data.team_id && data.team_id.trim())
      return !(hasStaff && hasTeam)
    },
    {
      message: 'Cannot assign to both staff and team. Please choose one.',
      path: ['staff_id'],
    }
  )
  .refine(
    (data) => {
      // If creating a new customer, must have full_name, email, and phone
      // If using existing customer, must have customer_id
      const hasCustomerId = !!data.customer_id
      const hasNewCustomerInfo = !!(data.full_name && data.email && data.phone)
      return hasCustomerId || hasNewCustomerInfo
    },
    {
      message: 'Please provide customer information or select an existing customer',
      path: ['customer_id'],
    }
  )
  // Note: Removed validation for area_sqm and frequency on package_v2_id
  // because V2 packages can be either Fixed or Tiered pricing.
  // Validation is now handled in the component based on pricingModel.

export type BookingCreateFormData = z.infer<typeof bookingCreateSchema>

// Booking Update Schema (for editing existing bookings)
export const bookingUpdateSchema = z.object({
  // Date & Time
  booking_date: bookingDateSchema, // ห้ามเลือกวันย้อนหลัง - ต้องเป็นวันนี้หรืออนาคต
  start_time: timeStringSchema,
  end_time: timeStringSchema.optional().or(z.literal('')),

  // Service Package (V1 or V2)
  service_package_id: uuidOptionalSchema,
  package_v2_id: uuidOptionalSchema,

  // Pricing
  total_price: positiveNumberSchema,
  area_sqm: z.number().positive('Area must be positive').optional(),
  frequency: frequencySchema.optional(),

  // Location (Optional for updates - allow partial updates)
  address: z.string().max(255, 'Address is too long').optional().or(z.literal('')),
  city: z.string().max(100, 'City name is too long').optional().or(z.literal('')),
  state: z.string().max(100, 'State name is too long').optional().or(z.literal('')),
  zip_code: z.string().max(20, 'Zip code is too long').optional().or(z.literal('')),

  // Assignment (Staff OR Team, not both)
  staff_id: uuidOptionalSchema,
  team_id: uuidOptionalSchema,

  // Additional
  notes: z.string().max(1000, 'Notes cannot exceed 1000 characters').optional().or(z.literal('')),
  status: bookingStatusSchema.optional(),
})
  .refine(
    (data) => {
      // Cannot assign to both staff AND team (empty strings are treated as no assignment)
      const hasStaff = !!(data.staff_id && data.staff_id.trim())
      const hasTeam = !!(data.team_id && data.team_id.trim())
      return !(hasStaff && hasTeam)
    },
    {
      message: 'Cannot assign to both staff and team. Please choose one.',
      path: ['staff_id'],
    }
  )

export type BookingUpdateFormData = z.infer<typeof bookingUpdateSchema>

// Recurring Booking Schema (for creating recurring bookings)
export const recurringBookingSchema = bookingCreateSchema
  .omit({ booking_date: true }) // Remove single booking_date
  .extend({
    recurring_dates: z
      .array(dateStringSchema)
      .min(1, 'At least one recurring date is required')
      .max(50, 'Cannot create more than 50 recurring bookings at once'),
    recurring_pattern: recurringPatternSchema,
    frequency: frequencySchema, // Required for recurring bookings
  })
  .refine(
    (data) => {
      // Recurring bookings must have unique dates
      const uniqueDates = new Set(data.recurring_dates)
      return uniqueDates.size === data.recurring_dates.length
    },
    {
      message: 'Recurring dates must be unique',
      path: ['recurring_dates'],
    }
  )

export type RecurringBookingFormData = z.infer<typeof recurringBookingSchema>

// Payment Update Schema (for marking bookings as paid)
export const paymentUpdateSchema = z.object({
  payment_status: paymentStatusSchema,
  payment_method: z.enum(['cash', 'bank_transfer', 'credit_card', 'promptpay', 'other']).optional(),
  amount_paid: positiveNumberSchema.optional(),
  payment_date: dateStringSchema.optional(),
  payment_notes: z.string().max(500).optional().or(z.literal('')),
})

export type PaymentUpdateFormData = z.infer<typeof paymentUpdateSchema>
