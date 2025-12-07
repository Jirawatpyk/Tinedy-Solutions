import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { mapErrorToUserMessage } from '@/lib/error-messages'

export interface Settings {
  id: string

  // General Settings
  business_name: string
  business_email: string
  business_phone: string
  business_address: string
  business_description: string | null
  business_logo_url: string | null

  // Email Settings
  email_api_key: string | null
  email_from_address: string
  email_reply_to: string | null
  email_provider: string

  // Booking Settings
  time_slot_duration: number // minutes
  min_advance_booking: number // hours
  max_booking_window: number // days
  cancellation_hours: number // hours
  require_deposit: boolean
  deposit_percentage: number // percentage

  // Notification Settings
  email_notifications: boolean
  sms_notifications: boolean
  notify_new_booking: boolean
  notify_cancellation: boolean
  notify_payment: boolean
  reminder_hours: number // hours

  // Metadata
  updated_at: string
  updated_by: string | null
  created_at: string
}

export function useSettings() {
  const [settings, setSettings] = useState<Settings | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadSettings = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      // Fetch settings (should only be one row)
      const { data, error: fetchError } = await supabase
        .from('settings')
        .select('*')
        .single()

      if (fetchError) {
        // If no settings exist, create default settings
        if (fetchError.code === 'PGRST116') {
          const { data: newSettings, error: insertError } = await supabase
            .from('settings')
            .insert({
              business_name: 'Tinedy Solutions',
              business_email: 'contact@tinedy.com',
              business_phone: '02-123-4567',
              business_address: '123 Business Street, Bangkok, Thailand',
            })
            .select()
            .single()

          if (insertError) throw insertError
          setSettings(newSettings)
        } else {
          throw fetchError
        }
      } else {
        setSettings(data)
      }
    } catch (err) {
      console.error('Error loading settings:', err)
      const errorMsg = mapErrorToUserMessage(err, 'settings')
      setError(errorMsg.description)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadSettings()
  }, [loadSettings])

  const updateGeneralSettings = async (updates: {
    business_name?: string
    business_email?: string
    business_phone?: string
    business_address?: string
    business_description?: string
    business_logo_url?: string
    email_api_key?: string
    email_from_address?: string
    email_reply_to?: string
    email_provider?: string
  }) => {
    try {
      if (!settings) throw new Error('Settings not loaded')

      const { data, error } = await supabase
        .from('settings')
        .update(updates)
        .eq('id', settings.id)
        .select()
        .single()

      if (error) throw error

      setSettings(data)
      return { success: true }
    } catch (err) {
      console.error('Error updating general settings:', err)
      throw err
    }
  }

  const updateBookingSettings = async (updates: {
    time_slot_duration?: number
    min_advance_booking?: number
    max_booking_window?: number
    cancellation_hours?: number
    require_deposit?: boolean
    deposit_percentage?: number
  }) => {
    try {
      if (!settings) throw new Error('Settings not loaded')

      const { data, error } = await supabase
        .from('settings')
        .update(updates)
        .eq('id', settings.id)
        .select()
        .single()

      if (error) throw error

      setSettings(data)
      return { success: true }
    } catch (err) {
      console.error('Error updating booking settings:', err)
      throw err
    }
  }

  const updateNotificationSettings = async (updates: {
    email_notifications?: boolean
    sms_notifications?: boolean
    notify_new_booking?: boolean
    notify_cancellation?: boolean
    notify_payment?: boolean
    reminder_hours?: number
  }) => {
    try {
      if (!settings) throw new Error('Settings not loaded')

      const { data, error } = await supabase
        .from('settings')
        .update(updates)
        .eq('id', settings.id)
        .select()
        .single()

      if (error) throw error

      setSettings(data)
      return { success: true }
    } catch (err) {
      console.error('Error updating notification settings:', err)
      throw err
    }
  }

  const uploadLogo = async (file: File) => {
    try {
      if (!settings) throw new Error('Settings not loaded')

      // Validate file
      const maxSize = 2 * 1024 * 1024 // 2MB
      if (file.size > maxSize) {
        throw new Error('File too large (max 2MB)')
      }

      const allowedTypes = ['image/jpeg', 'image/png', 'image/webp']
      if (!allowedTypes.includes(file.type)) {
        throw new Error('Only JPG, PNG, WEBP files are supported')
      }

      // Delete old logo if exists
      if (settings.business_logo_url) {
        const oldPath = settings.business_logo_url.split('/').pop()
        if (oldPath) {
          await supabase.storage.from('business-logos').remove([oldPath])
        }
      }

      // Upload new logo
      const fileExt = file.name.split('.').pop()
      const fileName = `business-logo-${Date.now()}.${fileExt}`

      const { error: uploadError } = await supabase.storage
        .from('business-logos')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false,
        })

      if (uploadError) throw uploadError

      // Get public URL
      const { data } = supabase.storage.from('business-logos').getPublicUrl(fileName)

      // Update settings with new logo URL
      await updateGeneralSettings({ business_logo_url: data.publicUrl })

      return data.publicUrl
    } catch (err) {
      console.error('Error uploading logo:', err)
      throw err
    }
  }

  return {
    settings,
    loading,
    error,
    updateGeneralSettings,
    updateBookingSettings,
    updateNotificationSettings,
    uploadLogo,
    refresh: loadSettings,
  }
}
