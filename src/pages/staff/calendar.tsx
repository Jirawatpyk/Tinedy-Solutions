import { useState } from 'react'
import { format, startOfMonth, endOfMonth, startOfWeek, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths, isToday } from 'date-fns'
import { th } from 'date-fns/locale'
import { useStaffCalendar, type CalendarEvent } from '@/hooks/use-staff-calendar'
import { BookingDetailsModal } from '@/components/staff/booking-details-modal'
import { Skeleton } from '@/components/ui/skeleton'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { AlertCircle, Calendar as CalendarIcon, Clock, User, Briefcase, Users, ChevronLeft, ChevronRight } from 'lucide-react'
import { useStaffBookings } from '@/hooks/use-staff-bookings'
import { formatTime } from '@/lib/booking-utils'
import './calendar.css'

const STATUS_COLORS = {
  pending: 'bg-yellow-100 text-yellow-800 border-yellow-300',
  confirmed: 'bg-blue-100 text-blue-800 border-blue-300',
  in_progress: 'bg-purple-100 text-purple-800 border-purple-300',
  completed: 'bg-green-100 text-green-800 border-green-300',
  cancelled: 'bg-red-100 text-red-800 border-red-300',
}

const STATUS_DOTS = {
  pending: 'bg-yellow-500',
  confirmed: 'bg-blue-500',
  in_progress: 'bg-purple-500',
  completed: 'bg-green-500',
  cancelled: 'bg-red-500',
}

