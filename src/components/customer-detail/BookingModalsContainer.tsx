import { memo } from 'react'
import type { ReactNode } from 'react'
import type { CustomerRecord } from '@/types'
import type { Booking } from '@/types/booking'
import { BookingFormContainer } from '@/components/booking/BookingFormContainer'
import { BookingEditModal } from '@/components/booking/BookingEditModal'
import { CustomerFormDialog } from '@/components/customers/CustomerFormDialog'
import { BookingDetailSheet } from '@/components/booking/BookingDetailSheet'
import { ConfirmDialog } from '@/components/common/ConfirmDialog/ConfirmDialog'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'

interface BookingModalsContainerProps {
  customer: CustomerRecord

  // Create booking modal
  isBookingDialogOpen: boolean
  onCloseBookingDialog: () => void
  onBookingSuccess: () => void

  // Note dialog
  isNoteDialogOpen: boolean
  setIsNoteDialogOpen: (open: boolean) => void
  noteText: string
  setNoteText: (text: string) => void
  onAddNote: () => void
  submitting: boolean

  // Edit customer dialog
  isEditDialogOpen: boolean
  onCloseEditDialog: () => void
  onEditSuccess: () => void

  // Booking detail modal
  isBookingDetailModalOpen: boolean
  selectedBookingId: string | null
  bookings: Booking[]
  onCloseDetailModal: () => void
  onEditBooking: (booking: Booking) => void
  onArchiveBooking: (bookingId: string) => Promise<void>
  onDeleteBooking: (bookingId: string) => Promise<void>
  onStatusChange: (bookingId: string, currentStatus: string, newStatus: string) => void
  onMarkAsPaid: (bookingId: string, method: string) => void
  onVerifyPayment: (bookingId: string) => void
  onRequestRefund: (bookingId: string) => void
  onCompleteRefund: (bookingId: string) => void
  onCancelRefund: (bookingId: string) => void
  getStatusBadge: (status: string) => ReactNode
  getPaymentStatusBadge: (status?: string) => ReactNode
  getAvailableStatuses: (currentStatus: string) => string[]
  getStatusLabel: (status: string) => string

  // Edit booking modal
  isBookingEditOpen: boolean
  selectedBooking: Booking | null
  onCloseEditBooking: () => void
  onEditBookingSuccess: () => void

  // Status confirm dialog
  showStatusConfirmDialog: boolean
  pendingStatusChange: { currentStatus: string; newStatus: string } | null
  getStatusTransitionMessage: (from: string, to: string) => string
  confirmStatusChange: () => void
  cancelStatusChange: () => void
}

const BookingModalsContainerComponent = function BookingModalsContainer({
  customer,

  // Create booking modal
  isBookingDialogOpen,
  onCloseBookingDialog,
  onBookingSuccess,

  // Note dialog
  isNoteDialogOpen,
  setIsNoteDialogOpen,
  noteText,
  setNoteText,
  onAddNote,
  submitting,

  // Edit customer dialog
  isEditDialogOpen,
  onCloseEditDialog,
  onEditSuccess,

  // Booking detail modal
  isBookingDetailModalOpen,
  selectedBookingId,
  bookings,
  onCloseDetailModal,
  onEditBooking,
  onArchiveBooking,
  onDeleteBooking,
  onStatusChange,
  onMarkAsPaid,
  onVerifyPayment,
  onRequestRefund,
  onCompleteRefund,
  onCancelRefund,
  getStatusBadge,
  getPaymentStatusBadge,
  getAvailableStatuses,
  getStatusLabel,

  // Edit booking modal
  isBookingEditOpen,
  selectedBooking,
  onCloseEditBooking,
  onEditBookingSuccess,

  // Status confirm dialog
  showStatusConfirmDialog,
  pendingStatusChange,
  getStatusTransitionMessage,
  confirmStatusChange,
  cancelStatusChange,
}: BookingModalsContainerProps) {
  return (
    <>
      {/* New Booking Modal */}
      <BookingFormContainer
        open={isBookingDialogOpen}
        onOpenChange={(open) => { if (!open) onCloseBookingDialog() }}
        onSuccess={onBookingSuccess}
      />

      {/* Add Note Dialog */}
      <Dialog open={isNoteDialogOpen} onOpenChange={setIsNoteDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add Note</DialogTitle>
            <DialogDescription>
              Add a note to {customer.full_name}'s profile
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="note">Note</Label>
              <Textarea
                id="note"
                value={noteText}
                onChange={(e) => setNoteText(e.target.value)}
                rows={5}
                placeholder="Enter note here..."
              />
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setIsNoteDialogOpen(false)
                  setNoteText('')
                }}
                disabled={submitting}
              >
                Cancel
              </Button>
              <Button
                onClick={onAddNote}
                disabled={submitting || !noteText.trim()}
                className="bg-tinedy-blue"
              >
                {submitting ? 'Adding...' : 'Add Note'}
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Customer Dialog */}
      <CustomerFormDialog
        isOpen={isEditDialogOpen}
        onClose={onCloseEditDialog}
        onSuccess={onEditSuccess}
        customer={customer}
      />

      {/* Booking Detail Modal */}
      {selectedBookingId && (
        <BookingDetailSheet
          booking={bookings.find(b => b.id === selectedBookingId) ?? null}
          isOpen={isBookingDetailModalOpen}
          onClose={onCloseDetailModal}
          onEdit={onEditBooking}
          onCancel={onArchiveBooking}
          onDelete={onDeleteBooking}
          onStatusChange={onStatusChange}
          onMarkAsPaid={onMarkAsPaid}
          onVerifyPayment={onVerifyPayment}
          onRequestRefund={onRequestRefund}
          onCompleteRefund={onCompleteRefund}
          onCancelRefund={onCancelRefund}
          getStatusBadge={getStatusBadge}
          getPaymentStatusBadge={getPaymentStatusBadge}
          getAvailableStatuses={getAvailableStatuses}
          getStatusLabel={getStatusLabel}
        />
      )}

      {/* Edit Booking Modal */}
      {selectedBooking && (
        <BookingEditModal
          open={isBookingEditOpen}
          onOpenChange={(open) => { if (!open) onCloseEditBooking() }}
          booking={selectedBooking}
          onSuccess={onEditBookingSuccess}
        />
      )}

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

export const BookingModalsContainer = memo(BookingModalsContainerComponent)

BookingModalsContainer.displayName = 'BookingModalsContainer'
