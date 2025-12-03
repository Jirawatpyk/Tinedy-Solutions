/**
 * BookingRealtimeProvider
 *
 * Centralized realtime subscription provider for bookings table.
 * This solves the duplicate subscription issue where multiple hooks
 * were creating separate channels for the same table.
 *
 * Features:
 * - Single subscription for bookings table changes
 * - Invalidates all booking queries on change
 * - Automatic cleanup on unmount
 *
 * Usage:
 * Wrap your app with this provider in App.tsx after QueryClientProvider
 */

import { useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { queryKeys } from '@/lib/query-keys'
import { logger } from '@/lib/logger'

interface BookingRealtimeProviderProps {
  children: React.ReactNode
}

export function BookingRealtimeProvider({ children }: BookingRealtimeProviderProps) {
  const queryClient = useQueryClient()

  useEffect(() => {
    logger.debug('Setting up single realtime subscription', {}, { context: 'BookingRealtimeProvider' })

    // Single channel for all booking changes
    const channel = supabase
      .channel('bookings-realtime-global')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'bookings',
        },
        (payload) => {
          logger.debug('Booking changed', { eventType: payload.eventType }, { context: 'BookingRealtimeProvider' })

          // Invalidate all booking queries - this will refetch any active queries
          queryClient.invalidateQueries({ queryKey: queryKeys.bookings.all })

          // Invalidate staff portal queries (staffBookings and staffCalendar)
          // This ensures Staff Portal hooks don't need their own realtime subscriptions
          queryClient.invalidateQueries({ queryKey: queryKeys.staffBookings.all })
          queryClient.invalidateQueries({ queryKey: queryKeys.staffCalendar.all })
        }
      )
      .subscribe()

    return () => {
      logger.debug('Cleanup subscription', {}, { context: 'BookingRealtimeProvider' })
      supabase.removeChannel(channel)
    }
  }, [queryClient])

  return <>{children}</>
}
