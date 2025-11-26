/**
 * Recurring Bookings Utility Functions
 *
 * ฟังก์ชันช่วยสำหรับการคำนวณและจัดการ recurring bookings
 */

import type {
  RecurringPattern,
  AutoScheduleOptions,
  RecurringBookingRecord
} from '@/types/recurring-booking'
import type { BookingFrequency } from '@/types/service-package-v2'

/**
 * แปลง RecurringPattern เป็น label ภาษาไทย
 */
export function getRecurringPatternLabel(pattern: RecurringPattern | null): string {
  if (!pattern) return 'ไม่ระบุ'

  const labels: Record<RecurringPattern, string> = {
    'auto-monthly': 'เดือนละ 1 ครั้ง',
    'custom': 'กำหนดเอง'
  }

  return labels[pattern] || 'ไม่ระบุ'
}

/**
 * คำนวณวันที่ทั้งหมดแบบอัตโนมัติ (auto-monthly)
 *
 * @param options - ตัวเลือกการสร้างตาราง
 * @returns Array ของวันที่ (ISO format)
 *
 * @example
 * ```ts
 * const dates = generateAutoScheduleDates({
 *   startDate: '2025-01-15',
 *   frequency: 8,
 *   pattern: 'auto-monthly'
 * })
 * // ['2025-01-15', '2025-02-15', '2025-03-15', ..., '2025-08-15']
 * // สร้าง 8 เดือน เดือนละ 1 ครั้ง
 * ```
 */
export function generateAutoScheduleDates(
  options: AutoScheduleOptions
): string[] {
  const { startDate, frequency, pattern } = options
  const dates: string[] = []
  const start = new Date(startDate)

  if (pattern === 'auto-monthly') {
    // เดือนละ 1 ครั้ง - เว้นทุก 1 เดือน
    for (let i = 0; i < frequency; i++) {
      const date = new Date(start)
      date.setMonth(start.getMonth() + i)
      dates.push(formatDateISO(date))
    }
  } else if (pattern === 'custom') {
    // Custom pattern ไม่ใช้ auto-generate
    throw new Error('Custom pattern does not support auto-generation')
  } else {
    throw new Error(`Unsupported pattern: ${pattern}`)
  }

  return dates
}

/**
 * ตรวจสอบว่า frequency สามารถใช้ pattern นี้ได้หรือไม่
 *
 * @example
 * ```ts
 * isPatternCompatibleWithFrequency('auto-monthly', 8) // true
 * isPatternCompatibleWithFrequency('auto-monthly', 1) // true
 * ```
 */
export function isPatternCompatibleWithFrequency(
  pattern: RecurringPattern,
  frequency: BookingFrequency
): boolean {
  const compatibilityMap: Record<RecurringPattern, BookingFrequency[]> = {
    'auto-monthly': [1, 2, 4, 8],
    'custom': [1, 2, 4, 8]
  }

  return compatibilityMap[pattern]?.includes(frequency) ?? false
}

/**
 * สร้าง recurring group ID ใหม่
 */
export function generateRecurringGroupId(): string {
  // ใช้ crypto.randomUUID() ถ้ามี, fallback เป็น timestamp-based UUID
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID()
  }

  // Fallback: generate simple UUID v4
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0
    const v = c === 'x' ? r : (r & 0x3 | 0x8)
    return v.toString(16)
  })
}

/**
 * ตรวจสอบว่าวันที่ทั้งหมดถูกต้องหรือไม่
 *
 * @returns Object { valid: boolean, errors: string[] }
 */
export function validateRecurringDates(
  dates: string[],
  frequency: BookingFrequency
): { valid: boolean; errors: string[] } {
  const errors: string[] = []

  // ต้องมีจำนวนวันตรงกับ frequency
  if (dates.length !== frequency) {
    errors.push(`Expected ${frequency} dates, got ${dates.length}`)
  }

  // ต้องเรียงตามลำดับเวลา
  const sortedDates = [...dates].sort()
  if (JSON.stringify(dates) !== JSON.stringify(sortedDates)) {
    errors.push('Dates must be in chronological order')
  }

  // ไม่มีวันที่ซ้ำกัน
  const uniqueDates = new Set(dates)
  if (uniqueDates.size !== dates.length) {
    errors.push('Duplicate dates found')
  }

  // ทุกวันต้องเป็น valid ISO date
  for (const date of dates) {
    if (isNaN(new Date(date).getTime())) {
      errors.push(`Invalid date: ${date}`)
    }
  }

  // ไม่มีวันที่ในอดีต
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  for (const date of dates) {
    const d = new Date(date)
    if (d < today) {
      errors.push(`Date in the past: ${date}`)
    }
  }

  return {
    valid: errors.length === 0,
    errors
  }
}

/**
 * Format date เป็น ISO string (YYYY-MM-DD)
 */
function formatDateISO(date: Date): string {
  return date.toISOString().split('T')[0]
}

/**
 * คำนวณ recurring sequence จาก index
 */
export function getRecurringSequence(index: number): number {
  return index + 1 // 1-based
}

/**
 * แยก bookings ตาม recurring group
 */
export function groupBookingsByRecurringGroup(
  bookings: RecurringBookingRecord[]
): Map<string, RecurringBookingRecord[]> {
  const groups = new Map<string, RecurringBookingRecord[]>()

  for (const booking of bookings) {
    if (booking.recurring_group_id) {
      const group = groups.get(booking.recurring_group_id) || []
      group.push(booking)
      groups.set(booking.recurring_group_id, group)
    }
  }

  return groups
}

/**
 * เรียงลำดับ bookings ใน group ตาม sequence
 */
export function sortRecurringGroup(
  bookings: RecurringBookingRecord[]
): RecurringBookingRecord[] {
  return [...bookings].sort((a, b) =>
    (a.recurring_sequence || 0) - (b.recurring_sequence || 0)
  )
}

/**
 * ตรวจสอบว่า booking เป็น recurring หรือไม่
 */
export function isRecurringBooking(booking: unknown): booking is RecurringBookingRecord {
  return (
    typeof booking === 'object' &&
    booking !== null &&
    'is_recurring' in booking &&
    booking.is_recurring === true &&
    'recurring_group_id' in booking &&
    !!booking.recurring_group_id
  )
}

/**
 * หา booking แรก (parent) ในกลุ่ม
 */
export function findParentBooking(
  bookings: RecurringBookingRecord[]
): RecurringBookingRecord | null {
  return bookings.find(b => b.recurring_sequence === 1) || null
}

/**
 * นับจำนวน bookings แต่ละสถานะในกลุ่ม
 */
export function countBookingsByStatus(bookings: RecurringBookingRecord[]): {
  completed: number
  confirmed: number
  cancelled: number
  noShow: number
  upcoming: number
  total: number
} {
  return {
    completed: bookings.filter(b => b.status === 'completed').length,
    confirmed: bookings.filter(b => b.status === 'confirmed').length,
    cancelled: bookings.filter(b => b.status === 'cancelled').length,
    noShow: bookings.filter(b => b.status === 'no_show').length,
    upcoming: bookings.filter(b =>
      b.status !== 'completed' &&
      b.status !== 'cancelled' &&
      b.status !== 'confirmed' &&
      b.status !== 'no_show'
    ).length,
    total: bookings.length
  }
}
