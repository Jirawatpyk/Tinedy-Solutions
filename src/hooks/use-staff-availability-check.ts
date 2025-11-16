import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { getSupabaseErrorMessage } from '@/lib/error-utils'

interface Review {
  rating: number
}

// Type for booking data from availability check query
interface BookingConflictData {
  id: string
  booking_date: string
  start_time: string
  end_time: string
  staff_id: string | null
  team_id: string | null
  service_packages: { name: string }[] | { name: string } | null
  service_packages_v2: { name: string }[] | { name: string } | null
  customers: { full_name: string }[] | { full_name: string } | null
}

// Type for team member data from Supabase query (profiles can be array or object)
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

// Type for team with members from Supabase query
interface TeamWithMemberProfiles {
  id: string
  name: string
  team_members: TeamMemberData[]
}

export interface StaffAvailabilityResult {
  staffId: string
  staffNumber: string
  fullName: string
  skills: string[] | null
  rating: number
  isAvailable: boolean
  conflicts: BookingConflict[]
  unavailabilityReasons: UnavailabilityReason[]
  score: number
  skillMatch: number
  jobsToday: number
}

export interface TeamAvailabilityResult {
  teamId: string
  teamName: string
  totalMembers: number
  availableMembers: number
  members: TeamMemberAvailability[]
  isFullyAvailable: boolean
  score: number
  teamMatch: number
}

export interface BookingConflict {
  id: string
  bookingDate: string
  startTime: string
  endTime: string
  serviceName: string
  customerName: string
}

interface UnavailabilityReason {
  reason: string
  startTime: string | null
  endTime: string | null
  notes: string | null
}

interface TeamMemberAvailability {
  staffId: string
  fullName: string
  isAvailable: boolean
  conflicts: BookingConflict[]
}

interface UseStaffAvailabilityParams {
  date: string
  startTime: string
  endTime: string
  servicePackageId: string
  assignmentType: 'individual' | 'team'
  excludeBookingId?: string
}

