import { format, isWithinInterval, startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth, subDays, subWeeks, subMonths } from 'date-fns'

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
    default:
      return { start: startOfMonth(now), end: endOfMonth(now) }
  }
}

/**
 * Convert array of objects to CSV format
 */
export const convertToCSV = (data: Record<string, unknown>[], headers: string[]): string => {
  if (data.length === 0) return ''

  // Create header row
  const headerRow = headers.join(',')

  // Create data rows
  const dataRows = data.map(row => {
    return headers.map(header => {
      const value = row[header]

      // Handle null/undefined
      if (value === null || value === undefined) return ''

      // Handle strings with commas or quotes
      if (typeof value === 'string' && (value.includes(',') || value.includes('"') || value.includes('\n'))) {
        return `"${value.replace(/"/g, '""')}"`
      }

      return value
    }).join(',')
  })

  return [headerRow, ...dataRows].join('\n')
}

/**
 * Download CSV file with UTF-8 BOM for Excel compatibility
 */
export const downloadCSV = (csvContent: string, filename: string): void => {
  // Add UTF-8 BOM to make Excel recognize UTF-8 encoding
  const BOM = '\uFEFF'
  const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' })
  const link = document.createElement('a')

  if (link.download !== undefined) {
    const url = URL.createObjectURL(blob)
    link.setAttribute('href', url)
    link.setAttribute('download', filename)
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }
}

/**
 * Export Revenue & Bookings data
 * @returns true if export successful, false if no data
 */
export const exportRevenueBookings = (
  bookings: BookingForExport[],
  dateRange: string,
  exportType: 'summary' | 'detailed' | 'all',
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
    return false  // No data to export
  }

  let exported = false  // Track if any file was actually exported

  if (exportType === 'summary' || exportType === 'all') {
    // Export revenue summary (completed bookings only)
    const completedBookings = filteredBookings.filter(b => b.status === 'completed')

    if (completedBookings.length > 0) {
      const revenueData = completedBookings.map(b => {
        const baseData = {
          Date: format(new Date(b.booking_date), 'dd/MM/yyyy'),
          Time: b.start_time || 'N/A',
          'Service Package': b.service_packages?.name || 'N/A',
          'Service Type': b.service_packages?.service_type || 'N/A',
        }

        // Only include revenue for admin
        if (role === 'admin') {
          return {
            ...baseData,
            'Revenue (฿)': Number(b.total_price).toFixed(2),
          }
        }

        return baseData
      })

      const headers = role === 'admin'
        ? ['Date', 'Time', 'Service Package', 'Service Type', 'Revenue (฿)']
        : ['Date', 'Time', 'Service Package', 'Service Type']

      const csvContent = convertToCSV(revenueData, headers)
      downloadCSV(csvContent, `revenue-summary_${dateRange}_${timestamp}.csv`)
      exported = true  // Mark as exported
    }
  }

  if (exportType === 'detailed' || exportType === 'all') {
    // Export all bookings with details
    const detailedData = filteredBookings.map(b => {
      const baseData = {
        'Booking ID': b.id.substring(0, 8),
        'Date': format(new Date(b.booking_date), 'dd/MM/yyyy'),
        'Time': b.start_time || 'N/A',
        'Service Package': b.service_packages?.name || 'N/A',
        'Service Type': b.service_packages?.service_type || 'N/A',
      }

      // Only include price for admin
      if (role === 'admin') {
        return {
          ...baseData,
          'Price (฿)': Number(b.total_price).toFixed(2),
          'Status': b.status,
          'Created': format(new Date(b.created_at), 'dd/MM/yyyy HH:mm'),
        }
      }

      return {
        ...baseData,
        'Status': b.status,
        'Created': format(new Date(b.created_at), 'dd/MM/yyyy HH:mm'),
      }
    })

    const headers = role === 'admin'
      ? ['Booking ID', 'Date', 'Time', 'Service Package', 'Service Type', 'Price (฿)', 'Status', 'Created']
      : ['Booking ID', 'Date', 'Time', 'Service Package', 'Service Type', 'Status', 'Created']

    const csvContent = convertToCSV(detailedData, headers)
    downloadCSV(csvContent, `bookings-detailed_${dateRange}_${timestamp}.csv`)
    exported = true  // Mark as exported
  }

  return exported  // Return true only if actually exported
}

/**
 * Export Revenue by Service Type
 * @returns true if export successful, false if no data
 */
