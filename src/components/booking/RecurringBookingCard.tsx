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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { StatusBadge, getBookingStatusVariant, getBookingStatusLabel } from '@/components/common/StatusBadge'
import {
  ChevronDown,
  ChevronUp,
  Calendar,
  CheckCircle,
  XCircle,
  Clock,
  Link2,
  User,
  Users
} from 'lucide-react'
import { cn, formatCurrency } from '@/lib/utils'
import { getRecurringPatternLabel } from '@/types/recurring-booking'
import { formatDate } from '@/lib/utils'
import { formatTime } from '@/lib/booking-utils'
import type { RecurringGroup } from '@/types/recurring-booking'
import { PermissionAwareDeleteButton } from '@/components/common/PermissionAwareDeleteButton'

interface RecurringBookingCardProps {
  group: RecurringGroup
  onBookingClick?: (bookingId: string) => void
  onDeleteGroup?: (groupId: string) => void
  onGroupStatusChange?: (groupId: string, newStatus: string, bookingIds: string[]) => void
}

// Helper Functions สำหรับ Status Management
const FINAL_STATUSES = ['completed', 'cancelled', 'no_show']

const getValidTransitions = (currentStatus: string): string[] => {
  const transitions: Record<string, string[]> = {
    pending: ['confirmed', 'cancelled'],
    confirmed: ['in_progress', 'cancelled', 'no_show'],
    in_progress: ['completed', 'cancelled'],
    completed: [],
    cancelled: [],
    no_show: [],
  }
  return transitions[currentStatus] || []
}