export function useStaffAvailabilityCheck({
  date,
  startTime,
  endTime,
  servicePackageId,
  assignmentType,
  excludeBookingId
}: UseStaffAvailabilityParams) {
  const [loading, setLoading] = useState(true)
  const [staffResults, setStaffResults] = useState<StaffAvailabilityResult[]>([])
  const [teamResults, setTeamResults] = useState<TeamAvailabilityResult[]>([])
  const [serviceType, setServiceType] = useState<string>('')
  const [error, setError] = useState<string | null>(null)

  const checkStaffAvailability = useCallback(async () => {
    try {
      setLoading(true)

      // 1. Get service type - Query both V1 and V2 safely (suppress errors)
      let serviceTypeValue: string | null = null

      // Try V2 first (suppress error if not found)
      const { data: serviceV2, error: errorV2 } = await supabase
        .from('service_packages_v2')
        .select('service_type')
        .eq('id', servicePackageId)
        .maybeSingle()

      if (serviceV2 && !errorV2) {
        serviceTypeValue = serviceV2.service_type
      } else {
        // Fall back to V1 packages (suppress error if not found)
        const { data: serviceV1, error: errorV1 } = await supabase
          .from('service_packages')
          .select('service_type')
          .eq('id', servicePackageId)
          .maybeSingle()

        if (serviceV1 && !errorV1) {
          serviceTypeValue = serviceV1.service_type
        }
      }

      if (!serviceTypeValue) {
        console.warn('⚠️ [Staff Availability] Package not found in V1 or V2:', servicePackageId)
        return
      }

      setServiceType(serviceTypeValue)

      // 1.5. Get all booking IDs to exclude (recurring group if applicable)
      let excludeBookingIds: string[] = []

      if (excludeBookingId) {
        const { data: excludedBooking } = await supabase
          .from('bookings')
          .select('id, recurring_group_id')
          .eq('id', excludeBookingId)
          .single()

        if (excludedBooking?.recurring_group_id) {
          const { data: recurringBookings } = await supabase
            .from('bookings')
            .select('id')
            .eq('recurring_group_id', excludedBooking.recurring_group_id)

          excludeBookingIds = recurringBookings?.map(b => b.id) || [excludeBookingId]
          console.log(`🔗 [Single-Date] Excluding entire recurring group: ${excludeBookingIds.length} bookings`)
        } else {
          excludeBookingIds = [excludeBookingId]
        }
      }

      // 2. Get all staff with their reviews
      const { data: allStaff } = await supabase
        .from('profiles')
        .select(`
          id,
          full_name,
          staff_number,
          skills,
          reviews (rating)
        `)
        .in('role', ['staff', 'admin'])
        .order('full_name')

      if (!allStaff) return

      // 3. Check availability for each staff
      const results = await Promise.all(
        allStaff.map(async (staff) => {
          // Check booking conflicts (both individual staff bookings AND team bookings)
          // First, get all teams this staff is a member of
          const { data: staffTeams } = await supabase
            .from('team_members')
            .select('team_id')
            .eq('staff_id', staff.id)

          const teamIds = (staffTeams || []).map(tm => tm.team_id)

          // Query for bookings where this staff is assigned directly
          let staffQuery = supabase
            .from('bookings')
            .select(`
              id,
              booking_date,
              start_time,
              end_time,
              staff_id,
              team_id,
              service_packages (name),
              service_packages_v2 (name),
              customers (full_name)
            `)
            .eq('staff_id', staff.id)
            .eq('booking_date', date)
            .in('status', ['pending', 'confirmed', 'in_progress'])

          // Exclude current booking when editing (recurring group if applicable)
          if (excludeBookingIds.length > 0) {
            staffQuery = staffQuery.not('id', 'in', `(${excludeBookingIds.join(',')})`)
          }

          const { data: staffBookings } = await staffQuery as { data: BookingConflictData[] | null }

          // Query for bookings where this staff is assigned via team
          let teamBookings: BookingConflictData[] = []
          if (teamIds.length > 0) {
            let teamQuery = supabase
              .from('bookings')
              .select(`
                id,
                booking_date,
                start_time,
                end_time,
                staff_id,
                team_id,
                service_packages (name),
                service_packages_v2 (name),
                customers (full_name)
              `)
              .in('team_id', teamIds)
              .eq('booking_date', date)
              .in('status', ['pending', 'confirmed', 'in_progress'])

            // Exclude current booking when editing (recurring group if applicable)
            if (excludeBookingIds.length > 0) {
              teamQuery = teamQuery.not('id', 'in', `(${excludeBookingIds.join(',')})`)
            }

            const { data } = await teamQuery
            teamBookings = (data || []) as BookingConflictData[]
          }

          // Combine both staff and team bookings
          const bookingConflicts = [...(staffBookings || []), ...teamBookings]

          // Check unavailability periods
          const { data: unavailablePeriods } = await supabase
            .from('staff_availability')
            .select('reason, start_time, end_time, notes')
            .eq('staff_id', staff.id)
            .eq('unavailable_date', date)
            .eq('is_available', false)

          // Calculate time overlap
          const conflicts: BookingConflict[] = (bookingConflicts || [])
            .filter((booking) => {
              return hasTimeOverlap(
                startTime,
                endTime,
                booking.start_time,
                booking.end_time
              )
            })
            .map((booking: BookingConflictData) => {
              // Try V1 packages first, fallback to V2
              const servicePackagesV1 = Array.isArray(booking.service_packages)
                ? booking.service_packages[0]
                : booking.service_packages
              const servicePackagesV2 = Array.isArray(booking.service_packages_v2)
                ? booking.service_packages_v2[0]
                : booking.service_packages_v2

              const customers = Array.isArray(booking.customers)
                ? booking.customers[0]
                : booking.customers

              return {
                id: booking.id,
                bookingDate: booking.booking_date,
                startTime: booking.start_time,
                endTime: booking.end_time,
                serviceName: servicePackagesV1?.name || servicePackagesV2?.name || 'Unknown',
                customerName: customers?.full_name || 'Unknown'
              }
            })

          const unavailabilityReasons: UnavailabilityReason[] = (unavailablePeriods || [])
            .filter((period) => {
              if (!period.start_time || !period.end_time) return true
              return hasTimeOverlap(
                startTime,
                endTime,
                period.start_time,
                period.end_time
              )
            })
            .map((period) => ({
              reason: period.reason || 'Unavailable',
              startTime: period.start_time,
              endTime: period.end_time,
              notes: period.notes
            }))

          // Calculate skill match
          const skillMatch = calculateSkillMatch(staff.skills, serviceTypeValue || '')

          // Calculate average rating
          const reviews = Array.isArray(staff.reviews) ? staff.reviews : []
          const avgRating = reviews.length > 0
            ? reviews.reduce((sum: number, r: Review) => sum + r.rating, 0) / reviews.length
            : 0

          // Query jobs on selected date for this staff
          const { data: dateBookings } = await supabase
            .from('bookings')
            .select('id')
            .eq('booking_date', date)
            .in('status', ['pending', 'confirmed', 'in_progress'])
            .or(`staff_id.eq.${staff.id},team_id.in.(${teamIds.join(',')})`)

          const jobsToday = dateBookings?.length || 0

          // Calculate availability (for categorization only, not scoring)
          const isAvailable = conflicts.length === 0 && unavailabilityReasons.length === 0

          // Calculate performance score (0-15 points based on rating)
          const performanceScore = (avgRating / 5) * 15

          // Calculate workload score (0-15 points, less jobs = higher score)
          const workloadScore = Math.max(0, 15 - (jobsToday * 3))

          // Calculate total score (Skill 0-70 + Performance 0-15 + Workload 0-15 = 100 total)
          // Skill match comes as 0-80, scale to 0-70 by multiplying by 0.875
          const score = (skillMatch * 0.875) + performanceScore + workloadScore

          return {
            staffId: staff.id,
            staffNumber: staff.staff_number || '',
            fullName: staff.full_name,
            skills: staff.skills,
            rating: Math.round(avgRating * 10) / 10,
            isAvailable,
            conflicts,
            unavailabilityReasons,
            score: Number(score.toFixed(2)),
            skillMatch: Number(skillMatch.toFixed(2)),
            jobsToday
          }
        })
      )

      // Sort by score (highest first)
      const sortedResults = results.sort((a, b) => b.score - a.score)
      setStaffResults(sortedResults)
    } catch (err) {
      const errorMsg = getSupabaseErrorMessage(err)
      console.error('Error checking staff availability:', err)
      setError(errorMsg)
      setStaffResults([]) // Clear results on error
    } finally {
      setLoading(false)
    }
  }, [date, startTime, endTime, servicePackageId, excludeBookingId])

  const checkTeamAvailability = useCallback(async () => {
    try {
      setLoading(true)

      // Get all booking IDs to exclude (recurring group if applicable)
      let excludeBookingIds: string[] = []

      if (excludeBookingId) {
        const { data: excludedBooking } = await supabase
          .from('bookings')
          .select('id, recurring_group_id')
          .eq('id', excludeBookingId)
          .single()

        if (excludedBooking?.recurring_group_id) {
          const { data: recurringBookings } = await supabase
            .from('bookings')
            .select('id')
            .eq('recurring_group_id', excludedBooking.recurring_group_id)

          excludeBookingIds = recurringBookings?.map(b => b.id) || [excludeBookingId]
          console.log(`🔗 [Team Check] Excluding entire recurring group: ${excludeBookingIds.length} bookings`)
        } else {
          excludeBookingIds = [excludeBookingId]
        }
      }

      // 1. Get service type - Query both V1 and V2 safely (suppress errors)
      let serviceTypeValue: string | null = null

      // Try V2 first (suppress error if not found)
      const { data: serviceV2, error: errorV2 } = await supabase
        .from('service_packages_v2')
        .select('service_type')
        .eq('id', servicePackageId)
        .maybeSingle()

      if (serviceV2 && !errorV2) {
        serviceTypeValue = serviceV2.service_type
      } else {
        // Fall back to V1 packages (suppress error if not found)
        const { data: serviceV1, error: errorV1 } = await supabase
          .from('service_packages')
          .select('service_type')
          .eq('id', servicePackageId)
          .maybeSingle()

        if (serviceV1 && !errorV1) {
          serviceTypeValue = serviceV1.service_type
        }
      }

      if (!serviceTypeValue) {
        console.warn('⚠️ [Team Availability] Package not found in V1 or V2:', servicePackageId)
        return
      }

      setServiceType(serviceTypeValue)

      // 2. Get all active teams
      const { data: teams } = await supabase
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
        .order('name')

      if (!teams) return

      // 3. Check availability for each team
      const results = await Promise.all(
        (teams || []).map(async (team: TeamWithMemberProfiles) => {
          const members = team.team_members || []
          const totalMembers = members.length

          // First, check if this TEAM itself has conflicting bookings
          let teamQuery = supabase
            .from('bookings')
            .select(`
              id,
              booking_date,
              start_time,
              end_time,
              service_packages (name),
              service_packages_v2 (name),
              customers (full_name)
            `)
            .eq('team_id', team.id)
            .eq('booking_date', date)
            .in('status', ['pending', 'confirmed', 'in_progress'])

          // Exclude current booking when editing (recurring group if applicable)
          if (excludeBookingIds.length > 0) {
            teamQuery = teamQuery.not('id', 'in', `(${excludeBookingIds.join(',')})`)
          }

          const { data: teamBookings } = await teamQuery

          // Check for team-level time conflicts
          const teamLevelConflicts = (teamBookings || []).filter((booking) => {
            return hasTimeOverlap(
              startTime,
              endTime,
              booking.start_time,
              booking.end_time
            )
          })

          // Check each member's availability
          const memberResults = await Promise.all(
            members.map(async (member: TeamMemberData) => {
              const staff = Array.isArray(member.profiles) ? member.profiles[0] : member.profiles

              // Check booking conflicts (both individual staff bookings AND team bookings)
              // First, get all teams this staff is a member of
              const { data: staffTeams } = await supabase
                .from('team_members')
                .select('team_id')
                .eq('staff_id', staff.id)

              const teamIds = (staffTeams || []).map(tm => tm.team_id)

              // Query for both staff_id matches AND team_id matches
              let memberQuery = supabase
                .from('bookings')
                .select(`
                  id,
                  booking_date,
                  start_time,
                  end_time,
                  staff_id,
                  team_id,
                  service_packages (name),
                  service_packages_v2 (name),
                  customers (full_name)
                `)
                .eq('booking_date', date)
                .in('status', ['pending', 'confirmed', 'in_progress'])

              // Exclude current booking when editing (recurring group if applicable)
              if (excludeBookingIds.length > 0) {
                memberQuery = memberQuery.not('id', 'in', `(${excludeBookingIds.join(',')})`)
              }

              const { data: allBookings } = await memberQuery

              // Filter bookings where this staff is assigned (either directly or via team)
              const bookingConflicts = (allBookings || []).filter(booking =>
                booking.staff_id === staff.id || (booking.team_id && teamIds.includes(booking.team_id))
              )

              const conflicts: BookingConflict[] = (bookingConflicts || [])
                .filter((booking) => {
                  return hasTimeOverlap(
                    startTime,
                    endTime,
                    booking.start_time,
                    booking.end_time
                  )
                })
                .map((booking: BookingConflictData) => {
                  // Try V1 packages first, fallback to V2
                  const servicePackagesV1 = Array.isArray(booking.service_packages)
                    ? booking.service_packages[0]
                    : booking.service_packages
                  const servicePackagesV2 = Array.isArray(booking.service_packages_v2)
                    ? booking.service_packages_v2[0]
                    : booking.service_packages_v2

                  const customers = Array.isArray(booking.customers)
                    ? booking.customers[0]
                    : booking.customers

                  return {
                    id: booking.id,
                    bookingDate: booking.booking_date,
                    startTime: booking.start_time,
                    endTime: booking.end_time,
                    serviceName: servicePackagesV1?.name || servicePackagesV2?.name || 'Unknown',
                    customerName: customers?.full_name || 'Unknown'
                  }
                })

              // Get member's rating
              const { data: memberReviews } = await supabase
                .from('reviews')
                .select('rating')
                .eq('staff_id', staff.id)

              const memberAvgRating = memberReviews && memberReviews.length > 0
                ? memberReviews.reduce((sum, r) => sum + r.rating, 0) / memberReviews.length
                : 0

              // Get member's jobs on selected date
              const { data: memberDateBookings } = await supabase
                .from('bookings')
                .select('id')
                .eq('booking_date', date)
                .in('status', ['pending', 'confirmed', 'in_progress'])
                .or(`staff_id.eq.${staff.id},team_id.in.(${teamIds.join(',')})`)

              const memberJobsToday = memberDateBookings?.length || 0

              return {
                staffId: staff.id,
                fullName: staff.full_name,
                isAvailable: conflicts.length === 0,
                conflicts,
                rating: Math.round(memberAvgRating * 10) / 10,
                jobsToday: memberJobsToday
              }
            })
          )

          const availableMembers = memberResults.filter((m) => m.isAvailable).length

          // Team is NOT available if:
          // 1. The team itself has conflicting bookings (team-level assignment), OR
          // 2. Not all members are available (some members have individual conflicts)
          const hasTeamConflict = teamLevelConflicts.length > 0
          const isFullyAvailable = !hasTeamConflict && availableMembers === totalMembers

          // Calculate team skill match
          const teamSkills = members.flatMap((m: TeamMemberData) => {
            const profile = Array.isArray(m.profiles) ? m.profiles[0] : m.profiles
            return profile?.skills || []
          })
          const teamMatch = calculateTeamMatch(teamSkills, serviceTypeValue || '')

          // Calculate average team rating from member results
          const membersWithRatings = memberResults.filter((m) => m.rating > 0)
          const avgTeamRating = membersWithRatings.length > 0
            ? membersWithRatings.reduce((sum: number, m) => sum + m.rating, 0) / membersWithRatings.length
            : 0

          // Calculate team workload (sum of all members' jobs today)
          const teamJobsToday = memberResults.reduce((sum: number, m) => sum + m.jobsToday, 0)

          // Calculate team performance score (0-15 points)
          const teamPerformanceScore = (avgTeamRating / 5) * 15

          // Calculate team workload score (0-15 points)
          const teamWorkloadScore = Math.max(0, 15 - (teamJobsToday * 2))

          // Calculate team score (Skill 0-70 + Performance 0-15 + Workload 0-15 = 100 total)
          // Team match comes as 0-80, scale to 0-70
          const score = (teamMatch * 0.875) + teamPerformanceScore + teamWorkloadScore

          return {
            teamId: team.id,
            teamName: team.name,
            totalMembers,
            availableMembers: hasTeamConflict ? 0 : availableMembers,
            members: memberResults,
            isFullyAvailable,
            score: Number(score.toFixed(2)),
            teamMatch: Number(teamMatch.toFixed(2))
          }
        })
      )

      // Sort by score (highest first)
      const sortedResults = results.sort((a, b) => b.score - a.score)
      setTeamResults(sortedResults)
    } catch (err) {
      const errorMsg = getSupabaseErrorMessage(err)
      console.error('Error checking team availability:', err)
      setError(errorMsg)
      setTeamResults([]) // Clear results on error
    } finally {
      setLoading(false)
    }
  }, [date, startTime, endTime, servicePackageId, excludeBookingId])

  useEffect(() => {
    if (!date || !startTime || !endTime || !servicePackageId) {
      setLoading(false)
      return
    }

    if (assignmentType === 'individual') {
      checkStaffAvailability()
    } else {
      checkTeamAvailability()
    }
  }, [date, startTime, endTime, servicePackageId, assignmentType, checkStaffAvailability, checkTeamAvailability])

  return {
    loading,
    staffResults,
    teamResults,
    serviceType,
    error
  }
}