export const exportRevenueByServiceType = (
  bookings: BookingForExport[],
  dateRange: string,
  role: 'admin' | 'manager' | 'staff' | null = null
): boolean => {
  const timestamp = format(new Date(), 'yyyy-MM-dd_HHmmss')
  const { start, end } = getDateRangePreset(dateRange)

  // Filter completed bookings by date range
  const filteredBookings = bookings.filter(b => {
    const bookingDate = new Date(b.booking_date)
    return b.status === 'completed' && isWithinInterval(bookingDate, { start, end })
  })

  if (filteredBookings.length === 0) {
    return false  // No data to export
  }

  // Group by service type
  const serviceTypeData: Record<string, { count: number; revenue: number }> = {}

  filteredBookings.forEach(b => {
    const serviceType = b.service_packages?.service_type || 'Unknown'
    if (!serviceTypeData[serviceType]) {
      serviceTypeData[serviceType] = { count: 0, revenue: 0 }
    }
    serviceTypeData[serviceType].count++
    serviceTypeData[serviceType].revenue += Number(b.total_price)
  })

  const exportData = Object.entries(serviceTypeData).map(([type, data]) => {
    const baseData = {
      'Service Type': type,
      'Total Bookings': data.count,
    }

    // Only include revenue data for admin
    if (role === 'admin') {
      return {
        ...baseData,
        'Total Revenue (฿)': data.revenue.toFixed(2),
        'Average Price (฿)': (data.revenue / data.count).toFixed(2),
      }
    }

    return baseData
  })

  const headers = role === 'admin'
    ? ['Service Type', 'Total Bookings', 'Total Revenue (฿)', 'Average Price (฿)']
    : ['Service Type', 'Total Bookings']

  const csvContent = convertToCSV(exportData, headers)
  downloadCSV(csvContent, `revenue-by-service-type_${dateRange}_${timestamp}.csv`)

  return true  // Export successful
}

/**
 * Export Peak Hours data
 * @returns true if export successful, false if no data
 */
export const exportPeakHours = (
  bookings: BookingForExport[],
  dateRange: string
): boolean => {
  const timestamp = format(new Date(), 'yyyy-MM-dd_HHmmss')
  const { start, end } = getDateRangePreset(dateRange)

  // Filter bookings by date range
  const filteredBookings = bookings.filter(b => {
    const bookingDate = new Date(b.booking_date)
    return isWithinInterval(bookingDate, { start, end })
  })

  if (filteredBookings.length === 0) {
    return false  // No data to export
  }

  // Group by day and hour
  const peakHoursMap: Record<string, number> = {}

  filteredBookings.forEach(b => {
    const bookingDate = new Date(b.booking_date)
    const day = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][bookingDate.getDay()]

    // Parse hour from start_time (format: "HH:MM:SS" or "HH:MM")
    let hour = 0
    if (b.start_time) {
      const timeParts = b.start_time.split(':')
      hour = parseInt(timeParts[0], 10)
    }

    const key = `${day} ${hour.toString().padStart(2, '0')}:00`
    peakHoursMap[key] = (peakHoursMap[key] || 0) + 1
  })

  const exportData = Object.entries(peakHoursMap)
    .map(([time, count]) => ({
      'Day & Time': time,
      'Booking Count': count,
    }))
    .sort((a, b) => b['Booking Count'] - a['Booking Count'])

  const csvContent = convertToCSV(exportData, ['Day & Time', 'Booking Count'])
  downloadCSV(csvContent, `peak-hours_${dateRange}_${timestamp}.csv`)

  return true  // Export successful
}

/**
 * Export Top Service Packages
 * @returns true if export successful, false if no data
 */
export const exportTopServicePackages = (
  bookings: BookingForExport[],
  dateRange: string,
  limit: number = 10
): boolean => {
  const timestamp = format(new Date(), 'yyyy-MM-dd_HHmmss')
  const { start, end } = getDateRangePreset(dateRange)

  // Filter bookings by date range
  const filteredBookings = bookings.filter(b => {
    const bookingDate = new Date(b.booking_date)
    return isWithinInterval(bookingDate, { start, end })
  })

  if (filteredBookings.length === 0) {
    return false  // No data to export
  }

  // Group by package name
  const packageData: Record<string, { count: number; revenue: number }> = {}

  filteredBookings.forEach(b => {
    const packageName = b.service_packages?.name || 'Unknown'
    const key = packageName

    if (!packageData[key]) {
      packageData[key] = { count: 0, revenue: 0 }
    }
    packageData[key].count++
    if (b.status === 'completed') {
      packageData[key].revenue += Number(b.total_price)
    }
  })

  const exportData = Object.entries(packageData)
    .map(([name, data]) => ({
      'Package Name': name,
      'Total Bookings': data.count,
      'Completed Revenue (฿)': data.revenue.toFixed(2),
      'Avg Price (฿)': data.count > 0 ? (data.revenue / data.count).toFixed(2) : '0.00',
    }))
    .sort((a, b) => b['Total Bookings'] - a['Total Bookings'])
    .slice(0, limit)

  const csvContent = convertToCSV(exportData, [
    'Package Name',
    'Total Bookings',
    'Completed Revenue (฿)',
    'Avg Price (฿)'
  ])
  downloadCSV(csvContent, `top-service-packages_${dateRange}_${timestamp}.csv`)

  return true  // Export successful
}

