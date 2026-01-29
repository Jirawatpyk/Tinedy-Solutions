/**
 * Tests for useBookingReview and useBookingTeamMembers hooks
 *
 * Extracted data-fetching hooks for BookingDetailsModal.
 */

import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import React, { type ReactNode } from 'react'
import { useBookingReview, useBookingTeamMembers } from '../use-booking-details'

// Mock supabase
vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: vi.fn(),
    rpc: vi.fn(),
  },
}))

import { supabase } from '@/lib/supabase'

// Helper to create chainable query mock
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function createQueryMock(finalResult: any) {
  return {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn().mockResolvedValue(finalResult),
  }
}

describe('useBookingReview', () => {
  let queryClient: QueryClient

  beforeEach(() => {
    vi.clearAllMocks()
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
      },
    })
  })

  const wrapper = ({ children }: { children: ReactNode }) => {
    return React.createElement(QueryClientProvider, { client: queryClient }, children)
  }

  it('should return null review when disabled', () => {
    const { result } = renderHook(
      () => useBookingReview('booking-1', false),
      { wrapper }
    )

    expect(result.current.review).toBeNull()
    expect(supabase.from).not.toHaveBeenCalled()
  })

  it('should return null review when bookingId is undefined', () => {
    const { result } = renderHook(
      () => useBookingReview(undefined, true),
      { wrapper }
    )

    expect(result.current.review).toBeNull()
  })

  it('should fetch review data when enabled with bookingId', async () => {
    const mockReview = {
      id: 'review-1',
      booking_id: 'booking-1',
      rating: 4,
      created_at: '2025-01-20T00:00:00Z',
    }

    const query = createQueryMock({ data: mockReview, error: null })
    vi.mocked(supabase.from).mockReturnValue(query as never)

    const { result } = renderHook(
      () => useBookingReview('booking-1', true),
      { wrapper }
    )

    await waitFor(() => {
      expect(result.current.review).toEqual(mockReview)
    })

    expect(supabase.from).toHaveBeenCalledWith('reviews')
    expect(query.eq).toHaveBeenCalledWith('booking_id', 'booking-1')
  })

  it('should return null on error', async () => {
    const query = createQueryMock({ data: null, error: new Error('Not found') })
    vi.mocked(supabase.from).mockReturnValue(query as never)

    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    const { result } = renderHook(
      () => useBookingReview('booking-1', true),
      { wrapper }
    )

    await waitFor(() => {
      expect(result.current.isLoadingReview).toBe(false)
    })

    expect(result.current.review).toBeNull()
    consoleSpy.mockRestore()
  })
})

describe('useBookingTeamMembers', () => {
  let queryClient: QueryClient

  beforeEach(() => {
    vi.clearAllMocks()
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
      },
    })
  })

  const wrapper = ({ children }: { children: ReactNode }) => {
    return React.createElement(QueryClientProvider, { client: queryClient }, children)
  }

  it('should return empty array when disabled', () => {
    const { result } = renderHook(
      () => useBookingTeamMembers('team-1', '2025-01-20T00:00:00Z', false),
      { wrapper }
    )

    expect(result.current.teamMembers).toEqual([])
    expect(supabase.rpc).not.toHaveBeenCalled()
  })

  it('should return empty array when teamId is undefined', () => {
    const { result } = renderHook(
      () => useBookingTeamMembers(undefined, '2025-01-20T00:00:00Z', true),
      { wrapper }
    )

    expect(result.current.teamMembers).toEqual([])
  })

  it('should fetch and filter team members active at booking time', async () => {
    const mockRpcData = [
      {
        id: 'tm-1',
        is_active: true,
        staff_id: 'staff-1',
        full_name: 'Alice',
        joined_at: '2025-01-01T00:00:00Z',
        left_at: null,
      },
      {
        id: 'tm-2',
        is_active: false,
        staff_id: 'staff-2',
        full_name: 'Bob',
        joined_at: '2025-01-01T00:00:00Z',
        left_at: '2025-01-10T00:00:00Z', // Left before booking
      },
      {
        id: 'tm-3',
        is_active: true,
        staff_id: 'staff-3',
        full_name: 'Charlie',
        joined_at: '2025-02-01T00:00:00Z', // Joined after booking
        left_at: null,
      },
    ]

    vi.mocked(supabase.rpc).mockResolvedValue({
      data: mockRpcData,
      error: null,
    } as never)

    const { result } = renderHook(
      () => useBookingTeamMembers('team-1', '2025-01-20T00:00:00Z', true),
      { wrapper }
    )

    await waitFor(() => {
      expect(result.current.teamMembers).toHaveLength(1)
    })

    // Only Alice should be included (active at booking time)
    expect(result.current.teamMembers[0].full_name).toBe('Alice')
    expect(supabase.rpc).toHaveBeenCalledWith('get_all_team_members_with_dates', { p_team_id: 'team-1' })
  })

  it('should return empty array on RPC error', async () => {
    vi.mocked(supabase.rpc).mockResolvedValue({
      data: null,
      error: new Error('RPC failed'),
    } as never)

    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    const { result } = renderHook(
      () => useBookingTeamMembers('team-1', '2025-01-20T00:00:00Z', true),
      { wrapper }
    )

    await waitFor(() => {
      expect(result.current.isLoadingTeamMembers).toBe(false)
    })

    expect(result.current.teamMembers).toEqual([])
    consoleSpy.mockRestore()
  })
})
