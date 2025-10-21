import { startOfDay, startOfWeek, startOfMonth, endOfDay, endOfWeek, endOfMonth, subMonths, subWeeks, subDays, isWithinInterval, format, eachDayOfInterval } from 'date-fns'

interface Booking {
  id: string
  booking_date: string
  start_time?: string
  total_price: number
  status: string
  service_type?: string
  created_at: string
  customer_id?: string
  staff_id?: string
}

export interface RevenueMetrics {
  total: number
  thisMonth: number
  lastMonth: number
  thisWeek: number
  lastWeek: number
  today: number
  yesterday: number
  monthGrowth: number
  weekGrowth: number
  dayGrowth: number
  avgOrderValue: number
}

export interface BookingMetrics {
  total: number
  thisMonth: number
  lastMonth: number
  completed: number
  pending: number
  cancelled: number
  completionRate: number
  cancellationRate: number
}

export interface ChartDataPoint {
  date: string
  revenue: number
  bookings: number
}

/**
 * Calculate revenue metrics from bookings data
 */
export const calculateRevenueMetrics = (bookings: Booking[]): RevenueMetrics => {
  const now = new Date()
  const todayStart = startOfDay(now)
  const todayEnd = endOfDay(now)
  const yesterdayStart = startOfDay(subDays(now, 1))
  const yesterdayEnd = endOfDay(subDays(now, 1))
  const thisWeekStart = startOfWeek(now)
  const thisWeekEnd = endOfWeek(now)
  const lastWeekStart = startOfWeek(subWeeks(now, 1))
  const lastWeekEnd = endOfWeek(subWeeks(now, 1))
  const thisMonthStart = startOfMonth(now)
  const thisMonthEnd = endOfMonth(now)
  const lastMonthStart = startOfMonth(subMonths(now, 1))
  const lastMonthEnd = endOfMonth(subMonths(now, 1))

  // Filter completed bookings only
  const completedBookings = bookings.filter((b) => b.status === 'completed')

  const total = completedBookings.reduce((sum, b) => sum + Number(b.total_price), 0)

  const today = completedBookings
    .filter((b) => isWithinInterval(new Date(b.booking_date), { start: todayStart, end: todayEnd }))
    .reduce((sum, b) => sum + Number(b.total_price), 0)

  const yesterday = completedBookings
    .filter((b) => isWithinInterval(new Date(b.booking_date), { start: yesterdayStart, end: yesterdayEnd }))
    .reduce((sum, b) => sum + Number(b.total_price), 0)

  const thisWeek = completedBookings
    .filter((b) => isWithinInterval(new Date(b.booking_date), { start: thisWeekStart, end: thisWeekEnd }))
    .reduce((sum, b) => sum + Number(b.total_price), 0)

  const lastWeek = completedBookings
    .filter((b) => isWithinInterval(new Date(b.booking_date), { start: lastWeekStart, end: lastWeekEnd }))
    .reduce((sum, b) => sum + Number(b.total_price), 0)

  const thisMonth = completedBookings
    .filter((b) => isWithinInterval(new Date(b.booking_date), { start: thisMonthStart, end: thisMonthEnd }))
    .reduce((sum, b) => sum + Number(b.total_price), 0)

  const lastMonth = completedBookings
    .filter((b) => isWithinInterval(new Date(b.booking_date), { start: lastMonthStart, end: lastMonthEnd }))
    .reduce((sum, b) => sum + Number(b.total_price), 0)

  const monthGrowth = lastMonth > 0 ? ((thisMonth - lastMonth) / lastMonth) * 100 : 0
  const weekGrowth = lastWeek > 0 ? ((thisWeek - lastWeek) / lastWeek) * 100 : 0
  const dayGrowth = yesterday > 0 ? ((today - yesterday) / yesterday) * 100 : 0

  const avgOrderValue = completedBookings.length > 0 ? total / completedBookings.length : 0

  return {
    total,
    thisMonth,
    lastMonth,
    thisWeek,
    lastWeek,
    today,
    yesterday,
    monthGrowth,
    weekGrowth,
    dayGrowth,
    avgOrderValue,
  }
}

/**
 * Calculate booking metrics
 */
export const calculateBookingMetrics = (bookings: Booking[]): BookingMetrics => {
  const now = new Date()
  const thisMonthStart = startOfMonth(now)
  const thisMonthEnd = endOfMonth(now)
  const lastMonthStart = startOfMonth(subMonths(now, 1))
  const lastMonthEnd = endOfMonth(subMonths(now, 1))

  const total = bookings.length
  const completed = bookings.filter((b) => b.status === 'completed').length
  const pending = bookings.filter((b) => b.status === 'pending').length
  const cancelled = bookings.filter((b) => b.status === 'cancelled').length

  const thisMonth = bookings.filter((b) =>
    isWithinInterval(new Date(b.booking_date), { start: thisMonthStart, end: thisMonthEnd })
  ).length

  const lastMonth = bookings.filter((b) =>
    isWithinInterval(new Date(b.booking_date), { start: lastMonthStart, end: lastMonthEnd })
  ).length

  const completionRate = total > 0 ? (completed / total) * 100 : 0
  const cancellationRate = total > 0 ? (cancelled / total) * 100 : 0

  return {
    total,
    thisMonth,
    lastMonth,
    completed,
    pending,
    cancelled,
    completionRate,
    cancellationRate,
  }
}

