import { z } from 'zod'

/**
 * Staff Availability Schemas
 *
 * Architecture:
 * - StaffAvailabilitySchema: สำหรับบันทึกช่วงเวลาที่พนักงานไม่ว่าง
 * - Time & Date validation: ตรวจสอบรูปแบบ และเปรียบเทียบเวลา
 *
 * Related Tables:
 * - staff_availability: Main availability table
 * - profiles: Staff information
 *
 * Business Rules:
 * - unavailable_date: วันที่ไม่ว่าง (YYYY-MM-DD)
 * - start_time, end_time: ช่วงเวลาที่ไม่ว่าง (HH:MM) - optional
 * - is_available: false = ไม่ว่าง, true = ว่าง (default: false)
 * - ถ้าไม่ระบุเวลา = ไม่ว่างทั้งวัน
 */

// ============================================================================
// REGEX PATTERNS
// ============================================================================

/**
 * Time format: HH:MM (24-hour)
 * Examples: 09:00, 14:30, 23:59
 */
const TIME_REGEX = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/

/**
 * Date format: YYYY-MM-DD
 * Examples: 2024-01-15, 2025-12-31
 */
const DATE_REGEX = /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12][0-9]|3[01])$/

// ============================================================================
// ENUMS
// ============================================================================

/**
 * Availability Reason Enum
 * ใช้สำหรับระบุเหตุผลที่ไม่ว่าง (ไม่บังคับ แต่แนะนำ)
 */
export const AvailabilityReasonEnum = z.enum([
  'sick_leave',    // ลาป่วย
  'holiday',       // วันหยุด/ลาพักร้อน
  'training',      // อบรม
  'personal',      // ธุระส่วนตัว
  'other',         // อื่นๆ
])

// ============================================================================
// CUSTOM VALIDATORS
// ============================================================================

/**
 * Date validator (YYYY-MM-DD)
 */
const dateSchema = z
  .string({ message: 'Date is required' })
  .regex(DATE_REGEX, 'Invalid date format (must be YYYY-MM-DD)')
  .refine(
    (date) => {
      // ตรวจสอบว่าวันที่ถูกต้องตามปฏิทิน
      const parsedDate = new Date(date)
      return !isNaN(parsedDate.getTime())
    },
    { message: 'Invalid date' }
  )

/**
 * Time validator (HH:MM)
 */
const timeSchema = z
  .string()
  .regex(TIME_REGEX, 'Invalid time format (must be HH:MM)')
  .nullable()
  .optional()
  .or(z.literal(''))

// ============================================================================
// STAFF AVAILABILITY SCHEMA
// ============================================================================

/**
 * Schema สำหรับสร้าง Staff Availability Record
 */
export const StaffAvailabilityCreateSchema = z.object({
  staff_id: z
    .string({ message: 'Staff is required' })
    .uuid('Invalid staff ID'),

  unavailable_date: dateSchema,

  start_time: timeSchema,

  end_time: timeSchema,

  is_available: z.boolean(),

  reason: AvailabilityReasonEnum.nullable().optional(),

  notes: z
    .string()
    .max(500, 'Notes must not exceed 500 characters')
    .nullable()
    .optional()
    .or(z.literal('')),
}).refine(
  (data) => {
    // ถ้ามีทั้ง start_time และ end_time ต้องเช็คว่า end_time > start_time
    if (data.start_time && data.end_time && data.start_time !== '' && data.end_time !== '') {
      return data.end_time > data.start_time
    }
    return true
  },
  {
    message: 'End time must be after start time',
    path: ['end_time']
  }
).refine(
  (data) => {
    // ถ้าระบุ start_time ต้องระบุ end_time ด้วย
    if (data.start_time && data.start_time !== '' && (!data.end_time || data.end_time === '')) {
      return false
    }
    return true
  },
  {
    message: 'End time is required when start time is specified',
    path: ['end_time']
  }
).refine(
  (data) => {
    // ถ้าระบุ end_time ต้องระบุ start_time ด้วย
    if (data.end_time && data.end_time !== '' && (!data.start_time || data.start_time === '')) {
      return false
    }
    return true
  },
  {
    message: 'Start time is required when end time is specified',
    path: ['start_time']
  }
)

/**
 * Transform schema สำหรับแปลง empty string เป็น null
 */
export const StaffAvailabilityCreateTransformSchema = StaffAvailabilityCreateSchema.transform((data) => ({
  staff_id: data.staff_id,
  unavailable_date: data.unavailable_date,
  start_time: data.start_time === '' ? null : data.start_time || null,
  end_time: data.end_time === '' ? null : data.end_time || null,
  is_available: data.is_available,
  reason: data.reason || null,
  notes: data.notes === '' ? null : data.notes || null,
}))

