import React from 'react'
import { BookingDetailModal } from '@/pages/admin/booking-detail-modal'
import { ConfirmDialog } from '@/components/common/ConfirmDialog/ConfirmDialog'
import type { Booking } from '@/types/booking'

/**
 * Props for status change confirmation dialog
 */
interface StatusConfirmDialogProps {
  showStatusConfirmDialog: boolean
  pendingStatusChange: { currentStatus: string; newStatus: string } | null
  getStatusTransitionMessage: (currentStatus: string, newStatus: string) => string
  confirmStatusChange: () => void
  cancelStatusChange: () => void
}

/**
 * Props for payment actions
 */
interface PaymentActionProps {
  markAsPaid: (bookingId: string, method: string) => void
  handleVerifyPayment: (bookingId: string) => void
  handleRequestRefund: (bookingId: string) => void
  handleCompleteRefund: (bookingId: string) => void
  handleCancelRefund: (bookingId: string) => void
  paymentActionsLoading: {
    markAsPaid?: boolean
    verifyPayment?: boolean
    requestRefund?: boolean
    completeRefund?: boolean
    cancelRefund?: boolean
  }
}

/**
 * Props for status manager
 */
interface StatusManagerProps {
  handleStatusChange: (bookingId: string, currentStatus: string, newStatus: string) => void
  getStatusBadge: (status: string) => React.ReactNode
  getPaymentStatusBadge: (status?: string) => React.ReactNode
  getAvailableStatuses: (currentStatus: string) => string[]
  getStatusLabel: (status: string) => string
}

/**
 * Props for BookingDetailFlow component
 */
export interface BookingDetailFlowProps extends StatusManagerProps, StatusConfirmDialogProps, PaymentActionProps {
  /** Whether the detail modal is open */
  isDetailOpen: boolean
  /** Callback to close the detail modal */
  onCloseDetail: () => void
  /** The currently selected booking */
  selectedBooking: Booking | null
  /** Callback when edit button is clicked */
  onEdit: (booking: Booking) => void
  /** Callback when delete (hard delete) is triggered */
  onDelete: (bookingId: string) => void
  /** Callback when cancel/archive (soft delete) is triggered */
  onCancel: (bookingId: string) => void
}

/**
 * BookingDetailFlow Component
 *
 * Extracts the detail modal flow from bookings.tsx including:
 * - BookingDetailModal for viewing booking details
 * - Status change confirmation ConfirmDialog
 *
 * This component consolidates the booking detail view and status change
 * confirmation into a single reusable component.
 *
 * @example
 * ```tsx
 * <BookingDetailFlow
 *   isDetailOpen={isDetailOpen}
 *   onCloseDetail={() => setIsDetailOpen(false)}
 *   selectedBooking={selectedBooking}
 *   onEdit={openEditBooking}
 *   onDelete={deleteBooking}
 *   onCancel={archiveBooking}
 *   handleStatusChange={handleStatusChange}
 *   getStatusBadge={getStatusBadge}
 *   getPaymentStatusBadge={getPaymentStatusBadge}
 *   getAvailableStatuses={getAvailableStatuses}
 *   getStatusLabel={getStatusLabel}
 *   showStatusConfirmDialog={showStatusConfirmDialog}
 *   pendingStatusChange={pendingStatusChange}
 *   getStatusTransitionMessage={getStatusTransitionMessage}
 *   confirmStatusChange={confirmStatusChange}
 *   cancelStatusChange={cancelStatusChange}
 *   markAsPaid={markAsPaid}
 *   handleVerifyPayment={handleVerifyPayment}
 *   handleRequestRefund={handleRequestRefund}
 *   handleCompleteRefund={handleCompleteRefund}
 *   handleCancelRefund={handleCancelRefund}
 *   paymentActionsLoading={paymentActionsLoading}
 * />
 * ```
 */
function BookingDetailFlowComponent({
  // Detail modal props
  isDetailOpen,
  onCloseDetail,
  selectedBooking,
  onEdit,
  onDelete,
  onCancel,
  // Status manager props
  handleStatusChange,
  getStatusBadge,
  getPaymentStatusBadge,
  getAvailableStatuses,
  getStatusLabel,
  // Status confirm dialog props
  showStatusConfirmDialog,
  pendingStatusChange,
  getStatusTransitionMessage,
  confirmStatusChange,
  cancelStatusChange,
  // Payment action props
  markAsPaid,
  handleVerifyPayment,
  handleRequestRefund,
  handleCompleteRefund,
  handleCancelRefund,
  paymentActionsLoading,
}: BookingDetailFlowProps) {
  return (
    <>
      {/* Booking Detail Modal */}
      <BookingDetailModal
        booking={selectedBooking}
        isOpen={isDetailOpen}
        onClose={onCloseDetail}
        onEdit={onEdit}
        onDelete={onDelete}
        onCancel={onCancel}
        onStatusChange={handleStatusChange}
        onMarkAsPaid={markAsPaid}
        onVerifyPayment={handleVerifyPayment}
        onRequestRefund={handleRequestRefund}
        onCompleteRefund={handleCompleteRefund}
        onCancelRefund={handleCancelRefund}
        getStatusBadge={getStatusBadge}
        getPaymentStatusBadge={getPaymentStatusBadge}
        getAvailableStatuses={getAvailableStatuses}
        getStatusLabel={getStatusLabel}
        actionLoading={{
          statusChange: false,
          delete: false,
          markAsPaid: paymentActionsLoading.markAsPaid,
        }}
      />

      {/* Status Change Confirmation Dialog */}
      {pendingStatusChange && (
        <ConfirmDialog
          open={showStatusConfirmDialog}
          onOpenChange={(open) => !open && cancelStatusChange()}
          title="Confirm Status Change"
          description={getStatusTransitionMessage(
            pendingStatusChange.currentStatus,
            pendingStatusChange.newStatus
          )}
          confirmLabel="Confirm"
          cancelLabel="Cancel"
          onConfirm={confirmStatusChange}
          variant={['cancelled', 'no_show'].includes(pendingStatusChange.newStatus) ? 'destructive' : 'default'}
        />
      )}
    </>
  )
}

/**
 * Memoized BookingDetailFlow component to prevent unnecessary re-renders
 */
export const BookingDetailFlow = React.memo(BookingDetailFlowComponent)

BookingDetailFlow.displayName = 'BookingDetailFlow'
