/**
 * BookingHistorySection Component
 *
 * Extracted from customer-detail.tsx god component.
 * Renders the booking history card with:
 * - Search input + status filters + payment status filter + export button
 * - Booking list (paginated) with both recurring groups and individual bookings
 * - Pagination controls with ellipsis logic
 *
 * This is a pure render component - all filtering, grouping, and pagination
 * logic stays in the parent component.
 */

import { memo } from 'react'
import type { ReactNode } from 'react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { SimpleTooltip } from '@/components/ui/simple-tooltip'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { PAYMENT_STATUS_LABELS } from '@/constants/booking-status'
import {
  StatusBadge,
  getPaymentStatusVariant,
  getPaymentStatusLabel,
} from '@/components/common/StatusBadge'
import { RecurringBookingCard } from '@/components/booking/RecurringBookingCard'
import { formatBookingId, formatCurrency } from '@/lib/utils'
import { formatDateRange } from '@/lib/date-range-utils'
import { formatTime, getAllStatusOptions } from '@/lib/booking-utils'
import {
  FileText,
  User,
  Users,
  ChevronLeft,
  ChevronRight,
  Download,
} from 'lucide-react'
import type { RecurringGroup } from '@/types/recurring-booking'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface CustomerBooking {
  id: string
  booking_date: string
  end_date?: string | null
  job_name?: string | null
  start_time: string
  end_time: string
  status: string
  notes: string | null
  total_price: number
  payment_status?: string
  service: { name: string; service_type: string } | null
  service_packages: { name: string; service_type: string } | null
  profiles: { full_name: string } | null
  teams: { name: string } | null
  is_recurring: boolean
  recurring_group_id: string | null
}

export type HistoryCombinedItem =
  | { type: 'group'; data: RecurringGroup; createdAt: string }
  | { type: 'booking'; data: CustomerBooking; createdAt: string }

export interface BookingHistorySectionProps {
  // Filter state
  searchQuery: string
  onSearchChange: (query: string) => void
  statusFilter: string
  onStatusFilterChange: (status: string) => void
  paymentStatusFilter: string
  onPaymentStatusFilterChange: (status: string) => void

  // Data
  paginatedItems: HistoryCombinedItem[]
  totalItems: number
  filteredBookingsCount: number

  // Pagination
  currentPage: number
  totalPages: number
  startIndex: number
  endIndex: number
  onPageChange: (page: number) => void

  // Actions
  onExportExcel: () => void
  onBookingClick: (bookingId: string) => void
  onStatusChange: (bookingId: string, currentStatus: string, newStatus: string) => void
  onVerifyPayment: (bookingId: string) => void

  // Badge helpers
  getStatusBadge: (status: string) => ReactNode
  getAvailableStatuses: (currentStatus: string) => string[]
  getStatusLabel: (status: string) => string

  // Customer info for display
  customerFullName: string
  customerEmail: string
}

// ---------------------------------------------------------------------------
// Helper – pagination page numbers with ellipsis
// ---------------------------------------------------------------------------

