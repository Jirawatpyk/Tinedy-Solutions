import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/auth-context'
import { mapErrorToUserMessage } from '@/lib/error-messages'
import { logger } from '@/lib/logger'
import type { StaffBooking } from '@/lib/queries/staff-bookings-queries'

// Types for realtime payload
interface RealtimeBookingPayload {
  staff_id: string | null
  team_id: string | null
  [key: string]: unknown
}

interface ReviewData {
  rating: number
}

// Re-export StaffBooking from queries for backward compatibility
export type { StaffBooking }

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
  const isFetchingRef = useRef(false)

  const checkTeamLeadStatus = useCallback(async () => {
    if (!user) return

    try {
      // Get teams where user is a member
      const { data: memberTeams } = await supabase
        .from('team_members')
        .select('team_id')
        .eq('staff_id', user.id)
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

      logger.debug('Team Membership', {
        userId: user.id,
        isLead: leadTeamIds.length > 0,
        memberOfTeams: memberTeamIds.length,
        leadOfTeams: leadTeamIds.length,
        totalTeams: allTeamIds.length,
        teamIds: allTeamIds
      }, { context: 'StaffBookings' })
    } catch (err) {
      logger.error('Error checking team membership', { error: err }, { context: 'StaffBookings' })
      setTeamsLoaded(true) // Still mark as loaded even on error
    }
  }, [user])

  const calculateStats = useCallback(async () => {
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

      // Get end of week (Sunday)
      const endOfWeek = new Date(startOfWeek)
      endOfWeek.setDate(endOfWeek.getDate() + 6)
      const endOfWeekStr = `${endOfWeek.getFullYear()}-${String(endOfWeek.getMonth() + 1).padStart(2, '0')}-${String(endOfWeek.getDate()).padStart(2, '0')}`

      const thirtyDaysAgo = new Date(today)
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
      const thirtyDaysAgoStr = `${thirtyDaysAgo.getFullYear()}-${String(thirtyDaysAgo.getMonth() + 1).padStart(2, '0')}-${String(thirtyDaysAgo.getDate()).padStart(2, '0')}`

      const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1)
      const startOfMonthStr = `${startOfMonth.getFullYear()}-${String(startOfMonth.getMonth() + 1).padStart(2, '0')}-${String(startOfMonth.getDate()).padStart(2, '0')}`

      // Build filter condition
      const filterCondition = myTeamIds.length > 0
        ? `staff_id.eq.${user.id},team_id.in.(${myTeamIds.join(',')})`
        : null

      // Run all queries in parallel
      const [
        jobsTodayResult,
        jobsWeekResult,
        totalJobsResult,
        completedJobsResult,
        reviewsResult,
        earningsResult
      ] = await Promise.all([
        // Jobs today
        (async () => {
          let query = supabase
            .from('bookings')
            .select('*', { count: 'exact', head: true })
            .eq('booking_date', todayStr)
          if (filterCondition) {
            query = query.or(filterCondition)
          } else {
            query = query.eq('staff_id', user.id)
          }
          const r = await query
          return r.count
        })(),

        // Jobs this week
        (async () => {
          let query = supabase
            .from('bookings')
            .select('*', { count: 'exact', head: true })
            .gte('booking_date', startOfWeekStr)
            .lte('booking_date', endOfWeekStr)
          if (filterCondition) {
            query = query.or(filterCondition)
          } else {
            query = query.eq('staff_id', user.id)
          }
          const r = await query
          return r.count
        })(),

        // Total jobs (30 days)
        (async () => {
          let query = supabase
            .from('bookings')
            .select('*', { count: 'exact', head: true })
            .gte('booking_date', thirtyDaysAgoStr)
            .lte('booking_date', todayStr)
          if (filterCondition) {
            query = query.or(filterCondition)
          } else {
            query = query.eq('staff_id', user.id)
          }
          const r = await query
          return r.count
        })(),

        // Completed jobs (30 days)
        (async () => {
          let query = supabase
            .from('bookings')
            .select('*', { count: 'exact', head: true })
            .eq('status', 'completed')
            .gte('booking_date', thirtyDaysAgoStr)
            .lte('booking_date', todayStr)
          if (filterCondition) {
            query = query.or(filterCondition)
          } else {
            query = query.eq('staff_id', user.id)
          }
          const r = await query
          return r.count
        })(),

        // Reviews
        (async () => {
          try {
            const { data } = await supabase
              .from('reviews')
              .select('rating')
              .eq('staff_id', user.id)
            return data
          } catch {
            return null
          }
        })(),

        // Earnings
        (async () => {
          let query = supabase
            .from('bookings')
            .select('service_packages (price), service_packages_v2:package_v2_id (name), total_price')
            .eq('status', 'completed')
            .gte('booking_date', startOfMonthStr)
          if (filterCondition) {
            query = query.or(filterCondition)
          } else {
            query = query.eq('staff_id', user.id)
          }
          const r = await query
          return r.data
        })()
      ])

      // Calculate stats from results
      const completionRate = totalJobsResult ? ((completedJobsResult || 0) / totalJobsResult) * 100 : 0
      const avgRating = reviewsResult && reviewsResult.length > 0
        ? reviewsResult.reduce((sum: number, r: ReviewData) => sum + r.rating, 0) / reviewsResult.length
        : 0

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const totalEarnings = (earningsResult as any[])?.reduce((sum, booking) => {
        // Use total_price for both V1 and V2 bookings
        return sum + (booking.total_price || 0)
      }, 0) || 0

      setStats({
        jobsToday: jobsTodayResult || 0,
        jobsThisWeek: jobsWeekResult || 0,
        completionRate: Math.round(completionRate),
        averageRating: Math.round(avgRating * 10) / 10,
        totalEarnings,
      })
    } catch (err) {
      logger.error('Error calculating stats', { error: err }, { context: 'StaffBookings' })
    }
  }, [user, myTeamIds])

  const loadBookings = useCallback(async () => {
    if (!user) return

    try {
      setLoading(true)
      setError(null)

      const today = new Date()
      today.setHours(0, 0, 0, 0)

      // Use local timezone instead of UTC to avoid date shifting
      const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`

      logger.debug('Today', {
        todayDate: today,
        todayStr,
        localDate: today.toLocaleDateString('th-TH'),
      }, { context: 'StaffBookings' })

      const nextWeek = new Date(today)
      nextWeek.setDate(nextWeek.getDate() + 7)
      const nextWeekStr = `${nextWeek.getFullYear()}-${String(nextWeek.getMonth() + 1).padStart(2, '0')}-${String(nextWeek.getDate()).padStart(2, '0')}`

      const thirtyDaysAgo = new Date(today)
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
      const thirtyDaysAgoStr = `${thirtyDaysAgo.getFullYear()}-${String(thirtyDaysAgo.getMonth() + 1).padStart(2, '0')}-${String(thirtyDaysAgo.getDate()).padStart(2, '0')}`

      // Build filter condition for team bookings
      const filterCondition = myTeamIds.length > 0
        ? `staff_id.eq.${user.id},team_id.in.(${myTeamIds.join(',')})`
        : null

      // ✅ Fetch all bookings in parallel using Promise.all
      const [todayResult, upcomingResult, completedResult] = await Promise.all([
        // Today's bookings
        (async () => {
          let query = supabase
            .from('bookings')
            .select(`
              *,
              customers!customer_id (id, full_name, phone, avatar_url),
              service_packages (id, name, duration_minutes, price),
              service_packages_v2:package_v2_id (id, name)
            `)
            .eq('booking_date', todayStr)
            .order('start_time', { ascending: true })

          if (filterCondition) {
            query = query.or(filterCondition)
          } else {
            query = query.eq('staff_id', user.id)
          }

          return await query
        })(),

        // Upcoming bookings (next 7 days, excluding today)
        (async () => {
          let query = supabase
            .from('bookings')
            .select(`
              *,
              customers!customer_id (id, full_name, phone, avatar_url),
              service_packages (id, name, duration_minutes, price),
              service_packages_v2:package_v2_id (id, name)
            `)
            .gt('booking_date', todayStr)
            .lte('booking_date', nextWeekStr)
            .order('booking_date', { ascending: true })
            .order('start_time', { ascending: true })

          if (filterCondition) {
            query = query.or(filterCondition)
          } else {
            query = query.eq('staff_id', user.id)
          }

          return await query
        })(),

        // Past bookings (last 30 days)
        (async () => {
          let query = supabase
            .from('bookings')
            .select(`
              *,
              customers!customer_id (id, full_name, phone, avatar_url),
              service_packages (id, name, duration_minutes, price),
              service_packages_v2:package_v2_id (id, name)
            `)
            .lt('booking_date', todayStr)
            .gte('booking_date', thirtyDaysAgoStr)
            .order('booking_date', { ascending: false })
            .order('start_time', { ascending: false })

          if (filterCondition) {
            query = query.or(filterCondition)
          } else {
            query = query.eq('staff_id', user.id)
          }

          return await query
        })(),
      ])

      // Check for errors
      if (todayResult.error) throw todayResult.error
      if (upcomingResult.error) throw upcomingResult.error
      if (completedResult.error) throw completedResult.error

      logger.debug('Today result', {
        count: todayResult.data?.length || 0,
        bookings: todayResult.data?.map(b => ({ date: b.booking_date, time: b.start_time }))
      }, { context: 'StaffBookings' })

      // Merge V1 and V2 package data for all results
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const mergePackages = (bookings: any[]) => {
        return bookings.map(booking => ({
          ...booking,
          service_packages: booking.service_packages || booking.service_packages_v2
        }))
      }

      const todayData = mergePackages(todayResult.data || [])
      const upcomingData = mergePackages(upcomingResult.data || [])
      const completedData = mergePackages(completedResult.data || [])

      setTodayBookings(todayData as StaffBooking[])
      setUpcomingBookings(upcomingData as StaffBooking[])
      setCompletedBookings(completedData as StaffBooking[])
    } catch (err) {
      logger.error('Error loading bookings', { error: err }, { context: 'StaffBookings' })
      const errorMsg = mapErrorToUserMessage(err, 'booking')
      setError(errorMsg.description)
      setLoading(false)
    }
    // ไม่ setLoading(false) ที่นี่ เพราะยัง calculateStats() ไม่เสร็จ
  }, [user, myTeamIds])

  // Load team membership once on mount
  useEffect(() => {
    if (!user) return
    checkTeamLeadStatus()
  }, [user, checkTeamLeadStatus])

  // Load bookings when teams are loaded or changed
  useEffect(() => {
    logger.debug('useEffect triggered', {
      user: !!user,
      teamsLoaded,
      myTeamIds: myTeamIds.length,
      isFetching: isFetchingRef.current
    }, { context: 'StaffBookings' })

    if (!user || !teamsLoaded) return

    const fetchData = async () => {
      // ป้องกันการโหลดซ้ำ - เช็คและตั้งค่าพร้อมกัน
      if (isFetchingRef.current) {
        logger.debug('Already fetching, skipping...', {}, { context: 'StaffBookings' })
        return
      }

      isFetchingRef.current = true
      logger.debug('Start fetching bookings and stats...', {}, { context: 'StaffBookings' })

      try {
        await loadBookings()
        await calculateStats()
        logger.debug('Fetch complete', {}, { context: 'StaffBookings' })
        setLoading(false)  // ✅ เซ็ต loading = false หลังจากทุกอย่างเสร็จ
      } catch (error) {
        logger.error('Fetch error', { error }, { context: 'StaffBookings' })
        setLoading(false)  // เซ็ต false เมื่อเกิด error ด้วย
      } finally {
        // รอสักครู่ก่อน reset flag เพื่อให้ useEffect ครั้งที่ 2 เห็น flag = true
        setTimeout(() => {
          isFetchingRef.current = false
        }, 100)
      }
    }

    fetchData()

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
          const booking = payload.new as RealtimeBookingPayload

          // Reload if booking is for current user OR for any team they belong to
          const isMyBooking = booking?.staff_id === user.id
          const isMyTeamBooking = booking?.team_id && myTeamIds.includes(booking.team_id)

          if (isMyBooking || isMyTeamBooking) {
            // ถ้าเป็น UPDATE event ให้ข้ามการโหลดใหม่
            // เพราะเรามี optimistic update ที่จัดการไว้แล้วใน addNotes(), startProgress(), markAsCompleted()
            if (payload.eventType === 'UPDATE') {
              return
            }

            // โหลดใหม่เฉพาะ INSERT และ DELETE เท่านั้น
            fetchData()
          }
        }
      )
      .subscribe()

    return () => {
      logger.debug('Cleanup', {}, { context: 'StaffBookings' })
      supabase.removeChannel(channel)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, teamsLoaded, myTeamIds])

  async function startProgress(bookingId: string) {
    try {
      // Optimistic update - update state immediately without reloading
      const updateBookingStatus = (bookings: StaffBooking[]) =>
        bookings.map(b => b.id === bookingId ? { ...b, status: 'in_progress' } : b)

      setTodayBookings(prev => updateBookingStatus(prev))
      setUpcomingBookings(prev => updateBookingStatus(prev))
      setCompletedBookings(prev => updateBookingStatus(prev))

      const { error } = await supabase
        .from('bookings')
        .update({ status: 'in_progress' })
        .eq('id', bookingId)

      if (error) throw error

      // Real-time subscription will handle updating other connected clients
    } catch (err) {
      logger.error('Error starting progress', { error: err }, { context: 'StaffBookings' })
      // Revert optimistic update on error
      await loadBookings()
      throw err
    }
  }

  async function markAsCompleted(bookingId: string) {
    try {
      // Optimistic update - update status immediately for all lists
      const updateBookingStatus = (bookings: StaffBooking[]) =>
        bookings.map(b => b.id === bookingId ? { ...b, status: 'completed' } : b)

      setTodayBookings(prev => updateBookingStatus(prev))
      setUpcomingBookings(prev => updateBookingStatus(prev))
      setCompletedBookings(prev => updateBookingStatus(prev))

      const { error } = await supabase
        .from('bookings')
        .update({ status: 'completed' })
        .eq('id', bookingId)

      if (error) throw error

      // Real-time subscription will handle updating other connected clients
    } catch (err) {
      logger.error('Error marking as completed', { error: err }, { context: 'StaffBookings' })
      // Revert optimistic update on error
      await loadBookings()
      throw err
    }
  }

  async function addNotes(bookingId: string, notes: string) {
    try {
      // Optimistic update - update notes immediately
      const updateBookingNotes = (bookings: StaffBooking[]) =>
        bookings.map(b => b.id === bookingId ? { ...b, notes } : b)

      setTodayBookings(prev => updateBookingNotes(prev))
      setUpcomingBookings(prev => updateBookingNotes(prev))
      setCompletedBookings(prev => updateBookingNotes(prev))

      const { error } = await supabase
        .from('bookings')
        .update({ notes })
        .eq('id', bookingId)

      if (error) throw error

      // Real-time subscription will handle updating other connected clients
    } catch (err) {
      logger.error('Error adding notes', { error: err }, { context: 'StaffBookings' })
      // Revert optimistic update on error
      await loadBookings()
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
