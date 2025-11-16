/**
 * Hook สำหรับเช็ค Staff/Team Availability หลายวันพร้อมกัน
 * ใช้สำหรับ Recurring Bookings
 */

import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import type {
  MultiDateStaffResult,
  MultiDateTeamResult,
  DateConflict,
  DateAvailabilityStatus
} from '@/types/staff-availability'

interface Review {
  rating: number
}

interface BookingConflictData {
  id: string
  booking_date: string
  start_time: string
  end_time: string
  staff_id: string | null
  team_id: string | null
  service_packages: { name: string }[] | { name: string } | null
  service_packages_v2?: { name: string }[] | { name: string } | null
  customers: { full_name: string }[] | { full_name: string } | null
}

interface TeamMemberData {
  staff_id: string
  profiles: {
    id: string
    full_name: string
    skills: string[] | null
  }[] | {
    id: string
    full_name: string
    skills: string[] | null
  }
}

interface TeamWithMemberProfiles {
  id: string
  name: string
  team_members: TeamMemberData[]
}

interface UseMultiDateAvailabilityParams {
  /** วันที่ทั้งหมดที่ต้องการเช็ค (ISO format) */
  dates: string[]

  /** เวลาเริ่มต้น */
  startTime: string

  /** เวลาสิ้นสุด */
  endTime: string

  /** Service Package ID */
  servicePackageId: string

  /** ประเภทการ assign */
  assignmentType: 'individual' | 'team'

  /** Booking ID ที่ต้องการ exclude (สำหรับ edit mode) */
  excludeBookingId?: string
}

