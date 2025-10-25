/**
 * Type Guard Utilities
 *
 * Runtime type validation functions for ensuring type safety beyond compile time.
 * These guards help catch type errors at runtime, especially when working with
 * external data sources like APIs, Supabase queries, or user input.
 *
 * @module lib/type-guards
 */

import type {
  Customer,
  Booking,
  TeamRecord,
  StaffRecord,
  ServicePackage,
} from '@/types'

// ============================================================================
// CUSTOMER TYPE GUARDS
// ============================================================================

/**
 * Type guard สำหรับตรวจสอบ Customer object
 *
 * ตรวจสอบว่า object มี properties พื้นฐานของ Customer ครบถ้วน
 * ใช้เมื่อรับ data จาก API หรือ Supabase query
 *
 * @param obj - Object ที่ต้องการตรวจสอบ
 * @returns true ถ้า obj เป็น Customer type
 *
 * @example
 * const data = await fetchCustomer()
 * if (isCustomer(data)) {
 *   // TypeScript รู้ว่า data เป็น Customer แน่นอน
 *   console.log(data.full_name)
 * }
 */
export function isCustomer(obj: unknown): obj is Customer {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'id' in obj &&
    'full_name' in obj &&
    'email' in obj &&
    typeof (obj as Customer).id === 'string' &&
    typeof (obj as Customer).full_name === 'string' &&
    typeof (obj as Customer).email === 'string'
  )
}

// ============================================================================
// BOOKING TYPE GUARDS
// ============================================================================

/**
 * Type guard สำหรับ Booking object
 *
 * ตรวจสอบ properties พื้นฐานของ Booking
 *
 * @param obj - Object ที่ต้องการตรวจสอบ
 * @returns true ถ้า obj เป็น Booking type
 *
 * @example
 * const booking = await supabase.from('bookings').select('*').single()
 * if (isBooking(booking.data)) {
 *   // Safe to use booking data
 *   console.log(booking.data.booking_date)
 * }
 */
export function isBooking(obj: unknown): obj is Booking {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'id' in obj &&
    'booking_date' in obj &&
    'status' in obj &&
    'start_time' in obj &&
    'end_time' in obj &&
    typeof (obj as any).id === 'string' &&
    typeof (obj as any).booking_date === 'string' &&
    typeof (obj as any).status === 'string'
  )
}

// ============================================================================
// TEAM TYPE GUARDS
// ============================================================================

/**
 * Type guard สำหรับ Team object
 *
 * ตรวจสอบ properties พื้นฐานของ TeamRecord
 *
 * @param obj - Object ที่ต้องการตรวจสอบ
 * @returns true ถ้า obj เป็น TeamRecord type
 *
 * @example
 * const teams = await fetchTeams()
 * const validTeams = teams.filter(isTeam)
 */
export function isTeam(obj: unknown): obj is TeamRecord {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'id' in obj &&
    'name' in obj &&
    'is_active' in obj &&
    typeof (obj as TeamRecord).id === 'string' &&
    typeof (obj as TeamRecord).name === 'string' &&
    typeof (obj as TeamRecord).is_active === 'boolean'
  )
}

// ============================================================================
// STAFF TYPE GUARDS
// ============================================================================

/**
 * Type guard สำหรับ Staff object
 *
 * ตรวจสอบ properties พื้นฐานของ StaffRecord
 *
 * @param obj - Object ที่ต้องการตรวจสอบ
 * @returns true ถ้า obj เป็น StaffRecord type
 *
 * @example
 * const staff = await getStaffById(id)
 * if (isStaff(staff)) {
 *   console.log(staff.full_name, staff.is_active)
 * }
 */
export function isStaff(obj: unknown): obj is StaffRecord {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'id' in obj &&
    'full_name' in obj &&
    'email' in obj &&
    'role' in obj &&
    'is_active' in obj &&
    typeof (obj as StaffRecord).id === 'string' &&
    typeof (obj as StaffRecord).full_name === 'string' &&
    typeof (obj as StaffRecord).is_active === 'boolean'
  )
}

// ============================================================================
// SERVICE PACKAGE TYPE GUARDS
// ============================================================================

