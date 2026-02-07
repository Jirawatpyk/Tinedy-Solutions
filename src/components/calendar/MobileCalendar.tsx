/**
 * MobileCalendar Component
 *
 * Mobile-optimized Calendar view
 * - Week strip selector instead of full month grid
 * - Swipe navigation support
 * - Touch-friendly UI
 * - Booking list displayed below calendar
 */

import React, { useState, useCallback, useMemo, useEffect } from 'react'
import {
  format,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  addWeeks,
  subWeeks,
  isSameDay,
  isToday,
  startOfMonth,
  endOfMonth,
  addMonths,
  subMonths,
} from 'date-fns'
import { enUS } from 'date-fns/locale'
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { useSwipe } from '@/hooks/use-swipe'
import type { Booking } from '@/types/booking'
import { MobileBookingCard } from './MobileBookingCard'
import { cn } from '@/lib/utils'

interface MobileCalendarProps {
  currentDate: Date
  selectedDate: Date | null
  bookings: Booking[]
  conflictMap: Map<string, Set<string>>
  bookingsByDate: Map<string, Booking[]>
  onDateSelect: (date: Date) => void
  onMonthChange: (date: Date) => void
  onBookingClick: (booking: Booking) => void
  onCreateBooking: (date: Date) => void
  onStatusChange: (bookingId: string, newStatus: string) => Promise<void>
  getAvailableStatuses: (currentStatus: string) => string[]
  /** Hide create booking button (for Staff Portal) */
  hideCreateButton?: boolean
  /** Hide payment status badge (for Staff Portal) */
  hidePaymentStatus?: boolean
}

type ViewMode = 'week' | 'month'

