import { memo } from 'react'
import type { ReactNode, Dispatch, SetStateAction } from 'react'
import type { CustomerRecord } from '@/types'
import type { Booking } from '@/types/booking'
import type { StaffListItem } from '@/types/staff'
import type { BookingFormState } from '@/hooks/useBookingForm'
import type { PackageSelectionData } from '@/components/service-packages'
import type { RecurringPattern } from '@/types/recurring-booking'
import type { UnifiedServicePackage } from '@/hooks/useServicePackages'
import { BookingEditModal, BookingCreateModal } from '@/components/booking'
import { StaffAvailabilityModal } from '@/components/booking/staff-availability-modal'
import { CustomerFormDialog } from '@/components/customers/CustomerFormDialog'
import { BookingDetailModal } from '@/pages/admin/booking-detail-modal'
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

  // Service data
  servicePackages: UnifiedServicePackage[]
  staffList: StaffListItem[]
  teams: Array<{ id: string; name: string }>

  // Create booking modal
  isBookingDialogOpen: boolean
  onCloseBookingDialog: () => void
  onBookingSuccess: () => void
  createAssignmentType: 'none' | 'staff' | 'team'
  setCreateAssignmentType: (type: 'none' | 'staff' | 'team') => void
  calculateEndTime: (startTime: string, durationMinutes: number) => string
  createPackageSelection: PackageSelectionData | null
  setCreatePackageSelection: (selection: PackageSelectionData | null) => void
  selectedCreateStaffId: string
  selectedCreateTeamId: string
  createRecurringDates: string[]
  setCreateRecurringDates: Dispatch<SetStateAction<string[]>>
  createRecurringPattern: RecurringPattern
  setCreateRecurringPattern: Dispatch<SetStateAction<RecurringPattern>>

  // Create availability modal
  isCreateAvailabilityModalOpen: boolean
  onCloseCreateAvailability: () => void
  onOpenCreateAvailability: () => void
  createFormData: { booking_date?: string; start_time?: string; end_time?: string; service_package_id?: string; package_v2_id?: string } | null
  onBeforeOpenCreateAvailability: (formData: { booking_date?: string; start_time?: string; end_time?: string; service_package_id?: string; package_v2_id?: string }) => void
  onSelectCreateStaff: (staffId: string) => void
  onSelectCreateTeam: (teamId: string) => void

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
  onEditBooking: (booking: unknown) => void
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
  isEditBookingAvailabilityOpen: boolean
  selectedBooking: Booking | null
  onCloseEditBooking: () => void
  onEditBookingSuccess: () => void
  editBookingForm: {
    formData: BookingFormState
    handleChange: <K extends keyof BookingFormState>(field: K, value: BookingFormState[K]) => void
    setValues: (values: Partial<BookingFormState>) => void
    reset: () => void
  }
  editBookingAssignmentType: 'staff' | 'team' | 'none'
  onEditAssignmentTypeChange: (type: 'staff' | 'team' | 'none') => void
  editPackageSelection: PackageSelectionData | null
  setEditPackageSelection: (selection: PackageSelectionData | null) => void
  selectedEditStaffId: string
  selectedEditTeamId: string

  // Edit availability modal
  editFormData: { booking_date?: string; start_time?: string; end_time?: string; service_package_id?: string; package_v2_id?: string } | null
  onOpenEditAvailability: () => void
  onBeforeOpenEditAvailability: (formData: { booking_date?: string; start_time?: string; end_time?: string; service_package_id?: string; package_v2_id?: string }) => void
  onCloseEditAvailability: () => void
  onSelectEditStaff: (staffId: string) => void
  onSelectEditTeam: (teamId: string) => void
  editBookingFormState: BookingFormState

  // Status confirm dialog
  showStatusConfirmDialog: boolean
  pendingStatusChange: { currentStatus: string; newStatus: string } | null
  getStatusTransitionMessage: (from: string, to: string) => string
  confirmStatusChange: () => void
  cancelStatusChange: () => void
}

