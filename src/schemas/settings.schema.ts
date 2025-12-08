import { z } from 'zod'
import { emailSchema, nameSchema, businessPhoneSchema } from './common.schema'

/**
 * System Settings Schemas (Phase 5)
 *
 * Architecture:
 * - GeneralSettingsSchema: ข้อมูลธุรกิจ (business information)
 * - BookingSettingsSchema: การตั้งค่าการจอง (booking configuration)
 * - NotificationSettingsSchema: การตั้งค่าการแจ้งเตือน (notification preferences)
 *
 * Related Tables:
 * - settings: Main system settings table (single row)
 *
 * Business Rules:
 * - Only one settings record in the system
 * - Admin users can update settings
 * - Enums for predefined values (time slots, percentages, etc.)
 * - Logo and files validated separately (max 2MB, JPG/PNG/WEBP)
 */

// ============================================================================
// ENUMS
// ============================================================================

/**
 * Time Slot Duration (minutes)
 * ช่วงเวลาของ slot การจอง
 */
export const TimeSlotDurationEnum = z.enum(['30', '60', '90', '120', '180', '240'])

/**
 * Minimum Advance Booking (hours)
 * เวลาล่วงหน้าขั้นต่ำที่ต้องจองก่อน
 */
export const MinAdvanceBookingEnum = z.enum(['1', '2', '4', '12', '24', '48', '72'])

/**
 * Maximum Booking Window (days)
 * จำนวนวันสูงสุดที่สามารถจองล่วงหน้าได้
 */
export const MaxBookingWindowEnum = z.enum(['7', '14', '30', '60', '90', '180'])

/**
 * Cancellation Hours (hours before booking)
 * จำนวนชั่วโมงก่อนการจองที่สามารถยกเลิกได้
 */
export const CancellationHoursEnum = z.enum(['1', '2', '4', '12', '24', '48', '72'])

/**
 * Deposit Percentage (%)
 * เปอร์เซ็นต์ของเงินมัดจำ
 */
export const DepositPercentageEnum = z.enum(['10', '20', '30', '50', '100'])

/**
 * Reminder Hours (hours before booking)
 * จำนวนชั่วโมงก่อนการจองที่จะส่งการแจ้งเตือน
 */
export const ReminderHoursEnum = z.enum(['1', '2', '4', '12', '24', '48'])

// ============================================================================
// GENERAL SETTINGS SCHEMA
// ============================================================================

/**
 * Schema สำหรับข้อมูลธุรกิจทั่วไป
 */
export const GeneralSettingsSchema = z.object({
  business_name: nameSchema,

  business_email: emailSchema,

  business_phone: businessPhoneSchema,

  business_address: z
    .string({ message: 'Business address is required' })
    .min(1, 'Business address must not be empty')
    .max(500, 'Business address must not exceed 500 characters'),

  business_description: z
    .string()
    .max(1000, 'Business description must not exceed 1000 characters')
    .nullable()
    .optional()
    .or(z.literal('')),

  business_logo_url: z
    .string()
    .url('Invalid logo URL')
    .nullable()
    .optional()
    .or(z.literal('')),
})

/**
 * Transform schema สำหรับแปลง empty string เป็น null
 */
export const GeneralSettingsTransformSchema = GeneralSettingsSchema.transform((data) => ({
  business_name: data.business_name,
  business_email: data.business_email,
  business_phone: data.business_phone,
  business_address: data.business_address,
  business_description: data.business_description === '' ? null : data.business_description || null,
  business_logo_url: data.business_logo_url === '' ? null : data.business_logo_url || null,
}))

// ============================================================================
// BOOKING SETTINGS SCHEMA
// ============================================================================

/**
 * Schema สำหรับการตั้งค่าการจอง
 */
export const BookingSettingsSchema = z.object({
  time_slot_duration: TimeSlotDurationEnum,

  min_advance_booking: MinAdvanceBookingEnum,

  max_booking_window: MaxBookingWindowEnum,

  cancellation_hours: CancellationHoursEnum,

  require_deposit: z.boolean(),

  deposit_percentage: DepositPercentageEnum.nullable().optional(),
}).refine(
  (data) => {
    // ถ้า require_deposit = true ต้องระบุ deposit_percentage
    if (data.require_deposit && !data.deposit_percentage) {
      return false
    }
    return true
  },
  {
    message: 'Deposit percentage is required when deposit is enabled',
    path: ['deposit_percentage']
  }
)

