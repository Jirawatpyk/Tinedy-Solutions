import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  isWithinMembershipPeriod,
  fetchStaffReviewStats,
  type MembershipPeriod,
  type Review
} from '../review-utils'
import { supabase } from '@/lib/supabase'

// Mock Supabase client
vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: vi.fn(),
  },
}))

describe('review-utils', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  const createMockMembershipPeriod = (overrides = {}): MembershipPeriod => ({
    teamId: 'team-1',
    joinedAt: '2025-01-01T00:00:00Z',
    leftAt: null,
    ...overrides,
  })

  const createMockReview = (overrides = {}): Partial<Review> => ({
    id: 'review-1',
    staff_id: null,
    team_id: 'team-1',
    booking_id: 'booking-1',
    customer_id: 'customer-1',
    rating: 5,
    comment: 'Great service!',
    created_at: '2025-01-15T00:00:00Z',
    updated_at: '2025-01-15T00:00:00Z',
    ...overrides,
  })

  // ============================================================================
  // isWithinMembershipPeriod
  // ============================================================================

  describe('isWithinMembershipPeriod', () => {
    it('should return true when review is within membership period (no leftAt)', () => {
      const reviewDate = new Date('2025-01-15T00:00:00Z')
      const periods: MembershipPeriod[] = [
        createMockMembershipPeriod({
          teamId: 'team-1',
          joinedAt: '2025-01-01T00:00:00Z',
          leftAt: null, // Still a member
        }),
      ]

      const result = isWithinMembershipPeriod(reviewDate, 'team-1', periods)

      expect(result).toBe(true)
    })

    it('should return true when review is within membership period (with leftAt)', () => {
      const reviewDate = new Date('2025-01-15T00:00:00Z')
      const periods: MembershipPeriod[] = [
        createMockMembershipPeriod({
          teamId: 'team-1',
          joinedAt: '2025-01-01T00:00:00Z',
          leftAt: '2025-01-31T00:00:00Z', // Left after review
        }),
      ]

      const result = isWithinMembershipPeriod(reviewDate, 'team-1', periods)

      expect(result).toBe(true)
    })

    it('should return false when review is before staff joined', () => {
      const reviewDate = new Date('2024-12-15T00:00:00Z') // Before joinedAt
      const periods: MembershipPeriod[] = [
        createMockMembershipPeriod({
          teamId: 'team-1',
          joinedAt: '2025-01-01T00:00:00Z',
          leftAt: null,
        }),
      ]

      const result = isWithinMembershipPeriod(reviewDate, 'team-1', periods)

      expect(result).toBe(false)
    })

    it('should return false when review is after staff left', () => {
      const reviewDate = new Date('2025-02-15T00:00:00Z') // After leftAt
      const periods: MembershipPeriod[] = [
        createMockMembershipPeriod({
          teamId: 'team-1',
          joinedAt: '2025-01-01T00:00:00Z',
          leftAt: '2025-01-31T00:00:00Z',
        }),
      ]

      const result = isWithinMembershipPeriod(reviewDate, 'team-1', periods)

      expect(result).toBe(false)
    })

    it('should return false when no membership periods for team', () => {
      const reviewDate = new Date('2025-01-15T00:00:00Z')
      const periods: MembershipPeriod[] = [
        createMockMembershipPeriod({
          teamId: 'team-2', // Different team
          joinedAt: '2025-01-01T00:00:00Z',
          leftAt: null,
        }),
      ]

      const result = isWithinMembershipPeriod(reviewDate, 'team-1', periods)

      expect(result).toBe(false)
    })

    it('should return false when membership periods array is empty', () => {
      const reviewDate = new Date('2025-01-15T00:00:00Z')
      const periods: MembershipPeriod[] = []

      const result = isWithinMembershipPeriod(reviewDate, 'team-1', periods)

      expect(result).toBe(false)
    })

    it('should handle multiple membership periods for same team', () => {
      const reviewDate = new Date('2025-06-15T00:00:00Z')
      const periods: MembershipPeriod[] = [
        // First period (left team)
        createMockMembershipPeriod({
          teamId: 'team-1',
          joinedAt: '2025-01-01T00:00:00Z',
          leftAt: '2025-03-31T00:00:00Z',
        }),
        // Second period (rejoined team)
        createMockMembershipPeriod({
          teamId: 'team-1',
          joinedAt: '2025-05-01T00:00:00Z',
          leftAt: null,
        }),
      ]

      const result = isWithinMembershipPeriod(reviewDate, 'team-1', periods)

      expect(result).toBe(true) // Within second period
    })

    it('should return false for date between two membership periods', () => {
      const reviewDate = new Date('2025-04-15T00:00:00Z') // Between periods
      const periods: MembershipPeriod[] = [
        // First period (left team)
        createMockMembershipPeriod({
          teamId: 'team-1',
          joinedAt: '2025-01-01T00:00:00Z',
          leftAt: '2025-03-31T00:00:00Z',
        }),
        // Second period (rejoined team)
        createMockMembershipPeriod({
          teamId: 'team-1',
          joinedAt: '2025-05-01T00:00:00Z',
          leftAt: null,
        }),
      ]

      const result = isWithinMembershipPeriod(reviewDate, 'team-1', periods)

      expect(result).toBe(false) // Not within any period
    })

    it('should handle exact boundary dates (joinedAt)', () => {
      const reviewDate = new Date('2025-01-01T00:00:00Z') // Exact same as joinedAt
      const periods: MembershipPeriod[] = [
        createMockMembershipPeriod({
          teamId: 'team-1',
          joinedAt: '2025-01-01T00:00:00Z',
          leftAt: null,
        }),
      ]

      const result = isWithinMembershipPeriod(reviewDate, 'team-1', periods)

      expect(result).toBe(true) // Should include exact joinedAt date
    })

    it('should handle exact boundary dates (leftAt)', () => {
      const reviewDate = new Date('2025-01-31T00:00:00Z') // Exact same as leftAt
      const periods: MembershipPeriod[] = [
        createMockMembershipPeriod({
          teamId: 'team-1',
          joinedAt: '2025-01-01T00:00:00Z',
          leftAt: '2025-01-31T00:00:00Z',
        }),
      ]

      const result = isWithinMembershipPeriod(reviewDate, 'team-1', periods)

      expect(result).toBe(true) // Should include exact leftAt date
    })
  })

  // ============================================================================
  // fetchStaffReviewStats
  // ============================================================================

  describe('fetchStaffReviewStats', () => {
    it('should fetch review stats for staff with direct reviews only', async () => {
      const mockReviews = [
        { ...createMockReview({ staff_id: 'staff-1', team_id: null, rating: 5 }) },
        { ...createMockReview({ staff_id: 'staff-1', team_id: null, rating: 4 }) },
        { ...createMockReview({ staff_id: 'staff-1', team_id: null, rating: 5 }) },
      ]

      const mockChain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({ data: mockReviews, error: null }),
      }

      vi.mocked(supabase.from).mockReturnValue(mockChain as any)

      const result = await fetchStaffReviewStats('staff-1', [])

      expect(supabase.from).toHaveBeenCalledWith('reviews')
      expect(mockChain.select).toHaveBeenCalledWith('rating, staff_id, team_id, created_at')
      expect(mockChain.eq).toHaveBeenCalledWith('staff_id', 'staff-1')
      expect(result).toEqual({
        averageRating: 4.7, // (5+4+5)/3 = 4.666... rounded to 4.7
        reviewCount: 3,
      })
    })

    it('should fetch review stats including team reviews', async () => {
      const membershipPeriods: MembershipPeriod[] = [
        {
          teamId: 'team-1',
          joinedAt: '2025-01-01T00:00:00Z',
          leftAt: null,
        },
      ]

      const mockReviews = [
        // Direct staff review
        { ...createMockReview({ staff_id: 'staff-1', team_id: null, rating: 5, created_at: '2025-01-15T00:00:00Z' }) },
        // Team review (within membership)
        { ...createMockReview({ staff_id: null, team_id: 'team-1', rating: 4, created_at: '2025-01-15T00:00:00Z' }) },
      ]

      const mockChain = {
        select: vi.fn().mockReturnThis(),
        or: vi.fn().mockResolvedValue({ data: mockReviews, error: null }),
      }

      vi.mocked(supabase.from).mockReturnValue(mockChain as any)

      const result = await fetchStaffReviewStats('staff-1', membershipPeriods)

      expect(mockChain.or).toHaveBeenCalledWith('staff_id.eq.staff-1,team_id.in.(team-1)')
      expect(result).toEqual({
        averageRating: 4.5, // (5+4)/2 = 4.5
        reviewCount: 2,
      })
    })

    it('should filter out team reviews outside membership period', async () => {
      const membershipPeriods: MembershipPeriod[] = [
        {
          teamId: 'team-1',
          joinedAt: '2025-01-01T00:00:00Z',
          leftAt: '2025-01-31T00:00:00Z',
        },
      ]

      const mockReviews = [
        // Direct staff review
        { ...createMockReview({ staff_id: 'staff-1', team_id: null, rating: 5, created_at: '2025-01-15T00:00:00Z' }) },
        // Team review (within membership)
        { ...createMockReview({ staff_id: null, team_id: 'team-1', rating: 4, created_at: '2025-01-15T00:00:00Z' }) },
        // Team review (outside membership - after leftAt)
        { ...createMockReview({ staff_id: null, team_id: 'team-1', rating: 2, created_at: '2025-02-15T00:00:00Z' }) },
      ]

      const mockChain = {
        select: vi.fn().mockReturnThis(),
        or: vi.fn().mockResolvedValue({ data: mockReviews, error: null }),
      }

      vi.mocked(supabase.from).mockReturnValue(mockChain as any)

      const result = await fetchStaffReviewStats('staff-1', membershipPeriods)

      expect(result).toEqual({
        averageRating: 4.5, // Only includes 5 and 4, not 2
        reviewCount: 2,
      })
    })

    it('should handle multiple teams in membership periods', async () => {
      const membershipPeriods: MembershipPeriod[] = [
        {
          teamId: 'team-1',
          joinedAt: '2025-01-01T00:00:00Z',
          leftAt: null,
        },
        {
          teamId: 'team-2',
          joinedAt: '2025-01-01T00:00:00Z',
          leftAt: null,
        },
      ]

      const mockReviews = [
        { ...createMockReview({ staff_id: 'staff-1', team_id: null, rating: 5, created_at: '2025-01-15T00:00:00Z' }) },
        { ...createMockReview({ staff_id: null, team_id: 'team-1', rating: 4, created_at: '2025-01-15T00:00:00Z' }) },
        { ...createMockReview({ staff_id: null, team_id: 'team-2', rating: 3, created_at: '2025-01-15T00:00:00Z' }) },
      ]

      const mockChain = {
        select: vi.fn().mockReturnThis(),
        or: vi.fn().mockResolvedValue({ data: mockReviews, error: null }),
      }

      vi.mocked(supabase.from).mockReturnValue(mockChain as any)

      const result = await fetchStaffReviewStats('staff-1', membershipPeriods)

      expect(mockChain.or).toHaveBeenCalledWith('staff_id.eq.staff-1,team_id.in.(team-1,team-2)')
      expect(result).toEqual({
        averageRating: 4, // (5+4+3)/3 = 4
        reviewCount: 3,
      })
    })

    it('should return default stats when no reviews found', async () => {
      const mockChain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({ data: [], error: null }),
      }

      vi.mocked(supabase.from).mockReturnValue(mockChain as any)

      const result = await fetchStaffReviewStats('staff-1', [])

      expect(result).toEqual({
        averageRating: 0,
        reviewCount: 0,
      })
    })

    it('should return default stats when data is null', async () => {
      const mockChain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({ data: null, error: null }),
      }

      vi.mocked(supabase.from).mockReturnValue(mockChain as any)

      const result = await fetchStaffReviewStats('staff-1', [])

      expect(result).toEqual({
        averageRating: 0,
        reviewCount: 0,
      })
    })

    it('should return default stats when all team reviews filtered out', async () => {
      const membershipPeriods: MembershipPeriod[] = [
        {
          teamId: 'team-1',
          joinedAt: '2025-01-01T00:00:00Z',
          leftAt: '2025-01-31T00:00:00Z',
        },
      ]

      const mockReviews = [
        // All team reviews outside membership period
        { ...createMockReview({ staff_id: null, team_id: 'team-1', rating: 5, created_at: '2024-12-15T00:00:00Z' }) }, // Before
        { ...createMockReview({ staff_id: null, team_id: 'team-1', rating: 4, created_at: '2025-02-15T00:00:00Z' }) }, // After
      ]

      const mockChain = {
        select: vi.fn().mockReturnThis(),
        or: vi.fn().mockResolvedValue({ data: mockReviews, error: null }),
      }

      vi.mocked(supabase.from).mockReturnValue(mockChain as any)

      const result = await fetchStaffReviewStats('staff-1', membershipPeriods)

      expect(result).toEqual({
        averageRating: 0,
        reviewCount: 0,
      })
    })

    it('should throw error when database query fails', async () => {
      const mockChain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({ data: null, error: { message: 'Database error' } }),
      }

      vi.mocked(supabase.from).mockReturnValue(mockChain as any)

      await expect(fetchStaffReviewStats('staff-1', [])).rejects.toEqual({
        message: 'Database error'
      })
    })

    it('should round average rating to 1 decimal place', async () => {
      const mockReviews = [
        { ...createMockReview({ staff_id: 'staff-1', rating: 5 }) },
        { ...createMockReview({ staff_id: 'staff-1', rating: 4 }) },
        { ...createMockReview({ staff_id: 'staff-1', rating: 4 }) },
      ]

      const mockChain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({ data: mockReviews, error: null }),
      }

      vi.mocked(supabase.from).mockReturnValue(mockChain as any)

      const result = await fetchStaffReviewStats('staff-1', [])

      // (5+4+4)/3 = 4.333... should round to 4.3
      expect(result.averageRating).toBe(4.3)
    })

    it('should handle reviews with null rating', async () => {
      const mockReviews = [
        { ...createMockReview({ staff_id: 'staff-1', rating: 5 }) },
        { ...createMockReview({ staff_id: 'staff-1', rating: null as any }) }, // Null rating
        { ...createMockReview({ staff_id: 'staff-1', rating: 4 }) },
      ]

      const mockChain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({ data: mockReviews, error: null }),
      }

      vi.mocked(supabase.from).mockReturnValue(mockChain as any)

      const result = await fetchStaffReviewStats('staff-1', [])

      // (5+0+4)/3 = 3.0
      expect(result.averageRating).toBe(3)
      expect(result.reviewCount).toBe(3)
    })

    it('should handle empty membership periods array (default parameter)', async () => {
      const mockReviews = [
        { ...createMockReview({ staff_id: 'staff-1', rating: 5 }) },
      ]

      const mockChain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({ data: mockReviews, error: null }),
      }

      vi.mocked(supabase.from).mockReturnValue(mockChain as any)

      const result = await fetchStaffReviewStats('staff-1') // No membershipPeriods provided

      expect(result).toEqual({
        averageRating: 5,
        reviewCount: 1,
      })
    })

    it('should deduplicate team IDs from membership periods', async () => {
      const membershipPeriods: MembershipPeriod[] = [
        {
          teamId: 'team-1',
          joinedAt: '2025-01-01T00:00:00Z',
          leftAt: '2025-01-31T00:00:00Z',
        },
        {
          teamId: 'team-1', // Duplicate team ID (rejoined)
          joinedAt: '2025-02-01T00:00:00Z',
          leftAt: null,
        },
        {
          teamId: 'team-2',
          joinedAt: '2025-01-01T00:00:00Z',
          leftAt: null,
        },
      ]

      const mockReviews = [
        { ...createMockReview({ staff_id: 'staff-1', rating: 5 }) },
      ]

      const mockChain = {
        select: vi.fn().mockReturnThis(),
        or: vi.fn().mockResolvedValue({ data: mockReviews, error: null }),
      }

      vi.mocked(supabase.from).mockReturnValue(mockChain as any)

      await fetchStaffReviewStats('staff-1', membershipPeriods)

      // Should deduplicate team-1
      expect(mockChain.or).toHaveBeenCalledWith('staff_id.eq.staff-1,team_id.in.(team-1,team-2)')
    })
  })
})
