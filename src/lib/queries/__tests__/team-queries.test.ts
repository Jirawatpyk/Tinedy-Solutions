import { describe, it, expect, beforeEach, vi } from 'vitest'
import { fetchTeamsWithDetails, fetchTeamsList, fetchTeamDetail } from '../team-queries'
import { supabase } from '@/lib/supabase'

// Mock Supabase client
vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: vi.fn(),
  },
}))

describe('team-queries', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  const createMockTeam = (overrides = {}) => ({
    id: 'team-1',
    name: 'Team Alpha',
    description: 'Sales team',
    created_at: '2025-01-01T00:00:00Z',
    deleted_at: null,
    team_lead_id: 'lead-1',
    team_lead: {
      id: 'lead-1',
      full_name: 'John Leader',
      email: 'lead@example.com',
      phone: '0812345678',
      avatar_url: null,
      role: 'staff',
    },
    team_members: [
      {
        id: 'member-1',
        is_active: true,
        left_at: null,
        profiles: {
          id: 'staff-1',
          full_name: 'Staff One',
          email: 'staff1@example.com',
          phone: '0811111111',
          avatar_url: null,
          role: 'staff',
        },
      },
    ],
    ...overrides,
  })

  describe('fetchTeamsWithDetails', () => {
    it('should fetch teams with full details excluding archived', async () => {
      const mockTeams = [createMockTeam()]

      // Mock main teams query
      const mockTeamsChain = {
        select: vi.fn().mockReturnThis(),
        is: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: mockTeams, error: null }),
      }

      // Mock bookings count query
      const mockBookingsChain = {
        select: vi.fn().mockReturnThis(),
        in: vi.fn().mockReturnThis(),
        is: vi.fn().mockResolvedValue({
          data: [{ team_id: 'team-1' }, { team_id: 'team-1' }],
          error: null,
        }),
      }

      // Mock reviews query
      const mockReviewsChain = {
        select: vi.fn().mockReturnThis(),
        in: vi.fn().mockResolvedValue({
          data: [
            { rating: 4, bookings: { team_id: 'team-1' } },
            { rating: 5, bookings: { team_id: 'team-1' } },
          ],
          error: null,
        }),
      }

      vi.mocked(supabase.from)
        .mockReturnValueOnce(mockTeamsChain as any)
        .mockReturnValueOnce(mockBookingsChain as any)
        .mockReturnValueOnce(mockReviewsChain as any)

      const result = await fetchTeamsWithDetails(false)

      expect(supabase.from).toHaveBeenCalledWith('teams')
      expect(mockTeamsChain.is).toHaveBeenCalledWith('deleted_at', null)
      expect(result).toHaveLength(1)
      expect(result[0].booking_count).toBe(2)
      expect(result[0].average_rating).toBe(4.5)
      expect(result[0].member_count).toBe(1)
    })

    it('should fetch teams including archived when showArchived=true', async () => {
      const mockTeams = [
        createMockTeam(),
        createMockTeam({ id: 'team-2', deleted_at: '2025-01-15' }),
      ]

      const mockTeamsChain = {
        select: vi.fn().mockReturnThis(),
        is: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: mockTeams, error: null }),
      }

      const mockBookingsChain = {
        select: vi.fn().mockReturnThis(),
        in: vi.fn().mockReturnThis(),
        is: vi.fn().mockResolvedValue({ data: [], error: null }),
      }

      const mockReviewsChain = {
        select: vi.fn().mockReturnThis(),
        in: vi.fn().mockResolvedValue({ data: [], error: null }),
      }

      vi.mocked(supabase.from)
        .mockReturnValueOnce(mockTeamsChain as any)
        .mockReturnValueOnce(mockBookingsChain as any)
        .mockReturnValueOnce(mockReviewsChain as any)

      const result = await fetchTeamsWithDetails(true)

      expect(mockTeamsChain.is).not.toHaveBeenCalled()
      expect(result).toHaveLength(2)
    })

    it('should transform team_lead from array to object', async () => {
      const mockTeams = [
        createMockTeam({
          team_lead: [
            {
              id: 'lead-1',
              full_name: 'John Leader',
              email: 'lead@example.com',
              phone: '0812345678',
              avatar_url: null,
              role: 'staff',
            },
          ],
        }),
      ]

      const mockTeamsChain = {
        select: vi.fn().mockReturnThis(),
        is: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: mockTeams, error: null }),
      }

      const mockBookingsChain = {
        select: vi.fn().mockReturnThis(),
        in: vi.fn().mockReturnThis(),
        is: vi.fn().mockResolvedValue({ data: [], error: null }),
      }

      const mockReviewsChain = {
        select: vi.fn().mockReturnThis(),
        in: vi.fn().mockResolvedValue({ data: [], error: null }),
      }

      vi.mocked(supabase.from)
        .mockReturnValueOnce(mockTeamsChain as any)
        .mockReturnValueOnce(mockBookingsChain as any)
        .mockReturnValueOnce(mockReviewsChain as any)

      const result = await fetchTeamsWithDetails()

      expect(result[0].team_lead).toEqual({
        id: 'lead-1',
        full_name: 'John Leader',
        email: 'lead@example.com',
        phone: '0812345678',
        avatar_url: null,
        role: 'staff',
      })
    })

    it('should transform member profiles from array to object', async () => {
      const mockTeams = [
        createMockTeam({
          team_members: [
            {
              id: 'member-1',
              is_active: true,
              left_at: null,
              profiles: [
                {
                  id: 'staff-1',
                  full_name: 'Staff One',
                  email: 'staff1@example.com',
                  phone: '0811111111',
                  avatar_url: null,
                  role: 'staff',
                },
              ],
            },
          ],
        }),
      ]

      const mockTeamsChain = {
        select: vi.fn().mockReturnThis(),
        is: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: mockTeams, error: null }),
      }

      const mockBookingsChain = {
        select: vi.fn().mockReturnThis(),
        in: vi.fn().mockReturnThis(),
        is: vi.fn().mockResolvedValue({ data: [], error: null }),
      }

      const mockReviewsChain = {
        select: vi.fn().mockReturnThis(),
        in: vi.fn().mockResolvedValue({ data: [], error: null }),
      }

      vi.mocked(supabase.from)
        .mockReturnValueOnce(mockTeamsChain as any)
        .mockReturnValueOnce(mockBookingsChain as any)
        .mockReturnValueOnce(mockReviewsChain as any)

      const result = await fetchTeamsWithDetails()

      expect(result[0].members?.[0]).toEqual({
        id: 'staff-1',
        full_name: 'Staff One',
        email: 'staff1@example.com',
        phone: '0811111111',
        avatar_url: null,
        role: 'staff',
        is_active: true,
        membership_id: 'member-1',
      })
    })

    it('should filter out members with left_at (soft deleted)', async () => {
      const mockTeams = [
        createMockTeam({
          team_members: [
            {
              id: 'member-1',
              is_active: true,
              left_at: null,
              profiles: {
                id: 'staff-1',
                full_name: 'Active Staff',
                email: 'active@example.com',
                phone: '0811111111',
                avatar_url: null,
                role: 'staff',
              },
            },
            {
              id: 'member-2',
              is_active: false,
              left_at: '2025-01-10T00:00:00Z',
              profiles: {
                id: 'staff-2',
                full_name: 'Left Staff',
                email: 'left@example.com',
                phone: '0822222222',
                avatar_url: null,
                role: 'staff',
              },
            },
          ],
        }),
      ]

      const mockTeamsChain = {
        select: vi.fn().mockReturnThis(),
        is: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: mockTeams, error: null }),
      }

      const mockBookingsChain = {
        select: vi.fn().mockReturnThis(),
        in: vi.fn().mockReturnThis(),
        is: vi.fn().mockResolvedValue({ data: [], error: null }),
      }

      const mockReviewsChain = {
        select: vi.fn().mockReturnThis(),
        in: vi.fn().mockResolvedValue({ data: [], error: null }),
      }

      vi.mocked(supabase.from)
        .mockReturnValueOnce(mockTeamsChain as any)
        .mockReturnValueOnce(mockBookingsChain as any)
        .mockReturnValueOnce(mockReviewsChain as any)

      const result = await fetchTeamsWithDetails()

      expect(result[0].member_count).toBe(1)
      expect(result[0].members).toHaveLength(1)
      expect(result[0].members?.[0]?.full_name).toBe('Active Staff')
    })

    it('should calculate booking count correctly', async () => {
      const mockTeams = [createMockTeam()]

      const mockTeamsChain = {
        select: vi.fn().mockReturnThis(),
        is: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: mockTeams, error: null }),
      }

      const mockBookingsChain = {
        select: vi.fn().mockReturnThis(),
        in: vi.fn().mockReturnThis(),
        is: vi.fn().mockResolvedValue({
          data: [
            { team_id: 'team-1' },
            { team_id: 'team-1' },
            { team_id: 'team-1' },
          ],
          error: null,
        }),
      }

      const mockReviewsChain = {
        select: vi.fn().mockReturnThis(),
        in: vi.fn().mockResolvedValue({ data: [], error: null }),
      }

      vi.mocked(supabase.from)
        .mockReturnValueOnce(mockTeamsChain as any)
        .mockReturnValueOnce(mockBookingsChain as any)
        .mockReturnValueOnce(mockReviewsChain as any)

      const result = await fetchTeamsWithDetails()

      expect(result[0].booking_count).toBe(3)
    })

    it('should calculate average rating correctly', async () => {
      const mockTeams = [createMockTeam()]

      const mockTeamsChain = {
        select: vi.fn().mockReturnThis(),
        is: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: mockTeams, error: null }),
      }

      const mockBookingsChain = {
        select: vi.fn().mockReturnThis(),
        in: vi.fn().mockReturnThis(),
        is: vi.fn().mockResolvedValue({ data: [], error: null }),
      }

      const mockReviewsChain = {
        select: vi.fn().mockReturnThis(),
        in: vi.fn().mockResolvedValue({
          data: [
            { rating: 3, bookings: { team_id: 'team-1' } },
            { rating: 4, bookings: { team_id: 'team-1' } },
            { rating: 5, bookings: { team_id: 'team-1' } },
          ],
          error: null,
        }),
      }

      vi.mocked(supabase.from)
        .mockReturnValueOnce(mockTeamsChain as any)
        .mockReturnValueOnce(mockBookingsChain as any)
        .mockReturnValueOnce(mockReviewsChain as any)

      const result = await fetchTeamsWithDetails()

      expect(result[0].average_rating).toBe(4)
    })

    it('should handle review bookings as array', async () => {
      const mockTeams = [createMockTeam()]

      const mockTeamsChain = {
        select: vi.fn().mockReturnThis(),
        is: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: mockTeams, error: null }),
      }

      const mockBookingsChain = {
        select: vi.fn().mockReturnThis(),
        in: vi.fn().mockReturnThis(),
        is: vi.fn().mockResolvedValue({ data: [], error: null }),
      }

      const mockReviewsChain = {
        select: vi.fn().mockReturnThis(),
        in: vi.fn().mockResolvedValue({
          data: [{ rating: 5, bookings: [{ team_id: 'team-1' }] }],
          error: null,
        }),
      }

      vi.mocked(supabase.from)
        .mockReturnValueOnce(mockTeamsChain as any)
        .mockReturnValueOnce(mockBookingsChain as any)
        .mockReturnValueOnce(mockReviewsChain as any)

      const result = await fetchTeamsWithDetails()

      expect(result[0].average_rating).toBe(5)
    })

    it('should handle empty teams list', async () => {
      const mockTeamsChain = {
        select: vi.fn().mockReturnThis(),
        is: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: [], error: null }),
      }

      vi.mocked(supabase.from).mockReturnValueOnce(mockTeamsChain as any)

      const result = await fetchTeamsWithDetails()

      expect(result).toEqual([])
    })

    it('should handle null teams data', async () => {
      const mockTeamsChain = {
        select: vi.fn().mockReturnThis(),
        is: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: null, error: null }),
      }

      vi.mocked(supabase.from).mockReturnValueOnce(mockTeamsChain as any)

      const result = await fetchTeamsWithDetails()

      expect(result).toEqual([])
    })

    it('should throw error when teams query fails', async () => {
      const mockTeamsChain = {
        select: vi.fn().mockReturnThis(),
        is: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: null, error: { message: 'Database error' } }),
      }

      vi.mocked(supabase.from).mockReturnValueOnce(mockTeamsChain as any)

      await expect(fetchTeamsWithDetails()).rejects.toThrow('Failed to fetch teams: Database error')
    })
  })

  describe('fetchTeamsList', () => {
    it('should fetch simple teams list', async () => {
      const mockTeams = [
        { id: 'team-1', name: 'Team Alpha' },
        { id: 'team-2', name: 'Team Beta' },
      ]

      const mockChain = {
        select: vi.fn().mockReturnThis(),
        is: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: mockTeams, error: null }),
      }

      vi.mocked(supabase.from).mockReturnValue(mockChain as any)

      const result = await fetchTeamsList()

      expect(supabase.from).toHaveBeenCalledWith('teams')
      expect(mockChain.select).toHaveBeenCalledWith('id, name')
      expect(mockChain.is).toHaveBeenCalledWith('deleted_at', null)
      expect(mockChain.order).toHaveBeenCalledWith('name')
      expect(result).toHaveLength(2)
    })

    it('should handle empty list', async () => {
      const mockChain = {
        select: vi.fn().mockReturnThis(),
        is: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: [], error: null }),
      }

      vi.mocked(supabase.from).mockReturnValue(mockChain as any)

      const result = await fetchTeamsList()

      expect(result).toEqual([])
    })

    it('should throw error when query fails', async () => {
      const mockChain = {
        select: vi.fn().mockReturnThis(),
        is: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: null, error: { message: 'Database error' } }),
      }

      vi.mocked(supabase.from).mockReturnValue(mockChain as any)

      await expect(fetchTeamsList()).rejects.toThrow('Failed to fetch teams list: Database error')
    })
  })

  describe('fetchTeamDetail', () => {
    it('should fetch single team with full details', async () => {
      const mockTeam = createMockTeam()

      const mockTeamChain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: mockTeam, error: null }),
      }

      const mockReviewsChain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({
          data: [{ rating: 4 }, { rating: 5 }],
          error: null,
        }),
      }

      vi.mocked(supabase.from)
        .mockReturnValueOnce(mockTeamChain as any)
        .mockReturnValueOnce(mockReviewsChain as any)

      const result = await fetchTeamDetail('team-1')

      expect(mockTeamChain.eq).toHaveBeenCalledWith('id', 'team-1')
      expect(mockTeamChain.single).toHaveBeenCalled()
      expect(result.id).toBe('team-1')
      expect(result.average_rating).toBe(4.5)
    })

    it('should handle team without ratings', async () => {
      const mockTeam = createMockTeam()

      const mockTeamChain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: mockTeam, error: null }),
      }

      const mockReviewsChain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({ data: [], error: null }),
      }

      vi.mocked(supabase.from)
        .mockReturnValueOnce(mockTeamChain as any)
        .mockReturnValueOnce(mockReviewsChain as any)

      const result = await fetchTeamDetail('team-1')

      expect(result.average_rating).toBeUndefined()
    })

    it('should throw error when team not found', async () => {
      const mockTeamChain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: null, error: { message: 'Not found' } }),
      }

      vi.mocked(supabase.from).mockReturnValueOnce(mockTeamChain as any)

      await expect(fetchTeamDetail('invalid-id')).rejects.toThrow('Failed to fetch team detail: Not found')
    })
  })
})