/**
 * Type guard สำหรับ ServicePackage object
 *
 * @param obj - Object ที่ต้องการตรวจสอบ
 * @returns true ถ้า obj เป็น ServicePackage type
 */
export function isServicePackage(obj: unknown): obj is ServicePackage {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'id' in obj &&
    'name' in obj &&
    'price' in obj &&
    typeof (obj as ServicePackage).id === 'string' &&
    typeof (obj as ServicePackage).name === 'string' &&
    typeof (obj as ServicePackage).price === 'number'
  )
}

// ============================================================================
// ARRAY TYPE GUARDS
// ============================================================================

/**
 * Type guard สำหรับ array ของ type ที่กำหนด
 *
 * ตรวจสอบว่า array ทุกตัวเป็น type ที่ต้องการ
 * Generic function ที่ใช้กับ type guard อื่นๆ ได้
 *
 * @template T - Type ที่ต้องการตรวจสอบ
 * @param arr - Array ที่ต้องการตรวจสอบ
 * @param guard - Type guard function สำหรับ type T
 * @returns true ถ้า arr เป็น array ของ T
 *
 * @example
 * const data = await fetchCustomers()
 * if (isArrayOf(data, isCustomer)) {
 *   // TypeScript รู้ว่า data เป็น Customer[] แน่นอน
 *   data.forEach(customer => console.log(customer.full_name))
 * }
 */
export function isArrayOf<T>(
  arr: unknown,
  guard: (item: unknown) => item is T
): arr is T[] {
  return Array.isArray(arr) && arr.every(guard)
}

/**
 * Type guard สำหรับ non-empty array
 *
 * ตรวจสอบว่า array ไม่เป็น empty และทุก element เป็น type ที่ต้องการ
 *
 * @template T - Type ที่ต้องการตรวจสอบ
 * @param arr - Array ที่ต้องการตรวจสอบ
 * @param guard - Type guard function สำหรับ type T
 * @returns true ถ้า arr เป็น non-empty array ของ T
 *
 * @example
 * const items = await fetchItems()
 * if (isNonEmptyArrayOf(items, isBooking)) {
 *   const first = items[0] // TypeScript รู้ว่า items[0] มีแน่นอน
 * }
 */
export function isNonEmptyArrayOf<T>(
  arr: unknown,
  guard: (item: unknown) => item is T
): arr is [T, ...T[]] {
  return Array.isArray(arr) && arr.length > 0 && arr.every(guard)
}

// ============================================================================
// ASSERTION UTILITIES
// ============================================================================

/**
 * Assert type with runtime check
 *
 * Throws error ถ้า object ไม่ตรงกับ type ที่ต้องการ
 * ใช้เมื่อต้องการให้โปรแกรมหยุดทำงานถ้า type ไม่ถูกต้อง
 *
 * @template T - Type ที่ต้องการ assert
 * @param obj - Object ที่ต้องการตรวจสอบ
 * @param guard - Type guard function
 * @param errorMessage - ข้อความ error ที่จะแสดง (optional)
 * @throws {TypeError} ถ้า obj ไม่ตรงกับ type T
 *
 * @example
 * const customer = await fetchCustomer(id)
 * assertType(customer, isCustomer, `Invalid customer data for ID: ${id}`)
 * // ถ้าผ่าน TypeScript รู้ว่า customer เป็น Customer แน่นอน
 * console.log(customer.full_name)
 */
export function assertType<T>(
  obj: unknown,
  guard: (obj: unknown) => obj is T,
  errorMessage: string = 'Type assertion failed'
): asserts obj is T {
  if (!guard(obj)) {
    throw new TypeError(errorMessage)
  }
}

/**
 * Assert array type with runtime check
 *
 * Similar to assertType แต่สำหรับ array โดยเฉพาะ
 *
 * @template T - Type ของ elements ใน array
 * @param arr - Array ที่ต้องการตรวจสอบ
 * @param guard - Type guard function สำหรับ elements
 * @param errorMessage - ข้อความ error (optional)
 * @throws {TypeError} ถ้า arr ไม่ใช่ array ของ T
 *
 * @example
 * const bookings = await fetchBookings()
 * assertArrayType(bookings, isBooking, 'Invalid bookings data')
 * // ถ้าผ่าน TypeScript รู้ว่า bookings เป็น Booking[] แน่นอน
 */
