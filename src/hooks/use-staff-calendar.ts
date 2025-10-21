import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/auth-context'

export interface CalendarEvent {
  id: string
  title: string
  start: Date
  end: Date
  status: string
  customer_name: string
  customer_phone: string
  customer_avatar: string | null
  service_name: string
  service_price: number
  service_duration: number
  notes: string | null
  booking_id: string
  address: string
  city: string
  state: string
  zip_code: string
  staff_id: string | null
  team_id: string | null
}

export function useStaffCalendar() {
  const { user } = useAuth()
  const [events, setEvents] = useState<CalendarEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!user) return

    loadEvents()

    // Real-time subscription for booking changes
    const channel = supabase
      .channel('staff-calendar')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'bookings',
          filter: `staff_id=eq.${user.id}`,
        },
        () => {
          loadEvents()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [user])

  async function loadEvents() {
    if (!user) return

    try {
      setLoading(true)
      setError(null)

      // Fetch bookings for the next 3 months
      const today = new Date()
      const threeMonthsLater = new Date()
      threeMonthsLater.setMonth(threeMonthsLater.getMonth() + 3)

      const { data, error: fetchError } = await supabase
        .from('bookings')
        .select(`
          id,
          booking_date,
          start_time,
          end_time,
          status,
          notes,
          address,
          city,
          state,
          zip_code,
          staff_id,
          team_id,
          customers (full_name, phone, avatar_url),
          service_packages (name, duration_minutes, price)
        `)
        .eq('staff_id', user.id)
        .gte('booking_date', today.toISOString().split('T')[0])
        .lte('booking_date', threeMonthsLater.toISOString().split('T')[0])
        .order('booking_date', { ascending: true })

      if (fetchError) throw fetchError

      // Transform bookings to calendar events
      const calendarEvents: CalendarEvent[] = (data || []).map((booking: any) => {
        const [hours, minutes] = booking.start_time.split(':')
        const startDate = new Date(booking.booking_date)
        startDate.setHours(parseInt(hours), parseInt(minutes), 0, 0)

        const duration = booking.service_packages?.duration_minutes || 60
        const endDate = new Date(startDate)
        endDate.setMinutes(endDate.getMinutes() + duration)

        return {
          id: booking.id,
          title: `${booking.customers?.full_name || 'Unknown'} - ${booking.service_packages?.name || 'Unknown Service'}`,
          start: startDate,
          end: endDate,
          status: booking.status,
          customer_name: booking.customers?.full_name || 'Unknown Customer',
          customer_phone: booking.customers?.phone || '',
          customer_avatar: booking.customers?.avatar_url || null,
          service_name: booking.service_packages?.name || 'Unknown Service',
          service_price: booking.service_packages?.price || 0,
          service_duration: booking.service_packages?.duration_minutes || 60,
          notes: booking.notes,
          booking_id: booking.id,
          address: booking.address || '',
          city: booking.city || '',
          state: booking.state || '',
          zip_code: booking.zip_code || '',
          staff_id: booking.staff_id || null,
          team_id: booking.team_id || null,
        }
      })

      setEvents(calendarEvents)
    } catch (err: any) {
      console.error('Error loading calendar events:', err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return {
    events,
    loading,
    error,
    refresh: loadEvents,
  }
}
