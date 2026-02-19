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
import { th } from 'date-fns/locale'
import { formatTime } from '@/lib/booking-utils'
import { formatDateRange } from '@/lib/date-range-utils'
import { StatusBadge, getBookingStatusVariant, getBookingStatusLabel } from '@/components/common/StatusBadge'

interface BookingDetailHeroProps {
  /** Booking start time (HH:MM:SS) */
  startTime: string
  /** Booking end time (HH:MM:SS) */
  endTime: string
  /** Booking date (YYYY-MM-DD) */
  date: string
  /** End date for multi-day bookings (YYYY-MM-DD), null for single-day */
  endDate?: string | null
  /** Booking status */
  status: string
}

export function BookingDetailHero({
  startTime,
  endTime,
  date,
  endDate,
  status,
}: BookingDetailHeroProps) {
  const bookingDate = new Date(`${date}T00:00:00`)
  const isMultiDay = !!endDate

  return (
    <div className="text-center py-4 px-4 bg-gradient-to-b from-primary/5 to-transparent">
      {/* Large time display */}
      <p className="text-3xl font-bold text-foreground tracking-tight">
        {formatTime(startTime)} - {formatTime(endTime)}
      </p>

      {/* Date — range for multi-day, day name for single-day */}
      <p className="text-sm text-muted-foreground mt-1">
        {isMultiDay
          ? formatDateRange(date, endDate)
          : format(bookingDate, 'EEEE, d MMMM yyyy', { locale: th })}
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
