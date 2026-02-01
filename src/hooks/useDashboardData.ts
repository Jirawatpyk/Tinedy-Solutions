import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { format } from 'date-fns'
import { th } from 'date-fns/locale'
import { BookingStatus } from '@/types/booking'

interface Stats {
  totalBookings: number
  totalRevenue: number
  totalCustomers: number
  pendingBookings: number
}

interface StatsChange {
  bookingsChange: number
  revenueChange: number
  customersChange: number
  pendingChange: number
}

interface BookingStatusChart {
  status: string
  count: number
  color: string
}

interface TodayBooking {
  id: string
  booking_date: string
  start_time: string
  end_time: string
  status: string
  total_price: number
  address: string
  city: string
  state: string
  zip_code: string
  staff_id: string | null
  team_id: string | null
  service_package_id: string
  notes: string | null
  payment_status?: string
  payment_method?: string
  amount_paid?: number
  payment_date?: string
  payment_notes?: string
  customers: {
    id: string
    full_name: string
    phone: string
    email: string
  } | null
  service_packages: {
    name: string
    service_type: string
  } | null
  profiles: {
    full_name: string
  } | null
  teams: {
    name: string
  } | null
}

interface DailyRevenue {
  date: string
  revenue: number
}

interface DashboardData {
  stats: Stats
  statsChange: StatsChange
  bookingsByStatus: BookingStatusChart[]
  todayBookings: TodayBooking[]
  dailyRevenue: DailyRevenue[]
  loading: boolean
  error: Error | null
}

const statusColors: Record<string, string> = {
  confirmed: '#3b82f6',
  pending: '#f59e0b',
  in_progress: '#8b5cf6',
  completed: '#10b981',
  cancelled: '#ef4444',
}

/**
 * Custom hook for fetching dashboard data
 * Optimizes data fetching by using parallel queries
 */
export function useDashboardData(): DashboardData {
  const [stats, setStats] = useState<Stats>({
    totalBookings: 0,
    totalRevenue: 0,
    totalCustomers: 0,
    pendingBookings: 0,
  })
  const [statsChange, setStatsChange] = useState<StatsChange>({
    bookingsChange: 0,
    revenueChange: 0,
    customersChange: 0,
    pendingChange: 0,
  })
  const [bookingsByStatus, setBookingsByStatus] = useState<BookingStatusChart[]>([])
  const [todayBookings, setTodayBookings] = useState<TodayBooking[]>([])
  const [dailyRevenue, setDailyRevenue] = useState<DailyRevenue[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    fetchDashboardData()
  }, [])

  const fetchDashboardData = async () => {
    try {
      setLoading(true)
      setError(null)

      // Get Bangkok timezone date
      const now = new Date()
      const bangkokOffset = 7 * 60 * 60 * 1000
      const bangkokTime = new Date(now.getTime() + bangkokOffset)
      const today = bangkokTime.toISOString().split('T')[0]
      const todayStart = `${today}T00:00:00+07:00`
      const todayEnd = `${today}T23:59:59+07:00`

      // Get 7 days ago date
      const sevenDaysAgo = new Date()
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6)
      const sevenDaysAgoStr = sevenDaysAgo.toISOString().split('T')[0]

      // Parallel queries for better performance
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
        todayDataRes,
        revenueDataRes,
      ] = await Promise.all([
        // Total stats
        supabase.from('bookings').select('*', { count: 'exact', head: true }),
        supabase.from('bookings').select('total_price').eq('status', BookingStatus.Completed),
        supabase.from('customers').select('*', { count: 'exact', head: true }),
        supabase.from('bookings').select('*', { count: 'exact', head: true }).eq('status', BookingStatus.Pending),

        // Today's new data
        supabase.from('bookings').select('*', { count: 'exact' }).gte('created_at', todayStart).lte('created_at', todayEnd),
        supabase.from('bookings').select('total_price').eq('status', BookingStatus.Completed).gte('updated_at', todayStart).lte('updated_at', todayEnd),
        supabase.from('customers').select('*', { count: 'exact', head: true }).gte('created_at', todayStart).lte('created_at', todayEnd),
        supabase.from('bookings').select('*', { count: 'exact', head: true }).eq('status', BookingStatus.Pending).gte('created_at', todayStart).lte('created_at', todayEnd),

        // Bookings by status
        supabase.from('bookings').select('status'),

        // Today's bookings detail
        supabase.from('bookings').select(`
          *,
          customers (id, full_name, phone, email),
          service_packages (name, service_type),
          profiles!bookings_staff_id_fkey (full_name),
          teams (name)
        `).eq('booking_date', today).order('start_time', { ascending: true }),

        // Revenue data for last 7 days
        supabase.from('bookings').select('booking_date, total_price').eq('status', BookingStatus.Completed).gte('booking_date', sevenDaysAgoStr).order('booking_date', { ascending: true }),
      ])

      // Calculate total revenue
      const totalRevenue = completedBookingsRes.data?.reduce(
        (sum, booking) => sum + Number(booking.total_price),
        0
      ) || 0

      // Calculate today's revenue
      const todayRevenue = todayRevenueRes.data?.reduce(
        (sum, booking) => sum + Number(booking.total_price),
        0
      ) || 0

      // Set stats
      setStats({
        totalBookings: totalBookingsRes.count || 0,
        totalRevenue,
        totalCustomers: totalCustomersRes.count || 0,
        pendingBookings: pendingBookingsRes.count || 0,
      })

      setStatsChange({
        bookingsChange: todayBookingsRes.count || 0,
        revenueChange: todayRevenue,
        customersChange: todayCustomersRes.count || 0,
        pendingChange: todayPendingRes.count || 0,
      })

      // Process bookings by status
      const statusCounts: Record<string, number> = {}
      allBookingsStatusRes.data?.forEach((booking) => {
        statusCounts[booking.status] = (statusCounts[booking.status] || 0) + 1
      })

      const statusData: BookingStatusChart[] = Object.entries(statusCounts).map(([status, count]) => ({
        status: status.charAt(0).toUpperCase() + status.slice(1).replace('_', ' '),
        count,
        color: statusColors[status] || '#6b7280',
      }))

      setBookingsByStatus(statusData)

      // Set today's bookings
      setTodayBookings((todayDataRes.data as TodayBooking[]) || [])

      // Process daily revenue
      const revenueByDate: Record<string, number> = {}
      for (let i = 0; i < 7; i++) {
        const date = new Date()
        date.setDate(date.getDate() - (6 - i))
        const dateStr = date.toISOString().split('T')[0]
        revenueByDate[dateStr] = 0
      }

      revenueDataRes.data?.forEach((item) => {
        const dateStr = item.booking_date
        revenueByDate[dateStr] = (revenueByDate[dateStr] || 0) + Number(item.total_price)
      })

      const revenueArray: DailyRevenue[] = Object.entries(revenueByDate).map(([date, revenue]) => ({
        date: format(new Date(date), 'dd MMM', { locale: th }),
        revenue,
      }))

      setDailyRevenue(revenueArray)
    } catch (err) {
      console.error('Error fetching dashboard data:', err)
      setError(err as Error)
    } finally {
      setLoading(false)
    }
  }

  return {
    stats,
    statsChange,
    bookingsByStatus,
    todayBookings,
    dailyRevenue,
    loading,
    error,
  }
}
