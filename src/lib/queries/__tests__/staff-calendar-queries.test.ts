import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  fetchStaffCalendarEvents,
  staffCalendarQueryOptions,
} from '../staff-calendar-queries'
import { supabase } from '@/lib/supabase'

// Mock dependencies
vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: vi.fn(),
  },
}))

vi.mock('@/lib/logger', () => ({
  logger: {
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  },
}))

vi.mock('@/lib/team-revenue-utils', () => ({
  buildTeamFilterCondition: vi.fn((userId: string, teamIds: string[]) => {
    if (teamIds.length > 0) {
      return `staff_id.eq.${userId},team_id.in.(${teamIds.join(',')})`
    }
    return null
  }),
}))

vi.mock('./staff-bookings-queries', () => ({
  fetchStaffTeamMembership: vi.fn(),
  generateMembershipHash: vi.fn((periods) => JSON.stringify(periods)),
}))

describe('staff-calendar-queries', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  const createMockBooking = (overrides = {}) => ({
    id: 'booking-1',
    booking_date: '2025-01-20',
    start_time: '10:00:00',
    end_time: '12:00:00',
    status: 'confirmed',
    notes: 'Test booking',
    address: '123 Test St',
    city: 'Bangkok',
    state: 'Bangkok',
    zip_code: '10110',
    staff_id: 'staff-1',
    team_id: null,
    area_sqm: 100,
    frequency: 1,
    recurring_sequence: 1,
    recurring_total: 1,
    created_at: '2025-01-01T00:00:00Z',
    customers: {
      full_name: 'John Doe',
      phone: '0812345678',
      avatar_url: null,
    },
    service_packages: {
      name: 'Deep Cleaning',
      duration_minutes: 120,
      price: 5000,
    },
    service_packages_v2: null,
    profiles: {
      full_name: 'Staff Name',
    },
    teams: null,
    ...overrides,
  })

  describe('fetchStaffCalendarEvents', () => {
    it('should fetch calendar events for staff without teams', async () => {
      const mockBookings = [createMockBooking()]

      const mockChain = {
        select: vi.fn().mockReturnThis(),
        is: vi.fn().mockReturnThis(),
        gte: vi.fn().mockReturnThis(),
        lte: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({ data: mockBookings, error: null }),
      }

      vi.mocked(supabase.from).mockReturnValue(mockChain as any)

      const result = await fetchStaffCalendarEvents('staff-1', [])

      expect(supabase.from).toHaveBeenCalledWith('bookings')
      expect(mockChain.is).toHaveBeenCalledWith('deleted_at', null)
      expect(mockChain.eq).toHaveBeenCalledWith('staff_id', 'staff-1')
      expect(result).toHaveLength(1)
      expect(result[0].customer_name).toBe('John Doe')
      expect(result[0].service_name).toBe('Deep Cleaning')
    })

    it('should fetch calendar events for staff with teams', async () => {
      const mockBookings = [
        createMockBooking(),
        createMockBooking({
          id: 'booking-2',
          staff_id: null,
          team_id: 'team-1',
          created_at: '2025-01-15T00:00:00Z',
          teams: {
            id: 'team-1',
            name: 'Team A',
            team_lead_id: 'staff-1',
            team_lead: {
              id: 'staff-1',
              full_name: 'Team Lead',
            },
          },
        }),
      ]

      const mockChain = {
        select: vi.fn().mockReturnThis(),
        is: vi.fn().mockReturnThis(),
        gte: vi.fn().mockReturnThis(),
        lte: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        or: vi.fn().mockResolvedValue({ data: mockBookings, error: null }),
      }

      vi.mocked(supabase.from).mockReturnValue(mockChain as any)

      // Include membership periods to allow team booking
      const membershipPeriods = [
        {
          teamId: 'team-1',
          joinedAt: '2025-01-10T00:00:00Z',
          leftAt: null,
        },
      ]

      const result = await fetchStaffCalendarEvents('staff-1', ['team-1'], membershipPeriods)

      expect(mockChain.or).toHaveBeenCalledWith('staff_id.eq.staff-1,team_id.in.(team-1)')
      expect(result).toHaveLength(2)
      expect(result[1].team_name).toBe('Team A')
    })

    it('should filter by membership periods', async () => {
      const mockBookings = [
        createMockBooking({
          id: 'booking-1',
          staff_id: null,
          team_id: 'team-1',
          created_at: '2025-01-15T00:00:00Z', // Created after joining
        }),
        createMockBooking({
          id: 'booking-2',
          staff_id: null,
          team_id: 'team-1',
          created_at: '2024-12-01T00:00:00Z', // Created before joining
        }),
      ]

      const mockChain = {
        select: vi.fn().mockReturnThis(),
        is: vi.fn().mockReturnThis(),
        gte: vi.fn().mockReturnThis(),
        lte: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        or: vi.fn().mockResolvedValue({ data: mockBookings, error: null }),
      }

      vi.mocked(supabase.from).mockReturnValue(mockChain as any)

      const membershipPeriods = [
        {
          teamId: 'team-1',
          joinedAt: '2025-01-10T00:00:00Z',
          leftAt: null,
        },
      ]

      const result = await fetchStaffCalendarEvents('staff-1', ['team-1'], membershipPeriods)

      // Should only include booking-1 (created after joining)
      expect(result).toHaveLength(1)
      expect(result[0].booking_id).toBe('booking-1')
    })

    it('should handle staff who left team', async () => {
      const mockBookings = [
        createMockBooking({
          id: 'booking-1',
          staff_id: null,
          team_id: 'team-1',
          created_at: '2025-01-15T00:00:00Z', // Created during membership
        }),
        createMockBooking({
          id: 'booking-2',
          staff_id: null,
          team_id: 'team-1',
          created_at: '2025-02-01T00:00:00Z', // Created after leaving
        }),
      ]

      const mockChain = {
        select: vi.fn().mockReturnThis(),
        is: vi.fn().mockReturnThis(),
        gte: vi.fn().mockReturnThis(),
        lte: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        or: vi.fn().mockResolvedValue({ data: mockBookings, error: null }),
      }

      vi.mocked(supabase.from).mockReturnValue(mockChain as any)

      const membershipPeriods = [
        {
          teamId: 'team-1',
          joinedAt: '2025-01-10T00:00:00Z',
          leftAt: '2025-01-20T00:00:00Z', // Left on Jan 20
        },
      ]

      const result = await fetchStaffCalendarEvents('staff-1', ['team-1'], membershipPeriods)

      // Should only include booking-1 (created during membership)
      expect(result).toHaveLength(1)
      expect(result[0].booking_id).toBe('booking-1')
    })

    it('should always show direct staff assignments regardless of membership', async () => {
      const mockBookings = [
        createMockBooking({
          id: 'booking-1',
          staff_id: 'staff-1', // Direct assignment
          team_id: null,
          created_at: '2024-12-01T00:00:00Z', // Before any team membership
        }),
      ]

      const mockChain = {
        select: vi.fn().mockReturnThis(),
        is: vi.fn().mockReturnThis(),
        gte: vi.fn().mockReturnThis(),
        lte: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        or: vi.fn().mockResolvedValue({ data: mockBookings, error: null }),
      }

      vi.mocked(supabase.from).mockReturnValue(mockChain as any)

      const membershipPeriods = [
        {
          teamId: 'team-1',
          joinedAt: '2025-01-10T00:00:00Z',
          leftAt: null,
        },
      ]

      const result = await fetchStaffCalendarEvents('staff-1', ['team-1'], membershipPeriods)

      // Should include direct assignment even if created before team membership
      expect(result).toHaveLength(1)
      expect(result[0].booking_id).toBe('booking-1')
    })

    it('should handle V2 service packages', async () => {
      const mockBookings = [
        createMockBooking({
          service_packages: null,
          service_packages_v2: {
            name: 'V2 Cleaning Package',
          },
        }),
      ]

      const mockChain = {
        select: vi.fn().mockReturnThis(),
        is: vi.fn().mockReturnThis(),
        gte: vi.fn().mockReturnThis(),
        lte: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({ data: mockBookings, error: null }),
      }

      vi.mocked(supabase.from).mockReturnValue(mockChain as any)

      const result = await fetchStaffCalendarEvents('staff-1', [])

      expect(result).toHaveLength(1)
      expect(result[0].service_name).toBe('V2 Cleaning Package')
      expect(result[0].service_price).toBe(0) // V2 packages don't have price in this context
    })

    it('should handle customers as array', async () => {
      const mockBookings = [
        createMockBooking({
          customers: [
            {
              full_name: 'Jane Smith',
              phone: '0898765432',
              avatar_url: 'https://example.com/avatar.jpg',
            },
          ],
        }),
      ]

      const mockChain = {
        select: vi.fn().mockReturnThis(),
        is: vi.fn().mockReturnThis(),
        gte: vi.fn().mockReturnThis(),
        lte: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({ data: mockBookings, error: null }),
      }

      vi.mocked(supabase.from).mockReturnValue(mockChain as any)

      const result = await fetchStaffCalendarEvents('staff-1', [])

      expect(result[0].customer_name).toBe('Jane Smith')
      expect(result[0].customer_phone).toBe('0898765432')
      expect(result[0].customer_avatar).toBe('https://example.com/avatar.jpg')
    })

    it('should handle teams as array', async () => {
      const mockBookings = [
        createMockBooking({
          staff_id: null,
          team_id: 'team-1',
          created_at: '2025-01-15T00:00:00Z',
          teams: [
            {
              id: 'team-1',
              name: 'Team Alpha',
              team_lead_id: 'lead-1',
              team_lead: [
                {
                  id: 'lead-1',
                  full_name: 'Lead Person',
                },
              ],
            },
          ],
        }),
      ]

      const mockChain = {
        select: vi.fn().mockReturnThis(),
        is: vi.fn().mockReturnThis(),
        gte: vi.fn().mockReturnThis(),
        lte: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        or: vi.fn().mockResolvedValue({ data: mockBookings, error: null }),
      }

      vi.mocked(supabase.from).mockReturnValue(mockChain as any)

      // Include membership periods to allow team booking
      const membershipPeriods = [
        {
          teamId: 'team-1',
          joinedAt: '2025-01-10T00:00:00Z',
          leftAt: null,
        },
      ]

      const result = await fetchStaffCalendarEvents('staff-1', ['team-1'], membershipPeriods)

      expect(result[0].team_name).toBe('Team Alpha')
      expect(result[0].teams?.name).toBe('Team Alpha')
      expect(result[0].teams?.team_lead?.full_name).toBe('Lead Person')
    })

    it('should handle missing customer data', async () => {
      const mockBookings = [
        createMockBooking({
          customers: null,
        }),
      ]

      const mockChain = {
        select: vi.fn().mockReturnThis(),
        is: vi.fn().mockReturnThis(),
        gte: vi.fn().mockReturnThis(),
        lte: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({ data: mockBookings, error: null }),
      }

      vi.mocked(supabase.from).mockReturnValue(mockChain as any)

      const result = await fetchStaffCalendarEvents('staff-1', [])

      expect(result[0].customer_name).toBe('Unknown Customer')
      expect(result[0].customer_phone).toBe('')
    })

    it('should handle missing service package data', async () => {
      const mockBookings = [
        createMockBooking({
          service_packages: null,
          service_packages_v2: null,
        }),
      ]

      const mockChain = {
        select: vi.fn().mockReturnThis(),
        is: vi.fn().mockReturnThis(),
        gte: vi.fn().mockReturnThis(),
        lte: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({ data: mockBookings, error: null }),
      }

      vi.mocked(supabase.from).mockReturnValue(mockChain as any)

      const result = await fetchStaffCalendarEvents('staff-1', [])

      expect(result[0].service_name).toBe('Unknown Service')
      expect(result[0].service_price).toBe(0)
    })

    it('should calculate correct start and end dates', async () => {
      const mockBookings = [
        createMockBooking({
          booking_date: '2025-01-20',
          start_time: '14:30:00',
          end_time: '16:45:00',
        }),
      ]

      const mockChain = {
        select: vi.fn().mockReturnThis(),
        is: vi.fn().mockReturnThis(),
        gte: vi.fn().mockReturnThis(),
        lte: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({ data: mockBookings, error: null }),
      }

      vi.mocked(supabase.from).mockReturnValue(mockChain as any)

      const result = await fetchStaffCalendarEvents('staff-1', [])

      expect(result[0].start.getHours()).toBe(14)
      expect(result[0].start.getMinutes()).toBe(30)
      expect(result[0].end.getHours()).toBe(16)
      expect(result[0].end.getMinutes()).toBe(45)
      expect(result[0].service_duration).toBe(135) // 2h 15m = 135 minutes
    })

    it('should handle database errors', async () => {
      const mockChain = {
        select: vi.fn().mockReturnThis(),
        is: vi.fn().mockReturnThis(),
        gte: vi.fn().mockReturnThis(),
        lte: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        eq: vi.fn().mockRejectedValue({ data: null, error: { message: 'Database error' } }),
      }

      vi.mocked(supabase.from).mockReturnValue(mockChain as any)

      const result = await fetchStaffCalendarEvents('staff-1', [])

      expect(result).toEqual([])
    })

    it('should handle null data from database', async () => {
      const mockChain = {
        select: vi.fn().mockReturnThis(),
        is: vi.fn().mockReturnThis(),
        gte: vi.fn().mockReturnThis(),
        lte: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({ data: null, error: null }),
      }

      vi.mocked(supabase.from).mockReturnValue(mockChain as any)

      const result = await fetchStaffCalendarEvents('staff-1', [])

      expect(result).toEqual([])
    })

    it('should handle empty bookings array', async () => {
      const mockChain = {
        select: vi.fn().mockReturnThis(),
        is: vi.fn().mockReturnThis(),
        gte: vi.fn().mockReturnThis(),
        lte: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({ data: [], error: null }),
      }

      vi.mocked(supabase.from).mockReturnValue(mockChain as any)

      const result = await fetchStaffCalendarEvents('staff-1', [])

      expect(result).toEqual([])
    })

    it('should use correct date range (6 months back to 6 months ahead)', async () => {
      const mockChain = {
        select: vi.fn().mockReturnThis(),
        is: vi.fn().mockReturnThis(),
        gte: vi.fn().mockReturnThis(),
        lte: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({ data: [], error: null }),
      }

      vi.mocked(supabase.from).mockReturnValue(mockChain as any)

      await fetchStaffCalendarEvents('staff-1', [])

      // Check that gte and lte were called (we can't easily check exact dates)
      expect(mockChain.gte).toHaveBeenCalledWith('booking_date', expect.any(String))
      expect(mockChain.lte).toHaveBeenCalledWith('booking_date', expect.any(String))
    })
  })

  describe('staffCalendarQueryOptions', () => {
    it('should generate team membership query options', () => {
      const options = staffCalendarQueryOptions.teamMembership('staff-1')

      expect(options.queryKey).toBeDefined()
      expect(options.queryFn).toBeDefined()
      expect(options.staleTime).toBe(10 * 60 * 1000) // 10 minutes
      expect(options.enabled).toBe(true)
    })

    it('should generate events query options', () => {
      const membershipPeriods = [
        {
          teamId: 'team-1',
          joinedAt: '2025-01-10T00:00:00Z',
          leftAt: null,
        },
      ]

      const options = staffCalendarQueryOptions.events('staff-1', ['team-1'], membershipPeriods)

      expect(options.queryKey).toBeDefined()
      expect(options.queryFn).toBeDefined()
      expect(options.staleTime).toBe(5 * 60 * 1000) // 5 minutes
      expect(options.refetchInterval).toBe(5 * 60 * 1000) // 5 minutes
      expect(options.enabled).toBe(true)
    })

    it('should disable query when userId is empty', () => {
      const options = staffCalendarQueryOptions.events('', [])

      expect(options.enabled).toBe(false)
    })
  })
})
