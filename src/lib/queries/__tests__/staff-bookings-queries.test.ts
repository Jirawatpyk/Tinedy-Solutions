import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  fetchStaffTeamMembership,
  fetchStaffBookingsToday,
  fetchStaffBookingsUpcoming,
  fetchStaffBookingsCompleted,
  generateMembershipHash,
  staffBookingsQueryOptions,
} from '../staff-bookings-queries'
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
  calculateBookingRevenue: vi.fn((booking) => booking.total_price || 0),
  buildTeamFilterCondition: vi.fn((userId: string, teamIds: string[]) => {
    if (teamIds.length > 0) {
      return `staff_id.eq.${userId},team_id.in.(${teamIds.join(',')})`
    }
    return null
  }),
}))

vi.mock('@/lib/review-utils', () => ({
  isWithinMembershipPeriod: vi.fn(() => true),
}))

describe('staff-bookings-queries', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('fetchStaffTeamMembership', () => {
    it('should fetch team membership for staff without teams', async () => {
      const mockChain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        is: vi.fn().mockResolvedValue({ data: [], error: null }),
      }

      vi.mocked(supabase.from).mockReturnValue(mockChain as any)

      const result = await fetchStaffTeamMembership('staff-1')

      expect(result.userId).toBe('staff-1')
      expect(result.teamIds).toEqual([])
      expect(result.isLead).toBe(false)
      expect(result.memberOfTeams).toBe(0)
    })

    it('should return empty membership on database error', async () => {
      const mockChain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        is: vi.fn().mockResolvedValue({ data: null, error: { message: 'Error' } }),
      }

      vi.mocked(supabase.from).mockReturnValue(mockChain as any)

      const result = await fetchStaffTeamMembership('staff-1')

      // Function handles error by returning empty membership
      expect(result.teamIds).toEqual([])
    })
  })

  describe('fetchStaffBookingsToday', () => {
    it('should fetch today bookings', async () => {
      const mockBookings = [{ id: 'booking-1', status: 'confirmed' }]

      const mockChain = {
        select: vi.fn().mockReturnThis(),
        lte: vi.fn().mockReturnThis(),
        or: vi.fn().mockReturnThis(),
        is: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        // eq('staff_id', userId) is called last when teamIds=[] — resolves here
        eq: vi.fn().mockResolvedValue({ data: mockBookings, error: null }),
      }

      vi.mocked(supabase.from).mockReturnValue(mockChain as any)

      const result = await fetchStaffBookingsToday('staff-1', [])

      expect(mockChain.lte).toHaveBeenCalledWith('booking_date', expect.any(String))
      expect(mockChain.is).toHaveBeenCalledWith('deleted_at', null)
      expect(mockChain.eq).toHaveBeenCalledWith('staff_id', 'staff-1')
      expect(result).toBeDefined()
    })

    it('should throw error on database error', async () => {
      const mockChain = {
        select: vi.fn().mockReturnThis(),
        lte: vi.fn().mockReturnThis(),
        or: vi.fn().mockReturnThis(),
        is: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        // eq('staff_id', userId) is the final call — resolves with error
        eq: vi.fn().mockResolvedValue({ data: null, error: { message: 'Database error' } }),
      }

      vi.mocked(supabase.from).mockReturnValue(mockChain as any)

      await expect(fetchStaffBookingsToday('staff-1', [])).rejects.toThrow('Failed to fetch today\'s bookings')
    })
  })

  describe('fetchStaffBookingsUpcoming', () => {
    it('should fetch upcoming bookings', async () => {
      const mockBookings = [{ id: 'booking-1', status: 'confirmed' }]

      const mockChain = {
        select: vi.fn().mockReturnThis(),
        gte: vi.fn().mockReturnThis(),
        lte: vi.fn().mockReturnThis(),
        is: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        or: vi.fn().mockResolvedValue({ data: mockBookings, error: null }),
        eq: vi.fn().mockResolvedValue({ data: mockBookings, error: null }),
      }

      vi.mocked(supabase.from).mockReturnValue(mockChain as any)

      const result = await fetchStaffBookingsUpcoming('staff-1', [])

      expect(mockChain.gte).toHaveBeenCalledWith('booking_date', expect.any(String))
      expect(mockChain.lte).toHaveBeenCalledWith('booking_date', expect.any(String))
      expect(result).toBeDefined()
    })

    it('should throw error on database error', async () => {
      const mockChain = {
        select: vi.fn().mockReturnThis(),
        gte: vi.fn().mockReturnThis(),
        lte: vi.fn().mockReturnThis(),
        is: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        or: vi.fn().mockResolvedValue({ data: null, error: { message: 'Database error' } }),
        eq: vi.fn().mockResolvedValue({ data: null, error: { message: 'Database error' } }),
      }

      vi.mocked(supabase.from).mockReturnValue(mockChain as any)

      await expect(fetchStaffBookingsUpcoming('staff-1', [])).rejects.toThrow('Failed to fetch upcoming bookings')
    })
  })

  describe('fetchStaffBookingsCompleted', () => {
    it('should fetch completed bookings', async () => {
      const mockBookings = [{ id: 'booking-1', status: 'completed' }]

      const mockChain = {
        select: vi.fn().mockReturnThis(),
        gte: vi.fn().mockReturnThis(),
        lte: vi.fn().mockReturnThis(),
        is: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        or: vi.fn().mockResolvedValue({ data: mockBookings, error: null }),
        eq: vi.fn().mockResolvedValue({ data: mockBookings, error: null }),
      }

      vi.mocked(supabase.from).mockReturnValue(mockChain as any)

      const result = await fetchStaffBookingsCompleted('staff-1', [])

      expect(mockChain.gte).toHaveBeenCalledWith('booking_date', expect.any(String))
      expect(mockChain.lte).toHaveBeenCalledWith('booking_date', expect.any(String))
      expect(result).toBeDefined()
    })

    it('should throw error on database error', async () => {
      const mockChain = {
        select: vi.fn().mockReturnThis(),
        gte: vi.fn().mockReturnThis(),
        lte: vi.fn().mockReturnThis(),
        is: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        or: vi.fn().mockResolvedValue({ data: null, error: { message: 'Database error' } }),
        eq: vi.fn().mockResolvedValue({ data: null, error: { message: 'Database error' } }),
      }

      vi.mocked(supabase.from).mockReturnValue(mockChain as any)

      await expect(fetchStaffBookingsCompleted('staff-1', [])).rejects.toThrow('Failed to fetch completed bookings')
    })
  })

  describe('generateMembershipHash', () => {
    it('should generate hash from membership periods', () => {
      const periods = [
        {
          teamId: 'team-1',
          joinedAt: '2025-01-10',
          leftAt: null,
        },
      ]

      const hash = generateMembershipHash(periods)

      expect(hash).toBeDefined()
      expect(typeof hash).toBe('string')
    })

    it('should generate consistent hash for identical periods', () => {
      const periods = [{ teamId: 'team-1', joinedAt: '2025-01-10', leftAt: null }]

      const hash1 = generateMembershipHash(periods)
      const hash2 = generateMembershipHash(periods)

      expect(hash1).toBe(hash2)
    })

    it('should handle empty periods', () => {
      const hash = generateMembershipHash([])

      expect(hash).toBeDefined()
      expect(typeof hash).toBe('string')
    })
  })

  describe('staffBookingsQueryOptions', () => {
    it('should generate team membership query options', () => {
      const options = staffBookingsQueryOptions.teamMembership('staff-1')

      expect(options.queryKey).toBeDefined()
      expect(options.queryFn).toBeDefined()
      expect(options.staleTime).toBe(10 * 60 * 1000)
      expect(options.enabled).toBe(true)
    })

    it('should generate today query options', () => {
      const options = staffBookingsQueryOptions.today('staff-1', [])

      expect(options.queryKey).toBeDefined()
      expect(options.queryFn).toBeDefined()
      expect(options.staleTime).toBe(1 * 60 * 1000)
      expect(options.enabled).toBe(true)
    })

    it('should generate upcoming query options', () => {
      const options = staffBookingsQueryOptions.upcoming('staff-1', [])

      expect(options.queryKey).toBeDefined()
      expect(options.queryFn).toBeDefined()
      expect(options.staleTime).toBe(5 * 60 * 1000)
      expect(options.enabled).toBe(true)
    })

    it('should generate completed query options', () => {
      const options = staffBookingsQueryOptions.completed('staff-1', [])

      expect(options.queryKey).toBeDefined()
      expect(options.queryFn).toBeDefined()
      expect(options.staleTime).toBe(10 * 60 * 1000)
      expect(options.enabled).toBe(true)
    })

    it('should generate stats query options', () => {
      const options = staffBookingsQueryOptions.stats('staff-1', [])

      expect(options.queryKey).toBeDefined()
      expect(options.queryFn).toBeDefined()
      expect(options.staleTime).toBe(5 * 60 * 1000)
      expect(options.enabled).toBe(true)
    })

    it('should disable queries when userId is empty', () => {
      const options = staffBookingsQueryOptions.today('', [])

      expect(options.enabled).toBe(false)
    })
  })
})
