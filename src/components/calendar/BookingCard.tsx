/**
 * BookingCard Component
 *
 * Modern card design สำหรับแสดงรายละเอียด booking ใน sidebar
 * - UI ที่ทันสมัย ดูง่าย และใช้งานสะดวก
 * - รองรับ status badge editor แบบ inline
 * - แสดง conflict warnings
 * - Optimized with React.memo เพื่อลด re-renders
 */

import React from 'react'
import { Clock, User, Briefcase, Users, AlertTriangle, Calendar, DollarSign, CreditCard } from 'lucide-react'
import { formatTime } from '@/lib/booking-utils'
import { formatBookingId } from '@/lib/utils'
import { formatDateRange } from '@/lib/date-range-utils'
import { BookingStatus } from '@/types/booking'
import type { Booking } from '@/types/booking'
import { BOOKING_STATUS_COLORS, BOOKING_STATUS_CARD_COLORS, PAYMENT_STATUS_COLORS, PAYMENT_STATUS_LABELS, type PaymentStatus } from '@/constants/booking-status'
import { StatusBadgeEditor } from './StatusBadgeEditor'
import { Badge } from '@/components/ui/badge'

interface BookingCardProps {
  booking: Booking
  onClick: (booking: Booking) => void
  hasConflict?: boolean
  conflictCount?: number
  onStatusChange?: (bookingId: string, newStatus: string) => Promise<void>
  disableStatusEdit?: boolean
  availableStatuses?: string[] // Available status transitions
}

