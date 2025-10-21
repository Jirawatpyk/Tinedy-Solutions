import { useState, useCallback } from 'react'
import { Calendar, dateFnsLocalizer, type View } from 'react-big-calendar'
import { format, parse, startOfWeek, getDay } from 'date-fns'
import { th } from 'date-fns/locale'
import { useStaffCalendar, type CalendarEvent } from '@/hooks/use-staff-calendar'
import { CalendarEventComponent } from '@/components/staff/calendar-event'
import { CalendarToolbar } from '@/components/staff/calendar-toolbar'
import { BookingDetailsModal } from '@/components/staff/booking-details-modal'
import { Skeleton } from '@/components/ui/skeleton'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { AlertCircle } from 'lucide-react'
import { useStaffBookings } from '@/hooks/use-staff-bookings'
import 'react-big-calendar/lib/css/react-big-calendar.css'
import './calendar.css'

const locales = {
  th: th,
}

const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek: () => startOfWeek(new Date(), { weekStartsOn: 0 }),
  getDay,
  locales,
})

const messages = {
  allDay: 'ทั้งวัน',
  previous: 'ก่อนหน้า',
  next: 'ถัดไป',
  today: 'วันนี้',
  month: 'เดือน',
  week: 'สัปดาห์',
  day: 'วัน',
  agenda: 'ตารางนัด',
  date: 'วันที่',
  time: 'เวลา',
  event: 'กิจกรรม',
  noEventsInRange: 'ไม่มีการจองในช่วงนี้',
  showMore: (total: number) => `+${total} เพิ่มเติม`,
}

export default function StaffCalendar() {
  const { events, loading, error } = useStaffCalendar()
  const { markAsCompleted, addNotes } = useStaffBookings()
  const [view, setView] = useState<View>('month')
  const [date, setDate] = useState(new Date())
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null)

  const handleNavigate = useCallback((action: 'PREV' | 'NEXT' | 'TODAY') => {
    setDate((currentDate) => {
      const newDate = new Date(currentDate)
      if (action === 'TODAY') {
        return new Date()
      } else if (action === 'PREV') {
        if (view === 'month') {
          newDate.setMonth(newDate.getMonth() - 1)
        } else if (view === 'week') {
          newDate.setDate(newDate.getDate() - 7)
        } else {
          newDate.setDate(newDate.getDate() - 1)
        }
      } else if (action === 'NEXT') {
        if (view === 'month') {
          newDate.setMonth(newDate.getMonth() + 1)
        } else if (view === 'week') {
          newDate.setDate(newDate.getDate() + 7)
        } else {
          newDate.setDate(newDate.getDate() + 1)
        }
      }
      return newDate
    })
  }, [view])

  const handleSelectEvent = useCallback((event: CalendarEvent) => {
    setSelectedEvent(event)
  }, [])

  const eventStyleGetter = (event: CalendarEvent) => {
    let backgroundColor = '#3b82f6'

    switch (event.status) {
      case 'completed':
        backgroundColor = '#22c55e'
        break
      case 'confirmed':
        backgroundColor = '#3b82f6'
        break
      case 'pending':
        backgroundColor = '#eab308'
        break
      case 'cancelled':
        backgroundColor = '#ef4444'
        break
    }

    return {
      style: {
        backgroundColor,
        borderRadius: '4px',
        opacity: 0.9,
        color: 'white',
        border: '0px',
        display: 'block',
      },
    }
  }

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

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b sticky top-0 z-10">
        <div className="px-4 sm:px-6 py-4">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
            My Calendar
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            ดูตารางงานและการจองของคุณ
          </p>
        </div>
      </div>

      <div className="p-4 sm:p-6">
        {loading ? (
          <div className="space-y-4">
            <Skeleton className="h-16" />
            <Skeleton className="h-[600px]" />
          </div>
        ) : (
          <>
            <CalendarToolbar
              date={date}
              view={view}
              onNavigate={handleNavigate}
              onView={setView}
            />

            <div className="bg-white rounded-lg border overflow-hidden">
              <Calendar
                localizer={localizer}
                events={events}
                startAccessor="start"
                endAccessor="end"
                style={{ height: 700 }}
                view={view}
                onView={setView}
                date={date}
                onNavigate={setDate}
                onSelectEvent={handleSelectEvent}
                eventPropGetter={eventStyleGetter}
                components={{
                  event: CalendarEventComponent,
                  toolbar: () => null, // Hide default toolbar, we use custom one
                }}
                messages={messages}
                culture="th"
                popup
                step={30}
                timeslots={2}
                defaultView="month"
                views={['month', 'week', 'day']}
              />
            </div>
          </>
        )}
      </div>

      {/* Booking Details Modal */}
      {selectedEvent && (
        <BookingDetailsModal
          booking={{
            id: selectedEvent.booking_id,
            booking_date: format(selectedEvent.start, 'yyyy-MM-dd'),
            time_slot: format(selectedEvent.start, 'HH:mm'),
            status: selectedEvent.status,
            notes: selectedEvent.notes,
            created_at: new Date().toISOString(),
            customers: {
              id: '',
              full_name: selectedEvent.customer_name,
              phone: '',
            },
            service_packages: {
              id: '',
              name: selectedEvent.service_name,
              duration: Math.round((selectedEvent.end.getTime() - selectedEvent.start.getTime()) / 60000),
              price: 0,
            },
          }}
          open={!!selectedEvent}
          onClose={() => setSelectedEvent(null)}
          onMarkCompleted={markAsCompleted}
          onAddNotes={addNotes}
        />
      )}
    </div>
  )
}