export function RecurringBookingCard({
  group,
  onBookingClick,
  onDeleteGroup,
  onGroupStatusChange
}: RecurringBookingCardProps) {
  const [expanded, setExpanded] = useState(false)

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

  // ====== Status Management Logic ======

  // Get editable bookings (not in final states)
  const editableBookings = group.bookings.filter(
    booking => !FINAL_STATUSES.includes(booking.status)
  )

  // Calculate group status
  const getGroupStatus = (): string => {
    if (editableBookings.length === 0) return 'completed'

    const statuses = new Set(editableBookings.map(b => b.status))
    return statuses.size === 1 ? editableBookings[0].status : 'mixed'
  }

  // Get available statuses for group (intersection of all valid transitions)
  const getGroupAvailableStatuses = (): string[] => {
    if (editableBookings.length === 0) return []

    // Get all possible transitions for each editable booking
    const allTransitions = editableBookings.map(booking =>
      new Set([booking.status, ...getValidTransitions(booking.status)])
    )

    // Find intersection (common statuses available to ALL bookings)
    if (allTransitions.length === 0) return []

    const intersection = [...allTransitions[0]].filter(status =>
      allTransitions.every(set => set.has(status))
    )

    return intersection
  }

  const groupStatus = getGroupStatus()
  const availableStatuses = getGroupAvailableStatuses()
  const hasEditableBookings = editableBookings.length > 0

  // Handle group status change
  const handleGroupStatusChange = (newStatus: string) => {
    if (!onGroupStatusChange) return
    if (newStatus === groupStatus) return

    const bookingIds = editableBookings.map(b => b.id)
    onGroupStatusChange(group.groupId, newStatus, bookingIds)
  }

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader
        className="p-4 cursor-pointer hover:bg-accent/50 transition-colors"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex flex-col sm:flex-row sm:items-start justify-between flex-1 gap-4">
          <div className="space-y-2 flex-1">
            {/* Header */}
            <div className="flex items-center gap-2 flex-wrap">
              <Link2 className="h-4 w-4 text-tinedy-blue" />
              <span className="font-semibold">Recurring Booking Group</span>
              <Badge variant="outline" className="text-xs">
                {getRecurringPatternLabel(group.pattern)}
              </Badge>
            </div>

            {/* ข้อมูลลูกค้าและ package */}
            <div className="text-sm text-muted-foreground">
              {customerName} • {packageName}
            </div>

            {/* Staff/Team Assignment */}
            <div className="flex flex-wrap gap-3 text-sm">
              {firstBooking.profiles && (
                <p className="text-tinedy-blue flex items-center gap-1">
                  <User className="h-3 w-3" />
                  Staff: {firstBooking.profiles.full_name}
                </p>
              )}
              {firstBooking.teams && (
                <p className="text-tinedy-green flex items-center gap-1">
                  <Users className="h-3 w-3" />
                  Team: {firstBooking.teams.name}
                </p>
              )}
            </div>

            {/* Statistics & Status Dropdown */}
            <div className="flex gap-4 text-sm flex-wrap items-center">
              <div className="flex items-center gap-1">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <span>{group.completedCount} Completed</span>
              </div>
              <div className="flex items-center gap-1">
                <Clock className="h-4 w-4 text-blue-600" />
                <span>{group.upcomingCount} Upcoming</span>
              </div>
              {group.cancelledCount > 0 && (
                <div className="flex items-center gap-1">
                  <XCircle className="h-4 w-4 text-red-600" />
                  <span>{group.cancelledCount} Cancelled</span>
                </div>
              )}

              {/* Status Dropdown */}
              {hasEditableBookings && onGroupStatusChange && (
                <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                  <span className="text-muted-foreground">•</span>
                  <Select
                    value={groupStatus}
                    onValueChange={handleGroupStatusChange}
                    disabled={!hasEditableBookings || availableStatuses.length === 0}
                  >
                    <SelectTrigger className="w-36 h-8">
                      <SelectValue>
                        {groupStatus === 'mixed' ? 'Mixed Status' : getBookingStatusLabel(groupStatus)}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {availableStatuses.map((status) => (
                        <SelectItem key={status} value={status}>
                          {getBookingStatusLabel(status)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
          </div>

          {/* Right Section: Total Amount, Delete & Expand Button */}
          <div className="flex sm:flex-col items-center sm:items-end gap-4">
            <div className="flex-1 sm:flex-none text-right">
              <p className="font-semibold text-tinedy-dark text-lg">
                {formatCurrency(totalAmount)}
              </p>
              <p className="text-xs text-muted-foreground">
                Total ({group.totalBookings} bookings)
              </p>
            </div>

            {/* Expand/Collapse Button & Delete Button */}
            <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
              <Button variant="ghost" size="sm" onClick={(e) => {
                e.stopPropagation()
                setExpanded(!expanded)
              }}>
                {expanded ? (
                  <ChevronUp className="h-4 w-4" />
                ) : (
                  <ChevronDown className="h-4 w-4" />
                )}
              </Button>
              {onDeleteGroup && (
                <PermissionAwareDeleteButton
                  resource="bookings"
                  itemName={`Recurring Group (${group.totalBookings} bookings)`}
                  onDelete={() => onDeleteGroup(group.groupId)}
                  onCancel={() => onDeleteGroup(group.groupId)}
                  cancelText="Cancel Group"
                />
              )}
            </div>
          </div>
        </div>
      </CardHeader>

      {/* Expanded Content */}
      {expanded && (
        <CardContent className="pt-0">
          <div className="space-y-2">
            {group.bookings.map((booking) => {
              const bgColor = booking.status === 'completed'
                ? 'bg-green-50 hover:bg-green-100'
                : booking.status === 'cancelled'
                ? 'bg-red-50 hover:bg-red-100'
                : 'hover:bg-accent'

              return (
                <div
                  key={booking.id}
                  className={cn(
                    "flex items-center justify-between rounded-lg border p-3",
                    "cursor-pointer transition-colors",
                    bgColor
                  )}
                  onClick={() => onBookingClick?.(booking.id)}
                >
                  <div className="flex items-center gap-3">
                    <Badge variant="outline" className="min-w-[60px] justify-center">
                      {booking.recurring_sequence}/{booking.recurring_total}
                    </Badge>
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <div className="space-y-1">
                      <div className="text-sm font-medium">
                        {formatDate(booking.booking_date)}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {formatTime(booking.start_time)} - {booking.end_time ? formatTime(booking.end_time) : 'N/A'}
                      </div>
                    </div>
                  </div>

                  <StatusBadge variant={getBookingStatusVariant(booking.status)}>
                    {getBookingStatusLabel(booking.status)}
                  </StatusBadge>
                </div>
              )
            })}
          </div>
        </CardContent>
      )}
    </Card>
  )
}
