import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/auth-context'
import { notificationService } from '@/lib/notifications'

export function useNotifications() {
  const { user } = useAuth()
  const [hasPermission, setHasPermission] = useState(false)
  const [isRequesting, setIsRequesting] = useState(false)
  const [myTeamIds, setMyTeamIds] = useState<string[]>([])

  // Load team IDs that this user belongs to
  useEffect(() => {
    if (!user) return

    const loadMyTeams = async () => {
      try {
        // Get teams where user is a member
        const { data: memberTeams } = await supabase
          .from('team_members')
          .select('team_id')
          .eq('staff_id', user.id)
          .eq('is_active', true)

        // Get teams where user is the lead
        const { data: leadTeams } = await supabase
          .from('teams')
          .select('id')
          .eq('team_lead_id', user.id)
          .eq('is_active', true)

        const memberTeamIds = memberTeams?.map(m => m.team_id) || []
        const leadTeamIds = leadTeams?.map(t => t.id) || []

        // Combine and deduplicate
        const allTeamIds = [...new Set([...memberTeamIds, ...leadTeamIds])]
        setMyTeamIds(allTeamIds)

        console.log('[Notifications] User belongs to teams:', allTeamIds)
      } catch (err) {
        console.error('[Notifications] Error loading teams:', err)
      }
    }

    loadMyTeams()
  }, [user])

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

  // Listen for new bookings assigned to this staff OR their teams
  useEffect(() => {
    if (!user || !hasPermission) return

    console.log('[Notifications] Setting up realtime listener for staff:', user.id, 'teams:', myTeamIds)

    const channel = supabase
      .channel('staff-notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'bookings',
        },
        async (payload: any) => {
          console.log('[Notifications] New booking detected:', payload)

          const booking = payload.new

          // Check if this booking is relevant to current user
          const isMyBooking = booking.staff_id === user.id
          const isMyTeamBooking = booking.team_id && myTeamIds.includes(booking.team_id)

          if (!isMyBooking && !isMyTeamBooking) {
            return // Not relevant to this user
          }

          // Fetch customer details
          const { data: customerData } = await supabase
            .from('customers')
            .select('full_name')
            .eq('id', booking.customer_id)
            .single()

          const customerName = customerData?.full_name || 'ลูกค้า'
          const time = `${booking.start_time.slice(0, 5)} - ${booking.end_time.slice(0, 5)}`

          // Determine notification type
          const notificationType = isMyTeamBooking && !isMyBooking ? 'team' : 'personal'

          // Save to in-app notifications
          await supabase.from('notifications').insert({
            user_id: user.id,
            type: notificationType === 'team' ? 'team_booking' : 'new_booking',
            title: notificationType === 'team' ? '👥 งานทีมใหม่!' : '🔔 งานใหม่!',
            message: notificationType === 'team'
              ? `มีงานทีมใหม่จาก ${customerName} เวลา ${time}`
              : `มีงานใหม่จาก ${customerName} เวลา ${time}`,
            booking_id: booking.id,
            team_id: booking.team_id || null,
          })

          // Show browser notification
          await notificationService.notifyNewBooking(
            customerName,
            time,
            booking.id,
            notificationType
          )
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'bookings',
        },
        async (payload: any) => {
          const oldBooking = payload.old
          const newBooking = payload.new

          // Check if this booking is relevant to current user
          const isMyBooking = newBooking.staff_id === user.id
          const isMyTeamBooking = newBooking.team_id && myTeamIds.includes(newBooking.team_id)

          if (!isMyBooking && !isMyTeamBooking) {
            return // Not relevant to this user
          }

          const { data: customerData} = await supabase
            .from('customers')
            .select('full_name')
            .eq('id', newBooking.customer_id)
            .single()

          const customerName = customerData?.full_name || 'ลูกค้า'
          const time = `${newBooking.start_time.slice(0, 5)} - ${newBooking.end_time.slice(0, 5)}`
          const notificationType = isMyTeamBooking && !isMyBooking ? 'team' : 'personal'

          // Notify if booking was cancelled
          if (oldBooking.status !== 'cancelled' && newBooking.status === 'cancelled') {
            // Save to in-app notifications
            await supabase.from('notifications').insert({
              user_id: user.id,
              type: 'booking_cancelled',
              title: notificationType === 'team' ? '👥 งานทีมถูกยกเลิก' : '❌ งานถูกยกเลิก',
              message: notificationType === 'team'
                ? `งานทีมกับ ${customerName} เวลา ${time} ถูกยกเลิก`
                : `งานกับ ${customerName} เวลา ${time} ถูกยกเลิก`,
              booking_id: newBooking.id,
              team_id: newBooking.team_id || null,
            })

            await notificationService.notifyBookingCancelled(customerName, time, notificationType)
          }

          // Notify if status changed (confirmed -> in_progress -> completed)
          if (oldBooking.status !== newBooking.status && newBooking.status !== 'cancelled') {
            const statusMap: Record<string, string> = {
              confirmed: 'ยืนยันแล้ว',
              in_progress: 'กำลังดำเนินการ',
              completed: 'เสร็จสิ้น',
            }
            const statusText = statusMap[newBooking.status] || newBooking.status

            const emojiMap: Record<string, string> = {
              confirmed: '✅',
              in_progress: '🔄',
              completed: '✨',
            }
            const statusEmoji = emojiMap[newBooking.status] || '📝'

            // Save to in-app notifications
            await supabase.from('notifications').insert({
              user_id: user.id,
              type: 'booking_updated',
              title: notificationType === 'team' ? '👥 อัปเดตสถานะงานทีม' : `${statusEmoji} อัปเดตสถานะงาน`,
              message: notificationType === 'team'
                ? `งานทีมกับ ${customerName} เวลา ${time} → ${statusText}`
                : `งานกับ ${customerName} เวลา ${time} → ${statusText}`,
              booking_id: newBooking.id,
              team_id: newBooking.team_id || null,
            })

            // Show browser notification
            await notificationService.show({
              title: notificationType === 'team' ? '👥 อัปเดตสถานะงานทีม' : `${statusEmoji} อัปเดตสถานะงาน`,
              body: notificationType === 'team'
                ? `งานทีมกับ ${customerName} เวลา ${time} → ${statusText}`
                : `งานกับ ${customerName} เวลา ${time} → ${statusText}`,
              tag: `status-update-${newBooking.id}`,
              data: {
                type: 'booking_updated',
                bookingId: newBooking.id,
                url: '/staff'
              }
            })
          }
        }
      )
      .subscribe()

    return () => {
      console.log('[Notifications] Cleaning up realtime listener')
      supabase.removeChannel(channel)
    }
  }, [user, hasPermission, myTeamIds])

  // Schedule reminder notifications for upcoming bookings (personal + team)
  useEffect(() => {
    if (!user || !hasPermission) return

    const scheduleReminders = async () => {
      const now = new Date()
      const in30Minutes = new Date(now.getTime() + 30 * 60 * 1000)
      const in35Minutes = new Date(now.getTime() + 35 * 60 * 1000)

      const todayStr = now.toISOString().split('T')[0]
      const timeStr = in30Minutes.toTimeString().slice(0, 5)
      const endTimeStr = in35Minutes.toTimeString().slice(0, 5)

      // Find bookings starting in ~30 minutes (personal + team)
      let query = supabase
        .from('bookings')
        .select(`
          id,
          start_time,
          end_time,
          staff_id,
          team_id,
          customers (full_name)
        `)
        .eq('booking_date', todayStr)
        .eq('status', 'confirmed')
        .gte('start_time', timeStr)
        .lte('start_time', endTimeStr)

      // Filter for personal OR team bookings
      if (myTeamIds.length > 0) {
        query = query.or(`staff_id.eq.${user.id},team_id.in.(${myTeamIds.join(',')})`)
      } else {
        query = query.eq('staff_id', user.id)
      }

      const { data: upcomingBookings } = await query

      if (upcomingBookings && upcomingBookings.length > 0) {
        for (const booking of upcomingBookings) {
          const customerName = (booking.customers as any)?.full_name || 'ลูกค้า'
          const time = `${booking.start_time.slice(0, 5)}`

          const isMyBooking = (booking as any).staff_id === user.id
          const isMyTeamBooking = (booking as any).team_id && myTeamIds.includes((booking as any).team_id)
          const notificationType = isMyTeamBooking && !isMyBooking ? 'team' : 'personal'

          // Save to in-app notifications
          await supabase.from('notifications').insert({
            user_id: user.id,
            type: 'booking_reminder',
            title: notificationType === 'team' ? '👥 แจ้งเตือนงานทีม' : '⏰ แจ้งเตือนงาน',
            message: notificationType === 'team'
              ? `งานทีมกับ ${customerName} จะเริ่มในอีก 30 นาที (${time})`
              : `งานกับ ${customerName} จะเริ่มในอีก 30 นาที (${time})`,
            booking_id: booking.id,
            team_id: (booking as any).team_id || null,
          })

          await notificationService.notifyBookingReminder(
            customerName,
            time,
            booking.id,
            notificationType
          )
        }
      }
    }

    // Check every 5 minutes
    const interval = setInterval(scheduleReminders, 5 * 60 * 1000)

    // Check immediately
    scheduleReminders()

    return () => clearInterval(interval)
  }, [user, hasPermission, myTeamIds])

  return {
    hasPermission,
    isRequesting,
    requestPermission,
    isSupported: notificationService.isSupported(),
  }
}
