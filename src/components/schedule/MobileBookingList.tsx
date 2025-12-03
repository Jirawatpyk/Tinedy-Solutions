/**
 * MobileBookingList Component
 *
 * แสดง Bookings เป็น List View สำหรับ Mobile
 * ใช้แทน Calendar Grid บนหน้าจอขนาดเล็ก
 */

import React from 'react'
import { format } from 'date-fns'
import { th } from 'date-fns/locale'
import type { Booking } from '@/types'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { Clock, User, Package, ChevronRight } from 'lucide-react'
import { STATUS_COLORS_TIMELINE } from '@/constants/booking-status'
import { formatTime } from '@/lib/booking-utils'
import { cn } from '@/lib/utils'

interface MobileBookingListProps {
  bookings: Booking[]
  weekDates: Date[]
  selectedDayIndex: number
  onDayChange: (index: number) => void
  onBookingClick: (booking: Booking) => void
}

const STATUS_LABELS: Record<string, string> = {
  pending: 'Pending',
  confirmed: 'Confirmed',
  in_progress: 'In Progress',
  completed: 'Completed',
  cancelled: 'Cancelled',
  no_show: 'No Show',
}

export const MobileBookingList: React.FC<MobileBookingListProps> = ({
  bookings,
  weekDates,
  selectedDayIndex,
  onDayChange,
  onBookingClick,
}) => {
  // Get bookings for selected day
  const selectedDate = weekDates[selectedDayIndex]
  const selectedDateStr = selectedDate
    ? `${selectedDate.getFullYear()}-${String(selectedDate.getMonth() + 1).padStart(2, '0')}-${String(selectedDate.getDate()).padStart(2, '0')}`
    : ''

  const dayBookings = bookings
    .filter(b => b.booking_date === selectedDateStr)
    .sort((a, b) => a.start_time.localeCompare(b.start_time))

  const isToday = (date: Date) => {
    const today = new Date()
    return (
      date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear()
    )
  }

  return (
    <div className="space-y-4">
      {/* Day Selector - Horizontal Scroll */}
      <div className="flex gap-1.5 overflow-x-auto pb-2 -mx-2 px-2 scrollbar-hide">
        {weekDates.map((date, index) => {
          const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
          const bookingCount = bookings.filter(b => b.booking_date === dateStr).length
          const today = isToday(date)

          return (
            <button
              key={index}
              onClick={() => onDayChange(index)}
              className={cn(
                'flex flex-col items-center min-w-[52px] py-2 px-2 rounded-lg transition-all',
                selectedDayIndex === index
                  ? 'bg-tinedy-blue text-white shadow-md'
                  : today
                    ? 'bg-tinedy-blue/10 border border-tinedy-blue'
                    : 'bg-gray-100 hover:bg-gray-200'
              )}
            >
              <span className="text-[10px] font-medium opacity-80">
                {format(date, 'EEE', { locale: th })}
              </span>
              <span className="text-lg font-bold">
                {format(date, 'd')}
              </span>
              {bookingCount > 0 && (
                <span className={cn(
                  'text-[9px] px-1.5 rounded-full mt-0.5',
                  selectedDayIndex === index
                    ? 'bg-white/20'
                    : 'bg-tinedy-blue/20 text-tinedy-blue'
                )}>
                  {bookingCount}
                </span>
              )}
            </button>
          )
        })}
      </div>

      {/* Selected Date Header */}
      <div className="text-sm font-medium text-muted-foreground">
        {selectedDate && format(selectedDate, 'EEEE, d MMMM yyyy', { locale: th })}
        <span className="ml-2 text-xs">
          ({dayBookings.length} booking{dayBookings.length !== 1 ? 's' : ''})
        </span>
      </div>

      {/* Booking List */}
      <div className="space-y-2">
        {dayBookings.length === 0 ? (
          <Card className="p-6 text-center">
            <p className="text-muted-foreground text-sm">
              ไม่มีการจองในวันนี้
            </p>
          </Card>
        ) : (
          dayBookings.map(booking => {
            const bgColor = STATUS_COLORS_TIMELINE[booking.status as keyof typeof STATUS_COLORS_TIMELINE] || 'bg-tinedy-blue'

            return (
              <Card
                key={booking.id}
                className="p-3 cursor-pointer hover:shadow-md transition-shadow active:scale-[0.99]"
                onClick={() => onBookingClick(booking)}
              >
                <div className="flex items-start gap-3">
                  {/* Time Badge */}
                  <div className={cn('rounded-lg p-2 text-white text-center min-w-[60px]', bgColor)}>
                    <div className="text-sm font-bold">
                      {formatTime(booking.start_time)}
                    </div>
                    <div className="text-[10px] opacity-80">
                      {formatTime(booking.end_time)}
                    </div>
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    {/* Customer Name */}
                    <div className="flex items-center gap-1.5 text-sm font-medium truncate">
                      <User className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                      <span className="truncate">
                        {booking.customers?.full_name || 'No Customer'}
                      </span>
                    </div>

                    {/* Service Package */}
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-1 truncate">
                      <Package className="h-3 w-3 flex-shrink-0" />
                      <span className="truncate">
                        {booking.service_packages?.name || 'N/A'}
                      </span>
                    </div>

                    {/* Duration */}
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-1">
                      <Clock className="h-3 w-3 flex-shrink-0" />
                      <span>
                        {booking.start_time} - {booking.end_time}
                      </span>
                    </div>

                    {/* Status Badge */}
                    <div className="mt-2">
                      <Badge
                        variant="outline"
                        className={cn(
                          'text-[10px] px-1.5 py-0',
                          booking.status === 'pending' && 'bg-yellow-50 text-yellow-700 border-yellow-200',
                          booking.status === 'confirmed' && 'bg-blue-50 text-blue-700 border-blue-200',
                          booking.status === 'in_progress' && 'bg-purple-50 text-purple-700 border-purple-200',
                          booking.status === 'completed' && 'bg-green-50 text-green-700 border-green-200',
                          booking.status === 'cancelled' && 'bg-red-50 text-red-700 border-red-200',
                          booking.status === 'no_show' && 'bg-red-50 text-red-700 border-red-200'
                        )}
                      >
                        {STATUS_LABELS[booking.status] || booking.status}
                      </Badge>
                    </div>
                  </div>

                  {/* Arrow */}
                  <ChevronRight className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                </div>
              </Card>
            )
          })
        )}
      </div>
    </div>
  )
}

MobileBookingList.displayName = 'MobileBookingList'