const BookingCardComponent: React.FC<BookingCardProps> = ({
  booking,
  onClick,
  hasConflict = false,
  conflictCount = 0,
  onStatusChange,
  disableStatusEdit = false,
  availableStatuses,
}) => {
  const handleStatusChange = async (newStatus: string) => {
    if (onStatusChange) {
      await onStatusChange(booking.id, newStatus)
    }
  }

  // Check if current status is a final state (cannot be edited)
  const isFinalState = ([BookingStatus.Completed, BookingStatus.Cancelled, BookingStatus.NoShow] as string[]).includes(booking.status)

  // Generate accessible description for booking card
  const bookingDescription = React.useMemo(() => {
    const parts = [
      `Booking on ${new Date(booking.booking_date).toLocaleDateString('en-US', {
        month: 'long',
        day: 'numeric',
        year: 'numeric'
      })}`,
      `from ${formatTime(booking.start_time)} to ${formatTime(booking.end_time)}`,
      `for ${booking.customers?.full_name || 'Unknown customer'}`,
      `service: ${booking.service_packages?.name || 'Unknown service'}`,
      `status: ${booking.status.replace('_', ' ')}`
    ]

    if (booking.payment_status) {
      parts.push(`payment: ${booking.payment_status}`)
    }

    if (hasConflict) {
      parts.push(`has ${conflictCount} conflict${conflictCount > 1 ? 's' : ''}`)
    }

    if (booking.profiles) {
      parts.push(`assigned to staff: ${booking.profiles.full_name}`)
    } else if (booking.teams) {
      parts.push(`assigned to team: ${booking.teams.name}`)
    }

    return parts.join(', ')
  }, [booking, hasConflict, conflictCount])

  return (
    <div
      role="article"
      aria-label={bookingDescription}
      onClick={() => onClick(booking)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onClick(booking)
        }
      }}
      tabIndex={0}
      className={`
        group relative p-3 rounded-lg border-2 cursor-pointer
        transition-all duration-200 hover:shadow-lg
        ${BOOKING_STATUS_CARD_COLORS[booking.status as keyof typeof BOOKING_STATUS_CARD_COLORS] || 'bg-tinedy-off-white/50 border-tinedy-dark/10'}
        ${hasConflict ? '!border-red-500 !bg-red-50 dark:!bg-red-950/20' : ''}
      `}
    >
      {/* Conflict Alert Banner */}
      {hasConflict && (
        <div className="absolute top-0 left-0 right-0 bg-red-500 text-white px-2 py-0.5 rounded-t-md flex items-center gap-1.5 text-xs font-semibold">
          <AlertTriangle className="h-3 w-3" />
          <span>{conflictCount} Conflict{conflictCount > 1 ? 's' : ''}</span>
        </div>
      )}

      {/* Header: Date, Time & Status */}
      <div className={`${hasConflict ? 'mt-5' : ''}`}>
        {/* Date & Booking ID */}
        <div className="flex items-center justify-between gap-2 mb-2">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <Calendar className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
            <span className="text-xs text-muted-foreground truncate">
              {formatDateRange(booking.booking_date, booking.end_date)}
            </span>
          </div>
          <span className="text-[10px] text-muted-foreground">
            {formatBookingId(booking.id)}
          </span>
        </div>

        {/* Time & Status */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <Clock className="h-4 w-4 text-primary flex-shrink-0" />
            <div className="font-semibold text-sm truncate">
              {formatTime(booking.start_time)} - {formatTime(booking.end_time)}
            </div>
          </div>

          {/* Booking Status Badge with Inline Editor */}
          {onStatusChange && !disableStatusEdit && !isFinalState ? (
            <div onClick={(e) => e.stopPropagation()} aria-label={`Change booking status from ${booking.status.replace('_', ' ')}`}>
              <StatusBadgeEditor
                currentStatus={booking.status}
                onStatusChange={handleStatusChange}
                availableStatuses={availableStatuses}
              />
            </div>
          ) : (
            <Badge
              variant="outline"
              className={`text-[10px] font-medium uppercase px-1.5 py-0.5 ${BOOKING_STATUS_COLORS[booking.status as keyof typeof BOOKING_STATUS_COLORS] || 'bg-tinedy-off-white text-tinedy-dark border-tinedy-dark/20'}`}
              aria-label={`Booking status: ${booking.status.replace('_', ' ')}`}
            >
              {booking.status.replace('_', ' ')}
            </Badge>
          )}
        </div>
      </div>

      {/* Compact Info - Icon + Data only */}
      <div className="mt-2.5 space-y-1.5 text-sm">
        {/* Customer with Payment Status */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <User className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
            <span className="font-medium truncate">
              {booking.customers?.full_name || 'N/A'}
            </span>
          </div>

          {/* Payment Status Badge - using centralized constants */}
          {booking.payment_status && PAYMENT_STATUS_COLORS[booking.payment_status as PaymentStatus] && (
            <Badge className={`text-[10px] font-medium ${PAYMENT_STATUS_COLORS[booking.payment_status as PaymentStatus]} px-1.5 py-0.5 flex items-center gap-1 flex-shrink-0`}>
              {booking.payment_status === 'paid' ? (
                <CreditCard className="h-2.5 w-2.5" />
              ) : (
                <DollarSign className="h-2.5 w-2.5" />
              )}
              {PAYMENT_STATUS_LABELS[booking.payment_status as PaymentStatus]}
            </Badge>
          )}
        </div>

        {/* Service Package */}
        <div className="flex items-center gap-2">
          <Briefcase className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
          <span className="truncate">
            {booking.job_name ?? booking.service_packages?.name ?? booking.service_packages_v2?.name ?? 'N/A'}
          </span>
        </div>

        {/* Staff */}
        {booking.profiles && (
          <div className="flex items-center gap-2">
            <User className="h-3.5 w-3.5 text-blue-600 dark:text-blue-500 flex-shrink-0" />
            <span className="text-blue-700 dark:text-blue-500 truncate">
              {booking.profiles.full_name}
            </span>
          </div>
        )}

        {/* Team */}
        {booking.teams && (
          <div className="flex items-center gap-2">
            <Users className="h-3.5 w-3.5 text-green-600 dark:text-green-500 flex-shrink-0" />
            <span className="text-green-700 dark:text-green-500 truncate">
              {booking.teams.name}
            </span>
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
    prevProps.booking === nextProps.booking && // Reference equality check
    prevProps.hasConflict === nextProps.hasConflict &&
    prevProps.conflictCount === nextProps.conflictCount &&
    prevProps.onStatusChange === nextProps.onStatusChange &&
    prevProps.disableStatusEdit === nextProps.disableStatusEdit &&
    prevProps.availableStatuses === nextProps.availableStatuses
  )
})

BookingCard.displayName = 'BookingCard'
