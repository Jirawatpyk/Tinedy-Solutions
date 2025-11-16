/**
 * BookingBar Component
 *
 * แสดง booking bar ใน Weekly Schedule timeline
 * Optimized with React.memo เพื่อลด re-renders
 */

import React from 'react'
import type { Booking } from '@/types'
import { STATUS_COLORS_TIMELINE } from '@/constants/booking-status'
import { formatTime } from '@/lib/booking-utils'

interface BookingBarProps {
  booking: Booking
  column: number
  totalColumns: number
  top: string
  height: string
  onClick: (booking: Booking) => void
}

const BookingBarComponent: React.FC<BookingBarProps> = ({
  booking,
  column,
  totalColumns,
  top,
  height,
  onClick,
}) => {
  // Use centralized status colors from constants
  const bgColor = STATUS_COLORS_TIMELINE[booking.status as keyof typeof STATUS_COLORS_TIMELINE] || 'bg-tinedy-blue'

  const gap = 2
  const widthPercent = (100 / totalColumns) - gap
  const leftPercent = (column / totalColumns) * 100 + (gap / 2)

  return (
    <div
      className={`absolute rounded-md ${bgColor} text-white shadow-sm transition-all duration-300 ease-in-out cursor-pointer overflow-hidden group animate-in fade-in slide-in-from-right-4`}
      style={{
        top,
        height,
        left: `${leftPercent}%`,
        width: `${widthPercent}%`,
      }}
      onClick={() => onClick(booking)}
      title={`${booking.service_packages?.name} - ${booking.customers?.full_name || 'No Customer'}\n${formatTime(booking.start_time)} - ${formatTime(booking.end_time)}`}
    >
      <div className="px-2 py-1 h-full flex flex-col items-center justify-center text-xs">
        <div className="font-semibold truncate text-center w-full">
          {formatTime(booking.start_time)}
        </div>
        <div className="text-[10px] truncate text-center w-full opacity-90">
          {booking.customers?.full_name || 'No Customer'}
        </div>
        <div className="text-[10px] truncate text-center w-full opacity-75">
          {booking.service_packages?.name}
        </div>
      </div>
    </div>
  )
}

// Memoize component เพื่อป้องกัน re-render ถ้า props ไม่เปลี่ยน
export const BookingBar = React.memo(BookingBarComponent, (prevProps, nextProps) => {
  // Custom comparison function
  return (
    prevProps.booking.id === nextProps.booking.id &&
    prevProps.booking === nextProps.booking && // Reference equality check
    prevProps.column === nextProps.column &&
    prevProps.totalColumns === nextProps.totalColumns &&
    prevProps.top === nextProps.top &&
    prevProps.height === nextProps.height
  )
})

BookingBar.displayName = 'BookingBar'
