/**
 * Integration Tests for use-staff-performance hook
 *
 * Critical Tests Only:
 * 1. Revenue Calculation - ทดสอบการคำนวณ revenue รวมถึง team booking division
 * 2. Team Booking Filter Logic - ทดสอบการกรอง bookings (direct + team bookings)
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { useStaffPerformance } from '../use-staff-performance'
import { createMockBooking, createMockStaff } from '@/test/factories'
import { supabase } from '@/lib/supabase'

// Mock Supabase
vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: vi.fn(),
    channel: vi.fn(),
    removeChannel: vi.fn(),
  },
}))

// Mock toast
vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({
    toast: vi.fn(),
  }),
}))

describe('useStaffPerformance - Critical Integration Tests', () => {
  const mockStaffId = 'staff-123'
  const mockTeamId = 'team-456'

  beforeEach(() => {
    vi.clearAllMocks()
  })

  // Helper function สำหรับ setup mock queries
  const setupMockQueries = (mockBookings: ReturnType<typeof createMockBooking>[], teamIds: string[] = [], teamMemberCounts: { team_id: string; count: number }[] = []) => {
    // Mock staff query
    const mockStaffQuery = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: createMockStaff({ id: mockStaffId }),
        error: null,
      }),
    }

    // Mock team_members query for fetchBookings
    const mockTeamMembersQuery1 = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockResolvedValue({
        data: teamIds.map((id) => ({ team_id: id })),
        error: null,
      }),
    }

    // Mock bookings query - ต้อง chain: select().order().or() หรือ select().order().eq()
    const mockBookingsQuery = {
      select: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      or: vi.fn().mockResolvedValue({ data: mockBookings, error: null }),
      eq: vi.fn().mockResolvedValue({ data: mockBookings, error: null }),
    }

    // Mock team_members query for realtime subscription
    const mockTeamMembersQuery2 = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockResolvedValue({
        data: teamIds.map((id) => ({ team_id: id })),
        error: null,
      }),
    }

    // Mock team_members count query for stats calculation (if needed)
    const mockTeamMembersCountQuery = teamMemberCounts.length > 0 ? {
      select: vi.fn().mockReturnThis(),
      in: vi.fn().mockResolvedValue({
        data: teamMemberCounts,
        error: null,
      }),
    } : null

    // Setup supabase.from mock
    const fromMock = vi.mocked(supabase.from)
      .mockReturnValueOnce(mockStaffQuery as any) // fetchStaffData
      .mockReturnValueOnce(mockTeamMembersQuery1 as any) // fetchBookings - team_members
      .mockReturnValueOnce(mockBookingsQuery as any) // fetchBookings - bookings
      .mockReturnValueOnce(mockTeamMembersQuery2 as any) // realtime subscription - team_members

    if (mockTeamMembersCountQuery) {
      fromMock.mockReturnValueOnce(mockTeamMembersCountQuery as any) // calculateStats - team_members count
    }

    // Mock realtime subscription
    const mockChannel = {
      on: vi.fn().mockReturnThis(),
      subscribe: vi.fn(),
    }
    vi.mocked(supabase.channel).mockReturnValue(mockChannel as any)
  }

  describe('Revenue Calculation (Critical)', () => {
    it('should calculate revenue correctly for individual staff bookings', async () => {
      // Arrange: สร้าง bookings ที่ staff เป็นคนรับโดยตรง
      const mockBookings = [
        createMockBooking({
          id: '1',
          staff_id: mockStaffId,
          team_id: null,
          total_price: 1000,
          payment_status: 'paid',
          status: 'completed',
        }),
        createMockBooking({
          id: '2',
          staff_id: mockStaffId,
          team_id: null,
          total_price: 2000,
          payment_status: 'paid',
          status: 'completed',
        }),
        createMockBooking({
          id: '3',
          staff_id: mockStaffId,
          team_id: null,
          total_price: 1500,
          payment_status: 'unpaid', // ไม่นับ
          status: 'completed',
        }),
      ]

      setupMockQueries(mockBookings, [], [])

      // Act
      const { result } = renderHook(() => useStaffPerformance(mockStaffId))

      // Assert
      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      // Revenue ควรเป็น 3000 (1000 + 2000) - ไม่นับ unpaid
      expect(result.current.stats.totalRevenue).toBe(3000)
    })

    it('should divide team booking revenue by team member count', async () => {
      // Arrange: Team booking ที่มี 3 คนในทีม
      const mockBookings = [
        createMockBooking({
          id: '1',
          staff_id: null, // Team booking - ไม่มี staff_id
          team_id: mockTeamId,
          total_price: 3000,
          payment_status: 'paid',
          status: 'completed',
        }),
      ]

      // Team member counts (3 members in team-456)
      const teamMemberCounts = [
        { team_id: mockTeamId, count: 3 },
      ]

      setupMockQueries(mockBookings, [mockTeamId], teamMemberCounts)

      // Act
      const { result } = renderHook(() => useStaffPerformance(mockStaffId))

      // Assert
      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      // Revenue ควรเป็น 1000 (3000 / 3 คน)
      expect(result.current.stats.totalRevenue).toBe(1000)
    })

    it('should handle mixed individual and team bookings correctly', async () => {
      // Arrange: รวม individual + team bookings
      const mockBookings = [
        // Individual booking
        createMockBooking({
          id: '1',
          staff_id: mockStaffId,
          team_id: null,
          total_price: 2000,
          payment_status: 'paid',
          status: 'completed',
        }),
        // Team booking (2 members)
        createMockBooking({
          id: '2',
          staff_id: null,
          team_id: mockTeamId,
          total_price: 4000,
          payment_status: 'paid',
          status: 'completed',
        }),
      ]

      const teamMemberCounts = [
        { team_id: mockTeamId, count: 2 },
      ]

      setupMockQueries(mockBookings, [mockTeamId], teamMemberCounts)

      // Act
      const { result } = renderHook(() => useStaffPerformance(mockStaffId))

      // Assert
      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      // Revenue ควรเป็น 4000 (2000 + 4000/2)
      expect(result.current.stats.totalRevenue).toBe(4000)
    })

    it('should only count paid bookings in revenue calculation', async () => {
      // Arrange: Bookings with different payment statuses
      const mockBookings = [
        createMockBooking({
          id: '1',
          staff_id: mockStaffId,
          total_price: 1000,
          payment_status: 'paid',
          status: 'completed',
        }),
        createMockBooking({
          id: '2',
          staff_id: mockStaffId,
          total_price: 2000,
          payment_status: 'unpaid',
          status: 'completed',
        }),
        createMockBooking({
          id: '3',
          staff_id: mockStaffId,
          total_price: 1500,
          payment_status: 'refunded',
          status: 'completed',
        }),
      ]

      setupMockQueries(mockBookings, [], [])

      // Act
      const { result } = renderHook(() => useStaffPerformance(mockStaffId))

      // Assert
      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      // เฉพาะ paid เท่านั้น = 1000
      expect(result.current.stats.totalRevenue).toBe(1000)
    })
  })

  describe('Team Booking Filter Logic (Critical)', () => {
    it('should fetch direct bookings for individual staff', async () => {
      // Arrange: Staff ไม่มีทีม
      const mockBookings = [
        createMockBooking({
          id: '1',
          staff_id: mockStaffId,
          team_id: null,
        }),
      ]

      setupMockQueries(mockBookings, [], [])

      // Act
      const { result } = renderHook(() => useStaffPerformance(mockStaffId))

      // Assert
      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      // ควรได้ bookings
      expect(result.current.bookings).toHaveLength(1)
    })

    it('should fetch both direct and team bookings for team member', async () => {
      // Arrange: Staff อยู่ใน team
      const mockBookings = [
        // Direct booking
        createMockBooking({
          id: '1',
          staff_id: mockStaffId,
          team_id: null,
        }),
        // Team booking (staff_id is null)
        createMockBooking({
          id: '2',
          staff_id: null,
          team_id: mockTeamId,
        }),
      ]

      setupMockQueries(mockBookings, [mockTeamId], [])

      // Act
      const { result } = renderHook(() => useStaffPerformance(mockStaffId))

      // Assert
      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      // ควรได้ทั้ง 2 bookings
      expect(result.current.bookings).toHaveLength(2)
    })

    it('should NOT include team bookings that have staff_id assigned', async () => {
      // Arrange: Team booking ที่มี staff_id (ไม่ควรนับซ้ำ)
      const mockBookings: any[] = [] // Empty - ไม่ควรได้ booking

      setupMockQueries(mockBookings, [mockTeamId], [])

      // Act
      const { result } = renderHook(() => useStaffPerformance(mockStaffId))

      // Assert
      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      // ไม่ควรได้ bookings ที่มี staff_id assigned
      expect(result.current.bookings).toHaveLength(0)
    })

    it('should handle staff in multiple teams', async () => {
      // Arrange: Staff อยู่ใน 2 teams
      const mockTeamId1 = 'team-456'
      const mockTeamId2 = 'team-789'

      const mockBookings = [
        createMockBooking({ id: '1', staff_id: mockStaffId, team_id: null }),
        createMockBooking({ id: '2', staff_id: null, team_id: mockTeamId1 }),
        createMockBooking({ id: '3', staff_id: null, team_id: mockTeamId2 }),
      ]

      setupMockQueries(mockBookings, [mockTeamId1, mockTeamId2], [])

      // Act
      const { result } = renderHook(() => useStaffPerformance(mockStaffId))

      // Assert
      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      // ควรได้ทั้ง 3 bookings
      expect(result.current.bookings).toHaveLength(3)
    })
  })
})
