import * as React from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { User, Users, ChevronLeft, ChevronRight, RotateCcw, Calendar } from 'lucide-react'
import { EmptyState } from '@/components/common/EmptyState'
import { PermissionAwareDeleteButton } from '@/components/common/PermissionAwareDeleteButton'
import { formatCurrency, formatBookingId } from '@/lib/utils'
import { formatDateRange } from '@/lib/date-range-utils'
import { PriceMode } from '@/types/booking'
import { BookingStatus } from '@/types/booking'
import type { Booking } from '@/types/booking'
import { RecurringBookingCard } from './RecurringBookingCard'
import type { CombinedItem } from '@/types/recurring-booking'

interface PaginationMetadata {
  startIndex: number
  endIndex: number
  totalItems: number
  hasPrevPage: boolean
  hasNextPage: boolean
}

interface BookingListProps {
  /** Pre-paginated combined items (groups + standalone bookings) from parent */
  combinedItems: CombinedItem[]
  /** All filtered bookings (for lookup when clicking on group booking) */
  allBookings: Booking[]
  selectedBookings: string[]
  currentPage: number
  totalPages: number
  itemsPerPage: number
  metadata: PaginationMetadata
  onToggleSelect: (bookingId: string | string[]) => void
  onBookingClick: (booking: Booking) => void
  onItemsPerPageChange: (value: number) => void
  onFirstPage: () => void
  onPreviousPage: () => void
  onNextPage: () => void
  onLastPage: () => void
  onDeleteBooking: (bookingId: string) => void
  onDeleteRecurringGroup?: (groupId: string) => void
  onArchiveRecurringGroup?: (groupId: string) => void
  onArchiveBooking?: (bookingId: string) => void
  onRestoreBooking?: (bookingId: string) => void
  onRestoreRecurringGroup?: (groupId: string) => void
  onVerifyPayment?: (bookingId: string) => void
  /** Verify payment for entire recurring group */
  onVerifyRecurringGroup?: (recurringGroupId: string) => void
  onStatusChange: (bookingId: string, currentStatus: string, newStatus: string) => void
  formatTime: (time: string) => string
  getStatusBadge: (status: string) => React.ReactElement
  getPaymentStatusBadge: (status?: string) => React.ReactElement
  getAvailableStatuses: (currentStatus: string) => string[]
  getStatusLabel: (status: string) => string
}

/**
 * BookingList Component
 *
 * Displays paginated booking list with:
 * - Recurring booking groups (collapsed/expandable)
 * - Standalone bookings
 *
 * IMPORTANT: Pagination is done at the parent level (bookings.tsx)
 * This component receives pre-paginated combinedItems to ensure
 * recurring groups are never split across pages.
 */
