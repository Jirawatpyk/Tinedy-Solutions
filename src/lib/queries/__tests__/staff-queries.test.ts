import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  fetchStaffList,
  fetchStaffDetail,
  fetchStaffWithRatings,
  staffQueryOptions,
} from '../staff-queries'
import { supabase } from '@/lib/supabase'

// Mock Supabase client
vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: vi.fn(),
  },
}))

// Mock review-utils
vi.mock('@/lib/review-utils', () => ({
  isWithinMembershipPeriod: vi.fn((_date, teamId, periods) => {
    // Simple mock: return true if periods exist for this team
    return periods.some((p: any) => p.teamId === teamId)
  }),
}))

describe('staff-queries', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  const createMockStaff = (overrides = {}) => ({
    id: 'staff-1',
    email: 'staff@example.com',
    full_name: 'John Staff',
    avatar_url: null,
    role: 'staff',
    phone: '0812345678',
    staff_number: 'STF001',
    skills: ['cleaning', 'maintenance'],
    created_at: '2025-01-01T00:00:00Z',
    updated_at: '2025-01-01T00:00:00Z',
    ...overrides,
  })

  describe('fetchStaffList', () => {
    it('should fetch all staff when role=all', async () => {
      const mockStaff = [
        createMockStaff(),
        createMockStaff({ id: 'staff-2', role: 'manager', full_name: 'Jane Manager' }),
        createMockStaff({ id: 'staff-3', role: 'admin', full_name: 'Admin User' }),
      ]

      const mockChain = {
        select: vi.fn().mockReturnThis(),
        in: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: mockStaff, error: null }),
      }

      vi.mocked(supabase.from).mockReturnValue(mockChain as any)

      const result = await fetchStaffList('all')

      expect(supabase.from).toHaveBeenCalledWith('profiles')
      expect(mockChain.select).toHaveBeenCalledWith('id, full_name, email, role, avatar_url')
      expect(mockChain.in).toHaveBeenCalledWith('role', ['admin', 'manager', 'staff'])
      expect(mockChain.order).toHaveBeenCalledWith('full_name', { ascending: true })
      expect(result).toHaveLength(3)
    })

    it('should fetch only staff when role=staff', async () => {
      const mockStaff = [createMockStaff()]

      const mockChain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: mockStaff, error: null }),
      }

      vi.mocked(supabase.from).mockReturnValue(mockChain as any)

      const result = await fetchStaffList('staff')

      expect(mockChain.eq).toHaveBeenCalledWith('role', 'staff')
      expect(result).toHaveLength(1)
    })

    it('should handle empty staff list', async () => {
      const mockChain = {
        select: vi.fn().mockReturnThis(),
        in: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: [], error: null }),
      }

      vi.mocked(supabase.from).mockReturnValue(mockChain as any)

      const result = await fetchStaffList()

      expect(result).toEqual([])
    })

    it('should handle null data', async () => {
      const mockChain = {
        select: vi.fn().mockReturnThis(),
        in: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: null, error: null }),
      }

      vi.mocked(supabase.from).mockReturnValue(mockChain as any)

      const result = await fetchStaffList()

      expect(result).toEqual([])
    })

    it('should throw error when query fails', async () => {
      const mockChain = {
        select: vi.fn().mockReturnThis(),
        in: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: null, error: { message: 'Database error' } }),
      }

      vi.mocked(supabase.from).mockReturnValue(mockChain as any)

      await expect(fetchStaffList()).rejects.toThrow('Failed to fetch staff list: Database error')
    })
  })

  describe('fetchStaffDetail', () => {
    it('should fetch single staff with rating', async () => {
      const mockStaff = createMockStaff()

      // Mock staff profile query
      const mockStaffChain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: mockStaff, error: null }),
      }

      // Mock team memberships query
      const mockMembershipsChain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({
          data: [{ team_id: 'team-1', joined_at: '2024-01-01', left_at: null }],
          error: null,
        }),
      }

      // Mock direct reviews query
      const mockDirectReviewsChain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({
          data: [{ rating: 4 }, { rating: 5 }],
          error: null,
        }),
      }

      // Mock team reviews query
      const mockTeamReviewsChain = {
        select: vi.fn().mockReturnThis(),
        in: vi.fn().mockResolvedValue({
          data: [{ rating: 3, team_id: 'team-1', created_at: '2024-06-01' }],
          error: null,
        }),
      }

      vi.mocked(supabase.from)
        .mockReturnValueOnce(mockStaffChain as any)
        .mockReturnValueOnce(mockMembershipsChain as any)
        .mockReturnValueOnce(mockDirectReviewsChain as any)
        .mockReturnValueOnce(mockTeamReviewsChain as any)

      const result = await fetchStaffDetail('staff-1')

      expect(mockStaffChain.eq).toHaveBeenCalledWith('id', 'staff-1')
      expect(mockStaffChain.single).toHaveBeenCalled()
      expect(result.id).toBe('staff-1')
      expect(result.average_rating).toBeDefined()
      expect(result.average_rating).toBeGreaterThan(0)
    })

    it('should return staff without rating when no reviews', async () => {
      const mockStaff = createMockStaff()

      const mockStaffChain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: mockStaff, error: null }),
      }

      const mockMembershipsChain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({ data: [], error: null }),
      }

      const mockDirectReviewsChain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({ data: [], error: null }),
      }

      vi.mocked(supabase.from)
        .mockReturnValueOnce(mockStaffChain as any)
        .mockReturnValueOnce(mockMembershipsChain as any)
        .mockReturnValueOnce(mockDirectReviewsChain as any)

      const result = await fetchStaffDetail('staff-1')

      expect(result.id).toBe('staff-1')
      expect(result.average_rating).toBeUndefined()
    })

    it('should handle membership query error gracefully', async () => {
      const mockStaff = createMockStaff()

      const mockStaffChain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: mockStaff, error: null }),
      }

      const mockMembershipsChain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({ data: null, error: { message: 'Membership error' } }),
      }

      const mockDirectReviewsChain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({ data: [{ rating: 4 }], error: null }),
      }

      vi.mocked(supabase.from)
        .mockReturnValueOnce(mockStaffChain as any)
        .mockReturnValueOnce(mockMembershipsChain as any)
        .mockReturnValueOnce(mockDirectReviewsChain as any)

      const result = await fetchStaffDetail('staff-1')

      // Should still return staff with direct reviews only
      expect(result.id).toBe('staff-1')
      expect(result.average_rating).toBe(4)
    })

    it('should round average rating to 1 decimal place', async () => {
      const mockStaff = createMockStaff()

      const mockStaffChain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: mockStaff, error: null }),
      }

      const mockMembershipsChain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({ data: [], error: null }),
      }

      const mockDirectReviewsChain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({
          data: [{ rating: 4 }, { rating: 4 }, { rating: 5 }],
          error: null,
        }),
      }

      vi.mocked(supabase.from)
        .mockReturnValueOnce(mockStaffChain as any)
        .mockReturnValueOnce(mockMembershipsChain as any)
        .mockReturnValueOnce(mockDirectReviewsChain as any)

      const result = await fetchStaffDetail('staff-1')

      // (4 + 4 + 5) / 3 = 4.333... → 4.3
      expect(result.average_rating).toBe(4.3)
    })

    it('should throw error when staff not found', async () => {
      const mockStaffChain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: null, error: { message: 'Not found' } }),
      }

      vi.mocked(supabase.from).mockReturnValueOnce(mockStaffChain as any)

      await expect(fetchStaffDetail('invalid-id')).rejects.toThrow('Failed to fetch staff detail: Not found')
    })

    it('should handle staff with team membership', async () => {
      const mockStaff = createMockStaff()

      const mockStaffChain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: mockStaff, error: null }),
      }

      const mockMembershipsChain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({
          data: [
            { team_id: 'team-1', joined_at: '2024-01-01', left_at: null },
            { team_id: 'team-2', joined_at: '2023-06-01', left_at: '2023-12-31' },
          ],
          error: null,
        }),
      }

      const mockDirectReviewsChain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({ data: [], error: null }),
      }

      const mockTeamReviewsChain = {
        select: vi.fn().mockReturnThis(),
        in: vi.fn().mockResolvedValue({
          data: [
            { rating: 5, team_id: 'team-1', created_at: '2024-05-01' },
            { rating: 4, team_id: 'team-2', created_at: '2023-09-01' },
          ],
          error: null,
        }),
      }

      vi.mocked(supabase.from)
        .mockReturnValueOnce(mockStaffChain as any)
        .mockReturnValueOnce(mockMembershipsChain as any)
        .mockReturnValueOnce(mockDirectReviewsChain as any)
        .mockReturnValueOnce(mockTeamReviewsChain as any)

      const result = await fetchStaffDetail('staff-1')

      // Should include team reviews
      expect(mockTeamReviewsChain.in).toHaveBeenCalledWith('team_id', ['team-1', 'team-2'])
      expect(result.average_rating).toBeDefined()
    })
  })

  describe('fetchStaffWithRatings', () => {
    it('should fetch all staff with ratings, booking counts, and team counts', async () => {
      const mockStaffData = [
        createMockStaff({ id: 'staff-1', full_name: 'John Staff', role: 'staff' }),
        createMockStaff({ id: 'staff-2', full_name: 'Jane Manager', role: 'manager' }),
      ]

      // Mock profiles query
      const mockProfilesChain = {
        select: vi.fn().mockReturnThis(),
        in: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: mockStaffData, error: null }),
      }

      // Mock team memberships query
      const mockTeamMembershipsChain = {
        select: vi.fn().mockReturnThis(),
        in: vi.fn().mockResolvedValue({
          data: [
            { staff_id: 'staff-1', team_id: 'team-1', joined_at: '2024-01-01', left_at: null },
          ],
          error: null,
        }),
      }

      // Mock direct reviews query
      const mockDirectReviewsChain = {
        select: vi.fn().mockReturnThis(),
        in: vi.fn().mockResolvedValue({
          data: [
            { staff_id: 'staff-1', rating: 4 },
            { staff_id: 'staff-1', rating: 5 },
            { staff_id: 'staff-2', rating: 3 },
          ],
          error: null,
        }),
      }

      // Mock bookings query
      const mockBookingsChain = {
        select: vi.fn().mockReturnThis(),
        in: vi.fn().mockReturnThis(),
        is: vi.fn().mockResolvedValue({
          data: [
            { staff_id: 'staff-1' },
            { staff_id: 'staff-1' },
            { staff_id: 'staff-2' },
          ],
          error: null,
        }),
      }

      // Mock active team members query
      const mockActiveTeamMembersChain = {
        select: vi.fn().mockReturnThis(),
        in: vi.fn().mockReturnThis(),
        is: vi.fn().mockResolvedValue({
          data: [{ staff_id: 'staff-1' }],
          error: null,
        }),
      }

      // Mock team reviews query
      const mockTeamReviewsChain = {
        select: vi.fn().mockReturnThis(),
        in: vi.fn().mockResolvedValue({
          data: [{ rating: 5, team_id: 'team-1', created_at: '2024-06-01' }],
          error: null,
        }),
      }

      vi.mocked(supabase.from)
        .mockReturnValueOnce(mockProfilesChain as any)
        .mockReturnValueOnce(mockTeamMembershipsChain as any)
        .mockReturnValueOnce(mockDirectReviewsChain as any)
        .mockReturnValueOnce(mockBookingsChain as any)
        .mockReturnValueOnce(mockActiveTeamMembersChain as any)
        .mockReturnValueOnce(mockTeamReviewsChain as any)

      const result = await fetchStaffWithRatings()

      expect(result).toHaveLength(2)

      // Staff 1: 2 bookings, 1 team, ratings: [4, 5, 5] = 4.7
      const staff1 = result.find((s) => s.id === 'staff-1')
      expect(staff1?.booking_count).toBe(2)
      expect(staff1?.team_count).toBe(1)
      expect(staff1?.average_rating).toBeGreaterThan(4)

      // Staff 2: 1 booking, 0 teams, rating: 3
      const staff2 = result.find((s) => s.id === 'staff-2')
      expect(staff2?.booking_count).toBe(1)
      expect(staff2?.team_count).toBe(0)
      expect(staff2?.average_rating).toBe(3)
    })

    it('should return empty array when no staff', async () => {
      const mockProfilesChain = {
        select: vi.fn().mockReturnThis(),
        in: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: [], error: null }),
      }

      vi.mocked(supabase.from).mockReturnValueOnce(mockProfilesChain as any)

      const result = await fetchStaffWithRatings()

      expect(result).toEqual([])
    })

    it('should handle staff without ratings', async () => {
      const mockStaffData = [createMockStaff({ id: 'staff-1' })]

      const mockProfilesChain = {
        select: vi.fn().mockReturnThis(),
        in: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: mockStaffData, error: null }),
      }

      const mockTeamMembershipsChain = {
        select: vi.fn().mockReturnThis(),
        in: vi.fn().mockResolvedValue({ data: [], error: null }),
      }

      const mockDirectReviewsChain = {
        select: vi.fn().mockReturnThis(),
        in: vi.fn().mockResolvedValue({ data: [], error: null }),
      }

      const mockBookingsChain = {
        select: vi.fn().mockReturnThis(),
        in: vi.fn().mockReturnThis(),
        is: vi.fn().mockResolvedValue({ data: [], error: null }),
      }

      const mockActiveTeamMembersChain = {
        select: vi.fn().mockReturnThis(),
        in: vi.fn().mockReturnThis(),
        is: vi.fn().mockResolvedValue({ data: [], error: null }),
      }

      vi.mocked(supabase.from)
        .mockReturnValueOnce(mockProfilesChain as any)
        .mockReturnValueOnce(mockTeamMembershipsChain as any)
        .mockReturnValueOnce(mockDirectReviewsChain as any)
        .mockReturnValueOnce(mockBookingsChain as any)
        .mockReturnValueOnce(mockActiveTeamMembersChain as any)

      const result = await fetchStaffWithRatings()

      expect(result).toHaveLength(1)
      expect(result[0].average_rating).toBeUndefined()
      expect(result[0].booking_count).toBe(0)
      expect(result[0].team_count).toBe(0)
    })

    it('should handle query errors gracefully (non-blocking)', async () => {
      const mockStaffData = [createMockStaff({ id: 'staff-1' })]

      const mockProfilesChain = {
        select: vi.fn().mockReturnThis(),
        in: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: mockStaffData, error: null }),
      }

      const mockTeamMembershipsChain = {
        select: vi.fn().mockReturnThis(),
        in: vi.fn().mockResolvedValue({ data: null, error: { message: 'Team membership error' } }),
      }

      const mockDirectReviewsChain = {
        select: vi.fn().mockReturnThis(),
        in: vi.fn().mockResolvedValue({ data: null, error: { message: 'Reviews error' } }),
      }

      const mockBookingsChain = {
        select: vi.fn().mockReturnThis(),
        in: vi.fn().mockReturnThis(),
        is: vi.fn().mockResolvedValue({ data: null, error: { message: 'Bookings error' } }),
      }

      const mockActiveTeamMembersChain = {
        select: vi.fn().mockReturnThis(),
        in: vi.fn().mockReturnThis(),
        is: vi.fn().mockResolvedValue({ data: null, error: { message: 'Team members error' } }),
      }

      vi.mocked(supabase.from)
        .mockReturnValueOnce(mockProfilesChain as any)
        .mockReturnValueOnce(mockTeamMembershipsChain as any)
        .mockReturnValueOnce(mockDirectReviewsChain as any)
        .mockReturnValueOnce(mockBookingsChain as any)
        .mockReturnValueOnce(mockActiveTeamMembersChain as any)

      const result = await fetchStaffWithRatings()

      // Should still return staff with default counts
      expect(result).toHaveLength(1)
      expect(result[0].booking_count).toBe(0)
      expect(result[0].team_count).toBe(0)
    })

    it('should throw error when profiles query fails', async () => {
      const mockProfilesChain = {
        select: vi.fn().mockReturnThis(),
        in: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: null, error: { message: 'DB error' } }),
      }

      vi.mocked(supabase.from).mockReturnValueOnce(mockProfilesChain as any)

      await expect(fetchStaffWithRatings()).rejects.toThrow('Failed to fetch staff')
    })

    it('should filter invalid ratings and calculate average correctly', async () => {
      const mockStaffData = [createMockStaff({ id: 'staff-1' })]

      const mockProfilesChain = {
        select: vi.fn().mockReturnThis(),
        in: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: mockStaffData, error: null }),
      }

      const mockTeamMembershipsChain = {
        select: vi.fn().mockReturnThis(),
        in: vi.fn().mockResolvedValue({ data: [], error: null }),
      }

      const mockDirectReviewsChain = {
        select: vi.fn().mockReturnThis(),
        in: vi.fn().mockResolvedValue({
          data: [
            { staff_id: 'staff-1', rating: 4 },
            { staff_id: 'staff-1', rating: null }, // Invalid
            { staff_id: 'staff-1', rating: 0 }, // Invalid (out of range)
            { staff_id: 'staff-1', rating: 6 }, // Invalid (out of range)
            { staff_id: 'staff-1', rating: 5 },
          ],
          error: null,
        }),
      }

      const mockBookingsChain = {
        select: vi.fn().mockReturnThis(),
        in: vi.fn().mockReturnThis(),
        is: vi.fn().mockResolvedValue({ data: [], error: null }),
      }

      const mockActiveTeamMembersChain = {
        select: vi.fn().mockReturnThis(),
        in: vi.fn().mockReturnThis(),
        is: vi.fn().mockResolvedValue({ data: [], error: null }),
      }

      vi.mocked(supabase.from)
        .mockReturnValueOnce(mockProfilesChain as any)
        .mockReturnValueOnce(mockTeamMembershipsChain as any)
        .mockReturnValueOnce(mockDirectReviewsChain as any)
        .mockReturnValueOnce(mockBookingsChain as any)
        .mockReturnValueOnce(mockActiveTeamMembersChain as any)

      const result = await fetchStaffWithRatings()

      // Should only count valid ratings: 4, 5 → average 4.5
      expect(result[0].average_rating).toBe(4.5)
    })
  })

  describe('staffQueryOptions', () => {
    it('should have withRatings query options', () => {
      const options = staffQueryOptions.withRatings()

      expect(options.queryKey).toBeDefined()
      expect(options.queryFn).toBeDefined()
      expect(options.staleTime).toBe(3 * 60 * 1000)
    })

    it('should have listSimple query options', () => {
      const optionsAll = staffQueryOptions.listSimple('all')
      const optionsStaff = staffQueryOptions.listSimple('staff')

      expect(optionsAll.queryKey).toBeDefined()
      expect(optionsAll.queryFn).toBeDefined()
      expect(optionsAll.staleTime).toBe(5 * 60 * 1000)

      expect(optionsStaff.queryKey).toBeDefined()
      expect(optionsStaff.queryFn).toBeDefined()
    })

    it('should have detail query options', () => {
      const options = staffQueryOptions.detail('staff-123')

      expect(options.queryKey).toBeDefined()
      expect(options.queryFn).toBeDefined()
      expect(options.staleTime).toBe(3 * 60 * 1000)
    })
  })
})
