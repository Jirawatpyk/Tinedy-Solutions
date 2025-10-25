import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'

interface ServicePackage {
  name: string
}

interface Customer {
  full_name: string
}

interface Review {
  rating: number
}

interface BookingWithRelations {
  id: string
  booking_date: string
  start_time: string
  end_time: string
  service_packages: ServicePackage[] | ServicePackage | null
  customers: Customer[] | Customer | null
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

interface TeamWithMembers {
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

interface BookingConflict {
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

  const checkStaffAvailability = useCallback(async () => {
    try {
      setLoading(true)

      // 1. Get service type
      const { data: service } = await supabase
        .from('service_packages')
        .select('service_type')
        .eq('id', servicePackageId)
        .single()

      if (!service) return

      setServiceType(service.service_type)

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
          // Check booking conflicts
          let query = supabase
            .from('bookings')
            .select(`
              id,
              booking_date,
              start_time,
              end_time,
              service_packages (name),
              customers (full_name)
            `)
            .eq('staff_id', staff.id)
            .eq('booking_date', date)
            .in('status', ['pending', 'confirmed', 'in_progress'])

          // Exclude current booking when editing
          if (excludeBookingId) {
            query = query.neq('id', excludeBookingId)
          }

          const { data: bookingConflicts } = await query

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
            .map((booking: BookingWithRelations) => {
              const servicePackages = Array.isArray(booking.service_packages)
                ? booking.service_packages[0]
                : booking.service_packages
              const customers = Array.isArray(booking.customers)
                ? booking.customers[0]
                : booking.customers

              return {
                id: booking.id,
                bookingDate: booking.booking_date,
                startTime: booking.start_time,
                endTime: booking.end_time,
                serviceName: servicePackages?.name || 'Unknown',
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
          const skillMatch = calculateSkillMatch(staff.skills, service.service_type)

          // Calculate average rating
          const reviews = Array.isArray(staff.reviews) ? staff.reviews : []
          const avgRating = reviews.length > 0
            ? reviews.reduce((sum: number, r: Review) => sum + r.rating, 0) / reviews.length
            : 0

          // Calculate availability score
          const isAvailable = conflicts.length === 0 && unavailabilityReasons.length === 0
          const availabilityScore = isAvailable ? 30 : (conflicts.length === 0 ? 15 : 0)

          // Calculate performance score (based on rating)
          const performanceScore = (avgRating / 5) * 20

          // Calculate total score
          const score = skillMatch + availabilityScore + performanceScore

          return {
            staffId: staff.id,
            staffNumber: staff.staff_number || '',
            fullName: staff.full_name,
            skills: staff.skills,
            rating: Math.round(avgRating * 10) / 10,
            isAvailable,
            conflicts,
            unavailabilityReasons,
            score: Math.round(score),
            skillMatch: Math.round(skillMatch)
          }
        })
      )

      // Sort by score (highest first)
      const sortedResults = results.sort((a, b) => b.score - a.score)
      setStaffResults(sortedResults)
    } catch (error) {
      console.error('Error checking staff availability:', error)
    } finally {
      setLoading(false)
    }
  }, [date, startTime, endTime, servicePackageId, excludeBookingId])

  const checkTeamAvailability = useCallback(async () => {
    try {
      setLoading(true)

      // 1. Get service type
      const { data: service } = await supabase
        .from('service_packages')
        .select('service_type')
        .eq('id', servicePackageId)
        .single()

      if (!service) return

      setServiceType(service.service_type)

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
        (teams || []).map(async (team: TeamWithMembers) => {
          const members = team.team_members || []
          const totalMembers = members.length

          // Check each member's availability
          const memberResults = await Promise.all(
            members.map(async (member: TeamMemberData) => {
              const staff = Array.isArray(member.profiles) ? member.profiles[0] : member.profiles

              // Check booking conflicts
              let memberQuery = supabase
                .from('bookings')
                .select(`
                  id,
                  booking_date,
                  start_time,
                  end_time,
                  service_packages (name),
                  customers (full_name)
                `)
                .eq('staff_id', staff.id)
                .eq('booking_date', date)
                .in('status', ['pending', 'confirmed', 'in_progress'])

              // Exclude current booking when editing
              if (excludeBookingId) {
                memberQuery = memberQuery.neq('id', excludeBookingId)
              }

              const { data: bookingConflicts } = await memberQuery

              const conflicts: BookingConflict[] = (bookingConflicts || [])
                .filter((booking) => {
                  return hasTimeOverlap(
                    startTime,
                    endTime,
                    booking.start_time,
                    booking.end_time
                  )
                })
                .map((booking: BookingWithRelations) => {
                  const servicePackages = Array.isArray(booking.service_packages)
                    ? booking.service_packages[0]
                    : booking.service_packages
                  const customers = Array.isArray(booking.customers)
                    ? booking.customers[0]
                    : booking.customers

                  return {
                    id: booking.id,
                    bookingDate: booking.booking_date,
                    startTime: booking.start_time,
                    endTime: booking.end_time,
                    serviceName: servicePackages?.name || 'Unknown',
                    customerName: customers?.full_name || 'Unknown'
                  }
                })

              return {
                staffId: staff.id,
                fullName: staff.full_name,
                isAvailable: conflicts.length === 0,
                conflicts
              }
            })
          )

          const availableMembers = memberResults.filter(m => m.isAvailable).length
          const isFullyAvailable = availableMembers === totalMembers

          // Calculate team skill match
          const teamSkills = members.flatMap((m: TeamMemberData) => {
            const profile = Array.isArray(m.profiles) ? m.profiles[0] : m.profiles
            return profile?.skills || []
          })
          const teamMatch = calculateTeamMatch(teamSkills, service.service_type)

          // Calculate team score
          const availabilityScore = isFullyAvailable ? 40 : (availableMembers / totalMembers) * 40
          const score = teamMatch + availabilityScore

          return {
            teamId: team.id,
            teamName: team.name,
            totalMembers,
            availableMembers,
            members: memberResults,
            isFullyAvailable,
            score: Math.round(score),
            teamMatch: Math.round(teamMatch)
          }
        })
      )

      // Sort by score (highest first)
      const sortedResults = results.sort((a, b) => b.score - a.score)
      setTeamResults(sortedResults)
    } catch (error) {
      console.error('Error checking team availability:', error)
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
    serviceType
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

// Helper function to calculate skill match score (0-40 points)
function calculateSkillMatch(staffSkills: string[] | null, requiredService: string): number {
  if (!staffSkills || staffSkills.length === 0) return 0

  // Exact match
  if (staffSkills.includes(requiredService)) {
    return 40
  }

  // Partial match (e.g., "Deep Cleaning" includes "Cleaning")
  const hasPartialMatch = staffSkills.some(skill =>
    skill.toLowerCase().includes(requiredService.toLowerCase()) ||
    requiredService.toLowerCase().includes(skill.toLowerCase())
  )

  if (hasPartialMatch) {
    return 25
  }

  return 0
}

// Helper function to calculate team skill match (0-60 points)
function calculateTeamMatch(teamSkills: string[], requiredService: string): number {
  if (teamSkills.length === 0) return 0

  // Count how many team members have the required skill
  const matchingSkills = teamSkills.filter(skill =>
    skill === requiredService ||
    skill.toLowerCase().includes(requiredService.toLowerCase()) ||
    requiredService.toLowerCase().includes(skill.toLowerCase())
  )

  if (matchingSkills.length >= 2) {
    return 60 // Multiple members have the skill
  } else if (matchingSkills.length === 1) {
    return 40 // At least one member has the skill
  }

  return 20 // Team has other skills but not this specific one
}
