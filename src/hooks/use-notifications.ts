import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/auth-context'
import { notificationService } from '@/lib/notifications'

export function useNotifications() {
  const { user } = useAuth()
  const [hasPermission, setHasPermission] = useState(false)
  const [isRequesting, setIsRequesting] = useState(false)

  // Request notification permission on mount
  useEffect(() => {
    const checkPermission = async () => {
      const granted = notificationService.isGranted()
      setHasPermission(granted)
    }
    checkPermission()
  }, [])

  // Request permission from user
  const requestPermission = async () => {
    setIsRequesting(true)
    const granted = await notificationService.requestPermission()
    setHasPermission(granted)
    setIsRequesting(false)
    return granted
  }

  // Listen for new bookings assigned to this staff
  useEffect(() => {
    if (!user || !hasPermission) return

    console.log('[Notifications] Setting up realtime listener for staff:', user.id)

    const channel = supabase
      .channel('staff-notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'bookings',
          filter: `staff_id=eq.${user.id}`,
        },
        async (payload: any) => {
          console.log('[Notifications] New booking detected:', payload)

          const booking = payload.new

          // Fetch customer details
          const { data: customerData } = await supabase
            .from('customers')
            .select('full_name')
            .eq('id', booking.customer_id)
            .single()

          const customerName = customerData?.full_name || 'ลูกค้า'
          const time = `${booking.start_time.slice(0, 5)} - ${booking.end_time.slice(0, 5)}`

          // Show notification
          await notificationService.notifyNewBooking(
            customerName,
            time,
            booking.id
          )
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'bookings',
          filter: `staff_id=eq.${user.id}`,
        },
        async (payload: any) => {
          const oldBooking = payload.old
          const newBooking = payload.new

          // Notify if booking was cancelled
          if (oldBooking.status !== 'cancelled' && newBooking.status === 'cancelled') {
            const { data: customerData } = await supabase
              .from('customers')
              .select('full_name')
              .eq('id', newBooking.customer_id)
              .single()

            const customerName = customerData?.full_name || 'ลูกค้า'
            const time = `${newBooking.start_time.slice(0, 5)} - ${newBooking.end_time.slice(0, 5)}`

            await notificationService.notifyBookingCancelled(customerName, time)
          }
        }
      )
      .subscribe()

    return () => {
      console.log('[Notifications] Cleaning up realtime listener')
      supabase.removeChannel(channel)
    }
  }, [user, hasPermission])

  // Schedule reminder notifications for upcoming bookings
  useEffect(() => {
    if (!user || !hasPermission) return

    const scheduleReminders = async () => {
      const now = new Date()
      const in30Minutes = new Date(now.getTime() + 30 * 60 * 1000)

      const todayStr = now.toISOString().split('T')[0]
      const timeStr = in30Minutes.toTimeString().slice(0, 5)

      // Find bookings starting in ~30 minutes
      const { data: upcomingBookings } = await supabase
        .from('bookings')
        .select(`
          id,
          start_time,
          end_time,
          customers (full_name)
        `)
        .eq('staff_id', user.id)
        .eq('booking_date', todayStr)
        .eq('status', 'confirmed')
        .gte('start_time', timeStr)
        .lte('start_time', `${String(in30Minutes.getHours()).padStart(2, '0')}:${String(in30Minutes.getMinutes() + 5).padStart(2, '0')}`)

      if (upcomingBookings && upcomingBookings.length > 0) {
        for (const booking of upcomingBookings) {
          const customerName = (booking.customers as any)?.full_name || 'ลูกค้า'
          const time = `${booking.start_time.slice(0, 5)}`

          await notificationService.notifyBookingReminder(
            customerName,
            time,
            booking.id
          )
        }
      }
    }

    // Check every 5 minutes
    const interval = setInterval(scheduleReminders, 5 * 60 * 1000)

    // Check immediately
    scheduleReminders()

    return () => clearInterval(interval)
  }, [user, hasPermission])

  return {
    hasPermission,
    isRequesting,
    requestPermission,
    isSupported: notificationService.isSupported(),
  }
}