/**
 * Schema สำหรับแก้ไข Staff Availability (ไม่สามารถเปลี่ยน staff_id)
 */
export const StaffAvailabilityUpdateSchema = StaffAvailabilityCreateSchema
  .omit({ staff_id: true })
  .partial()

export const StaffAvailabilityUpdateTransformSchema = StaffAvailabilityUpdateSchema.transform((data) => ({
  ...data,
  start_time: data.start_time === '' ? null : data.start_time,
  end_time: data.end_time === '' ? null : data.end_time,
  notes: data.notes === '' ? null : data.notes,
}))

// ============================================================================
// BULK OPERATIONS SCHEMA
// ============================================================================

/**
 * Schema สำหรับบันทึกช่วงเวลาไม่ว่างหลายวันพร้อมกัน
 */
export const BulkStaffAvailabilitySchema = z.object({
  staff_id: z
    .string({ message: 'Staff is required' })
    .uuid('Invalid staff ID'),

  unavailable_dates: z
    .array(dateSchema)
    .min(1, 'Please select at least 1 date'),

  start_time: timeSchema,

  end_time: timeSchema,

  is_available: z.boolean(),

  reason: AvailabilityReasonEnum.nullable().optional(),

  notes: z
    .string()
    .max(500, 'Notes must not exceed 500 characters')
    .nullable()
    .optional()
    .or(z.literal('')),
}).refine(
  (data) => {
    if (data.start_time && data.end_time && data.start_time !== '' && data.end_time !== '') {
      return data.end_time > data.start_time
    }
    return true
  },
  {
    message: 'End time must be after start time',
    path: ['end_time']
  }
)

// ============================================================================
// VALIDATION HELPERS
// ============================================================================

/**
 * ตรวจสอบว่าวันที่ไม่อยู่ในอดีต
 * @param date - วันที่ที่ต้องการตรวจสอบ (YYYY-MM-DD)
 * @returns boolean
 */
export const validateNotPastDate = (date: string): boolean => {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const checkDate = new Date(date)
  checkDate.setHours(0, 0, 0, 0)

  if (checkDate < today) {
    throw new Error('ไม่สามารถบันทึกวันที่ในอดีตได้')
  }
  return true
}

/**
 * ตรวจสอบว่าช่วงเวลาไม่ทับซ้อนกับ availability ที่มีอยู่
 * @param existingSlots - Array of existing availability slots
 * @param newSlot - New slot to add
 * @returns boolean
 */
export const validateNoTimeOverlap = (
  existingSlots: Array<{ start_time: string | null; end_time: string | null }>,
  newSlot: { start_time: string | null; end_time: string | null }
): boolean => {
  // ถ้าไม่ระบุเวลา = ไม่ว่างทั้งวัน
  if (!newSlot.start_time || !newSlot.end_time) {
    if (existingSlots.length > 0) {
      throw new Error('มีช่วงเวลาไม่ว่างอยู่แล้วในวันนี้')
    }
    return true
  }

  for (const slot of existingSlots) {
    // ถ้า slot ที่มีอยู่ไม่ระบุเวลา = ทั้งวัน
    if (!slot.start_time || !slot.end_time) {
      throw new Error('วันนี้ถูกบันทึกว่าไม่ว่างทั้งวันแล้ว')
    }

    // เช็ค overlap
    const overlap =
      (newSlot.start_time >= slot.start_time && newSlot.start_time < slot.end_time) ||
      (newSlot.end_time > slot.start_time && newSlot.end_time <= slot.end_time) ||
      (newSlot.start_time <= slot.start_time && newSlot.end_time >= slot.end_time)

    if (overlap) {
      throw new Error(
        `ช่วงเวลาทับซ้อนกับช่วงที่มีอยู่ (${slot.start_time} - ${slot.end_time})`
      )
    }
  }

  return true
}

/**
 * แปลง Time string เป็น minutes นับจากเที่ยงคืน
 * ใช้สำหรับเปรียบเทียบเวลา
 */
export const timeToMinutes = (time: string): number => {
  const [hours, minutes] = time.split(':').map(Number)
  return hours * 60 + minutes
}

// ============================================================================
// TYPE EXPORTS
// ============================================================================

export type StaffAvailabilityCreateFormData = z.infer<typeof StaffAvailabilityCreateSchema>
export type StaffAvailabilityCreateData = z.infer<typeof StaffAvailabilityCreateTransformSchema>
export type StaffAvailabilityUpdateFormData = z.infer<typeof StaffAvailabilityUpdateSchema>
export type StaffAvailabilityUpdateData = z.infer<typeof StaffAvailabilityUpdateTransformSchema>
export type BulkStaffAvailabilityFormData = z.infer<typeof BulkStaffAvailabilitySchema>
export type AvailabilityReason = z.infer<typeof AvailabilityReasonEnum>
