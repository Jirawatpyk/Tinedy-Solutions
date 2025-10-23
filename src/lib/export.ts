import { format, isWithinInterval, startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth, subDays, subWeeks, subMonths } from 'date-fns'

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
 * Convert array of objects to CSV format
 */
export const convertToCSV = (data: any[], headers: string[]): string => {
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
 */
export const exportRevenueBookings = (
  bookings: any[],
  dateRange: string,
  exportType: 'summary' | 'detailed' | 'all'
): void => {
  const timestamp = format(new Date(), 'yyyy-MM-dd_HHmmss')
  const { start, end } = getDateRangePreset(dateRange)

  // Filter bookings by date range
  const filteredBookings = bookings.filter(b => {
    const bookingDate = new Date(b.booking_date)
    return isWithinInterval(bookingDate, { start, end })
  })

  if (filteredBookings.length === 0) {
    console.warn('No bookings found in the selected date range')
    return
  }

  if (exportType === 'summary' || exportType === 'all') {
    // Export revenue summary (completed bookings only)
    const completedBookings = filteredBookings.filter(b => b.status === 'completed')

    if (completedBookings.length > 0) {
      const revenueData = completedBookings.map(b => ({
        Date: format(new Date(b.booking_date), 'dd/MM/yyyy'),
        Time: b.start_time || 'N/A',
        'Service Package': b.service_packages?.name || 'N/A',
        'Service Type': b.service_packages?.service_type || 'N/A',
        'Revenue (฿)': Number(b.total_price).toFixed(2),
      }))

      const csvContent = convertToCSV(revenueData, ['Date', 'Time', 'Service Package', 'Service Type', 'Revenue (฿)'])
      downloadCSV(csvContent, `revenue-summary_${dateRange}_${timestamp}.csv`)
    }
  }

  if (exportType === 'detailed' || exportType === 'all') {
    // Export all bookings with details
    const detailedData = filteredBookings.map(b => ({
      'Booking ID': b.id.substring(0, 8),
      'Date': format(new Date(b.booking_date), 'dd/MM/yyyy'),
      'Time': b.start_time || 'N/A',
      'Service Package': b.service_packages?.name || 'N/A',
      'Service Type': b.service_packages?.service_type || 'N/A',
      'Price (฿)': Number(b.total_price).toFixed(2),
      'Status': b.status,
      'Created': format(new Date(b.created_at), 'dd/MM/yyyy HH:mm'),
    }))

    const csvContent = convertToCSV(detailedData, [
      'Booking ID',
      'Date',
      'Time',
      'Service Package',
      'Service Type',
      'Price (฿)',
      'Status',
      'Created'
    ])
    downloadCSV(csvContent, `bookings-detailed_${dateRange}_${timestamp}.csv`)
  }
}

/**
 * Export Revenue by Service Type
 */
export const exportRevenueByServiceType = (
  bookings: any[],
  dateRange: string
): void => {
  const timestamp = format(new Date(), 'yyyy-MM-dd_HHmmss')
  const { start, end } = getDateRangePreset(dateRange)

  // Filter completed bookings by date range
  const filteredBookings = bookings.filter(b => {
    const bookingDate = new Date(b.booking_date)
    return b.status === 'completed' && isWithinInterval(bookingDate, { start, end })
  })

  if (filteredBookings.length === 0) {
    console.warn('No completed bookings found in the selected date range')
    return
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

  const exportData = Object.entries(serviceTypeData).map(([type, data]) => ({
    'Service Type': type,
    'Total Bookings': data.count,
    'Total Revenue (฿)': data.revenue.toFixed(2),
    'Average Price (฿)': (data.revenue / data.count).toFixed(2),
  }))

  const csvContent = convertToCSV(exportData, [
    'Service Type',
    'Total Bookings',
    'Total Revenue (฿)',
    'Average Price (฿)'
  ])
  downloadCSV(csvContent, `revenue-by-service-type_${dateRange}_${timestamp}.csv`)
}

/**
 * Export Peak Hours data
 */
export const exportPeakHours = (
  bookings: any[],
  dateRange: string
): void => {
  const timestamp = format(new Date(), 'yyyy-MM-dd_HHmmss')
  const { start, end } = getDateRangePreset(dateRange)

  // Filter bookings by date range
  const filteredBookings = bookings.filter(b => {
    const bookingDate = new Date(b.booking_date)
    return isWithinInterval(bookingDate, { start, end })
  })

  if (filteredBookings.length === 0) {
    console.warn('No bookings found in the selected date range')
    return
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
}

/**
 * Export Top Service Packages
 */
export const exportTopServicePackages = (
  bookings: any[],
  dateRange: string,
  limit: number = 10
): void => {
  const timestamp = format(new Date(), 'yyyy-MM-dd_HHmmss')
  const { start, end } = getDateRangePreset(dateRange)

  // Filter bookings by date range
  const filteredBookings = bookings.filter(b => {
    const bookingDate = new Date(b.booking_date)
    return isWithinInterval(bookingDate, { start, end })
  })

  if (filteredBookings.length === 0) {
    console.warn('No bookings found in the selected date range')
    return
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
}

/**
 * Export Customers data
 */
export const exportCustomers = (
  customers: any[],
  topCustomers: any[],
  exportType: 'all-customers' | 'top-customers' | 'all'
): void => {
  const timestamp = format(new Date(), 'yyyy-MM-dd_HHmmss')

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
}

/**
 * Export Staff Performance data
 */
export const exportStaffPerformance = (staffPerformance: any[]): void => {
  const timestamp = format(new Date(), 'yyyy-MM-dd_HHmmss')

  const staffData = staffPerformance.map(s => ({
    'Staff Name': s.name,
    'Total Jobs': s.totalJobs,
    'Completed Jobs': s.completedJobs,
    'Revenue': s.revenue,
    'Completion Rate (%)': s.completionRate.toFixed(1),
    'Avg Job Value': s.avgJobValue.toFixed(2),
    'Utilization Rate (%)': s.utilizationRate.toFixed(1),
  }))

  const csvContent = convertToCSV(staffData, [
    'Staff Name',
    'Total Jobs',
    'Completed Jobs',
    'Revenue',
    'Completion Rate (%)',
    'Avg Job Value',
    'Utilization Rate (%)'
  ])
  downloadCSV(csvContent, `staff-performance_${timestamp}.csv`)
}

/**
 * Export Team Performance data
 */
export const exportTeamPerformance = (teamsData: any[]): void => {
  const timestamp = format(new Date(), 'yyyy-MM-dd_HHmmss')

  const teamData = teamsData.map((team, index) => {
    const totalJobs = team.bookings.length
    const completed = team.bookings.filter((b: any) => b.status === 'completed').length
    const inProgress = team.bookings.filter((b: any) => b.status === 'in_progress').length
    const pending = team.bookings.filter((b: any) => b.status === 'pending').length
    const revenue = team.bookings
      .filter((b: any) => b.status === 'completed')
      .reduce((sum: number, b: any) => sum + Number(b.total_price), 0)
    const memberCount = team.team_members.length
    const completionRate = totalJobs > 0 ? (completed / totalJobs) * 100 : 0

    return {
      'Rank': index + 1,
      'Team Name': team.name,
      'Members': memberCount,
      'Total Jobs': totalJobs,
      'Completed': completed,
      'In Progress': inProgress,
      'Pending': pending,
      'Revenue': revenue.toFixed(2),
      'Completion Rate (%)': completionRate.toFixed(1),
    }
  })

  const csvContent = convertToCSV(teamData, [
    'Rank',
    'Team Name',
    'Members',
    'Total Jobs',
    'Completed',
    'In Progress',
    'Pending',
    'Revenue',
    'Completion Rate (%)'
  ])
  downloadCSV(csvContent, `team-performance_${timestamp}.csv`)
}