/**
 * Transform schema สำหรับแปลง string เป็น number
 */
export const BookingSettingsTransformSchema = BookingSettingsSchema.transform((data) => ({
  time_slot_duration: parseInt(data.time_slot_duration),
  min_advance_booking: parseInt(data.min_advance_booking),
  max_booking_window: parseInt(data.max_booking_window),
  cancellation_hours: parseInt(data.cancellation_hours),
  require_deposit: data.require_deposit,
  deposit_percentage: data.deposit_percentage ? parseInt(data.deposit_percentage) : null,
}))

// ============================================================================
// NOTIFICATION SETTINGS SCHEMA
// ============================================================================

/**
 * Schema สำหรับการตั้งค่าการแจ้งเตือน
 */
export const NotificationSettingsSchema = z.object({
  email_notifications: z.boolean(),

  sms_notifications: z.boolean(),

  notify_new_booking: z.boolean(),

  notify_cancellation: z.boolean(),

  notify_payment: z.boolean(),

  reminder_hours: ReminderHoursEnum,
})

/**
 * Transform schema สำหรับแปลง string เป็น number
 */
export const NotificationSettingsTransformSchema = NotificationSettingsSchema.transform((data) => ({
  email_notifications: data.email_notifications,
  sms_notifications: data.sms_notifications,
  notify_new_booking: data.notify_new_booking,
  notify_cancellation: data.notify_cancellation,
  notify_payment: data.notify_payment,
  reminder_hours: parseInt(data.reminder_hours),
}))

// ============================================================================
// COMPLETE SETTINGS SCHEMA
// ============================================================================

/**
 * Schema สำหรับ settings ทั้งหมด (optional - ใช้เมื่อต้องการอัพเดททีเดียว)
 */
export const CompleteSettingsSchema = z.object({
  general: GeneralSettingsSchema.partial().optional(),
  booking: BookingSettingsSchema.partial().optional(),
  notification: NotificationSettingsSchema.partial().optional(),
})

// ============================================================================
// VALIDATION HELPERS
// ============================================================================

/**
 * ตรวจสอบไฟล์ Logo
 * @param file - ไฟล์ที่ต้องการตรวจสอบ
 * @returns { valid: boolean, error?: string }
 */
export const validateLogoFile = (file: File): { valid: boolean; error?: string } => {
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
 * ตรวจสอบว่า deposit percentage สมเหตุสมผล
 * @param percentage - เปอร์เซ็นต์ที่ต้องการตรวจสอบ
 * @returns boolean
 */
export const validateDepositPercentage = (percentage: number): boolean => {
  const validPercentages = [10, 20, 30, 50, 100]
  if (!validPercentages.includes(percentage)) {
    throw new Error('Deposit percentage must be 10, 20, 30, 50, or 100')
  }
  return true
}

// ============================================================================
// TYPE EXPORTS
// ============================================================================

export type GeneralSettingsFormData = z.infer<typeof GeneralSettingsSchema>
export type GeneralSettingsData = z.infer<typeof GeneralSettingsTransformSchema>
export type BookingSettingsFormData = z.infer<typeof BookingSettingsSchema>
export type BookingSettingsData = z.infer<typeof BookingSettingsTransformSchema>
export type NotificationSettingsFormData = z.infer<typeof NotificationSettingsSchema>
export type NotificationSettingsData = z.infer<typeof NotificationSettingsTransformSchema>
export type CompleteSettingsFormData = z.infer<typeof CompleteSettingsSchema>
export type TimeSlotDuration = z.infer<typeof TimeSlotDurationEnum>
export type MinAdvanceBooking = z.infer<typeof MinAdvanceBookingEnum>
export type MaxBookingWindow = z.infer<typeof MaxBookingWindowEnum>
export type CancellationHours = z.infer<typeof CancellationHoursEnum>
export type DepositPercentage = z.infer<typeof DepositPercentageEnum>
export type ReminderHours = z.infer<typeof ReminderHoursEnum>
