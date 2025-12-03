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

  // Parse height to determine if we should show minimal content
  const heightNum = parseFloat(height)
  const isCompact = heightNum < 8 // Less than 8% height = very short booking
  const isMedium = heightNum >= 8 && heightNum < 15 // Medium height
  // const isLarge = heightNum >= 15 // Large enough for all content

  // Check if we have many overlapping columns (narrow width)
  const isNarrow = totalColumns >= 3

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
      <div className="px-1 sm:px-2 py-0.5 sm:py-1 h-full flex flex-col items-center justify-center text-xs">
        {/* Time - always show */}
        <div className="font-semibold truncate text-center w-full text-[10px] sm:text-xs">
          {formatTime(booking.start_time)}
        </div>

        {/* Customer name - hide on compact or when narrow with many overlaps */}
        {!isCompact && !(isNarrow && isMedium) && (
          <div className="text-[9px] sm:text-[10px] truncate text-center w-full opacity-90 hidden sm:block">
            {booking.customers?.full_name || 'No Customer'}
          </div>
        )}

        {/* Service name - only show on large bookings with space */}
        {!isCompact && !isMedium && !isNarrow && (
          <div className="text-[9px] sm:text-[10px] truncate text-center w-full opacity-75 hidden lg:block">
            {booking.service_packages?.name}
          </div>
        )}
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
