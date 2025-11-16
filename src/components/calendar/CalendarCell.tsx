/**
 * CalendarCell Component
 *
 * แสดง cell สำหรับแต่ละวันใน calendar grid
 * Optimized with React.memo เพื่อลด re-renders
 */

import React from 'react'
import { format, isSameMonth, isSameDay, isToday } from 'date-fns'
import type { Booking } from '@/types/booking'
import { STATUS_DOTS } from '@/constants/booking-status'

interface CalendarCellProps {
  day: Date
  currentDate: Date
  selectedDate: Date | null
  dayBookings: Booking[]
  onDateClick: (date: Date) => void
  onCreateBooking: (date: Date) => void
}

const CalendarCellComponent: React.FC<CalendarCellProps> = ({
  day,
  currentDate,
  selectedDate,
  dayBookings,
  onDateClick,
  onCreateBooking,
}) => {
  const isCurrentMonth = isSameMonth(day, currentDate)
  const isSelected = selectedDate ? isSameDay(day, selectedDate) : false
  const isTodayDate = isToday(day)

  return (
    <div
      className={`
        relative min-h-20 p-2 border rounded-lg transition-all group
        ${!isCurrentMonth ? 'bg-muted/30 text-muted-foreground' : 'bg-background'}
        ${isSelected ? 'ring-2 ring-tinedy-blue bg-blue-50' : ''}
        ${isTodayDate && !isSelected ? 'ring-2 ring-tinedy-yellow' : ''}
        hover:bg-accent/50
      `}
      onClick={() => onDateClick(day)}
    >
      <div className="flex items-start justify-between">
        <span
          className={`text-sm font-medium ${
            isTodayDate ? 'text-tinedy-blue font-bold' : ''
          }`}
        >
          {format(day, 'd')}
        </span>
        <div className="flex items-center gap-1">
          {dayBookings.length > 0 && (
            <span className="text-xs bg-tinedy-blue text-white rounded-full px-1.5">
              {dayBookings.length}
            </span>
          )}
          {/* Add Booking Button */}
          {isCurrentMonth && (
            <button
              onClick={(e) => {
                e.stopPropagation()
                onCreateBooking(day)
              }}
              className="opacity-0 group-hover:opacity-100 transition-opacity text-xs bg-green-500 text-white rounded-full w-5 h-5 flex items-center justify-center hover:bg-green-600"
              title="Create booking"
            >
              +
            </button>
          )}
        </div>
      </div>

      {/* Booking dots */}
      {dayBookings.length > 0 && (
        <div className="mt-1 flex flex-wrap gap-1">
          {dayBookings.slice(0, 3).map((booking) => (
            <div
              key={booking.id}
              className={`w-2 h-2 rounded-full ${
                STATUS_DOTS[booking.status as keyof typeof STATUS_DOTS]
              }`}
              title={booking.service_packages?.name || 'Booking'}
            />
          ))}
          {dayBookings.length > 3 && (
            <span className="text-xs text-muted-foreground">
              +{dayBookings.length - 3}
            </span>
          )}
        </div>
      )}
    </div>
  )
}

// Memoize component เพื่อป้องกัน re-render ถ้า props ไม่เปลี่ยน
export const CalendarCell = React.memo(CalendarCellComponent, (prevProps, nextProps) => {
  // Custom comparison function
  return (
    prevProps.day.getTime() === nextProps.day.getTime() &&
    prevProps.currentDate.getTime() === nextProps.currentDate.getTime() &&
    prevProps.selectedDate?.getTime() === nextProps.selectedDate?.getTime() &&
    prevProps.dayBookings.length === nextProps.dayBookings.length &&
    prevProps.dayBookings === nextProps.dayBookings // Reference equality check for bookings array
  )
})

CalendarCell.displayName = 'CalendarCell'
