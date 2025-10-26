/**
 * Tests for useNotifications hook
 *
 * Complex hook testing covering:
 * - Permission management
 * - Team loading
 * - Real-time subscriptions
 * - Scheduled reminders
 *
 * Note: Real-time and interval testing is simplified due to complexity
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'

// Mock dependencies BEFORE imports
vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: vi.fn(),
    channel: vi.fn(),
    removeChannel: vi.fn(),
  },
}))

vi.mock('@/contexts/auth-context', () => ({
  useAuth: vi.fn(),
}))

vi.mock('@/lib/notifications', () => ({
  notificationService: {
    isGranted: vi.fn(),
    isSupported: vi.fn(),
    requestPermission: vi.fn(),
    notifyNewBooking: vi.fn(),
    notifyBookingCancelled: vi.fn(),
    notifyBookingReminder: vi.fn(),
    show: vi.fn(),
  },
}))

import { useNotifications } from '../use-notifications'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/auth-context'
import { notificationService } from '@/lib/notifications'

// Mock user
const mockUser = {
  id: 'user-1',
  email: 'staff@example.com',
}

// Helper to create chainable query mock
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function createQueryMock(finalResult: any) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const query: any = {
    select: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    neq: vi.fn().mockReturnThis(),
    in: vi.fn().mockReturnThis(),
    or: vi.fn().mockReturnThis(),
    gte: vi.fn().mockReturnThis(),
    lte: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue(finalResult),
  }

  // Make all methods chainable
  Object.keys(query).forEach((key) => {
    if (key !== 'single') {
      query[key].mockReturnValue(query)
    }
  })

  return query
}

describe('useNotifications', () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let mockChannel: any

  beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers()

    // Default auth state
    vi.mocked(useAuth).mockReturnValue({
      user: mockUser as never,
      profile: null,
      signIn: vi.fn(),
      signOut: vi.fn(),
      signUp: vi.fn(),
      loading: false,
    })

    // Default notification service mocks
    vi.mocked(notificationService.isGranted).mockReturnValue(false)
    vi.mocked(notificationService.isSupported).mockReturnValue(true)
    vi.mocked(notificationService.requestPermission).mockResolvedValue(true)

    // Default channel mock
    mockChannel = {
      on: vi.fn().mockReturnThis(),
      subscribe: vi.fn().mockReturnThis(),
    }
    vi.mocked(supabase.channel).mockReturnValue(mockChannel)

    // Default query mock
    const defaultQuery = createQueryMock({ data: [], error: null })
    vi.mocked(supabase.from).mockReturnValue(defaultQuery as never)
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  describe('Initial state', () => {
    it('should initialize with default state', () => {
      const { result } = renderHook(() => useNotifications())

      expect(result.current.hasPermission).toBe(false)
      expect(result.current.isRequesting).toBe(false)
      expect(result.current.isSupported).toBe(true)
    })

    it('should check permission on mount', () => {
      renderHook(() => useNotifications())

      expect(notificationService.isGranted).toHaveBeenCalled()
    })

    it('should set hasPermission if already granted', () => {
      vi.mocked(notificationService.isGranted).mockReturnValue(true)

      const { result } = renderHook(() => useNotifications())

      expect(result.current.hasPermission).toBe(true)
    })
  })

  describe('requestPermission', () => {
    it('should request permission from user', async () => {
      const { result } = renderHook(() => useNotifications())

      let granted = false
      await act(async () => {
        granted = await result.current.requestPermission()
      })

      expect(notificationService.requestPermission).toHaveBeenCalled()
      expect(granted).toBe(true)

      await waitFor(() => {
        expect(result.current.hasPermission).toBe(true)
      })
    })

    it('should set isRequesting during request', async () => {
      vi.mocked(notificationService.requestPermission).mockImplementation(
        () => new Promise((resolve) => setTimeout(() => resolve(true), 100))
      )

      const { result } = renderHook(() => useNotifications())

      const requestPromise = act(async () => {
        await result.current.requestPermission()
      })

      // Should be requesting
      await waitFor(() => {
        expect(result.current.isRequesting).toBe(true)
      })

      await vi.advanceTimersByTimeAsync(100)
      await requestPromise

      // Should be done
      await waitFor(() => {
        expect(result.current.isRequesting).toBe(false)
      })
    })

    it('should handle permission denial', async () => {
      vi.mocked(notificationService.requestPermission).mockResolvedValue(false)

      const { result } = renderHook(() => useNotifications())

      let granted = true
      await act(async () => {
        granted = await result.current.requestPermission()
      })

      expect(granted).toBe(false)

      await waitFor(() => {
        expect(result.current.hasPermission).toBe(false)
      })
    })
  })

  describe('Team loading', () => {
    it('should load user teams on mount', async () => {
      const memberTeams = [{ team_id: 'team-1' }, { team_id: 'team-2' }]
      const leadTeams = [{ id: 'team-3' }]

      let callCount = 0
      vi.mocked(supabase.from).mockImplementation(((_table: string) => {
        callCount++
        if (callCount === 1) {
          // First call: team_members
          const query = createQueryMock({ data: memberTeams, error: null })
          return query
        } else {
          // Second call: teams
          const query = createQueryMock({ data: leadTeams, error: null })
          return query
        }
      }) as never)

      renderHook(() => useNotifications())

      await vi.runAllTimersAsync()

      // Should query both tables
      expect(supabase.from).toHaveBeenCalledWith('team_members')
      expect(supabase.from).toHaveBeenCalledWith('teams')
    })

    it('should handle team loading error gracefully', async () => {
      const errorQuery = createQueryMock({ data: null, error: new Error('Load failed') })
      vi.mocked(supabase.from).mockReturnValue(errorQuery as never)

      // Should not crash
      expect(() => renderHook(() => useNotifications())).not.toThrow()
    })

    it('should not load teams if user is not authenticated', () => {
      vi.mocked(useAuth).mockReturnValue({
        user: null,
        profile: null,
        signIn: vi.fn(),
        signOut: vi.fn(),
        signUp: vi.fn(),
        loading: false,
      })

      renderHook(() => useNotifications())

      // Should not query teams
      expect(supabase.from).not.toHaveBeenCalledWith('team_members')
      expect(supabase.from).not.toHaveBeenCalledWith('teams')
    })
  })

  describe('Real-time subscription', () => {
    it('should setup channel when user and permission are granted', () => {
      vi.mocked(notificationService.isGranted).mockReturnValue(true)

      renderHook(() => useNotifications())

      expect(supabase.channel).toHaveBeenCalledWith('staff-notifications')
      expect(mockChannel.on).toHaveBeenCalled()
      expect(mockChannel.subscribe).toHaveBeenCalled()
    })

    it('should not setup channel if no permission', () => {
      vi.mocked(notificationService.isGranted).mockReturnValue(false)

      renderHook(() => useNotifications())

      expect(supabase.channel).not.toHaveBeenCalled()
    })

    it('should not setup channel if user is not authenticated', () => {
      vi.mocked(useAuth).mockReturnValue({
        user: null,
        profile: null,
        signIn: vi.fn(),
        signOut: vi.fn(),
        signUp: vi.fn(),
        loading: false,
      })
      vi.mocked(notificationService.isGranted).mockReturnValue(true)

      renderHook(() => useNotifications())

      expect(supabase.channel).not.toHaveBeenCalled()
    })

    it('should cleanup channel on unmount', () => {
      vi.mocked(notificationService.isGranted).mockReturnValue(true)

      const { unmount } = renderHook(() => useNotifications())

      unmount()

      expect(supabase.removeChannel).toHaveBeenCalledWith(mockChannel)
    })
  })

  describe('Reminder scheduling', () => {
    it('should setup reminder interval when user and permission are granted', () => {
      vi.mocked(notificationService.isGranted).mockReturnValue(true)

      renderHook(() => useNotifications())

      // Should have set up interval (checked via timer count)
      const timers = vi.getTimerCount()
      expect(timers).toBeGreaterThan(0)
    })

    it('should not setup reminders if no permission', () => {
      vi.mocked(notificationService.isGranted).mockReturnValue(false)

      renderHook(() => useNotifications())

      // Should not query bookings
      expect(supabase.from).not.toHaveBeenCalledWith('bookings')
    })

    it('should cleanup interval on unmount', () => {
      vi.mocked(notificationService.isGranted).mockReturnValue(true)

      const { unmount } = renderHook(() => useNotifications())

      const timersBefore = vi.getTimerCount()

      unmount()

      const timersAfter = vi.getTimerCount()

      // Timer count should decrease after unmount
      expect(timersAfter).toBeLessThan(timersBefore)
    })
  })

  describe('isSupported', () => {
    it('should return true if notifications are supported', () => {
      vi.mocked(notificationService.isSupported).mockReturnValue(true)

      const { result } = renderHook(() => useNotifications())

      expect(result.current.isSupported).toBe(true)
    })

    it('should return false if notifications are not supported', () => {
      vi.mocked(notificationService.isSupported).mockReturnValue(false)

      const { result } = renderHook(() => useNotifications())

      expect(result.current.isSupported).toBe(false)
    })
  })

  describe('Permission state management', () => {
    it('should update hasPermission after successful request', async () => {
      vi.mocked(notificationService.isGranted).mockReturnValue(false)
      vi.mocked(notificationService.requestPermission).mockResolvedValue(true)

      const { result } = renderHook(() => useNotifications())

      expect(result.current.hasPermission).toBe(false)

      await act(async () => {
        await result.current.requestPermission()
      })

      await waitFor(() => {
        expect(result.current.hasPermission).toBe(true)
      })
    })

    it('should not change hasPermission after failed request', async () => {
      vi.mocked(notificationService.isGranted).mockReturnValue(false)
      vi.mocked(notificationService.requestPermission).mockResolvedValue(false)

      const { result } = renderHook(() => useNotifications())

      expect(result.current.hasPermission).toBe(false)

      await act(async () => {
        await result.current.requestPermission()
      })

      await waitFor(() => {
        expect(result.current.hasPermission).toBe(false)
      })
    })
  })
})