export default function StaffCalendar() {
  const { events, loading, error } = useStaffCalendar()
  const { startProgress, markAsCompleted, addNotes } = useStaffBookings()
  const [currentDate, setCurrentDate] = useState(new Date())
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null)

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

  // Generate calendar days
  const monthStart = startOfMonth(currentDate)
  const monthEnd = endOfMonth(currentDate)
  const calendarStart = startOfWeek(monthStart)
  const calendarEnd = startOfWeek(monthEnd)
  const calendarDays = eachDayOfInterval({
    start: calendarStart,
    end: new Date(calendarEnd.getTime() + 6 * 24 * 60 * 60 * 1000) // Add 6 days to get full week
  })

  const selectedDateEvents = selectedDate ? getEventsForDate(selectedDate) : []

  if (error) {
    return (
      <div className="p-4 sm:p-6">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>เกิดข้อผิดพลาด: {error}</AlertDescription>
        </Alert>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="space-y-6 p-4 sm:p-6">
        {/* Page Header Skeleton */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="space-y-2">
            <Skeleton className="h-9 w-40" />
            <Skeleton className="h-4 w-64" />
          </div>
          <Skeleton className="h-10 w-24" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Calendar Skeleton */}
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

          {/* Sidebar Skeleton */}
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
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b sticky top-0 z-10">
        <div className="px-4 sm:px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
                My Calendar
              </h1>
              <p className="text-sm text-muted-foreground mt-1">
                ดูตารางงานและการจองของคุณ
              </p>
            </div>
            <Button onClick={goToToday} variant="outline">
              <CalendarIcon className="h-4 w-4 mr-2" />
              วันนี้
            </Button>
          </div>
        </div>
      </div>

      <div className="p-4 sm:p-6 space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Calendar */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-2xl">
                  {format(currentDate, 'MMMM yyyy', { locale: th })}
                </CardTitle>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={goToPreviousMonth}
                    className="h-8 w-8"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={goToNextMonth}
                    className="h-8 w-8"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {/* Calendar Grid */}
              <div className="grid grid-cols-7 gap-1">
                {/* Day headers */}
                {['อา.', 'จ.', 'อ.', 'พ.', 'พฤ.', 'ศ.', 'ส.'].map((day) => (
                  <div
                    key={day}
                    className="text-center text-xs font-semibold text-muted-foreground py-2"
                  >
                    {day}
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
                        relative min-h-20 p-2 border rounded-lg transition-all cursor-pointer
                        ${!isCurrentMonth ? 'bg-muted/30 text-muted-foreground' : 'bg-background'}
                        ${isSelected ? 'ring-2 ring-primary bg-blue-50' : ''}
                        ${isTodayDate && !isSelected ? 'ring-2 ring-yellow-400' : ''}
                        hover:bg-accent/50
                      `}
                      onClick={() => setSelectedDate(day)}
                    >
                      <div className="flex items-start justify-between">
                        <span
                          className={`text-sm font-medium ${
                            isTodayDate ? 'text-primary font-bold' : ''
                          }`}
                        >
                          {format(day, 'd')}
                        </span>
                        {dayEvents.length > 0 && (
                          <span className="text-xs bg-primary text-white rounded-full px-1.5">
                            {dayEvents.length}
                          </span>
                        )}
                      </div>

                      {/* Booking dots */}
                      {dayEvents.length > 0 && (
                        <div className="mt-1 flex flex-wrap gap-1">
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
              <div className="mt-6 pt-4 border-t">
                <p className="text-sm font-semibold mb-2">สถานะ:</p>
                <div className="flex flex-wrap gap-3 text-xs">
                  <div className="flex items-center gap-1">
                    <div className="w-3 h-3 rounded-full bg-yellow-500" />
                    <span>รอยืนยัน</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="w-3 h-3 rounded-full bg-blue-500" />
                    <span>ยืนยันแล้ว</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="w-3 h-3 rounded-full bg-purple-500" />
                    <span>กำลังดำเนินการ</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="w-3 h-3 rounded-full bg-green-500" />
                    <span>เสร็จสิ้น</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="w-3 h-3 rounded-full bg-red-500" />
                    <span>ยกเลิก</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Booking List Sidebar */}
          <Card className="lg:col-span-1">
            <CardHeader>
              <CardTitle>
                {selectedDate ? format(selectedDate, 'd MMMM yyyy', { locale: th }) : 'เลือกวันที่'}
              </CardTitle>
              {selectedDateEvents.length > 0 && (
                <p className="text-sm text-muted-foreground">
                  {selectedDateEvents.length} งาน
                </p>
              )}
            </CardHeader>
            <CardContent>
              {!selectedDate ? (
                <div className="text-center py-12">
                  <CalendarIcon className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                  <p className="text-muted-foreground">
                    คลิกที่วันเพื่อดูงาน
                  </p>
                </div>
              ) : selectedDateEvents.length === 0 ? (
                <div className="text-center py-12">
                  <CalendarIcon className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                  <p className="text-muted-foreground">ไม่มีงานในวันนี้</p>
                </div>
              ) : (
                <div className="space-y-3 max-h-[600px] overflow-y-auto">
                  {selectedDateEvents.map((event) => (
                    <div
                      key={event.booking_id}
                      onClick={() => setSelectedEvent(event)}
                      className={`p-3 rounded-lg border-2 cursor-pointer hover:opacity-80 transition-opacity ${
                        STATUS_COLORS[event.status as keyof typeof STATUS_COLORS]
                      }`}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <Clock className="h-4 w-4" />
                          <span className="font-semibold">
                            {formatTime(format(event.start, 'HH:mm:ss'))} - {formatTime(format(event.end, 'HH:mm:ss'))}
                          </span>
                        </div>
                        <span className="text-xs font-medium uppercase px-2 py-0.5 rounded">
                          {event.status === 'pending' && 'รอยืนยัน'}
                          {event.status === 'confirmed' && 'ยืนยันแล้ว'}
                          {event.status === 'in_progress' && 'ดำเนินการ'}
                          {event.status === 'completed' && 'เสร็จสิ้น'}
                          {event.status === 'cancelled' && 'ยกเลิก'}
                        </span>
                      </div>

                      <div className="space-y-1 text-sm">
                        <div className="flex items-center gap-2">
                          <User className="h-3.5 w-3.5 text-muted-foreground" />
                          <span>{event.customer_name}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Briefcase className="h-3.5 w-3.5 text-muted-foreground" />
                          <span>{event.service_name}</span>
                        </div>
                        {event.staff_id && event.staff_name && (
                          <div className="flex items-center gap-2 text-blue-600">
                            <User className="h-3.5 w-3.5" />
                            <span>พนักงาน: {event.staff_name}</span>
                          </div>
                        )}
                        {event.team_id && event.team_name && (
                          <div className="flex items-center gap-2 text-green-600">
                            <Users className="h-3.5 w-3.5" />
                            <span>ทีม: {event.team_name}</span>
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
      </div>

      {/* Booking Details Modal */}
      {selectedEvent && (
        <BookingDetailsModal
          booking={{
            id: selectedEvent.booking_id,
            booking_date: format(selectedEvent.start, 'yyyy-MM-dd'),
            start_time: format(selectedEvent.start, 'HH:mm'),
            end_time: format(selectedEvent.end, 'HH:mm'),
            status: selectedEvent.status,
            notes: selectedEvent.notes,
            address: selectedEvent.address,
            city: selectedEvent.city,
            state: selectedEvent.state,
            zip_code: selectedEvent.zip_code,
            created_at: new Date().toISOString(),
            staff_id: selectedEvent.staff_id || null,
            team_id: selectedEvent.team_id || null,
            customers: {
              id: '',
              full_name: selectedEvent.customer_name,
              phone: selectedEvent.customer_phone,
              avatar_url: selectedEvent.customer_avatar,
            },
            service_packages: {
              id: '',
              name: selectedEvent.service_name,
              duration_minutes: selectedEvent.service_duration,
              price: selectedEvent.service_price,
            },
          }}
          open={!!selectedEvent}
          onClose={() => setSelectedEvent(null)}
          onStartProgress={startProgress}
          onMarkCompleted={markAsCompleted}
          onAddNotes={addNotes}
        />
      )}
    </div>
  )
}
