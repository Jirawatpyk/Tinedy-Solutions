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
import { PriceMode } from '@/types/booking'

/**
 * Booking Validation Schemas (V2)
 *
 * Updated to support:
 * - Multi-day bookings (end_date)
 * - Custom pricing (price_mode, job_name, custom_price)
 * - V2 packages only (V1 packages fully removed)
 *
 * Uses .superRefine() for cross-field validation (Zod 4 best practice).
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

// Price Mode Schema
export const priceModeSchema = z.enum([
  PriceMode.Package,
  PriceMode.Override,
  PriceMode.Custom,
])

// Frequency Schema (for V2 tiered pricing)
export const frequencySchema = z.union([
  z.literal(1),
  z.literal(2),
  z.literal(4),
  z.literal(8),
])

// Recurring Pattern Enum
export const recurringPatternSchema = z.enum(['auto-monthly', 'custom'])

// Base Booking Schema (shared fields)
const baseBookingSchema = z.object({
  // Date & Time (multi-day support)
  booking_date: bookingDateSchema,
  end_date: z.string().nullable().optional(),
  start_time: timeStringSchema,
  end_time: timeStringSchema.optional().or(z.literal('')),

  // Service Package V2 only
  package_v2_id: uuidOptionalSchema,

  // Pricing V2
  price_mode: priceModeSchema.optional(),
  total_price: positiveNumberSchema,
  custom_price: z.number().min(0).nullable().optional(), // >=0 (฿0 allowed for free jobs)
  price_override: z.boolean().optional(),
  job_name: z.string().max(255).nullable().optional(),

  area_sqm: z.number().min(1, 'พื้นที่ต้องมากกว่า 0 ตร.ม.').nullable().optional(),
  frequency: frequencySchema.optional(),

  // Location (Required for all bookings)
  ...fullAddressSchema.shape,

  // Assignment (Staff OR Team, not both)
  staff_id: uuidOptionalSchema,
  team_id: uuidOptionalSchema,

  // Additional
  notes: z.string().max(1000, 'Notes cannot exceed 1000 characters').optional().or(z.literal('')),
})

// Booking Create Schema (V2)
export const bookingCreateSchema = baseBookingSchema
  .extend({
    customer_id: uuidOptionalSchema,
    full_name: nameSchema.optional().or(z.literal('')),
    email: emailSchema.optional().or(z.literal('')),
    phone: phoneSchema.optional().or(z.literal('')),
  })
  .superRefine((data, ctx) => {
    // Customer validation
    const hasCustomerId = !!data.customer_id
    const hasNewCustomerInfo = !!(data.full_name && data.phone)
    if (!hasCustomerId && !hasNewCustomerInfo) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['customer_id'],
        message: 'กรุณาเลือกลูกค้าหรือกรอกข้อมูลลูกค้าใหม่',
      })
    }

    // Assignment validation: cannot assign to both staff AND team
    const hasStaff = !!(data.staff_id && data.staff_id.trim())
    const hasTeam = !!(data.team_id && data.team_id.trim())
    if (hasStaff && hasTeam) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['staff_id'],
        message: 'Cannot assign to both staff and team. Please choose one.',
      })
    }

    // Price mode validation (T2.6)
    const mode = data.price_mode
    if (mode === PriceMode.Custom) {
      if (!data.job_name) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['job_name'], message: 'กรุณาระบุชื่องาน' })
      }
      if (data.custom_price === null || data.custom_price === undefined || data.custom_price < 0) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['custom_price'], message: 'กรุณาระบุราคา' })
      }
      // custom_price = 0 is allowed (free job) — EC-P2
    } else if (mode === PriceMode.Override) {
      if (!data.package_v2_id) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['package_v2_id'], message: 'กรุณาเลือก Package ก่อนปรับราคา' })
      }
      if (data.custom_price === null || data.custom_price === undefined || data.custom_price < 0) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['custom_price'], message: 'กรุณาระบุราคาที่ต้องการ' })
      }
      // Override to ฿0 allowed for VIP etc. — EC-P2
    } else if (mode === PriceMode.Package || mode === undefined) {
      // Default: require package_v2_id
      if (!data.package_v2_id) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['package_v2_id'], message: 'กรุณาเลือก Package' })
      }
    }

    // EC-P3: area_sqm minimum = 1 for all modes when provided
    if (data.area_sqm !== null && data.area_sqm !== undefined && data.area_sqm < 1) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['area_sqm'], message: 'พื้นที่ต้องมากกว่า 0 ตร.ม.' })
    }

    // end_date must be >= booking_date when provided
    if (data.end_date && data.end_date < data.booking_date) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['end_date'], message: 'วันสิ้นสุดต้องไม่น้อยกว่าวันเริ่มต้น' })
    }
  })

export type BookingCreateFormData = z.infer<typeof bookingCreateSchema>

// Booking Update Schema (V2)
export const bookingUpdateSchema = z.object({
  booking_date: bookingDateSchema,
  end_date: z.string().nullable().optional(),
  start_time: timeStringSchema,
  end_time: timeStringSchema.optional().or(z.literal('')),

  package_v2_id: uuidOptionalSchema,
  price_mode: priceModeSchema.optional(),
  total_price: positiveNumberSchema,
  custom_price: z.number().min(0).nullable().optional(),
  price_override: z.boolean().optional(),
  job_name: z.string().max(255).nullable().optional(),

  area_sqm: z.number().min(1, 'พื้นที่ต้องมากกว่า 0 ตร.ม.').nullable().optional(),
  frequency: frequencySchema.optional(),

  address: z.string().max(255, 'Address is too long').optional().or(z.literal('')),
  city: z.string().max(100, 'City name is too long').optional().or(z.literal('')),
  state: z.string().max(100, 'State name is too long').optional().or(z.literal('')),
  zip_code: z.string().max(20, 'Zip code is too long').optional().or(z.literal('')),

  staff_id: uuidOptionalSchema,
  team_id: uuidOptionalSchema,

  notes: z.string().max(1000, 'Notes cannot exceed 1000 characters').optional().or(z.literal('')),
  status: bookingStatusSchema.optional(),
})
  .superRefine((data, ctx) => {
    const hasStaff = !!(data.staff_id && data.staff_id.trim())
    const hasTeam = !!(data.team_id && data.team_id.trim())
    if (hasStaff && hasTeam) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['staff_id'],
        message: 'Cannot assign to both staff and team. Please choose one.',
      })
    }

    if (data.end_date && data.end_date < data.booking_date) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['end_date'], message: 'วันสิ้นสุดต้องไม่น้อยกว่าวันเริ่มต้น' })
    }
  })

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