function BookingListComponent({
  combinedItems,
  allBookings,
  selectedBookings,
  currentPage,
  totalPages,
  itemsPerPage,
  metadata,
  onToggleSelect,
  onBookingClick,
  onItemsPerPageChange,
  onFirstPage,
  onPreviousPage,
  onNextPage,
  onLastPage,
  onDeleteBooking,
  onDeleteRecurringGroup,
  onArchiveRecurringGroup,
  onArchiveBooking,
  onRestoreBooking,
  onRestoreRecurringGroup,
  onVerifyPayment,
  onVerifyRecurringGroup,
  onStatusChange,
  formatTime,
  getStatusBadge,
  getPaymentStatusBadge,
  getAvailableStatuses,
  getStatusLabel
}: BookingListProps) {
  return (
    <div className="space-y-4">
      {/* Pagination Controls - Top */}
      {metadata.totalItems > 0 && (
        <div className="flex flex-row items-center justify-between gap-4 mb-4 pb-4 border-b">
          <div className="flex items-center gap-2">
            <Label htmlFor="itemsPerPage" className="text-xs sm:text-sm text-muted-foreground">
              Show:
            </Label>
            <Select
              value={itemsPerPage.toString()}
              onValueChange={(value) => onItemsPerPageChange(Number(value))}
            >
              <SelectTrigger className="w-20">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="10">10</SelectItem>
                <SelectItem value="25">25</SelectItem>
                <SelectItem value="50">50</SelectItem>
                <SelectItem value="100">100</SelectItem>
              </SelectContent>
            </Select>
            <span className="text-xs sm:text-sm text-muted-foreground hidden sm:inline">
              per page
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs sm:text-sm text-muted-foreground">
              <span className="hidden sm:inline">Showing {metadata.startIndex} to {metadata.endIndex} of {metadata.totalItems} bookings</span>
              <span className="sm:hidden">{metadata.startIndex}-{metadata.endIndex} of {metadata.totalItems}</span>
            </span>
          </div>
        </div>
      )}

      {/* Booking Cards */}
      <div className="space-y-4">
        {combinedItems.length === 0 ? (
          <EmptyState
            icon={Calendar}
            title="No bookings found"
            description="No bookings match the selected criteria"
          />
        ) : (
          <>
            {/* Combined Recurring Groups and Standalone Bookings */}
            {combinedItems.map((item) => {
              if (item.type === 'group') {
                // Recurring Booking Group
                return (
                  <RecurringBookingCard
                    key={item.data.groupId}
                    group={item.data}
                    selectedBookings={selectedBookings}
                    onToggleSelectGroup={(bookingIds) => {
                      // Toggle all bookings in group (pass array)
                      onToggleSelect(bookingIds)
                    }}
                    onBookingClick={(bookingId) => {
                      // Find booking from allBookings for click handler
                      const booking = allBookings.find(b => b.id === bookingId)
                      if (booking) onBookingClick(booking)
                    }}
                    onDeleteGroup={onDeleteRecurringGroup}
                    onArchiveGroup={onArchiveRecurringGroup}
                    onRestoreBooking={onRestoreBooking}
                    onRestoreRecurringGroup={onRestoreRecurringGroup}
                    onStatusChange={onStatusChange}
                    onVerifyPayment={onVerifyPayment}
                    onVerifyRecurringGroup={onVerifyRecurringGroup}
                    getAvailableStatuses={getAvailableStatuses}
                    getStatusLabel={getStatusLabel}
                  />
                )
              } else {
                // Standalone Booking
                const booking = item.data
                const isArchived = !!booking.deleted_at
                return (
                  <div
                    key={booking.id}
                    className={`p-3 sm:p-4 border rounded-lg hover:bg-accent/50 transition-colors cursor-pointer ${isArchived ? 'opacity-60 border-dashed bg-tinedy-off-white/50' : ''}`}
                    onClick={() => onBookingClick(booking)}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between flex-1 gap-3 sm:gap-4">
                      <div className="space-y-1.5 sm:space-y-2 flex-1 min-w-0">
                        {/* Header with Checkbox */}
                        <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                          <Checkbox
                            checked={selectedBookings.includes(booking.id)}
                            onCheckedChange={() => onToggleSelect(booking.id)}
                            onClick={(e) => e.stopPropagation()}
                            className="flex-shrink-0"
                          />
                          <p className="font-medium text-tinedy-dark text-sm sm:text-base truncate">
                            {booking.customers?.full_name || 'Unknown Customer'}
                            <span className="ml-1.5 sm:ml-2 text-xs sm:text-sm text-muted-foreground font-normal">{formatBookingId(booking.id)}</span>
                          </p>
                          {isArchived && (
                            <Badge variant="outline" className="border-red-300 text-red-700 bg-red-50 text-[10px] sm:text-xs flex-shrink-0">
                              Archived
                            </Badge>
                          )}
                          {/* Mobile: Status badge บนขวา */}
                          <div className="sm:hidden flex-shrink-0 ml-auto">
                            {getStatusBadge(booking.status)}
                          </div>
                        </div>
                        {/* Customer Email */}
                        <div className="text-xs sm:text-sm text-muted-foreground truncate">
                          {booking.customers?.email}
                        </div>
                        <div className="flex flex-wrap gap-1.5 sm:gap-2 text-xs sm:text-sm text-muted-foreground">
                          <span className="inline-flex items-center">
                            {booking.price_mode === PriceMode.Custom ? (
                              <Badge variant="secondary" className="mr-1.5 sm:mr-2 text-[10px] sm:text-xs">งานพิเศษ</Badge>
                            ) : (
                              <Badge variant="outline" className="mr-1.5 sm:mr-2 text-[10px] sm:text-xs">
                                {booking.service_packages?.service_type ?? booking.service_packages_v2?.service_type}
                              </Badge>
                            )}
                            <span className="truncate">
                              {booking.job_name ?? booking.service_packages?.name ?? booking.service_packages_v2?.name}
                            </span>
                          </span>
                        </div>
                        <div className="text-xs sm:text-sm text-muted-foreground">
                          {formatDateRange(booking.booking_date, booking.end_date)} • {formatTime(booking.start_time)} - {formatTime(booking.end_time)}
                        </div>
                        {booking.profiles && (
                          <p className="text-xs sm:text-sm text-tinedy-blue flex items-center gap-1">
                            <User className="h-3 w-3 flex-shrink-0" />
                            <span className="truncate">Staff: {booking.profiles.full_name}</span>
                          </p>
                        )}
                        {booking.teams && (
                          <p className="text-xs sm:text-sm text-tinedy-green flex items-center gap-1">
                            <Users className="h-3 w-3 flex-shrink-0" />
                            <span className="truncate">Team: {booking.teams.name}</span>
                          </p>
                        )}
                      </div>
                      {/* Right Section: Price, Badges, Actions (Desktop) */}
                      <div className="hidden sm:flex sm:flex-col items-end gap-3 sm:gap-4 flex-shrink-0">
                        {/* Price - บนสุด */}
                        <p className="font-semibold text-tinedy-dark text-base sm:text-lg whitespace-nowrap">
                          {formatCurrency(Number(booking.total_price))}
                        </p>
                        {/* Status + Payment badges */}
                        <div className="flex flex-wrap gap-2 items-center justify-end">
                          {getStatusBadge(booking.status)}
                          {getPaymentStatusBadge(booking.payment_status)}
                        </div>
                        {/* Status dropdown + Delete button - ล่างสุด */}
                        <div className="flex gap-2 mt-4" onClick={(e) => e.stopPropagation()}>
                          {isArchived && onRestoreBooking ? (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation()
                                onRestoreBooking(booking.id)
                              }}
                              className="border-green-500 text-green-700 hover:bg-green-50 h-8 text-xs"
                            >
                              <RotateCcw className="h-3.5 w-3.5 sm:h-4 sm:w-4 sm:mr-1" />
                              <span className="hidden sm:inline">Restore</span>
                            </Button>
                          ) : (
                            <>
                              {/* Hide status dropdown for final states (completed, cancelled, no_show) */}
                              {!([BookingStatus.Completed, BookingStatus.Cancelled, BookingStatus.NoShow] as string[]).includes(booking.status) && (
                                <Select
                                  value={booking.status}
                                  onValueChange={(value) =>
                                    onStatusChange(booking.id, booking.status, value)
                                  }
                                  disabled={isArchived}
                                >
                                  <SelectTrigger className="w-32 h-8 text-xs">
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
                              <PermissionAwareDeleteButton
                                resource="bookings"
                                itemName={`Booking ${formatBookingId(booking.id)}`}
                                onDelete={() => onDeleteBooking(booking.id)}
                                onCancel={onArchiveBooking ? () => onArchiveBooking(booking.id) : () => onDeleteBooking(booking.id)}
                                cancelText="Archive"
                                className="h-8 w-8"
                              />
                            </>
                          )}
                        </div>
                      </div>

                      {/* Mobile: ราคาและ Payment Status ข้างล่าง เหมือน Recurring Group */}
                      <div className="sm:hidden flex items-center justify-between mt-2 pt-2 border-t" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center gap-2">
                          <p className="font-semibold text-tinedy-dark">
                            {formatCurrency(Number(booking.total_price))}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          {getPaymentStatusBadge(booking.payment_status)}
                          {isArchived && onRestoreBooking ? (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation()
                                onRestoreBooking(booking.id)
                              }}
                              className="border-green-500 text-green-700 hover:bg-green-50 h-7 text-xs px-2"
                            >
                              <RotateCcw className="h-3 w-3 mr-1" />
                              Restore
                            </Button>
                          ) : (
                            <PermissionAwareDeleteButton
                              resource="bookings"
                              itemName={`Booking ${formatBookingId(booking.id)}`}
                              onDelete={() => onDeleteBooking(booking.id)}
                              onCancel={onArchiveBooking ? () => onArchiveBooking(booking.id) : () => onDeleteBooking(booking.id)}
                              cancelText="Archive"
                              className="h-7 w-7"
                            />
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )
              }
            })}
          </>
        )}
      </div>

      {/* Pagination Controls - Bottom */}
      {metadata.totalItems > 0 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-4 pt-4 border-t">
          <div className="text-xs sm:text-sm text-muted-foreground">
            Page {currentPage} of {totalPages}
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={onFirstPage}
              disabled={!metadata.hasPrevPage}
            >
              First
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={onPreviousPage}
              disabled={!metadata.hasPrevPage}
            >
              <ChevronLeft className="h-4 w-4" />
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={onNextPage}
              disabled={!metadata.hasNextPage}
            >
              Next
              <ChevronRight className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={onLastPage}
              disabled={!metadata.hasNextPage}
            >
              Last
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}

// Export memoized component with custom comparison
export const BookingList = React.memo(BookingListComponent, (prevProps, nextProps) => {
  // Return true if props are equal (skip re-render), false if changed (re-render)
  return (
    prevProps.combinedItems === nextProps.combinedItems &&
    prevProps.allBookings === nextProps.allBookings &&
    prevProps.selectedBookings === nextProps.selectedBookings &&
    prevProps.currentPage === nextProps.currentPage &&
    prevProps.totalPages === nextProps.totalPages &&
    prevProps.itemsPerPage === nextProps.itemsPerPage &&
    prevProps.metadata === nextProps.metadata &&
    prevProps.onStatusChange === nextProps.onStatusChange &&
    prevProps.onDeleteBooking === nextProps.onDeleteBooking &&
    prevProps.onBookingClick === nextProps.onBookingClick &&
    prevProps.onToggleSelect === nextProps.onToggleSelect
  )
})

BookingList.displayName = 'BookingList'
