/**
 * BookingListSidebar Component
 *
 * Modern sidebar component สำหรับแสดง bookings ของวันที่เลือก
 * - รองรับทั้ง single date และ date range
 * - แสดง Quick Stats สรุปสถานะ
 * - UI ที่ทันสมัยและอ่านง่าย
 * - Optimized performance ด้วย React.memo
 */

import React, { useMemo } from 'react'
import { format } from 'date-fns'
import { Calendar as CalendarIcon, Clock, CheckCircle2, AlertCircle, DollarSign, CreditCard } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Badge } from '@/components/ui/badge'
import { BookingCard } from './BookingCard'
import type { Booking } from '@/types/booking'

interface BookingListSidebarProps {
  /** Selected single date */
  selectedDate: Date | null
  /** Selected date range */
  selectedDateRange: { start: Date; end: Date } | null
  /** Filtered bookings to display */
  bookings: Booking[]
  /** Map of booking conflicts */
  conflictMap: Map<string, Set<string>>
  /** Handler for booking card click */
  onBookingClick: (booking: Booking) => void
  /** Handler for status change */
  onStatusChange: (bookingId: string, newStatus: string) => Promise<void>
  /** Get available status transitions */
  getAvailableStatuses: (currentStatus: string) => string[]
}

const BookingListSidebarComponent: React.FC<BookingListSidebarProps> = ({
  selectedDate,
  selectedDateRange,
  bookings,
  conflictMap,
  onBookingClick,
  onStatusChange,
  getAvailableStatuses,
}) => {
  // คำนวณ Quick Stats
  const stats = useMemo(() => {
    const pending = bookings.filter((b) => b.status === 'pending').length
    const confirmed = bookings.filter((b) => b.status === 'confirmed').length
    const inProgress = bookings.filter((b) => b.status === 'in_progress').length
    const completed = bookings.filter((b) => b.status === 'completed').length
    const cancelled = bookings.filter((b) => b.status === 'cancelled').length
    const unpaid = bookings.filter((b) => b.payment_status === 'unpaid').length
    const paid = bookings.filter((b) => b.payment_status === 'paid').length

    return { pending, confirmed, inProgress, completed, cancelled, unpaid, paid }
  }, [bookings])

  // สร้าง title สำหรับ header (compact format)
  const headerTitle = useMemo(() => {
    if (selectedDate) {
      return format(selectedDate, 'MMM d, yyyy')
    }
    if (selectedDateRange) {
      const startMonth = format(selectedDateRange.start, 'MMM')
      const endMonth = format(selectedDateRange.end, 'MMM')
      const startYear = format(selectedDateRange.start, 'yyyy')
      const endYear = format(selectedDateRange.end, 'yyyy')

      // Same month and year: "Nov 25-30, 2025"
      if (startMonth === endMonth && startYear === endYear) {
        return `${format(selectedDateRange.start, 'MMM d')}-${format(selectedDateRange.end, 'd, yyyy')}`
      }
      // Different month, same year: "Nov 25 - Dec 25, 2025"
      if (startYear === endYear) {
        return `${format(selectedDateRange.start, 'MMM d')} - ${format(selectedDateRange.end, 'MMM d, yyyy')}`
      }
      // Different year: "Dec 25, 2025 - Jan 25, 2026"
      return `${format(selectedDateRange.start, 'MMM d, yyyy')} - ${format(selectedDateRange.end, 'MMM d, yyyy')}`
    }
    // ถ้ามี bookings แสดงว่ากำลังใช้ filter (preset, search, etc.)
    if (bookings.length > 0) {
      return 'Filtered Results'
    }
    return 'Select a date'
  }, [selectedDate, selectedDateRange, bookings.length])

  // ตรวจสอบว่ามีการเลือกวันหรือไม่
  const hasSelection = selectedDate || selectedDateRange
  const hasBookings = bookings.length > 0

  return (
    <Card className="lg:col-span-1 flex flex-col h-full max-h-[calc(100vh-200px)]">
      <CardHeader className="py-3 px-4 flex-shrink-0 border-b">
        {/* Compact Header - Single Line */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <CalendarIcon className="h-4 w-4 text-muted-foreground flex-shrink-0" />
            <CardTitle className="font-display text-sm font-semibold truncate">
              {headerTitle}
            </CardTitle>
          </div>
          {hasBookings && (
            <Badge variant="secondary" className="text-xs px-2 py-0.5">
              {bookings.length} booking{bookings.length > 1 ? 's' : ''}
            </Badge>
          )}
        </div>

        {/* Compact Stats - Icon + Number inline (แสดงเมื่อมี bookings) */}
        {hasBookings && (
          <div className="flex items-center gap-3 mt-2 text-xs flex-wrap">
            {/* Pending - แสดงเสมอ */}
            <div className="flex items-center gap-1">
              <Clock className="h-3 w-3 text-yellow-600 dark:text-yellow-500" />
              <span className="font-medium text-yellow-700 dark:text-yellow-500">{stats.pending}</span>
            </div>

            {/* Confirmed */}
            {stats.confirmed > 0 && (
              <div className="flex items-center gap-1">
                <CheckCircle2 className="h-3 w-3 text-blue-600 dark:text-blue-500" />
                <span className="font-medium text-blue-700 dark:text-blue-500">{stats.confirmed}</span>
              </div>
            )}

            {/* Completed */}
            {stats.completed > 0 && (
              <div className="flex items-center gap-1">
                <CheckCircle2 className="h-3 w-3 text-green-600 dark:text-green-500" />
                <span className="font-medium text-green-700 dark:text-green-500">{stats.completed}</span>
              </div>
            )}

            {/* Unpaid */}
            {stats.unpaid > 0 && (
              <div className="flex items-center gap-1">
                <DollarSign className="h-3 w-3 text-orange-600 dark:text-orange-500" />
                <span className="font-medium text-orange-700 dark:text-orange-500">{stats.unpaid}</span>
              </div>
            )}

            {/* Paid */}
            {stats.paid > 0 && (
              <div className="flex items-center gap-1">
                <CreditCard className="h-3 w-3 text-emerald-600 dark:text-emerald-500" />
                <span className="font-medium text-emerald-700 dark:text-emerald-500">{stats.paid}</span>
              </div>
            )}
          </div>
        )}
      </CardHeader>

      <CardContent className="flex-1 min-h-0 p-0">
        {/* Empty State - ไม่มีการเลือกวันและไม่มี bookings */}
        {!hasSelection && !hasBookings ? (
          <div className="flex flex-col items-center justify-center h-full min-h-[300px] text-center px-4">
            <div className="mb-4 p-4 rounded-full bg-muted/50">
              <CalendarIcon className="h-10 w-10 text-muted-foreground" />
            </div>
            <h3 className="font-semibold text-base mb-2">No Date Selected</h3>
            <p className="text-xs text-muted-foreground max-w-[240px]">
              Click on a date in the calendar or use preset filters to view bookings
            </p>
          </div>
        ) : /* Empty State - มีการเลือกหรือ filter แต่ไม่มี bookings */
        !hasBookings ? (
          <div className="flex flex-col items-center justify-center h-full min-h-[300px] text-center px-4">
            <div className="mb-4 p-4 rounded-full bg-muted/50">
              <AlertCircle className="h-10 w-10 text-muted-foreground" />
            </div>
            <h3 className="font-semibold text-base mb-2">No Bookings</h3>
            <p className="text-xs text-muted-foreground max-w-[240px]">
              There are no bookings {selectedDateRange ? 'in this period' : selectedDate ? 'on this date' : 'matching your filters'}
            </p>
          </div>
        ) : (
          /* Booking List with visible scrollbar */
          <ScrollArea className="h-full px-4 py-3">
            <div className="space-y-2.5 pr-2">
              {bookings.map((booking) => {
                const conflicts = conflictMap.get(booking.id)
                const availableStatuses = getAvailableStatuses(booking.status)

                return (
                  <BookingCard
                    key={booking.id}
                    booking={booking}
                    onClick={onBookingClick}
                    hasConflict={!!conflicts && conflicts.size > 0}
                    conflictCount={conflicts?.size || 0}
                    onStatusChange={onStatusChange}
                    availableStatuses={availableStatuses}
                  />
                )
              })}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  )
}

// Memoize component เพื่อป้องกัน unnecessary re-renders
export const BookingListSidebar = React.memo(BookingListSidebarComponent, (prev, next) => {
  // เปรียบเทียบ props ที่สำคัญ
  return (
    prev.selectedDate?.getTime() === next.selectedDate?.getTime() &&
    prev.selectedDateRange?.start.getTime() === next.selectedDateRange?.start.getTime() &&
    prev.selectedDateRange?.end.getTime() === next.selectedDateRange?.end.getTime() &&
    prev.bookings === next.bookings &&
    prev.conflictMap === next.conflictMap &&
    prev.onBookingClick === next.onBookingClick &&
    prev.onStatusChange === next.onStatusChange &&
    prev.getAvailableStatuses === next.getAvailableStatuses
  )
})

BookingListSidebar.displayName = 'BookingListSidebar'
