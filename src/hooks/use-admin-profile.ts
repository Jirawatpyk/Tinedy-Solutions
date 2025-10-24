import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/auth-context'
import { getErrorMessage } from '@/lib/error-utils'

export interface AdminProfile {
  id: string
  full_name: string
  email: string
  phone: string | null
  avatar_url: string | null
  role: string
  created_at: string
}

export function useAdminProfile() {
  const { user, profile } = useAuth()
  const [adminProfile, setAdminProfile] = useState<AdminProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadProfile = useCallback(async () => {
    if (!profile) return

    try {
      setLoading(true)
      setError(null)

      setAdminProfile({
        id: profile.id,
        full_name: profile.full_name,
        email: profile.email,
        phone: profile.phone,
        avatar_url: profile.avatar_url,
        role: profile.role,
        created_at: profile.created_at,
      })
    } catch (err) {
      console.error('Error loading profile:', err)
      setError(getErrorMessage(err))
    } finally {
      setLoading(false)
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
      if (adminProfile?.avatar_url) {
        const oldPath = adminProfile.avatar_url.split('/').pop()
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
    adminProfile,
    loading,
    error,
    updateProfile,
    uploadAvatar,
    changePassword,
    refresh: loadProfile,
  }
}
