/**
 * RecurringBookingCard Component
 *
 * แสดง booking card สำหรับ recurring group (แบบ grouped view)
 * - Collapsible: คลิกเพื่อขยาย/ย่อ
 * - แสดงสถิติ: เสร็จสิ้น/กำลังมาถึง/ยกเลิก
 * - แสดง bookings ทั้งหมดเมื่อขยาย
 */

import { useState } from 'react'
import { Card, CardHeader, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  ChevronDown,
  ChevronUp,
  Calendar,
  CheckCircle,
  XCircle,
  Clock,
  User,
  Users,
  RotateCcw,
  PlayCircle
} from 'lucide-react'
import { cn, formatCurrency } from '@/lib/utils'
import { getRecurringPatternLabel } from '@/types/recurring-booking'
import { formatDate } from '@/lib/utils'
import { formatTime } from '@/lib/booking-utils'
import type { RecurringGroup } from '@/types/recurring-booking'
import { PermissionAwareDeleteButton } from '@/components/common/PermissionAwareDeleteButton'
import { StatusBadge } from '@/components/common/StatusBadge'
import { getPaymentStatusVariant, getPaymentStatusLabel } from '@/lib/status-utils'

interface RecurringBookingCardProps {
  group: RecurringGroup
  selectedBookings?: string[]
  onToggleSelectGroup?: (bookingIds: string[]) => void
  onBookingClick?: (bookingId: string) => void
  onDeleteGroup?: (groupId: string) => void
  onArchiveGroup?: (groupId: string) => void
  onRestoreBooking?: (bookingId: string) => void
  onStatusChange?: (bookingId: string, currentStatus: string, newStatus: string) => void
  onVerifyPayment?: (bookingId: string) => void
  getAvailableStatuses: (currentStatus: string) => string[]
  getStatusLabel: (status: string) => string
}

// Helper function to check if status is final
const isFinalStatus = (status: string): boolean => {
  return ['completed', 'cancelled', 'no_show'].includes(status)
}

