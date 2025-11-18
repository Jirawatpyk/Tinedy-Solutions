import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { format } from 'date-fns'
import { getBangkokToday, getDateDaysAgo } from '@/lib/dashboard-utils'
import type { DashboardData, Stats, StatsChange, BookingStatus, TodayBooking, DailyRevenue, MiniStats } from '@/types/dashboard'

interface BookingWithService {
  service_packages?: { name: string }[] | { name: string } | null
  service_packages_v2?: { name: string }[] | { name: string } | null
  total_price?: number
  status?: string
}

export function useDashboardStats() {
  const [data, setData] = useState<DashboardData>({
    stats: { totalBookings: 0, totalRevenue: 0, totalCustomers: 0, pendingBookings: 0 },
    statsChange: { bookingsChange: 0, revenueChange: 0, customersChange: 0, pendingChange: 0 },
    bookingsByStatus: [],
    todayBookings: [],
    dailyRevenue: [],
    miniStats: { topService: null, avgBookingValue: 0, completionRate: 0 },
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const isFetchingRef = useRef(false)
  const isInitialLoadRef = useRef(true)

  const fetchDashboardData = useCallback(async () => {
    // Prevent duplicate fetches
    if (isFetchingRef.current) {
      console.log('[Dashboard] Already fetching, skipping...')
      return
    }

    isFetchingRef.current = true
    // Only show loading skeleton on initial load
    if (isInitialLoadRef.current) {
      setLoading(true)
    }
    setError(null)

    try {
      console.log('[Dashboard] Fetching dashboard data...')

      // Calculate dates
      const { todayStr, todayStart, todayEnd } = getBangkokToday()
      const sevenDaysAgoStr = getDateDaysAgo(6)

      // Run all queries in parallel using Promise.all
      const [
        totalBookingsRes,
        completedBookingsRes,
        totalCustomersRes,
        pendingBookingsRes,
        todayBookingsRes,
        todayRevenueRes,
        todayCustomersRes,
        todayPendingRes,
        allBookingsStatusRes,
        todayBookingsDataRes,
        revenueDataRes,
      ] = await Promise.all([
        // Total stats
        supabase.from('bookings').select('*', { count: 'exact', head: true }),
        supabase.from('bookings').select('total_price').eq('payment_status', 'paid'),
        supabase.from('customers').select('*', { count: 'exact', head: true }),
        supabase.from('bookings').select('*', { count: 'exact', head: true }).eq('status', 'pending'),

        // Today's stats
        supabase.from('bookings').select('*', { count: 'exact' }).gte('created_at', todayStart).lte('created_at', todayEnd),
        supabase.from('bookings').select('total_price').eq('payment_status', 'paid').gte('updated_at', todayStart).lte('updated_at', todayEnd),
        supabase.from('customers').select('*', { count: 'exact', head: true }).gte('created_at', todayStart).lte('created_at', todayEnd),
        supabase.from('bookings').select('*', { count: 'exact', head: true }).eq('status', 'pending').gte('created_at', todayStart).lte('created_at', todayEnd),

        // Bookings by status
        supabase.from('bookings').select('status'),

        // Today's bookings detail (V1 + V2)
        supabase.from('bookings').select(`
          *,
          customers (id, full_name, phone, email),
          service_packages (name, service_type),
          service_packages_v2:package_v2_id (name, service_type),
          profiles!bookings_staff_id_fkey (full_name),
          teams (name)
        `).eq('booking_date', todayStr).order('start_time', { ascending: true }),

        // Revenue data (last 7 days)
        supabase.from('bookings').select('payment_date, total_price').eq('payment_status', 'paid').gte('payment_date', sevenDaysAgoStr).lte('payment_date', todayStr).order('payment_date', { ascending: true }),
      ])

      // Process total revenue
      const totalRevenue = completedBookingsRes.data?.reduce(
        (sum, booking) => sum + Number(booking.total_price),
        0
      ) || 0

      // Process today's revenue
      const todayRevenue = todayRevenueRes.data?.reduce(
        (sum, booking) => sum + Number(booking.total_price),
        0
      ) || 0

      // Set stats
      const stats: Stats = {
        totalBookings: totalBookingsRes.count || 0,
        totalRevenue,
        totalCustomers: totalCustomersRes.count || 0,
        pendingBookings: pendingBookingsRes.count || 0,
      }

      const statsChange: StatsChange = {
        bookingsChange: todayBookingsRes.count || 0,
        revenueChange: todayRevenue,
        customersChange: todayCustomersRes.count || 0,
        pendingChange: todayPendingRes.count || 0,
      }

      // Process bookings by status
      const statusCounts: Record<string, number> = {}
      allBookingsStatusRes.data?.forEach((booking) => {
        statusCounts[booking.status] = (statusCounts[booking.status] || 0) + 1
      })

      const statusColors: Record<string, string> = {
        confirmed: '#3b82f6', // blue-500
        pending: '#f59e0b', // amber-500
        in_progress: '#8b5cf6', // violet-500
        completed: '#22c55e', // green-500
        cancelled: '#ef4444', // red-500
      }

      const bookingsByStatus: BookingStatus[] = Object.entries(statusCounts).map(([status, count]) => ({
        status: status.charAt(0).toUpperCase() + status.slice(1).replace('_', ' '),
        count,
        color: statusColors[status] || '#6b7280',
      }))

      // Set today's bookings
      const todayBookings = (todayBookingsDataRes.data as TodayBooking[]) || []

      // Process revenue data
      const revenueByDate: Record<string, number> = {}
      for (let i = 0; i < 7; i++) {
        const date = new Date()
        date.setDate(date.getDate() - (6 - i))
        const dateStr = date.toISOString().split('T')[0]
        revenueByDate[dateStr] = 0
      }

      revenueDataRes.data?.forEach((item: { payment_date: string | null; total_price: number }) => {
        const dateStr = item.payment_date
        if (dateStr) {
          revenueByDate[dateStr] = (revenueByDate[dateStr] || 0) + Number(item.total_price)
        }
      })

      const dailyRevenue: DailyRevenue[] = Object.entries(revenueByDate).map(([date, revenue]) => ({
        date: format(new Date(date), 'dd MMM'),
        revenue,
      }))

      // Calculate Mini Stats
      const { data: allBookingsWithServices } = await supabase
        .from('bookings')
        .select('total_price, status, service_packages(name), service_packages_v2:package_v2_id(name)')

      // 1. Top Service
      const fullServiceCount: Record<string, { name: string; count: number }> = {}
      allBookingsWithServices?.forEach((booking: BookingWithService) => {
        const rawPackage = booking.service_packages || booking.service_packages_v2
        const servicePackage = Array.isArray(rawPackage) ? rawPackage[0] : rawPackage
        const serviceName = servicePackage?.name
        if (serviceName) {
          if (!fullServiceCount[serviceName]) {
            fullServiceCount[serviceName] = { name: serviceName, count: 0 }
          }
          fullServiceCount[serviceName].count++
        }
      })

      const topService = Object.values(fullServiceCount).sort((a, b) => b.count - a.count)[0] || null

      // 2. Average Booking Value
      const totalBookingValue = allBookingsWithServices?.reduce(
        (sum, booking) => sum + Number(booking.total_price),
        0
      ) || 0
      const avgBookingValue = allBookingsWithServices && allBookingsWithServices.length > 0
        ? totalBookingValue / allBookingsWithServices.length
        : 0

      // 3. Completion Rate
      const completedCount = allBookingsWithServices?.filter(b => b.status === 'completed').length || 0
      const completionRate = allBookingsWithServices && allBookingsWithServices.length > 0
        ? (completedCount / allBookingsWithServices.length) * 100
        : 0

      const miniStats: MiniStats = {
        topService,
        avgBookingValue,
        completionRate,
      }

      setData({
        stats,
        statsChange,
        bookingsByStatus,
        todayBookings,
        dailyRevenue,
        miniStats,
      })

      console.log('[Dashboard] Data fetched successfully')
    } catch (err) {
      console.error('[Dashboard] Error fetching data:', err)
      setError(err instanceof Error ? err.message : 'Failed to fetch dashboard data')
    } finally {
      // Only set loading to false on initial load
      if (isInitialLoadRef.current) {
        setLoading(false)
        isInitialLoadRef.current = false
      }
      setTimeout(() => {
        isFetchingRef.current = false
      }, 100)
    }
  }, [])

  useEffect(() => {
    console.log('[Dashboard] Initial load')
    fetchDashboardData()

    // Realtime subscription
    const channel = supabase
      .channel('dashboard-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'bookings',
        },
        (payload) => {
          console.log('[Dashboard] Booking changed:', payload.eventType)
          // Refetch data when bookings change
          fetchDashboardData()
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'customers',
        },
        () => {
          console.log('[Dashboard] Customer added')
          fetchDashboardData()
        }
      )
      .subscribe()

    return () => {
      console.log('[Dashboard] Cleanup subscription')
      supabase.removeChannel(channel)
    }
  }, [fetchDashboardData])

  return {
    ...data,
    loading,
    error,
    refresh: fetchDashboardData,
  }
}