/**
 * Generate chart data for date range
 */
export const generateChartData = (
  bookings: Booking[],
  startDate: Date,
  endDate: Date
): ChartDataPoint[] => {
  const days = eachDayOfInterval({ start: startDate, end: endDate })
  const completedBookings = bookings.filter((b) => b.status === 'completed')

  return days.map((day) => {
    const dayStart = startOfDay(day)
    const dayEnd = endOfDay(day)

    const dayBookings = completedBookings.filter((b) =>
      isWithinInterval(new Date(b.booking_date), { start: dayStart, end: dayEnd })
    )

    const revenue = dayBookings.reduce((sum, b) => sum + Number(b.total_price), 0)

    return {
      date: format(day, 'MMM dd'),
      revenue,
      bookings: dayBookings.length,
    }
  })
}

/**
 * Get revenue by service type
 */
export const getRevenueByServiceType = (
  bookings: Booking[]
): { cleaning: number; training: number } => {
  const completedBookings = bookings.filter((b) => b.status === 'completed')

  const cleaning = completedBookings
    .filter((b) => b.service_type === 'cleaning')
    .reduce((sum, b) => sum + Number(b.total_price), 0)

  const training = completedBookings
    .filter((b) => b.service_type === 'training')
    .reduce((sum, b) => sum + Number(b.total_price), 0)

  return { cleaning, training }
}

/**
 * Format growth percentage
 */
export const formatGrowth = (growth: number): string => {
  const sign = growth >= 0 ? '+' : ''
  return `${sign}${growth.toFixed(1)}%`
}

/**
 * Get date range presets
 */
export const getDateRangePreset = (preset: string): { start: Date; end: Date } => {
  const now = new Date()

  switch (preset) {
    case 'today':
      return { start: startOfDay(now), end: endOfDay(now) }
    case 'yesterday':
      return { start: startOfDay(subDays(now, 1)), end: endOfDay(subDays(now, 1)) }
    case 'last7days':
      return { start: startOfDay(subDays(now, 6)), end: endOfDay(now) }
    case 'last30days':
      return { start: startOfDay(subDays(now, 29)), end: endOfDay(now) }
    case 'thisWeek':
      return { start: startOfWeek(now), end: endOfWeek(now) }
    case 'lastWeek':
      return { start: startOfWeek(subWeeks(now, 1)), end: endOfWeek(subWeeks(now, 1)) }
    case 'thisMonth':
      return { start: startOfMonth(now), end: endOfMonth(now) }
    case 'lastMonth':
      return { start: startOfMonth(subMonths(now, 1)), end: endOfMonth(subMonths(now, 1)) }
    case 'last3months':
      return { start: startOfMonth(subMonths(now, 2)), end: endOfMonth(now) }
    default:
      return { start: startOfMonth(now), end: endOfMonth(now) }
  }
}

/**
 * Get booking status breakdown
 */
export const getBookingStatusBreakdown = (bookings: Booking[]) => {
  const statusCounts = bookings.reduce((acc, booking) => {
    acc[booking.status] = (acc[booking.status] || 0) + 1
    return acc
  }, {} as Record<string, number>)

  return [
    { name: 'Pending', value: statusCounts.pending || 0, color: '#f59e0b' },
    { name: 'Confirmed', value: statusCounts.confirmed || 0, color: '#3b82f6' },
    { name: 'In Progress', value: statusCounts.in_progress || 0, color: '#8b5cf6' },
    { name: 'Completed', value: statusCounts.completed || 0, color: '#10b981' },
    { name: 'Cancelled', value: statusCounts.cancelled || 0, color: '#ef4444' },
  ]
}

/**
 * Get peak hours heatmap data
 */
export const getPeakHoursData = (bookings: Booking[]) => {
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
  const hours = Array.from({ length: 13 }, (_, i) => i + 8) // 8 AM to 8 PM

  const heatmapData: { day: string; hour: number; count: number }[] = []

  days.forEach((day, dayIndex) => {
    hours.forEach((hour) => {
      const count = bookings.filter((booking) => {
        const bookingDate = new Date(booking.booking_date)
        const bookingDay = bookingDate.getDay()
        const bookingHour = parseInt(booking.start_time?.split(':')[0] || '0')
        return bookingDay === dayIndex && bookingHour === hour
      }).length

      heatmapData.push({ day, hour, count })
    })
  })

  return heatmapData
}

// ============================================================================
// CUSTOMER ANALYTICS
// ============================================================================

interface Customer {
  id: string
  full_name: string
  email: string
  phone?: string
  created_at: string
}

interface CustomerWithBookings extends Customer {
  bookings: Booking[]
}

export interface CustomerMetrics {
  total: number
  newThisMonth: number
  returning: number
  averageCLV: number
  retentionRate: number
}

export interface TopCustomer {
  id: string
  name: string
  email: string
  totalBookings: number
  totalRevenue: number
  lastBookingDate: string
}

