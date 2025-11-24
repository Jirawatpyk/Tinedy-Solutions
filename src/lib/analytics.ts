import type { CustomerRecord, Booking } from '@/types'
import { startOfDay, startOfWeek, startOfMonth, endOfDay, endOfWeek, endOfMonth, subMonths, subWeeks, subDays, isWithinInterval, format, eachDayOfInterval } from 'date-fns'

// Type alias for analytics - accepts either full Booking or partial data
export type BookingForAnalytics = Booking | {
  id: string
  booking_date: string
  start_time?: string
  total_price: number
  status: string
  payment_status?: string
  created_at?: string
  staff_id?: string | null
  customer_id?: string
  customers?: { id: string } | null
  service_packages?: { service_type?: string } | null
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
 * Uses payment_date for revenue tracking (Cash Flow)
 */
export const calculateRevenueMetrics = (bookings: BookingForAnalytics[]): RevenueMetrics => {
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

  // Filter paid bookings only
  const paidBookings = bookings.filter((b: BookingForAnalytics) => {
    const paymentStatus = (b as { payment_status?: string }).payment_status
    return paymentStatus === 'paid'
  })

  const total = paidBookings.reduce((sum: number, b: BookingForAnalytics) => sum + Number(b.total_price), 0)

  // Helper function to get date to check (payment_date or fallback to booking_date)
  const getDateToCheck = (b: BookingForAnalytics) => {
    const paymentDate = (b as { payment_date?: string | null }).payment_date
    return new Date(paymentDate || b.booking_date)
  }

  const today = paidBookings
    .filter((b) => isWithinInterval(getDateToCheck(b), { start: todayStart, end: todayEnd }))
    .reduce((sum: number, b: BookingForAnalytics) => sum + Number(b.total_price), 0)

  const yesterday = paidBookings
    .filter((b) => isWithinInterval(getDateToCheck(b), { start: yesterdayStart, end: yesterdayEnd }))
    .reduce((sum: number, b: BookingForAnalytics) => sum + Number(b.total_price), 0)

  const thisWeek = paidBookings
    .filter((b) => isWithinInterval(getDateToCheck(b), { start: thisWeekStart, end: thisWeekEnd }))
    .reduce((sum: number, b: BookingForAnalytics) => sum + Number(b.total_price), 0)

  const lastWeek = paidBookings
    .filter((b) => isWithinInterval(getDateToCheck(b), { start: lastWeekStart, end: lastWeekEnd }))
    .reduce((sum: number, b: BookingForAnalytics) => sum + Number(b.total_price), 0)

  const thisMonth = paidBookings
    .filter((b) => isWithinInterval(getDateToCheck(b), { start: thisMonthStart, end: thisMonthEnd }))
    .reduce((sum: number, b: BookingForAnalytics) => sum + Number(b.total_price), 0)

  const lastMonth = paidBookings
    .filter((b) => isWithinInterval(getDateToCheck(b), { start: lastMonthStart, end: lastMonthEnd }))
    .reduce((sum: number, b: BookingForAnalytics) => sum + Number(b.total_price), 0)

  const monthGrowth = lastMonth > 0 ? ((thisMonth - lastMonth) / lastMonth) * 100 : 0
  const weekGrowth = lastWeek > 0 ? ((thisWeek - lastWeek) / lastWeek) * 100 : 0
  const dayGrowth = yesterday > 0 ? ((today - yesterday) / yesterday) * 100 : 0

  const avgOrderValue = paidBookings.length > 0 ? total / paidBookings.length : 0

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
export const calculateBookingMetrics = (bookings: BookingForAnalytics[]): BookingMetrics => {
  const now = new Date()
  const thisMonthStart = startOfMonth(now)
  const thisMonthEnd = endOfMonth(now)
  const lastMonthStart = startOfMonth(subMonths(now, 1))
  const lastMonthEnd = endOfMonth(subMonths(now, 1))

  const total = bookings.length
  const completed = bookings.filter((b: BookingForAnalytics) => b.status === 'completed').length
  const pending = bookings.filter((b: BookingForAnalytics) => b.status === 'pending').length
  const cancelled = bookings.filter((b: BookingForAnalytics) => b.status === 'cancelled').length

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
 * Uses payment_date for revenue tracking (Cash Flow)
 */
export const generateChartData = (
  bookings: BookingForAnalytics[],
  startDate: Date,
  endDate: Date
): ChartDataPoint[] => {
  const days = eachDayOfInterval({ start: startDate, end: endDate })
  const paidBookings = bookings.filter((b: BookingForAnalytics) => {
    const paymentStatus = (b as { payment_status?: string }).payment_status
    return paymentStatus === 'paid'
  })

  return days.map((day) => {
    const dayStart = startOfDay(day)
    const dayEnd = endOfDay(day)

    const dayBookings = paidBookings.filter((b) => {
      // Use payment_date if available, fallback to booking_date
      const paymentDate = (b as { payment_date?: string | null }).payment_date
      const dateToCheck = paymentDate || b.booking_date
      return isWithinInterval(new Date(dateToCheck), { start: dayStart, end: dayEnd })
    })

    const revenue = dayBookings.reduce((sum: number, b: BookingForAnalytics) => sum + Number(b.total_price), 0)

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
  bookings: BookingForAnalytics[]
): { cleaning: number; training: number } => {
  const paidBookings = bookings.filter((b: BookingForAnalytics) => {
    const paymentStatus = (b as { payment_status?: string }).payment_status
    return paymentStatus === 'paid'
  })

  const cleaning = paidBookings
    .filter((b) => {
      // Support both nested (service_packages.service_type) and flat (service_type) structures
      const serviceType = (b as { service_type?: string }).service_type || b.service_packages?.service_type
      return serviceType === 'cleaning'
    })
    .reduce((sum: number, b: BookingForAnalytics) => sum + Number(b.total_price), 0)

  const training = paidBookings
    .filter((b) => {
      // Support both nested (service_packages.service_type) and flat (service_type) structures
      const serviceType = (b as { service_type?: string }).service_type || b.service_packages?.service_type
      return serviceType === 'training'
    })
    .reduce((sum: number, b: BookingForAnalytics) => sum + Number(b.total_price), 0)

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
      return { start: startOfWeek(now, { weekStartsOn: 1 }), end: endOfWeek(now, { weekStartsOn: 1 }) }
    case 'lastWeek':
      return { start: startOfWeek(subWeeks(now, 1), { weekStartsOn: 1 }), end: endOfWeek(subWeeks(now, 1), { weekStartsOn: 1 }) }
    case 'thisMonth':
      return { start: startOfMonth(now), end: endOfMonth(now) }
    case 'lastMonth':
      return { start: startOfMonth(subMonths(now, 1)), end: endOfMonth(subMonths(now, 1)) }
    case 'last3months':
      return { start: startOfMonth(subMonths(now, 3)), end: endOfMonth(subMonths(now, 1)) }
    default:
      return { start: startOfMonth(now), end: endOfMonth(now) }
  }
}

/**
 * Get booking status breakdown
 */
export const getBookingStatusBreakdown = (bookings: BookingForAnalytics[]) => {
  const statusCounts = bookings.reduce((acc, booking) => {
    acc[booking.status] = (acc[booking.status] || 0) + 1
    return acc
  }, {} as Record<string, number>)

  return [
    { name: 'Pending', value: statusCounts.pending || 0, color: '#f59e0b' }, // amber-500
    { name: 'Confirmed', value: statusCounts.confirmed || 0, color: '#3b82f6' }, // blue-500
    { name: 'In Progress', value: statusCounts.in_progress || 0, color: '#8b5cf6' }, // violet-500
    { name: 'Completed', value: statusCounts.completed || 0, color: '#22c55e' }, // green-500
    { name: 'Cancelled', value: statusCounts.cancelled || 0, color: '#ef4444' }, // red-500
  ]
}

/**
 * Get peak hours heatmap data
 */
export const getPeakHoursData = (bookings: BookingForAnalytics[]) => {
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

export interface CustomerWithBookings extends CustomerRecord {
  bookings: BookingForAnalytics[]
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
 * Calculate customer metrics (All-time data, not filtered by date range)
 */
export const calculateCustomerMetrics = (
  customers: CustomerWithBookings[],
  bookings: BookingForAnalytics[]
): CustomerMetrics => {
  const now = new Date()
  const thisMonthStart = startOfMonth(now)
  const thisMonthEnd = endOfMonth(now)

  // Filter paid bookings (all-time)
  const paidBookings = bookings.filter((b: BookingForAnalytics) => {
    const paymentStatus = (b as { payment_status?: string }).payment_status
    return paymentStatus === 'paid'
  })

  // Total customers (all customers in system)
  const total = customers.length

  // New customers created THIS MONTH (not based on date range filter)
  const newThisMonth = customers.filter((c) =>
    isWithinInterval(new Date(c.created_at), {
      start: thisMonthStart,
      end: thisMonthEnd,
    })
  ).length

  // Returning customers (customers with more than one booking - all time)
  const customerBookingCounts = customers.reduce((acc, customer) => {
    const customerId = customer.id
    if (customerId && customer.bookings.length > 0) {
      acc[customerId] = customer.bookings.length
    }
    return acc
  }, {} as Record<string, number>)

  const returning = Object.values(customerBookingCounts).filter((count) => count > 1).length

  // Calculate average CLV based on ALL-TIME revenue
  const totalRevenue = paidBookings.reduce((sum: number, b: BookingForAnalytics) => sum + Number(b.total_price), 0)
  const averageCLV = total > 0 ? totalRevenue / total : 0

  // Retention rate: % of customers with more than one booking (all-time)
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
 * Get top customers by revenue (within date range)
 */
export const getTopCustomers = (
  customers: CustomerWithBookings[],
  limit: number = 10
): TopCustomer[] => {
  const customerStats = customers
    .filter((customer) => customer.bookings.length > 0) // Only customers with bookings in range
    .map((customer) => {
      // Filter paid bookings (already filtered by date range in filteredCustomersWithBookings)
      const paidBookings = customer.bookings.filter((b: BookingForAnalytics) => {
        const paymentStatus = (b as { payment_status?: string }).payment_status
        return paymentStatus === 'paid'
      })

      const totalRevenue = paidBookings.reduce((sum: number, b: BookingForAnalytics) => sum + Number(b.total_price), 0)
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

/**
 * Get customer acquisition trend (daily new customers)
 */
export const getCustomerAcquisitionTrend = (
  customers: CustomerWithBookings[],
  startDate: Date,
  endDate: Date
): { date: string; count: number }[] => {
  const days = eachDayOfInterval({ start: startDate, end: endDate })

  return days.map((day) => {
    const dayStart = startOfDay(day)
    const dayEnd = endOfDay(day)

    const count = customers.filter((c) =>
      isWithinInterval(new Date(c.created_at), { start: dayStart, end: dayEnd })
    ).length

    return {
      date: format(day, 'MMM dd'),
      count,
    }
  })
}

/**
 * Get customer lifetime value distribution
 */
export const getCustomerCLVDistribution = (
  customers: CustomerWithBookings[]
): { range: string; count: number }[] => {
  const ranges = [
    { min: 0, max: 500, label: '฿0-500' },
    { min: 500, max: 1000, label: '฿500-1K' },
    { min: 1000, max: 2000, label: '฿1K-2K' },
    { min: 2000, max: 5000, label: '฿2K-5K' },
    { min: 5000, max: Infinity, label: '฿5K+' },
  ]

  // Filter out customers with no bookings in the selected date range
  const customersWithBookings = customers.filter(c => c.bookings.length > 0)

  return ranges.map((range) => {
    const count = customersWithBookings.filter((customer) => {
      const totalRevenue = customer.bookings
        .filter((b: BookingForAnalytics) => {
          const paymentStatus = (b as { payment_status?: string }).payment_status
          return paymentStatus === 'paid'
        })
        .reduce((sum: number, b: BookingForAnalytics) => sum + Number(b.total_price), 0)

      return totalRevenue >= range.min && totalRevenue < range.max
    }).length

    return {
      range: range.label,
      count,
    }
  })
}

/**
 * Get customer segmentation by booking frequency
 */
export const getCustomerSegmentation = (
  customers: CustomerWithBookings[]
): { name: string; value: number; color: string }[] => {
  let newCustomers = 0
  let regular = 0
  let vip = 0

  customers.forEach((customer) => {
    const bookingCount = customer.bookings.length

    if (bookingCount === 1) {
      newCustomers++
    } else if (bookingCount <= 5) {
      regular++
    } else {
      vip++
    }
  })

  return [
    { name: 'New (1 booking)', value: newCustomers, color: '#3b82f6' },
    { name: 'Regular (2-5 bookings)', value: regular, color: '#10b981' },
    { name: 'VIP (5+ bookings)', value: vip, color: '#f59e0b' },
  ]
}

/**
 * Get repeat customer rate trend (daily)
 */
export const getRepeatCustomerRateTrend = (
  customers: CustomerWithBookings[],
  startDate: Date,
  endDate: Date
): { date: string; rate: number }[] => {
  const days = eachDayOfInterval({ start: startDate, end: endDate })

  return days.map((day) => {
    const dayStart = startOfDay(day)
    const dayEnd = endOfDay(day)

    // Customers who had bookings on this day
    const customersThisDay = customers.filter((c) =>
      c.bookings.some((b) =>
        isWithinInterval(new Date(b.booking_date), { start: dayStart, end: dayEnd })
      )
    )

    // Customers who had more than one booking (ever)
    const repeatCustomers = customersThisDay.filter((c) => c.bookings.length > 1)

    const rate = customersThisDay.length > 0
      ? (repeatCustomers.length / customersThisDay.length) * 100
      : 0

    return {
      date: format(day, 'MMM dd'),
      rate: Math.round(rate * 10) / 10, // Round to 1 decimal
    }
  })
}

// ============================================================================
// STAFF ANALYTICS
// ============================================================================

export interface Staff {
  id: string
  full_name: string
  email: string
  role: string
  created_at: string
}

export interface StaffWithBookings extends Staff {
  bookings: BookingForAnalytics[]
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
  email: string
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
  staffWithBookings: StaffWithBookings[]
): StaffMetrics => {
  // Calculate total revenue from all staff (revenue already divided for team bookings)
  const totalRevenue = staffWithBookings.reduce((sum, staffMember) => {
    const staffRevenue = staffMember.bookings
      .filter((b: BookingForAnalytics) => {
        const paymentStatus = (b as { payment_status?: string }).payment_status
        return paymentStatus === 'paid'
      })
      .reduce((bookingSum: number, b: BookingForAnalytics) => {
        return bookingSum + Number(b.total_price)
      }, 0)
    return sum + staffRevenue
  }, 0)

  // Count paid jobs across all staff
  const totalPaidJobs = staffWithBookings.reduce((sum, staffMember) => {
    const paidJobs = staffMember.bookings.filter((b: BookingForAnalytics) => {
      const paymentStatus = (b as { payment_status?: string }).payment_status
      return paymentStatus === 'paid'
    }).length
    return sum + paidJobs
  }, 0)

  // Count staff with at least one booking
  const activeStaff = staffWithBookings.filter(s => s.bookings.length > 0).length

  const totalStaff = staff.length
  const averageJobsPerStaff = activeStaff > 0 ? totalPaidJobs / activeStaff : 0
  const averageRevenuePerStaff = activeStaff > 0 ? totalRevenue / activeStaff : 0

  return {
    totalStaff,
    activeStaff,
    averageJobsPerStaff,
    averageRevenuePerStaff,
    totalJobsCompleted: totalPaidJobs,
    totalRevenue,
  }
}

/**
 * Get staff performance breakdown
 */
export const getStaffPerformance = (staffMembers: StaffWithBookings[]): StaffPerformance[] => {
  return staffMembers.map((staff) => {
    const totalJobs = staff.bookings.length
    const completedJobs = staff.bookings.filter((b: BookingForAnalytics) => b.status === 'completed').length

    // Calculate revenue from paid bookings (revenue already divided for team bookings)
    const paidBookings = staff.bookings.filter((b: BookingForAnalytics) => {
      const paymentStatus = (b as { payment_status?: string }).payment_status
      return paymentStatus === 'paid'
    })

    const revenue = paidBookings.reduce((sum: number, b: BookingForAnalytics) => {
      return sum + Number(b.total_price)
    }, 0)

    const completionRate = totalJobs > 0 ? (completedJobs / totalJobs) * 100 : 0
    const avgJobValue = paidBookings.length > 0 ? revenue / paidBookings.length : 0

    // Utilization rate: assume 160 working hours per month (8h * 20 days)
    // Calculate based on completed jobs and estimated 2 hours per job
    const hoursWorked = completedJobs * 2
    const utilizationRate = (hoursWorked / 160) * 100

    return {
      id: staff.id,
      name: staff.full_name,
      email: staff.email,
      totalJobs,
      completedJobs,
      revenue,
      completionRate,
      avgJobValue,
      utilizationRate: Math.min(utilizationRate, 100), // Cap at 100%
    }
  })
}

// ============================================================================
// TEAM ANALYTICS
// ============================================================================

export interface Team {
  id: string
  name: string
  is_active: boolean
  created_at: string
}

export interface TeamWithBookings extends Team {
  bookings: BookingForAnalytics[]
  team_members: { id: string }[]
}

export interface TeamMetrics {
  totalTeams: number
  activeTeams: number
  totalTeamBookings: number
  totalTeamRevenue: number
  averageTeamSize: number
}

export interface TeamPerformance {
  id: string
  name: string
  memberCount: number
  totalJobs: number
  completed: number
  inProgress: number
  pending: number
  revenue: number
  completionRate: number
  avgJobValue: number
}

/**
 * Calculate team metrics
 */
export const calculateTeamMetrics = (
  teams: Team[],
  teamsWithBookings: TeamWithBookings[]
): TeamMetrics => {
  const totalTeams = teams.length
  const activeTeams = teams.filter(t => t.is_active).length

  // Count total team bookings (all bookings regardless of payment status)
  const totalTeamBookings = teamsWithBookings.reduce(
    (sum, team) => sum + team.bookings.length,
    0
  )

  // Calculate total team revenue (only paid bookings)
  const totalTeamRevenue = teamsWithBookings.reduce((sum, team) => {
    const teamRevenue = team.bookings
      .filter((b: BookingForAnalytics) => {
        const paymentStatus = (b as { payment_status?: string }).payment_status
        return paymentStatus === 'paid'
      })
      .reduce((revSum: number, b: BookingForAnalytics) => revSum + Number(b.total_price), 0)
    return sum + teamRevenue
  }, 0)

  // Calculate average team size
  const totalMembers = teamsWithBookings.reduce(
    (sum, team) => sum + team.team_members.length,
    0
  )
  const averageTeamSize = totalTeams > 0 ? totalMembers / totalTeams : 0

  return {
    totalTeams,
    activeTeams,
    totalTeamBookings,
    totalTeamRevenue,
    averageTeamSize,
  }
}

/**
 * Get team performance breakdown
 */
export const getTeamPerformance = (teamsWithBookings: TeamWithBookings[]): TeamPerformance[] => {
  return teamsWithBookings.map((team) => {
    const totalJobs = team.bookings.length
    const completed = team.bookings.filter((b: BookingForAnalytics) => b.status === 'completed').length
    const inProgress = team.bookings.filter((b: BookingForAnalytics) => b.status === 'in_progress').length
    const pending = team.bookings.filter((b: BookingForAnalytics) => b.status === 'pending').length

    // Calculate revenue from paid bookings only
    const paidBookings = team.bookings.filter((b: BookingForAnalytics) => {
      const paymentStatus = (b as { payment_status?: string }).payment_status
      return paymentStatus === 'paid'
    })

    const revenue = paidBookings.reduce((sum: number, b: BookingForAnalytics) => {
      return sum + Number(b.total_price)
    }, 0)

    const memberCount = team.team_members.length
    const completionRate = totalJobs > 0 ? (completed / totalJobs) * 100 : 0
    const avgJobValue = paidBookings.length > 0 ? revenue / paidBookings.length : 0

    return {
      id: team.id,
      name: team.name,
      memberCount,
      totalJobs,
      completed,
      inProgress,
      pending,
      revenue,
      completionRate,
      avgJobValue,
    }
  })
}

/**
 * Filter financial data based on user role
 * Removes sensitive financial fields for non-admin users
 *
 * @param data - The data object to filter
 * @param role - User role ('admin', 'manager', 'staff', or null)
 * @param sensitiveFields - Array of field names to remove for non-admin users
 * @returns Filtered data object (full data for admin, filtered for others)
 */
export function filterFinancialDataForRole<T extends Record<string, unknown>>(
  data: T,
  role: 'admin' | 'manager' | 'staff' | null,
  sensitiveFields: (keyof T)[] = []
): Partial<T> {
  // Admin sees everything
  if (role === 'admin') {
    return data
  }

  // For non-admin users, remove sensitive fields
  const filtered = { ...data }
  sensitiveFields.forEach(field => {
    delete filtered[field]
  })

  return filtered
}

