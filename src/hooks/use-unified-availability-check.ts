/**
 * Unified Hook สำหรับเช็ค Staff/Team Availability
 * รองรับทั้ง single-date และ multi-date
 *
 * Backward compatible กับ useStaffAvailabilityCheck เดิม
 */

import { useStaffAvailabilityCheck, type StaffAvailabilityResult, type TeamAvailabilityResult } from './use-staff-availability-check'
import { useMultiDateAvailabilityCheck } from './use-multi-date-availability-check'
import type { MultiDateStaffResult, MultiDateTeamResult } from '@/types/staff-availability'

interface UnifiedAvailabilityParams {
  // Single date (old API)
  date?: string

  // Multi date (new API)
  dates?: string[]

  startTime: string
  endTime: string
  servicePackageId: string
  assignmentType: 'individual' | 'team'
  excludeBookingId?: string
}

interface SingleDateResult {
  mode: 'single'
  loading: boolean
  staffResults: StaffAvailabilityResult[]
  teamResults: TeamAvailabilityResult[]
  serviceType: string
  error?: string | null
}

interface MultiDateResult {
  mode: 'multi'
  loading: boolean
  staffResults: MultiDateStaffResult[]
  teamResults: MultiDateTeamResult[]
  serviceType: string
  error?: string | null
}

type UnifiedResult = SingleDateResult | MultiDateResult

/**
 * Hook ที่รวม single-date และ multi-date เข้าด้วยกัน
 * จะตรวจสอบว่าใช้ mode ไหนจาก params ที่ส่งเข้ามา
 */
export function useUnifiedAvailabilityCheck(params: UnifiedAvailabilityParams): UnifiedResult {
  const isMultiDate = params.dates && params.dates.length > 1

  // Multi-date mode
  const multiDateResult = useMultiDateAvailabilityCheck({
    dates: params.dates || [],
    startTime: params.startTime,
    endTime: params.endTime,
    servicePackageId: params.servicePackageId,
    assignmentType: params.assignmentType,
    excludeBookingId: params.excludeBookingId
  })

  // Single-date mode
  const singleDateResult = useStaffAvailabilityCheck({
    date: params.date || (params.dates?.[0] || ''),
    startTime: params.startTime,
    endTime: params.endTime,
    servicePackageId: params.servicePackageId,
    assignmentType: params.assignmentType,
    excludeBookingId: params.excludeBookingId
  })

  // Return appropriate result based on mode
  if (isMultiDate) {
    return {
      mode: 'multi',
      loading: multiDateResult.loading,
      staffResults: multiDateResult.staffResults,
      teamResults: multiDateResult.teamResults,
      serviceType: multiDateResult.serviceType,
      error: multiDateResult.error
    }
  }

  // Default to single-date (backward compatible)
  return {
    mode: 'single',
    loading: singleDateResult.loading,
    staffResults: singleDateResult.staffResults,
    teamResults: singleDateResult.teamResults,
    serviceType: singleDateResult.serviceType,
    error: null
  }
}
