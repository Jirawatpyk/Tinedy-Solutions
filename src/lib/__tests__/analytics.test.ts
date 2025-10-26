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
  type BookingForAnalytics,
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
    ...overrides,
  })

  describe('calculateRevenueMetrics', () => {
    it('should calculate total revenue from completed bookings only', () => {
      // Arrange
      const bookings: BookingForAnalytics[] = [
        createMockBooking({ total_price: 1000, status: 'completed' }),
        createMockBooking({ total_price: 2000, status: 'completed' }),
        createMockBooking({ total_price: 3000, status: 'pending' }), // Should be excluded
      ]

      // Act
      const metrics = calculateRevenueMetrics(bookings)

      // Assert
      expect(metrics.total).toBe(3000) // Only completed bookings
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

    it('should include only completed bookings', () => {
      // Arrange
      const startDate = new Date('2025-10-01')
      const endDate = new Date('2025-10-01')
      const bookings: BookingForAnalytics[] = [
        createMockBooking({ booking_date: '2025-10-01', total_price: 100, status: 'completed' }),
        createMockBooking({ booking_date: '2025-10-01', total_price: 200, status: 'pending' }),
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

    it('should include only completed bookings', () => {
      // Arrange
      const bookings: BookingForAnalytics[] = [
        createMockBooking({
          total_price: 500,
          status: 'completed',
          service_packages: { service_type: 'cleaning' },
        }),
        createMockBooking({
          total_price: 300,
          status: 'pending',
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
      expect(breakdown.find((item) => item.name === 'Completed')?.color).toBe('#10b981')
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
})