export function RecurringBookingCard({
  group,
  selectedBookings = [],
  onToggleSelectGroup,
  onBookingClick,
  onDeleteGroup,
  onArchiveGroup,
  onRestoreBooking,
  onStatusChange,
  onVerifyPayment,
  getAvailableStatuses,
  getStatusLabel
}: RecurringBookingCardProps) {
  const [expanded, setExpanded] = useState(false)

  // Check if all bookings in group are selected
  const groupBookingIds = group.bookings.map(b => b.id)
  const isGroupSelected = groupBookingIds.every(id => selectedBookings.includes(id))
  const isPartiallySelected = groupBookingIds.some(id => selectedBookings.includes(id)) && !isGroupSelected

  const firstBooking = group.bookings[0]

  // ดึงชื่อลูกค้าและ package
  const customerName = firstBooking.customers?.full_name || 'N/A'
  const packageName = firstBooking.service_packages?.name ||
                      firstBooking.service_packages_v2?.name ||
                      'N/A'

  // คำนวณยอดเงินรวมของทุก booking ใน group
  const totalAmount = group.bookings.reduce((sum, booking) => {
    return sum + Number(booking.total_price || 0)
  }, 0)

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader
        className="p-3 sm:p-4 cursor-pointer hover:bg-accent/50 transition-colors"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex flex-col sm:flex-row sm:items-start justify-between flex-1 gap-3 sm:gap-4">
          <div className="space-y-1.5 sm:space-y-2 flex-1 min-w-0">
            {/* Header */}
            <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
              {onToggleSelectGroup && (
                <Checkbox
                  checked={isGroupSelected}
                  ref={(el) => {
                    if (el) {
                      (el as HTMLButtonElement & { indeterminate: boolean }).indeterminate = isPartiallySelected
                    }
                  }}
                  onCheckedChange={() => onToggleSelectGroup(groupBookingIds)}
                  onClick={(e) => e.stopPropagation()}
                  className="flex-shrink-0"
                />
              )}
              <span className="font-semibold text-sm sm:text-base">Recurring Booking Group</span>
              <Badge variant="outline" className="text-[10px] sm:text-xs">
                {getRecurringPatternLabel(group.pattern)}
              </Badge>
              {/* Mobile: Expand button บนขวา */}
              <Button variant="ghost" size="sm" onClick={(e) => {
                e.stopPropagation()
                setExpanded(!expanded)
              }} className="sm:hidden h-6 w-6 p-0 ml-auto">
                {expanded ? (
                  <ChevronUp className="h-4 w-4" />
                ) : (
                  <ChevronDown className="h-4 w-4" />
                )}
              </Button>
            </div>

            {/* ข้อมูลลูกค้าและ package */}
            <div className="text-xs sm:text-sm text-muted-foreground truncate">
              {customerName} • {packageName}
            </div>

            {/* Staff/Team Assignment */}
            <div className="flex flex-wrap gap-2 sm:gap-3 text-xs sm:text-sm">
              {firstBooking.profiles && (
                <p className="text-tinedy-blue flex items-center gap-1">
                  <User className="h-3 w-3 flex-shrink-0" />
                  <span className="truncate">Staff: {firstBooking.profiles.full_name}</span>
                </p>
              )}
              {firstBooking.teams && (
                <p className="text-tinedy-green flex items-center gap-1">
                  <Users className="h-3 w-3 flex-shrink-0" />
                  <span className="truncate">Team: {firstBooking.teams.name}</span>
                </p>
              )}
            </div>

            {/* Statistics */}
            <div className="flex gap-2 sm:gap-4 text-xs sm:text-sm flex-wrap">
              <div className="flex items-center gap-1">
                <CheckCircle className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-green-600 flex-shrink-0" />
                <span>{group.completedCount} <span className="hidden sm:inline">Completed</span></span>
              </div>
              {group.confirmedCount > 0 && (
                <div className="flex items-center gap-1">
                  <CheckCircle className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-blue-600 flex-shrink-0" />
                  <span>{group.confirmedCount} <span className="hidden sm:inline">Confirmed</span></span>
                </div>
              )}
              {group.inProgressCount > 0 && (
                <div className="flex items-center gap-1">
                  <PlayCircle className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-purple-600 flex-shrink-0" />
                  <span>{group.inProgressCount} <span className="hidden sm:inline">In Progress</span></span>
                </div>
              )}
              <div className="flex items-center gap-1">
                <Clock className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-orange-600 flex-shrink-0" />
                <span>{group.upcomingCount} <span className="hidden sm:inline">Upcoming</span></span>
              </div>
              {group.noShowCount > 0 && (
                <div className="flex items-center gap-1">
                  <XCircle className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-gray-500 flex-shrink-0" />
                  <span>{group.noShowCount} <span className="hidden sm:inline">No Show</span></span>
                </div>
              )}
              {group.cancelledCount > 0 && (
                <div className="flex items-center gap-1">
                  <XCircle className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-red-600 flex-shrink-0" />
                  <span>{group.cancelledCount} <span className="hidden sm:inline">Cancelled</span></span>
                </div>
              )}
            </div>
          </div>

          {/* Right Section: Total Amount, Payment Badge, Delete & Expand Button */}
          <div className="flex sm:flex-col items-center sm:items-end gap-3 sm:gap-4 flex-shrink-0">
            {/* Desktop: ราคาด้านบนขวา */}
            <div className="hidden sm:block flex-1 sm:flex-none">
              <div className="flex items-baseline gap-1.5 sm:gap-2 mb-1 sm:mb-2">
                <p className="font-semibold text-tinedy-dark text-base sm:text-lg whitespace-nowrap">
                  {formatCurrency(totalAmount)}
                </p>
                <p className="text-[10px] sm:text-xs text-muted-foreground whitespace-nowrap">
                  Total ({group.totalBookings})
                </p>
              </div>
            </div>
            {/* Payment Status Badge - แยกออกมาด้านขวา (เหมือน Individual) */}
            <div className="hidden sm:flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
              {(() => {
                // ใช้ payment_status จาก booking แรก (เพราะจ่ายรวมทั้งกลุ่ม)
                const paymentStatus = firstBooking.payment_status || 'unpaid'

                return (
                  <>
                    <StatusBadge variant={getPaymentStatusVariant(paymentStatus)}>
                      {getPaymentStatusLabel(paymentStatus)}
                    </StatusBadge>
                    {paymentStatus === 'pending_verification' && onVerifyPayment && firstBooking.payment_slip_url && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={(e) => {
                          e.stopPropagation()
                          onVerifyPayment(firstBooking.id)
                        }}
                        className="h-7 text-xs border-green-500 text-green-700 hover:bg-green-50"
                      >
                        Verify
                      </Button>
                    )}
                  </>
                )
              })()}
            </div>

            {/* Expand/Collapse Button & Delete Button (Desktop only) */}
            <div className="hidden sm:flex gap-1 sm:gap-2" onClick={(e) => e.stopPropagation()}>
              <Button variant="ghost" size="sm" onClick={(e) => {
                e.stopPropagation()
                setExpanded(!expanded)
              }} className="h-8 w-8 p-0">
                {expanded ? (
                  <ChevronUp className="h-4 w-4" />
                ) : (
                  <ChevronDown className="h-4 w-4" />
                )}
              </Button>
              {(onDeleteGroup || onArchiveGroup) && (
                <PermissionAwareDeleteButton
                  resource="bookings"
                  itemName={`Recurring Group (${group.totalBookings} bookings)`}
                  onDelete={onDeleteGroup ? () => onDeleteGroup(group.groupId) : undefined}
                  onCancel={onArchiveGroup ? () => onArchiveGroup(group.groupId) : undefined}
                  cancelText="Archive Group"
                  className="h-8 w-8"
                />
              )}
            </div>
          </div>
        </div>

        {/* Mobile: ราคาและ Payment Status ข้างล่าง */}
        <div className="sm:hidden flex items-center justify-between mt-2 pt-2 border-t" onClick={(e) => e.stopPropagation()}>
          <div className="flex items-baseline gap-1.5">
            <p className="font-semibold text-tinedy-dark">
              {formatCurrency(totalAmount)}
            </p>
            <p className="text-[10px] text-muted-foreground">
              ({group.totalBookings})
            </p>
          </div>
          <div className="flex items-center gap-2">
            {(() => {
              const paymentStatus = firstBooking.payment_status || 'unpaid'
              return (
                <StatusBadge variant={getPaymentStatusVariant(paymentStatus)}>
                  {getPaymentStatusLabel(paymentStatus)}
                </StatusBadge>
              )
            })()}
            {(onDeleteGroup || onArchiveGroup) && (
              <PermissionAwareDeleteButton
                resource="bookings"
                itemName={`Recurring Group (${group.totalBookings} bookings)`}
                onDelete={onDeleteGroup ? () => onDeleteGroup(group.groupId) : undefined}
                onCancel={onArchiveGroup ? () => onArchiveGroup(group.groupId) : undefined}
                cancelText="Archive Group"
                className="h-7 w-7"
              />
            )}
          </div>
        </div>
      </CardHeader>

      {/* Expanded Content */}
      {expanded && (
        <CardContent className="pt-0 px-3 sm:px-4">
          <div className="space-y-1.5 sm:space-y-2">
            {group.bookings.map((booking) => {
              const isArchived = !!booking.deleted_at
              const bgColor = isArchived
                ? 'bg-gray-100 hover:bg-gray-200 opacity-60 border-dashed'
                : booking.status === 'completed'
                ? 'bg-green-50 hover:bg-green-100'
                : booking.status === 'cancelled'
                ? 'bg-red-50 hover:bg-red-100'
                : 'hover:bg-accent'

              return (
                <div
                  key={booking.id}
                  className={cn(
                    "flex flex-col sm:flex-row sm:items-center sm:justify-between rounded-lg border p-2.5 sm:p-3 gap-2 sm:gap-3",
                    "cursor-pointer transition-colors",
                    bgColor
                  )}
                  onClick={() => onBookingClick?.(booking.id)}
                >
                  <div className="flex items-center gap-1.5 sm:gap-2 sm:gap-3 flex-1 min-w-0">
                    <Badge variant="outline" className="min-w-[45px] sm:min-w-[50px] sm:min-w-[60px] justify-center text-[10px] sm:text-xs flex-shrink-0">
                      {booking.recurring_sequence}/{booking.recurring_total}
                    </Badge>
                    <Calendar className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-muted-foreground flex-shrink-0" />
                    <div className="space-y-0.5 sm:space-y-1 flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                        <span className="text-xs sm:text-sm font-medium">
                          {formatDate(booking.booking_date)}
                        </span>
                        {isArchived && (
                          <Badge variant="outline" className="border-red-300 text-red-700 bg-red-50 text-[10px] sm:text-xs">
                            Archived
                          </Badge>
                        )}
                      </div>
                      <div className="text-[10px] sm:text-xs text-muted-foreground">
                        {formatTime(booking.start_time)} - {booking.end_time ? formatTime(booking.end_time) : 'N/A'}
                      </div>
                    </div>
                  </div>

                  {/* Actions: Status Dropdown or Restore Button */}
                  <div onClick={(e) => e.stopPropagation()} className="w-full sm:w-auto">
                    {isArchived && onRestoreBooking ? (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation()
                          onRestoreBooking(booking.id)
                        }}
                        className="border-green-500 text-green-700 hover:bg-green-50 w-full sm:w-auto h-8 text-xs"
                      >
                        <RotateCcw className="h-3.5 w-3.5 sm:h-4 sm:w-4 sm:mr-1" />
                        <span className="hidden sm:inline">Restore</span>
                      </Button>
                    ) : (
                      <Select
                        value={booking.status}
                        onValueChange={(newStatus) => onStatusChange?.(booking.id, booking.status, newStatus)}
                        disabled={isFinalStatus(booking.status)}
                      >
                        <SelectTrigger className="w-full sm:w-32 h-8 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {getAvailableStatuses(booking.status).map((status) => (
                            <SelectItem key={status} value={status}>
                              {getStatusLabel(status)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </CardContent>
      )}
    </Card>
  )
}
