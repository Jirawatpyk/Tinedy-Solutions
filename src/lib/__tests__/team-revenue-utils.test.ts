/**
 * Unit Tests for team-revenue-utils
 *
 * Critical Tests:
 * 1. Revenue Calculation - ทดสอบการคำนวณ revenue สำหรับ team bookings
 * 2. Team Member Counting - ทดสอบการนับจำนวน team members
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  calculateBookingRevenue,
  getUniqueTeamIds,
  getTeamMemberCounts,
} from '../team-revenue-utils'
import { supabase } from '@/lib/supabase'

// Mock Supabase
vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: vi.fn(),
  },
}))

describe('team-revenue-utils - Critical Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('calculateBookingRevenue', () => {
    it('should return full revenue for individual staff bookings', () => {
      const booking = {
        total_price: 3000,
        staff_id: 'staff-123',
        team_id: null,
      }

      const teamMemberCounts = new Map()

      const revenue = calculateBookingRevenue(booking, teamMemberCounts)

      expect(revenue).toBe(3000)
    })

    it('should divide revenue by team member count for team bookings', () => {
      const booking = {
        total_price: 3000,
        staff_id: null,
        team_id: 'team-456',
      }

      const teamMemberCounts = new Map([['team-456', 3]])

      const revenue = calculateBookingRevenue(booking, teamMemberCounts)

      // 3000 / 3 = 1000
      expect(revenue).toBe(1000)
    })

    it('should handle team booking with 2 members', () => {
      const booking = {
        total_price: 4000,
        staff_id: null,
        team_id: 'team-789',
      }

      const teamMemberCounts = new Map([['team-789', 2]])

      const revenue = calculateBookingRevenue(booking, teamMemberCounts)

      // 4000 / 2 = 2000
      expect(revenue).toBe(2000)
    })

    it('should default to 1 member if team count is not found', () => {
      const booking = {
        total_price: 5000,
        staff_id: null,
        team_id: 'team-unknown',
      }

      const teamMemberCounts = new Map() // Empty - no team data

      const revenue = calculateBookingRevenue(booking, teamMemberCounts)

      // 5000 / 1 = 5000 (fallback)
      expect(revenue).toBe(5000)
    })

    it('should handle decimal division correctly', () => {
      const booking = {
        total_price: 1000,
        staff_id: null,
        team_id: 'team-abc',
      }

      const teamMemberCounts = new Map([['team-abc', 3]])

      const revenue = calculateBookingRevenue(booking, teamMemberCounts)

      // 1000 / 3 = 333.33...
      expect(revenue).toBeCloseTo(333.33, 2)
    })

    it('should return full revenue if booking has both staff_id and team_id', () => {
      // Edge case: ถ้ามีทั้ง staff_id และ team_id ให้นับเป็น individual booking
      const booking = {
        total_price: 2000,
        staff_id: 'staff-123',
        team_id: 'team-456',
      }

      const teamMemberCounts = new Map([['team-456', 3]])

      const revenue = calculateBookingRevenue(booking, teamMemberCounts)

      // staff_id มีค่า -> นับเป็น individual booking
      expect(revenue).toBe(2000)
    })
  })

  describe('getUniqueTeamIds', () => {
    it('should extract team IDs from team bookings only', () => {
      const bookings = [
        { team_id: 'team-123', staff_id: null },
        { team_id: 'team-456', staff_id: null },
        { team_id: null, staff_id: 'staff-789' }, // Individual - ไม่เอา
        { team_id: 'team-123', staff_id: null }, // Duplicate - ควรมีแค่ 1
      ]

      const teamIds = getUniqueTeamIds(bookings)

      expect(teamIds).toEqual(['team-123', 'team-456'])
      expect(teamIds).toHaveLength(2) // Unique เท่านั้น
    })

    it('should exclude team bookings that have staff_id assigned', () => {
      const bookings = [
        { team_id: 'team-123', staff_id: null }, // เอา
        { team_id: 'team-123', staff_id: 'staff-456' }, // ไม่เอา - มี staff_id
      ]

      const teamIds = getUniqueTeamIds(bookings)

      expect(teamIds).toEqual(['team-123'])
    })

    it('should return empty array if no team bookings', () => {
      const bookings = [
        { team_id: null, staff_id: 'staff-123' },
        { team_id: null, staff_id: 'staff-456' },
      ]

      const teamIds = getUniqueTeamIds(bookings)

      expect(teamIds).toEqual([])
    })

    it('should handle empty bookings array', () => {
      const bookings: any[] = []

      const teamIds = getUniqueTeamIds(bookings)

      expect(teamIds).toEqual([])
    })

    it('should remove duplicate team IDs', () => {
      const bookings = [
        { team_id: 'team-123', staff_id: null },
        { team_id: 'team-123', staff_id: null },
        { team_id: 'team-123', staff_id: null },
      ]

      const teamIds = getUniqueTeamIds(bookings)

      expect(teamIds).toEqual(['team-123'])
      expect(teamIds).toHaveLength(1)
    })
  })

  describe('getTeamMemberCounts', () => {
    it('should count team members correctly', async () => {
      const teamMembersData = [
        { team_id: 'team-123' },
        { team_id: 'team-123' },
        { team_id: 'team-123' },
        { team_id: 'team-456' },
        { team_id: 'team-456' },
      ]

      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        in: vi.fn().mockReturnThis(),
        is: vi.fn().mockResolvedValue({ data: teamMembersData, error: null }),
      }

      vi.mocked(supabase.from).mockReturnValue(mockQuery as any)

      const counts = await getTeamMemberCounts(['team-123', 'team-456'])

      expect(counts.get('team-123')).toBe(3)
      expect(counts.get('team-456')).toBe(2)
    })

    it('should return empty map if no team IDs provided', async () => {
      const counts = await getTeamMemberCounts([])

      expect(counts.size).toBe(0)
    })

    it('should handle teams with no members by falling back to count=1', async () => {
      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        in: vi.fn().mockReturnThis(),
        is: vi.fn().mockResolvedValue({ data: [], error: null }),
      }

      vi.mocked(supabase.from).mockReturnValue(mockQuery as any)

      const counts = await getTeamMemberCounts(['team-empty'])

      // Fallback: team ที่ไม่มี members จะได้ count = 1
      expect(counts.get('team-empty')).toBe(1)
    })

    it('should handle database errors gracefully', async () => {
      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        in: vi.fn().mockReturnThis(),
        is: vi.fn().mockResolvedValue({ data: null, error: { message: 'DB Error' } }),
      }

      vi.mocked(supabase.from).mockReturnValue(mockQuery as any)

      const counts = await getTeamMemberCounts(['team-123'])

      expect(counts.size).toBe(0)
    })

    it('should count members from multiple teams independently', async () => {
      const teamMembersData = [
        { team_id: 'team-A' },
        { team_id: 'team-B' },
        { team_id: 'team-A' },
        { team_id: 'team-C' },
        { team_id: 'team-B' },
        { team_id: 'team-A' },
      ]

      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        in: vi.fn().mockReturnThis(),
        is: vi.fn().mockResolvedValue({ data: teamMembersData, error: null }),
      }

      vi.mocked(supabase.from).mockReturnValue(mockQuery as any)

      const counts = await getTeamMemberCounts(['team-A', 'team-B', 'team-C'])

      expect(counts.get('team-A')).toBe(3)
      expect(counts.get('team-B')).toBe(2)
      expect(counts.get('team-C')).toBe(1)
    })
  })

  // ============================================================================
  // SOFT DELETE TESTS - Tests for left_at filtering and membership period
  // ============================================================================

  describe('Soft Delete: getTeamMemberCounts with left_at filter', () => {
    it('should only count active members (left_at IS NULL)', async () => {
      // Note: The actual query filters by left_at IS NULL
      // We mock the response to represent what the query returns after filtering
      const activeMembersData = [
        { team_id: 'team-123' }, // Active member
        { team_id: 'team-123' }, // Active member
        // Members with left_at are NOT returned by the query
      ]

      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        in: vi.fn().mockReturnThis(),
        is: vi.fn().mockResolvedValue({ data: activeMembersData, error: null }),
      }

      vi.mocked(supabase.from).mockReturnValue(mockQuery as any)

      const counts = await getTeamMemberCounts(['team-123'])

      // Verify the query was called with correct parameters
      expect(supabase.from).toHaveBeenCalledWith('team_members')
      expect(mockQuery.select).toHaveBeenCalledWith('team_id')
      expect(mockQuery.in).toHaveBeenCalledWith('team_id', ['team-123'])
      expect(mockQuery.is).toHaveBeenCalledWith('left_at', null)

      // Only 2 active members counted
      expect(counts.get('team-123')).toBe(2)
    })

    it('should return count = 1 fallback when all members have left', async () => {
      // All members have left_at set, so query returns empty
      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        in: vi.fn().mockReturnThis(),
        is: vi.fn().mockResolvedValue({ data: [], error: null }),
      }

      vi.mocked(supabase.from).mockReturnValue(mockQuery as any)

      const counts = await getTeamMemberCounts(['team-empty'])

      // Fallback to 1 to prevent division by zero
      expect(counts.get('team-empty')).toBe(1)
    })

    it('should count multiple teams with different active member counts', async () => {
      const activeMembersData = [
        { team_id: 'team-A' }, // Team A: 3 active
        { team_id: 'team-A' },
        { team_id: 'team-A' },
        { team_id: 'team-B' }, // Team B: 1 active
        // Team C: 0 active (all left)
      ]

      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        in: vi.fn().mockReturnThis(),
        is: vi.fn().mockResolvedValue({ data: activeMembersData, error: null }),
      }

      vi.mocked(supabase.from).mockReturnValue(mockQuery as any)

      const counts = await getTeamMemberCounts(['team-A', 'team-B', 'team-C'])

      expect(counts.get('team-A')).toBe(3)
      expect(counts.get('team-B')).toBe(1)
      expect(counts.get('team-C')).toBe(1) // Fallback for team with no active members
    })
  })

  describe('Soft Delete: calculateBookingRevenue with stored team_member_count', () => {
    it('should use stored team_member_count when available', () => {
      const booking = {
        total_price: 6000,
        staff_id: null,
        team_id: 'team-123',
        team_member_count: 3, // Stored count at booking time
      }

      // Current team member count is different (2 members now)
      const teamMemberCounts = new Map([['team-123', 2]])

      const revenue = calculateBookingRevenue(booking, teamMemberCounts)

      // Should use stored count (3), not current count (2)
      // 6000 / 3 = 2000
      expect(revenue).toBe(2000)
    })

    it('should fallback to current team count when team_member_count is null', () => {
      const booking = {
        total_price: 4000,
        staff_id: null,
        team_id: 'team-456',
        team_member_count: null, // No stored count (old booking)
      }

      const teamMemberCounts = new Map([['team-456', 2]])

      const revenue = calculateBookingRevenue(booking, teamMemberCounts)

      // Use current count (2) as fallback
      // 4000 / 2 = 2000
      expect(revenue).toBe(2000)
    })

    it('should handle historical booking with different member count', () => {
      // Scenario: Booking created when team had 4 members
      // Now team has 2 members (2 left)
      const booking = {
        total_price: 8000,
        staff_id: null,
        team_id: 'team-789',
        team_member_count: 4, // 4 members when booking was created
      }

      const teamMemberCounts = new Map([['team-789', 2]]) // Only 2 active now

      const revenue = calculateBookingRevenue(booking, teamMemberCounts)

      // Should use stored count (4) for fair historical distribution
      // 8000 / 4 = 2000
      expect(revenue).toBe(2000)
    })
  })

  describe('Soft Delete: getUniqueTeamIds with team_member_count filter', () => {
    it('should exclude bookings that already have team_member_count stored', () => {
      const bookings = [
        { team_id: 'team-123', staff_id: null, team_member_count: 3 }, // Has count - skip
        { team_id: 'team-456', staff_id: null, team_member_count: null }, // No count - include
        { team_id: 'team-789', staff_id: null }, // No count field - include
      ]

      const teamIds = getUniqueTeamIds(bookings)

      // Only team-456 and team-789 need member counts
      expect(teamIds).toContain('team-456')
      expect(teamIds).toContain('team-789')
      expect(teamIds).not.toContain('team-123')
      expect(teamIds).toHaveLength(2)
    })

    it('should return empty when all bookings have stored team_member_count', () => {
      const bookings = [
        { team_id: 'team-123', staff_id: null, team_member_count: 3 },
        { team_id: 'team-456', staff_id: null, team_member_count: 2 },
      ]

      const teamIds = getUniqueTeamIds(bookings)

      expect(teamIds).toEqual([])
    })
  })

  // ============================================================================
  // INTEGRATION TESTS
  // ============================================================================

  describe('Integration: Revenue Calculation Flow', () => {
    it('should calculate total revenue correctly for mixed bookings', async () => {
      // Scenario: 1 individual booking + 2 team bookings
      const bookings = [
        { id: '1', total_price: 2000, staff_id: 'staff-123', team_id: null }, // Individual
        { id: '2', total_price: 3000, staff_id: null, team_id: 'team-456' }, // Team (3 members)
        { id: '3', total_price: 4000, staff_id: null, team_id: 'team-789' }, // Team (2 members)
      ]

      // Step 1: Get unique team IDs
      const teamIds = getUniqueTeamIds(bookings)
      expect(teamIds).toEqual(['team-456', 'team-789'])

      // Step 2: Mock team member counts
      const teamMembersData = [
        { team_id: 'team-456' },
        { team_id: 'team-456' },
        { team_id: 'team-456' },
        { team_id: 'team-789' },
        { team_id: 'team-789' },
      ]

      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        in: vi.fn().mockReturnThis(),
        is: vi.fn().mockResolvedValue({ data: teamMembersData, error: null }),
      }

      vi.mocked(supabase.from).mockReturnValue(mockQuery as any)

      const teamMemberCounts = await getTeamMemberCounts(teamIds)

      // Step 3: Calculate revenue for each booking
      let totalRevenue = 0
      for (const booking of bookings) {
        totalRevenue += calculateBookingRevenue(booking, teamMemberCounts)
      }

      // Expected: 2000 + (3000/3) + (4000/2) = 2000 + 1000 + 2000 = 5000
      expect(totalRevenue).toBe(5000)
    })
  })
})
