/**
 * Tests for useStaffProfile hook
 *
 * Verifies profile mapping from AuthContext, password change, and refresh.
 */

import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import React, { type ReactNode } from 'react'

// Mock dependencies
vi.mock('@/contexts/auth-context', () => ({
  useAuth: vi.fn(),
}))

vi.mock('@/lib/queries/staff-profile-queries', () => ({
  changeStaffPassword: vi.fn(),
}))

import { useStaffProfile } from '../use-staff-profile'
import { useAuth } from '@/contexts/auth-context'
import { changeStaffPassword } from '@/lib/queries/staff-profile-queries'

const mockProfile = {
  id: 'user-1',
  email: 'staff@example.com',
  full_name: 'Test Staff',
  avatar_url: null,
  role: 'staff' as const,
  phone: '0812345678',
  staff_number: 'STF0001',
  skills: ['cleaning', 'cooking'],
  created_at: '2025-01-01T00:00:00Z',
  updated_at: '2025-01-01T00:00:00Z',
}

const mockRefreshProfile = vi.fn()

describe('useStaffProfile', () => {
  let queryClient: QueryClient

  beforeEach(() => {
    vi.clearAllMocks()
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    })

    vi.mocked(useAuth).mockReturnValue({
      user: { id: 'user-1' } as never,
      profile: mockProfile,
      loading: false,
      signIn: vi.fn(),
      signUp: vi.fn(),
      signOut: vi.fn(),
      refreshProfile: mockRefreshProfile,
    })
  })

  const wrapper = ({ children }: { children: ReactNode }) => {
    return React.createElement(QueryClientProvider, { client: queryClient }, children)
  }

  describe('Profile mapping', () => {
    it('should map AuthContext profile to StaffProfile', () => {
      const { result } = renderHook(() => useStaffProfile(), { wrapper })

      expect(result.current.staffProfile).toEqual({
        id: 'user-1',
        full_name: 'Test Staff',
        email: 'staff@example.com',
        phone: '0812345678',
        avatar_url: null,
        role: 'staff',
        staff_number: 'STF0001',
        skills: ['cleaning', 'cooking'],
        created_at: '2025-01-01T00:00:00Z',
      })
    })

    it('should return null staffProfile when AuthContext profile is null', () => {
      vi.mocked(useAuth).mockReturnValue({
        user: null,
        profile: null,
        loading: false,
        signIn: vi.fn(),
        signUp: vi.fn(),
        signOut: vi.fn(),
        refreshProfile: vi.fn(),
      })

      const { result } = renderHook(() => useStaffProfile(), { wrapper })

      expect(result.current.staffProfile).toBeNull()
    })

    it('should handle null staff_number and skills', () => {
      vi.mocked(useAuth).mockReturnValue({
        user: { id: 'user-1' } as never,
        profile: { ...mockProfile, staff_number: null, skills: null },
        loading: false,
        signIn: vi.fn(),
        signUp: vi.fn(),
        signOut: vi.fn(),
        refreshProfile: vi.fn(),
      })

      const { result } = renderHook(() => useStaffProfile(), { wrapper })

      expect(result.current.staffProfile?.staff_number).toBeNull()
      expect(result.current.staffProfile?.skills).toBeNull()
    })
  })

  describe('changePassword', () => {
    it('should call changeStaffPassword', async () => {
      vi.mocked(changeStaffPassword).mockResolvedValue(undefined)

      const { result } = renderHook(() => useStaffProfile(), { wrapper })

      await result.current.changePassword('newPassword123')

      expect(changeStaffPassword).toHaveBeenCalledWith('newPassword123', expect.anything())
    })

    it('should throw on password change error', async () => {
      vi.mocked(changeStaffPassword).mockRejectedValue(new Error('Weak password'))

      const { result } = renderHook(() => useStaffProfile(), { wrapper })

      await expect(result.current.changePassword('123')).rejects.toThrow('Weak password')
    })
  })

  describe('refresh', () => {
    it('should delegate to AuthContext refreshProfile', async () => {
      const { result } = renderHook(() => useStaffProfile(), { wrapper })

      await result.current.refresh()

      expect(mockRefreshProfile).toHaveBeenCalled()
    })
  })

  describe('error state', () => {
    it('should return null error initially', () => {
      const { result } = renderHook(() => useStaffProfile(), { wrapper })

      expect(result.current.error).toBeNull()
    })

    it('should expose mutation error message after failed password change', async () => {
      vi.mocked(changeStaffPassword).mockRejectedValue(new Error('Password too weak'))

      const { result } = renderHook(() => useStaffProfile(), { wrapper })

      try {
        await result.current.changePassword('123')
      } catch {
        // expected — mutateAsync re-throws
      }

      // React Query mutation state updates asynchronously
      await waitFor(() => {
        expect(result.current.error).toBe('Password too weak')
      })
    })
  })
})
