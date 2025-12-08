/**
 * useStaffProfile Hook
 *
 * Hook for Staff Profile page - manages profile data and actions.
 *
 * Features:
 * - Load staff profile from auth context
 * - Update profile (full_name, phone)
 * - Upload avatar
 * - Change password
 *
 * Note: Performance statistics moved to useStaffDashboard (My Bookings > Stats tab)
 */

import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/auth-context'
import { mapErrorToUserMessage } from '@/lib/error-messages'

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
  const { user, profile } = useAuth()
  const [staffProfile, setStaffProfile] = useState<StaffProfile | null>(null)
  const [error, setError] = useState<string | null>(null)

  const loadProfile = useCallback(async () => {
    if (!profile) return

    try {
      setStaffProfile({
        id: profile.id,
        full_name: profile.full_name,
        email: profile.email,
        phone: profile.phone,
        avatar_url: profile.avatar_url,
        role: profile.role,
        staff_number: profile.staff_number || null,
        skills: profile.skills || null,
        created_at: profile.created_at,
      })
    } catch (err) {
      console.error('Error loading profile:', err)
      const errorMsg = mapErrorToUserMessage(err, 'profile')
      setError(errorMsg.description)
    }
  }, [profile])

  useEffect(() => {
    if (!user || !profile) return
    loadProfile()
  }, [user, profile, loadProfile])

  async function updateProfile(updates: {
    full_name?: string
    phone?: string
  }) {
    if (!user) return

    try {
      const { error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', user.id)

      if (error) throw error

      // Reload profile
      await loadProfile()
    } catch (err) {
      console.error('Error updating profile:', err)
      throw err
    }
  }

  async function uploadAvatar(file: File) {
    if (!user) return

    try {
      // Validate file
      const maxSize = 2 * 1024 * 1024 // 2MB
      if (file.size > maxSize) {
        throw new Error('ไฟล์ใหญ่เกินไป (สูงสุด 2MB)')
      }

      const allowedTypes = ['image/jpeg', 'image/png', 'image/webp']
      if (!allowedTypes.includes(file.type)) {
        throw new Error('รองรับเฉพาะไฟล์ JPG, PNG, WEBP')
      }

      // Delete old avatar if exists
      if (staffProfile?.avatar_url) {
        const oldPath = staffProfile.avatar_url.split('/').pop()
        if (oldPath) {
          await supabase.storage.from('avatars').remove([`${user.id}/${oldPath}`])
        }
      }

      // Upload new avatar
      const fileExt = file.name.split('.').pop()
      const fileName = `${Date.now()}.${fileExt}`
      const filePath = `${user.id}/${fileName}`

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false,
        })

      if (uploadError) throw uploadError

      // Get public URL
      const { data } = supabase.storage.from('avatars').getPublicUrl(filePath)

      // Update profile with new avatar URL
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: data.publicUrl })
        .eq('id', user.id)

      if (updateError) throw updateError

      // Reload profile
      await loadProfile()

      return data.publicUrl
    } catch (err) {
      console.error('Error uploading avatar:', err)
      throw err
    }
  }

  async function changePassword(newPassword: string) {
    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      })

      if (error) throw error
    } catch (err) {
      console.error('Error changing password:', err)
      throw err
    }
  }

  return {
    staffProfile,
    error,
    updateProfile,
    uploadAvatar,
    changePassword,
    refresh: loadProfile,
  }
}
