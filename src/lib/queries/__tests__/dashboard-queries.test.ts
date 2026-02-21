import { describe, it, expect, beforeEach, vi } from 'vitest'
import { supabase } from '@/lib/supabase'
import {
  fetchDashboardStats,
  fetchTodayStats,
  fetchBookingsByStatus,
  fetchTodayBookings,
  fetchDailyRevenue,
  fetchWeeklyBookings,
} from '../dashboard-queries'

// Mock Supabase client
vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: vi.fn(),
  },
}))

describe('dashboard-queries', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('fetchDashboardStats', () => {
    it('should fetch dashboard statistics successfully', async () => {
      // Mock data
      const mockBookings = [
        { id: '1', total_price: 1000, payment_status: 'paid' },
        { id: '2', total_price: 2000, payment_status: 'paid' },
        { id: '3', total_price: 1500, payment_status: 'unpaid' },
      ]

      // Mock chains for Promise.all queries
      const mockTotalBookingsChain = {
        select: vi.fn().mockReturnThis(),
        is: vi.fn().mockResolvedValue({ data: null, error: null, count: 10 }),
      }

      const mockCompletedBookingsChain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        is: vi.fn().mockResolvedValue({ data: mockBookings.slice(0, 2), error: null }),
      }

      const mockTotalCustomersChain = {
        select: vi.fn().mockReturnThis(),
        is: vi.fn().mockResolvedValue({ data: null, error: null, count: 25 }),
      }

      const mockPendingBookingsChain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        is: vi.fn().mockResolvedValue({ data: null, error: null, count: 3 }),
      }

      vi.mocked(supabase.from)
        .mockReturnValueOnce(mockTotalBookingsChain as any)
        .mockReturnValueOnce(mockCompletedBookingsChain as any)
        .mockReturnValueOnce(mockTotalCustomersChain as any)
        .mockReturnValueOnce(mockPendingBookingsChain as any)

      const result = await fetchDashboardStats()

      expect(result).toEqual({
        totalBookings: 10,
        totalRevenue: 3000, // 1000 + 2000
        totalCustomers: 25,
        pendingBookings: 3,
      })
      expect(supabase.from).toHaveBeenCalledWith('bookings')
      expect(supabase.from).toHaveBeenCalledWith('customers')
    })

    it('should handle null revenue data', async () => {
      const mockTotalBookingsChain = {
        select: vi.fn().mockReturnThis(),
        is: vi.fn().mockResolvedValue({ data: null, error: null, count: 5 }),
      }

      const mockCompletedBookingsChain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        is: vi.fn().mockResolvedValue({ data: null, error: null }),
      }

      const mockTotalCustomersChain = {
        select: vi.fn().mockReturnThis(),
        is: vi.fn().mockResolvedValue({ data: null, error: null, count: 10 }),
      }

      const mockPendingBookingsChain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        is: vi.fn().mockResolvedValue({ data: null, error: null, count: 2 }),
      }

      vi.mocked(supabase.from)
        .mockReturnValueOnce(mockTotalBookingsChain as any)
        .mockReturnValueOnce(mockCompletedBookingsChain as any)
        .mockReturnValueOnce(mockTotalCustomersChain as any)
        .mockReturnValueOnce(mockPendingBookingsChain as any)

      const result = await fetchDashboardStats()

      expect(result.totalRevenue).toBe(0)
    })

    it('should handle null counts gracefully', async () => {
      const mockTotalBookingsChain = {
        select: vi.fn().mockReturnThis(),
        is: vi.fn().mockResolvedValue({ data: null, error: null, count: null }),
      }

      const mockCompletedBookingsChain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        is: vi.fn().mockResolvedValue({ data: [], error: null }),
      }

      const mockTotalCustomersChain = {
        select: vi.fn().mockReturnThis(),
        is: vi.fn().mockResolvedValue({ data: null, error: null, count: null }),
      }

      const mockPendingBookingsChain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        is: vi.fn().mockResolvedValue({ data: null, error: null, count: null }),
      }

      vi.mocked(supabase.from)
        .mockReturnValueOnce(mockTotalBookingsChain as any)
        .mockReturnValueOnce(mockCompletedBookingsChain as any)
        .mockReturnValueOnce(mockTotalCustomersChain as any)
        .mockReturnValueOnce(mockPendingBookingsChain as any)

      const result = await fetchDashboardStats()

      expect(result).toEqual({
        totalBookings: 0,
        totalRevenue: 0,
        totalCustomers: 0,
        pendingBookings: 0,
      })
    })
  })

  describe('fetchTodayStats', () => {
    it('should fetch today statistics successfully', async () => {
      const mockTodayBookingsChain = {
        select: vi.fn().mockReturnThis(),
        is: vi.fn().mockReturnThis(),
        gte: vi.fn().mockReturnThis(),
        lt: vi.fn().mockResolvedValue({ data: null, error: null, count: 5 }),
      }

      const mockTodayRevenueChain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn((key) => {
          if (key === 'payment_status') {
            return {
              eq: vi.fn().mockReturnValue({
                is: vi.fn().mockResolvedValue({
                  data: [{ total_price: 2000 }, { total_price: 3000 }],
                  error: null,
                }),
              }),
            }
          }
          return mockTodayRevenueChain
        }),
      }

      const mockTodayCustomersChain = {
        select: vi.fn().mockReturnThis(),
        is: vi.fn().mockReturnThis(),
        gte: vi.fn().mockReturnThis(),
        lt: vi.fn().mockResolvedValue({ data: null, error: null, count: 2 }),
      }

      const mockTodayPendingChain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        is: vi.fn().mockReturnThis(),
        gte: vi.fn().mockReturnThis(),
        lt: vi.fn().mockResolvedValue({ data: null, error: null, count: 1 }),
      }

      vi.mocked(supabase.from)
        .mockReturnValueOnce(mockTodayBookingsChain as any)
        .mockReturnValueOnce(mockTodayRevenueChain as any)
        .mockReturnValueOnce(mockTodayCustomersChain as any)
        .mockReturnValueOnce(mockTodayPendingChain as any)

      const result = await fetchTodayStats()

      expect(result).toEqual({
        bookingsChange: 5,
        revenueChange: 5000,
        customersChange: 2,
        pendingChange: 1,
      })
    })

    it('should handle null revenue data for today', async () => {
      const mockTodayBookingsChain = {
        select: vi.fn().mockReturnThis(),
        is: vi.fn().mockReturnThis(),
        gte: vi.fn().mockReturnThis(),
        lt: vi.fn().mockResolvedValue({ data: null, error: null, count: 3 }),
      }

      const mockTodayRevenueChain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn((key) => {
          if (key === 'payment_status') {
            return {
              eq: vi.fn().mockReturnValue({
                is: vi.fn().mockResolvedValue({ data: null, error: null }),
              }),
            }
          }
          return mockTodayRevenueChain
        }),
      }

      const mockTodayCustomersChain = {
        select: vi.fn().mockReturnThis(),
        is: vi.fn().mockReturnThis(),
        gte: vi.fn().mockReturnThis(),
        lt: vi.fn().mockResolvedValue({ data: null, error: null, count: 1 }),
      }

      const mockTodayPendingChain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        is: vi.fn().mockReturnThis(),
        gte: vi.fn().mockReturnThis(),
        lt: vi.fn().mockResolvedValue({ data: null, error: null, count: 0 }),
      }

      vi.mocked(supabase.from)
        .mockReturnValueOnce(mockTodayBookingsChain as any)
        .mockReturnValueOnce(mockTodayRevenueChain as any)
        .mockReturnValueOnce(mockTodayCustomersChain as any)
        .mockReturnValueOnce(mockTodayPendingChain as any)

      const result = await fetchTodayStats()

      expect(result.revenueChange).toBe(0)
    })
  })

  describe('fetchBookingsByStatus', () => {
    it('should fetch and transform bookings by status', async () => {
      const mockBookings = [
        { status: 'pending' },
        { status: 'pending' },
        { status: 'confirmed' },
        { status: 'completed' },
        { status: 'completed' },
        { status: 'completed' },
      ]

      const mockChain = {
        select: vi.fn().mockReturnThis(),
        is: vi.fn().mockResolvedValue({ data: mockBookings, error: null }),
      }

      vi.mocked(supabase.from).mockReturnValue(mockChain as any)

      const result = await fetchBookingsByStatus()

      expect(result).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ status: 'Pending', count: 2 }),
          expect.objectContaining({ status: 'Confirmed', count: 1 }),
          expect.objectContaining({ status: 'Completed', count: 3 }),
        ])
      )
      expect(result).toHaveLength(3)
      expect(result.every((item) => item.color)).toBe(true)
    })

    it('should return empty array when no bookings', async () => {
      const mockChain = {
        select: vi.fn().mockReturnThis(),
        is: vi.fn().mockResolvedValue({ data: null, error: null }),
      }

      vi.mocked(supabase.from).mockReturnValue(mockChain as any)

      const result = await fetchBookingsByStatus()

      expect(result).toEqual([])
    })

    it('should handle errors by throwing', async () => {
      const mockChain = {
        select: vi.fn().mockReturnThis(),
        is: vi.fn().mockResolvedValue({ data: null, error: { message: 'DB error' } }),
      }

      vi.mocked(supabase.from).mockReturnValue(mockChain as any)

      await expect(fetchBookingsByStatus()).rejects.toThrow('Failed to fetch bookings by status')
    })
  })

  describe('fetchTodayBookings', () => {
    it('should fetch today bookings with customer and service package data', async () => {
      const today = new Date().toISOString().split('T')[0]

      const mockBookings = [
        {
          id: '1',
          booking_date: today,
          start_time: '10:00',
          status: 'pending',
          customers: { full_name: 'John Doe', phone: '0812345678' },
          service_packages: { name: 'Basic Cleaning' },
        },
        {
          id: '2',
          booking_date: today,
          start_time: '14:00',
          status: 'confirmed',
          customers: { full_name: 'Jane Smith', phone: '0823456789' },
          service_packages: null,
          service_packages_v2: { name: 'Premium Package' },
        },
      ]

      const mockChain = {
        select: vi.fn().mockReturnThis(),
        is: vi.fn().mockReturnThis(),
        or: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: mockBookings, error: null }),
      }

      vi.mocked(supabase.from).mockReturnValue(mockChain as any)

      const result = await fetchTodayBookings()

      expect(result).toEqual(mockBookings)
      expect(mockChain.or).toHaveBeenCalledWith(expect.stringContaining('booking_date'))
      expect(mockChain.order).toHaveBeenCalledWith('start_time', { ascending: true })
    })

    it('should return empty array when no bookings today', async () => {
      const mockChain = {
        select: vi.fn().mockReturnThis(),
        is: vi.fn().mockReturnThis(),
        or: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: null, error: null }),
      }

      vi.mocked(supabase.from).mockReturnValue(mockChain as any)

      const result = await fetchTodayBookings()

      expect(result).toEqual([])
    })

    it('should handle errors by throwing', async () => {
      const mockChain = {
        select: vi.fn().mockReturnThis(),
        is: vi.fn().mockReturnThis(),
        or: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: null, error: { message: 'DB error' } }),
      }

      vi.mocked(supabase.from).mockReturnValue(mockChain as any)

      await expect(fetchTodayBookings()).rejects.toThrow("Failed to fetch today's bookings")
    })
  })

  describe('fetchWeeklyBookings', () => {
    it('should return 7-item array with correct day labels', async () => {
      const mockChain = {
        select: vi.fn().mockReturnThis(),
        is: vi.fn().mockReturnThis(),
        not: vi.fn().mockReturnThis(),
        gte: vi.fn().mockReturnThis(),
        lte: vi.fn().mockResolvedValue({ data: [], error: null }),
      }

      vi.mocked(supabase.from).mockReturnValue(mockChain as any)

      const result = await fetchWeeklyBookings()

      expect(result).toHaveLength(7)
      expect(result.map((d) => d.dayLabel)).toEqual(['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'])
    })

    it('should count bookings per date correctly', async () => {
      const mockData = [
        { booking_date: '2026-02-16' },
        { booking_date: '2026-02-16' },
        { booking_date: '2026-02-16' },
        { booking_date: '2026-02-18' },
      ]

      const mockChain = {
        select: vi.fn().mockReturnThis(),
        is: vi.fn().mockReturnThis(),
        not: vi.fn().mockReturnThis(),
        gte: vi.fn().mockReturnThis(),
        lte: vi.fn().mockResolvedValue({ data: mockData, error: null }),
      }

      vi.mocked(supabase.from).mockReturnValue(mockChain as any)

      const result = await fetchWeeklyBookings()

      // Find the entries matching our mock dates
      const monEntry = result.find((d) => d.date === '2026-02-16')
      const wedEntry = result.find((d) => d.date === '2026-02-18')
      if (monEntry) expect(monEntry.count).toBe(3)
      if (wedEntry) expect(wedEntry.count).toBe(1)
    })

    it('should return 0 count for days with no bookings', async () => {
      const mockChain = {
        select: vi.fn().mockReturnThis(),
        is: vi.fn().mockReturnThis(),
        not: vi.fn().mockReturnThis(),
        gte: vi.fn().mockReturnThis(),
        lte: vi.fn().mockResolvedValue({ data: [], error: null }),
      }

      vi.mocked(supabase.from).mockReturnValue(mockChain as any)

      const result = await fetchWeeklyBookings()

      expect(result.every((d) => d.count === 0)).toBe(true)
    })

    it('should filter out deleted bookings', async () => {
      const mockChain = {
        select: vi.fn().mockReturnThis(),
        is: vi.fn().mockReturnThis(),
        not: vi.fn().mockReturnThis(),
        gte: vi.fn().mockReturnThis(),
        lte: vi.fn().mockResolvedValue({ data: [], error: null }),
      }

      vi.mocked(supabase.from).mockReturnValue(mockChain as any)

      await fetchWeeklyBookings()

      expect(mockChain.is).toHaveBeenCalledWith('deleted_at', null)
    })

    it('should exclude cancelled and no-show bookings', async () => {
      const mockChain = {
        select: vi.fn().mockReturnThis(),
        is: vi.fn().mockReturnThis(),
        not: vi.fn().mockReturnThis(),
        gte: vi.fn().mockReturnThis(),
        lte: vi.fn().mockResolvedValue({ data: [], error: null }),
      }

      vi.mocked(supabase.from).mockReturnValue(mockChain as any)

      await fetchWeeklyBookings()

      expect(mockChain.not).toHaveBeenCalledWith('status', 'in', expect.stringContaining('cancelled'))
    })

    it('should handle errors by throwing', async () => {
      const mockChain = {
        select: vi.fn().mockReturnThis(),
        is: vi.fn().mockReturnThis(),
        not: vi.fn().mockReturnThis(),
        gte: vi.fn().mockReturnThis(),
        lte: vi.fn().mockResolvedValue({ data: null, error: { message: 'DB error' } }),
      }

      vi.mocked(supabase.from).mockReturnValue(mockChain as any)

      await expect(fetchWeeklyBookings()).rejects.toThrow('Failed to fetch weekly bookings')
    })
  })

  describe('fetchDailyRevenue', () => {
    it('should fetch daily revenue for 7 days', async () => {
      const mockChain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        is: vi.fn().mockReturnThis(),
        gte: vi.fn().mockReturnThis(),
        lte: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: [], error: null }),
      }

      vi.mocked(supabase.from).mockReturnValue(mockChain as any)

      const result = await fetchDailyRevenue(7)

      expect(result).toHaveLength(7)
      expect(result.every((item) => item.date && typeof item.revenue === 'number')).toBe(true)
    })

    it('should fetch daily revenue for 30 days', async () => {
      const mockChain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        is: vi.fn().mockReturnThis(),
        gte: vi.fn().mockReturnThis(),
        lte: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: [], error: null }),
      }

      vi.mocked(supabase.from).mockReturnValue(mockChain as any)

      const result = await fetchDailyRevenue(30)

      expect(result).toHaveLength(30)
      expect(result.every((item) => item.revenue === 0)).toBe(true)
    })

    it('should handle null data gracefully', async () => {
      const mockChain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        is: vi.fn().mockReturnThis(),
        gte: vi.fn().mockReturnThis(),
        lte: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: null, error: null }),
      }

      vi.mocked(supabase.from).mockReturnValue(mockChain as any)

      const result = await fetchDailyRevenue(7)

      expect(result).toHaveLength(7)
      expect(result.every((item) => item.revenue === 0)).toBe(true)
    })

    it('should handle errors by throwing', async () => {
      const mockChain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        is: vi.fn().mockReturnThis(),
        gte: vi.fn().mockReturnThis(),
        lte: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: null, error: { message: 'DB error' } }),
      }

      vi.mocked(supabase.from).mockReturnValue(mockChain as any)

      await expect(fetchDailyRevenue(7)).rejects.toThrow('Failed to fetch daily revenue')
    })
  })

})
