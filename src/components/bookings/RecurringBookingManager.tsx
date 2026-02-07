/**
 * RecurringBookingManager Component
 *
 * Manages dialogs for recurring booking operations:
 * - RecurringEditDialog: Edit/Delete/Archive scope selection for recurring bookings
 * - BookingConflictDialog: Conflict warning when booking overlaps exist
 * - BulkDeleteConfirmDialog: Confirmation for bulk delete operations
 *
 * @module components/bookings/RecurringBookingManager
 */

import { memo } from 'react'
import { RecurringEditDialog } from '@/components/booking/RecurringEditDialog'
import { BookingConflictDialog } from '@/components/booking/BookingConflictDialog'
import { ConfirmDialog } from '@/components/common/ConfirmDialog/ConfirmDialog'
import type { RecurringEditScope } from '@/types/recurring-booking'
import type { BookingConflict } from '@/hooks/use-conflict-detection'

/**
 * Booking with recurring fields required for RecurringEditDialog
 */
interface RecurringBooking {
  id: string
  recurring_group_id?: string | null
  recurring_sequence?: number | null
  recurring_total?: number | null
  is_recurring?: boolean
}

/**
 * Props for RecurringBookingManager component
 */
interface RecurringBookingManagerProps {
  // Recurring Edit Dialog props
  showRecurringEditDialog: boolean
  setShowRecurringEditDialog: (open: boolean) => void
  recurringEditAction: 'edit' | 'delete' | 'archive'
  pendingRecurringBooking: RecurringBooking | null
  handleRecurringArchive: (scope: RecurringEditScope) => void
  handleRecurringDelete: (scope: RecurringEditScope) => void

  // Conflict Dialog props
  showConflictDialog: boolean
  cancelConflictOverride: () => void
  proceedWithConflictOverride: () => void
  conflicts: BookingConflict[]

  // Bulk Delete Confirmation props
  showDeleteConfirm: boolean
  setShowDeleteConfirm: (open: boolean) => void
  confirmBulkDelete: () => void
  isDeleting: boolean
  selectedBookingsCount: number

  // Utility functions
  getStatusBadge: (status: string) => JSX.Element
  formatTime: (time: string) => string
}

/**
 * RecurringBookingManager - Manages recurring booking dialogs
 *
 * This component centralizes all dialog management for recurring booking operations
 * to reduce complexity in the main bookings page.
 *
 * @example
 * ```tsx
 * <RecurringBookingManager
 *   showRecurringEditDialog={showRecurringEditDialog}
 *   setShowRecurringEditDialog={setShowRecurringEditDialog}
 *   recurringEditAction={recurringEditAction}
 *   pendingRecurringBooking={pendingRecurringBooking}
 *   handleRecurringArchive={handleRecurringArchive}
 *   handleRecurringDelete={handleRecurringDelete}
 *   showConflictDialog={showConflictDialog}
 *   cancelConflictOverride={cancelConflictOverride}
 *   proceedWithConflictOverride={proceedWithConflictOverride}
 *   conflicts={conflicts}
 *   showDeleteConfirm={showDeleteConfirm}
 *   setShowDeleteConfirm={setShowDeleteConfirm}
 *   confirmBulkDelete={confirmBulkDelete}
 *   isDeleting={isDeleting}
 *   selectedBookingsCount={selectedBookings.length}
 *   getStatusBadge={getStatusBadge}
 *   formatTime={formatTime}
 * />
 * ```
 */
function RecurringBookingManagerComponent({
  // Recurring Edit Dialog
  showRecurringEditDialog,
  setShowRecurringEditDialog,
  recurringEditAction,
  pendingRecurringBooking,
  handleRecurringArchive,
  handleRecurringDelete,
  // Conflict Dialog
  showConflictDialog,
  cancelConflictOverride,
  proceedWithConflictOverride,
  conflicts,
  // Bulk Delete
  showDeleteConfirm,
  setShowDeleteConfirm,
  confirmBulkDelete,
  isDeleting,
  selectedBookingsCount,
  // Utilities
  getStatusBadge,
  formatTime,
}: RecurringBookingManagerProps): JSX.Element {
  return (
    <>
      {/* Conflict Warning Dialog */}
      <BookingConflictDialog
        isOpen={showConflictDialog}
        onClose={cancelConflictOverride}
        onProceed={proceedWithConflictOverride}
        conflicts={conflicts}
        getStatusBadge={getStatusBadge}
        formatTime={formatTime}
      />

      {/* Bulk Delete Confirmation Dialog */}
      <ConfirmDialog
        open={showDeleteConfirm}
        onOpenChange={setShowDeleteConfirm}
        title="Delete Bookings"
        description={`Are you sure you want to delete ${selectedBookingsCount} booking(s)? This action cannot be undone.`}
        variant="danger"
        confirmLabel="Delete"
        cancelLabel="Cancel"
        onConfirm={confirmBulkDelete}
        isLoading={isDeleting}
      />

      {/* Recurring Edit/Delete Dialog */}
      {pendingRecurringBooking && (
        <RecurringEditDialog
          open={showRecurringEditDialog}
          onOpenChange={setShowRecurringEditDialog}
          onConfirm={recurringEditAction === 'archive' ? handleRecurringArchive : handleRecurringDelete}
          action={recurringEditAction}
          recurringSequence={pendingRecurringBooking.recurring_sequence || 1}
          recurringTotal={pendingRecurringBooking.recurring_total || 1}
        />
      )}
    </>
  )
}

/**
 * Memoized RecurringBookingManager
 *
 * Prevents unnecessary re-renders by memoizing the component.
 * Re-renders only when dialog visibility or related state changes.
 */
export const RecurringBookingManager = memo(RecurringBookingManagerComponent)

RecurringBookingManager.displayName = 'RecurringBookingManager'
