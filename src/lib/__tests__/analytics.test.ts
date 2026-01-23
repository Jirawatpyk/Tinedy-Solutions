import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  calculateRevenueMetrics,
  calculateBookingMetrics,
  generateChartData,
  getRevenueByServiceType,
  formatGrowth,
  getDateRangePreset,
  getBookingStatusBreakdown,
  getPeakHoursData,
  calculateCustomerMetrics,
  getTopCustomers,
  getCustomerAcquisitionTrend,
  getCustomerCLVDistribution,
  getCustomerSegmentation,
  getRepeatCustomerRateTrend,
  calculateStaffMetrics,
  getStaffPerformance,
  calculateTeamMetrics,
  getTeamPerformance,
  filterFinancialDataForRole,
  type BookingForAnalytics,
  type CustomerWithBookings,
  type StaffWithBookings,
  type TeamWithBookings,
  type Staff,
  type Team,
} from '../analytics'

describe('analytics', () => {
  // Mock current date for consistent testing
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2025-10-26T12:00:00Z'))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  const createMockBooking = (overrides: Partial<BookingForAnalytics> = {}): BookingForAnalytics => ({
    id: 'booking-1',
    booking_date: '2025-10-26',
    total_price: 1000,
    status: 'completed',
    payment_status: 'paid', // Required for revenue calculations
    ...overrides,
  })

  describe('calculateRevenueMetrics', () => {
    it('should calculate total revenue from paid bookings only', () => {
      // Arrange
      const bookings: BookingForAnalytics[] = [
        createMockBooking({ total_price: 1000, payment_status: 'paid' }),
        createMockBooking({ total_price: 2000, payment_status: 'paid' }),
        createMockBooking({ total_price: 3000, payment_status: 'unpaid' }), // Should be excluded
      ]

      // Act
      const metrics = calculateRevenueMetrics(bookings)

      // Assert
      expect(metrics.total).toBe(3000) // Only paid bookings
    })

    it('should return zero for empty bookings array', () => {
      // Act
      const metrics = calculateRevenueMetrics([])

      // Assert
      expect(metrics.total).toBe(0)
      expect(metrics.thisMonth).toBe(0)
      expect(metrics.avgOrderValue).toBe(0)
    })

    it('should calculate today revenue correctly', () => {
      // Arrange
      const bookings: BookingForAnalytics[] = [
        createMockBooking({ booking_date: '2025-10-26', total_price: 500 }),
        createMockBooking({ booking_date: '2025-10-26', total_price: 300 }),
        createMockBooking({ booking_date: '2025-10-25', total_price: 200 }), // Yesterday
      ]

      // Act
      const metrics = calculateRevenueMetrics(bookings)

      // Assert
      expect(metrics.today).toBe(800) // 500 + 300
    })

    it('should calculate yesterday revenue correctly', () => {
      // Arrange
      const bookings: BookingForAnalytics[] = [
        createMockBooking({ booking_date: '2025-10-25', total_price: 400 }),
        createMockBooking({ booking_date: '2025-10-26', total_price: 500 }), // Today
      ]

      // Act
      const metrics = calculateRevenueMetrics(bookings)

      // Assert
      expect(metrics.yesterday).toBe(400)
    })

    it('should calculate this week revenue correctly', () => {
      // Arrange - Week starts on Sunday (2025-10-26 is Sunday)
      const bookings: BookingForAnalytics[] = [
        createMockBooking({ booking_date: '2025-10-26', total_price: 100 }), // Sunday
        createMockBooking({ booking_date: '2025-10-27', total_price: 200 }), // Monday
        createMockBooking({ booking_date: '2025-10-20', total_price: 300 }), // Last week
      ]

      // Act
      const metrics = calculateRevenueMetrics(bookings)

      // Assert
      expect(metrics.thisWeek).toBe(300) // 100 + 200
    })

    it('should calculate this month revenue correctly', () => {
      // Arrange
      const bookings: BookingForAnalytics[] = [
        createMockBooking({ booking_date: '2025-10-01', total_price: 100 }),
        createMockBooking({ booking_date: '2025-10-15', total_price: 200 }),
        createMockBooking({ booking_date: '2025-10-26', total_price: 300 }),
        createMockBooking({ booking_date: '2025-09-30', total_price: 400 }), // Last month
      ]

      // Act
      const metrics = calculateRevenueMetrics(bookings)

      // Assert
      expect(metrics.thisMonth).toBe(600) // 100 + 200 + 300
    })

    it('should calculate month growth percentage correctly', () => {
      // Arrange
      const bookings: BookingForAnalytics[] = [
        createMockBooking({ booking_date: '2025-10-15', total_price: 1500 }), // This month
        createMockBooking({ booking_date: '2025-09-15', total_price: 1000 }), // Last month
      ]

      // Act
      const metrics = calculateRevenueMetrics(bookings)

      // Assert
      expect(metrics.monthGrowth).toBe(50) // (1500 - 1000) / 1000 * 100 = 50%
    })

    it('should return zero growth when last month is zero', () => {
      // Arrange
      const bookings: BookingForAnalytics[] = [
        createMockBooking({ booking_date: '2025-10-15', total_price: 1000 }),
      ]

      // Act
      const metrics = calculateRevenueMetrics(bookings)

      // Assert
      expect(metrics.monthGrowth).toBe(0)
    })

    it('should calculate negative growth correctly', () => {
      // Arrange
      const bookings: BookingForAnalytics[] = [
        createMockBooking({ booking_date: '2025-10-15', total_price: 500 }), // This month
        createMockBooking({ booking_date: '2025-09-15', total_price: 1000 }), // Last month
      ]

      // Act
      const metrics = calculateRevenueMetrics(bookings)

      // Assert
      expect(metrics.monthGrowth).toBe(-50) // (500 - 1000) / 1000 * 100 = -50%
    })

    it('should calculate average order value correctly', () => {
      // Arrange
      const bookings: BookingForAnalytics[] = [
        createMockBooking({ total_price: 1000 }),
        createMockBooking({ total_price: 2000 }),
        createMockBooking({ total_price: 3000 }),
      ]

      // Act
      const metrics = calculateRevenueMetrics(bookings)

      // Assert
      expect(metrics.avgOrderValue).toBe(2000) // 6000 / 3
    })

    it('should handle decimal prices correctly', () => {
      // Arrange
      const bookings: BookingForAnalytics[] = [
        createMockBooking({ total_price: 1299.99 }),
        createMockBooking({ total_price: 2499.50 }),
      ]

      // Act
      const metrics = calculateRevenueMetrics(bookings)

      // Assert
      expect(metrics.total).toBeCloseTo(3799.49, 2)
    })
  })

  describe('calculateBookingMetrics', () => {
    it('should count total bookings correctly', () => {
      // Arrange
      const bookings: BookingForAnalytics[] = [
        createMockBooking({ status: 'completed' }),
        createMockBooking({ status: 'pending' }),
        createMockBooking({ status: 'cancelled' }),
      ]

      // Act
      const metrics = calculateBookingMetrics(bookings)

      // Assert
      expect(metrics.total).toBe(3)
    })

    it('should count completed bookings correctly', () => {
      // Arrange
      const bookings: BookingForAnalytics[] = [
        createMockBooking({ status: 'completed' }),
        createMockBooking({ status: 'completed' }),
        createMockBooking({ status: 'pending' }),
      ]

      // Act
      const metrics = calculateBookingMetrics(bookings)

      // Assert
      expect(metrics.completed).toBe(2)
    })

    it('should count pending bookings correctly', () => {
      // Arrange
      const bookings: BookingForAnalytics[] = [
        createMockBooking({ status: 'pending' }),
        createMockBooking({ status: 'pending' }),
        createMockBooking({ status: 'completed' }),
      ]

      // Act
      const metrics = calculateBookingMetrics(bookings)

      // Assert
      expect(metrics.pending).toBe(2)
    })

    it('should count cancelled bookings correctly', () => {
      // Arrange
      const bookings: BookingForAnalytics[] = [
        createMockBooking({ status: 'cancelled' }),
        createMockBooking({ status: 'completed' }),
      ]

      // Act
      const metrics = calculateBookingMetrics(bookings)

      // Assert
      expect(metrics.cancelled).toBe(1)
    })

    it('should calculate completion rate correctly', () => {
      // Arrange
      const bookings: BookingForAnalytics[] = [
        createMockBooking({ status: 'completed' }),
        createMockBooking({ status: 'completed' }),
        createMockBooking({ status: 'pending' }),
        createMockBooking({ status: 'cancelled' }),
      ]

      // Act
      const metrics = calculateBookingMetrics(bookings)

      // Assert
      expect(metrics.completionRate).toBe(50) // 2/4 * 100
    })

    it('should calculate cancellation rate correctly', () => {
      // Arrange
      const bookings: BookingForAnalytics[] = [
        createMockBooking({ status: 'completed' }),
        createMockBooking({ status: 'completed' }),
        createMockBooking({ status: 'cancelled' }),
        createMockBooking({ status: 'cancelled' }),
      ]

      // Act
      const metrics = calculateBookingMetrics(bookings)

      // Assert
      expect(metrics.cancellationRate).toBe(50) // 2/4 * 100
    })

    it('should return zero rates for empty bookings', () => {
      // Act
      const metrics = calculateBookingMetrics([])

      // Assert
      expect(metrics.completionRate).toBe(0)
      expect(metrics.cancellationRate).toBe(0)
    })

    it('should count this month bookings correctly', () => {
      // Arrange
      const bookings: BookingForAnalytics[] = [
        createMockBooking({ booking_date: '2025-10-15' }),
        createMockBooking({ booking_date: '2025-10-26' }),
        createMockBooking({ booking_date: '2025-09-30' }), // Last month
      ]

      // Act
      const metrics = calculateBookingMetrics(bookings)

      // Assert
      expect(metrics.thisMonth).toBe(2)
    })

    it('should count last month bookings correctly', () => {
      // Arrange
      const bookings: BookingForAnalytics[] = [
        createMockBooking({ booking_date: '2025-09-15' }),
        createMockBooking({ booking_date: '2025-09-25' }),
        createMockBooking({ booking_date: '2025-10-01' }), // This month
      ]

      // Act
      const metrics = calculateBookingMetrics(bookings)

      // Assert
      expect(metrics.lastMonth).toBe(2)
    })
  })

  describe('generateChartData', () => {
    it('should generate chart data for date range', () => {
      // Arrange
      const startDate = new Date('2025-10-01')
      const endDate = new Date('2025-10-03')
      const bookings: BookingForAnalytics[] = [
        createMockBooking({ booking_date: '2025-10-01', total_price: 100 }),
        createMockBooking({ booking_date: '2025-10-02', total_price: 200 }),
        createMockBooking({ booking_date: '2025-10-03', total_price: 300 }),
      ]

      // Act
      const chartData = generateChartData(bookings, startDate, endDate)

      // Assert
      expect(chartData).toHaveLength(3)
      expect(chartData[0]).toMatchObject({ revenue: 100, bookings: 1 })
      expect(chartData[1]).toMatchObject({ revenue: 200, bookings: 1 })
      expect(chartData[2]).toMatchObject({ revenue: 300, bookings: 1 })
    })

    it('should include only paid bookings', () => {
      // Arrange
      const startDate = new Date('2025-10-01')
      const endDate = new Date('2025-10-01')
      const bookings: BookingForAnalytics[] = [
        createMockBooking({ booking_date: '2025-10-01', total_price: 100, payment_status: 'paid' }),
        createMockBooking({ booking_date: '2025-10-01', total_price: 200, payment_status: 'unpaid' }),
      ]

      // Act
      const chartData = generateChartData(bookings, startDate, endDate)

      // Assert
      expect(chartData[0].revenue).toBe(100)
      expect(chartData[0].bookings).toBe(1)
    })

    it('should handle days with no bookings', () => {
      // Arrange
      const startDate = new Date('2025-10-01')
      const endDate = new Date('2025-10-03')
      const bookings: BookingForAnalytics[] = [
        createMockBooking({ booking_date: '2025-10-01', total_price: 100 }),
        // No booking on 2025-10-02
        createMockBooking({ booking_date: '2025-10-03', total_price: 300 }),
      ]

      // Act
      const chartData = generateChartData(bookings, startDate, endDate)

      // Assert
      expect(chartData[1].revenue).toBe(0)
      expect(chartData[1].bookings).toBe(0)
    })

    it('should format dates correctly', () => {
      // Arrange
      const startDate = new Date('2025-10-01')
      const endDate = new Date('2025-10-01')
      const bookings: BookingForAnalytics[] = []

      // Act
      const chartData = generateChartData(bookings, startDate, endDate)

      // Assert
      expect(chartData[0].date).toBe('Oct 01')
    })
  })

  describe('getRevenueByServiceType', () => {
    it('should calculate revenue for cleaning services', () => {
      // Arrange
      const bookings: BookingForAnalytics[] = [
        createMockBooking({
          total_price: 500,
          service_packages: { service_type: 'cleaning' },
        }),
        createMockBooking({
          total_price: 300,
          service_packages: { service_type: 'cleaning' },
        }),
      ]

      // Act
      const revenue = getRevenueByServiceType(bookings)

      // Assert
      expect(revenue.cleaning).toBe(800)
    })

    it('should calculate revenue for training services', () => {
      // Arrange
      const bookings: BookingForAnalytics[] = [
        createMockBooking({
          total_price: 400,
          service_packages: { service_type: 'training' },
        }),
      ]

      // Act
      const revenue = getRevenueByServiceType(bookings)

      // Assert
      expect(revenue.training).toBe(400)
    })

    it('should handle flat service_type structure', () => {
      // Arrange
      const bookings = [
        {
          id: 'b1',
          booking_date: '2025-10-26',
          total_price: 600,
          status: 'completed',
          payment_status: 'paid',
          service_type: 'cleaning',
        },
      ]

      // Act
      const revenue = getRevenueByServiceType(bookings)

      // Assert
      expect(revenue.cleaning).toBe(600)
    })

    it('should return zero for services with no bookings', () => {
      // Arrange
      const bookings: BookingForAnalytics[] = []

      // Act
      const revenue = getRevenueByServiceType(bookings)

      // Assert
      expect(revenue.cleaning).toBe(0)
      expect(revenue.training).toBe(0)
    })

    it('should include only paid bookings', () => {
      // Arrange
      const bookings: BookingForAnalytics[] = [
        createMockBooking({
          total_price: 500,
          payment_status: 'paid',
          service_packages: { service_type: 'cleaning' },
        }),
        createMockBooking({
          total_price: 300,
          payment_status: 'unpaid',
          service_packages: { service_type: 'cleaning' },
        }),
      ]

      // Act
      const revenue = getRevenueByServiceType(bookings)

      // Assert
      expect(revenue.cleaning).toBe(500)
    })
  })

  describe('formatGrowth', () => {
    it('should format positive growth with plus sign', () => {
      // Act
      const formatted = formatGrowth(25.5)

      // Assert
      expect(formatted).toBe('+25.5%')
    })

    it('should format negative growth without plus sign', () => {
      // Act
      const formatted = formatGrowth(-15.3)

      // Assert
      expect(formatted).toBe('-15.3%')
    })

    it('should format zero growth correctly', () => {
      // Act
      const formatted = formatGrowth(0)

      // Assert
      expect(formatted).toBe('+0.0%')
    })

    it('should round to one decimal place', () => {
      // Act
      const formatted = formatGrowth(33.456)

      // Assert
      expect(formatted).toBe('+33.5%')
    })
  })

  describe('getDateRangePreset', () => {
    it('should return today range', () => {
      // Act
      const range = getDateRangePreset('today')

      // Assert - Check using local date methods instead of ISO string
      expect(range.start.getFullYear()).toBe(2025)
      expect(range.start.getMonth()).toBe(9) // October is month 9 (0-indexed)
      expect(range.start.getDate()).toBe(26)
      expect(range.start.getHours()).toBe(0)
      expect(range.start.getMinutes()).toBe(0)

      expect(range.end.getFullYear()).toBe(2025)
      expect(range.end.getMonth()).toBe(9)
      expect(range.end.getDate()).toBe(26)
      expect(range.end.getHours()).toBe(23)
      expect(range.end.getMinutes()).toBe(59)
    })

    it('should return yesterday range', () => {
      // Act
      const range = getDateRangePreset('yesterday')

      // Assert
      expect(range.start.getFullYear()).toBe(2025)
      expect(range.start.getMonth()).toBe(9)
      expect(range.start.getDate()).toBe(25)
      expect(range.start.getHours()).toBe(0)

      expect(range.end.getFullYear()).toBe(2025)
      expect(range.end.getMonth()).toBe(9)
      expect(range.end.getDate()).toBe(25)
      expect(range.end.getHours()).toBe(23)
    })

    it('should return last 7 days range', () => {
      // Act
      const range = getDateRangePreset('last7days')

      // Assert
      expect(range.start.getFullYear()).toBe(2025)
      expect(range.start.getMonth()).toBe(9)
      expect(range.start.getDate()).toBe(20)
      expect(range.start.getHours()).toBe(0)

      expect(range.end.getFullYear()).toBe(2025)
      expect(range.end.getMonth()).toBe(9)
      expect(range.end.getDate()).toBe(26)
      expect(range.end.getHours()).toBe(23)
    })

    it('should return last 30 days range', () => {
      // Act
      const range = getDateRangePreset('last30days')

      // Assert
      expect(range.start.getFullYear()).toBe(2025)
      expect(range.start.getMonth()).toBe(8) // September is month 8
      expect(range.start.getDate()).toBe(27)
      expect(range.start.getHours()).toBe(0)

      expect(range.end.getFullYear()).toBe(2025)
      expect(range.end.getMonth()).toBe(9)
      expect(range.end.getDate()).toBe(26)
      expect(range.end.getHours()).toBe(23)
    })

    it('should return this week range', () => {
      // Act
      const range = getDateRangePreset('thisWeek')

      // Assert - 2025-10-26 is Sunday, week starts Monday
      expect(range.start.getFullYear()).toBe(2025)
      expect(range.start.getMonth()).toBe(9) // October
      expect(range.start.getDate()).toBe(20) // Monday
      expect(range.start.getHours()).toBe(0)

      expect(range.end.getFullYear()).toBe(2025)
      expect(range.end.getMonth()).toBe(9)
      expect(range.end.getDate()).toBe(26) // Sunday
      expect(range.end.getHours()).toBe(23)
    })

    it('should return last week range', () => {
      // Act
      const range = getDateRangePreset('lastWeek')

      // Assert - Last week Monday-Sunday
      expect(range.start.getFullYear()).toBe(2025)
      expect(range.start.getMonth()).toBe(9)
      expect(range.start.getDate()).toBe(13) // Monday of last week
      expect(range.start.getHours()).toBe(0)

      expect(range.end.getFullYear()).toBe(2025)
      expect(range.end.getMonth()).toBe(9)
      expect(range.end.getDate()).toBe(19) // Sunday of last week
      expect(range.end.getHours()).toBe(23)
    })

    it('should return this month range', () => {
      // Act
      const range = getDateRangePreset('thisMonth')

      // Assert
      expect(range.start.getFullYear()).toBe(2025)
      expect(range.start.getMonth()).toBe(9)
      expect(range.start.getDate()).toBe(1)
      expect(range.start.getHours()).toBe(0)

      expect(range.end.getFullYear()).toBe(2025)
      expect(range.end.getMonth()).toBe(9)
      expect(range.end.getDate()).toBe(31)
      expect(range.end.getHours()).toBe(23)
    })

    it('should return last month range', () => {
      // Act
      const range = getDateRangePreset('lastMonth')

      // Assert - September 2025
      expect(range.start.getFullYear()).toBe(2025)
      expect(range.start.getMonth()).toBe(8) // September
      expect(range.start.getDate()).toBe(1)
      expect(range.start.getHours()).toBe(0)

      expect(range.end.getFullYear()).toBe(2025)
      expect(range.end.getMonth()).toBe(8)
      expect(range.end.getDate()).toBe(30)
      expect(range.end.getHours()).toBe(23)
    })

    it('should return last 3 months range', () => {
      // Act
      const range = getDateRangePreset('last3months')

      // Assert - July to September
      expect(range.start.getFullYear()).toBe(2025)
      expect(range.start.getMonth()).toBe(6) // July
      expect(range.start.getDate()).toBe(1)
      expect(range.start.getHours()).toBe(0)

      expect(range.end.getFullYear()).toBe(2025)
      expect(range.end.getMonth()).toBe(8) // September
      expect(range.end.getDate()).toBe(30)
      expect(range.end.getHours()).toBe(23)
    })

    it('should return this year range', () => {
      // Act
      const range = getDateRangePreset('thisYear')

      // Assert - 2025
      expect(range.start.getFullYear()).toBe(2025)
      expect(range.start.getMonth()).toBe(0) // January
      expect(range.start.getDate()).toBe(1)
      expect(range.start.getHours()).toBe(0)

      expect(range.end.getFullYear()).toBe(2025)
      expect(range.end.getMonth()).toBe(11) // December
      expect(range.end.getDate()).toBe(31)
      expect(range.end.getHours()).toBe(23)
    })

    it('should return last year range', () => {
      // Act
      const range = getDateRangePreset('lastYear')

      // Assert - 2024
      expect(range.start.getFullYear()).toBe(2024)
      expect(range.start.getMonth()).toBe(0) // January
      expect(range.start.getDate()).toBe(1)
      expect(range.start.getHours()).toBe(0)

      expect(range.end.getFullYear()).toBe(2024)
      expect(range.end.getMonth()).toBe(11) // December
      expect(range.end.getDate()).toBe(31)
      expect(range.end.getHours()).toBe(23)
    })

    it('should return this month range for unknown preset', () => {
      // Act
      const range = getDateRangePreset('unknown')

      // Assert
      expect(range.start.getFullYear()).toBe(2025)
      expect(range.start.getMonth()).toBe(9)
      expect(range.start.getDate()).toBe(1)
      expect(range.start.getHours()).toBe(0)

      expect(range.end.getFullYear()).toBe(2025)
      expect(range.end.getMonth()).toBe(9)
      expect(range.end.getDate()).toBe(31)
      expect(range.end.getHours()).toBe(23)
    })
  })

  describe('getBookingStatusBreakdown', () => {
    it('should count bookings by status', () => {
      // Arrange
      const bookings: BookingForAnalytics[] = [
        createMockBooking({ status: 'pending' }),
        createMockBooking({ status: 'pending' }),
        createMockBooking({ status: 'completed' }),
        createMockBooking({ status: 'cancelled' }),
      ]

      // Act
      const breakdown = getBookingStatusBreakdown(bookings)

      // Assert
      const pending = breakdown.find((item) => item.name === 'Pending')
      const completed = breakdown.find((item) => item.name === 'Completed')
      const cancelled = breakdown.find((item) => item.name === 'Cancelled')

      expect(pending?.value).toBe(2)
      expect(completed?.value).toBe(1)
      expect(cancelled?.value).toBe(1)
    })

    it('should return zero for statuses with no bookings', () => {
      // Arrange
      const bookings: BookingForAnalytics[] = []

      // Act
      const breakdown = getBookingStatusBreakdown(bookings)

      // Assert
      breakdown.forEach((item) => {
        expect(item.value).toBe(0)
      })
    })

    it('should include correct colors for each status', () => {
      // Arrange
      const bookings: BookingForAnalytics[] = []

      // Act
      const breakdown = getBookingStatusBreakdown(bookings)

      // Assert
      expect(breakdown.find((item) => item.name === 'Pending')?.color).toBe('#f59e0b')
      expect(breakdown.find((item) => item.name === 'Completed')?.color).toBe('#22c55e') // green-500
      expect(breakdown.find((item) => item.name === 'Cancelled')?.color).toBe('#ef4444')
    })
  })

  describe('getPeakHoursData', () => {
    it('should generate heatmap data for all days and hours', () => {
      // Arrange
      const bookings: BookingForAnalytics[] = []

      // Act
      const heatmap = getPeakHoursData(bookings)

      // Assert
      expect(heatmap).toHaveLength(7 * 13) // 7 days * 13 hours (8 AM - 8 PM)
    })

    it('should count bookings for correct day and hour', () => {
      // Arrange
      const bookings: BookingForAnalytics[] = [
        createMockBooking({ booking_date: '2025-10-26', start_time: '09:00' }), // Sunday 9 AM
        createMockBooking({ booking_date: '2025-10-26', start_time: '09:00' }), // Sunday 9 AM
      ]

      // Act
      const heatmap = getPeakHoursData(bookings)

      // Assert
      const sundayNineAM = heatmap.find((item) => item.day === 'Sun' && item.hour === 9)
      expect(sundayNineAM?.count).toBe(2)
    })

    it('should return zero count for hours with no bookings', () => {
      // Arrange
      const bookings: BookingForAnalytics[] = []

      // Act
      const heatmap = getPeakHoursData(bookings)

      // Assert
      heatmap.forEach((item) => {
        expect(item.count).toBe(0)
      })
    })

    it('should handle bookings across different days', () => {
      // Arrange
      const bookings: BookingForAnalytics[] = [
        createMockBooking({ booking_date: '2025-10-26', start_time: '10:00' }), // Sunday
        createMockBooking({ booking_date: '2025-10-27', start_time: '10:00' }), // Monday
      ]

      // Act
      const heatmap = getPeakHoursData(bookings)

      // Assert
      const sunday10AM = heatmap.find((item) => item.day === 'Sun' && item.hour === 10)
      const monday10AM = heatmap.find((item) => item.day === 'Mon' && item.hour === 10)

      expect(sunday10AM?.count).toBe(1)
      expect(monday10AM?.count).toBe(1)
    })
  })

  // ============================================================================
  // CUSTOMER ANALYTICS TESTS
  // ============================================================================

  describe('calculateCustomerMetrics', () => {
    const createMockCustomer = (overrides: Partial<CustomerWithBookings> = {}): CustomerWithBookings => ({
  line_id: null,
  relationship_level: "new" as const,
  preferred_contact_method: "phone" as const,
  source: null,
  source_other: null,
  birthday: null,
  company_name: null,
  tax_id: null,
  notes: null,
      id: 'customer-1',
      full_name: 'John Doe',
      email: 'john@example.com',
      phone: '0812345678',
      address: '123 Main St',
      created_at: '2025-10-26T00:00:00Z',
      updated_at: '2025-10-26T00:00:00Z',
      deleted_at: null,
      zip_code: null,
      state: null,
      city: null,
      tags: [],
      bookings: [],
      ...overrides,
    })

    it('should calculate total customers correctly', () => {
      const customers = [createMockCustomer(), createMockCustomer({ id: 'customer-2' })]
      const metrics = calculateCustomerMetrics(customers, [])

      expect(metrics.total).toBe(2)
    })

    it('should count new customers this month', () => {
      const customers = [
        createMockCustomer({ created_at: '2025-10-15T00:00:00Z' }), // This month
        createMockCustomer({ id: 'c2', created_at: '2025-10-20T00:00:00Z' }), // This month
        createMockCustomer({ id: 'c3', created_at: '2025-09-15T00:00:00Z' }), // Last month
      ]
      const metrics = calculateCustomerMetrics(customers, [])

      expect(metrics.newThisMonth).toBe(2)
    })

    it('should count returning customers correctly', () => {
      const customers = [
        createMockCustomer({
          id: 'c1',
          bookings: [
            createMockBooking({ id: 'b1', customer_id: 'c1' }),
            createMockBooking({ id: 'b2', customer_id: 'c1' }),
          ],
        }),
        createMockCustomer({
          id: 'c2',
          bookings: [createMockBooking({ id: 'b3', customer_id: 'c2' })],
        }),
      ]
      const bookings: BookingForAnalytics[] = []

      const metrics = calculateCustomerMetrics(customers, bookings)

      expect(metrics.returning).toBe(1) // Only c1 has >1 booking
    })

    it('should calculate average CLV correctly', () => {
      const customers = [createMockCustomer(), createMockCustomer({ id: 'c2' })]
      const bookings: BookingForAnalytics[] = [
        createMockBooking({ total_price: 1000, payment_status: 'paid' }),
        createMockBooking({ total_price: 2000, payment_status: 'paid' }),
      ]

      const metrics = calculateCustomerMetrics(customers, bookings)

      expect(metrics.averageCLV).toBe(1500) // 3000 / 2
    })

    it('should calculate retention rate correctly', () => {
      const customers = [
        createMockCustomer({
          id: 'c1',
          bookings: [createMockBooking(), createMockBooking()],
        }),
        createMockCustomer({
          id: 'c2',
          bookings: [createMockBooking(), createMockBooking()],
        }),
        createMockCustomer({
          id: 'c3',
          bookings: [createMockBooking()],
        }),
        createMockCustomer({ id: 'c4', bookings: [createMockBooking()] }),
      ]

      const metrics = calculateCustomerMetrics(customers, [])

      expect(metrics.retentionRate).toBe(50) // 2/4 * 100
    })

    it('should return zero metrics for empty customers', () => {
      const metrics = calculateCustomerMetrics([], [])

      expect(metrics.total).toBe(0)
      expect(metrics.newThisMonth).toBe(0)
      expect(metrics.returning).toBe(0)
      expect(metrics.averageCLV).toBe(0)
      expect(metrics.retentionRate).toBe(0)
    })

    it('should only count paid bookings for CLV', () => {
      const customers = [createMockCustomer()]
      const bookings: BookingForAnalytics[] = [
        createMockBooking({ total_price: 1000, payment_status: 'paid' }),
        createMockBooking({ total_price: 2000, payment_status: 'unpaid' }),
      ]

      const metrics = calculateCustomerMetrics(customers, bookings)

      expect(metrics.averageCLV).toBe(1000)
    })
  })

  describe('getTopCustomers', () => {
    const createMockCustomer = (overrides: Partial<CustomerWithBookings> = {}): CustomerWithBookings => ({
      id: 'customer-1',
      full_name: 'John Doe',
      email: 'john@example.com',
      phone: '0812345678',
      line_id: null,
      relationship_level: 'new' as const,
      preferred_contact_method: 'phone' as const,
      source: null,
      source_other: null,
      birthday: null,
      company_name: null,
      tax_id: null,
      notes: null,
      address: '123 Main St',
      created_at: '2025-10-26T00:00:00Z',
      updated_at: '2025-10-26T00:00:00Z',
      deleted_at: null,
      zip_code: null,
      state: null,
      city: null,
      tags: [],
      bookings: [],
      ...overrides,
    })

    it('should return top customers sorted by revenue', () => {
      const customers = [
        createMockCustomer({
          id: 'c1',
          full_name: 'Customer A',
          bookings: [createMockBooking({ total_price: 1000, payment_status: 'paid' })],
        }),
        createMockCustomer({
          id: 'c2',
          full_name: 'Customer B',
          bookings: [createMockBooking({ total_price: 3000, payment_status: 'paid' })],
        }),
        createMockCustomer({
          id: 'c3',
          full_name: 'Customer C',
          bookings: [createMockBooking({ total_price: 2000, payment_status: 'paid' })],
        }),
      ]

      const topCustomers = getTopCustomers(customers, 3)

      expect(topCustomers[0].name).toBe('Customer B')
      expect(topCustomers[0].totalRevenue).toBe(3000)
      expect(topCustomers[1].name).toBe('Customer C')
      expect(topCustomers[2].name).toBe('Customer A')
    })

    it('should limit results correctly', () => {
      const customers = [
        createMockCustomer({
          id: 'c1',
          bookings: [createMockBooking({ total_price: 1000, payment_status: 'paid' })],
        }),
        createMockCustomer({
          id: 'c2',
          bookings: [createMockBooking({ total_price: 2000, payment_status: 'paid' })],
        }),
        createMockCustomer({
          id: 'c3',
          bookings: [createMockBooking({ total_price: 3000, payment_status: 'paid' })],
        }),
      ]

      const topCustomers = getTopCustomers(customers, 2)

      expect(topCustomers).toHaveLength(2)
    })

    it('should exclude customers with no bookings', () => {
      const customers = [
        createMockCustomer({ id: 'c1', bookings: [] }),
        createMockCustomer({
          id: 'c2',
          bookings: [createMockBooking({ total_price: 1000, payment_status: 'paid' })],
        }),
      ]

      const topCustomers = getTopCustomers(customers, 10)

      expect(topCustomers).toHaveLength(1)
      expect(topCustomers[0].id).toBe('c2')
    })

    it('should only count paid bookings', () => {
      const customers = [
        createMockCustomer({
          id: 'c1',
          bookings: [
            createMockBooking({ total_price: 1000, payment_status: 'paid' }),
            createMockBooking({ total_price: 2000, payment_status: 'unpaid' }),
          ],
        }),
      ]

      const topCustomers = getTopCustomers(customers, 1)

      expect(topCustomers[0].totalRevenue).toBe(1000)
    })

    it('should include last booking date', () => {
      const customers = [
        createMockCustomer({
          id: 'c1',
          bookings: [
            createMockBooking({ booking_date: '2025-10-01', payment_status: 'paid' }),
            createMockBooking({ booking_date: '2025-10-26', payment_status: 'paid' }),
          ],
        }),
      ]

      const topCustomers = getTopCustomers(customers, 1)

      expect(topCustomers[0].lastBookingDate).toBe('2025-10-26')
    })
  })

  describe('getCustomerAcquisitionTrend', () => {
    const createMockCustomer = (createdAt: string): CustomerWithBookings => ({
      id: `customer-${createdAt}`,
      full_name: 'John Doe',
      email: 'john@example.com',
      phone: '0812345678',
      line_id: null,
      relationship_level: 'new' as const,
      preferred_contact_method: 'phone' as const,
      source: null,
      source_other: null,
      birthday: null,
      company_name: null,
      tax_id: null,
      notes: null,
      address: '123 Main St',
      created_at: createdAt,
      updated_at: createdAt,
      deleted_at: null,
      zip_code: null,
      state: null,
      city: null,
      tags: [],
      bookings: [],
    })

    it('should generate daily customer acquisition counts', () => {
      const customers = [
        createMockCustomer('2025-10-01T00:00:00Z'),
        createMockCustomer('2025-10-01T10:00:00Z'),
        createMockCustomer('2025-10-02T00:00:00Z'),
      ]
      const startDate = new Date('2025-10-01')
      const endDate = new Date('2025-10-02')

      const trend = getCustomerAcquisitionTrend(customers, startDate, endDate)

      expect(trend).toHaveLength(2)
      expect(trend[0].count).toBe(2)
      expect(trend[1].count).toBe(1)
    })

    it('should format dates correctly', () => {
      const customers: CustomerWithBookings[] = []
      const startDate = new Date('2025-10-01')
      const endDate = new Date('2025-10-01')

      const trend = getCustomerAcquisitionTrend(customers, startDate, endDate)

      expect(trend[0].date).toBe('Oct 01')
    })

    it('should return zero count for days with no customers', () => {
      const customers: CustomerWithBookings[] = [createMockCustomer('2025-10-01T00:00:00Z')]
      const startDate = new Date('2025-10-01')
      const endDate = new Date('2025-10-03')

      const trend = getCustomerAcquisitionTrend(customers, startDate, endDate)

      expect(trend[1].count).toBe(0) // Oct 02
      expect(trend[2].count).toBe(0) // Oct 03
    })
  })

  describe('getCustomerCLVDistribution', () => {
    const createMockCustomer = (revenue: number): CustomerWithBookings => ({
      id: `customer-${revenue}`,
      full_name: 'John Doe',
      email: 'john@example.com',
      phone: '0812345678',
      line_id: null,
      relationship_level: 'new' as const,
      preferred_contact_method: 'phone' as const,
      source: null,
      source_other: null,
      birthday: null,
      company_name: null,
      tax_id: null,
      notes: null,
      address: '123 Main St',
      created_at: '2025-10-26T00:00:00Z',
      updated_at: '2025-10-26T00:00:00Z',
      deleted_at: null,
      zip_code: null,
      state: null,
      city: null,
      tags: [],
      bookings: [createMockBooking({ total_price: revenue, payment_status: 'paid' })],
    })

    it('should distribute customers by CLV ranges', () => {
      const customers = [
        createMockCustomer(300), // ฿0-500
        createMockCustomer(700), // ฿500-1K
        createMockCustomer(1500), // ฿1K-2K
        createMockCustomer(3000), // ฿2K-5K
        createMockCustomer(7000), // ฿5K+
      ]

      const distribution = getCustomerCLVDistribution(customers)

      expect(distribution.find((d) => d.range === '฿0-500')?.count).toBe(1)
      expect(distribution.find((d) => d.range === '฿500-1K')?.count).toBe(1)
      expect(distribution.find((d) => d.range === '฿1K-2K')?.count).toBe(1)
      expect(distribution.find((d) => d.range === '฿2K-5K')?.count).toBe(1)
      expect(distribution.find((d) => d.range === '฿5K+')?.count).toBe(1)
    })

    it('should return all ranges even if empty', () => {
      const customers: CustomerWithBookings[] = []

      const distribution = getCustomerCLVDistribution(customers)

      expect(distribution).toHaveLength(5)
      distribution.forEach((d) => {
        expect(d.count).toBe(0)
      })
    })

    it('should exclude customers with no bookings', () => {
      const customers = [
        createMockCustomer(500),
        {
          id: 'c-no-booking',
          full_name: 'No Booking',
          email: 'no@example.com',
          phone: '0812345678',
          line_id: null,
          relationship_level: 'new' as const,
          preferred_contact_method: 'phone' as const,
          source: null,
          source_other: null,
          birthday: null,
          company_name: null,
          tax_id: null,
          notes: null,
          address: '123 Main St',
          created_at: '2025-10-26T00:00:00Z',
          updated_at: '2025-10-26T00:00:00Z',
          deleted_at: null,
          zip_code: null,
          state: null,
          city: null,
          tags: [],
          bookings: [],
        },
      ]

      const distribution = getCustomerCLVDistribution(customers)
      const totalCount = distribution.reduce((sum, d) => sum + d.count, 0)

      expect(totalCount).toBe(1)
    })
  })

  describe('getCustomerSegmentation', () => {
    const createMockCustomer = (bookingCount: number): CustomerWithBookings => {
      const bookings = Array.from({ length: bookingCount }, (_, i) =>
        createMockBooking({ id: `booking-${i}` })
      )
      return {
        id: `customer-${bookingCount}`,
        full_name: 'John Doe',
        email: 'john@example.com',
        phone: '0812345678',
        line_id: null,
        relationship_level: 'new' as const,
        preferred_contact_method: 'phone' as const,
        source: null,
        source_other: null,
        birthday: null,
        company_name: null,
        tax_id: null,
        notes: null,
        address: '123 Main St',
        created_at: '2025-10-26T00:00:00Z',
        updated_at: '2025-10-26T00:00:00Z',
        deleted_at: null,
        zip_code: null,
        state: null,
        city: null,
        tags: [],
        bookings,
      }
    }

    it('should segment customers correctly', () => {
      const customers = [
        createMockCustomer(1), // New
        createMockCustomer(3), // Regular
        createMockCustomer(7), // VIP
      ]

      const segmentation = getCustomerSegmentation(customers)

      expect(segmentation.find((s) => s.name === 'New (1 booking)')?.value).toBe(1)
      expect(segmentation.find((s) => s.name === 'Regular (2-5 bookings)')?.value).toBe(1)
      expect(segmentation.find((s) => s.name === 'VIP (5+ bookings)')?.value).toBe(1)
    })

    it('should return correct colors for each segment', () => {
      const customers: CustomerWithBookings[] = []
      const segmentation = getCustomerSegmentation(customers)

      expect(segmentation.find((s) => s.name === 'New (1 booking)')?.color).toBe('#3b82f6')
      expect(segmentation.find((s) => s.name === 'Regular (2-5 bookings)')?.color).toBe('#10b981')
      expect(segmentation.find((s) => s.name === 'VIP (5+ bookings)')?.color).toBe('#f59e0b')
    })

    it('should handle boundary cases correctly', () => {
      const customers = [
        createMockCustomer(2), // Regular (exactly 2)
        createMockCustomer(5), // Regular (exactly 5)
        createMockCustomer(6), // VIP (exactly 6)
      ]

      const segmentation = getCustomerSegmentation(customers)

      expect(segmentation.find((s) => s.name === 'Regular (2-5 bookings)')?.value).toBe(2)
      expect(segmentation.find((s) => s.name === 'VIP (5+ bookings)')?.value).toBe(1)
    })
  })

  describe('getRepeatCustomerRateTrend', () => {
    const createMockCustomer = (bookings: BookingForAnalytics[]): CustomerWithBookings => ({
      id: `customer-${Math.random()}`,
      full_name: 'John Doe',
      email: 'john@example.com',
      phone: '0812345678',
      line_id: null,
      relationship_level: 'new' as const,
      preferred_contact_method: 'phone' as const,
      source: null,
      source_other: null,
      birthday: null,
      company_name: null,
      tax_id: null,
      notes: null,
      address: '123 Main St',
      created_at: '2025-10-26T00:00:00Z',
      updated_at: '2025-10-26T00:00:00Z',
      deleted_at: null,
      zip_code: null,
      state: null,
      city: null,
      tags: [],
      bookings,
    })

    it('should calculate repeat customer rate correctly', () => {
      const customers = [
        createMockCustomer([
          createMockBooking({ booking_date: '2025-10-01' }),
          createMockBooking({ booking_date: '2025-10-02' }),
        ]),
        createMockCustomer([createMockBooking({ booking_date: '2025-10-01' })]),
      ]
      const startDate = new Date('2025-10-01')
      const endDate = new Date('2025-10-01')

      const trend = getRepeatCustomerRateTrend(customers, startDate, endDate)

      expect(trend[0].rate).toBe(50) // 1/2 * 100 = 50%
    })

    it('should return zero rate for days with no customers', () => {
      const customers: CustomerWithBookings[] = []
      const startDate = new Date('2025-10-01')
      const endDate = new Date('2025-10-01')

      const trend = getRepeatCustomerRateTrend(customers, startDate, endDate)

      expect(trend[0].rate).toBe(0)
    })

    it('should format dates correctly', () => {
      const customers: CustomerWithBookings[] = []
      const startDate = new Date('2025-10-01')
      const endDate = new Date('2025-10-01')

      const trend = getRepeatCustomerRateTrend(customers, startDate, endDate)

      expect(trend[0].date).toBe('Oct 01')
    })

    it('should round rates to 1 decimal place', () => {
      const customers = [
        createMockCustomer([createMockBooking({ booking_date: '2025-10-01' }), createMockBooking()]),
        createMockCustomer([createMockBooking({ booking_date: '2025-10-01' })]),
        createMockCustomer([createMockBooking({ booking_date: '2025-10-01' })]),
      ]
      const startDate = new Date('2025-10-01')
      const endDate = new Date('2025-10-01')

      const trend = getRepeatCustomerRateTrend(customers, startDate, endDate)

      expect(trend[0].rate).toBe(33.3) // 1/3 * 100 = 33.333... -> 33.3
    })
  })

  // ============================================================================
  // STAFF ANALYTICS TESTS
  // ============================================================================

  describe('calculateStaffMetrics', () => {
    const createMockStaff = (id: string): Staff => ({
      id,
      full_name: `Staff ${id}`,
      email: `staff${id}@example.com`,
      role: 'staff',
      created_at: '2025-10-26T00:00:00Z',
    })

    const createMockStaffWithBookings = (
      id: string,
      bookings: BookingForAnalytics[]
    ): StaffWithBookings => ({
      ...createMockStaff(id),
      bookings,
    })

    it('should calculate total staff count', () => {
      const staff = [createMockStaff('1'), createMockStaff('2')]
      const staffWithBookings: StaffWithBookings[] = []

      const metrics = calculateStaffMetrics(staff, staffWithBookings)

      expect(metrics.totalStaff).toBe(2)
    })

    it('should count active staff (staff with bookings)', () => {
      const staff = [createMockStaff('1'), createMockStaff('2'), createMockStaff('3')]
      const staffWithBookings = [
        createMockStaffWithBookings('1', [createMockBooking()]),
        createMockStaffWithBookings('2', [createMockBooking()]),
        createMockStaffWithBookings('3', []),
      ]

      const metrics = calculateStaffMetrics(staff, staffWithBookings)

      expect(metrics.activeStaff).toBe(2)
    })

    it('should calculate total revenue from paid bookings', () => {
      const staff = [createMockStaff('1')]
      const staffWithBookings = [
        createMockStaffWithBookings('1', [
          createMockBooking({ total_price: 1000, payment_status: 'paid' }),
          createMockBooking({ total_price: 2000, payment_status: 'paid' }),
        ]),
      ]

      const metrics = calculateStaffMetrics(staff, staffWithBookings)

      expect(metrics.totalRevenue).toBe(3000)
    })

    it('should exclude unpaid bookings from revenue', () => {
      const staff = [createMockStaff('1')]
      const staffWithBookings = [
        createMockStaffWithBookings('1', [
          createMockBooking({ total_price: 1000, payment_status: 'paid' }),
          createMockBooking({ total_price: 2000, payment_status: 'unpaid' }),
        ]),
      ]

      const metrics = calculateStaffMetrics(staff, staffWithBookings)

      expect(metrics.totalRevenue).toBe(1000)
    })

    it('should calculate average jobs per staff', () => {
      const staff = [createMockStaff('1'), createMockStaff('2')]
      const staffWithBookings = [
        createMockStaffWithBookings('1', [
          createMockBooking({ payment_status: 'paid' }),
          createMockBooking({ payment_status: 'paid' }),
        ]),
        createMockStaffWithBookings('2', [createMockBooking({ payment_status: 'paid' })]),
      ]

      const metrics = calculateStaffMetrics(staff, staffWithBookings)

      expect(metrics.averageJobsPerStaff).toBe(1.5) // 3 jobs / 2 active staff
    })

    it('should calculate average revenue per staff', () => {
      const staff = [createMockStaff('1'), createMockStaff('2')]
      const staffWithBookings = [
        createMockStaffWithBookings('1', [
          createMockBooking({ total_price: 2000, payment_status: 'paid' }),
        ]),
        createMockStaffWithBookings('2', [
          createMockBooking({ total_price: 1000, payment_status: 'paid' }),
        ]),
      ]

      const metrics = calculateStaffMetrics(staff, staffWithBookings)

      expect(metrics.averageRevenuePerStaff).toBe(1500) // 3000 / 2
    })

    it('should return zero averages when no active staff', () => {
      const staff = [createMockStaff('1')]
      const staffWithBookings = [createMockStaffWithBookings('1', [])]

      const metrics = calculateStaffMetrics(staff, staffWithBookings)

      expect(metrics.averageJobsPerStaff).toBe(0)
      expect(metrics.averageRevenuePerStaff).toBe(0)
    })
  })

  describe('getStaffPerformance', () => {
    const createMockStaffWithBookings = (
      id: string,
      bookings: BookingForAnalytics[]
    ): StaffWithBookings => ({
      id,
      full_name: `Staff ${id}`,
      email: `staff${id}@example.com`,
      role: 'staff',
      created_at: '2025-10-26T00:00:00Z',
      bookings,
    })

    it('should calculate total jobs for each staff', () => {
      const staff = [
        createMockStaffWithBookings('1', [createMockBooking(), createMockBooking()]),
      ]

      const performance = getStaffPerformance(staff)

      expect(performance[0].totalJobs).toBe(2)
    })

    it('should calculate completed jobs', () => {
      const staff = [
        createMockStaffWithBookings('1', [
          createMockBooking({ status: 'completed' }),
          createMockBooking({ status: 'pending' }),
        ]),
      ]

      const performance = getStaffPerformance(staff)

      expect(performance[0].completedJobs).toBe(1)
    })

    it('should calculate revenue from paid bookings only', () => {
      const staff = [
        createMockStaffWithBookings('1', [
          createMockBooking({ total_price: 1000, payment_status: 'paid' }),
          createMockBooking({ total_price: 2000, payment_status: 'unpaid' }),
        ]),
      ]

      const performance = getStaffPerformance(staff)

      expect(performance[0].revenue).toBe(1000)
    })

    it('should calculate completion rate', () => {
      const staff = [
        createMockStaffWithBookings('1', [
          createMockBooking({ status: 'completed' }),
          createMockBooking({ status: 'completed' }),
          createMockBooking({ status: 'pending' }),
          createMockBooking({ status: 'cancelled' }),
        ]),
      ]

      const performance = getStaffPerformance(staff)

      expect(performance[0].completionRate).toBe(50) // 2/4 * 100
    })

    it('should calculate average job value', () => {
      const staff = [
        createMockStaffWithBookings('1', [
          createMockBooking({ total_price: 1000, payment_status: 'paid' }),
          createMockBooking({ total_price: 2000, payment_status: 'paid' }),
        ]),
      ]

      const performance = getStaffPerformance(staff)

      expect(performance[0].avgJobValue).toBe(1500) // 3000 / 2
    })

    it('should calculate utilization rate', () => {
      const staff = [
        createMockStaffWithBookings('1', [
          createMockBooking({ status: 'completed' }),
          createMockBooking({ status: 'completed' }),
          createMockBooking({ status: 'completed' }),
        ]),
      ]

      const performance = getStaffPerformance(staff)

      expect(performance[0].utilizationRate).toBeCloseTo(3.75, 1) // (3 * 2) / 160 * 100
    })

    it('should cap utilization rate at 100%', () => {
      // Create 81 completed jobs (81 * 2 hours = 162 hours > 160 hours)
      const bookings = Array.from({ length: 81 }, () =>
        createMockBooking({ status: 'completed' })
      )
      const staff = [createMockStaffWithBookings('1', bookings)]

      const performance = getStaffPerformance(staff)

      expect(performance[0].utilizationRate).toBe(100)
    })

    it('should return zero rates for staff with no jobs', () => {
      const staff = [createMockStaffWithBookings('1', [])]

      const performance = getStaffPerformance(staff)

      expect(performance[0].completionRate).toBe(0)
      expect(performance[0].avgJobValue).toBe(0)
    })
  })

  // ============================================================================
  // TEAM ANALYTICS TESTS
  // ============================================================================

  describe('calculateTeamMetrics', () => {
    const createMockTeam = (id: string, isActive: boolean = true): Team => ({
      id,
      name: `Team ${id}`,
      is_active: isActive,
      created_at: '2025-10-26T00:00:00Z',
    })

    const createMockTeamWithBookings = (
      id: string,
      bookings: BookingForAnalytics[],
      memberCount: number = 3
    ): TeamWithBookings => ({
      ...createMockTeam(id),
      bookings,
      team_members: Array.from({ length: memberCount }, (_, i) => ({ id: `member-${i}` })),
    })

    it('should calculate total teams', () => {
      const teams = [createMockTeam('1'), createMockTeam('2')]
      const teamsWithBookings: TeamWithBookings[] = []

      const metrics = calculateTeamMetrics(teams, teamsWithBookings)

      expect(metrics.totalTeams).toBe(2)
    })

    it('should count active teams', () => {
      const teams = [createMockTeam('1', true), createMockTeam('2', false)]
      const teamsWithBookings: TeamWithBookings[] = []

      const metrics = calculateTeamMetrics(teams, teamsWithBookings)

      expect(metrics.activeTeams).toBe(1)
    })

    it('should calculate total team bookings', () => {
      const teams = [createMockTeam('1')]
      const teamsWithBookings = [
        createMockTeamWithBookings('1', [createMockBooking(), createMockBooking()]),
      ]

      const metrics = calculateTeamMetrics(teams, teamsWithBookings)

      expect(metrics.totalTeamBookings).toBe(2)
    })

    it('should calculate total team revenue from paid bookings', () => {
      const teams = [createMockTeam('1')]
      const teamsWithBookings = [
        createMockTeamWithBookings('1', [
          createMockBooking({ total_price: 1000, payment_status: 'paid' }),
          createMockBooking({ total_price: 2000, payment_status: 'paid' }),
        ]),
      ]

      const metrics = calculateTeamMetrics(teams, teamsWithBookings)

      expect(metrics.totalTeamRevenue).toBe(3000)
    })

    it('should exclude unpaid bookings from revenue', () => {
      const teams = [createMockTeam('1')]
      const teamsWithBookings = [
        createMockTeamWithBookings('1', [
          createMockBooking({ total_price: 1000, payment_status: 'paid' }),
          createMockBooking({ total_price: 2000, payment_status: 'unpaid' }),
        ]),
      ]

      const metrics = calculateTeamMetrics(teams, teamsWithBookings)

      expect(metrics.totalTeamRevenue).toBe(1000)
    })

    it('should calculate average team size', () => {
      const teams = [createMockTeam('1'), createMockTeam('2')]
      const teamsWithBookings = [
        createMockTeamWithBookings('1', [], 3), // 3 members
        createMockTeamWithBookings('2', [], 5), // 5 members
      ]

      const metrics = calculateTeamMetrics(teams, teamsWithBookings)

      expect(metrics.averageTeamSize).toBe(4) // (3 + 5) / 2
    })

    it('should return zero average team size for no teams', () => {
      const teams: Team[] = []
      const teamsWithBookings: TeamWithBookings[] = []

      const metrics = calculateTeamMetrics(teams, teamsWithBookings)

      expect(metrics.averageTeamSize).toBe(0)
    })
  })

  describe('getTeamPerformance', () => {
    const createMockTeamWithBookings = (
      id: string,
      bookings: BookingForAnalytics[],
      memberCount: number = 3
    ): TeamWithBookings => ({
      id,
      name: `Team ${id}`,
      is_active: true,
      created_at: '2025-10-26T00:00:00Z',
      bookings,
      team_members: Array.from({ length: memberCount }, (_, i) => ({ id: `member-${i}` })),
    })

    it('should calculate total jobs for each team', () => {
      const teams = [
        createMockTeamWithBookings('1', [createMockBooking(), createMockBooking()]),
      ]

      const performance = getTeamPerformance(teams)

      expect(performance[0].totalJobs).toBe(2)
    })

    it('should count jobs by status', () => {
      const teams = [
        createMockTeamWithBookings('1', [
          createMockBooking({ status: 'completed' }),
          createMockBooking({ status: 'in_progress' }),
          createMockBooking({ status: 'pending' }),
        ]),
      ]

      const performance = getTeamPerformance(teams)

      expect(performance[0].completed).toBe(1)
      expect(performance[0].inProgress).toBe(1)
      expect(performance[0].pending).toBe(1)
    })

    it('should calculate revenue from paid bookings only', () => {
      const teams = [
        createMockTeamWithBookings('1', [
          createMockBooking({ total_price: 1000, payment_status: 'paid' }),
          createMockBooking({ total_price: 2000, payment_status: 'unpaid' }),
        ]),
      ]

      const performance = getTeamPerformance(teams)

      expect(performance[0].revenue).toBe(1000)
    })

    it('should calculate completion rate', () => {
      const teams = [
        createMockTeamWithBookings('1', [
          createMockBooking({ status: 'completed' }),
          createMockBooking({ status: 'completed' }),
          createMockBooking({ status: 'pending' }),
          createMockBooking({ status: 'in_progress' }),
        ]),
      ]

      const performance = getTeamPerformance(teams)

      expect(performance[0].completionRate).toBe(50) // 2/4 * 100
    })

    it('should calculate average job value', () => {
      const teams = [
        createMockTeamWithBookings('1', [
          createMockBooking({ total_price: 1000, payment_status: 'paid' }),
          createMockBooking({ total_price: 2000, payment_status: 'paid' }),
        ]),
      ]

      const performance = getTeamPerformance(teams)

      expect(performance[0].avgJobValue).toBe(1500) // 3000 / 2
    })

    it('should include member count', () => {
      const teams = [createMockTeamWithBookings('1', [], 5)]

      const performance = getTeamPerformance(teams)

      expect(performance[0].memberCount).toBe(5)
    })

    it('should return zero rates for teams with no jobs', () => {
      const teams = [createMockTeamWithBookings('1', [])]

      const performance = getTeamPerformance(teams)

      expect(performance[0].completionRate).toBe(0)
      expect(performance[0].avgJobValue).toBe(0)
    })
  })

  // ============================================================================
  // SECURITY / RBAC TESTS
  // ============================================================================

  describe('filterFinancialDataForRole', () => {
    const mockData = {
      total: 10000,
      thisMonth: 5000,
      revenue: 15000,
      avgOrderValue: 1500,
      publicField: 'visible to all',
    }

    it('should return full data for admin role', () => {
      const filtered = filterFinancialDataForRole(mockData, 'admin', ['revenue', 'avgOrderValue'])

      expect(filtered).toEqual(mockData)
      expect(filtered.revenue).toBe(15000)
      expect(filtered.avgOrderValue).toBe(1500)
    })

    it('should remove sensitive fields for manager role', () => {
      const filtered = filterFinancialDataForRole(mockData, 'manager', ['revenue', 'avgOrderValue'])

      expect(filtered.revenue).toBeUndefined()
      expect(filtered.avgOrderValue).toBeUndefined()
      expect(filtered.total).toBe(10000)
      expect(filtered.publicField).toBe('visible to all')
    })

    it('should remove sensitive fields for staff role', () => {
      const filtered = filterFinancialDataForRole(mockData, 'staff', ['revenue', 'avgOrderValue'])

      expect(filtered.revenue).toBeUndefined()
      expect(filtered.avgOrderValue).toBeUndefined()
    })

    it('should remove sensitive fields for null role', () => {
      const filtered = filterFinancialDataForRole(mockData, null, ['revenue', 'avgOrderValue'])

      expect(filtered.revenue).toBeUndefined()
      expect(filtered.avgOrderValue).toBeUndefined()
    })

    it('should handle empty sensitive fields array', () => {
      const filtered = filterFinancialDataForRole(mockData, 'manager', [])

      expect(filtered).toEqual(mockData)
    })

    it('should not modify original data object', () => {
      const original = { ...mockData }
      filterFinancialDataForRole(mockData, 'manager', ['revenue'])

      expect(mockData).toEqual(original)
    })

    it('should handle multiple sensitive fields', () => {
      const filtered = filterFinancialDataForRole(mockData, 'staff', [
        'revenue',
        'avgOrderValue',
        'thisMonth',
      ])

      expect(filtered.revenue).toBeUndefined()
      expect(filtered.avgOrderValue).toBeUndefined()
      expect(filtered.thisMonth).toBeUndefined()
      expect(filtered.total).toBe(10000)
    })
  })
})
