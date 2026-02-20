/**
 * Recurring Bookings Type Definitions
 *
 * Types สำหรับการจัดการ booking ที่เกิดซ้ำหลายครั้ง
 */

import type { BookingFrequency } from './service-package-v2'
import type { Booking } from './booking'

/**
 * รูปแบบการสร้างตาราง recurring
 */
export const RecurringPattern = {
  AutoMonthly: 'auto-monthly',     // เดือนละ 1 ครั้ง (ใช้สำหรับทุก frequency)
  Custom: 'custom'                 // กำหนดเองทุกวัน
} as const

export type RecurringPattern = typeof RecurringPattern[keyof typeof RecurringPattern]

/**
 * Base fields required for recurring booking functionality
 * Used for type-safe filtering with isRecurringBooking type guard
 */
export interface RecurringBookingBase {
  id: string
  booking_date: string
  start_time: string
  end_time?: string | null
  status: string
  total_price: number
  payment_status?: string
  payment_slip_url?: string | null
  // Recurring fields (required when is_recurring is true)
  recurring_group_id: string
  recurring_sequence: number
  recurring_total: number
  recurring_pattern: RecurringPattern | null
  is_recurring: true
  parent_booking_id: string | null
  // Timestamps
  created_at?: string
  updated_at?: string
  deleted_at?: string | null
  // Optional relations
  customers?: {
    full_name: string
    email: string
  }
  service_packages?: {
    name: string
    service_type: string
  }
  service_packages_v2?: {
    name: string
    service_type: string
  }
  profiles?: {
    full_name: string
  }
  teams?: {
    name: string
  }
}

/**
 * ข้อมูล Recurring Booking เดี่ยว (extends จาก database record)
 * Extends RecurringBookingBase with additional database fields
 */
export interface RecurringBookingRecord extends RecurringBookingBase {
  customer_id: string
  payment_status?: string
  area_sqm?: number | null
  frequency?: number | null
  service_packages_v2?: {
    name: string
    service_type: string
  }
}

/**
 * ข้อมูลสำหรับสร้าง Recurring Group ใหม่
 */
export interface RecurringGroupInput {
  /** ข้อมูล booking พื้นฐาน (ไม่รวม dates และ id) */
  baseBooking: {
    customer_id: string
    end_date?: string | null
    start_time: string
    end_time: string | null
    status: string
    payment_status?: string
    total_price: number
    address?: string
    city?: string
    state?: string | null
    zip_code?: string | null
    area_sqm?: number | null
    frequency?: number | null
    calculated_price?: number | null
    package_v2_id?: string | null
    // V2 pricing fields (S-01)
    price_mode?: string | null
    custom_price?: number | null
    price_override?: boolean
    job_name?: string | null
    staff_id?: string | null
    team_id?: string | null
    notes?: string | null
    team_member_count?: number | null
    payment_method?: string | null
  }

  /** รูปแบบการเกิดซ้ำ */
  pattern: RecurringPattern

  /** จำนวนครั้งทั้งหมด (ต้องตรงกับ frequency) */
  totalOccurrences: number

  /** Array ของวันที่ทั้งหมด */
  dates: string[] // ISO date strings (YYYY-MM-DD)
}

/**
 * ตัวเลือกสำหรับ Auto-generate dates
 */
export interface AutoScheduleOptions {
  /** วันที่เริ่มต้น */
  startDate: string // ISO date (YYYY-MM-DD)

  /** ความถี่ (1, 2, 4, 8) */
  frequency: BookingFrequency

  /** รูปแบบ (ถ้าเป็น auto) */
  pattern: RecurringPattern

  /** วันในสัปดาห์ที่ต้องการ (0=อาทิตย์, 1=จันทร์, ...) - สำหรับ weekly/biweekly */
  preferredDayOfWeek?: number
}

/**
 * Recurring Group พร้อม bookings ทั้งหมด
 * Uses RecurringBookingBase for broader type compatibility
 */
export interface RecurringGroup {
  groupId: string
  pattern: RecurringPattern
  totalBookings: number
  bookings: RecurringBookingBase[]

  // สถิติ
  completedCount: number
  confirmedCount: number
  inProgressCount: number
  cancelledCount: number
  noShowCount: number
  upcomingCount: number
}

/**
 * ตัวเลือกสำหรับการแก้ไข Recurring Booking
 */
export const RecurringEditScope = {
  ThisOnly: 'this_only',           // แก้ไขเฉพาะครั้งนี้
  ThisAndFuture: 'this_and_future', // แก้ไขครั้งนี้และครั้งถัดไป
  All: 'all'                       // แก้ไขทั้งหมดในกลุ่ม
} as const

export type RecurringEditScope = typeof RecurringEditScope[keyof typeof RecurringEditScope]

/**
 * Request สำหรับการแก้ไข Recurring Booking
 */
export interface RecurringEditRequest {
  bookingId: string
  scope: RecurringEditScope
  updates: Partial<RecurringBookingRecord> // Partial booking update
}

/**
 * Result จากการสร้าง Recurring Group
 */
export interface RecurringCreationResult {
  success: boolean
  groupId: string
  bookingIds: string[]
  errors?: string[]
}

/**
 * Combined Item Type
 *
 * ใช้สำหรับรวม recurring groups และ standalone bookings
 * เพื่อแสดงใน BookingList component
 *
 * - type: 'group' = Recurring booking group
 * - type: 'booking' = Standalone booking (ไม่ใช่ recurring)
 */
export type CombinedItem =
  | { type: 'group'; data: RecurringGroup; createdAt: string }
  | { type: 'booking'; data: Booking; createdAt: string }
