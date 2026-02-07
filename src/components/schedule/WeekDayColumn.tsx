/**
 * WeekDayColumn Component
 *
 * แสดง column สำหรับแต่ละวันใน Weekly Schedule
 * Optimized with React.memo เพื่อลด re-renders
 */

import React from 'react'
import { format } from 'date-fns'
import type { Booking } from '@/types'
import { BookingBar } from './BookingBar'

const TIME_SLOTS = [
  '08:00', '09:00', '10:00', '11:00', '12:00', '13:00',
  '14:00', '15:00', '16:00', '17:00', '18:00', '19:00', '20:00',
]

interface WeekDayColumnProps {
  day: string
  dayIndex: number
  date: Date | undefined
  isToday: boolean
  dayBookings: Booking[]
  bookingLayouts: Array<{
    booking: Booking
    column: number
    totalColumns: number
  }>
  calculateBookingPosition: (startTime: string, endTime: string) => { top: string; height: string }
  onBookingClick: (booking: Booking) => void
}

const WeekDayColumnComponent: React.FC<WeekDayColumnProps> = ({
  day,
  date,
  isToday,
  dayBookings,
  bookingLayouts,
  calculateBookingPosition,
  onBookingClick,
}) => {
  const dateStr = date ? format(date, 'MMM d') : ''

  return (
    <div className="flex-1 min-w-[80px] sm:min-w-[100px] lg:min-w-[120px]">
      {/* Day header */}
      <div className={`h-10 sm:h-12 border-b text-center font-medium text-xs sm:text-sm text-muted-foreground flex flex-col items-center justify-center px-1 ${isToday ? 'bg-tinedy-blue/10 border-tinedy-blue' : ''}`}>
        <div className={`text-[10px] sm:text-xs ${isToday ? 'text-tinedy-blue font-bold' : ''}`}>{day.substring(0, 3)}</div>
        <div className={`text-[9px] sm:text-[10px] font-semibold ${isToday ? 'text-tinedy-blue' : 'text-muted-foreground'}`}>
          {dateStr}
        </div>
      </div>

      {/* Timeline area */}
      <div className={`relative border-r ${isToday ? 'bg-tinedy-blue/5' : 'bg-tinedy-off-white/30'}`} style={{ height: '500px' }}>
        {/* Hour lines */}
        {TIME_SLOTS.map((_, index) => (
          <div
            key={index}
            className="absolute w-full border-t border-gray-200"
            style={{ top: `${(index / TIME_SLOTS.length) * 100}%` }}
          />
        ))}

        {/* Booking bars */}
        {dayBookings.length === 0 ? (
          <div className="absolute inset-0 flex items-center justify-center px-1">
            <p className="text-[9px] sm:text-[10px] text-muted-foreground text-center">No bookings</p>
          </div>
        ) : (
          bookingLayouts.map((layout) => {
            const { booking, column, totalColumns } = layout
            const position = calculateBookingPosition(
              booking.start_time,
              booking.end_time
            )

            return (
              <BookingBar
                key={booking.id}
                booking={booking}
                column={column}
                totalColumns={totalColumns}
                top={position.top}
                height={position.height}
                onClick={onBookingClick}
              />
            )
          })
        )}
      </div>
    </div>
  )
}

// Memoize component เพื่อป้องกัน re-render ถ้า props ไม่เปลี่ยน
export const WeekDayColumn = React.memo(WeekDayColumnComponent, (prevProps, nextProps) => {
  // Custom comparison function
  return (
    prevProps.day === nextProps.day &&
    prevProps.dayIndex === nextProps.dayIndex &&
    prevProps.date?.getTime() === nextProps.date?.getTime() &&
    prevProps.isToday === nextProps.isToday &&
    prevProps.dayBookings.length === nextProps.dayBookings.length &&
    prevProps.dayBookings === nextProps.dayBookings && // Reference equality check
    prevProps.bookingLayouts === nextProps.bookingLayouts // Reference equality check
  )
})

WeekDayColumn.displayName = 'WeekDayColumn'
