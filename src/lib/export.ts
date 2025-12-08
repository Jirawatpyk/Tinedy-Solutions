import { format, isWithinInterval, startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfYear, endOfYear, subDays, subWeeks, subMonths, subYears } from 'date-fns'
import * as XLSX from 'xlsx'

// Type definitions
interface BookingForExport {
  id: string
  booking_date: string
  start_time?: string
  total_price: number
  status: string
  created_at: string
  service_packages?: {
    name: string
    service_type: string
  } | null
}

interface CustomerForExport {
  id: string
  full_name: string
  email: string
  phone?: string
  created_at: string
}

interface TopCustomerForExport {
  name: string
  email: string
  totalBookings: number
  totalRevenue: number
  lastBooking?: string
}

interface StaffPerformanceForExport {
  name: string
  totalJobs: number
  completedJobs: number
  revenue: number
  completionRate: number
  avgJobValue: number
  utilizationRate: number
}

interface TeamForExport {
  name: string
  bookings: Array<{
    status: string
    total_price: number
  }>
  team_members: unknown[]
}

/**
 * Get date range based on preset
 */
const getDateRangePreset = (preset: string): { start: Date; end: Date } => {
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
    case 'thisYear':
      return { start: startOfYear(now), end: endOfYear(now) }
    case 'lastYear':
      return { start: startOfYear(subYears(now, 1)), end: endOfYear(subYears(now, 1)) }
    default:
      return { start: startOfMonth(now), end: endOfMonth(now) }
  }
}

/**
 * Export Revenue Tab data to single Excel file with multiple sheets
 * Sheets: Summary, Bookings List, By Service Type, Peak Hours, Top Packages
 * @returns true if export successful, false if no data
 */
