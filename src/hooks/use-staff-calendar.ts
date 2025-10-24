import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/auth-context'
import { getErrorMessage } from '@/lib/error-utils'

interface BookingData {
  id: string
  booking_date: string
  start_time: string
  end_time: string
  status: string
  notes: string | null
  address: string | null
  city: string | null
  state: string | null
  zip_code: string | null
  staff_id: string | null
  team_id: string | null
  customers: {
    full_name: string
    phone: string
    avatar_url: string | null
  }[] | {
    full_name: string
    phone: string
    avatar_url: string | null
  } | null
  service_packages: {
    name: string
    duration_minutes: number
    price: number
  }[] | {
    name: string
    duration_minutes: number
    price: number
  } | null
  profiles: {
    full_name: string
  }[] | {
    full_name: string
  } | null
  teams: {
    name: string
  }[] | {
    name: string
  } | null
}

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
  staff_name: string | null
  team_name: string | null
}

export function useStaffCalendar() {
  const { user } = useAuth()
  const [events, setEvents] = useState<CalendarEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadEvents = useCallback(async () => {
    if (!user) return

    try {
      setLoading(true)
      setError(null)

      // Fetch bookings for the next 3 months
      const today = new Date()
      const threeMonthsLater = new Date()
      threeMonthsLater.setMonth(threeMonthsLater.getMonth() + 3)

      // First, get teams that this staff member belongs to
      const { data: teamMemberships } = await supabase
        .from('team_members')
        .select('team_id')
        .eq('staff_id', user.id)

      const teamIds = teamMemberships?.map(tm => tm.team_id) || []

      // Fetch bookings where staff_id matches OR team_id matches
      let query = supabase
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
          service_packages (name, duration_minutes, price),
          profiles (full_name),
          teams (name)
        `)
        .gte('booking_date', today.toISOString().split('T')[0])
        .lte('booking_date', threeMonthsLater.toISOString().split('T')[0])
        .order('booking_date', { ascending: true })

      // Filter by staff_id OR team_id using OR condition
      if (teamIds.length > 0) {
        query = query.or(`staff_id.eq.${user.id},team_id.in.(${teamIds.join(',')})`)
      } else {
        query = query.eq('staff_id', user.id)
      }

      const { data, error: fetchError } = await query

      if (fetchError) throw fetchError

      // Transform bookings to calendar events
      const calendarEvents: CalendarEvent[] = (data as BookingData[] || []).map((booking) => {
        const [hours, minutes] = booking.start_time.split(':')
        const startDate = new Date(booking.booking_date)
        startDate.setHours(parseInt(hours), parseInt(minutes), 0, 0)

        // Handle customers as array or single object
        const customer = Array.isArray(booking.customers) ? booking.customers[0] : booking.customers

        // Handle service_packages as array or single object
        const servicePackage = Array.isArray(booking.service_packages)
          ? booking.service_packages[0]
          : booking.service_packages

        // Handle profiles (staff) as array or single object
        const profile = Array.isArray(booking.profiles) ? booking.profiles[0] : booking.profiles

        // Handle teams as array or single object
        const team = Array.isArray(booking.teams) ? booking.teams[0] : booking.teams

        const duration = servicePackage?.duration_minutes || 60
        const endDate = new Date(startDate)
        endDate.setMinutes(endDate.getMinutes() + duration)

        return {
          id: booking.id,
          title: `${customer?.full_name || 'Unknown'} - ${servicePackage?.name || 'Unknown Service'}`,
          start: startDate,
          end: endDate,
          status: booking.status,
          customer_name: customer?.full_name || 'Unknown Customer',
          customer_phone: customer?.phone || '',
          customer_avatar: customer?.avatar_url || null,
          service_name: servicePackage?.name || 'Unknown Service',
          service_price: servicePackage?.price || 0,
          service_duration: servicePackage?.duration_minutes || 60,
          notes: booking.notes,
          booking_id: booking.id,
          address: booking.address || '',
          city: booking.city || '',
          state: booking.state || '',
          zip_code: booking.zip_code || '',
          staff_id: booking.staff_id || null,
          team_id: booking.team_id || null,
          staff_name: profile?.full_name || null,
          team_name: team?.name || null,
        }
      })

      setEvents(calendarEvents)
    } catch (err) {
      console.error('Error loading calendar events:', err)
      setError(getErrorMessage(err))
    } finally {
      setLoading(false)
    }
  }, [user])

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
  }, [user, loadEvents])

  return {
    events,
    loading,
    error,
    refresh: loadEvents,
  }
}
