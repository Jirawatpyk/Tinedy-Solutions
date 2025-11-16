/**
 * Types for Multi-Date Staff Availability Check
 *
 * รองรับการเช็ค availability ของ staff/team หลายวันพร้อมกัน
 * สำหรับ recurring bookings
 */

/**
 * Conflict information for a specific date
 */
export interface DateConflict {
  /** Booking ID ที่ conflict */
  bookingId: string

  /** วันที่ conflict (ISO format YYYY-MM-DD) */
  date: string

  /** เวลาเริ่มต้น */
  startTime: string

  /** เวลาสิ้นสุด */
  endTime: string

  /** ชื่อ service */
  serviceName: string

  /** ชื่อ customer */
  customerName: string
}

/**
 * Availability status สำหรับวันเดียว
 */
export interface DateAvailabilityStatus {
  /** ว่างหรือไม่ในวันนี้ */
  isAvailable: boolean

  /** รายการ conflicts ในวันนี้ */
  conflicts: DateConflict[]

  /** เหตุผลที่ไม่ว่าง (เช่น off day, leave) */
  unavailabilityReasons: string[]
}

/**
 * Staff availability result สำหรับหลายวัน
 */
export interface MultiDateStaffResult {
  // Basic Info
  staffId: string
  staffNumber: string
  fullName: string
  skills: string[] | null
  rating: number

  // Overall Multi-Date Status
  /** ว่างทุกวันหรือไม่ */
  isAvailableAllDates: boolean

  /** จำนวนวันที่ว่าง */
  availableDatesCount: number

  /** จำนวนวันทั้งหมดที่เช็ค */
  totalDatesCount: number

  /** คะแนนรวม (ใช้สำหรับ sorting) */
  overallScore: number

  /** Skill match percentage */
  skillMatch: number

  /** จำนวน jobs ในวันนั้น */
  jobsToday: number

  // Per-Date Breakdown
  /** สถานะแยกตามวัน */
  dateAvailability: Record<string, DateAvailabilityStatus>

  // Aggregated Data
  /** รายการ conflicts ทั้งหมด */
  allConflicts: DateConflict[]

  /** วันที่มี conflict */
  conflictingDates: string[]

  /** วันที่ว่าง */
  availableDates: string[]

  /** เหตุผลทั้งหมดที่ไม่ว่าง */
  unavailabilityReasons: string[]
}

/**
 * Team member availability info
 */
export interface TeamMemberDateAvailability {
  staffId: string
  fullName: string
  isAvailable: boolean
  conflicts: DateConflict[]
}

/**
 * Team availability result สำหรับหลายวัน
 */
export interface MultiDateTeamResult {
  // Basic Info
  teamId: string
  teamName: string
  totalMembers: number

  // Overall Multi-Date Status
  /** ทีมว่างครบทุกวันหรือไม่ */
  isAvailableAllDates: boolean

  /** จำนวนวันที่ทีมว่าง */
  availableDatesCount: number

  /** จำนวนวันทั้งหมด */
  totalDatesCount: number

  /** คะแนนรวม */
  overallScore: number

  /** Team skill match */
  teamMatch: number

  // Per-Date Breakdown
  /** สถานะแยกตามวัน */
  dateAvailability: Record<string, {
    /** จำนวน members ที่ว่างในวันนี้ */
    availableMembersCount: number

    /** รายชื่อ members ที่ว่าง */
    availableMembers: Array<{ id: string; name: string }>

    /** รายชื่อ members ที่ไม่ว่าง */
    unavailableMembers: Array<{ id: string; name: string; reason: string }>

    /** ทีมว่างครบหรือไม่ในวันนี้ */
    isFullyAvailable: boolean
  }>

  // Aggregated Data
  /** วันที่มี conflict */
  conflictingDates: string[]

  /** วันที่ว่าง */
  availableDates: string[]

  /** รายละเอียด members ทั้งหมด */
  members: TeamMemberDateAvailability[]
}

/**
 * Categorized staff results
 */
export interface CategorizedStaffResults {
  /** Staff ที่ว่างทุกวัน */
  fullyAvailable: MultiDateStaffResult[]

  /** Staff ที่ว่างบางวัน */
  partiallyAvailable: MultiDateStaffResult[]

  /** Staff ที่ไม่ว่างเลย หรือว่างน้อยมาก */
  unavailable: MultiDateStaffResult[]
}

/**
 * Categorized team results
 */
export interface CategorizedTeamResults {
  /** Team ที่ว่างทุกวัน */
  fullyAvailable: MultiDateTeamResult[]

  /** Team ที่ว่างบางวัน */
  partiallyAvailable: MultiDateTeamResult[]

  /** Team ที่ไม่ว่างเลย */
  unavailable: MultiDateTeamResult[]
}
