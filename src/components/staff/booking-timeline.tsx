import { useEffect, useState, useCallback } from 'react'
import { format } from 'date-fns'
import { th } from 'date-fns/locale'
import { CheckCircle2, Clock, XCircle, AlertCircle, Play } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { cn } from '@/lib/utils'

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

export function BookingTimeline({ bookingId }: BookingTimelineProps) {
  const [history, setHistory] = useState<StatusHistoryItem[]>([])
  const [loading, setLoading] = useState(true)

  const fetchStatusHistory = useCallback(async () => {
    try {
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
      setHistory((data as StatusHistoryItem[]) || [])
    } catch (error) {
      console.error('Error fetching status history:', error)
    } finally {
      setLoading(false)
    }
  }, [bookingId])

  useEffect(() => {
    fetchStatusHistory()
  }, [fetchStatusHistory])

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

  const getStatusText = (status: string) => {
    switch (status) {
      case 'completed':
        return 'เสร็จสิ้น'
      case 'confirmed':
        return 'ยืนยันแล้ว'
      case 'in_progress':
        return 'กำลังดำเนินการ'
      case 'pending':
        return 'รอยืนยัน'
      case 'cancelled':
        return 'ยกเลิก'
      default:
        return status
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'text-green-700 bg-green-50 border-green-200'
      case 'confirmed':
        return 'text-blue-700 bg-blue-50 border-blue-200'
      case 'in_progress':
        return 'text-purple-700 bg-purple-50 border-purple-200'
      case 'pending':
        return 'text-yellow-700 bg-yellow-50 border-yellow-200'
      case 'cancelled':
        return 'text-red-700 bg-red-50 border-red-200'
      default:
        return 'text-gray-700 bg-gray-50 border-gray-200'
    }
  }

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
        <p className="text-sm">ยังไม่มีประวัติการเปลี่ยนแปลง</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <h3 className="font-semibold flex items-center gap-2">
        <Clock className="h-4 w-4" />
        ประวัติการเปลี่ยนแปลง
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
                  getStatusColor(item.new_status)
                )}>
                  {item.old_status ? (
                    <>
                      {getStatusText(item.old_status)} → {getStatusText(item.new_status)}
                    </>
                  ) : (
                    <>สร้างการจอง - {getStatusText(item.new_status)}</>
                  )}
                </div>

                <div className="mt-2 text-xs text-muted-foreground space-y-1">
                  <p>
                    <span className="font-medium">
                      {Array.isArray(item.profiles)
                        ? item.profiles[0]?.full_name || 'ระบบ'
                        : item.profiles?.full_name || 'ระบบ'}
                    </span>
                    {' • '}
                    {format(new Date(item.created_at), 'dd MMM yyyy, HH:mm น.', { locale: th })}
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