export const exportRevenueAllToExcel = (
  bookings: BookingForExport[],
  dateRange: string,
  role: 'admin' | 'manager' | 'staff' | null = null
): boolean => {
  const timestamp = format(new Date(), 'yyyy-MM-dd_HHmmss')
  const { start, end } = getDateRangePreset(dateRange)

  // Filter bookings by date range
  const filteredBookings = bookings.filter(b => {
    const bookingDate = new Date(b.booking_date)
    return isWithinInterval(bookingDate, { start, end })
  })

  if (filteredBookings.length === 0) {
    return false
  }

  // Create workbook
  const workbook = XLSX.utils.book_new()

  // ========== Sheet 1: Revenue Summary ==========
  const completedBookings = filteredBookings.filter(b => b.status === 'completed')
  if (completedBookings.length > 0) {
    const summaryData = completedBookings.map(b => {
      const baseData: Record<string, string | number> = {
        'Date': format(new Date(b.booking_date), 'dd/MM/yyyy'),
        'Time': b.start_time || 'N/A',
        'Service Package': b.service_packages?.name || 'N/A',
        'Service Type': b.service_packages?.service_type || 'N/A',
      }
      if (role === 'admin') {
        baseData['Revenue (฿)'] = Number(b.total_price).toFixed(2)
      }
      return baseData
    })
    const summarySheet = XLSX.utils.json_to_sheet(summaryData)
    XLSX.utils.book_append_sheet(workbook, summarySheet, 'Revenue Summary')
  }

  // ========== Sheet 2: Bookings List ==========
  const bookingsData = filteredBookings.map(b => {
    const baseData: Record<string, string | number> = {
      'Booking ID': b.id.substring(0, 8),
      'Date': format(new Date(b.booking_date), 'dd/MM/yyyy'),
      'Time': b.start_time || 'N/A',
      'Service Package': b.service_packages?.name || 'N/A',
      'Service Type': b.service_packages?.service_type || 'N/A',
      'Status': b.status,
      'Created': format(new Date(b.created_at), 'dd/MM/yyyy HH:mm'),
    }
    if (role === 'admin') {
      baseData['Price (฿)'] = Number(b.total_price).toFixed(2)
    }
    return baseData
  })
  const bookingsSheet = XLSX.utils.json_to_sheet(bookingsData)
  XLSX.utils.book_append_sheet(workbook, bookingsSheet, 'Bookings List')

  // ========== Sheet 3: Revenue by Service Type ==========
  const serviceTypeMap: Record<string, { count: number; revenue: number }> = {}
  filteredBookings.filter(b => b.status === 'completed').forEach(b => {
    const serviceType = b.service_packages?.service_type || 'Unknown'
    if (!serviceTypeMap[serviceType]) {
      serviceTypeMap[serviceType] = { count: 0, revenue: 0 }
    }
    serviceTypeMap[serviceType].count++
    serviceTypeMap[serviceType].revenue += Number(b.total_price)
  })

  const serviceTypeData = Object.entries(serviceTypeMap).map(([type, data]) => {
    const baseData: Record<string, string | number> = {
      'Service Type': type,
      'Total Bookings': data.count,
    }
    if (role === 'admin') {
      baseData['Total Revenue (฿)'] = data.revenue.toFixed(2)
      baseData['Average Price (฿)'] = (data.revenue / data.count).toFixed(2)
    }
    return baseData
  })
  if (serviceTypeData.length > 0) {
    const serviceTypeSheet = XLSX.utils.json_to_sheet(serviceTypeData)
    XLSX.utils.book_append_sheet(workbook, serviceTypeSheet, 'By Service Type')
  }

  // ========== Sheet 4: Peak Hours ==========
  const peakHoursMap: Record<string, number> = {}
  filteredBookings.forEach(b => {
    const bookingDate = new Date(b.booking_date)
    const day = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][bookingDate.getDay()]
    let hour = 0
    if (b.start_time) {
      const timeParts = b.start_time.split(':')
      hour = parseInt(timeParts[0], 10)
    }
    const key = `${day} ${hour.toString().padStart(2, '0')}:00`
    peakHoursMap[key] = (peakHoursMap[key] || 0) + 1
  })

  const peakHoursData = Object.entries(peakHoursMap)
    .map(([time, count]) => ({
      'Day & Time': time,
      'Booking Count': count,
    }))
    .sort((a, b) => b['Booking Count'] - a['Booking Count'])

  if (peakHoursData.length > 0) {
    const peakHoursSheet = XLSX.utils.json_to_sheet(peakHoursData)
    XLSX.utils.book_append_sheet(workbook, peakHoursSheet, 'Peak Hours')
  }

  // ========== Sheet 5: Top Service Packages ==========
  const packageMap: Record<string, { count: number; revenue: number }> = {}
  filteredBookings.forEach(b => {
    const packageName = b.service_packages?.name || 'Unknown'
    if (!packageMap[packageName]) {
      packageMap[packageName] = { count: 0, revenue: 0 }
    }
    packageMap[packageName].count++
    if (b.status === 'completed') {
      packageMap[packageName].revenue += Number(b.total_price)
    }
  })

  const topPackagesData = Object.entries(packageMap)
    .map(([name, data]) => ({
      'Package Name': name,
      'Total Bookings': data.count,
      'Completed Revenue (฿)': data.revenue.toFixed(2),
      'Avg Price (฿)': data.count > 0 ? (data.revenue / data.count).toFixed(2) : '0.00',
    }))
    .sort((a, b) => b['Total Bookings'] - a['Total Bookings'])
    .slice(0, 10)

  if (topPackagesData.length > 0) {
    const topPackagesSheet = XLSX.utils.json_to_sheet(topPackagesData)
    XLSX.utils.book_append_sheet(workbook, topPackagesSheet, 'Top Packages')
  }

  // Download file
  XLSX.writeFile(workbook, `revenue-report_${dateRange}_${timestamp}.xlsx`)

  return true
}

/**
 * Export Customers data to Excel with multiple sheets
 * Sheets: All Customers, Top Customers
 * @returns true if export successful, false if no data
 */
