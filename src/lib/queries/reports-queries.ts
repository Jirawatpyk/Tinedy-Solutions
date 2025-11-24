/**
 * Reports Query Functions
 *
 * Query functions for Reports page analytics data.
 * Migrated from manual fetching in reports.tsx (306 lines of code)
 */

import { supabase } from '@/lib/supabase'
import { queryKeys } from '@/lib/query-keys'
import type { CustomerRecord } from '@/types'
import type {
  BookingForAnalytics,
  CustomerWithBookings,
  Staff,
  StaffWithBookings,
  Team,
  TeamWithBookings,
} from '@/lib/analytics'

// ============================================================================
// TYPES
// ============================================================================

export interface BookingWithService {
  id: string
  booking_date: string
  start_time: string
  total_price: number
  status: string
  payment_status?: string
  payment_date?: string | null
  created_at: string
  customer_id: string
  staff_id: string | null
  service_package_id: string
  package_v2_id: string | null
  recurring_group_id?: string | null
  recurring_sequence?: number
  recurring_total?: number
  recurring_pattern?: string | null
  is_recurring?: boolean
  parent_booking_id?: string | null
  service_packages: { name: string; service_type: string } | null
}

// Re-export types from analytics.ts to avoid duplicates
export type {
  CustomerRecord,
  CustomerWithBookings,
  Staff,
  StaffWithBookings,
  Team,
  TeamWithBookings,
}

// ============================================================================
// QUERY FUNCTIONS
// ============================================================================

/**
 * Fetch Reports Bookings
 * Migrated from fetchBookings() (lines 84-153, 70 lines)
 */
export async function fetchReportsBookings(): Promise<BookingWithService[]> {
  const { data, error } = await supabase
    .from('bookings')
    .select(`
      id,
      booking_date,
      start_time,
      total_price,
      status,
      payment_status,
      payment_date,
      created_at,
      customer_id,
      staff_id,
      service_package_id,
      package_v2_id,
      recurring_group_id,
      recurring_sequence,
      recurring_total,
      recurring_pattern,
      is_recurring,
      parent_booking_id,
      service_packages (
        name,
        service_type
      ),
      service_packages_v2:package_v2_id (
        name,
        service_type
      )
    `)
    .order('booking_date', { ascending: true })

  if (error) {
    throw new Error(`Failed to fetch reports bookings: ${error.message}`)
  }

  // Transform Supabase data - service_packages comes as array, we need single object (V1 + V2)
  interface SupabaseBooking {
    id: string
    booking_date: string
    start_time: string
    total_price: number
    status: string
    payment_status?: string
    payment_date?: string | null
    created_at: string
    customer_id: string
    staff_id: string | null
    service_package_id: string
    package_v2_id: string | null
    recurring_group_id?: string | null
    recurring_sequence?: number
    recurring_total?: number
    recurring_pattern?: string | null
    is_recurring?: boolean
    parent_booking_id?: string | null
    service_packages: { name: string; service_type: string }[] | { name: string; service_type: string } | null
    service_packages_v2: { name: string; service_type: string }[] | { name: string; service_type: string } | null
  }

  const transformedBookings = (data as SupabaseBooking[] || []).map((booking): BookingWithService => {
    // Merge V1 and V2 package data
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const servicePackages = booking.service_packages || (booking as any).service_packages_v2

    return {
      ...booking,
      service_packages: Array.isArray(servicePackages)
        ? servicePackages[0] || null
        : servicePackages
    }
  })

  return transformedBookings
}

/**
 * Fetch Reports Customers
 * Migrated from fetchCustomers() (lines 156-203, 48 lines)
 * OPTIMIZED: Parallel fetch of customers and bookings
 */
export async function fetchReportsCustomers(): Promise<{
  customers: CustomerRecord[]
  customersWithBookings: CustomerWithBookings[]
}> {
  // Fetch customers and bookings in parallel (40-60% faster)
  const [customersResult, bookingsResult] = await Promise.all([
    supabase
      .from('customers')
      .select('id, full_name, email, phone, created_at')
      .order('full_name'),
    supabase
      .from('bookings')
      .select('id, booking_date, total_price, status, payment_status, payment_date, created_at, customer_id')
  ])

  if (customersResult.error) {
    throw new Error(`Failed to fetch customers: ${customersResult.error.message}`)
  }
  if (bookingsResult.error) {
    throw new Error(`Failed to fetch customer bookings: ${bookingsResult.error.message}`)
  }

  const customersData = customersResult.data
  const bookingsData = bookingsResult.data

  const customers = (customersData || []) as CustomerRecord[]

  // Group bookings by customer
  const customerBookingsMap = new Map<string, BookingForAnalytics[]>()
  bookingsData?.forEach((booking) => {
    const customerId = booking.customer_id
    if (!customerBookingsMap.has(customerId)) {
      customerBookingsMap.set(customerId, [])
    }
    customerBookingsMap.get(customerId)?.push(booking as BookingForAnalytics)
  })

  // Merge customers with their bookings
  const customersWithBookings: CustomerWithBookings[] = (customersData || []).map((customer) => ({
    ...(customer as CustomerRecord),
    bookings: customerBookingsMap.get(customer.id) || [],
  }))

  return {
    customers,
    customersWithBookings,
  }
}

