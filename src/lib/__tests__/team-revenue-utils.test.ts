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
        in: vi.fn().mockResolvedValue({ data: teamMembersData, error: null }),
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
        in: vi.fn().mockResolvedValue({ data: [], error: null }),
      }

      vi.mocked(supabase.from).mockReturnValue(mockQuery as any)

      const counts = await getTeamMemberCounts(['team-empty'])

      // Fallback: team ที่ไม่มี members จะได้ count = 1
      expect(counts.get('team-empty')).toBe(1)
    })

    it('should handle database errors gracefully', async () => {
      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        in: vi.fn().mockResolvedValue({ data: null, error: { message: 'DB Error' } }),
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
        in: vi.fn().mockResolvedValue({ data: teamMembersData, error: null }),
      }

      vi.mocked(supabase.from).mockReturnValue(mockQuery as any)

      const counts = await getTeamMemberCounts(['team-A', 'team-B', 'team-C'])

      expect(counts.get('team-A')).toBe(3)
      expect(counts.get('team-B')).toBe(2)
      expect(counts.get('team-C')).toBe(1)
    })
  })

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
        in: vi.fn().mockResolvedValue({ data: teamMembersData, error: null }),
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
