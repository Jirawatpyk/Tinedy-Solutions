import { z } from 'zod'

/**
 * Staff Management Schemas
 *
 * Architecture:
 * - StaffCreateSchema: สำหรับสร้างพนักงานใหม่ (ผ่าน Edge Function)
 * - StaffUpdateSchema: สำหรับแก้ไขข้อมูลพนักงาน
 * - Skills: รับเป็น array โดยตรงจาก TagInput component
 *
 * Related Tables:
 * - profiles: Main user profile table
 * - auth.users: Authentication table (managed by create-staff function)
 */

// ============================================================================
// COMMON VALIDATORS
// ============================================================================

/**
 * Email validator (reusable)
 */
export const emailSchema = z
  .string({ message: 'Email is required' })
  .email('Invalid email format')
  .min(1, 'Email must not be empty')

/**
 * Phone validator (Thai phone format - optional)
 */
export const phoneSchema = z
  .string()
  .regex(/^[0-9]{9,10}$/, 'Phone number must be 9-10 digits')
  .nullable()
  .optional()
  .or(z.literal(''))

/**
 * Password validator (minimum 6 characters)
 */
export const passwordSchema = z
  .string({ message: 'Password is required' })
  .min(6, 'Password must be at least 6 characters')

// ============================================================================
// ENUMS
// ============================================================================

/**
 * User Role Enum
 * Note: 'customer' role excluded for staff management
 */
export const UserRoleEnum = z.enum(['admin', 'manager', 'staff', 'customer'])

/**
 * Staff Role Enum (excludes customer)
 */
export const StaffRoleEnum = z.enum(['admin', 'manager', 'staff'])

// ============================================================================
// STAFF CREATE SCHEMA
// ============================================================================

/**
 * Schema สำหรับสร้างพนักงานใหม่
 * ใช้กับ Edge Function: create-staff
 */
export const StaffCreateSchema = z.object({
  email: emailSchema,

  password: passwordSchema,

  full_name: z
    .string({ message: 'Full name is required' })
    .trim()
    .min(1, 'Full name must not be empty')
    .min(2, 'Full name must be at least 2 characters')
    .max(200, 'Full name must not exceed 200 characters'),

  phone: phoneSchema,

  role: StaffRoleEnum,

  staff_number: z
    .string()
    .regex(/^STF\d{4}$/, 'Staff number must be in format STF#### (e.g. STF0001)')
    .nullable()
    .optional()
    .or(z.literal('')),

  skills: z
    .array(z.string().trim().min(1))
    .default([]),
})

/**
 * Schema พร้อม transformation สำหรับ null handling
 */
export const StaffCreateWithSkillsSchema = StaffCreateSchema.transform((data) => ({
  email: data.email,
  password: data.password,
  full_name: data.full_name,
  phone: data.phone || null,
  role: data.role,
  staff_number: data.staff_number || null,
  skills: data.skills.length > 0 ? data.skills : null,
}))

// ============================================================================
// STAFF UPDATE SCHEMA
// ============================================================================

/**
 * Schema สำหรับแก้ไขข้อมูลพนักงาน
 * Note: ไม่สามารถแก้ไข email ผ่าน form นี้
 * Password เป็น optional - ถ้ากรอกจะทำการเปลี่ยนรหัสผ่าน
 */
export const StaffUpdateSchema = z.object({
  full_name: z
    .string({ message: 'Full name is required' })
    .trim()
    .min(1, 'Full name must not be empty')
    .min(2, 'Full name must be at least 2 characters')
    .max(200, 'Full name must not exceed 200 characters'),

  phone: phoneSchema,

  password: passwordSchema
    .optional()
    .or(z.literal('')),

  role: StaffRoleEnum,

  staff_number: z
    .string()
    .regex(/^STF\d{4}$/, 'Staff number must be in format STF#### (e.g. STF0001)')
    .nullable()
    .optional()
    .or(z.literal('')),

  skills: z
    .array(z.string().trim().min(1))
    .default([]),
})

/**
 * Schema พร้อม transformation สำหรับ null handling (Update)
 */
export const StaffUpdateWithSkillsSchema = StaffUpdateSchema.transform((data) => ({
  full_name: data.full_name,
  phone: data.phone || null,
  role: data.role,
  staff_number: data.staff_number || null,
  skills: data.skills.length > 0 ? data.skills : null,
}))

// ============================================================================
// UTILITY SCHEMAS
// ============================================================================

/**
 * Schema สำหรับเปลี่ยนรหัสผ่าน (ถ้าต้องการใช้งานในอนาคต)
 */
export const ChangePasswordSchema = z.object({
  current_password: passwordSchema,
  new_password: passwordSchema,
  confirm_password: passwordSchema,
}).refine(
  (data) => data.new_password === data.confirm_password,
  {
    message: 'New passwords do not match',
    path: ['confirm_password']
  }
)

// ============================================================================
// TYPE EXPORTS
// ============================================================================

// Form Data Types (input types for React Hook Form)
export type StaffCreateFormData = z.input<typeof StaffCreateSchema>
export type StaffUpdateFormData = z.input<typeof StaffUpdateSchema>

// Transformed Types (output types after Zod transformation)
export type StaffCreateWithSkills = z.output<typeof StaffCreateWithSkillsSchema>
export type StaffUpdateWithSkills = z.output<typeof StaffUpdateWithSkillsSchema>

export type UserRole = z.infer<typeof UserRoleEnum>
export type StaffRole = z.infer<typeof StaffRoleEnum>
export type ChangePasswordFormData = z.infer<typeof ChangePasswordSchema>