/**
 * Calculate customer metrics
 */
export const calculateCustomerMetrics = (
  customers: Customer[],
  bookings: Booking[]
): CustomerMetrics => {
  const now = new Date()
  const thisMonthStart = startOfMonth(now)
  const completedBookings = bookings.filter((b) => b.status === 'completed')

  const total = customers.length
  const newThisMonth = customers.filter((c) =>
    isWithinInterval(new Date(c.created_at), {
      start: thisMonthStart,
      end: endOfMonth(now),
    })
  ).length

  // Count customers with more than one booking
  const customerBookingCounts = bookings.reduce((acc, booking) => {
    const customerId = booking.customer_id
    if (customerId) {
      acc[customerId] = (acc[customerId] || 0) + 1
    }
    return acc
  }, {} as Record<string, number>)

  const returning = Object.values(customerBookingCounts).filter((count) => count > 1).length

  // Calculate average CLV (Customer Lifetime Value)
  const totalRevenue = completedBookings.reduce((sum, b) => sum + Number(b.total_price), 0)
  const averageCLV = total > 0 ? totalRevenue / total : 0

  // Retention rate: % of customers with more than one booking
  const retentionRate = total > 0 ? (returning / total) * 100 : 0

  return {
    total,
    newThisMonth,
    returning,
    averageCLV,
    retentionRate,
  }
}

/**
 * Get top customers by revenue
 */
export const getTopCustomers = (
  customers: CustomerWithBookings[],
  limit: number = 10
): TopCustomer[] => {
  const customerStats = customers.map((customer) => {
    const completedBookings = customer.bookings.filter((b) => b.status === 'completed')
    const totalRevenue = completedBookings.reduce((sum, b) => sum + Number(b.total_price), 0)
    const totalBookings = customer.bookings.length
    const lastBooking = customer.bookings.sort(
      (a, b) => new Date(b.booking_date).getTime() - new Date(a.booking_date).getTime()
    )[0]

    return {
      id: customer.id,
      name: customer.full_name,
      email: customer.email,
      totalBookings,
      totalRevenue,
      lastBookingDate: lastBooking ? lastBooking.booking_date : customer.created_at,
    }
  })

  return customerStats
    .sort((a, b) => b.totalRevenue - a.totalRevenue)
    .slice(0, limit)
}

// ============================================================================
// STAFF ANALYTICS
// ============================================================================

interface Staff {
  id: string
  full_name: string
  email: string
  role: string
  created_at: string
}

interface StaffWithBookings extends Staff {
  bookings: Booking[]
}

export interface StaffMetrics {
  totalStaff: number
  activeStaff: number
  averageJobsPerStaff: number
  averageRevenuePerStaff: number
  totalJobsCompleted: number
  totalRevenue: number
}

export interface StaffPerformance {
  id: string
  name: string
  totalJobs: number
  completedJobs: number
  revenue: number
  completionRate: number
  avgJobValue: number
  utilizationRate: number
}

/**
 * Calculate staff metrics
 */
export const calculateStaffMetrics = (
  staff: Staff[],
  bookings: Booking[]
): StaffMetrics => {
  const completedBookings = bookings.filter((b) => b.status === 'completed')
  const totalRevenue = completedBookings.reduce((sum, b) => sum + Number(b.total_price), 0)

  // Count staff with at least one booking
  const staffWithBookings = new Set(
    bookings
      .map((b) => b.staff_id)
      .filter((id): id is string => Boolean(id))
  )

  const totalStaff = staff.length
  const activeStaff = staffWithBookings.size
  const averageJobsPerStaff = activeStaff > 0 ? completedBookings.length / activeStaff : 0
  const averageRevenuePerStaff = activeStaff > 0 ? totalRevenue / activeStaff : 0

  return {
    totalStaff,
    activeStaff,
    averageJobsPerStaff,
    averageRevenuePerStaff,
    totalJobsCompleted: completedBookings.length,
    totalRevenue,
  }
}

/**
 * Get staff performance breakdown
 */
export const getStaffPerformance = (staffMembers: StaffWithBookings[]): StaffPerformance[] => {
  return staffMembers.map((staff) => {
    const totalJobs = staff.bookings.length
    const completedJobs = staff.bookings.filter((b) => b.status === 'completed').length
    const revenue = staff.bookings
      .filter((b) => b.status === 'completed')
      .reduce((sum, b) => sum + Number(b.total_price), 0)

    const completionRate = totalJobs > 0 ? (completedJobs / totalJobs) * 100 : 0
    const avgJobValue = completedJobs > 0 ? revenue / completedJobs : 0

    // Utilization rate: assume 160 working hours per month (8h * 20 days)
    // Calculate based on completed jobs and estimated 2 hours per job
    const hoursWorked = completedJobs * 2
    const utilizationRate = (hoursWorked / 160) * 100

    return {
      id: staff.id,
      name: staff.full_name,
      totalJobs,
      completedJobs,
      revenue,
      completionRate,
      avgJobValue,
      utilizationRate: Math.min(utilizationRate, 100), // Cap at 100%
    }
  })
}

