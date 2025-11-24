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
  onStatusChange?: (bookingId: string, currentStatus: string, newStatus: string) => void
  getAvailableStatuses: (currentStatus: string) => string[]
  getStatusLabel: (status: string) => string
}

// Helper function to check if status is final
const isFinalStatus = (status: string): boolean => {
  return ['completed', 'cancelled', 'no_show'].includes(status)
}

export function RecurringBookingCard({
  group,
  onBookingClick,
  onDeleteGroup,
  onStatusChange,
  getAvailableStatuses,
  getStatusLabel
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

            {/* Statistics */}
            <div className="flex gap-4 text-sm flex-wrap">
              <div className="flex items-center gap-1">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <span>{group.completedCount} Completed</span>
              </div>
              {group.confirmedCount > 0 && (
                <div className="flex items-center gap-1">
                  <CheckCircle className="h-4 w-4 text-blue-600" />
                  <span>{group.confirmedCount} Confirmed</span>
                </div>
              )}
              <div className="flex items-center gap-1">
                <Clock className="h-4 w-4 text-orange-600" />
                <span>{group.upcomingCount} Upcoming</span>
              </div>
              {group.cancelledCount > 0 && (
                <div className="flex items-center gap-1">
                  <XCircle className="h-4 w-4 text-red-600" />
                  <span>{group.cancelledCount} Cancelled</span>
                </div>
              )}
            </div>
          </div>

          {/* Right Section: Total Amount, Delete & Expand Button */}
          <div className="flex sm:flex-col items-center sm:items-end gap-4">
            <div className="flex-1 sm:flex-none text-right">
              <div className="flex items-baseline justify-end gap-2">
                <p className="text-xs text-muted-foreground">
                  Total ({group.totalBookings} bookings)
                </p>
                <p className="font-semibold text-tinedy-dark text-lg">
                  {formatCurrency(totalAmount)}
                </p>
              </div>
              {/* Payment Status - Single badge for entire group */}
              <div className="flex justify-end mt-1">
                {(() => {
                  // ใช้ payment_status จาก booking แรก (เพราะจ่ายรวมทั้งกลุ่ม)
                  const paymentStatus = firstBooking.payment_status || 'unpaid'

                  if (paymentStatus === 'paid') {
                    return (
                      <Badge className="bg-green-100 text-green-700 border-green-300 text-xs">
                        Paid
                      </Badge>
                    )
                  } else if (paymentStatus === 'partial') {
                    return (
                      <Badge className="bg-yellow-100 text-yellow-700 border-yellow-300 text-xs">
                        Partial
                      </Badge>
                    )
                  } else {
                    return (
                      <Badge className="bg-red-50 text-red-700 border-red-300 text-xs">
                        Unpaid
                      </Badge>
                    )
                  }
                })()}
              </div>
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

                  {/* Status Dropdown for each booking */}
                  <div onClick={(e) => e.stopPropagation()}>
                    <Select
                      value={booking.status}
                      onValueChange={(newStatus) => onStatusChange?.(booking.id, booking.status, newStatus)}
                      disabled={isFinalStatus(booking.status)}
                    >
                      <SelectTrigger className="w-32">
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
