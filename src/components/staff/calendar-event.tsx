import { type CalendarEvent } from '@/hooks/use-staff-calendar'
import { Badge } from '@/components/ui/badge'

interface CalendarEventComponentProps {
  event: CalendarEvent
}

export function CalendarEventComponent({ event }: CalendarEventComponentProps) {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-500 border-green-600'
      case 'confirmed':
        return 'bg-blue-500 border-blue-600'
      case 'pending':
        return 'bg-yellow-500 border-yellow-600'
      case 'cancelled':
        return 'bg-red-500 border-red-600'
      default:
        return 'bg-gray-500 border-gray-600'
    }
  }

  const getStatusText = (status: string) => {
    switch (status) {
      case 'completed':
        return 'Completed'
      case 'confirmed':
        return 'Confirmed'
      case 'pending':
        return 'Pending'
      case 'cancelled':
        return 'Cancelled'
      default:
        return status
    }
  }

  return (
    <div className="text-xs p-1 h-full overflow-hidden">
      <div className={`rounded px-2 py-1 h-full border-l-4 ${getStatusColor(event.status)} text-white`}>
        <div className="font-semibold truncate">{event.customer_name}</div>
        <div className="truncate opacity-90">{event.service_name}</div>
        <Badge
          variant="secondary"
          className="mt-1 text-[10px] h-4 px-1 bg-white/20 text-white border-white/30"
        >
          {getStatusText(event.status)}
        </Badge>
      </div>
    </div>
  )
}
