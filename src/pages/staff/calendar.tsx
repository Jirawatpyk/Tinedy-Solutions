import { useState, useMemo, useCallback } from 'react'
import { format, startOfMonth, endOfMonth, startOfWeek, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths, isToday } from 'date-fns'
import { enUS } from 'date-fns/locale'
import { useStaffCalendar } from '@/hooks/useStaffCalendar'
import { type CalendarEvent } from '@/lib/queries/staff-calendar-queries'
import { logger } from '@/lib/logger'
import { BookingDetailsModal } from '@/components/staff/booking-details-modal'
import { Skeleton } from '@/components/ui/skeleton'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { AlertCircle, Calendar as CalendarIcon, Clock, User, Briefcase, Users, ChevronLeft, ChevronRight } from 'lucide-react'
import { useStaffDashboard } from '@/hooks/useStaffDashboard'
import { formatTime } from '@/lib/booking-utils'
import {
  calendarEventToStaffBooking,
  calendarEventsToBookings,
  groupBookingsByDate,
  createEmptyConflictMap
} from '@/lib/calendar-adapters'
import { useMediaQuery } from '@/hooks/useMediaQuery'
import { MobileCalendar } from '@/components/calendar/MobileCalendar'
import { CalendarErrorBoundary } from '@/components/calendar/CalendarErrorBoundary'
import type { Booking } from '@/types/booking'
import { STATUS_DOTS } from '@/constants/booking-status'
import './calendar.css'

const STATUS_COLORS = {
  pending: 'bg-yellow-100 text-yellow-800 border-yellow-300',
  confirmed: 'bg-blue-100 text-blue-800 border-blue-300',
  in_progress: 'bg-purple-100 text-purple-800 border-purple-300',
  completed: 'bg-green-100 text-green-800 border-green-300',
  cancelled: 'bg-red-100 text-red-800 border-red-300',
}

// Staff can only view - no status transitions from calendar dropdown
const getAvailableStatuses = (_currentStatus: string): string[] => {
  return [] // Staff uses modal buttons instead
}

