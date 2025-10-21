import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/auth-context'

// Helper function to format full address
export function formatFullAddress(booking: { address: string; city: string; state: string; zip_code: string }): string {
  const parts = [
    booking.address,
    booking.city,
    booking.state,
    booking.zip_code
  ].filter(part => part && part.trim())

  return parts.join(', ')
}

export interface StaffBooking {
  id: string
  booking_date: string
  start_time: string
  end_time: string
  status: string
  notes: string | null
  address: string
  city: string
  state: string
  zip_code: string
  created_at: string
  staff_id: string | null
  team_id: string | null
  customers: {
    id: string
    full_name: string
    phone: string
    avatar_url: string | null
  } | null
  service_packages: {
    id: string
    name: string
    duration_minutes: number
    price: number
  } | null
}

export interface StaffStats {
  jobsToday: number
  jobsThisWeek: number
  completionRate: number
  averageRating: number
  totalEarnings: number
}

export function useStaffBookings() {
  const { user } = useAuth()
  const [todayBookings, setTodayBookings] = useState<StaffBooking[]>([])
  const [upcomingBookings, setUpcomingBookings] = useState<StaffBooking[]>([])
  const [completedBookings, setCompletedBookings] = useState<StaffBooking[]>([])
  const [stats, setStats] = useState<StaffStats>({
    jobsToday: 0,
    jobsThisWeek: 0,
    completionRate: 0,
    averageRating: 0,
    totalEarnings: 0,
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [myTeamIds, setMyTeamIds] = useState<string[]>([])
  const [teamsLoaded, setTeamsLoaded] = useState(false)

  // Load team membership once on mount
  useEffect(() => {
    if (!user) return
    checkTeamLeadStatus()
  }, [user])

  // Load bookings when teams are loaded or changed
  useEffect(() => {
    if (!user || !teamsLoaded) return

    loadBookings()

    // Real-time subscription for new bookings
    // Note: Supabase realtime filters don't support OR conditions directly
    // We'll subscribe to all changes and filter in the callback
    const channel = supabase
      .channel('staff-bookings')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'bookings',
        },
        (payload) => {
          const booking = payload.new as any

          // Reload if booking is for current user OR for any team they belong to
          const isMyBooking = booking.staff_id === user.id
          const isMyTeamBooking = booking.team_id && myTeamIds.includes(booking.team_id)

          if (isMyBooking || isMyTeamBooking) {
            loadBookings()
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [user, teamsLoaded, myTeamIds.join(',')])

  async function checkTeamLeadStatus() {
    if (!user) return

    try {
      // Get teams where user is a member
      const { data: memberTeams } = await supabase
        .from('team_members')
        .select('team_id')
        .eq('user_id', user.id)
        .eq('is_active', true)

      // Get teams where user is the lead
      const { data: leadTeams } = await supabase
        .from('teams')
        .select('id')
        .eq('team_lead_id', user.id)
        .eq('is_active', true)

      const memberTeamIds = memberTeams?.map(m => m.team_id) || []
      const leadTeamIds = leadTeams?.map(t => t.id) || []

      // Combine and deduplicate
      const allTeamIds = [...new Set([...memberTeamIds, ...leadTeamIds])]
      setMyTeamIds(allTeamIds)
      setTeamsLoaded(true)

      console.log('[StaffBookings] Team Membership:', {
        userId: user.id,
        isLead: leadTeamIds.length > 0,
        memberOfTeams: memberTeamIds.length,
        leadOfTeams: leadTeamIds.length,
        totalTeams: allTeamIds.length,
        teamIds: allTeamIds
      })
    } catch (err) {
      console.error('Error checking team membership:', err)
      setTeamsLoaded(true) // Still mark as loaded even on error
    }
  }

  async function loadBookings() {
    if (!user) return

    try {
      setLoading(true)
      setError(null)

      const today = new Date()
      today.setHours(0, 0, 0, 0)

      // Use local timezone instead of UTC to avoid date shifting
      const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`

      console.log('[StaffBookings] Today:', {
        todayDate: today,
        todayStr,
        localDate: today.toLocaleDateString('th-TH'),
      })

      const nextWeek = new Date(today)
      nextWeek.setDate(nextWeek.getDate() + 7)
      const nextWeekStr = `${nextWeek.getFullYear()}-${String(nextWeek.getMonth() + 1).padStart(2, '0')}-${String(nextWeek.getDate()).padStart(2, '0')}`

      // Fetch today's bookings
      let todayQuery = supabase
        .from('bookings')
        .select(`
          *,
          customers (id, full_name, phone, avatar_url),
          service_packages (id, name, duration_minutes, price)
        `)

      // If user belongs to any team, fetch team bookings too
      if (myTeamIds.length > 0) {
        todayQuery = todayQuery.or(`staff_id.eq.${user.id},team_id.in.(${myTeamIds.join(',')})`)
      } else {
        todayQuery = todayQuery.eq('staff_id', user.id)
      }

      const { data: todayData, error: todayError } = await todayQuery
        .eq('booking_date', todayStr)
        .order('start_time', { ascending: true })

      if (todayError) throw todayError

      console.log('[StaffBookings] Today result:', {
        count: todayData?.length || 0,
        bookings: todayData?.map(b => ({ date: b.booking_date, time: b.start_time }))
      })

      // Fetch upcoming bookings (next 7 days, excluding today)
      let upcomingQuery = supabase
        .from('bookings')
        .select(`
          *,
          customers (id, full_name, phone, avatar_url),
          service_packages (id, name, duration_minutes, price)
        `)

      // If user belongs to any team, fetch team bookings too
      if (myTeamIds.length > 0) {
        upcomingQuery = upcomingQuery.or(`staff_id.eq.${user.id},team_id.in.(${myTeamIds.join(',')})`)
      } else {
        upcomingQuery = upcomingQuery.eq('staff_id', user.id)
      }

      const { data: upcomingData, error: upcomingError} = await upcomingQuery
        .gt('booking_date', todayStr)
        .lte('booking_date', nextWeekStr)
        .order('booking_date', { ascending: true })
        .order('start_time', { ascending: true })

      if (upcomingError) throw upcomingError

      // Fetch past bookings (last 30 days) - all statuses
      const thirtyDaysAgo = new Date(today)
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
      const thirtyDaysAgoStr = `${thirtyDaysAgo.getFullYear()}-${String(thirtyDaysAgo.getMonth() + 1).padStart(2, '0')}-${String(thirtyDaysAgo.getDate()).padStart(2, '0')}`

      let completedQuery = supabase
        .from('bookings')
        .select(`
          *,
          customers (id, full_name, phone, avatar_url),
          service_packages (id, name, duration_minutes, price)
        `)

      // If user belongs to any team, fetch team bookings too
      if (myTeamIds.length > 0) {
        completedQuery = completedQuery.or(`staff_id.eq.${user.id},team_id.in.(${myTeamIds.join(',')})`)
      } else {
        completedQuery = completedQuery.eq('staff_id', user.id)
      }

      const { data: completedData, error: completedError } = await completedQuery
        .lt('booking_date', todayStr)
        .gte('booking_date', thirtyDaysAgoStr)
        .order('booking_date', { ascending: false })
        .order('start_time', { ascending: false })

      if (completedError) throw completedError

      setTodayBookings((todayData as any) || [])
      setUpcomingBookings((upcomingData as any) || [])
      setCompletedBookings((completedData as any) || [])

      // Calculate stats
      await calculateStats()
    } catch (err: any) {
      console.error('Error loading bookings:', err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  async function calculateStats() {
    if (!user) return

    try {
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`

      // Get start of week (Monday)
      const startOfWeek = new Date(today)
      const day = startOfWeek.getDay()
      const diff = startOfWeek.getDate() - day + (day === 0 ? -6 : 1)
      startOfWeek.setDate(diff)
      const startOfWeekStr = `${startOfWeek.getFullYear()}-${String(startOfWeek.getMonth() + 1).padStart(2, '0')}-${String(startOfWeek.getDate()).padStart(2, '0')}`

      // Jobs today - include team bookings if user belongs to any team
      let jobsTodayQuery = supabase
        .from('bookings')
        .select('*', { count: 'exact', head: true })
        .eq('booking_date', todayStr)

      if (myTeamIds.length > 0) {
        jobsTodayQuery = jobsTodayQuery.or(`staff_id.eq.${user.id},team_id.in.(${myTeamIds.join(',')})`)
      } else {
        jobsTodayQuery = jobsTodayQuery.eq('staff_id', user.id)
      }

      const { count: jobsTodayCount } = await jobsTodayQuery

      // Jobs this week - include team bookings if user belongs to any team
      let jobsWeekQuery = supabase
        .from('bookings')
        .select('*', { count: 'exact', head: true })
        .gte('booking_date', startOfWeekStr)
        .lte('booking_date', todayStr)

      if (myTeamIds.length > 0) {
        jobsWeekQuery = jobsWeekQuery.or(`staff_id.eq.${user.id},team_id.in.(${myTeamIds.join(',')})`)
      } else {
        jobsWeekQuery = jobsWeekQuery.eq('staff_id', user.id)
      }

      const { count: jobsWeekCount } = await jobsWeekQuery

      // Completion rate (last 30 days) - include team bookings if user belongs to any team
      const thirtyDaysAgo = new Date(today)
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
      const thirtyDaysAgoStr = `${thirtyDaysAgo.getFullYear()}-${String(thirtyDaysAgo.getMonth() + 1).padStart(2, '0')}-${String(thirtyDaysAgo.getDate()).padStart(2, '0')}`

      let totalJobsQuery = supabase
        .from('bookings')
        .select('*', { count: 'exact', head: true })
        .gte('booking_date', thirtyDaysAgoStr)
        .lte('booking_date', todayStr)

      if (myTeamIds.length > 0) {
        totalJobsQuery = totalJobsQuery.or(`staff_id.eq.${user.id},team_id.in.(${myTeamIds.join(',')})`)
      } else {
        totalJobsQuery = totalJobsQuery.eq('staff_id', user.id)
      }

      const { count: totalJobs } = await totalJobsQuery

      let completedJobsQuery = supabase
        .from('bookings')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'completed')
        .gte('booking_date', thirtyDaysAgoStr)
        .lte('booking_date', todayStr)

      if (myTeamIds.length > 0) {
        completedJobsQuery = completedJobsQuery.or(`staff_id.eq.${user.id},team_id.in.(${myTeamIds.join(',')})`)
      } else {
        completedJobsQuery = completedJobsQuery.eq('staff_id', user.id)
      }

      const { count: completedJobs } = await completedJobsQuery

      const completionRate = totalJobs ? ((completedJobs || 0) / totalJobs) * 100 : 0

      // Average rating (from reviews) - only for personal bookings
      let avgRating = 0
      try {
        const { data: reviews, error: reviewError } = await supabase
          .from('reviews')
          .select('rating')
          .eq('staff_id', user.id)

        // Ignore error if reviews table doesn't exist
        if (!reviewError && reviews && reviews.length > 0) {
          avgRating = reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
        }
      } catch (err) {
        // Reviews table might not exist, ignore error
        console.log('Reviews table not found, skipping rating calculation')
      }

      // Total earnings this month - include team bookings if user belongs to any team
      const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1)
      const startOfMonthStr = `${startOfMonth.getFullYear()}-${String(startOfMonth.getMonth() + 1).padStart(2, '0')}-${String(startOfMonth.getDate()).padStart(2, '0')}`

      let earningsQuery = supabase
        .from('bookings')
        .select(`
          service_packages (price)
        `)
        .eq('status', 'completed')
        .gte('booking_date', startOfMonthStr)

      if (myTeamIds.length > 0) {
        earningsQuery = earningsQuery.or(`staff_id.eq.${user.id},team_id.in.(${myTeamIds.join(',')})`)
      } else {
        earningsQuery = earningsQuery.eq('staff_id', user.id)
      }

      const { data: earningsData } = await earningsQuery

      const totalEarnings = earningsData?.reduce((sum, booking: any) => {
        return sum + (booking.service_packages?.price || 0)
      }, 0) || 0

      setStats({
        jobsToday: jobsTodayCount || 0,
        jobsThisWeek: jobsWeekCount || 0,
        completionRate: Math.round(completionRate),
        averageRating: Math.round(avgRating * 10) / 10,
        totalEarnings,
      })
    } catch (err) {
      console.error('Error calculating stats:', err)
    }
  }

  async function startProgress(bookingId: string) {
    try {
      const { error } = await supabase
        .from('bookings')
        .update({ status: 'in_progress' })
        .eq('id', bookingId)

      if (error) throw error

      // Reload bookings to reflect changes
      await loadBookings()
    } catch (err: any) {
      console.error('Error starting progress:', err)
      throw err
    }
  }

  async function markAsCompleted(bookingId: string) {
    try {
      const { error } = await supabase
        .from('bookings')
        .update({ status: 'completed' })
        .eq('id', bookingId)

      if (error) throw error

      // Reload bookings to reflect changes
      await loadBookings()
    } catch (err: any) {
      console.error('Error marking as completed:', err)
      throw err
    }
  }

  async function addNotes(bookingId: string, notes: string) {
    try {
      const { error } = await supabase
        .from('bookings')
        .update({ notes })
        .eq('id', bookingId)

      if (error) throw error

      // Reload bookings to reflect changes
      await loadBookings()
    } catch (err: any) {
      console.error('Error adding notes:', err)
      throw err
    }
  }

  return {
    todayBookings,
    upcomingBookings,
    completedBookings,
    stats,
    loading,
    error,
    startProgress,
    markAsCompleted,
    addNotes,
    refresh: loadBookings,
  }
}
