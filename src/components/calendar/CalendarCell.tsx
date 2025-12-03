/**
 * CalendarCell Component
 *
 * Modern calendar cell for each day in the calendar grid
 * Optimized with React.memo to reduce re-renders
 */

import React from 'react'
import { format, isSameMonth, isSameDay, isToday } from 'date-fns'
import type { Booking } from '@/types/booking'
import { STATUS_DOTS } from '@/constants/booking-status'
import { AlertTriangle, Plus } from 'lucide-react'
import { cn } from '@/lib/utils'

interface CalendarCellProps {
  day: Date
  currentDate: Date
  selectedDate: Date | null
  dayBookings: Booking[]
  conflictingBookingIds?: Set<string>
  onDateClick: (date: Date) => void
  onCreateBooking: (date: Date) => void
}

const CalendarCellComponent: React.FC<CalendarCellProps> = ({
  day,
  currentDate,
  selectedDate,
  dayBookings,
  conflictingBookingIds,
  onDateClick,
  onCreateBooking,
}) => {
  const isCurrentMonth = isSameMonth(day, currentDate)
  const isSelected = selectedDate ? isSameDay(day, selectedDate) : false
  const isTodayDate = isToday(day)

  // Check if this day has any conflicting bookings
  const hasConflicts = dayBookings.some(booking =>
    conflictingBookingIds?.has(booking.id)
  )

  // Generate accessible label for date cell
  const dateLabel = React.useMemo(() => {
    const parts = [format(day, 'MMMM d, yyyy')]

    if (isTodayDate) {
      parts.push('today')
    }

    if (dayBookings.length > 0) {
      parts.push(`${dayBookings.length} booking${dayBookings.length > 1 ? 's' : ''}`)
    }

    if (hasConflicts) {
      parts.push('has conflicts')
    }

    if (!isCurrentMonth) {
      parts.push('outside current month')
    }

    return parts.join(', ')
  }, [day, isTodayDate, dayBookings.length, hasConflicts, isCurrentMonth])

  // Memoize handlers to prevent re-creating on every render
  const handleDateClick = React.useCallback(() => {
    onDateClick(day)
  }, [onDateClick, day])

  const handleCreateClick = React.useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
    onCreateBooking(day)
  }, [onCreateBooking, day])

  return (
    <div
      role="button"
      tabIndex={0}
      aria-label={dateLabel}
      aria-pressed={isSelected}
      aria-current={isTodayDate ? 'date' : undefined}
      className={cn(
        'relative min-h-24 p-2 border rounded-xl transition-all duration-200 group cursor-pointer',
        'hover:shadow-md hover:scale-[1.02] hover:z-10',
        !isCurrentMonth && 'bg-muted/30 text-muted-foreground opacity-60',
        isCurrentMonth && 'bg-background',
        isSelected && 'ring-2 ring-tinedy-blue bg-blue-50/80 shadow-md',
        isTodayDate && !isSelected && 'ring-2 ring-tinedy-yellow bg-yellow-50/50',
        hasConflicts && 'ring-2 ring-red-500 bg-red-50/50'
      )}
      onClick={handleDateClick}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          handleDateClick()
        }
      }}
    >
      {/* Conflict warning badge */}
      {hasConflicts && (
        <div
          className="absolute -top-1.5 -right-1.5 bg-red-500 text-white rounded-full p-1 shadow-lg z-20 animate-pulse"
          title="Schedule conflicts detected"
        >
          <AlertTriangle className="h-3 w-3" />
        </div>
      )}

      {/* Header: Day number and booking count */}
      <div className="flex items-start justify-between mb-1">
        <div className={cn(
          'flex items-center justify-center w-7 h-7 rounded-full text-sm font-semibold transition-colors',
          isTodayDate && 'bg-tinedy-blue text-white',
          isSelected && !isTodayDate && 'bg-tinedy-blue/10 text-tinedy-blue'
        )}>
          {format(day, 'd')}
        </div>
        <div className="flex items-center gap-1">
          {dayBookings.length > 0 && (
            <span className={cn(
              'text-[10px] font-bold rounded-full px-1.5 py-0.5 min-w-[20px] text-center',
              isSelected ? 'bg-tinedy-blue text-white' : 'bg-tinedy-blue/10 text-tinedy-blue'
            )}>
              {dayBookings.length}
            </span>
          )}
          {/* Add Booking Button */}
          {isCurrentMonth && (
            <button
              type="button"
              onClick={handleCreateClick}
              aria-label={`Create booking for ${format(day, 'MMMM d, yyyy')}`}
              className={cn(
                'opacity-0 group-hover:opacity-100 transition-all duration-200',
                'w-5 h-5 rounded-full flex items-center justify-center',
                'bg-green-500 text-white hover:bg-green-600 hover:scale-110',
                'shadow-sm hover:shadow-md'
              )}
              title="Create booking"
            >
              <Plus className="h-3 w-3" />
            </button>
          )}
        </div>
      </div>

      {/* Booking preview - show first 2 with time */}
      {dayBookings.length > 0 && (
        <div className="space-y-1 mt-1">
          {dayBookings.slice(0, 2).map((booking) => (
            <div
              key={booking.id}
              className={cn(
                'flex items-center gap-1.5 text-[10px] py-0.5 px-1.5 rounded-md truncate',
                'bg-gray-50 hover:bg-gray-100 transition-colors'
              )}
              title={`${booking.start_time} - ${booking.customers?.full_name || 'No Customer'}`}
            >
              <div
                className={cn(
                  'w-2 h-2 rounded-full flex-shrink-0',
                  STATUS_DOTS[booking.status as keyof typeof STATUS_DOTS]
                )}
              />
              <span className="font-medium text-gray-600 truncate">
                {booking.start_time?.slice(0, 5)}
              </span>
            </div>
          ))}
          {dayBookings.length > 2 && (
            <span className="text-[10px] text-muted-foreground pl-1 font-medium">
              +{dayBookings.length - 2} more
            </span>
          )}
        </div>
      )}
    </div>
  )
}

