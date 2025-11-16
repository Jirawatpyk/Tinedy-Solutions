/**
 * BookingCard Component
 *
 * แสดงรายละเอียด booking ใน sidebar
 * Optimized with React.memo เพื่อลด re-renders
 */

import React from 'react'
import { Clock, User, Briefcase, Users } from 'lucide-react'
import { formatTime } from '@/lib/booking-utils'
import type { Booking } from '@/types/booking'
import { STATUS_COLORS } from '@/constants/booking-status'

interface BookingCardProps {
  booking: Booking
  onClick: (booking: Booking) => void
}

const BookingCardComponent: React.FC<BookingCardProps> = ({ booking, onClick }) => {
  return (
    <div
      onClick={() => onClick(booking)}
      className={`p-3 rounded-lg border-2 cursor-pointer hover:opacity-80 transition-opacity ${
        STATUS_COLORS[booking.status as keyof typeof STATUS_COLORS]
      }`}
    >
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-2">
          <Clock className="h-4 w-4" />
          <span className="font-semibold">
            {formatTime(booking.start_time)} - {formatTime(booking.end_time)}
          </span>
        </div>
        <span className="text-xs font-medium uppercase px-2 py-0.5 rounded">
          {booking.status.replace('_', ' ')}
        </span>
      </div>

      <div className="space-y-1 text-sm">
        <div className="flex items-center gap-2">
          <User className="h-3.5 w-3.5 text-muted-foreground" />
          <span>
            {booking.customers?.full_name || 'N/A'}
            <span className="ml-2 text-xs font-mono text-muted-foreground">#{booking.id.slice(0, 8)}</span>
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Briefcase className="h-3.5 w-3.5 text-muted-foreground" />
          <span>{booking.service_packages?.name || 'N/A'}</span>
        </div>
        {booking.profiles && (
          <div className="flex items-center gap-2 text-tinedy-blue">
            <User className="h-3.5 w-3.5" />
            <span>Staff: {booking.profiles.full_name}</span>
          </div>
        )}
        {booking.teams && (
          <div className="flex items-center gap-2 text-tinedy-green">
            <Users className="h-3.5 w-3.5" />
            <span>Team: {booking.teams.name}</span>
          </div>
        )}
      </div>
    </div>
  )
}

// Memoize component เพื่อป้องกัน re-render ถ้า booking ไม่เปลี่ยน
export const BookingCard = React.memo(BookingCardComponent, (prevProps, nextProps) => {
  // เปรียบเทียบ booking id (ถ้า id เหมือนกันและ reference เหมือนกัน = ไม่ต้อง re-render)
  return (
    prevProps.booking.id === nextProps.booking.id &&
    prevProps.booking === nextProps.booking // Reference equality check
  )
})

BookingCard.displayName = 'BookingCard'
