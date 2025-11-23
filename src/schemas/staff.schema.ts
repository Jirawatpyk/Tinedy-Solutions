import { z } from 'zod'

/**
 * Staff Management Schemas
 *
 * Architecture:
 * - StaffCreateSchema: สำหรับสร้างพนักงานใหม่ (ผ่าน Edge Function)
 * - StaffUpdateSchema: สำหรับแก้ไขข้อมูลพนักงาน
 * - Skills transformation: แปลงจาก comma-separated string เป็น array
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
    .min(1, 'Full name must not be empty')
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
    .string()
    .max(500, 'Skills must not exceed 500 characters')
    .nullable()
    .optional()
    .or(z.literal('')),
})

/**
 * Schema พร้อม transformation สำหรับ skills
 * แปลงจาก "skill1, skill2, skill3" เป็น ["skill1", "skill2", "skill3"]
 */
export const StaffCreateWithSkillsSchema = StaffCreateSchema.transform((data) => {
  // แปลง skills จาก string เป็น array
  const skillsArray = data.skills
    ? data.skills
        .split(',')
        .map(s => s.trim())
        .filter(s => s.length > 0)
    : []

  return {
    email: data.email,
    password: data.password,
    full_name: data.full_name,
    phone: data.phone || null,
    role: data.role,
    staff_number: data.staff_number || null,
    skills: skillsArray.length > 0 ? skillsArray : null,
  }
})

// ============================================================================
// STAFF UPDATE SCHEMA
// ============================================================================

/**
 * Schema สำหรับแก้ไขข้อมูลพนักงาน
 * Note: ไม่สามารถแก้ไข email และ password ผ่าน form นี้
 */
export const StaffUpdateSchema = z.object({
  full_name: z
    .string({ message: 'Full name is required' })
    .min(1, 'Full name must not be empty')
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
    .string()
    .max(500, 'Skills must not exceed 500 characters')
    .nullable()
    .optional()
    .or(z.literal('')),
})

/**
 * Schema พร้อม transformation สำหรับ skills (Update)
 */
export const StaffUpdateWithSkillsSchema = StaffUpdateSchema.transform((data) => {
  // แปลง skills จาก string เป็น array
  const skillsArray = data.skills
    ? data.skills
        .split(',')
        .map(s => s.trim())
        .filter(s => s.length > 0)
    : []

  return {
    full_name: data.full_name,
    phone: data.phone || null,
    role: data.role,
    staff_number: data.staff_number || null,
    skills: skillsArray.length > 0 ? skillsArray : null,
  }
})

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

export type StaffCreateFormData = z.infer<typeof StaffCreateSchema>
export type StaffCreateWithSkills = z.infer<typeof StaffCreateWithSkillsSchema>
export type StaffUpdateFormData = z.infer<typeof StaffUpdateSchema>
export type StaffUpdateWithSkills = z.infer<typeof StaffUpdateWithSkillsSchema>
export type UserRole = z.infer<typeof UserRoleEnum>
export type StaffRole = z.infer<typeof StaffRoleEnum>
export type ChangePasswordFormData = z.infer<typeof ChangePasswordSchema>