export const MobileCalendar: React.FC<MobileCalendarProps> = React.memo(({
  currentDate,
  selectedDate,
  bookings: _bookings,
  conflictMap,
  bookingsByDate,
  onDateSelect,
  onMonthChange,
  onBookingClick,
  onCreateBooking,
  onStatusChange,
  getAvailableStatuses,
  hideCreateButton = false,
  hidePaymentStatus = false,
}) => {
  const [viewMode, setViewMode] = useState<ViewMode>('week')
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date(), { weekStartsOn: 0 }))

  // Sync weekStart with currentDate when switching to week view or when currentDate changes
  useEffect(() => {
    if (viewMode === 'week') {
      setWeekStart(startOfWeek(currentDate, { weekStartsOn: 0 }))
    }
  }, [currentDate, viewMode])

  // Week days
  const weekDays = useMemo(() => {
    const weekEnd = endOfWeek(weekStart, { weekStartsOn: 0 })
    return eachDayOfInterval({ start: weekStart, end: weekEnd })
  }, [weekStart])

  // Month days (for month view)
  const monthDays = useMemo(() => {
    const monthStart = startOfMonth(currentDate)
    const monthEnd = endOfMonth(currentDate)
    const calendarStart = startOfWeek(monthStart, { weekStartsOn: 0 })
    const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 0 })
    return eachDayOfInterval({ start: calendarStart, end: calendarEnd })
  }, [currentDate])

  // Get bookings for selected date
  const selectedDateBookings = useMemo(() => {
    if (!selectedDate) return []
    const dateKey = format(selectedDate, 'yyyy-MM-dd')
    return bookingsByDate.get(dateKey) || []
  }, [selectedDate, bookingsByDate])

  // Navigation handlers
  const goToNextWeek = useCallback(() => {
    setWeekStart(prev => addWeeks(prev, 1))
  }, [])

  const goToPreviousWeek = useCallback(() => {
    setWeekStart(prev => subWeeks(prev, 1))
  }, [])

  const goToNextMonth = useCallback(() => {
    onMonthChange(addMonths(currentDate, 1))
  }, [currentDate, onMonthChange])

  const goToPreviousMonth = useCallback(() => {
    onMonthChange(subMonths(currentDate, 1))
  }, [currentDate, onMonthChange])

  const goToToday = useCallback(() => {
    const today = new Date()
    setWeekStart(startOfWeek(today, { weekStartsOn: 0 }))
    onDateSelect(today)
    onMonthChange(today)
  }, [onDateSelect, onMonthChange])

  // View mode handlers
  const handleSetWeekView = useCallback(() => {
    setViewMode('week')
  }, [])

  const handleSetMonthView = useCallback(() => {
    setViewMode('month')
  }, [])

  // Date selection handlers with useCallback to prevent recreation in loops
  const handleDateClick = useCallback((date: Date) => {
    onDateSelect(date)
  }, [onDateSelect])

  const handleCreateBookingClick = useCallback((date: Date) => {
    onCreateBooking(date)
  }, [onCreateBooking])

  // Swipe handlers - use higher threshold (80px) to prevent accidental swipes
  const swipeHandlers = useSwipe({
    threshold: 80,
    onSwipeLeft: viewMode === 'week' ? goToNextWeek : goToNextMonth,
    onSwipeRight: viewMode === 'week' ? goToPreviousWeek : goToPreviousMonth,
  })

  // Get booking count for a date
  const getBookingCount = useCallback((date: Date) => {
    const dateKey = format(date, 'yyyy-MM-dd')
    return bookingsByDate.get(dateKey)?.length || 0
  }, [bookingsByDate])

  // Check if date has conflicts
  const hasConflicts = useCallback((date: Date) => {
    const dateKey = format(date, 'yyyy-MM-dd')
    const dayBookings = bookingsByDate.get(dateKey) || []
    return dayBookings.some(b => conflictMap.has(b.id))
  }, [bookingsByDate, conflictMap])

  return (
    <div className="flex flex-col h-full" {...swipeHandlers}>
      {/* Header with Navigation - Simplified, no Card wrapper */}
      <div className="bg-background border-b">
        <div className="py-3 px-4">
          {/* Navigation Row - Inline arrows with title */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                onClick={viewMode === 'week' ? goToPreviousWeek : goToPreviousMonth}
                className="h-9 w-9"
                aria-label={viewMode === 'week' ? 'Go to previous week' : 'Go to previous month'}
              >
                <ChevronLeft className="h-5 w-5" />
              </Button>
              <h2 className="font-display font-semibold text-xl min-w-[140px] text-center">
                {viewMode === 'week'
                  ? format(weekStart, 'MMM yyyy', { locale: enUS })
                  : format(currentDate, 'MMMM yyyy', { locale: enUS })
                }
              </h2>
              <Button
                variant="ghost"
                size="icon"
                onClick={viewMode === 'week' ? goToNextWeek : goToNextMonth}
                className="h-9 w-9"
                aria-label={viewMode === 'week' ? 'Go to next week' : 'Go to next month'}
              >
                <ChevronRight className="h-5 w-5" />
              </Button>
            </div>

            {/* View Toggle & Today */}
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={goToToday}
                className="h-8 px-3 text-xs"
                aria-label="Go to today"
              >
                Today
              </Button>
              <div className="flex border rounded-md" role="group" aria-label="Calendar view mode">
                <Button
                  variant={viewMode === 'week' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={handleSetWeekView}
                  className="h-8 px-2 rounded-r-none text-xs"
                  aria-label="Switch to week view"
                  aria-pressed={viewMode === 'week'}
                >
                  Wk
                </Button>
                <Button
                  variant={viewMode === 'month' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={handleSetMonthView}
                  className="h-8 px-2 rounded-l-none border-l text-xs"
                  aria-label="Switch to month view"
                  aria-pressed={viewMode === 'month'}
                >
                  Mo
                </Button>
              </div>
            </div>
          </div>
        </div>

        <div className="px-2 pb-3">
          {viewMode === 'week' ? (
            /* Week Strip View */
            <div className="flex gap-1" role="group" aria-label="Week days">
              {weekDays.map((day) => {
                const isSelected = selectedDate ? isSameDay(day, selectedDate) : false
                const isTodayDate = isToday(day)
                const bookingCount = getBookingCount(day)
                const hasConflict = hasConflicts(day)
                const dateLabel = format(day, 'EEEE, MMMM d, yyyy')

                return (
                  <button
                    key={day.toISOString()}
                    type="button"
                    onClick={() => handleDateClick(day)}
                    className={cn(
                      'flex-1 flex flex-col items-center py-2 px-1 rounded-lg transition-all',
                      isSelected
                        ? 'bg-tinedy-blue text-white shadow-md'
                        : isTodayDate
                          ? 'bg-tinedy-yellow/20 border-2 border-tinedy-yellow'
                          : 'bg-tinedy-off-white/50 hover:bg-tinedy-off-white',
                      hasConflict && !isSelected && 'ring-2 ring-red-400'
                    )}
                    aria-label={`${dateLabel}, ${bookingCount} booking${bookingCount !== 1 ? 's' : ''}${hasConflict ? ', has conflicts' : ''}`}
                    aria-current={isSelected ? 'date' : undefined}
                  >
                    <span className="text-xs font-medium opacity-70" aria-hidden="true">
                      {format(day, 'EEE')}
                    </span>
                    <span className={cn(
                      'text-lg font-bold',
                      isTodayDate && !isSelected && 'text-tinedy-blue'
                    )} aria-hidden="true">
                      {format(day, 'd')}
                    </span>
                    {bookingCount > 0 && (
                      <Badge
                        variant={isSelected ? 'secondary' : 'default'}
                        className={cn(
                          'text-[10px] px-1.5 py-0 mt-1 h-4',
                          isSelected ? 'bg-white/20 text-white' : 'bg-tinedy-blue text-white'
                        )}
                        aria-hidden="true"
                      >
                        {bookingCount}
                      </Badge>
                    )}
                  </button>
                )
              })}
            </div>
          ) : (
            /* Compact Month Grid View */
            <div className="grid grid-cols-7 gap-0.5" role="group" aria-label="Month calendar">
              {/* Day Headers */}
              {['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'].map((dayName, i) => (
                <div
                  key={i}
                  className="text-center text-xs font-medium text-muted-foreground py-1"
                  aria-label={dayName}
                >
                  {dayName.charAt(0)}
                </div>
              ))}

              {/* Days */}
              {monthDays.map((day) => {
                const isSelected = selectedDate ? isSameDay(day, selectedDate) : false
                const isTodayDate = isToday(day)
                const isCurrentMonth = day.getMonth() === currentDate.getMonth()
                const bookingCount = getBookingCount(day)
                const hasConflict = hasConflicts(day)
                const dateLabel = format(day, 'EEEE, MMMM d, yyyy')

                return (
                  <button
                    key={day.toISOString()}
                    type="button"
                    onClick={() => handleDateClick(day)}
                    className={cn(
                      'aspect-square flex flex-col items-center justify-center rounded-md text-xs transition-all relative',
                      !isCurrentMonth && 'opacity-30',
                      isSelected
                        ? 'bg-tinedy-blue text-white'
                        : isTodayDate
                          ? 'bg-tinedy-yellow/30 font-bold'
                          : 'hover:bg-tinedy-off-white',
                      hasConflict && !isSelected && 'ring-1 ring-red-400'
                    )}
                    aria-label={`${dateLabel}, ${bookingCount} booking${bookingCount !== 1 ? 's' : ''}${hasConflict ? ', has conflicts' : ''}${!isCurrentMonth ? ', outside current month' : ''}`}
                    aria-current={isSelected ? 'date' : undefined}
                  >
                    <span className={cn(
                      'font-medium',
                      isTodayDate && !isSelected && 'text-tinedy-blue'
                    )} aria-hidden="true">
                      {format(day, 'd')}
                    </span>
                    {bookingCount > 0 && (
                      <div
                        className={cn(
                          'absolute bottom-0.5 w-1.5 h-1.5 rounded-full',
                          isSelected ? 'bg-white' : 'bg-tinedy-blue'
                        )}
                        aria-hidden="true"
                      />
                    )}
                  </button>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* Selected Date Bookings */}
      <div className="flex-1 overflow-hidden">
        <div className="px-4 py-3 border-b bg-gray-50 flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-sm">
              {selectedDate
                ? format(selectedDate, 'EEEE, MMMM d', { locale: enUS })
                : 'Select a date'
              }
            </h3>
            {selectedDate && (
              <p className="text-xs text-muted-foreground">
                {selectedDateBookings.length} booking{selectedDateBookings.length !== 1 ? 's' : ''}
              </p>
            )}
          </div>
          {selectedDate && !hideCreateButton && (
            <Button
              size="sm"
              onClick={() => handleCreateBookingClick(selectedDate)}
              className="h-8"
              aria-label="Add new booking"
            >
              <Plus className="h-4 w-4 mr-1" />
              Add
            </Button>
          )}
        </div>

        <ScrollArea className="h-[calc(100%-60px)]">
          <div className="p-4 space-y-3">
            {!selectedDate ? (
              <div className="text-center py-8">
                <CalendarIcon className="h-12 w-12 mx-auto text-muted-foreground/50 mb-3" aria-hidden="true" />
                <p className="text-sm text-muted-foreground">
                  Select a date to view bookings
                </p>
              </div>
            ) : selectedDateBookings.length === 0 ? (
              <div className="text-center py-8">
                <div className="text-4xl mb-3" role="img" aria-label="Calendar">📅</div>
                <p className="text-sm text-muted-foreground mb-3">
                  No bookings on this date
                </p>
                {!hideCreateButton && (
                  <Button
                    size="sm"
                    onClick={() => handleCreateBookingClick(selectedDate)}
                    aria-label="Create new booking"
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    Create Booking
                  </Button>
                )}
              </div>
            ) : (
              selectedDateBookings.map((booking) => {
                const conflicts = conflictMap.get(booking.id)
                const availableStatuses = getAvailableStatuses(booking.status)

                return (
                  <MobileBookingCard
                    key={booking.id}
                    booking={booking}
                    onClick={onBookingClick}
                    hasConflict={!!conflicts && conflicts.size > 0}
                    onStatusChange={onStatusChange}
                    availableStatuses={availableStatuses}
                    hidePaymentStatus={hidePaymentStatus}
                  />
                )
              })
            )}
          </div>
        </ScrollArea>
      </div>
    </div>
  )
})

MobileCalendar.displayName = 'MobileCalendar'