export function assertArrayType<T>(
  arr: unknown,
  guard: (item: unknown) => item is T,
  errorMessage: string = 'Array type assertion failed'
): asserts arr is T[] {
  if (!isArrayOf(arr, guard)) {
    throw new TypeError(errorMessage)
  }
}

// ============================================================================
// NULLABLE TYPE GUARDS
// ============================================================================

/**
 * Check if value is not null or undefined
 *
 * Type guard สำหรับกรอง null/undefined ออกจาก type
 *
 * @template T - Type ของ value
 * @param value - Value ที่ต้องการตรวจสอบ
 * @returns true ถ้า value ไม่เป็น null หรือ undefined
 *
 * @example
 * const values = [1, null, 2, undefined, 3]
 * const numbers = values.filter(isNonNullable) // type: number[]
 */
export function isNonNullable<T>(value: T): value is NonNullable<T> {
  return value !== null && value !== undefined
}

/**
 * Check if value is defined (not undefined)
 *
 * @template T - Type ของ value
 * @param value - Value ที่ต้องการตรวจสอบ
 * @returns true ถ้า value ไม่เป็น undefined
 *
 * @example
 * const value: string | undefined = maybeGetValue()
 * if (isDefined(value)) {
 *   // TypeScript รู้ว่า value เป็น string แน่นอน
 *   console.log(value.toUpperCase())
 * }
 */
export function isDefined<T>(value: T | undefined): value is T {
  return value !== undefined
}

// ============================================================================
// UTILITY TYPE GUARDS
// ============================================================================

/**
 * Check if value is a string
 *
 * @param value - Value ที่ต้องการตรวจสอบ
 * @returns true ถ้า value เป็น string
 */
export function isString(value: unknown): value is string {
  return typeof value === 'string'
}

/**
 * Check if value is a number (excluding NaN)
 *
 * @param value - Value ที่ต้องการตรวจสอบ
 * @returns true ถ้า value เป็น number และไม่ใช่ NaN
 */
export function isNumber(value: unknown): value is number {
  return typeof value === 'number' && !isNaN(value)
}

/**
 * Check if value is a boolean
 *
 * @param value - Value ที่ต้องการตรวจสอบ
 * @returns true ถ้า value เป็น boolean
 */
export function isBoolean(value: unknown): value is boolean {
  return typeof value === 'boolean'
}

/**
 * Check if value is an object (excluding null and arrays)
 *
 * @param value - Value ที่ต้องการตรวจสอบ
 * @returns true ถ้า value เป็น object (ไม่ใช่ null และ array)
 */
export function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

// ============================================================================
// SUPABASE QUERY RESULT GUARDS
// ============================================================================

/**
 * Safe wrapper สำหรับ Supabase query ที่อาจคืนค่า null
 *
 * แปลง null เป็น empty array สำหรับ Supabase queries
 * ป้องกัน null pointer errors
 *
 * @template T - Type ของ elements ใน array
 * @param data - ผลลัพธ์จาก Supabase query (อาจเป็น null)
 * @returns Array ของ T (empty array ถ้า data เป็น null)
 *
 * @example
 * const { data } = await supabase.from('bookings').select('*')
 * const bookings = ensureArray(data) // แน่ใจว่าได้ array เสมอ
 */
export function ensureArray<T>(data: T[] | null | undefined): T[] {
  return data || []
}

/**
 * Safe single result from Supabase query
 *
 * @template T - Type ของ result
 * @param data - ผลลัพธ์จาก Supabase single query
 * @param defaultValue - ค่า default ถ้า data เป็น null
 * @returns T หรือ defaultValue
 *
 * @example
 * const { data } = await supabase.from('customers').select('*').eq('id', id).single()
 * const customer = ensureSingle(data, null)
 */
export function ensureSingle<T>(
  data: T | null | undefined,
  defaultValue: T | null = null
): T | null {
  return data ?? defaultValue
}
