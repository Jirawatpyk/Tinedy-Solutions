import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/auth-context'

export interface StaffBooking {
  id: string
  booking_date: string
  time_slot: string
  status: string
  notes: string | null
  created_at: string
  customers: {
    id: string
    full_name: string
    phone: string
  } | null
  service_packages: {
    id: string
    name: string
    duration: number
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
  const [stats, setStats] = useState<StaffStats>({
    jobsToday: 0,
    jobsThisWeek: 0,
    completionRate: 0,
    averageRating: 0,
    totalEarnings: 0,
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!user) return

    loadBookings()

    // Real-time subscription for new bookings
    const channel = supabase
      .channel('staff-bookings')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'bookings',
          filter: `staff_id=eq.${user.id}`,
        },
        () => {
          loadBookings()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [user])

  async function loadBookings() {
    if (!user) return

    try {
      setLoading(true)
      setError(null)

      const today = new Date()
      today.setHours(0, 0, 0, 0)
      const todayStr = today.toISOString().split('T')[0]

      const nextWeek = new Date(today)
      nextWeek.setDate(nextWeek.getDate() + 7)
      const nextWeekStr = nextWeek.toISOString().split('T')[0]

      // Fetch today's bookings
      const { data: todayData, error: todayError } = await supabase
        .from('bookings')
        .select(`
          *,
          customers (id, full_name, phone),
          service_packages (id, name, duration, price)
        `)
        .eq('staff_id', user.id)
        .eq('booking_date', todayStr)
        .order('time_slot', { ascending: true })

      if (todayError) throw todayError

      // Fetch upcoming bookings (next 7 days, excluding today)
      const { data: upcomingData, error: upcomingError } = await supabase
        .from('bookings')
        .select(`
          *,
          customers (id, full_name, phone),
          service_packages (id, name, duration, price)
        `)
        .eq('staff_id', user.id)
        .gt('booking_date', todayStr)
        .lte('booking_date', nextWeekStr)
        .order('booking_date', { ascending: true })
        .order('time_slot', { ascending: true })

      if (upcomingError) throw upcomingError

      setTodayBookings((todayData as any) || [])
      setUpcomingBookings((upcomingData as any) || [])

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
      const todayStr = today.toISOString().split('T')[0]

      // Get start of week (Monday)
      const startOfWeek = new Date(today)
      const day = startOfWeek.getDay()
      const diff = startOfWeek.getDate() - day + (day === 0 ? -6 : 1)
      startOfWeek.setDate(diff)
      const startOfWeekStr = startOfWeek.toISOString().split('T')[0]

      // Jobs today
      const { count: jobsTodayCount } = await supabase
        .from('bookings')
        .select('*', { count: 'exact', head: true })
        .eq('staff_id', user.id)
        .eq('booking_date', todayStr)

      // Jobs this week
      const { count: jobsWeekCount } = await supabase
        .from('bookings')
        .select('*', { count: 'exact', head: true })
        .eq('staff_id', user.id)
        .gte('booking_date', startOfWeekStr)
        .lte('booking_date', todayStr)

      // Completion rate (last 30 days)
      const thirtyDaysAgo = new Date(today)
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
      const thirtyDaysAgoStr = thirtyDaysAgo.toISOString().split('T')[0]

      const { count: totalJobs } = await supabase
        .from('bookings')
        .select('*', { count: 'exact', head: true })
        .eq('staff_id', user.id)
        .gte('booking_date', thirtyDaysAgoStr)
        .lte('booking_date', todayStr)

      const { count: completedJobs } = await supabase
        .from('bookings')
        .select('*', { count: 'exact', head: true })
        .eq('staff_id', user.id)
        .eq('status', 'completed')
        .gte('booking_date', thirtyDaysAgoStr)
        .lte('booking_date', todayStr)

      const completionRate = totalJobs ? ((completedJobs || 0) / totalJobs) * 100 : 0

      // Average rating (from reviews)
      const { data: reviews } = await supabase
        .from('reviews')
        .select('rating')
        .eq('staff_id', user.id)

      const avgRating = reviews && reviews.length > 0
        ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
        : 0

      // Total earnings this month
      const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1)
      const startOfMonthStr = startOfMonth.toISOString().split('T')[0]

      const { data: earningsData } = await supabase
        .from('bookings')
        .select(`
          service_packages (price)
        `)
        .eq('staff_id', user.id)
        .eq('status', 'completed')
        .gte('booking_date', startOfMonthStr)

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
    stats,
    loading,
    error,
    markAsCompleted,
    addNotes,
    refresh: loadBookings,
  }
}
