import { useState, useMemo, useCallback } from 'react'
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths, isToday } from 'date-fns'
import { enUS } from 'date-fns/locale'
import { useStaffCalendar } from '@/hooks/use-staff-calendar'
import { type CalendarEvent } from '@/lib/queries/staff-calendar-queries'
import { ResponsiveSheet } from '@/components/ui/responsive-sheet'
import { BookingDetailContent } from '@/components/staff/booking-detail-content'
import { PageHeader } from '@/components/staff/page-header'
import { Skeleton } from '@/components/ui/skeleton'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { AlertCircle, Calendar as CalendarIcon, Clock, User, Briefcase, Users, ChevronLeft, ChevronRight } from 'lucide-react'
import { useStaffDashboard } from '@/hooks/use-staff-dashboard'
import { EmptyState } from '@/components/common/EmptyState'
import {
  calendarEventToStaffBooking,
  calendarEventsToBookings,
  groupBookingsByDate,
  createEmptyConflictMap
} from '@/lib/calendar-adapters'
import { MobileCalendar } from '@/components/calendar/MobileCalendar'
import { CalendarErrorBoundary } from '@/components/calendar/CalendarErrorBoundary'
import type { Booking } from '@/types/booking'
import { STATUS_DOTS, STATUS_COLORS } from '@/constants/booking-status'
import { StatusBadge, getBookingStatusVariant, getBookingStatusLabel } from '@/components/common/StatusBadge'
import { PullToRefresh } from '@/components/staff/pull-to-refresh'
// Note: calendar.css is only needed for react-big-calendar (Admin calendar)
// Staff calendar uses custom components that don't require it

// Module-level constant — Staff Portal never tracks conflicts, so this Map
// never changes between renders; no need for useMemo.
const EMPTY_CONFLICT_MAP = createEmptyConflictMap()

/**
 * Staff cannot change status from calendar dropdown - returns empty array.
 * Status changes are handled via booking detail modal buttons.
 * This function is required by MobileCalendar props interface.
 */
const getAvailableStatuses = (): string[] => []

