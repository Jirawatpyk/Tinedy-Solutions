import { memo } from 'react'
import type { ReactNode } from 'react'
import type { CustomerRecord } from '@/types'
import type { Booking } from '@/types/booking'
import { BookingFormContainer } from '@/components/booking/BookingFormContainer'
import { BookingEditModal } from '@/components/booking/BookingEditModal'
import { CustomerFormSheet } from '@/components/customers/CustomerFormSheet'
import { BookingDetailSheet } from '@/components/booking/BookingDetailSheet'
import { ConfirmDialog } from '@/components/common/ConfirmDialog/ConfirmDialog'
import { AppSheet } from '@/components/ui/app-sheet'
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
      {/* New Booking Modal — pre-seed customer from detail page */}
      <BookingFormContainer
        open={isBookingDialogOpen}
        onOpenChange={(open) => { if (!open) onCloseBookingDialog() }}
        onSuccess={onBookingSuccess}
        initialCustomer={{
          id: customer.id,
          full_name: customer.full_name,
          email: customer.email,
          phone: customer.phone,
          address: customer.address,
          city: customer.city,
          state: customer.state,
          zip_code: customer.zip_code,
        }}
      />

      {/* Add Note Sheet */}
      <AppSheet
        open={isNoteDialogOpen}
        onOpenChange={setIsNoteDialogOpen}
        title="Add Note"
        description={`Add a note to ${customer.full_name}'s profile`}
        size="sm"
      >
        <div className="flex flex-col h-full">
          <div className="flex-1 overflow-y-auto px-6 pb-20">
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
          </div>
          <div className="sticky bottom-0 bg-background border-t pt-4 pb-6 flex gap-2 px-6">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setIsNoteDialogOpen(false)
                setNoteText('')
              }}
              disabled={submitting}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              onClick={onAddNote}
              disabled={submitting || !noteText.trim()}
              className="flex-1 bg-tinedy-blue"
            >
              {submitting ? 'Adding...' : 'Add Note'}
            </Button>
          </div>
        </div>
      </AppSheet>

      {/* Edit Customer Sheet */}
      <CustomerFormSheet
        open={isEditDialogOpen}
        onOpenChange={(o) => !o && onCloseEditDialog()}
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