// Memoize component เพื่อป้องกัน re-render ถ้า props ไม่เปลี่ยน
export const CalendarCell = React.memo(CalendarCellComponent, (prevProps, nextProps) => {
  // Custom comparison function - use shallow equality instead of reference equality

  // Check primitive/Date values first
  if (prevProps.day.getTime() !== nextProps.day.getTime() ||
      prevProps.currentDate.getTime() !== nextProps.currentDate.getTime() ||
      prevProps.selectedDate?.getTime() !== nextProps.selectedDate?.getTime() ||
      prevProps.dayBookings.length !== nextProps.dayBookings.length) {
    return false
  }

  // Check booking IDs (shallow comparison)
  for (let i = 0; i < prevProps.dayBookings.length; i++) {
    if (prevProps.dayBookings[i].id !== nextProps.dayBookings[i].id ||
        prevProps.dayBookings[i].status !== nextProps.dayBookings[i].status) {
      return false
    }
  }

  // Check conflictingBookingIds Set size and contents
  const prevConflicts = prevProps.conflictingBookingIds
  const nextConflicts = nextProps.conflictingBookingIds

  if (prevConflicts?.size !== nextConflicts?.size) {
    return false
  }

  // If both have conflicts, check if any booking in this cell has different conflict status
  if (prevConflicts && nextConflicts) {
    for (const booking of prevProps.dayBookings) {
      if (prevConflicts.has(booking.id) !== nextConflicts.has(booking.id)) {
        return false
      }
    }
  }

  // Check callback references
  if (prevProps.onDateClick !== nextProps.onDateClick ||
      prevProps.onCreateBooking !== nextProps.onCreateBooking) {
    return false
  }

  return true
})

CalendarCell.displayName = 'CalendarCell'
