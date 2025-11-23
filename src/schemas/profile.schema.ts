import { z } from 'zod'
import { nameSchema, phoneOptionalSchema, passwordSchema } from './common.schema'

/**
 * Profile Settings Schemas (Phase 5)
 *
 * Architecture:
 * - ProfileUpdateSchema: แก้ไขข้อมูล profile (full_name, phone)
 * - PasswordChangeSchema: เปลี่ยนรหัสผ่าน (password confirmation)
 * - Avatar upload validation
 *
 * Related Tables:
 * - profiles: User profiles table
 * - auth.users: Supabase authentication (email, password)
 *
 * Business Rules:
 * - Email cannot be changed via profile update (managed by auth system)
 * - Password must match confirmation
 * - Avatar max size: 2MB
 * - Avatar types: JPG, PNG, WEBP only
 */

// ============================================================================
// PROFILE UPDATE SCHEMA
// ============================================================================

/**
 * Schema สำหรับแก้ไขข้อมูล profile
 * Note: Email ไม่สามารถแก้ไขได้ (read-only)
 */
export const ProfileUpdateSchema = z.object({
  full_name: nameSchema,

  phone: phoneOptionalSchema,
})

/**
 * Transform schema สำหรับแปลง empty string เป็น null
 */
export const ProfileUpdateTransformSchema = ProfileUpdateSchema.transform((data) => ({
  full_name: data.full_name,
  phone: data.phone === '' ? null : data.phone || null,
}))

// ============================================================================
// PASSWORD CHANGE SCHEMA
// ============================================================================

/**
 * Schema สำหรับเปลี่ยนรหัสผ่าน
 */
export const PasswordChangeSchema = z.object({
  newPassword: passwordSchema,

  confirmPassword: passwordSchema,
}).refine(
  (data) => data.newPassword === data.confirmPassword,
  {
    message: "Passwords don't match",
    path: ['confirmPassword']
  }
)

// ============================================================================
// AVATAR UPDATE SCHEMA
// ============================================================================

/**
 * Schema สำหรับอัพเดท avatar URL
 * ใช้หลังจาก upload file สำเร็จแล้ว
 */
export const AvatarUpdateSchema = z.object({
  avatar_url: z
    .string()
    .url('Invalid avatar URL')
    .nullable()
    .optional()
    .or(z.literal('')),
})

/**
 * Transform schema สำหรับแปลง empty string เป็น null
 */
export const AvatarUpdateTransformSchema = AvatarUpdateSchema.transform((data) => ({
  avatar_url: data.avatar_url === '' ? null : data.avatar_url || null,
}))

// ============================================================================
// VALIDATION HELPERS
// ============================================================================

/**
 * ตรวจสอบไฟล์ Avatar
 * @param file - ไฟล์ที่ต้องการตรวจสอบ
 * @returns { valid: boolean, error?: string }
 */
export const validateAvatarFile = (file: File): { valid: boolean; error?: string } => {
  const allowedTypes = ['image/jpeg', 'image/png', 'image/webp']
  const maxSize = 2 * 1024 * 1024 // 2MB

  if (!allowedTypes.includes(file.type)) {
    return {
      valid: false,
      error: 'Only JPG, PNG, and WEBP files are supported'
    }
  }

  if (file.size > maxSize) {
    return {
      valid: false,
      error: 'File size must be less than 2MB'
    }
  }

  return { valid: true }
}

/**
 * ตรวจสอบความแข็งแรงของรหัสผ่าน (optional - เพิ่มเติมจาก basic validation)
 * @param password - รหัสผ่านที่ต้องการตรวจสอบ
 * @returns { valid: boolean, strength: 'weak' | 'medium' | 'strong' }
 */
export const validatePasswordStrength = (password: string): {
  valid: boolean
  strength: 'weak' | 'medium' | 'strong'
  message?: string
} => {
  // Basic validation: min 6 characters
  if (password.length < 6) {
    return { valid: false, strength: 'weak', message: 'Password must be at least 6 characters' }
  }

  let strengthScore = 0

  // Has lowercase
  if (/[a-z]/.test(password)) strengthScore++
  // Has uppercase
  if (/[A-Z]/.test(password)) strengthScore++
  // Has numbers
  if (/\d/.test(password)) strengthScore++
  // Has special characters
  if (/[!@#$%^&*(),.?":{}|<>]/.test(password)) strengthScore++
  // Length >= 8
  if (password.length >= 8) strengthScore++

  if (strengthScore <= 2) {
    return { valid: true, strength: 'weak', message: 'Password is weak. Consider adding uppercase, numbers, or special characters' }
  } else if (strengthScore <= 3) {
    return { valid: true, strength: 'medium', message: 'Password is medium strength' }
  } else {
    return { valid: true, strength: 'strong', message: 'Password is strong' }
  }
}

// ============================================================================
// TYPE EXPORTS
// ============================================================================

export type ProfileUpdateFormData = z.infer<typeof ProfileUpdateSchema>
export type ProfileUpdateData = z.infer<typeof ProfileUpdateTransformSchema>
export type PasswordChangeFormData = z.infer<typeof PasswordChangeSchema>
export type AvatarUpdateFormData = z.infer<typeof AvatarUpdateSchema>
export type AvatarUpdateData = z.infer<typeof AvatarUpdateTransformSchema>
