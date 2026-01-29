/**
 * useStaffProfile Hook
 *
 * Hook for Staff Profile page - manages profile data and actions.
 *
 * Features:
 * - Read staff profile from AuthContext (no duplicate state)
 * - Change password via useMutation
 * - Refresh profile via AuthContext refreshProfile()
 *
 * Note: Performance statistics moved to useStaffDashboard (My Bookings > Stats tab)
 * Note: Profile update and avatar upload handled by ProfileUpdateForm (shared component)
 */

import { useMemo } from 'react'
import { useMutation } from '@tanstack/react-query'
import { useAuth } from '@/contexts/auth-context'
import { changeStaffPassword } from '@/lib/queries/staff-profile-queries'

export interface StaffProfile {
  id: string
  full_name: string
  email: string
  phone: string | null
  avatar_url: string | null
  role: string
  staff_number: string | null
  skills: string[] | null
  created_at: string
}

export function useStaffProfile() {
  const { profile, refreshProfile } = useAuth()

  // Map AuthContext profile to StaffProfile
  const staffProfile = useMemo<StaffProfile | null>(() => {
    if (!profile) return null

    return {
      id: profile.id,
      full_name: profile.full_name,
      email: profile.email,
      phone: profile.phone,
      avatar_url: profile.avatar_url,
      role: profile.role,
      staff_number: profile.staff_number || null,
      skills: profile.skills || null,
      created_at: profile.created_at,
    }
  }, [profile])

  // Change password mutation
  const changePasswordMutation = useMutation({
    mutationFn: changeStaffPassword,
  })

  return {
    staffProfile,
    error: changePasswordMutation.error?.message ?? null,
    refresh: refreshProfile,
    changePassword: async (newPassword: string) => {
      await changePasswordMutation.mutateAsync(newPassword)
    },
    isChangingPassword: changePasswordMutation.isPending,
  }
}
