/**
 * BookingDetailHero Component
 *
 * Hero section for booking details showing:
 * - Large time display
 * - Date with day name
 * - Status badge
 *
 * @example
 * ```tsx
 * <BookingDetailHero
 *   startTime="09:00:00"
 *   endTime="11:00:00"
 *   date="2025-01-30"
 *   status="confirmed"
 * />
 * ```
 *
 * @see BookingDetailContent - Parent component that uses this
 */

import { format } from 'date-fns'
import { enUS } from 'date-fns/locale'
import { formatTime } from '@/lib/booking-utils'
import { StatusBadge, getBookingStatusVariant, getBookingStatusLabel } from '@/components/common/StatusBadge'

interface BookingDetailHeroProps {
  /** Booking start time (HH:MM:SS) */
  startTime: string
  /** Booking end time (HH:MM:SS) */
  endTime: string
  /** Booking date (YYYY-MM-DD) */
  date: string
  /** Booking status */
  status: string
}

export function BookingDetailHero({
  startTime,
  endTime,
  date,
  status,
}: BookingDetailHeroProps) {
  const bookingDate = new Date(date)

  return (
    <div className="text-center py-4 px-4 bg-gradient-to-b from-primary/5 to-transparent">
      {/* Large time display */}
      <p className="text-3xl font-bold text-foreground tracking-tight">
        {formatTime(startTime)} - {formatTime(endTime)}
      </p>

      {/* Date with day name */}
      <p className="text-sm text-muted-foreground mt-1">
        {format(bookingDate, 'EEEE, d MMMM yyyy', { locale: enUS })}
      </p>

      {/* Status badge */}
      <div className="mt-3">
        <StatusBadge
          variant={getBookingStatusVariant(status)}
          className="text-sm px-3 py-1"
        >
          {getBookingStatusLabel(status)}
        </StatusBadge>
      </div>
    </div>
  )
}
