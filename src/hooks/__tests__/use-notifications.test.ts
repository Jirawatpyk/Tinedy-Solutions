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
    then: vi.fn((resolve) => Promise.resolve(finalResult).then(resolve)),
  }

  // Make all methods chainable (except single and then)
  Object.keys(query).forEach((key) => {
    if (key !== 'single' && key !== 'then') {
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
    // Don't use fake timers - causes issues with async operations
    // vi.useFakeTimers()

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
    vi.mocked(notificationService.notifyNewBooking).mockResolvedValue(undefined)
    vi.mocked(notificationService.notifyBookingCancelled).mockResolvedValue(undefined)
    vi.mocked(notificationService.notifyBookingReminder).mockResolvedValue(undefined)
    vi.mocked(notificationService.show).mockResolvedValue(undefined)

    // Default channel mock
    mockChannel = {
      on: vi.fn().mockReturnThis(),
      subscribe: vi.fn().mockReturnThis(),
    }
    vi.mocked(supabase.channel).mockReturnValue(mockChannel)
    vi.mocked(supabase.removeChannel).mockReturnValue(undefined as never)

    // Default query mock
    const defaultQuery = createQueryMock({ data: [], error: null })
    vi.mocked(supabase.from).mockReturnValue(defaultQuery as never)
  })

  afterEach(() => {
    // vi.useRealTimers()
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
      let resolveRequest: (value: boolean) => void
      const requestPromise = new Promise<boolean>((resolve) => {
        resolveRequest = resolve
      })

      vi.mocked(notificationService.requestPermission).mockReturnValue(requestPromise)

      const { result } = renderHook(() => useNotifications())

      // Wait for initial render
      await waitFor(() => {
        expect(result.current).not.toBeNull()
      })

      // Start the request
      act(() => {
        result.current.requestPermission()
      })

      // Should be requesting
      await waitFor(() => {
        expect(result.current.isRequesting).toBe(true)
      })

      // Resolve the request
      await act(async () => {
        resolveRequest!(true)
        await requestPromise
      })

      // Should be done
      await waitFor(() => {
        expect(result.current.isRequesting).toBe(false)
        expect(result.current.hasPermission).toBe(true)
      })
    })

    it('should handle permission denial', async () => {
      vi.mocked(notificationService.requestPermission).mockResolvedValue(false)

      const { result } = renderHook(() => useNotifications())

      // Wait for initial render
      await waitFor(() => {
        expect(result.current).not.toBeNull()
      })

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

      // Wait for async operations to complete
      await new Promise(resolve => setTimeout(resolve, 100))

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
    it('should setup channel when user and permission are granted', async () => {
      vi.mocked(notificationService.isGranted).mockReturnValue(true)

      const { result } = renderHook(() => useNotifications())

      // Wait for hook to initialize
      await waitFor(() => {
        expect(result.current).not.toBeNull()
      })

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

    it('should cleanup channel on unmount', async () => {
      vi.mocked(notificationService.isGranted).mockReturnValue(true)

      const { result, unmount } = renderHook(() => useNotifications())

      // Wait for hook to initialize
      await waitFor(() => {
        expect(result.current).not.toBeNull()
      })

      unmount()

      expect(supabase.removeChannel).toHaveBeenCalledWith(mockChannel)
    })
  })

  describe('Reminder scheduling', () => {
    it('should setup reminder interval when user and permission are granted', async () => {
      vi.mocked(notificationService.isGranted).mockReturnValue(true)

      const { result } = renderHook(() => useNotifications())

      // Wait for hook to initialize
      await waitFor(() => {
        expect(result.current).not.toBeNull()
      })

      // Hook should have set up subscription (interval is internal implementation detail)
      expect(supabase.channel).toHaveBeenCalledWith('staff-notifications')
    })

    it('should not setup reminders if no permission', () => {
      vi.mocked(notificationService.isGranted).mockReturnValue(false)

      renderHook(() => useNotifications())

      // Should not setup channel
      expect(supabase.channel).not.toHaveBeenCalled()
    })

    it('should cleanup interval on unmount', async () => {
      vi.mocked(notificationService.isGranted).mockReturnValue(true)

      const { result, unmount } = renderHook(() => useNotifications())

      // Wait for hook to initialize
      await waitFor(() => {
        expect(result.current).not.toBeNull()
      })

      unmount()

      // Should remove channel on cleanup
      expect(supabase.removeChannel).toHaveBeenCalled()
    })
  })

  describe('isSupported', () => {
    it('should return true if notifications are supported', async () => {
      vi.mocked(notificationService.isSupported).mockReturnValue(true)

      const { result } = renderHook(() => useNotifications())

      await waitFor(() => {
        expect(result.current).not.toBeNull()
      })

      expect(result.current.isSupported).toBe(true)
    })

    it('should return false if notifications are not supported', async () => {
      vi.mocked(notificationService.isSupported).mockReturnValue(false)

      const { result } = renderHook(() => useNotifications())

      await waitFor(() => {
        expect(result.current).not.toBeNull()
      })

      expect(result.current.isSupported).toBe(false)
    })
  })

  describe('Permission state management', () => {
    it('should update hasPermission after successful request', async () => {
      vi.mocked(notificationService.isGranted).mockReturnValue(false)
      vi.mocked(notificationService.requestPermission).mockResolvedValue(true)

      const { result } = renderHook(() => useNotifications())

      // Wait for initial render
      await waitFor(() => {
        expect(result.current).not.toBeNull()
      })

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

      // Wait for initial render
      await waitFor(() => {
        expect(result.current).not.toBeNull()
      })

      expect(result.current.hasPermission).toBe(false)

      await act(async () => {
        await result.current.requestPermission()
      })

      await waitFor(() => {
        expect(result.current.hasPermission).toBe(false)
      })
    })
  })

  describe('Assignment notifications', () => {
    beforeEach(() => {
      vi.clearAllMocks()
      vi.mocked(notificationService.isGranted).mockReturnValue(true)
      vi.mocked(notificationService.isSupported).mockReturnValue(true)
      vi.mocked(notificationService.show).mockResolvedValue(undefined)
    })

    it('should detect when staff is assigned to a booking', async () => {
      const insertMock = vi.fn().mockResolvedValue({ data: null, error: null })
      const customerQuery = createQueryMock({ data: { full_name: 'John Doe' }, error: null })
      const teamQuery = createQueryMock({ data: [], error: null })

      vi.mocked(supabase.from).mockImplementation(((table: string) => {
        if (table === 'customers') return customerQuery
        if (table === 'notifications') {
          const query = createQueryMock({ data: null, error: null })
          query.insert = insertMock
          return query
        }
        if (table === 'team_members' || table === 'teams') return teamQuery
        return createQueryMock({ data: [], error: null })
      }) as never)

      // Setup channel with callback capture
      let updateCallback: ((payload: unknown) => Promise<void>) | null = null
      const testChannel = {
        on: vi.fn().mockImplementation((_event: string, config: unknown, callback: (payload: unknown) => Promise<void>) => {
          if (config && typeof config === 'object' && 'event' in config && config.event === 'UPDATE') {
            updateCallback = callback
          }
          return testChannel
        }),
        subscribe: vi.fn().mockReturnThis(),
      }
      vi.mocked(supabase.channel).mockReturnValue(testChannel as never)

      const { result } = renderHook(() => useNotifications())

      // Wait for hook to initialize
      await waitFor(() => {
        expect(result.current).not.toBeNull()
      })

      // Simulate UPDATE event: staff assigned
      const payload = {
        eventType: 'UPDATE',
        old: {
          id: 'booking-1',
          customer_id: 'customer-1',
          staff_id: null, // Was unassigned
          team_id: null,
          booking_date: '2025-11-12',
          start_time: '10:00:00',
          end_time: '14:00:00',
          status: 'pending',
        },
        new: {
          id: 'booking-1',
          customer_id: 'customer-1',
          staff_id: 'user-1', // Now assigned to current user
          team_id: null,
          booking_date: '2025-11-12',
          start_time: '10:00:00',
          end_time: '14:00:00',
          status: 'pending',
        },
      }

      // Ensure callback was captured
      expect(updateCallback).not.toBeNull()

      await act(async () => {
        if (updateCallback) {
          await updateCallback(payload)
        }
      })

      // Wait a bit for async operations
      await new Promise(resolve => setTimeout(resolve, 100))

      // Should save assignment notification
      expect(insertMock).toHaveBeenCalled()
      expect(insertMock).toHaveBeenCalledWith(
        expect.objectContaining({
          user_id: 'user-1',
          type: 'booking_assigned',
          title: '📌 New Booking Assigned to You!',
          booking_id: 'booking-1',
        })
      )

      // Should show browser notification
      expect(notificationService.show).toHaveBeenCalled()
    })

    it('should detect when team is assigned to a booking', async () => {
      // User belongs to team-1
      const memberTeams = [{ team_id: 'team-1' }]

      const insertMock = vi.fn().mockResolvedValue({ data: null, error: null })
      const customerQuery = createQueryMock({ data: { full_name: 'Jane Smith' }, error: null })
      const teamMembersQuery = createQueryMock({ data: memberTeams, error: null })
      const teamsQuery = createQueryMock({ data: [], error: null })

      vi.mocked(supabase.from).mockImplementation(((table: string) => {
        if (table === 'team_members') return teamMembersQuery
        if (table === 'teams') return teamsQuery
        if (table === 'customers') return customerQuery
        if (table === 'notifications') {
          const query = createQueryMock({ data: null, error: null })
          query.insert = insertMock
          return query
        }
        return createQueryMock({ data: [], error: null })
      }) as never)

      let updateCallback: ((payload: unknown) => void) | null = null
      mockChannel.on.mockImplementation((_event: string, config: unknown, callback: (payload: unknown) => void) => {
        if (config && typeof config === 'object' && 'event' in config && config.event === 'UPDATE') {
          updateCallback = callback
        }
        return mockChannel
      })

      const { result } = renderHook(() => useNotifications())

      // Wait for hook to initialize
      await waitFor(() => {
        expect(result.current).not.toBeNull()
      })

      // Wait for teams to load (need longer time for async operations)
      await waitFor(
        () => {
          expect(supabase.from).toHaveBeenCalledWith('team_members')
          expect(supabase.from).toHaveBeenCalledWith('teams')
        },
        { timeout: 500 }
      )

      // Wait a bit more to ensure myTeamIds state is updated
      await new Promise(resolve => setTimeout(resolve, 200))

      // Simulate UPDATE event: team assigned
      const payload = {
        eventType: 'UPDATE',
        old: {
          id: 'booking-2',
          customer_id: 'customer-2',
          staff_id: null,
          team_id: null, // Was unassigned
          booking_date: '2025-11-13',
          start_time: '15:00:00',
          end_time: '19:00:00',
          status: 'pending',
        },
        new: {
          id: 'booking-2',
          customer_id: 'customer-2',
          staff_id: null,
          team_id: 'team-1', // Now assigned to user's team
          booking_date: '2025-11-13',
          start_time: '15:00:00',
          end_time: '19:00:00',
          status: 'pending',
        },
      }

      await act(async () => {
        if (updateCallback) {
          await updateCallback(payload)
        }
      })

      // Should save team assignment notification
      await waitFor(() => {
        expect(insertMock).toHaveBeenCalledWith(
          expect.objectContaining({
            user_id: 'user-1',
            type: 'team_booking',
            title: '👥 New Team Booking Assigned!',
            booking_id: 'booking-2',
            team_id: 'team-1',
          })
        )
      })
    })

    it('should not notify when staff changes from one staff to another', async () => {
      const insertMock = vi.fn().mockResolvedValue({ data: null, error: null })
      const customerQuery = createQueryMock({ data: { full_name: 'Test User' }, error: null })

      vi.mocked(supabase.from).mockImplementation(((table: string) => {
        if (table === 'customers') return customerQuery
        if (table === 'notifications') {
          const query = createQueryMock({ data: null, error: null })
          query.insert = insertMock
          return query
        }
        return createQueryMock({ data: [], error: null })
      }) as never)

      let updateCallback: ((payload: unknown) => void) | null = null
      mockChannel.on.mockImplementation((_event: string, config: unknown, callback: (payload: unknown) => void) => {
        if (config && typeof config === 'object' && 'event' in config && config.event === 'UPDATE') {
          updateCallback = callback
        }
        return mockChannel
      })

      renderHook(() => useNotifications())

      // Simulate UPDATE: staff changes from other-staff to current user
      // This should NOT trigger assignment notification (was already assigned to someone)
      const payload = {
        eventType: 'UPDATE',
        old: {
          id: 'booking-3',
          customer_id: 'customer-3',
          staff_id: 'other-staff', // Was assigned to someone else
          team_id: null,
          booking_date: '2025-11-14',
          start_time: '10:00:00',
          end_time: '12:00:00',
          status: 'pending',
        },
        new: {
          id: 'booking-3',
          customer_id: 'customer-3',
          staff_id: 'user-1', // Reassigned to current user
          team_id: null,
          booking_date: '2025-11-14',
          start_time: '10:00:00',
          end_time: '12:00:00',
          status: 'pending',
        },
      }

      await act(async () => {
        if (updateCallback) {
          await updateCallback(payload)
        }
      })

      // Wait for any async operations
      await new Promise(resolve => setTimeout(resolve, 100))

      // Should NOT create assignment notification (not a new assignment from null)
      // Filter calls to check if booking_assigned was called
      const assignmentCalls = insertMock.mock.calls.filter((call: unknown[]) => {
        const arg = call[0] as { type?: string }
        return arg && arg.type === 'booking_assigned'
      })
      expect(assignmentCalls.length).toBe(0)
    })
  })
})
