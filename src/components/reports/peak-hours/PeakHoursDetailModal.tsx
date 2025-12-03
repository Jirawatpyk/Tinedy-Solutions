import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Calendar, Clock } from 'lucide-react'
import type { PeakHourData, DayOfWeek } from './types'

interface PeakHoursDetailModalProps {
  data: PeakHourData | null
  open: boolean
  onClose: () => void
}

const DAY_NAMES: Record<DayOfWeek, string> = {
  Sun: 'Sunday',
  Mon: 'Monday',
  Tue: 'Tuesday',
  Wed: 'Wednesday',
  Thu: 'Thursday',
  Fri: 'Friday',
  Sat: 'Saturday',
}

export function PeakHoursDetailModal({ data, open, onClose }: PeakHoursDetailModalProps) {
  if (!data) return null

  const formattedTime = `${data.hour.toString().padStart(2, '0')}:00`
  const endHour = data.hour + 1
  const formattedEndTime = `${endHour.toString().padStart(2, '0')}:00`
  const dayName = DAY_NAMES[data.day as DayOfWeek] || data.day

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Calendar className="h-5 w-5 text-tinedy-blue" />
            Peak Hour Details
          </DialogTitle>
          <DialogDescription>
            Booking information for the selected time slot
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 pt-4">
          {/* Day */}
          <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium text-muted-foreground">Day</span>
            </div>
            <span className="font-semibold text-tinedy-dark">{dayName}</span>
          </div>

          {/* Time Range */}
          <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium text-muted-foreground">Time Range</span>
            </div>
            <span className="font-semibold text-tinedy-dark">
              {formattedTime} - {formattedEndTime}
            </span>
          </div>

          {/* Booking Count */}
          <div className="p-4 bg-tinedy-green/10 border-2 border-tinedy-green/30 rounded-lg">
            <div className="text-center">
              <p className="text-sm text-muted-foreground mb-2">Total Bookings</p>
              <div className="flex items-center justify-center gap-2">
                <span className="text-4xl font-bold text-tinedy-green">{data.count}</span>
                <Badge variant="secondary" className="text-xs">
                  {data.count === 1 ? 'booking' : 'bookings'}
                </Badge>
              </div>
            </div>
          </div>

          {/* Info Message */}
          <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-xs text-blue-800">
              This time slot shows the total number of bookings scheduled during{' '}
              <span className="font-semibold">{formattedTime}</span> on{' '}
              <span className="font-semibold">{dayName}s</span> within the selected date range.
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
