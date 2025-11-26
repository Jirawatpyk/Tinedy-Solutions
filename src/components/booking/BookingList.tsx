import * as React from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { User, Users, ChevronLeft, ChevronRight, RotateCcw } from 'lucide-react'
import { PermissionAwareDeleteButton } from '@/components/common/PermissionAwareDeleteButton'
import { formatCurrency, formatDate } from '@/lib/utils'
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
  onToggleSelect: (bookingId: string) => void
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
  showArchived?: boolean
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
  showArchived: _showArchived,
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
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-4 pb-4 border-b">
          <div className="flex items-center gap-2">
            <Label htmlFor="itemsPerPage" className="text-sm text-muted-foreground">
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
            <span className="text-sm text-muted-foreground">
              per page
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">
              Showing {metadata.startIndex} to {metadata.endIndex} of {metadata.totalItems} bookings
            </span>
          </div>
        </div>
      )}

      {/* Booking Cards */}
      <div className="space-y-4">
        {combinedItems.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">
            No bookings found
          </p>
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
                    onBookingClick={(bookingId) => {
                      // Find booking from allBookings for click handler
                      const booking = allBookings.find(b => b.id === bookingId)
                      if (booking) onBookingClick(booking)
                    }}
                    onDeleteGroup={onDeleteRecurringGroup}
                    onArchiveGroup={onArchiveRecurringGroup}
                    onRestoreBooking={onRestoreBooking}
                    onStatusChange={onStatusChange}
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
                    className={`flex items-start gap-3 p-4 border rounded-lg hover:bg-accent/50 transition-colors ${isArchived ? 'opacity-60 border-dashed bg-gray-50' : ''}`}
                  >
                    <Checkbox
                      checked={selectedBookings.includes(booking.id)}
                      onCheckedChange={() => onToggleSelect(booking.id)}
                      onClick={(e) => e.stopPropagation()}
                      className="mt-1"
                    />
                    <div
                      className="flex flex-col sm:flex-row sm:items-center justify-between flex-1 gap-4 cursor-pointer"
                      onClick={() => onBookingClick(booking)}
                    >
                      <div className="space-y-2 flex-1">
                        <div className="flex items-start justify-between">
                          <div>
                            <div className="flex items-center gap-2">
                              <p className="font-medium text-tinedy-dark">
                                {booking.customers?.full_name || 'Unknown Customer'}
                                <span className="ml-2 text-sm font-mono text-muted-foreground font-normal">#{booking.id.slice(0, 8)}</span>
                              </p>
                              {isArchived && (
                                <Badge variant="outline" className="border-red-300 text-red-700 bg-red-50 text-xs">
                                  Archived
                                </Badge>
                              )}
                            </div>
                            <p className="text-sm text-muted-foreground">
                              {booking.customers?.email}
                            </p>
                          </div>
                          <div className="sm:hidden">
                            {getStatusBadge(booking.status)}
                          </div>
                        </div>
                        <div className="flex flex-wrap gap-2 text-sm text-muted-foreground">
                          <span className="inline-flex items-center">
                            <Badge variant="outline" className="mr-2">
                              {booking.service_packages?.service_type}
                            </Badge>
                            {booking.service_packages?.name}
                          </span>
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {formatDate(booking.booking_date)} • {formatTime(booking.start_time)} - {formatTime(booking.end_time)}
                        </div>
                        {booking.profiles && (
                          <p className="text-sm text-tinedy-blue flex items-center gap-1">
                            <User className="h-3 w-3" />
                            Staff: {booking.profiles.full_name}
                          </p>
                        )}
                        {booking.teams && (
                          <p className="text-sm text-tinedy-green flex items-center gap-1">
                            <Users className="h-3 w-3" />
                            Team: {booking.teams.name}
                          </p>
                        )}
                      </div>
                      <div className="flex sm:flex-col items-center sm:items-end gap-4">
                        <div className="flex-1 sm:flex-none">
                          <p className="font-semibold text-tinedy-dark text-lg">
                            {formatCurrency(Number(booking.total_price))}
                          </p>
                        </div>
                        <div className="flex flex-wrap gap-2 items-center sm:items-end">
                          {getStatusBadge(booking.status)}
                          {getPaymentStatusBadge(booking.payment_status)}
                        </div>
                        <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
                          {isArchived && onRestoreBooking ? (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation()
                                onRestoreBooking(booking.id)
                              }}
                              className="border-green-500 text-green-700 hover:bg-green-50"
                            >
                              <RotateCcw className="h-4 w-4 mr-1" />
                              Restore
                            </Button>
                          ) : (
                            <>
                              <Select
                                value={booking.status}
                                onValueChange={(value) =>
                                  onStatusChange(booking.id, booking.status, value)
                                }
                                disabled={isArchived}
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
                              <PermissionAwareDeleteButton
                                resource="bookings"
                                itemName={`Booking #${booking.id.slice(0, 8)}`}
                                onDelete={() => onDeleteBooking(booking.id)}
                                onCancel={onArchiveBooking ? () => onArchiveBooking(booking.id) : () => onDeleteBooking(booking.id)}
                                cancelText="Archive"
                              />
                            </>
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
          <div className="text-sm text-muted-foreground">
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
    prevProps.metadata === nextProps.metadata
  )
})

BookingList.displayName = 'BookingList'