/**
 * Export Customers data
 * @returns true if export successful, false if no data
 */
export const exportCustomers = (
  customers: CustomerForExport[],
  topCustomers: TopCustomerForExport[],
  exportType: 'all-customers' | 'top-customers' | 'all'
): boolean => {
  const timestamp = format(new Date(), 'yyyy-MM-dd_HHmmss')

  // Check if there's any data to export
  if (customers.length === 0) {
    return false  // No data to export
  }

  if (exportType === 'all-customers' || exportType === 'all') {
    const customerData = customers.map(c => ({
      'Customer ID': c.id,
      'Full Name': c.full_name,
      'Email': c.email,
      'Phone': c.phone || 'N/A',
      'Joined Date': format(new Date(c.created_at), 'yyyy-MM-dd'),
    }))

    const csvContent = convertToCSV(customerData, ['Customer ID', 'Full Name', 'Email', 'Phone', 'Joined Date'])
    downloadCSV(csvContent, `customers-all_${timestamp}.csv`)
  }

  if (exportType === 'top-customers' || exportType === 'all') {
    const topCustomerData = topCustomers.map((c, index) => ({
      'Rank': index + 1,
      'Customer Name': c.name,
      'Email': c.email,
      'Total Bookings': c.totalBookings,
      'Total Revenue': c.totalRevenue,
      'Last Booking': c.lastBooking ? format(new Date(c.lastBooking), 'yyyy-MM-dd') : 'N/A',
    }))

    const csvContent = convertToCSV(topCustomerData, [
      'Rank',
      'Customer Name',
      'Email',
      'Total Bookings',
      'Total Revenue',
      'Last Booking'
    ])
    downloadCSV(csvContent, `customers-top10_${timestamp}.csv`)
  }

  return true  // Export successful
}

/**
 * Export Staff Performance data
 * @returns true if export successful, false if no data
 */
export const exportStaffPerformance = (
  staffPerformance: StaffPerformanceForExport[],
  role: 'admin' | 'manager' | 'staff' | null = null
): boolean => {
  const timestamp = format(new Date(), 'yyyy-MM-dd_HHmmss')

  // Check if there's any data to export
  if (staffPerformance.length === 0) {
    return false  // No data to export
  }

  const staffData = staffPerformance.map(s => {
    const baseData = {
      'Staff Name': s.name,
      'Total Jobs': s.totalJobs,
      'Completed Jobs': s.completedJobs,
      'Completion Rate (%)': s.completionRate.toFixed(1),
      'Utilization Rate (%)': s.utilizationRate.toFixed(1),
    }

    // Only admin can see revenue data
    if (role === 'admin') {
      return {
        ...baseData,
        'Revenue': s.revenue,
        'Avg Job Value': s.avgJobValue.toFixed(2),
      }
    }

    return baseData
  })

  const headers = role === 'admin'
    ? ['Staff Name', 'Total Jobs', 'Completed Jobs', 'Completion Rate (%)', 'Utilization Rate (%)', 'Revenue', 'Avg Job Value']
    : ['Staff Name', 'Total Jobs', 'Completed Jobs', 'Completion Rate (%)', 'Utilization Rate (%)']

  const csvContent = convertToCSV(staffData, headers)
  downloadCSV(csvContent, `staff-performance_${timestamp}.csv`)

  return true  // Export successful
}

/**
 * Export Team Performance data
 * @returns true if export successful, false if no data
 */
export const exportTeamPerformance = (
  teamsData: TeamForExport[],
  role: 'admin' | 'manager' | 'staff' | null = null
): boolean => {
  const timestamp = format(new Date(), 'yyyy-MM-dd_HHmmss')

  // Check if there's any data to export
  if (teamsData.length === 0) {
    return false  // No data to export
  }

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

    const baseData = {
      'Rank': index + 1,
      'Team Name': team.name,
      'Members': memberCount,
      'Total Jobs': totalJobs,
      'Completed': completed,
      'In Progress': inProgress,
      'Pending': pending,
      'Completion Rate (%)': completionRate.toFixed(1),
    }

    // Only admin can see revenue
    if (role === 'admin') {
      return {
        ...baseData,
        'Revenue': revenue.toFixed(2),
      }
    }

    return baseData
  })

  const headers = role === 'admin'
    ? ['Rank', 'Team Name', 'Members', 'Total Jobs', 'Completed', 'In Progress', 'Pending', 'Completion Rate (%)', 'Revenue']
    : ['Rank', 'Team Name', 'Members', 'Total Jobs', 'Completed', 'In Progress', 'Pending', 'Completion Rate (%)']

  const csvContent = convertToCSV(teamData, headers)
  downloadCSV(csvContent, `team-performance_${timestamp}.csv`)

  return true  // Export successful
}
