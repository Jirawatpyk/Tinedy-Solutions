import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/auth-context'
import { notificationService } from '@/lib/notifications'
import type { RealtimePostgresChangesPayload } from '@supabase/supabase-js'

// ============================================================================
// NOTIFICATION PREFERENCE HELPERS
// ============================================================================

const NOTIFICATION_PROMPT_HIDDEN_KEY = 'notification_prompt_hidden'

/**
 * Check if user has hidden the notification prompt
 */
export function isNotificationPromptHidden(userId: string): boolean {
  try {
    const key = `${NOTIFICATION_PROMPT_HIDDEN_KEY}_${userId}`
    const value = localStorage.getItem(key)
    return value === 'true'
  } catch {
    return false
  }
}

/**
 * Set notification prompt hidden preference
 */
export function setNotificationPromptHidden(userId: string, hidden: boolean): void {
  try {
    const key = `${NOTIFICATION_PROMPT_HIDDEN_KEY}_${userId}`
    if (hidden) {
      localStorage.setItem(key, 'true')
    } else {
      localStorage.removeItem(key)
    }
  } catch (err) {
    console.error('[Notifications] Error saving prompt preference:', err)
  }
}

// ============================================================================
// NOTIFICATION TYPES (matching database schema)
// ============================================================================

interface InAppNotification {
  id: string
  user_id: string
  type: string
  title: string
  message: string
  booking_id: string | null
  team_id: string | null
  is_read: boolean
  created_at: string
  read_at: string | null
}

// ============================================================================
// HOOK: useNotifications
// ============================================================================

/**
 * REFACTORED Notification Hook (v2)
 *
 * Key Changes:
 * - ❌ REMOVED: Database trigger duplication - no longer creates notifications in DB
 * - ✅ CHANGED: Subscribe to `notifications` table instead of `bookings` table
 * - ✅ KEPT: Browser notification popup functionality
 * - ✅ KEPT: Permission management
 *
 * Single Source of Truth: Database triggers create notifications
 * This hook's job: Show browser notification popups only
 */
export function useNotifications() {
  const { user } = useAuth()
  // Use lazy initialization to check permission immediately
  const [hasPermission, setHasPermission] = useState(() => {
    try {
      const granted = notificationService.isGranted()
      return granted
    } catch (error) {
      console.error('[Notifications] Error checking initial permission:', error)
      return false
    }
  })
  const [isRequesting, setIsRequesting] = useState(false)

  // Request permission from user
  const requestPermission = async () => {
    setIsRequesting(true)
    const granted = await notificationService.requestPermission()
    setHasPermission(granted)
    setIsRequesting(false)
    return granted
  }

  // ============================================================================
  // REALTIME: Subscribe to notifications table (created by DB triggers)
  // ============================================================================
  useEffect(() => {
    if (!user || !hasPermission) {
      return
    }

    const channel = supabase
      .channel('staff-notifications-realtime')
      .on<InAppNotification>(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`
        },
        async (payload: RealtimePostgresChangesPayload<InAppNotification>) => {
          const notification = payload.new as InAppNotification

          // Show browser notification popup
          // The notification is already created in DB by the trigger
          // We just need to show the browser popup
          try {
            await notificationService.show({
              title: notification.title,
              body: notification.message,
              tag: `notification-${notification.id}`,
              data: {
                type: notification.type,
                bookingId: notification.booking_id ?? undefined,
                notificationId: notification.id,
                url: '/staff'
              }
            })
          } catch (error) {
            console.error('[Notifications] Error showing browser notification:', error)
          }
        }
      )
      .subscribe((status) => {
        if (status === 'CHANNEL_ERROR') {
          console.error('[Notifications] Channel error!')
        } else if (status === 'TIMED_OUT') {
          console.error('[Notifications] Subscription timed out!')
        }
      })

    return () => {
      supabase.removeChannel(channel)
    }
  }, [user, hasPermission])

  return {
    hasPermission,
    isRequesting,
    requestPermission,
    isSupported: notificationService.isSupported(),
  }
}
