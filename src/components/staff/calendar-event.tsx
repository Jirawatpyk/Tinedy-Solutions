import { type CalendarEvent } from '@/lib/queries/staff-calendar-queries'
import { Badge } from '@/components/ui/badge'
import { BOOKING_STATUS_COLORS_CALENDAR, BOOKING_STATUS_LABELS, type BookingStatus } from '@/constants/booking-status'

interface CalendarEventComponentProps {
  event: CalendarEvent
}

export function CalendarEventComponent({ event }: CalendarEventComponentProps) {
  const statusColor = BOOKING_STATUS_COLORS_CALENDAR[event.status as BookingStatus] || 'bg-tinedy-dark/60 border-tinedy-dark/80'
  const statusLabel = BOOKING_STATUS_LABELS[event.status as BookingStatus] || event.status

  return (
    <div className="text-xs p-1 h-full overflow-hidden">
      <div className={`rounded px-2 py-1 h-full border-l-4 ${statusColor} text-white`}>
        <div className="font-semibold truncate">{event.customer_name}</div>
        <div className="truncate opacity-90">{event.service_name}</div>
        <Badge
          variant="secondary"
          className="mt-1 text-[10px] h-4 px-1 bg-white/20 text-white border-white/30"
        >
          {statusLabel}
        </Badge>
      </div>
    </div>
  )
}