export default function StaffCalendar() {
  const { events, loading, error, refresh } = useStaffCalendar()
  const { startProgress, markAsCompleted, addNotes } = useStaffDashboard()
  const [currentDate, setCurrentDate] = useState(new Date())
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null)

  // Convert events to bookings for MobileCalendar
  const bookings = useMemo(() => calendarEventsToBookings(events), [events])
  const bookingsByDate = useMemo(() => groupBookingsByDate(bookings), [bookings])
  const conflictMap = EMPTY_CONFLICT_MAP

  // Cache formatted date strings for events once — avoids re-formatting O(days×events) per render
  const eventDateStrings = useMemo(
    () => events.map(event => ({
      event,
      startStr: format(event.start, 'yyyy-MM-dd'),
      endStr: format(event.end, 'yyyy-MM-dd'),
    })),
    [events]
  )

  const getEventsForDate = useCallback((date: Date) => {
    const dateStr = format(date, 'yyyy-MM-dd')
    return eventDateStrings
      .filter(({ startStr, endStr }) => dateStr >= startStr && dateStr <= endStr)
      .map(({ event }) => event)
  }, [eventDateStrings])

  const goToPreviousMonth = useCallback(() => {
    setCurrentDate(prev => subMonths(prev, 1))
  }, [])

  const goToNextMonth = useCallback(() => {
    setCurrentDate(prev => addMonths(prev, 1))
  }, [])

  const goToToday = useCallback(() => {
    const today = new Date()
    setCurrentDate(today)
    setSelectedDate(today)
  }, [])

  // Handle booking click from MobileCalendar
  const handleMobileBookingClick = useCallback((booking: Booking) => {
    const event = events.find(e => e.booking_id === booking.id)
    if (event) {
      setSelectedEvent(event)
    }
  }, [events])

  /**
   * No-op handler - Staff uses modal buttons for status changes, not dropdown.
   * Required by MobileCalendar props interface.
   */
  const handleStatusChange = useCallback(async () => {
    // Intentionally empty - staff changes status via booking detail modal
  }, [])

  /**
   * No-op handler - Staff cannot create bookings from calendar.
   * Required by MobileCalendar props interface.
   */
  const handleCreateBooking = useCallback(() => {
    // Intentionally empty - staff cannot create bookings
  }, [])

  // Generate calendar days
  const monthStart = startOfMonth(currentDate)
  const monthEnd = endOfMonth(currentDate)
  const calendarStart = startOfWeek(monthStart)
  const calendarDays = eachDayOfInterval({
    start: calendarStart,
    end: endOfWeek(monthEnd),
  })

  const selectedDateEvents = selectedDate ? getEventsForDate(selectedDate) : []

  // Get booking data for selected event — memoized to avoid re-conversion on unrelated renders
  const selectedBooking = useMemo(
    () => selectedEvent ? calendarEventToStaffBooking(selectedEvent) : null,
    [selectedEvent]
  )

  return (
    <CalendarErrorBoundary>
      <div className="h-full bg-tinedy-off-white/50 flex flex-col overflow-hidden">
        {/* PageHeader - Mobile only (lg:hidden by default) */}
        <PageHeader title="My Calendar" />

        {/* Desktop Header - Shows on lg: screens */}
        <div className="hidden lg:block bg-white border-b flex-shrink-0">
          <div className="px-4 sm:px-6 py-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <p className="text-sm text-muted-foreground">
                View your schedule and bookings (6 months back - 6 months ahead)
              </p>
              <Button onClick={goToToday} variant="outline" size="sm" className="sm:size-default w-full sm:w-auto">
                <CalendarIcon className="h-4 w-4 mr-2" />
                Today
              </Button>
            </div>
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 min-h-0 overflow-hidden">
          {error && (
            <div className="p-4 sm:p-6">
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>Error: {error.message}</AlertDescription>
              </Alert>
            </div>
          )}

          {/* Mobile Calendar View */}
          <div className="lg:hidden h-full">
            <PullToRefresh onRefresh={refresh} className="flex-1 min-h-0">
              {loading ? (
                <div className="p-4 space-y-4">
                  <Skeleton className="h-32 w-full" />
                  <Skeleton className="h-24 w-full" />
                  <Skeleton className="h-24 w-full" />
                </div>
              ) : (
                <MobileCalendar
                  currentDate={currentDate}
                  selectedDate={selectedDate}
                  bookings={bookings}
                  conflictMap={conflictMap}
                  bookingsByDate={bookingsByDate}
                  onDateSelect={setSelectedDate}
                  onMonthChange={setCurrentDate}
                  onBookingClick={handleMobileBookingClick}
                  onCreateBooking={handleCreateBooking}
                  onStatusChange={handleStatusChange}
                  getAvailableStatuses={getAvailableStatuses}
                  hideCreateButton
                  hidePaymentStatus
                />
              )}
            </PullToRefresh>
          </div>

          {/* Desktop Calendar View */}
          <div className="hidden lg:block h-full overflow-y-auto p-4 sm:p-6">
            {loading ? (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                <Card className="lg:col-span-8">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <Skeleton className="h-8 w-40" />
                      <div className="flex gap-2">
                        <Skeleton className="h-8 w-8" />
                        <Skeleton className="h-8 w-8" />
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-7 gap-1">
                      {Array.from({ length: 7 }).map((_, i) => (
                        <Skeleton key={i} className="h-6 w-full" />
                      ))}
                      {Array.from({ length: 35 }).map((_, i) => (
                        <Skeleton key={i} className="h-20 w-full" />
                      ))}
                    </div>
                  </CardContent>
                </Card>
                <Card className="lg:col-span-4">
                  <CardHeader>
                    <Skeleton className="h-6 w-40" />
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {Array.from({ length: 3 }).map((_, i) => (
                        <Skeleton key={i} className="h-24 w-full" />
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* Calendar Grid */}
                <Card className="lg:col-span-8">
                  <CardHeader className="py-3 sm:py-4">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg sm:text-xl md:text-2xl">
                        {format(currentDate, 'MMMM yyyy', { locale: enUS })}
                      </CardTitle>
                      <div className="flex gap-1.5 sm:gap-2">
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={goToPreviousMonth}
                          className="h-7 w-7 sm:h-8 sm:w-8"
                        >
                          <ChevronLeft className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={goToNextMonth}
                          className="h-7 w-7 sm:h-8 sm:w-8"
                        >
                          <ChevronRight className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {/* Calendar Grid */}
                    <div className="grid grid-cols-7 gap-0.5 sm:gap-1">
                      {/* Day headers */}
                      {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
                        <div
                          key={day}
                          className="text-center text-xs font-semibold text-muted-foreground py-1.5"
                        >
                          {day}
                        </div>
                      ))}

                      {/* Calendar days */}
                      {calendarDays.map((day) => {
                        const dayEvents = getEventsForDate(day)
                        const isCurrentMonth = isSameMonth(day, currentDate)
                        const isSelected = selectedDate ? isSameDay(day, selectedDate) : false
                        const isTodayDate = isToday(day)

                        return (
                          <div
                            key={format(day, 'yyyy-MM-dd')}
                            className={`
                              relative min-h-16 md:min-h-20 p-1.5 border rounded transition-all cursor-pointer
                              ${!isCurrentMonth ? 'bg-muted/30 text-muted-foreground' : 'bg-background'}
                              ${isSelected ? 'ring-2 ring-primary bg-blue-50' : ''}
                              ${isTodayDate && !isSelected ? 'ring-2 ring-yellow-400' : ''}
                              hover:bg-accent/50
                            `}
                            onClick={() => setSelectedDate(day)}
                          >
                            <div className="flex items-start justify-between">
                              <span
                                className={`text-xs md:text-sm font-medium ${
                                  isTodayDate ? 'text-primary font-bold' : ''
                                }`}
                              >
                                {format(day, 'd')}
                              </span>
                              {dayEvents.length > 0 && (
                                <span className="text-[10px] bg-primary text-white rounded-full px-1 leading-tight">
                                  {dayEvents.length}
                                </span>
                              )}
                            </div>

                            {/* Booking dots */}
                            {dayEvents.length > 0 && (
                              <div className="flex mt-1 flex-wrap gap-1">
                                {dayEvents.slice(0, 3).map((event) => (
                                  <div
                                    key={event.booking_id}
                                    className={`w-2 h-2 rounded-full ${
                                      STATUS_DOTS[event.status as keyof typeof STATUS_DOTS]
                                    }`}
                                    title={event.service_name}
                                  />
                                ))}
                                {dayEvents.length > 3 && (
                                  <span className="text-xs text-muted-foreground">
                                    +{dayEvents.length - 3}
                                  </span>
                                )}
                              </div>
                            )}
                          </div>
                        )
                      })}
                    </div>

                    {/* Legend */}
                    <div className="mt-4 pt-4 border-t">
                      <p className="text-xs font-semibold mb-2">Status Legend:</p>
                      <div className="flex flex-wrap gap-2 text-[10px]">
                        <div className="flex items-center gap-1">
                          <div className="w-2 h-2 rounded-full bg-yellow-500" />
                          <span>Pending</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <div className="w-2 h-2 rounded-full bg-blue-500" />
                          <span>Confirmed</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <div className="w-2 h-2 rounded-full bg-purple-500" />
                          <span>In Progress</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <div className="w-2 h-2 rounded-full bg-green-500" />
                          <span>Completed</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <div className="w-2 h-2 rounded-full bg-red-500" />
                          <span>Cancelled</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <div className="w-2 h-2 rounded-full bg-tinedy-dark/60" />
                          <span>No Show</span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Booking List Sidebar */}
                <Card className="lg:col-span-4 lg:max-h-[calc(100vh-200px)] flex flex-col overflow-hidden">
                  <CardHeader className="flex-shrink-0">
                    <CardTitle>
                      {selectedDate ? format(selectedDate, 'd MMMM yyyy', { locale: enUS }) : 'Select Date'}
                    </CardTitle>
                    {selectedDateEvents.length > 0 && (
                      <p className="text-sm text-muted-foreground">
                        {selectedDateEvents.length} {selectedDateEvents.length === 1 ? 'task' : 'tasks'}
                      </p>
                    )}
                  </CardHeader>
                  <CardContent className="flex-1 min-h-0 overflow-y-auto">
                    {!selectedDate ? (
                      <EmptyState
                        icon={CalendarIcon}
                        title="Click on a day to view tasks"
                      />
                    ) : selectedDateEvents.length === 0 ? (
                      <EmptyState
                        icon={CalendarIcon}
                        title="No tasks on this day"
                      />
                    ) : (
                      <div className="space-y-3">
                        {selectedDateEvents.map((event) => (
                          <div
                            key={event.booking_id}
                            onClick={() => setSelectedEvent(event)}
                            className={`p-3 rounded-lg border-2 cursor-pointer hover:opacity-80 transition-opacity ${
                              STATUS_COLORS[event.status as keyof typeof STATUS_COLORS]
                            }`}
                          >
                            <div className="flex items-start justify-between mb-2 gap-2">
                              <div className="flex items-center gap-2 min-w-0">
                                <Clock className="h-4 w-4 flex-shrink-0" />
                                <span className="font-semibold text-sm truncate">
                                  {format(event.start, 'HH:mm')} - {format(event.end, 'HH:mm')}
                                </span>
                              </div>
                              <StatusBadge
                                variant={getBookingStatusVariant(event.status)}
                                className="text-xs whitespace-nowrap flex-shrink-0"
                              >
                                {getBookingStatusLabel(event.status)}
                              </StatusBadge>
                            </div>

                            <div className="space-y-1 text-sm">
                              <div className="flex items-center gap-2">
                                <User className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                                <span className="truncate">{event.customer_name}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <Briefcase className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                                <span className="truncate">{event.service_name}</span>
                              </div>
                              {event.staff_id && event.staff_name && (
                                <div className="flex items-center gap-2 text-blue-600">
                                  <User className="h-3.5 w-3.5 flex-shrink-0" />
                                  <span className="truncate">Staff: {event.staff_name}</span>
                                </div>
                              )}
                              {event.team_id && event.team_name && (
                                <div className="flex items-center gap-2 text-green-600">
                                  <Users className="h-3.5 w-3.5 flex-shrink-0" />
                                  <span className="truncate">Team: {event.team_name}</span>
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            )}
          </div>
        </div>

        {/* Booking Details - ResponsiveSheet (bottom on mobile, right on desktop) */}
        <ResponsiveSheet
          open={!!selectedEvent}
          onOpenChange={(open) => !open && setSelectedEvent(null)}
          mobileHeight="h-[95vh]"
          desktopWidth="w-[540px]"
          data-testid="booking-details-sheet"
        >
          {selectedBooking && (
            <BookingDetailContent
              booking={selectedBooking}
              onClose={() => setSelectedEvent(null)}
              onStartProgress={startProgress}
              onMarkCompleted={markAsCompleted}
              onAddNotes={addNotes}
              stickyFooter={true}
            />
          )}
        </ResponsiveSheet>
      </div>
    </CalendarErrorBoundary>
  )
}