// Helper function to check time overlap
function hasTimeOverlap(
  start1: string,
  end1: string,
  start2: string,
  end2: string
): boolean {
  return start1 < end2 && end1 > start2
}

// Helper function to calculate skill match score (0-80 points, will be scaled to 70)
function calculateSkillMatch(staffSkills: string[] | null, requiredService: string): number {
  if (!staffSkills || staffSkills.length === 0) return 0

  // Normalize service type to lowercase for comparison
  const normalizedService = requiredService.toLowerCase()
  const normalizedSkills = staffSkills.map(s => s.toLowerCase())

  // Exact match (case-insensitive) - 80 points (will be scaled to 70)
  if (normalizedSkills.includes(normalizedService)) {
    return 80
  }

  // Partial match (e.g., "Deep Cleaning" includes "Cleaning") - 50 points
  const hasPartialMatch = staffSkills.some(skill =>
    skill.toLowerCase().includes(normalizedService) ||
    normalizedService.includes(skill.toLowerCase())
  )

  if (hasPartialMatch) {
    return 50
  }

  return 0
}

// Helper function to calculate team skill match (0-80 points, will be scaled to 70)
function calculateTeamMatch(teamSkills: string[], requiredService: string): number {
  if (teamSkills.length === 0) return 0

  // Normalize for case-insensitive comparison
  const normalizedService = requiredService.toLowerCase()
  const normalizedSkills = teamSkills.map(s => s.toLowerCase())

  // Count exact matches
  const exactMatches = normalizedSkills.filter(skill => skill === normalizedService).length

  // Count partial matches
  const partialMatches = teamSkills.filter(skill =>
    !normalizedSkills.includes(normalizedService) && (
      skill.toLowerCase().includes(normalizedService) ||
      normalizedService.includes(skill.toLowerCase())
    )
  ).length

  if (exactMatches >= 2) {
    return 80 // Multiple members have exact skill match
  } else if (exactMatches === 1) {
    return 60 // One member has exact match
  } else if (partialMatches >= 1) {
    return 40 // At least one partial match
  }

  return 20 // Team has other skills but not this specific one
}
