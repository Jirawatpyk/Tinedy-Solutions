import { describe, it, expect, beforeEach, vi } from 'vitest'

// Mock Supabase client
vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: vi.fn(),
  },
}))

// Mock booking-utils
vi.mock('@/lib/booking-utils', () => ({
  TEAMS_WITH_LEAD_QUERY: 'teams(id,name,team_lead:team_lead_id(id,full_name,email,avatar_url))',
  transformTeamsData: vi.fn((teams) => teams),
}))

// Note: @/schemas is NOT mocked - using real BookingResponseSchema for validation

import { supabase } from '@/lib/supabase'
import {
  fetchBookings,
  fetchBookingsByDateRange,
  fetchBookingsByCustomer,
  fetchBookingDetail,
} from '../booking-queries'

describe('booking-queries', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  const createMockBooking = (overrides = {}) => ({
    id: 'booking-1',
    customer_id: 'customer-1',
    booking_date: '2025-01-20',
    start_time: '10:00',
    status: 'confirmed',
    customers: { id: 'customer-1', full_name: 'John Doe', email: 'john@example.com', phone: '0812345678' },
    service_packages: { name: 'Basic Cleaning', service_type: 'cleaning' },
    service_packages_v2: null,
    profiles: { full_name: 'Staff A' },
    teams: null,
    ...overrides,
  })

  describe('fetchBookings', () => {
    it('should fetch bookings excluding archived by default', async () => {
      const mockBookings = [createMockBooking(), createMockBooking({ id: 'booking-2' })]

      const mockChain = {
        select: vi.fn().mockReturnThis(),
        is: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: mockBookings, error: null }),
      }

      vi.mocked(supabase.from).mockReturnValue(mockChain as any)

      const result = await fetchBookings(false)

      expect(result).toHaveLength(2)
      expect(mockChain.is).toHaveBeenCalledWith('deleted_at', null)
      expect(mockChain.order).toHaveBeenCalledWith('created_at', { ascending: false })
    })

    it('should fetch bookings including archived when showArchived=true', async () => {
      const mockBookings = [createMockBooking()]

      const mockChain = {
        select: vi.fn().mockReturnThis(),
        is: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: mockBookings, error: null }),
      }

      vi.mocked(supabase.from).mockReturnValue(mockChain as any)

      const result = await fetchBookings(true)

      expect(result).toHaveLength(1)
      expect(mockChain.is).not.toHaveBeenCalled()
    })

    it('should merge V1 and V2 service packages', async () => {
      const mockBooking = createMockBooking({
        service_packages: null,
        service_packages_v2: { name: 'Premium V2', service_type: 'training' },
      })

      const mockChain = {
        select: vi.fn().mockReturnThis(),
        is: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: [mockBooking], error: null }),
      }

      vi.mocked(supabase.from).mockReturnValue(mockChain as any)

      const result = await fetchBookings()

      expect(result[0].service_packages).toEqual({ name: 'Premium V2', service_type: 'training' })
    })

    it('should handle errors by throwing', async () => {
      const mockChain = {
        select: vi.fn().mockReturnThis(),
        is: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: null, error: { message: 'DB error' } }),
      }

      vi.mocked(supabase.from).mockReturnValue(mockChain as any)

      await expect(fetchBookings()).rejects.toThrow('Failed to fetch bookings')
    })

    it('should handle Zod validation errors', async () => {
      const invalidData = [{ id: 123 }] // Invalid type

      const mockChain = {
        select: vi.fn().mockReturnThis(),
        is: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: invalidData, error: null }),
      }

      vi.mocked(supabase.from).mockReturnValue(mockChain as any)

      await expect(fetchBookings()).rejects.toThrow('Invalid booking data received from server')
    })
  })

  describe('fetchBookingsByDateRange', () => {
    it('should fetch bookings by date range', async () => {
      const mockBookings = [
        createMockBooking({ booking_date: '2025-01-20' }),
        createMockBooking({ id: 'booking-2', booking_date: '2025-01-21' }),
      ]

      const mockChain = {
        select: vi.fn().mockReturnThis(),
        gte: vi.fn().mockReturnThis(),
        lte: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        is: vi.fn().mockResolvedValue({ data: mockBookings, error: null }),
      }

      vi.mocked(supabase.from).mockReturnValue(mockChain as any)

      const result = await fetchBookingsByDateRange('2025-01-20', '2025-01-22')

      expect(result).toHaveLength(2)
      expect(mockChain.gte).toHaveBeenCalledWith('booking_date', '2025-01-20')
      expect(mockChain.lte).toHaveBeenCalledWith('booking_date', '2025-01-22')
    })

    it('should filter by multi-select staffIds', async () => {
      const mockBookings = [createMockBooking()]

      const mockChain = {
        select: vi.fn().mockReturnThis(),
        gte: vi.fn().mockReturnThis(),
        lte: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        is: vi.fn().mockReturnThis(),
        in: vi.fn().mockResolvedValue({ data: mockBookings, error: null }),
      }

      vi.mocked(supabase.from).mockReturnValue(mockChain as any)

      await fetchBookingsByDateRange('2025-01-20', '2025-01-22', {
        staffIds: ['staff-1', 'staff-2'],
      })

      expect(mockChain.in).toHaveBeenCalledWith('staff_id', ['staff-1', 'staff-2'])
    })

    it('should filter by single staffId (legacy)', async () => {
      const mockBookings = [createMockBooking()]

      const mockChain = {
        select: vi.fn().mockReturnThis(),
        gte: vi.fn().mockReturnThis(),
        lte: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        is: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({ data: mockBookings, error: null }),
      }

      vi.mocked(supabase.from).mockReturnValue(mockChain as any)

      await fetchBookingsByDateRange('2025-01-20', '2025-01-22', {
        staffId: 'staff-1',
      })

      expect(mockChain.eq).toHaveBeenCalledWith('staff_id', 'staff-1')
    })

    it('should filter by viewMode=staff (legacy)', async () => {
      const mockBookings = [createMockBooking()]

      const mockChain = {
        select: vi.fn().mockReturnThis(),
        gte: vi.fn().mockReturnThis(),
        lte: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        is: vi.fn().mockReturnThis(),
        not: vi.fn().mockReturnThis(),
        then: vi.fn((resolve) => resolve({ data: mockBookings, error: null })),
      }

      vi.mocked(supabase.from).mockReturnValue(mockChain as any)

      await fetchBookingsByDateRange('2025-01-20', '2025-01-22', {
        viewMode: 'staff',
      })

      expect(mockChain.not).toHaveBeenCalledWith('staff_id', 'is', null)
      expect(mockChain.is).toHaveBeenCalledWith('team_id', null)
      expect(mockChain.is).toHaveBeenCalledWith('deleted_at', null)
    })

    it('should filter by multi-select teamIds', async () => {
      const mockBookings = [createMockBooking()]

      const mockChain = {
        select: vi.fn().mockReturnThis(),
        gte: vi.fn().mockReturnThis(),
        lte: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        is: vi.fn().mockReturnThis(),
        in: vi.fn().mockResolvedValue({ data: mockBookings, error: null }),
      }

      vi.mocked(supabase.from).mockReturnValue(mockChain as any)

      await fetchBookingsByDateRange('2025-01-20', '2025-01-22', {
        teamIds: ['team-1', 'team-2'],
      })

      expect(mockChain.in).toHaveBeenCalledWith('team_id', ['team-1', 'team-2'])
    })

    it('should filter by viewMode=team (legacy)', async () => {
      const mockBookings = [createMockBooking()]

      const mockChain = {
        select: vi.fn().mockReturnThis(),
        gte: vi.fn().mockReturnThis(),
        lte: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        is: vi.fn().mockReturnThis(),
        not: vi.fn().mockReturnThis(),
        then: vi.fn((resolve) => resolve({ data: mockBookings, error: null })),
      }

      vi.mocked(supabase.from).mockReturnValue(mockChain as any)

      await fetchBookingsByDateRange('2025-01-20', '2025-01-22', {
        viewMode: 'team',
      })

      expect(mockChain.not).toHaveBeenCalledWith('team_id', 'is', null)
      expect(mockChain.is).toHaveBeenCalledWith('staff_id', null)
      expect(mockChain.is).toHaveBeenCalledWith('deleted_at', null)
    })

    it('should filter by multi-select statuses', async () => {
      const mockBookings = [createMockBooking()]

      const mockChain = {
        select: vi.fn().mockReturnThis(),
        gte: vi.fn().mockReturnThis(),
        lte: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        is: vi.fn().mockReturnThis(),
        in: vi.fn().mockResolvedValue({ data: mockBookings, error: null }),
      }

      vi.mocked(supabase.from).mockReturnValue(mockChain as any)

      await fetchBookingsByDateRange('2025-01-20', '2025-01-22', {
        statuses: ['confirmed', 'completed'],
      })

      expect(mockChain.in).toHaveBeenCalledWith('status', ['confirmed', 'completed'])
    })

    it('should filter by single status (legacy)', async () => {
      const mockBookings = [createMockBooking()]

      const mockChain = {
        select: vi.fn().mockReturnThis(),
        gte: vi.fn().mockReturnThis(),
        lte: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        is: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({ data: mockBookings, error: null }),
      }

      vi.mocked(supabase.from).mockReturnValue(mockChain as any)

      await fetchBookingsByDateRange('2025-01-20', '2025-01-22', {
        status: 'confirmed',
      })

      expect(mockChain.eq).toHaveBeenCalledWith('status', 'confirmed')
    })

    it('should filter by payment statuses', async () => {
      const mockBookings = [createMockBooking()]

      const mockChain = {
        select: vi.fn().mockReturnThis(),
        gte: vi.fn().mockReturnThis(),
        lte: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        is: vi.fn().mockReturnThis(),
        in: vi.fn().mockResolvedValue({ data: mockBookings, error: null }),
      }

      vi.mocked(supabase.from).mockReturnValue(mockChain as any)

      await fetchBookingsByDateRange('2025-01-20', '2025-01-22', {
        paymentStatuses: ['paid', 'pending'],
      })

      expect(mockChain.in).toHaveBeenCalledWith('payment_status', ['paid', 'pending'])
    })

    it('should filter by customer ID', async () => {
      const mockBookings = [createMockBooking()]

      const mockChain = {
        select: vi.fn().mockReturnThis(),
        gte: vi.fn().mockReturnThis(),
        lte: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        is: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({ data: mockBookings, error: null }),
      }

      vi.mocked(supabase.from).mockReturnValue(mockChain as any)

      await fetchBookingsByDateRange('2025-01-20', '2025-01-22', {
        customerId: 'customer-1',
      })

      expect(mockChain.eq).toHaveBeenCalledWith('customer_id', 'customer-1')
    })

    it('should filter by search query (customer name)', async () => {
      const mockBookings = [
        createMockBooking({ customers: { full_name: 'John Doe' } }),
        createMockBooking({ id: 'booking-2', customers: { full_name: 'Jane Smith' } }),
      ]

      const mockChain = {
        select: vi.fn().mockReturnThis(),
        gte: vi.fn().mockReturnThis(),
        lte: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        is: vi.fn().mockResolvedValue({ data: mockBookings, error: null }),
      }

      vi.mocked(supabase.from).mockReturnValue(mockChain as any)

      const result = await fetchBookingsByDateRange('2025-01-20', '2025-01-22', {
        searchQuery: 'john',
      })

      expect(result).toHaveLength(1)
      expect(result[0].customers?.full_name).toBe('John Doe')
    })

    it('should filter by search query (phone)', async () => {
      const mockBookings = [
        createMockBooking({ customers: { phone: '0812345678' } }),
        createMockBooking({ id: 'booking-2', customers: { phone: '0898765432' } }),
      ]

      const mockChain = {
        select: vi.fn().mockReturnThis(),
        gte: vi.fn().mockReturnThis(),
        lte: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        is: vi.fn().mockResolvedValue({ data: mockBookings, error: null }),
      }

      vi.mocked(supabase.from).mockReturnValue(mockChain as any)

      const result = await fetchBookingsByDateRange('2025-01-20', '2025-01-22', {
        searchQuery: '0812',
      })

      expect(result).toHaveLength(1)
      expect(result[0].customers?.phone).toBe('0812345678')
    })

    it('should handle showArchived flag', async () => {
      const mockBookings = [createMockBooking()]

      const mockChain = {
        select: vi.fn().mockReturnThis(),
        gte: vi.fn().mockReturnThis(),
        lte: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        is: vi.fn().mockResolvedValue({ data: mockBookings, error: null }),
      }

      vi.mocked(supabase.from).mockReturnValue(mockChain as any)

      await fetchBookingsByDateRange('2025-01-20', '2025-01-22', {
        showArchived: true,
      })

      expect(mockChain.is).not.toHaveBeenCalled()
    })

    it('should transform array customers to single object', async () => {
      const mockBooking = createMockBooking({
        customers: [{ id: 'customer-1', full_name: 'John Doe' }],
      })

      const mockChain = {
        select: vi.fn().mockReturnThis(),
        gte: vi.fn().mockReturnThis(),
        lte: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        is: vi.fn().mockResolvedValue({ data: [mockBooking], error: null }),
      }

      vi.mocked(supabase.from).mockReturnValue(mockChain as any)

      const result = await fetchBookingsByDateRange('2025-01-20', '2025-01-22')

      expect(result[0].customers).toEqual({ id: 'customer-1', full_name: 'John Doe' })
    })
  })

  describe('fetchBookingsByCustomer', () => {
    it('should fetch bookings by customer ID', async () => {
      const mockBookings = [createMockBooking({ customer_id: 'customer-1' })]

      const mockChain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        is: vi.fn().mockResolvedValue({ data: mockBookings, error: null }),
      }

      vi.mocked(supabase.from).mockReturnValue(mockChain as any)

      const result = await fetchBookingsByCustomer('customer-1')

      expect(result).toHaveLength(1)
      expect(mockChain.eq).toHaveBeenCalledWith('customer_id', 'customer-1')
    })

    it('should include archived when showArchived=true', async () => {
      const mockBookings = [createMockBooking()]

      const mockChain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        is: vi.fn().mockResolvedValue({ data: mockBookings, error: null }),
      }

      vi.mocked(supabase.from).mockReturnValue(mockChain as any)

      await fetchBookingsByCustomer('customer-1', true)

      expect(mockChain.is).not.toHaveBeenCalled()
    })

    it('should handle errors by throwing', async () => {
      const mockChain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        is: vi.fn().mockResolvedValue({ data: null, error: { message: 'DB error' } }),
      }

      vi.mocked(supabase.from).mockReturnValue(mockChain as any)

      await expect(fetchBookingsByCustomer('customer-1')).rejects.toThrow('Failed to fetch customer bookings')
    })
  })

  describe('fetchBookingDetail', () => {
    it('should fetch single booking detail', async () => {
      const mockBooking = createMockBooking()

      const mockChain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: mockBooking, error: null }),
      }

      vi.mocked(supabase.from).mockReturnValue(mockChain as any)

      const result = await fetchBookingDetail('booking-1')

      expect(result.id).toBe('booking-1')
      expect(mockChain.eq).toHaveBeenCalledWith('id', 'booking-1')
      expect(mockChain.single).toHaveBeenCalled()
    })

    it('should merge V1 and V2 packages', async () => {
      const mockBooking = createMockBooking({
        service_packages: null,
        service_packages_v2: { name: 'Premium V2' },
      })

      const mockChain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: mockBooking, error: null }),
      }

      vi.mocked(supabase.from).mockReturnValue(mockChain as any)

      const result = await fetchBookingDetail('booking-1')

      expect(result.service_packages).toEqual({ name: 'Premium V2' })
    })

    it('should handle errors by throwing', async () => {
      const mockChain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: null, error: { message: 'Not found' } }),
      }

      vi.mocked(supabase.from).mockReturnValue(mockChain as any)

      await expect(fetchBookingDetail('booking-1')).rejects.toThrow('Failed to fetch booking detail')
    })
  })
})