export function useMultiDateAvailabilityCheck({
  dates,
  startTime,
  endTime,
  servicePackageId,
  assignmentType,
  excludeBookingId
}: UseMultiDateAvailabilityParams) {
  const [loading, setLoading] = useState(true)
  const [staffResults, setStaffResults] = useState<MultiDateStaffResult[]>([])
  const [teamResults, setTeamResults] = useState<MultiDateTeamResult[]>([])
  const [serviceType, setServiceType] = useState<string>('')
  const [error, setError] = useState<string | null>(null)

  /**
   * Helper: แปลง BookingConflictData เป็น DateConflict
   */
  const transformToDateConflict = useCallback((booking: BookingConflictData): DateConflict => {
    // Handle service name - ลอง v1 ก่อน, ถ้าไม่มีลอง v2
    let serviceName = 'Unknown Service'

    // Try V1 (service_packages)
    if (Array.isArray(booking.service_packages) && booking.service_packages.length > 0) {
      serviceName = booking.service_packages[0].name
    } else if (booking.service_packages && !Array.isArray(booking.service_packages)) {
      serviceName = (booking.service_packages as { name: string }).name
    }

    // Try V2 (service_packages_v2) if V1 failed
    if (serviceName === 'Unknown Service' && 'service_packages_v2' in booking) {
      const v2Packages = (booking as { service_packages_v2?: { name: string } | { name: string }[] | null }).service_packages_v2
      if (Array.isArray(v2Packages) && v2Packages.length > 0) {
        serviceName = v2Packages[0].name
      } else if (v2Packages && !Array.isArray(v2Packages)) {
        serviceName = v2Packages.name
      }
    }

    // Handle customers as array or object
    let customerName = 'Unknown Customer'
    if (Array.isArray(booking.customers) && booking.customers.length > 0) {
      customerName = booking.customers[0].full_name
    } else if (booking.customers && !Array.isArray(booking.customers)) {
      customerName = (booking.customers as { full_name: string }).full_name
    }

    return {
      bookingId: booking.id,
      date: booking.booking_date,
      startTime: booking.start_time,
      endTime: booking.end_time,
      serviceName,
      customerName
    }
  }, [])

  /**
   * Main check function
   */
  const checkMultiDateAvailability = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      console.log('🔍 Checking multi-date availability:', {
        dates,
        startTime,
        endTime,
        assignmentType
      })

      // 1. Get service type (Try V2 first, then V1)
      let serviceTypeValue: string | null = null

      const { data: serviceV2 } = await supabase
        .from('service_packages_v2')
        .select('service_type')
        .eq('id', servicePackageId)
        .single()

      if (serviceV2) {
        serviceTypeValue = serviceV2.service_type
      } else {
        const { data: serviceV1 } = await supabase
          .from('service_packages')
          .select('service_type')
          .eq('id', servicePackageId)
          .single()

        if (serviceV1) {
          serviceTypeValue = serviceV1.service_type
        }
      }

      setServiceType(serviceTypeValue || '')

      // 2. Query conflicts for ALL dates at once (ใช้ IN clause)
      // ถ้ามี excludeBookingId และเป็น recurring → exclude ทั้ง recurring group
      let excludeBookingIds: string[] = []

      if (excludeBookingId) {
        // Check if this booking is part of a recurring group
        const { data: excludedBooking } = await supabase
          .from('bookings')
          .select('id, recurring_group_id')
          .eq('id', excludeBookingId)
          .single()

        if (excludedBooking?.recurring_group_id) {
          // Get all bookings in the same recurring group
          const { data: recurringBookings } = await supabase
            .from('bookings')
            .select('id')
            .eq('recurring_group_id', excludedBooking.recurring_group_id)

          excludeBookingIds = recurringBookings?.map(b => b.id) || [excludeBookingId]
          console.log(`🔗 Excluding entire recurring group: ${excludeBookingIds.length} bookings`)
        } else {
          excludeBookingIds = [excludeBookingId]
        }
      }

      let conflictQuery = supabase
        .from('bookings')
        .select(`
          id,
          booking_date,
          start_time,
          end_time,
          staff_id,
          team_id,
          service_packages (name),
          service_packages_v2:package_v2_id (name),
          customers (full_name)
        `)
        .in('booking_date', dates)  // ← เช็คทุกวันพร้อมกัน!
        .lt('start_time', endTime)
        .gt('end_time', startTime)
        .neq('status', 'cancelled')

      if (excludeBookingIds.length > 0) {
        conflictQuery = conflictQuery.not('id', 'in', `(${excludeBookingIds.join(',')})`)
      }

      const { data: conflictBookings, error: conflictError } = await conflictQuery

      if (conflictError) throw conflictError

      console.log(`📊 Found ${conflictBookings?.length || 0} potential conflicts across ${dates.length} dates`)

      // 3. Check availability based on assignment type
      if (assignmentType === 'individual') {
        await checkStaffAvailability(conflictBookings || [], serviceTypeValue)
      } else {
        await checkTeamAvailability(conflictBookings || [], serviceTypeValue)
      }

      setLoading(false)
    } catch (err) {
      console.error('❌ Error checking multi-date availability:', err)
      setError(err instanceof Error ? err.message : 'Unknown error')
      setLoading(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dates, startTime, endTime, servicePackageId, assignmentType, excludeBookingId])

  /**
   * Check individual staff availability across multiple dates
   */
  const checkStaffAvailability = useCallback(async (
    conflictBookings: BookingConflictData[],
    serviceTypeValue: string | null
  ) => {
    // Get all staff with team memberships
    const { data: allStaff, error: staffError } = await supabase
      .from('profiles')
      .select(`
        id,
        staff_number,
        full_name,
        skills,
        reviews (rating),
        team_members!staff_id (team_id)
      `)
      .in('role', ['staff', 'admin'])
      .order('full_name')

    if (staffError) throw staffError
    if (!allStaff || allStaff.length === 0) {
      setStaffResults([])
      return
    }

    // Process each staff member
    const results: MultiDateStaffResult[] = allStaff.map(staff => {
      // Get team IDs for this staff
      const teamIds = (staff.team_members || []).map((tm: { team_id: string }) => tm.team_id)

      // Get conflicts for this staff (both individual and team bookings)
      const staffConflicts = conflictBookings.filter(b =>
        b.staff_id === staff.id || (b.team_id && teamIds.includes(b.team_id))
      )

      // Group conflicts by date
      const dateAvailability: Record<string, DateAvailabilityStatus> = {}

      dates.forEach(date => {
        const dateConflicts = staffConflicts
          .filter(b => b.booking_date === date)
          .map(transformToDateConflict)

        dateAvailability[date] = {
          isAvailable: dateConflicts.length === 0,
          conflicts: dateConflicts,
          unavailabilityReasons: []
        }
      })

      // Calculate aggregated data
      const availableDates = dates.filter(date => dateAvailability[date].isAvailable)
      const conflictingDates = dates.filter(date => !dateAvailability[date].isAvailable)
      const allConflicts = Object.values(dateAvailability)
        .flatMap(day => day.conflicts)

      // Calculate rating
      const reviews = Array.isArray(staff.reviews) ? staff.reviews : []
      const avgRating = reviews.length > 0
        ? reviews.reduce((sum: number, r: Review) => sum + r.rating, 0) / reviews.length
        : 0

      // Calculate skill match (case-insensitive)
      const staffSkills = staff.skills || []
      const skillMatch = serviceTypeValue && staffSkills.some(
        (skill: string) => skill.toLowerCase() === serviceTypeValue.toLowerCase()
      ) ? 100 : 0

      // Calculate overall score
      const availabilityScore = (availableDates.length / dates.length) * 50
      const ratingScore = (avgRating / 5) * 30
      const skillScore = (skillMatch / 100) * 20
      const overallScore = Number((availabilityScore + ratingScore + skillScore).toFixed(2))

      return {
        staffId: staff.id,
        staffNumber: staff.staff_number || '',
        fullName: staff.full_name,
        skills: staffSkills,
        rating: avgRating,
        isAvailableAllDates: availableDates.length === dates.length,
        availableDatesCount: availableDates.length,
        totalDatesCount: dates.length,
        overallScore,
        skillMatch,
        jobsToday: staffConflicts.length,
        dateAvailability,
        allConflicts,
        conflictingDates,
        availableDates,
        unavailabilityReasons: []
      }
    })

    // Sort by score (descending)
    results.sort((a, b) => b.overallScore - a.overallScore)

    console.log('✅ Staff availability check complete:', {
      totalStaff: results.length,
      fullyAvailable: results.filter(s => s.isAvailableAllDates).length,
      partial: results.filter(s => s.availableDatesCount > 0 && !s.isAvailableAllDates).length,
      unavailable: results.filter(s => s.availableDatesCount === 0).length
    })

    setStaffResults(results)
  }, [dates, transformToDateConflict])

  /**
   * Check team availability across multiple dates
   */
  const checkTeamAvailability = useCallback(async (
    conflictBookings: BookingConflictData[],
    serviceTypeValue: string | null
  ) => {
    // Get all teams with members
    const { data: teams, error: teamsError } = await supabase
      .from('teams')
      .select(`
        id,
        name,
        team_members (
          staff_id,
          profiles (
            id,
            full_name,
            skills
          )
        )
      `)
      .eq('is_active', true)

    if (teamsError) throw teamsError
    if (!teams || teams.length === 0) {
      setTeamResults([])
      return
    }

    // Process each team
    const results: MultiDateTeamResult[] = (teams as unknown as TeamWithMemberProfiles[]).map(team => {
      const members = team.team_members || []
      const totalMembers = members.length

      // Group conflicts by date
      const dateAvailability: Record<string, {
        availableMembersCount: number
        availableMembers: Array<{ id: string; name: string }>
        unavailableMembers: Array<{ id: string; name: string; reason: string }>
        isFullyAvailable: boolean
      }> = {}

      // Build TeamMemberDateAvailability[] with conflicts
      const teamMemberAvailability = members.map(member => {
        const profile = Array.isArray(member.profiles) ? member.profiles[0] : member.profiles
        if (!profile) return null

        // Get all conflicts for this member across all dates
        const memberConflicts = conflictBookings
          .filter(b => b.staff_id === profile.id || b.team_id === team.id)
          .map(transformToDateConflict)

        // Check if available (no conflicts)
        const isAvailable = memberConflicts.length === 0

        return {
          staffId: profile.id,
          fullName: profile.full_name,
          isAvailable,
          conflicts: memberConflicts
        }
      }).filter(Boolean)

      dates.forEach(date => {
        const dateConflicts = conflictBookings.filter(b => b.booking_date === date)

        const available: Array<{ id: string; name: string }> = []
        const unavailable: Array<{ id: string; name: string; reason: string }> = []

        members.forEach(member => {
          const profile = Array.isArray(member.profiles) ? member.profiles[0] : member.profiles
          if (!profile) return

          // เช็ค conflict ทั้ง individual booking และ team booking
          const hasConflict = dateConflicts.some(b =>
            b.staff_id === profile.id || b.team_id === team.id
          )

          if (hasConflict) {
            unavailable.push({
              id: profile.id,
              name: profile.full_name,
              reason: 'Has existing booking'
            })
          } else {
            available.push({
              id: profile.id,
              name: profile.full_name
            })
          }
        })

        dateAvailability[date] = {
          availableMembersCount: available.length,
          availableMembers: available,
          unavailableMembers: unavailable,
          isFullyAvailable: available.length === totalMembers
        }
      })

      // Calculate aggregated data
      const availableDates = dates.filter(date => dateAvailability[date].isFullyAvailable)
      const conflictingDates = dates.filter(date => !dateAvailability[date].isFullyAvailable)

      // Calculate team match (% of members with matching skills)
      const membersWithSkill = members.filter(m => {
        const profile = Array.isArray(m.profiles) ? m.profiles[0] : m.profiles
        return profile && serviceTypeValue && profile.skills?.some(
          skill => skill.toLowerCase() === serviceTypeValue.toLowerCase()
        )
      }).length
      const teamMatch = totalMembers > 0 ? Number(((membersWithSkill / totalMembers) * 100).toFixed(2)) : 0

      // Calculate overall score
      const availabilityScore = (availableDates.length / dates.length) * 60
      const teamMatchScore = (teamMatch / 100) * 40
      const overallScore = Number((availabilityScore + teamMatchScore).toFixed(2))

      return {
        teamId: team.id,
        teamName: team.name,
        totalMembers,
        isAvailableAllDates: availableDates.length === dates.length,
        availableDatesCount: availableDates.length,
        totalDatesCount: dates.length,
        overallScore,
        teamMatch,
        dateAvailability,
        conflictingDates,
        availableDates,
        members: teamMemberAvailability as { staffId: string; fullName: string; isAvailable: boolean; conflicts: DateConflict[] }[]
      }
    })

    // Sort by score
    results.sort((a, b) => b.overallScore - a.overallScore)

    console.log('✅ Team availability check complete:', {
      totalTeams: results.length,
      fullyAvailable: results.filter(t => t.isAvailableAllDates).length
    })

    setTeamResults(results)
  }, [dates, transformToDateConflict])

  // Run check on mount and when params change
  useEffect(() => {
    if (dates.length > 0 && startTime && endTime && servicePackageId) {
      checkMultiDateAvailability()
    }
  }, [dates, startTime, endTime, servicePackageId, assignmentType, excludeBookingId, checkMultiDateAvailability])

  return {
    loading,
    staffResults,
    teamResults,
    serviceType,
    error,
    refetch: checkMultiDateAvailability
  }
}