const BookingModalsContainerComponent = function BookingModalsContainer({
  customer,
  servicePackages,
  staffList,
  teams,

  // Create booking modal
  isBookingDialogOpen,
  onCloseBookingDialog,
  onBookingSuccess,
  createAssignmentType,
  setCreateAssignmentType,
  calculateEndTime,
  createPackageSelection,
  setCreatePackageSelection,
  selectedCreateStaffId,
  selectedCreateTeamId,
  createRecurringDates,
  setCreateRecurringDates,
  createRecurringPattern,
  setCreateRecurringPattern,

  // Create availability modal
  isCreateAvailabilityModalOpen,
  onCloseCreateAvailability,
  onOpenCreateAvailability,
  createFormData,
  onBeforeOpenCreateAvailability,
  onSelectCreateStaff,
  onSelectCreateTeam,

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
  isEditBookingAvailabilityOpen,
  selectedBooking,
  onCloseEditBooking,
  onEditBookingSuccess,
  editBookingForm,
  editBookingAssignmentType,
  onEditAssignmentTypeChange,
  editPackageSelection,
  setEditPackageSelection,
  selectedEditStaffId,
  selectedEditTeamId,

  // Edit availability modal
  editFormData,
  onOpenEditAvailability,
  onBeforeOpenEditAvailability,
  onCloseEditAvailability,
  onSelectEditStaff,
  onSelectEditTeam,
  editBookingFormState,

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
      <BookingCreateModal
        isOpen={isBookingDialogOpen}
        onClose={onCloseBookingDialog}
        onSuccess={onBookingSuccess}
        servicePackages={servicePackages}
        staffMembers={staffList}
        teams={teams}
        onOpenAvailabilityModal={onOpenCreateAvailability}
        onBeforeOpenAvailability={onBeforeOpenCreateAvailability}
        assignmentType={createAssignmentType}
        setAssignmentType={setCreateAssignmentType}
        calculateEndTime={calculateEndTime}
        packageSelection={createPackageSelection}
        setPackageSelection={setCreatePackageSelection}
        defaultCustomerId={customer?.id}
        defaultFullName={customer?.full_name}
        defaultEmail={customer?.email}
        defaultPhone={customer?.phone}
        defaultAddress={customer?.address || ''}
        defaultCity={customer?.city || ''}
        defaultState={customer?.state || ''}
        defaultZipCode={customer?.zip_code || ''}
        defaultStaffId={selectedCreateStaffId}
        defaultTeamId={selectedCreateTeamId}
        recurringDates={createRecurringDates}
        setRecurringDates={setCreateRecurringDates}
        recurringPattern={createRecurringPattern}
        setRecurringPattern={setCreateRecurringPattern}
      />

      {/* Staff Availability Modal (for Create) */}
      {createFormData && (createFormData.service_package_id || createFormData.package_v2_id) && (createRecurringDates.length > 0 || createFormData.booking_date) && createFormData.start_time && (
        <StaffAvailabilityModal
          isOpen={isCreateAvailabilityModalOpen}
          onClose={onCloseCreateAvailability}
          assignmentType={createAssignmentType === 'staff' ? 'individual' : 'team'}
          date={createRecurringDates.length === 0 ? createFormData.booking_date : undefined}
          dates={createRecurringDates.length > 0 ? createRecurringDates : undefined}
          startTime={createFormData.start_time}
          endTime={createFormData.end_time || ''}
          servicePackageId={createFormData.service_package_id || createFormData.package_v2_id || ''}
          onSelectStaff={onSelectCreateStaff}
          onSelectTeam={onSelectCreateTeam}
        />
      )}

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
        <BookingDetailModal
          booking={bookings.find(b => b.id === selectedBookingId) ?? null}
          isOpen={isBookingDetailModalOpen}
          onClose={onCloseDetailModal}
          onEdit={onEditBooking as (booking: Booking) => void}
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
          isOpen={isBookingEditOpen && !isEditBookingAvailabilityOpen}
          onClose={onCloseEditBooking}
          booking={selectedBooking}
          onSuccess={onEditBookingSuccess}
          servicePackages={servicePackages}
          staffMembers={staffList}
          teams={teams}
          onOpenAvailabilityModal={onOpenEditAvailability}
          onBeforeOpenAvailability={onBeforeOpenEditAvailability}
          editForm={editBookingForm}
          assignmentType={editBookingAssignmentType}
          onAssignmentTypeChange={onEditAssignmentTypeChange}
          calculateEndTime={calculateEndTime}
          packageSelection={editPackageSelection}
          setPackageSelection={setEditPackageSelection}
          defaultStaffId={selectedEditStaffId}
          defaultTeamId={selectedEditTeamId}
        />
      )}

      {/* Staff Availability Modal - Edit */}
      {editFormData && (editFormData.service_package_id || editFormData.package_v2_id) && editFormData.booking_date && editFormData.start_time && (
        <StaffAvailabilityModal
          isOpen={isEditBookingAvailabilityOpen}
          onClose={onCloseEditAvailability}
          assignmentType={editBookingAssignmentType === 'staff' ? 'individual' : 'team'}
          onSelectStaff={onSelectEditStaff}
          onSelectTeam={onSelectEditTeam}
          date={editFormData.booking_date || ''}
          startTime={editFormData.start_time || ''}
          endTime={editFormData.end_time || ''}
          servicePackageId={editFormData.service_package_id || editFormData.package_v2_id || ''}
          servicePackageName={
            servicePackages.find(pkg => pkg.id === (editFormData.service_package_id || editFormData.package_v2_id))?.name
          }
          currentAssignedStaffId={editBookingFormState.staff_id}
          currentAssignedTeamId={editBookingFormState.team_id}
          excludeBookingId={selectedBooking?.id}
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
