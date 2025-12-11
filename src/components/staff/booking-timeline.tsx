import { useEffect, useState, useCallback } from 'react'
import { format } from 'date-fns'
import { enUS } from 'date-fns/locale'
import { CheckCircle2, Clock, XCircle, AlertCircle, Play } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { cn } from '@/lib/utils'
import { createLogger } from '@/lib/logger'
import { getBookingStatusLabel } from '@/components/common/StatusBadge'
import { BOOKING_STATUS_CARD_COLORS, type BookingStatus } from '@/constants/booking-status'

const logger = createLogger('BookingTimeline')

interface StatusHistoryItem {
  id: string
  booking_id: string
  changed_by: string
  old_status: string | null
  new_status: string
  notes: string | null
  created_at: string
  profiles: {
    full_name: string
  } | null | { full_name: string }[]
}

interface BookingTimelineProps {
  bookingId: string
}

// Simple cache: { bookingId: { data: history[], timestamp: number } }
const timelineCache = new Map<string, { data: StatusHistoryItem[], timestamp: number }>()
const CACHE_DURATION = 30000 // 30 seconds

export function BookingTimeline({ bookingId }: BookingTimelineProps) {
  const [history, setHistory] = useState<StatusHistoryItem[]>([])
  const [loading, setLoading] = useState(true)

  const fetchStatusHistory = useCallback(async () => {
    try {
      // Check cache first
      const cached = timelineCache.get(bookingId)
      const now = Date.now()

      if (cached && (now - cached.timestamp) < CACHE_DURATION) {
        logger.debug('Using cached data', { bookingId })
        setHistory(cached.data)
        setLoading(false)
        return
      }

      logger.debug('Fetching fresh data', { bookingId })
      setLoading(true)

      const { data, error } = await supabase
        .from('booking_status_history')
        .select(`
          id,
          booking_id,
          changed_by,
          old_status,
          new_status,
          notes,
          created_at,
          profiles:changed_by(full_name)
        `)
        .eq('booking_id', bookingId)
        .order('created_at', { ascending: false })

      if (error) throw error

      const historyData = (data as StatusHistoryItem[]) || []
      setHistory(historyData)

      // Update cache
      timelineCache.set(bookingId, {
        data: historyData,
        timestamp: now
      })
    } catch (error) {
      console.error('Error fetching status history:', error)
    } finally {
      setLoading(false)
    }
  }, [bookingId])

  useEffect(() => {
    fetchStatusHistory()

    // Subscribe to real-time updates
    const channel = supabase
      .channel(`booking-status-history:${bookingId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'booking_status_history',
          filter: `booking_id=eq.${bookingId}`,
        },
        (payload) => {
          logger.debug('Real-time update received', { payload })
          // Clear cache and refetch
          timelineCache.delete(bookingId)
          setTimeout(() => {
            fetchStatusHistory()
          }, 1000)
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [fetchStatusHistory, bookingId])

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle2 className="h-5 w-5 text-green-600" />
      case 'confirmed':
        return <CheckCircle2 className="h-5 w-5 text-blue-600" />
      case 'in_progress':
        return <Play className="h-5 w-5 text-purple-600" />
      case 'pending':
        return <Clock className="h-5 w-5 text-yellow-600" />
      case 'cancelled':
        return <XCircle className="h-5 w-5 text-red-600" />
      default:
        return <AlertCircle className="h-5 w-5 text-gray-600" />
    }
  }

  // ใช้ getBookingStatusLabel จาก StatusBadge แทน custom function
  // ใช้ BOOKING_STATUS_CARD_COLORS จาก constants แทน local getStatusColor

  if (loading) {
    return (
      <div className="space-y-3">
        <div className="h-4 w-32 bg-gray-200 rounded animate-pulse" />
        <div className="h-20 bg-gray-100 rounded animate-pulse" />
      </div>
    )
  }

  if (history.length === 0) {
    return (
      <div className="text-center py-6 text-muted-foreground">
        <Clock className="h-8 w-8 mx-auto mb-2 opacity-50" />
        <p className="text-sm">No change history yet</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <h3 className="font-semibold flex items-center gap-2">
        <Clock className="h-4 w-4" />
        Change History
      </h3>

      <div className="space-y-3">
        {history.map((item, index) => (
          <div key={item.id} className="relative">
            {/* Timeline line */}
            {index < history.length - 1 && (
              <div className="absolute left-[10px] top-8 bottom-[-12px] w-0.5 bg-gray-200" />
            )}

            <div className="flex gap-3">
              {/* Icon */}
              <div className="relative z-10 flex-shrink-0">
                {getStatusIcon(item.new_status)}
              </div>

              {/* Content */}
              <div className="flex-1 pb-4">
                <div className={cn(
                  "inline-block px-3 py-1.5 rounded-md text-sm font-medium border",
                  BOOKING_STATUS_CARD_COLORS[item.new_status as BookingStatus] || 'bg-gray-50 border-gray-200'
                )}>
                  {item.old_status ? (
                    <>
                      {getBookingStatusLabel(item.old_status)} → {getBookingStatusLabel(item.new_status)}
                    </>
                  ) : (
                    <>Created Booking - {getBookingStatusLabel(item.new_status)}</>
                  )}
                </div>

                <div className="mt-2 text-xs text-muted-foreground space-y-1">
                  <p>
                    <span className="font-medium">
                      {Array.isArray(item.profiles)
                        ? item.profiles[0]?.full_name || 'System'
                        : item.profiles?.full_name || 'System'}
                    </span>
                    {' • '}
                    {format(new Date(item.created_at), 'dd MMM yyyy, HH:mm', { locale: enUS })}
                  </p>
                  {item.notes && (
                    <p className="text-gray-600 italic">"{item.notes}"</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
