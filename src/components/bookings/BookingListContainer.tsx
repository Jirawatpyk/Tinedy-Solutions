import * as React from 'react'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { BulkActionsToolbar } from '@/components/booking/BulkActionsToolbar'
import { BookingList } from '@/components/booking/BookingList'
import type { Booking } from '@/types/booking'
import type { CombinedItem } from '@/types/recurring-booking'

/**
 * Pagination metadata interface for BookingList
 */
interface PaginationMetadata {
  startIndex: number
  endIndex: number
  totalItems: number
  hasPrevPage: boolean
  hasNextPage: boolean
}

/**
 * Props for BookingListContainer component
 */
interface BookingListContainerProps {
  // Data
  combinedItems: CombinedItem[]
  filteredBookings: Booking[]
  selectedBookings: string[]

  // Pagination
  currentPage: number
  totalPages: number
  itemsPerPage: number
  metadata: PaginationMetadata
  onItemsPerPageChange: (value: number) => void
  goToFirst: () => void
  prevPage: () => void
  nextPage: () => void
  goToLast: () => void

  // Bulk actions
  bulkStatus: string
  setBulkStatus: (status: string) => void
  toggleSelectAll: () => void
  toggleSelectBooking: (bookingId: string | string[]) => void
  handleBulkStatusUpdate: () => void
  handleBulkExport: () => void
  handleBulkDelete: () => void

  // List actions
  openBookingDetail: (booking: Booking) => void
  deleteBooking: (bookingId: string) => void
  archiveBooking: (bookingId: string) => void
  restoreBooking: (bookingId: string) => void
  deleteRecurringGroup: (groupId: string) => void
  archiveRecurringGroup: (groupId: string) => void
  restoreRecurringGroup: (groupId: string) => void

  // Payment
  handleVerifyPayment: (bookingId: string) => void
  handleVerifyRecurringGroup: (recurringGroupId: string) => void

  // Display options
  showArchived: boolean
  handleStatusChange: (bookingId: string, currentStatus: string, newStatus: string) => void

  // Badge helpers
  getStatusBadge: (status: string) => React.ReactElement
  getPaymentStatusBadge: (status?: string) => React.ReactElement
  getAvailableStatuses: (currentStatus: string) => string[]
  getStatusLabel: (status: string) => string

  // Formatters
  formatTime: (time: string) => string
}

/**
 * BookingListContainer Component
 *
 * Container component that wraps BulkActionsToolbar and BookingList
 * within a Card component. Extracted from bookings.tsx for better
 * code organization and reusability.
 *
 * Features:
 * - Bulk actions toolbar for multi-select operations
 * - Paginated booking list with recurring group support
 * - Status and payment management
 * - Archive/restore functionality
 */
function BookingListContainerComponent({
  combinedItems,
  filteredBookings,
  selectedBookings,
  currentPage,
  totalPages,
  itemsPerPage,
  metadata,
  onItemsPerPageChange,
  goToFirst,
  prevPage,
  nextPage,
  goToLast,
  bulkStatus,
  setBulkStatus,
  toggleSelectAll,
  toggleSelectBooking,
  handleBulkStatusUpdate,
  handleBulkExport,
  handleBulkDelete,
  openBookingDetail,
  deleteBooking,
  archiveBooking,
  restoreBooking,
  deleteRecurringGroup,
  archiveRecurringGroup,
  restoreRecurringGroup,
  handleVerifyPayment,
  handleVerifyRecurringGroup,
  showArchived: _showArchived,
  handleStatusChange,
  getStatusBadge,
  getPaymentStatusBadge,
  getAvailableStatuses,
  getStatusLabel,
  formatTime
}: BookingListContainerProps) {
  return (
    <Card>
      <CardHeader className="px-4 sm:px-6">
        <BulkActionsToolbar
          selectedBookings={selectedBookings}
          totalBookings={filteredBookings.length}
          bulkStatus={bulkStatus}
          onBulkStatusChange={setBulkStatus}
          onToggleSelectAll={toggleSelectAll}
          onBulkStatusUpdate={handleBulkStatusUpdate}
          onBulkExport={handleBulkExport}
          onBulkDelete={handleBulkDelete}
        />
      </CardHeader>
      <CardContent className="px-4 sm:px-6 pt-0">
        <BookingList
          combinedItems={combinedItems}
          allBookings={filteredBookings}
          selectedBookings={selectedBookings}
          currentPage={currentPage}
          totalPages={totalPages}
          itemsPerPage={itemsPerPage}
          metadata={metadata}
          onToggleSelect={toggleSelectBooking}
          onBookingClick={openBookingDetail}
          onItemsPerPageChange={onItemsPerPageChange}
          onFirstPage={goToFirst}
          onPreviousPage={prevPage}
          onNextPage={nextPage}
          onLastPage={goToLast}
          onDeleteBooking={deleteBooking}
          onDeleteRecurringGroup={deleteRecurringGroup}
          onArchiveRecurringGroup={archiveRecurringGroup}
          onArchiveBooking={archiveBooking}
          onRestoreBooking={restoreBooking}
          onRestoreRecurringGroup={restoreRecurringGroup}
          onVerifyPayment={handleVerifyPayment}
          onVerifyRecurringGroup={handleVerifyRecurringGroup}
          onStatusChange={handleStatusChange}
          formatTime={formatTime}
          getStatusBadge={getStatusBadge}
          getPaymentStatusBadge={getPaymentStatusBadge}
          getAvailableStatuses={getAvailableStatuses}
          getStatusLabel={getStatusLabel}
        />
      </CardContent>
    </Card>
  )
}

// Export memoized component with named function
export const BookingListContainer = React.memo(BookingListContainerComponent)

BookingListContainer.displayName = 'BookingListContainer'