/**
 * Fetch Reports Staff
 * Migrated from fetchStaff() (lines 206-319, 114 lines)
 * OPTIMIZED: 4 parallel queries - staff, staff bookings, team members, team bookings
 * Most complex query function in Reports
 */
export async function fetchReportsStaff(): Promise<{
  staff: Staff[]
  staffWithBookings: StaffWithBookings[]
}> {
  // Fetch staff, staff bookings, team members, and team bookings in parallel
  const [staffResult, staffBookingsResult, teamMembersResult, teamBookingsResult] = await Promise.all([
    supabase
      .from('profiles')
      .select('id, full_name, email, role, created_at')
      .order('full_name'),
    supabase
      .from('bookings')
      .select('id, booking_date, total_price, status, payment_status, payment_date, staff_id, created_at')
      .not('staff_id', 'is', null),
    supabase
      .from('team_members')
      .select('team_id, staff_id'),
    supabase
      .from('bookings')
      .select('id, booking_date, total_price, status, payment_status, payment_date, team_id, created_at')
      .not('team_id', 'is', null)
  ])

  if (staffResult.error) {
    throw new Error(`Failed to fetch staff: ${staffResult.error.message}`)
  }
  if (staffBookingsResult.error) {
    throw new Error(`Failed to fetch staff bookings: ${staffBookingsResult.error.message}`)
  }
  if (teamMembersResult.error) {
    throw new Error(`Failed to fetch team members: ${teamMembersResult.error.message}`)
  }
  if (teamBookingsResult.error) {
    throw new Error(`Failed to fetch team bookings: ${teamBookingsResult.error.message}`)
  }

  const staffData = staffResult.data
  const staffBookingsData = staffBookingsResult.data
  const teamMembersData = teamMembersResult.data
  const teamBookingsData = teamBookingsResult.data

  const staff = staffData || []

  // Create map of staff -> teams they belong to
  const staffToTeamsMap = new Map<string, string[]>()
  teamMembersData?.forEach((tm) => {
    if (!staffToTeamsMap.has(tm.staff_id)) {
      staffToTeamsMap.set(tm.staff_id, [])
    }
    staffToTeamsMap.get(tm.staff_id)?.push(tm.team_id)
  })

  // Count team members for each team
  const teamMemberCounts = new Map<string, number>()
  teamMembersData?.forEach((tm) => {
    const count = teamMemberCounts.get(tm.team_id) || 0
    teamMemberCounts.set(tm.team_id, count + 1)
  })

  // Group team bookings by team_id
  const teamBookingsMap = new Map<string, typeof teamBookingsData>()
  teamBookingsData?.forEach((booking) => {
    const teamId = booking.team_id
    if (teamId) {
      if (!teamBookingsMap.has(teamId)) {
        teamBookingsMap.set(teamId, [])
      }
      teamBookingsMap.get(teamId)?.push(booking)
    }
  })

  // Group staff bookings by staff_id
  const staffBookingsMap = new Map<string, BookingForAnalytics[]>()

  // Add individual staff bookings
  staffBookingsData?.forEach((booking) => {
    const staffId = booking.staff_id
    if (staffId) {
      if (!staffBookingsMap.has(staffId)) {
        staffBookingsMap.set(staffId, [])
      }
      staffBookingsMap.get(staffId)?.push(booking as BookingForAnalytics)
    }
  })

  // Add team bookings for each staff member (with divided revenue)
  staffData?.forEach((staffMember) => {
    const teams = staffToTeamsMap.get(staffMember.id) || []
    teams.forEach((teamId) => {
      const teamBookings = teamBookingsMap.get(teamId) || []
      const memberCount = teamMemberCounts.get(teamId) || 1

      teamBookings.forEach((booking) => {
        if (!staffBookingsMap.has(staffMember.id)) {
          staffBookingsMap.set(staffMember.id, [])
        }

        // Divide revenue by team member count for fair distribution
        const bookingWithDividedRevenue = {
          ...booking,
          total_price: booking.total_price / memberCount
        } as BookingForAnalytics

        staffBookingsMap.get(staffMember.id)?.push(bookingWithDividedRevenue)
      })
    })
  })

  // Merge staff with their bookings (both individual and team bookings)
  const staffWithBookings = (staffData || []).map((staffMember) => ({
    ...staffMember,
    bookings: staffBookingsMap.get(staffMember.id) || [],
  }))

  return {
    staff,
    staffWithBookings,
  }
}

