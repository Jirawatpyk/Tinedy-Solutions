import { z } from 'zod'

/**
 * Common Zod Validators
 *
 * Reusable validation schemas for common data types
 */

// Email Validator
export const emailSchema = z
  .string()
  .min(1, 'Email is required')
  .email('Invalid email format')

// Phone Validator (Thai format: 0X-XXXX-XXXX)
export const phoneSchema = z
  .string()
  .min(1, 'Phone number is required')
  .regex(/^0\d{9}$/, 'Phone must be 10 digits starting with 0 (e.g., 0812345678)')

// Optional Phone Validator
export const phoneOptionalSchema = z
  .string()
  .regex(/^0\d{9}$/, 'Phone must be 10 digits starting with 0')
  .optional()
  .or(z.literal(''))

// Password Validator
export const passwordSchema = z
  .string()
  .min(6, 'Password must be at least 6 characters')

// Optional Password Validator (for update forms)
export const passwordOptionalSchema = z
  .string()
  .min(6, 'Password must be at least 6 characters')
  .optional()
  .or(z.literal(''))

// Name Validator
export const nameSchema = z
  .string()
  .trim()
  .min(1, 'Name is required')
  .min(2, 'Name must be at least 2 characters')
  .refine(
    (val) => !val.includes('  '),
    { message: 'Name cannot contain consecutive spaces' }
  )

// Optional Name Validator
export const nameOptionalSchema = z
  .string()
  .trim()
  .min(2, 'Name must be at least 2 characters')
  .refine(
    (val) => !val || !val.includes('  '),
    { message: 'Name cannot contain consecutive spaces' }
  )
  .optional()
  .or(z.literal(''))

// URL Validator
export const urlSchema = z
  .string()
  .url('Invalid URL format')
  .optional()
  .or(z.literal(''))

// Positive Number Validator
export const positiveNumberSchema = z
  .number()
  .positive('Must be a positive number')

// Non-negative Number Validator
export const nonNegativeNumberSchema = z
  .number()
  .nonnegative('Must be a non-negative number')

// Date String Validator (YYYY-MM-DD)
export const dateStringSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format')

// Birthday Validator (cannot be in the future)
export const birthdaySchema = dateStringSchema
  .refine((date) => {
    if (!date) return true // Allow empty for optional fields
    const selectedDate = new Date(date)
    const today = new Date()
    today.setHours(0, 0, 0, 0) // Reset time to compare dates only
    return selectedDate <= today
  }, {
    message: 'Birthday cannot be in the future'
  })

// Booking Date Validator (cannot be in the past - must be today or future)
export const bookingDateSchema = dateStringSchema
  .refine((date) => {
    if (!date) return true // Allow empty for optional fields
    const selectedDate = new Date(date)
    const today = new Date()
    today.setHours(0, 0, 0, 0) // Reset time to compare dates only
    return selectedDate >= today
  }, {
    message: 'Booking date cannot be in the past'
  })

// Time String Validator (HH:MM)
export const timeStringSchema = z
  .string()
  .regex(/^([01]\d|2[0-3]):([0-5]\d)$/, 'Time must be in HH:MM format (24-hour)')

// UUID Validator
export const uuidSchema = z
  .string()
  .uuid('Invalid UUID format')

// Optional UUID Validator
export const uuidOptionalSchema = z
  .string()
  .uuid('Invalid UUID format')
  .optional()
  .or(z.literal(''))
