import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/auth-context'

export interface InAppNotification {
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

export function useInAppNotifications() {
  const { user } = useAuth()
  const [notifications, setNotifications] = useState<InAppNotification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [loading, setLoading] = useState(true)

  // Load notifications
  const loadNotifications = useCallback(async () => {
    if (!user) {
      console.log('[InAppNotifications] ⚠️ No user, skipping load')
      return
    }

    console.log('[InAppNotifications] 📥 Loading notifications...')
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(50)

    if (error) {
      console.error('[InAppNotifications] ❌ Error loading notifications:', error)
      return
    }

    console.log('[InAppNotifications] ✅ Loaded', data?.length || 0, 'notifications')
    setNotifications(data || [])
    setUnreadCount(data?.filter(n => !n.is_read).length || 0)
    setLoading(false)
  }, [user])

  // Mark notification as read
  const markAsRead = useCallback(async (notificationId: string) => {
    if (!user) return

    const { error } = await supabase
      .from('notifications')
      .update({
        is_read: true,
        read_at: new Date().toISOString()
      })
      .eq('id', notificationId)
      .eq('user_id', user.id)

    if (error) {
      console.error('Error marking notification as read:', error)
      return
    }

    // Update local state
    setNotifications(prev =>
      prev.map(n =>
        n.id === notificationId
          ? { ...n, is_read: true, read_at: new Date().toISOString() }
          : n
      )
    )
    setUnreadCount(prev => Math.max(0, prev - 1))
  }, [user])

  // Mark all as read
  const markAllAsRead = useCallback(async () => {
    if (!user) return

    const unreadIds = notifications
      .filter(n => !n.is_read)
      .map(n => n.id)

    if (unreadIds.length === 0) return

    const { error } = await supabase
      .from('notifications')
      .update({
        is_read: true,
        read_at: new Date().toISOString()
      })
      .in('id', unreadIds)
      .eq('user_id', user.id)

    if (error) {
      console.error('Error marking all as read:', error)
      return
    }

    // Update local state
    setNotifications(prev =>
      prev.map(n => ({
        ...n,
        is_read: true,
        read_at: n.is_read ? n.read_at : new Date().toISOString()
      }))
    )
    setUnreadCount(0)
  }, [user, notifications])

  // Delete notification
  const deleteNotification = useCallback(async (notificationId: string) => {
    if (!user) return

    const notification = notifications.find(n => n.id === notificationId)
    const wasUnread = notification && !notification.is_read

    const { error } = await supabase
      .from('notifications')
      .delete()
      .eq('id', notificationId)
      .eq('user_id', user.id)

    if (error) {
      console.error('Error deleting notification:', error)
      return
    }

    // Update local state
    setNotifications(prev => prev.filter(n => n.id !== notificationId))
    if (wasUnread) {
      setUnreadCount(prev => Math.max(0, prev - 1))
    }
  }, [user, notifications])

  // Clear all notifications
  const clearAll = useCallback(async () => {
    if (!user) return

    const { error } = await supabase
      .from('notifications')
      .delete()
      .eq('user_id', user.id)

    if (error) {
      console.error('Error clearing notifications:', error)
      return
    }

    setNotifications([])
    setUnreadCount(0)
  }, [user])

  // Load notifications on mount and subscribe to changes
  useEffect(() => {
    if (!user) {
      console.log('[InAppNotifications] ⚠️ No user, skipping subscription setup')
      return
    }

    // Load notifications immediately
    console.log('[InAppNotifications] 🔄 Loading notifications for user:', user.id)
    ;(async () => {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(50)

      if (error) {
        console.error('[InAppNotifications] ❌ Error loading notifications:', error)
        return
      }

      console.log('[InAppNotifications] ✅ Loaded', data?.length || 0, 'notifications')
      setNotifications(data || [])
      setUnreadCount(data?.filter(n => !n.is_read).length || 0)
      setLoading(false)
    })()

    // Subscribe to real-time changes
    console.log('[InAppNotifications] 📡 Setting up realtime subscription for user:', user.id)
    const channel = supabase
      .channel(`in-app-notifications-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`
        },
        (payload) => {
          console.log('[InAppNotifications] 📥 INSERT event received:', payload)
          const newNotification = payload.new as InAppNotification
          setNotifications(prev => [newNotification, ...prev])
          setUnreadCount(prev => prev + 1)
          console.log('[InAppNotifications] ✅ Notification added to UI!')
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`
        },
        (payload) => {
          console.log('[InAppNotifications] 📥 UPDATE event received:', payload)
          const updatedNotification = payload.new as InAppNotification
          setNotifications(prev =>
            prev.map(n => n.id === updatedNotification.id ? updatedNotification : n)
          )
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`
        },
        (payload) => {
          console.log('[InAppNotifications] 📥 DELETE event received:', payload)
          const deletedNotification = payload.old as InAppNotification
          setNotifications(prev => prev.filter(n => n.id !== deletedNotification.id))
        }
      )
      .subscribe((status) => {
        console.log('[InAppNotifications] 📡 Channel status:', status)
        if (status === 'SUBSCRIBED') {
          console.log('[InAppNotifications] ✅ Successfully subscribed to notification updates!')
        } else if (status === 'CHANNEL_ERROR') {
          console.error('[InAppNotifications] ❌ Channel subscription error!')
        } else if (status === 'TIMED_OUT') {
          console.error('[InAppNotifications] ⏱️ Channel subscription timed out!')
        }
      })

    return () => {
      console.log('[InAppNotifications] 🧹 Cleaning up notification subscription for user:', user.id)
      supabase.removeChannel(channel)
    }
  }, [user])

  return {
    notifications,
    unreadCount,
    loading,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    clearAll,
    refresh: loadNotifications
  }
}