/**
 * Fetch Reports Teams
 * Migrated from fetchTeams() (lines 322-395, 74 lines)
 * OPTIMIZED: 3 parallel queries - teams, teams with members, bookings
 */
export async function fetchReportsTeams(): Promise<{
  teams: Team[]
  teamsWithBookings: TeamWithBookings[]
}> {
  // Fetch all queries in parallel (40-60% faster)
  const [teamsResult, teamsWithMembersResult, bookingsResult] = await Promise.all([
    supabase
      .from('teams')
      .select('id, name, is_active, created_at')
      .order('name'),
    supabase
      .from('teams')
      .select(`
        id,
        name,
        is_active,
        created_at,
        team_members (id)
      `)
      .order('name'),
    supabase
      .from('bookings')
      .select('id, booking_date, total_price, status, payment_status, payment_date, team_id, created_at')
      .not('team_id', 'is', null)
  ])

  if (teamsResult.error) {
    throw new Error(`Failed to fetch teams: ${teamsResult.error.message}`)
  }
  if (teamsWithMembersResult.error) {
    throw new Error(`Failed to fetch teams with members: ${teamsWithMembersResult.error.message}`)
  }
  if (bookingsResult.error) {
    throw new Error(`Failed to fetch team bookings: ${bookingsResult.error.message}`)
  }

  const teamsData = teamsResult.data
  const teamsWithMembersData = teamsWithMembersResult.data
  const bookingsData = bookingsResult.data

  const teams = teamsData || []

  // Group bookings by team
  const teamBookingsMap = new Map<string, BookingForAnalytics[]>()
  bookingsData?.forEach((booking) => {
    const teamId = booking.team_id
    if (teamId) {
      if (!teamBookingsMap.has(teamId)) {
        teamBookingsMap.set(teamId, [])
      }
      teamBookingsMap.get(teamId)?.push(booking as BookingForAnalytics)
    }
  })

  // Merge teams with their bookings
  const teamsWithBookings: TeamWithBookings[] = (teamsWithMembersData || []).map((team) => ({
    id: team.id,
    name: team.name,
    is_active: team.is_active,
    created_at: team.created_at,
    team_members: team.team_members || [],
    bookings: teamBookingsMap.get(team.id) || [],
  }))

  return {
    teams,
    teamsWithBookings,
  }
}

// ============================================================================
// QUERY OPTIONS
// ============================================================================

export const reportsQueryOptions = {
  bookings: {
    queryKey: queryKeys.reports.bookings(),
    queryFn: fetchReportsBookings,
    staleTime: 2 * 60 * 1000, // 2 minutes (reduced from 5 - using realtime now)
    refetchOnMount: 'always' as const, // Force refetch on mount
    refetchOnWindowFocus: true, // Refetch when window regains focus
  },
  customers: {
    queryKey: queryKeys.reports.customers(),
    queryFn: fetchReportsCustomers,
    staleTime: 3 * 60 * 1000, // 3 minutes (reduced from 10 - using realtime now)
    refetchOnMount: 'always' as const, // Force refetch on mount
    refetchOnWindowFocus: true, // Refetch when window regains focus
  },
  staff: {
    queryKey: queryKeys.reports.staff(),
    queryFn: fetchReportsStaff,
    staleTime: 3 * 60 * 1000, // 3 minutes (reduced from 10 - using realtime now)
    refetchOnMount: 'always' as const, // Force refetch on mount
    refetchOnWindowFocus: true, // Refetch when window regains focus
  },
  teams: {
    queryKey: queryKeys.reports.teams(),
    queryFn: fetchReportsTeams,
    staleTime: 3 * 60 * 1000, // 3 minutes (reduced from 10 - using realtime now)
    refetchOnMount: 'always' as const, // Force refetch on mount
    refetchOnWindowFocus: true, // Refetch when window regains focus
  },
}