export default function StaffCalendar() {
  const { events, loading, error } = useStaffCalendar()
  const { startProgress, markAsCompleted, addNotes } = useStaffDashboard()
  const [currentDate, setCurrentDate] = useState(new Date())
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null)

  // Responsive detection
  const isMobile = useMediaQuery('(max-width: 1023px)')

  // Convert events to bookings for MobileCalendar
  const bookings = useMemo(() => calendarEventsToBookings(events), [events])
  const bookingsByDate = useMemo(() => groupBookingsByDate(bookings), [bookings])
  const conflictMap = useMemo(() => createEmptyConflictMap(), [])

  const getEventsForDate = (date: Date) => {
    return events.filter((event) => isSameDay(event.start, date))
  }

  const goToPreviousMonth = () => {
    setCurrentDate(subMonths(currentDate, 1))
  }

  const goToNextMonth = () => {
    setCurrentDate(addMonths(currentDate, 1))
  }

  const goToToday = () => {
    setCurrentDate(new Date())
    setSelectedDate(new Date())
  }

  // Handle booking click from MobileCalendar
  const handleMobileBookingClick = useCallback((booking: Booking) => {
    const event = events.find(e => e.booking_id === booking.id)
    if (event) {
      setSelectedEvent(event)
    }
  }, [events])

  // Placeholder handlers for MobileCalendar (staff cannot change status from dropdown)
  const handleStatusChange = useCallback(async (_bookingId: string, _newStatus: string) => {
    // Staff uses modal buttons for status changes
    logger.debug('Staff calendar: handleStatusChange called (no-op)', { bookingId: _bookingId, newStatus: _newStatus }, { context: 'StaffCalendar' })
  }, [])

  const handleCreateBooking = useCallback((_date: Date) => {
    // Staff cannot create bookings from calendar
    logger.debug('Staff calendar: handleCreateBooking called (no-op)', { date: _date }, { context: 'StaffCalendar' })
  }, [])

  // Generate calendar days
  const monthStart = startOfMonth(currentDate)
  const monthEnd = endOfMonth(currentDate)
  const calendarStart = startOfWeek(monthStart)
  const calendarEnd = startOfWeek(monthEnd)
  const calendarDays = eachDayOfInterval({
    start: calendarStart,
    end: new Date(calendarEnd.getTime() + 6 * 24 * 60 * 60 * 1000)
  })

  const selectedDateEvents = selectedDate ? getEventsForDate(selectedDate) : []

  // Render BookingDetailsModal once (shared by both mobile and desktop views)
  const renderBookingDetailsModal = () => (
    selectedEvent && (
      <BookingDetailsModal
        booking={calendarEventToStaffBooking(selectedEvent)}
        open={!!selectedEvent}
        onClose={() => setSelectedEvent(null)}
        onStartProgress={startProgress}
        onMarkCompleted={markAsCompleted}
        onAddNotes={addNotes}
      />
    )
  )

  // Mobile View
  if (isMobile) {
    return (
      <CalendarErrorBoundary>
        <div className="h-full bg-gray-50 flex flex-col overflow-hidden">
          {/* Header */}
          <div className="bg-white border-b flex-shrink-0">
            <div className="px-4 py-4">
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">View your schedule</p>
                <Button onClick={goToToday} variant="outline" size="sm">
                  <CalendarIcon className="h-4 w-4 mr-2" />
                  Today
                </Button>
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 min-h-0 overflow-y-auto">
            {error && (
              <div className="p-4">
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>Error: {error.message}</AlertDescription>
                </Alert>
              </div>
            )}

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
              />
            )}
          </div>

          {/* Booking Details Modal */}
          {renderBookingDetailsModal()}
        </div>
      </CalendarErrorBoundary>
    )
  }

  // Desktop View
  return (
    <CalendarErrorBoundary>
      <div className="h-full bg-gray-50 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="bg-white border-b flex-shrink-0">
          <div className="px-4 sm:px-6 py-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <p className="text-sm text-muted-foreground">
                View your schedule and bookings
              </p>
              <Button onClick={goToToday} variant="outline" size="sm" className="sm:size-default w-full sm:w-auto">
                <CalendarIcon className="h-4 w-4 mr-2" />
                Today
              </Button>
            </div>
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 min-h-0 overflow-y-auto">
          {error && (
            <div className="p-4 sm:p-6">
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>Error: {error.message}</AlertDescription>
              </Alert>
            </div>
          )}

          <div className="p-4 sm:p-6 space-y-6">
          {loading ? (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <Card className="lg:col-span-2">
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
              <Card className="lg:col-span-1">
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
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Calendar */}
              <Card className="lg:col-span-2">
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
                  {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day, index) => (
                    <div
                      key={day}
                      className="text-center text-[10px] sm:text-xs font-semibold text-muted-foreground py-1 sm:py-1.5"
                    >
                      <span className="sm:hidden">{['S', 'M', 'T', 'W', 'T', 'F', 'S'][index]}</span>
                      <span className="hidden sm:inline">{day}</span>
                    </div>
                  ))}

                  {/* Calendar days */}
                  {calendarDays.map((day, index) => {
                    const dayEvents = getEventsForDate(day)
                    const isCurrentMonth = isSameMonth(day, currentDate)
                    const isSelected = selectedDate ? isSameDay(day, selectedDate) : false
                    const isTodayDate = isToday(day)

                    return (
                      <div
                        key={index}
                        className={`
                          relative min-h-12 sm:min-h-16 md:min-h-20 p-0.5 sm:p-1.5 border rounded transition-all cursor-pointer
                          ${!isCurrentMonth ? 'bg-muted/30 text-muted-foreground' : 'bg-background'}
                          ${isSelected ? 'ring-1 sm:ring-2 ring-primary bg-blue-50' : ''}
                          ${isTodayDate && !isSelected ? 'ring-1 sm:ring-2 ring-yellow-400' : ''}
                          hover:bg-accent/50
                        `}
                        onClick={() => setSelectedDate(day)}
                      >
                        <div className="flex items-start justify-between">
                          <span
                            className={`text-[11px] sm:text-xs md:text-sm font-medium ${
                              isTodayDate ? 'text-primary font-bold' : ''
                            }`}
                          >
                            {format(day, 'd')}
                          </span>
                          {dayEvents.length > 0 && (
                            <span className="text-[9px] sm:text-[10px] bg-primary text-white rounded-full px-0.5 sm:px-1 leading-tight">
                              {dayEvents.length}
                            </span>
                          )}
                        </div>

                        {/* Booking dots */}
                        {dayEvents.length > 0 && (
                          <div className="hidden sm:flex mt-1 flex-wrap gap-1">
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
                              <span className="text-[10px] sm:text-xs text-muted-foreground">
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
                <div className="mt-3 sm:mt-4 pt-3 sm:pt-4 border-t">
                  <p className="text-[10px] sm:text-xs font-semibold mb-1.5 sm:mb-2">Status Legend:</p>
                  <div className="flex flex-wrap gap-1.5 sm:gap-2 text-[9px] sm:text-[10px]">
                    <div className="flex items-center gap-0.5 sm:gap-1">
                      <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-yellow-500" />
                      <span>Pending</span>
                    </div>
                    <div className="flex items-center gap-0.5 sm:gap-1">
                      <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-blue-500" />
                      <span>Confirmed</span>
                    </div>
                    <div className="flex items-center gap-0.5 sm:gap-1">
                      <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-purple-500" />
                      <span>In Progress</span>
                    </div>
                    <div className="flex items-center gap-0.5 sm:gap-1">
                      <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-green-500" />
                      <span>Completed</span>
                    </div>
                    <div className="flex items-center gap-0.5 sm:gap-1">
                      <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-red-500" />
                      <span>Cancelled</span>
                    </div>
                    <div className="flex items-center gap-0.5 sm:gap-1">
                      <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-gray-500" />
                      <span>No Show</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Booking List Sidebar */}
            <Card className="lg:col-span-1">
              <CardHeader>
                <CardTitle>
                  {selectedDate ? format(selectedDate, 'd MMMM yyyy', { locale: enUS }) : 'Select Date'}
                </CardTitle>
                {selectedDateEvents.length > 0 && (
                  <p className="text-sm text-muted-foreground">
                    {selectedDateEvents.length} {selectedDateEvents.length === 1 ? 'task' : 'tasks'}
                  </p>
                )}
              </CardHeader>
              <CardContent>
                {!selectedDate ? (
                  <div className="text-center py-12">
                    <CalendarIcon className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                    <p className="text-muted-foreground">
                      Click on a day to view tasks
                    </p>
                  </div>
                ) : selectedDateEvents.length === 0 ? (
                  <div className="text-center py-12">
                    <CalendarIcon className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                    <p className="text-muted-foreground">No tasks on this day</p>
                  </div>
                ) : (
                  <div className="space-y-2 sm:space-y-3 max-h-[50vh] sm:max-h-[600px] overflow-y-auto">
                    {selectedDateEvents.map((event) => (
                      <div
                        key={event.booking_id}
                        onClick={() => setSelectedEvent(event)}
                        className={`p-2 sm:p-3 rounded-lg border-2 cursor-pointer hover:opacity-80 transition-opacity ${
                          STATUS_COLORS[event.status as keyof typeof STATUS_COLORS]
                        }`}
                      >
                        <div className="flex items-start justify-between mb-2 gap-2">
                          <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
                            <Clock className="h-3 w-3 sm:h-4 sm:w-4 flex-shrink-0" />
                            <span className="font-semibold text-xs sm:text-sm truncate">
                              {formatTime(format(event.start, 'HH:mm:ss'))} - {formatTime(format(event.end, 'HH:mm:ss'))}
                            </span>
                          </div>
                          <span className="text-[10px] sm:text-xs font-medium uppercase px-1.5 sm:px-2 py-0.5 rounded whitespace-nowrap flex-shrink-0">
                            {event.status === 'pending' && 'Pending'}
                            {event.status === 'confirmed' && 'Confirmed'}
                            {event.status === 'in_progress' && 'In Progress'}
                            {event.status === 'completed' && 'Completed'}
                            {event.status === 'cancelled' && 'Cancelled'}
                          </span>
                        </div>

                        <div className="space-y-1 text-xs sm:text-sm">
                          <div className="flex items-center gap-1.5 sm:gap-2">
                            <User className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-muted-foreground flex-shrink-0" />
                            <span className="truncate">{event.customer_name}</span>
                          </div>
                          <div className="flex items-center gap-1.5 sm:gap-2">
                            <Briefcase className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-muted-foreground flex-shrink-0" />
                            <span className="truncate">{event.service_name}</span>
                          </div>
                          {event.staff_id && event.staff_name && (
                            <div className="flex items-center gap-1.5 sm:gap-2 text-blue-600">
                              <User className="h-3 w-3 sm:h-3.5 sm:w-3.5 flex-shrink-0" />
                              <span className="truncate">Staff: {event.staff_name}</span>
                            </div>
                          )}
                          {event.team_id && event.team_name && (
                            <div className="flex items-center gap-1.5 sm:gap-2 text-green-600">
                              <Users className="h-3 w-3 sm:h-3.5 sm:w-3.5 flex-shrink-0" />
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

        {/* Booking Details Modal */}
        {renderBookingDetailsModal()}
      </div>
    </CalendarErrorBoundary>
  )
}
