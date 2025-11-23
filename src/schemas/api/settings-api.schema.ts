/**
 * Settings & Profile API Schemas (Phase 7)
 *
 * Zod schemas for validating settings and profile API requests and responses.
 * These build on top of existing schemas from Phase 5.
 */

import { z } from 'zod'
import {
  GeneralSettingsSchema,
  BookingSettingsSchema,
  NotificationSettingsSchema,
} from '../settings.schema'
import { ProfileUpdateSchema } from '../profile.schema'

// ============================================================================
// SETTINGS API SCHEMAS
// ============================================================================

/**
 * Complete settings response (all settings combined)
 */
export const SettingsResponseSchema = z.object({
  id: z.string().uuid(),

  // General Settings
  business_name: z.string(),
  business_email: z.string().email(),
  business_phone: z.string(),
  business_address: z.string().nullable(),
  business_description: z.string().nullable(),
  business_logo_url: z.string().nullable(),

  // Booking Settings
  time_slot_duration: z.number().int(),
  min_advance_booking: z.number().int(),
  max_booking_window: z.number().int(),
  cancellation_hours: z.number().int(),
  require_deposit: z.boolean(),
  deposit_percentage: z.number().nullable(),

  // Notification Settings
  email_notifications: z.boolean(),
  sms_notifications: z.boolean(),
  notify_new_booking: z.boolean(),
  notify_cancellation: z.boolean(),
  notify_payment: z.boolean(),
  reminder_hours: z.number().int(),

  // Metadata
  created_at: z.string(),
  updated_at: z.string(),
})

/**
 * General settings update request
 * Reuses Phase 5 schema with API validation layer
 */
export const GeneralSettingsUpdateRequestSchema = GeneralSettingsSchema

/**
 * Booking settings update request
 * Reuses Phase 5 schema with API validation layer
 */
export const BookingSettingsUpdateRequestSchema = BookingSettingsSchema

/**
 * Notification settings update request
 * Reuses Phase 5 schema with API validation layer
 */
export const NotificationSettingsUpdateRequestSchema = NotificationSettingsSchema

// ============================================================================
// PROFILE API SCHEMAS
// ============================================================================

/**
 * Profile response schema
 */
export const ProfileResponseSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  full_name: z.string(),
  phone: z.string().nullable(),
  avatar_url: z.string().nullable(),

  // Role info
  role: z.enum(['admin', 'manager', 'staff']),

  // Staff-specific fields
  staff_number: z.string().nullable(),
  skills: z.array(z.string()).nullable(),
  bio: z.string().nullable(),
  hourly_rate: z.number().nullable(),
  commission_rate: z.number().nullable(),

  // Metadata
  created_at: z.string(),
  updated_at: z.string(),
})

/**
 * Profile update request
 * Reuses Phase 5 schema with API validation layer
 */
export const ProfileUpdateRequestSchema = ProfileUpdateSchema

/**
 * Password change request
 */
export const PasswordChangeRequestSchema = z.object({
  current_password: z.string()
    .min(6, 'Password must be at least 6 characters'),

  new_password: z.string()
    .min(6, 'New password must be at least 6 characters')
    .max(72, 'New password must be less than 72 characters'),

  confirm_password: z.string()
    .min(6, 'Confirm password must be at least 6 characters'),
}).refine(
  (data) => data.new_password === data.confirm_password,
  {
    message: 'Passwords do not match',
    path: ['confirm_password'],
  }
).refine(
  (data) => data.current_password !== data.new_password,
  {
    message: 'New password must be different from current password',
    path: ['new_password'],
  }
)

/**
 * Avatar upload request
 */
export const AvatarUploadRequestSchema = z.object({
  file: z.instanceof(File, {
    message: 'Avatar must be a file',
  }).refine(
    (file) => file.size <= 2 * 1024 * 1024,
    'Avatar file size must be less than 2MB'
  ).refine(
    (file) => ['image/jpeg', 'image/png', 'image/webp'].includes(file.type),
    'Avatar must be a JPEG, PNG, or WebP image'
  ),
})

/**
 * Avatar upload response
 */
export const AvatarUploadResponseSchema = z.object({
  avatar_url: z.string().url(),
  uploaded_at: z.string(),
})

// ============================================================================
// AUTHENTICATION API SCHEMAS
// ============================================================================

/**
 * Sign in request
 */
export const SignInRequestSchema = z.object({
  email: z.string()
    .email('Invalid email format')
    .toLowerCase(),

  password: z.string()
    .min(6, 'Password must be at least 6 characters'),
})

/**
 * Sign up request
 */
export const SignUpRequestSchema = z.object({
  email: z.string()
    .email('Invalid email format')
    .toLowerCase(),

  password: z.string()
    .min(6, 'Password must be at least 6 characters')
    .max(72, 'Password must be less than 72 characters'),

  full_name: z.string()
    .min(2, 'Full name must be at least 2 characters')
    .max(100, 'Full name must be less than 100 characters')
    .trim(),
})

/**
 * Auth session response
 */
export const AuthSessionResponseSchema = z.object({
  access_token: z.string(),
  refresh_token: z.string(),
  expires_in: z.number().int(),
  expires_at: z.number().int(),
  token_type: z.literal('bearer'),

  user: z.object({
    id: z.string().uuid(),
    email: z.string().email(),
    role: z.string().nullable(),
    created_at: z.string(),
    updated_at: z.string(),
  }),
})

/**
 * Password reset request
 */
export const PasswordResetRequestSchema = z.object({
  email: z.string()
    .email('Invalid email format')
    .toLowerCase(),
})

/**
 * Password reset confirmation request
 */
export const PasswordResetConfirmRequestSchema = z.object({
  token: z.string()
    .min(1, 'Reset token is required'),

  new_password: z.string()
    .min(6, 'Password must be at least 6 characters')
    .max(72, 'Password must be less than 72 characters'),
})

// ============================================================================
// TYPE EXPORTS
// ============================================================================

// Settings Types
export type SettingsResponse = z.infer<typeof SettingsResponseSchema>
export type GeneralSettingsUpdateRequest = z.infer<typeof GeneralSettingsUpdateRequestSchema>
export type BookingSettingsUpdateRequest = z.infer<typeof BookingSettingsUpdateRequestSchema>
export type NotificationSettingsUpdateRequest = z.infer<typeof NotificationSettingsUpdateRequestSchema>

// Profile Types
export type ProfileResponse = z.infer<typeof ProfileResponseSchema>
export type ProfileUpdateRequest = z.infer<typeof ProfileUpdateRequestSchema>
export type PasswordChangeRequest = z.infer<typeof PasswordChangeRequestSchema>
export type AvatarUploadRequest = z.infer<typeof AvatarUploadRequestSchema>
export type AvatarUploadResponse = z.infer<typeof AvatarUploadResponseSchema>

// Auth Types
export type SignInRequest = z.infer<typeof SignInRequestSchema>
export type SignUpRequest = z.infer<typeof SignUpRequestSchema>
export type AuthSessionResponse = z.infer<typeof AuthSessionResponseSchema>
export type PasswordResetRequest = z.infer<typeof PasswordResetRequestSchema>
export type PasswordResetConfirmRequest = z.infer<typeof PasswordResetConfirmRequestSchema>