function buildPageNumbers(
  currentPage: number,
  totalPages: number,
): (number | string)[] {
  const pages: (number | string)[] = []
  const showPages = 5 // Max visible page buttons on mobile

  if (totalPages <= showPages) {
    for (let i = 1; i <= totalPages; i++) pages.push(i)
  } else {
    // Always show first page
    pages.push(1)

    // Calculate range around current page
    let start = Math.max(2, currentPage - 1)
    let end = Math.min(totalPages - 1, currentPage + 1)

    // Adjust range to show at least 3 middle pages
    if (currentPage <= 3) {
      end = Math.min(4, totalPages - 1)
    } else if (currentPage >= totalPages - 2) {
      start = Math.max(2, totalPages - 3)
    }

    // Add ellipsis before middle pages
    if (start > 2) pages.push('...')

    // Add middle pages
    for (let i = start; i <= end; i++) pages.push(i)

    // Add ellipsis after middle pages
    if (end < totalPages - 1) pages.push('...')

    // Always show last page
    pages.push(totalPages)
  }

  return pages
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

const BookingHistorySection = memo(function BookingHistorySection({
  // Filter state
  searchQuery,
  onSearchChange,
  statusFilter,
  onStatusFilterChange,
  paymentStatusFilter,
  onPaymentStatusFilterChange,
  // Data
  paginatedItems,
  totalItems,
  filteredBookingsCount,
  // Pagination
  currentPage,
  totalPages,
  startIndex,
  endIndex,
  onPageChange,
  // Actions
  onExportExcel,
  onBookingClick,
  onStatusChange,
  onVerifyPayment,
  // Badge helpers
  getStatusBadge,
  getAvailableStatuses,
  getStatusLabel,
  // Customer info
  customerFullName,
  customerEmail,
}: BookingHistorySectionProps) {
  return (
    <Card>
      {/* ------------------------------------------------------------------ */}
      {/* Header: title, search, filters, export                            */}
      {/* ------------------------------------------------------------------ */}
      <CardHeader className="px-4 sm:px-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
          <CardTitle className="text-lg sm:text-xl">Booking History</CardTitle>
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
            <Input
              placeholder="Search bookings..."
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              className="h-9 text-sm w-full sm:w-64"
            />
            <div className="flex gap-2">
              <Select value={statusFilter} onValueChange={onStatusFilterChange}>
                <SelectTrigger className="h-9 flex-1 sm:w-[180px]">
                  <SelectValue placeholder="Booking Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Bookings</SelectItem>
                  {getAllStatusOptions().map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select
                value={paymentStatusFilter}
                onValueChange={onPaymentStatusFilterChange}
              >
                <SelectTrigger className="h-9 flex-1 sm:w-[180px]">
                  <SelectValue placeholder="Payment Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Payment</SelectItem>
                  {Object.entries(PAYMENT_STATUS_LABELS).map(
                    ([value, label]) => (
                      <SelectItem key={value} value={value}>
                        {label}
                      </SelectItem>
                    ),
                  )}
                </SelectContent>
              </Select>
              {/* Mobile: Icon only with tooltip */}
              <SimpleTooltip content="Export to Excel">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={onExportExcel}
                  disabled={filteredBookingsCount === 0}
                  className="h-9 w-9 sm:hidden"
                >
                  <Download className="h-4 w-4" />
                </Button>
              </SimpleTooltip>
              {/* Desktop: Icon + text, no tooltip */}
              <Button
                variant="outline"
                size="sm"
                onClick={onExportExcel}
                disabled={filteredBookingsCount === 0}
                className="h-9 hidden sm:flex"
              >
                <Download className="h-4 w-4 mr-2" />
                Export
              </Button>
            </div>
          </div>
        </div>
      </CardHeader>

      {/* ------------------------------------------------------------------ */}
      {/* Body: booking list or empty state                                  */}
      {/* ------------------------------------------------------------------ */}
      <CardContent className="px-4 sm:px-6">
        {totalItems === 0 ? (
          <div className="text-center py-8 sm:py-12">
            <FileText className="h-10 w-10 sm:h-12 sm:w-12 text-muted-foreground mx-auto mb-3 sm:mb-4" />
            <p className="text-sm text-muted-foreground">
              {searchQuery
                ? 'No bookings found matching your search'
                : 'No booking history yet'}
            </p>
          </div>
        ) : (
          <div className="space-y-2 sm:space-y-3">
            {paginatedItems.map((item) => {
              if (item.type === 'group') {
                const group = item.data as RecurringGroup
                return (
                  <RecurringBookingCard
                    key={`group-${group.groupId}`}
                    group={group}
                    onBookingClick={(bookingId) => onBookingClick(bookingId)}
                    onStatusChange={onStatusChange}
                    onVerifyPayment={onVerifyPayment}
                    getAvailableStatuses={getAvailableStatuses}
                    getStatusLabel={getStatusLabel}
                  />
                )
              }

              // Individual booking card
              const booking = item.data as CustomerBooking
              return (
                <Card
                  key={`booking-${booking.id}`}
                  className="card-interactive"
                  onClick={() => onBookingClick(booking.id)}
                >
                  <CardContent className="p-3 sm:p-4">
                    <div className="flex items-start justify-between gap-3 sm:gap-4">
                      <div className="flex-1 space-y-1.5 sm:space-y-2 min-w-0">
                        {/* 1. Customer name + Booking ID */}
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-tinedy-dark text-sm sm:text-base truncate">
                              {customerFullName}
                              <span className="ml-2 text-xs sm:text-sm text-muted-foreground font-normal">
                                {formatBookingId(booking.id)}
                              </span>
                            </p>
                            {/* 2. Email */}
                            <p className="text-xs sm:text-sm text-muted-foreground truncate">
                              {customerEmail}
                            </p>
                          </div>
                          <div className="sm:hidden flex-shrink-0">
                            <div className="text-[10px]">
                              {getStatusBadge(booking.status)}
                            </div>
                          </div>
                        </div>

                        {/* 3. Service Type Badge + Package Name */}
                        <div className="flex flex-wrap gap-1.5 sm:gap-2 text-xs sm:text-sm text-muted-foreground">
                          <span className="inline-flex items-center">
                            <Badge
                              variant="outline"
                              className="mr-1.5 sm:mr-2 text-[10px] sm:text-xs"
                            >
                              {booking.service?.service_type ||
                                booking.service_packages?.service_type ||
                                'N/A'}
                            </Badge>
                            <span className="truncate">
                              {booking.job_name ||
                                booking.service?.name ||
                                booking.service_packages?.name ||
                                'ไม่ระบุ'}
                            </span>
                          </span>
                        </div>

                        {/* 4. Date + Time */}
                        <div className="text-xs sm:text-sm text-muted-foreground">
                          {formatDateRange(booking.booking_date, booking.end_date)} &bull;{' '}
                          {formatTime(booking.start_time)} -{' '}
                          {booking.end_time
                            ? formatTime(booking.end_time)
                            : 'N/A'}
                        </div>

                        {/* 5. Staff / Team */}
                        {booking.profiles && (
                          <p className="text-xs sm:text-sm text-tinedy-blue flex items-center gap-1">
                            <User className="h-3 w-3 flex-shrink-0" />
                            <span className="truncate">
                              Staff: {booking.profiles.full_name}
                            </span>
                          </p>
                        )}
                        {booking.teams && (
                          <p className="text-xs sm:text-sm text-tinedy-green flex items-center gap-1">
                            <Users className="h-3 w-3 flex-shrink-0" />
                            <span className="truncate">
                              Team: {booking.teams.name}
                            </span>
                          </p>
                        )}
                      </div>

                      {/* 6. Price + Status (Desktop only) */}
                      <div className="hidden sm:flex flex-col items-end gap-2 sm:gap-4 flex-shrink-0">
                        <div>
                          <p className="font-semibold text-tinedy-dark text-base sm:text-lg">
                            {formatCurrency(booking.total_price ?? 0)}
                          </p>
                        </div>
                        <div className="flex flex-wrap gap-1.5 sm:gap-2 items-center sm:items-end justify-end">
                          <div className="text-[10px] sm:text-xs">
                            {getStatusBadge(booking.status)}
                          </div>
                          <StatusBadge
                            variant={getPaymentStatusVariant(
                              booking.payment_status || 'unpaid',
                            )}
                            className="text-[10px] sm:text-xs"
                          >
                            {getPaymentStatusLabel(
                              booking.payment_status || 'unpaid',
                            )}
                          </StatusBadge>
                        </div>
                      </div>
                    </div>

                    {/* Mobile: Price at the bottom */}
                    <div className="sm:hidden flex items-center justify-between mt-2 pt-2 border-t">
                      <p className="font-semibold text-tinedy-dark">
                        {formatCurrency(booking.total_price ?? 0)}
                      </p>
                      <StatusBadge
                        variant={getPaymentStatusVariant(
                          booking.payment_status || 'unpaid',
                        )}
                        className="text-[10px]"
                      >
                        {getPaymentStatusLabel(
                          booking.payment_status || 'unpaid',
                        )}
                      </StatusBadge>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        )}

        {/* ---------------------------------------------------------------- */}
        {/* Pagination                                                       */}
        {/* ---------------------------------------------------------------- */}
        {totalPages > 1 && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 mt-3 sm:mt-4 pt-3 sm:pt-4 border-t">
            <div className="text-xs sm:text-sm text-muted-foreground">
              <span className="hidden sm:inline">
                Showing {startIndex + 1}-{endIndex} of {totalItems} bookings
              </span>
              <span className="sm:hidden">
                {startIndex + 1}-{endIndex} of {totalItems}
              </span>
            </div>
            <div className="flex items-center gap-1.5 sm:gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => onPageChange(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}
                className="h-8 text-xs"
              >
                <ChevronLeft className="h-3.5 w-3.5 sm:h-4 sm:w-4 sm:mr-1" />
                <span className="hidden sm:inline">Previous</span>
              </Button>
              <div className="flex items-center gap-1">
                {buildPageNumbers(currentPage, totalPages).map((page, idx) =>
                  page === '...' ? (
                    <span
                      key={`ellipsis-${idx}`}
                      className="px-1 text-muted-foreground text-xs"
                    >
                      ...
                    </span>
                  ) : (
                    <Button
                      key={page}
                      variant={currentPage === page ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => onPageChange(page as number)}
                      className={`h-8 min-w-[32px] text-xs ${
                        currentPage === page ? 'bg-tinedy-blue' : ''
                      }`}
                    >
                      {page}
                    </Button>
                  ),
                )}
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  onPageChange(Math.min(totalPages, currentPage + 1))
                }
                disabled={currentPage === totalPages}
                className="h-8 text-xs"
              >
                <span className="hidden sm:inline">Next</span>
                <ChevronRight className="h-3.5 w-3.5 sm:h-4 sm:w-4 sm:ml-1" />
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
})

BookingHistorySection.displayName = 'BookingHistorySection'

export { BookingHistorySection }
