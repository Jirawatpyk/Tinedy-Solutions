/**
 * Dashboard Query Functions
 *
 * React Query functions สำหรับ Dashboard data
 * แยก queries ออกเป็นส่วนๆ เพื่อ caching ที่ดีกว่า
 *
 * Features:
 * - Automatic caching (5 minutes for stats, 1 minute for today's data)
 * - Parallel fetching with React Query
 * - Realtime subscription support
 * - Type-safe query keys
 */

import { supabase } from '@/lib/supabase'
import { queryKeys } from '@/lib/query-keys'
import { format } from 'date-fns'
import { getBangkokToday, getDateDaysAgo } from '@/lib/dashboard-utils'
import type {
  Stats,
  StatsChange,
  BookingStatus,
  TodayBooking,
  DailyRevenue,
  MiniStats,
} from '@/types/dashboard'

/**
 * Fetch Dashboard Stats (Total bookings, revenue, customers, pending)
 * staleTime: 5 minutes - ข้อมูลรวมไม่ต้องอัพเดทบ่อยมาก
 */
export async function fetchDashboardStats(): Promise<Stats> {
  const [totalBookingsRes, completedBookingsRes, totalCustomersRes, pendingBookingsRes] =
    await Promise.all([
      supabase.from('bookings').select('*', { count: 'exact', head: true }),
      supabase.from('bookings').select('total_price').eq('payment_status', 'paid'),
      supabase.from('customers').select('*', { count: 'exact', head: true }),
      supabase
        .from('bookings')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'pending'),
    ])

  const totalRevenue =
    completedBookingsRes.data?.reduce((sum, booking) => sum + Number(booking.total_price), 0) || 0

  return {
    totalBookings: totalBookingsRes.count || 0,
    totalRevenue,
    totalCustomers: totalCustomersRes.count || 0,
    pendingBookings: pendingBookingsRes.count || 0,
  }
}

/**
 * Fetch Today's Stats Change (bookings, revenue, customers added today)
 * staleTime: 1 minute - ข้อมูลวันนี้ควรอัพเดทบ่อยกว่า
 */
export async function fetchTodayStats(): Promise<StatsChange> {
  const { todayStart, todayEnd } = getBangkokToday()

  const [todayBookingsRes, todayRevenueRes, todayCustomersRes, todayPendingRes] =
    await Promise.all([
      supabase
        .from('bookings')
        .select('*', { count: 'exact' })
        .gte('created_at', todayStart)
        .lte('created_at', todayEnd),
      supabase
        .from('bookings')
        .select('total_price')
        .eq('payment_status', 'paid')
        .gte('updated_at', todayStart)
        .lte('updated_at', todayEnd),
      supabase
        .from('customers')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', todayStart)
        .lte('created_at', todayEnd),
      supabase
        .from('bookings')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'pending')
        .gte('created_at', todayStart)
        .lte('created_at', todayEnd),
    ])

  const todayRevenue =
    todayRevenueRes.data?.reduce((sum, booking) => sum + Number(booking.total_price), 0) || 0

  return {
    bookingsChange: todayBookingsRes.count || 0,
    revenueChange: todayRevenue,
    customersChange: todayCustomersRes.count || 0,
    pendingChange: todayPendingRes.count || 0,
  }
}

/**
 * Fetch Bookings by Status (for pie chart)
 * staleTime: 5 minutes
 */
export async function fetchBookingsByStatus(): Promise<BookingStatus[]> {
  const { data, error } = await supabase.from('bookings').select('status')

  if (error) throw new Error(`Failed to fetch bookings by status: ${error.message}`)

  const statusCounts: Record<string, number> = {}
  data?.forEach((booking) => {
    statusCounts[booking.status] = (statusCounts[booking.status] || 0) + 1
  })

  const statusColors: Record<string, string> = {
    confirmed: '#3b82f6', // blue-500
    pending: '#f59e0b', // amber-500
    in_progress: '#8b5cf6', // violet-500
    completed: '#22c55e', // green-500
    cancelled: '#ef4444', // red-500
  }

  return Object.entries(statusCounts).map(([status, count]) => ({
    status: status.charAt(0).toUpperCase() + status.slice(1).replace('_', ' '),
    count,
    color: statusColors[status] || '#6b7280',
  }))
}

/**
 * Fetch Today's Bookings (detailed list)
 * staleTime: 1 minute - ข้อมูลวันนี้อัพเดทบ่อย
 */
export async function fetchTodayBookings(): Promise<TodayBooking[]> {
  const { todayStr } = getBangkokToday()

  const { data, error } = await supabase
    .from('bookings')
    .select(
      `
      *,
      customers (id, full_name, phone, email),
      service_packages (name, service_type),
      service_packages_v2:package_v2_id (name, service_type),
      profiles!bookings_staff_id_fkey (full_name),
      teams (name)
    `
    )
    .eq('booking_date', todayStr)
    .order('start_time', { ascending: true })

  if (error) throw new Error(`Failed to fetch today's bookings: ${error.message}`)

  return (data as TodayBooking[]) || []
}

