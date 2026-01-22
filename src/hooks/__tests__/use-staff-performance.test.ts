/**
 * Unit Tests for use-staff-performance hook
 *
 * Tests initialization and basic hook behavior
 * Complex async testing is simplified to avoid flaky tests
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, cleanup } from '@testing-library/react'
import { useStaffPerformance } from '../use-staff-performance'
import { supabase } from '@/lib/supabase'

// Mock Supabase
vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: vi.fn(),
    channel: vi.fn(() => ({
      on: vi.fn().mockReturnThis(),
      subscribe: vi.fn(),
    })),
    removeChannel: vi.fn().mockResolvedValue({ error: null }),
  },
}))

// Mock toast
vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({
    toast: vi.fn(),
  }),
}))

// Mock team-revenue-utils
vi.mock('@/lib/team-revenue-utils', () => ({
  getTeamMemberCounts: vi.fn().mockResolvedValue(new Map()),
  calculateBookingRevenue: vi.fn((booking: { total_price: number; team_id: string | null; staff_id: string | null }, teamMemberCounts: Map<string, number>) => {
    if (booking.team_id && !booking.staff_id) {
      const memberCount = teamMemberCounts.get(booking.team_id) || 1
      return booking.total_price / memberCount
    }
    return booking.total_price
  }),
  getUniqueTeamIds: vi.fn().mockReturnValue([]),
}))

const mockStaffId = 'staff-123'

describe('useStaffPerformance', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    // Setup default channel mock
    vi.mocked(supabase.channel).mockReturnValue({
      on: vi.fn().mockReturnThis(),
      subscribe: vi.fn(),
    } as any)

    // Default mock implementation
    vi.mocked(supabase.from).mockImplementation(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn(() => Promise.resolve({ data: null, error: null })),
        })),
        is: vi.fn(() => ({
          order: vi.fn(() => ({
            or: vi.fn(() => Promise.resolve({ data: [], error: null })),
            eq: vi.fn(() => Promise.resolve({ data: [], error: null })),
          })),
        })),
      })),
    }) as any)
  })

  afterEach(() => {
    cleanup()
  })

  describe('Hook Initialization', () => {
    it('should initialize with default values', () => {
      const { result } = renderHook(() => useStaffPerformance(mockStaffId))

      expect(result.current.loading).toBe(true)
      expect(result.current.bookings).toEqual([])
      expect(result.current.staff).toBeNull()
      expect(result.current.error).toBeNull()
      expect(result.current.stats).toEqual({
        totalBookings: 0,
        completedBookings: 0,
        pendingBookings: 0,
        cancelledRate: 0,
        totalRevenue: 0,
        averageRating: 0,
        reviewCount: 0,
      })
    })

    it('should have a refresh function', () => {
      const { result } = renderHook(() => useStaffPerformance(mockStaffId))
      expect(typeof result.current.refresh).toBe('function')
    })

    it('should call supabase.from when staffId is provided', () => {
      renderHook(() => useStaffPerformance(mockStaffId))

      // Should call from for profiles query
      expect(supabase.from).toHaveBeenCalledWith('profiles')
    })

    it('should set up realtime subscription (async)', async () => {
      renderHook(() => useStaffPerformance(mockStaffId))

      // Wait a tick for async subscription setup
      await new Promise(resolve => setTimeout(resolve, 0))

      expect(supabase.channel).toHaveBeenCalled()
    })
  })

  describe('Without StaffId', () => {
    it('should not call supabase.from when staffId is undefined', () => {
      renderHook(() => useStaffPerformance(undefined))

      // Should not make database queries without staffId
      expect(supabase.from).not.toHaveBeenCalled()
    })

    it('should not set up realtime subscription without staffId', () => {
      vi.mocked(supabase.channel).mockClear()
      renderHook(() => useStaffPerformance(undefined))

      // Should not create channel without staffId
      expect(supabase.channel).not.toHaveBeenCalled()
    })
  })

  describe('Return Values', () => {
    it('should return expected shape', () => {
      const { result } = renderHook(() => useStaffPerformance(mockStaffId))

      expect(result.current).toHaveProperty('staff')
      expect(result.current).toHaveProperty('bookings')
      expect(result.current).toHaveProperty('stats')
      expect(result.current).toHaveProperty('monthlyData')
      expect(result.current).toHaveProperty('loading')
      expect(result.current).toHaveProperty('error')
      expect(result.current).toHaveProperty('refresh')
    })

    it('should have stats with correct properties', () => {
      const { result } = renderHook(() => useStaffPerformance(mockStaffId))

      const stats = result.current.stats
      expect(stats).toHaveProperty('totalBookings')
      expect(stats).toHaveProperty('completedBookings')
      expect(stats).toHaveProperty('pendingBookings')
      expect(stats).toHaveProperty('cancelledRate')
      expect(stats).toHaveProperty('totalRevenue')
      expect(stats).toHaveProperty('averageRating')
      expect(stats).toHaveProperty('reviewCount')
    })
  })
})
