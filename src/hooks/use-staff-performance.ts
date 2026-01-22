import { useState, useCallback, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useToast } from '@/hooks/use-toast'
import {
  getTeamMemberCounts,
  calculateBookingRevenue,
  getUniqueTeamIds,
} from '@/lib/team-revenue-utils'
import { fetchStaffReviewStats, type MembershipPeriod } from '@/lib/review-utils'
import type { Booking } from '@/types'

export interface StaffPerformanceStats {
  totalBookings: number
  completedBookings: number
  pendingBookings: number
  cancelledRate: number
  totalRevenue: number
  averageRating: number
  reviewCount: number
}

export interface MonthlyPerformanceData {
  month: string
  bookings: number
  revenue: number
  completionRate: number
}

export interface Staff {
  id: string
  full_name: string
  email: string
  role: string
  phone?: string
  avatar_url?: string
}

interface BookingRawFromDB {
  id: string
  booking_date: string
  start_time: string
  end_time: string
  status: string
  total_price: number
  payment_status: string
  created_at: string
  staff_id: string | null
  team_id: string | null
  team_member_count: number | null
  address: string
  city: string
  state: string
  zip_code: string
  service_packages: { name: string; price?: number; service_type?: string }[] | { name: string; price?: number; service_type?: string } | null
  service_packages_v2: { name: string; service_type?: string }[] | { name: string; service_type?: string } | null
  customers: { id: string; full_name: string; email: string; phone: string | null }[] | { id: string; full_name: string; email: string; phone: string | null } | null
}

interface TeamMembershipPeriod {
  team_id: string
  joined_at: string | null
  left_at: string | null
}