/**
 * Fetch Daily Revenue (last 7 days, for line chart)
 * staleTime: 5 minutes
 */
export async function fetchDailyRevenue(days: number = 7): Promise<DailyRevenue[]> {
  const { todayStr } = getBangkokToday()
  const sevenDaysAgoStr = getDateDaysAgo(days - 1)

  const { data, error } = await supabase
    .from('bookings')
    .select('payment_date, total_price')
    .eq('payment_status', 'paid')
    .gte('payment_date', sevenDaysAgoStr)
    .lte('payment_date', todayStr)
    .order('payment_date', { ascending: true })

  if (error) throw new Error(`Failed to fetch daily revenue: ${error.message}`)

  // Initialize all dates with 0 revenue
  const revenueByDate: Record<string, number> = {}
  for (let i = 0; i < days; i++) {
    const date = new Date()
    date.setDate(date.getDate() - (days - 1 - i))
    const dateStr = date.toISOString().split('T')[0]
    revenueByDate[dateStr] = 0
  }

  // Fill in actual revenue data
  data?.forEach((item: { payment_date: string | null; total_price: number }) => {
    const dateStr = item.payment_date
    if (dateStr) {
      revenueByDate[dateStr] = (revenueByDate[dateStr] || 0) + Number(item.total_price)
    }
  })

  return Object.entries(revenueByDate).map(([date, revenue]) => ({
    date: format(new Date(date), 'dd MMM'),
    revenue,
  }))
}

/**
 * Fetch Mini Stats (top service, avg booking value, completion rate)
 * staleTime: 10 minutes - ข้อมูลสรุปไม่เปลี่ยนบ่อย
 */
export async function fetchMiniStats(): Promise<MiniStats> {
  const { data, error } = await supabase
    .from('bookings')
    .select(
      'total_price, status, service_packages(name), service_packages_v2:package_v2_id(name)'
    )

  if (error) throw new Error(`Failed to fetch mini stats: ${error.message}`)

  type BookingWithService = {
    service_packages?: { name: string }[] | { name: string } | null
    service_packages_v2?: { name: string }[] | { name: string } | null
    total_price?: number
    status?: string
  }

  // 1. Top Service
  const fullServiceCount: Record<string, { name: string; count: number }> = {}
  data?.forEach((booking: BookingWithService) => {
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
  const totalBookingValue =
    data?.reduce((sum, booking) => sum + Number(booking.total_price), 0) || 0
  const avgBookingValue = data && data.length > 0 ? totalBookingValue / data.length : 0

  // 3. Completion Rate
  const completedCount = data?.filter((b) => b.status === 'completed').length || 0
  const completionRate = data && data.length > 0 ? (completedCount / data.length) * 100 : 0

  return {
    topService,
    avgBookingValue,
    completionRate,
  }
}

/**
 * Query Options สำหรับ Dashboard
 */
export const dashboardQueryOptions = {
  stats: {
    queryKey: queryKeys.dashboard.stats(),
    queryFn: fetchDashboardStats,
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchOnMount: 'always' as const, // Force refetch on mount
    refetchOnWindowFocus: true, // Refetch when window regains focus
  },
  todayStats: {
    queryKey: queryKeys.dashboard.todayStats(),
    queryFn: fetchTodayStats,
    staleTime: 1 * 60 * 1000, // 1 minute
    refetchOnMount: 'always' as const, // Force refetch on mount
    refetchOnWindowFocus: true, // Refetch when window regains focus
  },
  byStatus: {
    queryKey: queryKeys.dashboard.byStatus(),
    queryFn: fetchBookingsByStatus,
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchOnMount: 'always' as const, // Force refetch on mount
    refetchOnWindowFocus: true, // Refetch when window regains focus
  },
  todayBookings: {
    queryKey: queryKeys.dashboard.todayBookings(),
    queryFn: fetchTodayBookings,
    staleTime: 1 * 60 * 1000, // 1 minute
    refetchOnMount: 'always' as const, // Force refetch on mount
    refetchOnWindowFocus: true, // Refetch when window regains focus
  },
  revenue: (days: number = 7) => ({
    queryKey: queryKeys.dashboard.revenue(days),
    queryFn: () => fetchDailyRevenue(days),
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchOnMount: 'always' as const, // Force refetch on mount
    refetchOnWindowFocus: true, // Refetch when window regains focus
  }),
  miniStats: {
    queryKey: queryKeys.dashboard.miniStats(),
    queryFn: fetchMiniStats,
    staleTime: 10 * 60 * 1000, // 10 minutes
    refetchOnMount: 'always' as const, // Force refetch on mount
    refetchOnWindowFocus: true, // Refetch when window regains focus
  },
}
