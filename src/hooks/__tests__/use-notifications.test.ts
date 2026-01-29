/**
 * Tests for useNotifications hook (v2)
 *
 * Refactored hook subscribes to notifications table via realtime
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act, cleanup } from '@testing-library/react'

// Mock dependencies BEFORE imports
vi.mock('@/lib/supabase', () => ({
  supabase: {
    channel: vi.fn(),
    removeChannel: vi.fn(),
  },
}))

vi.mock('@/contexts/auth-context', () => ({
  useAuth: vi.fn(),
}))

// Default mock values for notification service
vi.mock('@/lib/notifications', () => ({
  notificationService: {
    isGranted: vi.fn(() => false),
    isSupported: vi.fn(() => true),
    requestPermission: vi.fn(() => Promise.resolve(true)),
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

describe('useNotifications', () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let mockChannel: any

  beforeEach(() => {
    vi.clearAllMocks()

    // Default auth state
    vi.mocked(useAuth).mockReturnValue({
      user: mockUser as never,
      profile: null,
      signIn: vi.fn(),
      signOut: vi.fn(),
      signUp: vi.fn(),
      refreshProfile: vi.fn(),
      loading: false,
    })

    // Default channel mock
    mockChannel = {
      on: vi.fn().mockReturnThis(),
      subscribe: vi.fn().mockImplementation((callback) => {
        if (callback) callback('SUBSCRIBED')
        return mockChannel
      }),
    }
    vi.mocked(supabase.channel).mockReturnValue(mockChannel)
    vi.mocked(supabase.removeChannel).mockResolvedValue({ error: null } as never)
  })

  afterEach(() => {
    cleanup()
  })

  describe('Initial state', () => {
    it('should initialize with default state', () => {
      const { result } = renderHook(() => useNotifications())

      expect(result.current.hasPermission).toBe(false)
      expect(result.current.isRequesting).toBe(false)
      expect(typeof result.current.requestPermission).toBe('function')
    })

    it('should check permission on mount', () => {
      renderHook(() => useNotifications())

      expect(notificationService.isGranted).toHaveBeenCalled()
    })

    it('should return isSupported value', () => {
      const { result } = renderHook(() => useNotifications())

      expect(result.current.isSupported).toBe(true)
    })
  })

  describe('requestPermission', () => {
    it('should request permission from user', async () => {
      const { result } = renderHook(() => useNotifications())

      await act(async () => {
        await result.current.requestPermission()
      })

      expect(notificationService.requestPermission).toHaveBeenCalled()
    })

    it('should return true when permission is granted', async () => {
      vi.mocked(notificationService.requestPermission).mockResolvedValue(true)

      const { result } = renderHook(() => useNotifications())

      let granted = false
      await act(async () => {
        granted = await result.current.requestPermission()
      })

      expect(granted).toBe(true)
      expect(result.current.hasPermission).toBe(true)
    })

    it('should return false when permission is denied', async () => {
      vi.mocked(notificationService.requestPermission).mockResolvedValue(false)

      const { result } = renderHook(() => useNotifications())

      let granted = true
      await act(async () => {
        granted = await result.current.requestPermission()
      })

      expect(granted).toBe(false)
      expect(result.current.hasPermission).toBe(false)
    })
  })

  describe('Real-time subscription', () => {
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
        refreshProfile: vi.fn(),
        loading: false,
      })

      renderHook(() => useNotifications())

      expect(supabase.channel).not.toHaveBeenCalled()
    })

    it('should setup channel after permission is granted', async () => {
      vi.mocked(notificationService.requestPermission).mockResolvedValue(true)

      const { result } = renderHook(() => useNotifications())

      // Initially no channel
      expect(supabase.channel).not.toHaveBeenCalled()

      // Request permission
      await act(async () => {
        await result.current.requestPermission()
      })

      // Now channel should be setup
      expect(supabase.channel).toHaveBeenCalledWith('staff-notifications-realtime')
    })
  })

  describe('Return value structure', () => {
    it('should return expected properties', () => {
      const { result } = renderHook(() => useNotifications())

      expect(result.current).toHaveProperty('hasPermission')
      expect(result.current).toHaveProperty('isRequesting')
      expect(result.current).toHaveProperty('requestPermission')
      expect(result.current).toHaveProperty('isSupported')
    })
  })
})