export const exportCustomersToExcel = (
  customers: CustomerForExport[],
  topCustomers: TopCustomerForExport[]
): boolean => {
  const timestamp = format(new Date(), 'yyyy-MM-dd_HHmmss')

  if (customers.length === 0) {
    return false
  }

  const workbook = XLSX.utils.book_new()

  // Sheet 1: All Customers
  const customerData = customers.map(c => ({
    'Customer ID': c.id,
    'Full Name': c.full_name,
    'Email': c.email,
    'Phone': c.phone || 'N/A',
    'Joined Date': format(new Date(c.created_at), 'yyyy-MM-dd'),
  }))
  const customersSheet = XLSX.utils.json_to_sheet(customerData)
  XLSX.utils.book_append_sheet(workbook, customersSheet, 'All Customers')

  // Sheet 2: Top Customers
  if (topCustomers.length > 0) {
    const topCustomerData = topCustomers.map((c, index) => ({
      'Rank': index + 1,
      'Customer Name': c.name,
      'Email': c.email,
      'Total Bookings': c.totalBookings,
      'Total Revenue (฿)': c.totalRevenue.toFixed(2),
      'Last Booking': c.lastBooking ? format(new Date(c.lastBooking), 'yyyy-MM-dd') : 'N/A',
    }))
    const topCustomersSheet = XLSX.utils.json_to_sheet(topCustomerData)
    XLSX.utils.book_append_sheet(workbook, topCustomersSheet, 'Top Customers')
  }

  XLSX.writeFile(workbook, `customers-report_${timestamp}.xlsx`)
  return true
}

/**
 * Export Staff Performance data to Excel
 * @returns true if export successful, false if no data
 */
export const exportStaffToExcel = (
  staffPerformance: StaffPerformanceForExport[],
  role: 'admin' | 'manager' | 'staff' | null = null
): boolean => {
  const timestamp = format(new Date(), 'yyyy-MM-dd_HHmmss')

  if (staffPerformance.length === 0) {
    return false
  }

  const workbook = XLSX.utils.book_new()

  const staffData = staffPerformance.map((s, index) => {
    const baseData: Record<string, string | number> = {
      'Rank': index + 1,
      'Staff Name': s.name,
      'Total Jobs': s.totalJobs,
      'Completed Jobs': s.completedJobs,
      'Completion Rate (%)': s.completionRate.toFixed(1),
      'Utilization Rate (%)': s.utilizationRate.toFixed(1),
    }

    if (role === 'admin') {
      baseData['Revenue (฿)'] = s.revenue.toFixed(2)
      baseData['Avg Job Value (฿)'] = s.avgJobValue.toFixed(2)
    }

    return baseData
  })

  const staffSheet = XLSX.utils.json_to_sheet(staffData)
  XLSX.utils.book_append_sheet(workbook, staffSheet, 'Staff Performance')

  XLSX.writeFile(workbook, `staff-performance_${timestamp}.xlsx`)
  return true
}

/**
 * Export Team Performance data to Excel
 * @returns true if export successful, false if no data
 */
export const exportTeamsToExcel = (
  teamsData: TeamForExport[],
  role: 'admin' | 'manager' | 'staff' | null = null
): boolean => {
  const timestamp = format(new Date(), 'yyyy-MM-dd_HHmmss')

  if (teamsData.length === 0) {
    return false
  }

  const workbook = XLSX.utils.book_new()

  const teamData = teamsData.map((team, index) => {
    const totalJobs = team.bookings.length
    const completed = team.bookings.filter((b) => b.status === 'completed').length
    const inProgress = team.bookings.filter((b) => b.status === 'in_progress').length
    const pending = team.bookings.filter((b) => b.status === 'pending').length
    const revenue = team.bookings
      .filter((b) => b.status === 'completed')
      .reduce((sum: number, b) => sum + Number(b.total_price), 0)
    const memberCount = team.team_members.length
    const completionRate = totalJobs > 0 ? (completed / totalJobs) * 100 : 0

    const baseData: Record<string, string | number> = {
      'Rank': index + 1,
      'Team Name': team.name,
      'Members': memberCount,
      'Total Jobs': totalJobs,
      'Completed': completed,
      'In Progress': inProgress,
      'Pending': pending,
      'Completion Rate (%)': completionRate.toFixed(1),
    }

    if (role === 'admin') {
      baseData['Revenue (฿)'] = revenue.toFixed(2)
    }

    return baseData
  })

  const teamsSheet = XLSX.utils.json_to_sheet(teamData)
  XLSX.utils.book_append_sheet(workbook, teamsSheet, 'Team Performance')

  XLSX.writeFile(workbook, `team-performance_${timestamp}.xlsx`)
  return true
}
