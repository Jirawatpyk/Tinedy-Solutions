import { z } from 'zod'
import { emailSchema, phoneSchema, nameSchema, birthdaySchema } from './common.schema'
import { partialAddressSchema } from './address.schema'

/**
 * Customer Validation Schemas
 *
 * Validation schemas for customer-related forms
 */

// Relationship Level Enum
export const relationshipLevelSchema = z.enum(['new', 'regular', 'vip', 'inactive'])

// Preferred Contact Method Enum
export const preferredContactMethodSchema = z.enum(['phone', 'email', 'line', 'sms'])

// Customer Source Enum
export const customerSourceSchema = z.enum([
  'facebook',
  'instagram',
  'google',
  'website',
  'referral',
  'walk-in',
  'other',
])

// Customer Create Schema (Admin creates a new customer)
export const customerCreateSchema = z.object({
  // Basic Information (Required)
  full_name: nameSchema,
  email: emailSchema,
  phone: phoneSchema,

  // Optional Contact
  line_id: z.string().max(100, 'Line ID is too long').optional().or(z.literal('')),

  // Address (Optional - using partialAddressSchema)
  ...partialAddressSchema.shape,

  // Relationship & Contact Preferences
  relationship_level: relationshipLevelSchema.default('new'),
  preferred_contact_method: preferredContactMethodSchema.default('phone'),
  source: customerSourceSchema.optional(),
  source_other: z.string().max(255, 'Source description is too long').optional().or(z.literal('')),

  // Additional Information
  birthday: birthdaySchema.optional().or(z.literal('')),
  company_name: z
    .string()
    .trim()
    .max(255, 'Company name is too long')
    .refine(
      (val) => !val || !val.includes('  '),
      { message: 'Company name cannot contain consecutive spaces' }
    )
    .optional()
    .or(z.literal('')),
  tax_id: z
    .string()
    .max(50, 'Tax ID is too long')
    .regex(/^[\d-]*$/, 'Tax ID can only contain numbers and hyphens')
    .optional()
    .or(z.literal('')),

  // Categorization
  tags: z.array(z.string()).optional().default([]),
  notes: z.string().max(1000, 'Notes cannot exceed 1000 characters').optional().or(z.literal('')),
})

export type CustomerCreateFormData = z.infer<typeof customerCreateSchema>

// Customer Update Schema (Edit existing customer)
export const customerUpdateSchema = customerCreateSchema.partial().extend({
  // At least one of these core fields should be present
  full_name: nameSchema.optional(),
  email: emailSchema.optional(),
  phone: phoneSchema.optional(),
})

export type CustomerUpdateFormData = z.infer<typeof customerUpdateSchema>

// Customer Registration Schema (For future self-registration feature)
export const customerRegistrationSchema = z
  .object({
    full_name: nameSchema,
    email: emailSchema,
    phone: phoneSchema,
    password: z.string().min(6, 'Password must be at least 6 characters'),
    confirmPassword: z.string().min(6, 'Password must be at least 6 characters'),

    // Optional address during registration
    ...partialAddressSchema.shape,
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ['confirmPassword'],
  })

export type CustomerRegistrationFormData = z.infer<typeof customerRegistrationSchema>