export function useStaffPerformance(staffId: string | undefined) {
  const { toast } = useToast()
  const [staff, setStaff] = useState<Staff | null>(null)
  const [bookings, setBookings] = useState<Booking[]>([])
  const [stats, setStats] = useState<StaffPerformanceStats>({
    totalBookings: 0,
    completedBookings: 0,
    pendingBookings: 0,
    cancelledRate: 0,
    totalRevenue: 0,
    averageRating: 0,
    reviewCount: 0,
  })
  const [monthlyData, setMonthlyData] = useState<MonthlyPerformanceData[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchStaffData = useCallback(async () => {
    if (!staffId) {
      setError('No staff ID provided')
      return
    }

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, email, role, phone, avatar_url')
        .eq('id', staffId)
        .single()

      if (error) throw error
      if (!data) {
        setError('Staff member not found')
        return
      }
      setStaff(data)
      setError(null)
    } catch (error) {
      console.error('Error fetching staff:', error)
      setError('Failed to load staff data')
      toast({
        title: 'Error',
        description: 'Failed to load staff data',
        variant: 'destructive',
      })
    }
  }, [staffId, toast])

  const fetchBookings = useCallback(async () => {
    if (!staffId) return

    try {
      // Get ALL team memberships (active + former) with joined_at and left_at dates
      // This preserves revenue history even after staff leaves the team
      const { data: teamMemberships } = await supabase
        .from('team_members')
        .select('team_id, joined_at, left_at')
        .eq('staff_id', staffId)

      // Note: We include ALL team memberships (active + former) to preserve revenue history
      // The filtering by membership period happens later in filteredData

      // Store ALL membership periods (staff can have multiple periods for same team after re-join)
      const allMembershipPeriods = (teamMemberships as TeamMembershipPeriod[] || []).map(tm => ({
        teamId: tm.team_id,
        joinedAt: tm.joined_at || '2020-01-01T00:00:00Z',
        leftAt: tm.left_at || null
      }))

      // Fetch bookings: staff's direct bookings OR team bookings without staff assigned
      let query = supabase
        .from('bookings')
        .select(`
          id,
          booking_date,
          start_time,
          end_time,
          status,
          total_price,
          payment_status,
          payment_slip_url,
          payment_method,
          payment_date,
          created_at,
          staff_id,
          team_id,
          team_member_count,
          address,
          city,
          state,
          zip_code,
          notes,
          area_sqm,
          frequency,
          is_recurring,
          recurring_sequence,
          recurring_total,
          parent_booking_id,
          service_packages (name, price, service_type),
          service_packages_v2:package_v2_id (name, service_type),
          customers (id, full_name, email, phone),
          profiles:staff_id (id, full_name, email, avatar_url),
          teams:team_id (id, name, team_lead:team_lead_id (id, full_name))
        `)
        .is('deleted_at', null)
        .order('booking_date', { ascending: false })

      // Build OR condition: staff_id = id OR (team_id IN active teamIds AND staff_id IS NULL)
      // Note: We only fetch bookings for ACTIVE teams, but will include historical data in filtering
      // To include former team's bookings, we need to include all team IDs (unique)
      const allTeamIds = [...new Set(allMembershipPeriods.map(p => p.teamId))]
      if (allTeamIds.length > 0) {
        query = query.or(`staff_id.eq.${staffId},and(team_id.in.(${allTeamIds.join(',')}),staff_id.is.null)`)
      } else {
        query = query.eq('staff_id', staffId)
      }

      const { data, error } = await query

      if (error) throw error

      const transformedData = (data || []).map((booking: BookingRawFromDB): Booking => {
        // Merge V1 and V2 package data
        const servicePackages = booking.service_packages || booking.service_packages_v2

        const pkg = Array.isArray(servicePackages)
          ? servicePackages[0]
          : servicePackages

        const customerData = Array.isArray(booking.customers)
          ? booking.customers[0] || null
          : booking.customers

        return {
          ...booking,
          service_packages: pkg ? {
            name: pkg.name,
            service_type: pkg.service_type || 'general'
          } : null,
          customers: customerData ? {
            id: customerData.id || '',
            full_name: customerData.full_name,
            email: customerData.email || '',
            phone: customerData.phone || null
          } : null,
        } as unknown as Booking
      })

      // Filter team bookings by membership period (joined_at to left_at)
      // This preserves historical revenue even after staff leaves the team
      // IMPORTANT: Staff can have MULTIPLE membership periods for same team (after re-join)
      const filteredData = transformedData.filter(booking => {
        // Direct staff assignment - always show
        if (booking.staff_id === staffId) {
          return true
        }

        // Team booking - check if staff was a member when booking was created
        if (booking.team_id) {
          // Get ALL membership periods for this team (may have multiple after re-join)
          const periodsForTeam = allMembershipPeriods.filter(p => p.teamId === booking.team_id)

          if (periodsForTeam.length === 0) {
            // Staff is not in this team - shouldn't happen but exclude
            return false
          }

          // Use booking.created_at, fallback to booking_date if not available
          const bookingCreatedAt = new Date(booking.created_at || booking.booking_date)

          // Check if booking falls within ANY of the membership periods
          const isWithinAnyPeriod = periodsForTeam.some(period => {
            const staffJoinedAt = new Date(period.joinedAt)
            const staffLeftAt = period.leftAt ? new Date(period.leftAt) : null

            // Booking must be created AFTER staff joined
            if (bookingCreatedAt < staffJoinedAt) {
              return false
            }

            // Booking must be created BEFORE staff left (if they left)
            if (staffLeftAt && bookingCreatedAt > staffLeftAt) {
              return false
            }

            return true
          })

          return isWithinAnyPeriod
        }

        return true
      })

      setBookings(filteredData)
      // Pass allMembershipPeriods for consistent filtering in reviews (same logic as bookings)
      await calculateStats(filteredData, allMembershipPeriods)
      await calculateMonthlyData(filteredData)
    } catch (error) {
      console.error('Error fetching bookings:', error)
      toast({
        title: 'Error',
        description: 'Failed to load bookings',
        variant: 'destructive',
      })
    }
  }, [staffId, toast])

  const calculateStats = async (bookingsData: Booking[], membershipPeriods: MembershipPeriod[] = []) => {
    const total = bookingsData.length
    const completed = bookingsData.filter((b) => b.status === 'completed').length
    const pending = bookingsData.filter((b) => b.status === 'pending').length

    // Get unique team IDs that need member counts (OPTIMIZE: Single query for all teams)
    const paidBookings = bookingsData.filter(b => b.payment_status === 'paid')
    const teamIds = getUniqueTeamIds(paidBookings)
    const teamMemberCounts = await getTeamMemberCounts(teamIds)

    // Calculate revenue using cached team member counts
    let totalRevenue = 0
    for (const booking of paidBookings) {
      totalRevenue += calculateBookingRevenue(booking, teamMemberCounts)
    }

    // Calculate average rating from reviews using utility function
    // Use membershipPeriods for consistent filtering (same logic as bookings)
    let reviewStats = { averageRating: 0, reviewCount: 0 }
    if (staffId) {
      try {
        reviewStats = await fetchStaffReviewStats(staffId, membershipPeriods)
      } catch (error) {
        // Reviews table may not exist in all deployments - show warning toast
        console.warn('Could not fetch reviews:', error)
        toast({
          title: 'Warning',
          description: 'Could not load rating data. Other statistics are available.',
        })
      }
    }

    setStats({
      totalBookings: total,
      completedBookings: completed,
      pendingBookings: pending,
      cancelledRate: 0, // No longer used, keeping for backwards compatibility
      totalRevenue,
      averageRating: reviewStats.averageRating,
      reviewCount: reviewStats.reviewCount,
    })
  }

  const calculateMonthlyData = async (bookingsData: Booking[]) => {
    // Generate range: start of current month to 6 months from now
    const now = new Date()
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
    const sixMonthsLater = new Date(now.getFullYear(), now.getMonth() + 6, 0)

    // Filter bookings in date range
    const bookingsInRange = bookingsData.filter((booking) => {
      const date = new Date(booking.booking_date)
      return date >= startOfMonth && date <= sixMonthsLater
    })

    // Get unique team IDs that need member counts (OPTIMIZE: Single query for all teams)
    const teamIds = getUniqueTeamIds(bookingsInRange)
    const teamMemberCounts = await getTeamMemberCounts(teamIds)

    // Count bookings from start of current month to next 6 months with sort key
    const monthDataMap = new Map<string, { month: string; bookings: number; revenue: number; completed: number; sortKey: string }>()

    for (const booking of bookingsInRange) {
      const date = new Date(booking.booking_date)
      const monthKey = date.toLocaleDateString('en-US', { year: 'numeric', month: 'short' })
      const sortKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`

      if (!monthDataMap.has(monthKey)) {
        monthDataMap.set(monthKey, { month: monthKey, bookings: 0, revenue: 0, completed: 0, sortKey })
      }

      const current = monthDataMap.get(monthKey)!
      current.bookings += 1

      // Calculate revenue using cached team member counts
      if (booking.payment_status === 'paid') {
        current.revenue += calculateBookingRevenue(booking, teamMemberCounts)
      }

      if (booking.status === 'completed') {
        current.completed += 1
      }
    }

    // Convert to array and sort by sortKey
    const data = Array.from(monthDataMap.values())
      .sort((a, b) => a.sortKey.localeCompare(b.sortKey))
      .map(({ month, bookings, revenue, completed }) => ({
        month,
        bookings,
        revenue,
        completionRate: bookings > 0 ? (completed / bookings) * 100 : 0,
      }))

    setMonthlyData(data)
  }

  const refresh = useCallback(async () => {
    setLoading(true)
    await Promise.all([
      fetchStaffData(),
      fetchBookings()
    ])
    setLoading(false)
  }, [fetchStaffData, fetchBookings])

  // Initial data load
  useEffect(() => {
    refresh()
  }, [refresh])

  // Realtime subscription for bookings changes
  useEffect(() => {
    if (!staffId) return

    // Get team IDs for this staff
    const getTeamIds = async () => {
      const { data: teamMemberships } = await supabase
        .from('team_members')
        .select('team_id')
        .eq('staff_id', staffId)

      return teamMemberships?.map(tm => tm.team_id) || []
    }

    // Set up subscription
    const setupSubscription = async () => {
      const teamIds = await getTeamIds()

      const channel = supabase
        .channel(`staff-performance-${staffId}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'bookings',
          },
          (payload) => {
            // Check if this booking is relevant to this staff
            const booking = payload.new as { staff_id?: string | null; team_id?: string | null }
            const oldBooking = payload.old as { staff_id?: string | null; team_id?: string | null }

            const isRelevant =
              booking?.staff_id === staffId ||
              oldBooking?.staff_id === staffId ||
              (booking?.team_id && teamIds.includes(booking.team_id) && !booking.staff_id) ||
              (oldBooking?.team_id && teamIds.includes(oldBooking.team_id) && !oldBooking.staff_id)

            if (isRelevant) {
              // Refresh bookings data when a relevant booking changes
              fetchBookings()
            }
          }
        )
        .subscribe()

      return channel
    }

    const channelPromise = setupSubscription()

    return () => {
      channelPromise.then((channel) => {
        supabase.removeChannel(channel)
      })
    }
  }, [staffId, fetchBookings])

  return {
    staff,
    bookings,
    stats,
    monthlyData,
    loading,
    error,
    refresh,
  }
}
