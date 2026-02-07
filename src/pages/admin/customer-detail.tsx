import { useParams } from 'react-router-dom'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { SimpleTooltip } from '@/components/ui/simple-tooltip'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Edit } from 'lucide-react'
import { PermissionAwareDeleteButton } from '@/components/common/PermissionAwareDeleteButton'
import { PageHeader } from '@/components/common/PageHeader'
import { useCustomerDetail } from '@/hooks/use-customer-detail'
import { useToast } from '@/hooks/use-toast'
import type { Booking } from '@/types/booking'

import {
  CustomerProfileHeader,
  CustomerMetricsSection,
  BookingActivityChart,
  BookingHistorySection,
  BookingModalsContainer,
} from '@/components/customer-detail'

export function AdminCustomerDetail() {
  const { id } = useParams<{ id: string }>()
  const { toast } = useToast()

  const {
    state,
    dispatch,
    bookings,
    bookingsLoading,
    refetchBookings,
    servicePackages,
    staffList,
    teams,
    filteredBookings,
    paginatedItems,
    totalBookingsCount,
    totalPages,
    startIndex,
    endIndex,
    fetchCustomerDetails,
    handleCreateBooking,
    handleAddNote,
    archiveBooking,
    archiveCustomer,
    deleteCustomer,
    handleEditBooking,
    editBookingForm,
    exportToExcel,
    calculateEndTime,
    deleteBookingById,
    showStatusConfirmDialog,
    pendingStatusChange,
    getStatusBadge,
    getPaymentStatusBadge,
    getAvailableStatuses,
    getStatusLabel,
    getStatusTransitionMessage,
    handleStatusChange,
    confirmStatusChange,
    cancelStatusChange,
    payment,
    basePath,
  } = useCustomerDetail(id)

  const { customer, stats, loading } = state

  // --- Loading state ---
  if (loading || bookingsLoading || !customer) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-48" />
        <div className="grid gap-4 md:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-4 w-24" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-16" />
              </CardContent>
            </Card>
          ))}
        </div>
        <Card>
          <CardContent className="pt-6">
            <Skeleton className="h-64 w-full" />
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <PageHeader
        title={customer.full_name}
        subtitle="View and manage customer details"
        backHref={`${basePath}/customers`}
        actions={
          <>
            <SimpleTooltip content="Edit">
              <Button
                variant="outline"
                size="icon"
                onClick={() => dispatch({ type: 'OPEN_MODAL', modal: 'edit' })}
                className="h-8 w-8 sm:hidden"
              >
                <Edit className="h-4 w-4" />
              </Button>
            </SimpleTooltip>
            <Button
              variant="outline"
              size="sm"
              onClick={() => dispatch({ type: 'OPEN_MODAL', modal: 'edit' })}
              className="hidden sm:flex h-9"
            >
              <Edit className="h-4 w-4 mr-2" />
              Edit
            </Button>

            <PermissionAwareDeleteButton
              resource="customers"
              itemName={customer.full_name}
              onDelete={deleteCustomer}
              onCancel={archiveCustomer}
              cancelText="Archive"
              buttonVariant="outline"
              responsive
              warningMessage={
                stats?.total_bookings && stats.total_bookings > 0
                  ? `This customer has ${stats.total_bookings} booking(s) that will also be deleted.`
                  : undefined
              }
            />
          </>
        }
      />

      {/* Customer Profile Header */}
      <CustomerProfileHeader
        customer={customer}
        onCreateBooking={handleCreateBooking}
        onAddNote={() => dispatch({ type: 'OPEN_MODAL', modal: 'note' })}
        onCopyLineId={() => {
          navigator.clipboard.writeText(customer.line_id || '')
          toast({
            title: 'LINE ID Copied',
            description: `"${customer.line_id}" copied to clipboard. Search in LINE app to start chat.`,
          })
        }}
      />

      {/* Customer Metrics */}
      <CustomerMetricsSection
        stats={stats}
        customerCreatedAt={customer.created_at}
      />

      {/* Customer Activity Chart */}
      <BookingActivityChart bookings={bookings} />

      {/* Booking History */}
      <BookingHistorySection
        searchQuery={state.searchQuery}
        onSearchChange={(q) => dispatch({ type: 'SET_SEARCH_QUERY', payload: q })}
        statusFilter={state.statusFilter}
        onStatusFilterChange={(s) => dispatch({ type: 'SET_STATUS_FILTER', payload: s })}
        paymentStatusFilter={state.paymentStatusFilter}
        onPaymentStatusFilterChange={(s) => dispatch({ type: 'SET_PAYMENT_STATUS_FILTER', payload: s })}
        paginatedItems={paginatedItems}
        totalItems={totalBookingsCount}
        filteredBookingsCount={filteredBookings.length}
        currentPage={state.currentPage}
        totalPages={totalPages}
        startIndex={startIndex}
        endIndex={endIndex}
        onPageChange={(p) => dispatch({ type: 'SET_PAGE', payload: p })}
        onExportExcel={exportToExcel}
        onBookingClick={(bookingId) => {
          dispatch({ type: 'SET_SELECTED_BOOKING_ID', payload: bookingId })
          dispatch({ type: 'OPEN_MODAL', modal: 'detail' })
        }}
        onStatusChange={handleStatusChange}
        onVerifyPayment={(bookingId) => {
          const booking = bookings.find(b => b.id === bookingId)
          payment.verifyPayment.mutate({
            bookingId,
            recurringGroupId: booking?.recurring_group_id || undefined,
          })
        }}
        getStatusBadge={getStatusBadge}
        getAvailableStatuses={getAvailableStatuses}
        getStatusLabel={getStatusLabel}
        customerFullName={customer.full_name}
        customerEmail={customer.email}
      />

      {/* All Modals */}
      <BookingModalsContainer
        customer={customer}
        servicePackages={servicePackages}
        staffList={staffList}
        teams={teams}
        // Create booking modal
        isBookingDialogOpen={state.activeModal === 'booking'}
        onCloseBookingDialog={() => {
          dispatch({ type: 'CLOSE_MODAL' })
          dispatch({ type: 'SET_CREATE_PACKAGE_SELECTION', payload: null })
        }}
        onBookingSuccess={() => {
          dispatch({ type: 'CLOSE_MODAL' })
          dispatch({ type: 'SET_CREATE_PACKAGE_SELECTION', payload: null })
          refetchBookings()
        }}
        createAssignmentType={state.createAssignmentType}
        setCreateAssignmentType={(t) => dispatch({ type: 'SET_CREATE_ASSIGNMENT_TYPE', payload: t })}
        calculateEndTime={calculateEndTime}
        createPackageSelection={state.createPackageSelection}
        setCreatePackageSelection={(s) => dispatch({ type: 'SET_CREATE_PACKAGE_SELECTION', payload: s })}
        selectedCreateStaffId={state.selectedCreateStaffId}
        selectedCreateTeamId={state.selectedCreateTeamId}
        createRecurringDates={state.createRecurringDates}
        setCreateRecurringDates={(d) => dispatch({ type: 'SET_CREATE_RECURRING_DATES', payload: typeof d === 'function' ? d(state.createRecurringDates) : d })}
        createRecurringPattern={state.createRecurringPattern}
        setCreateRecurringPattern={(p) => dispatch({ type: 'SET_CREATE_RECURRING_PATTERN', payload: typeof p === 'function' ? p(state.createRecurringPattern) : p })}
        // Create availability modal
        isCreateAvailabilityModalOpen={state.isCreateAvailabilityModalOpen}
        onCloseCreateAvailability={() => dispatch({ type: 'SET_CREATE_AVAILABILITY_MODAL', payload: false })}
        onOpenCreateAvailability={() => dispatch({ type: 'SET_CREATE_AVAILABILITY_MODAL', payload: true })}
        createFormData={state.createFormData}
        onBeforeOpenCreateAvailability={(formData) => dispatch({ type: 'SET_CREATE_FORM_DATA', payload: formData })}
        onSelectCreateStaff={(staffId) => {
          dispatch({ type: 'SET_CREATE_STAFF_ID', payload: staffId })
          dispatch({ type: 'SET_CREATE_TEAM_ID', payload: '' })
          dispatch({ type: 'SET_CREATE_ASSIGNMENT_TYPE', payload: 'staff' })
          dispatch({ type: 'SET_CREATE_AVAILABILITY_MODAL', payload: false })
          toast({ title: 'Staff Selected', description: 'Staff member has been assigned to the booking' })
        }}
        onSelectCreateTeam={(teamId) => {
          dispatch({ type: 'SET_CREATE_TEAM_ID', payload: teamId })
          dispatch({ type: 'SET_CREATE_STAFF_ID', payload: '' })
          dispatch({ type: 'SET_CREATE_ASSIGNMENT_TYPE', payload: 'team' })
          dispatch({ type: 'SET_CREATE_AVAILABILITY_MODAL', payload: false })
          toast({ title: 'Team Selected', description: 'Team has been assigned to the booking' })
        }}
        // Note dialog
        isNoteDialogOpen={state.activeModal === 'note'}
        setIsNoteDialogOpen={(open) => open ? dispatch({ type: 'OPEN_MODAL', modal: 'note' }) : dispatch({ type: 'CLOSE_MODAL' })}
        noteText={state.noteText}
        setNoteText={(t) => dispatch({ type: 'SET_NOTE_TEXT', payload: t })}
        onAddNote={handleAddNote}
        submitting={state.submitting}
        // Edit customer dialog
        isEditDialogOpen={state.activeModal === 'edit'}
        onCloseEditDialog={() => dispatch({ type: 'CLOSE_MODAL' })}
        onEditSuccess={fetchCustomerDetails}
        // Booking detail modal
        isBookingDetailModalOpen={state.activeModal === 'detail'}
        selectedBookingId={state.selectedBookingId}
        bookings={bookings as unknown as Booking[]}
        onCloseDetailModal={() => {
          dispatch({ type: 'CLOSE_MODAL' })
          dispatch({ type: 'SET_SELECTED_BOOKING_ID', payload: null })
          refetchBookings()
        }}
        onEditBooking={(booking) => handleEditBooking(booking as Booking)}
        onArchiveBooking={archiveBooking}
        onDeleteBooking={deleteBookingById}
        onStatusChange={handleStatusChange}
        onMarkAsPaid={(bookingId, method) => {
          const booking = bookings.find(b => b.id === bookingId)
          payment.markAsPaid.mutate({
            bookingId,
            recurringGroupId: booking?.recurring_group_id || undefined,
            paymentMethod: method,
            amount: booking?.total_price || 0,
          })
        }}
        onVerifyPayment={(bookingId) => {
          const booking = bookings.find(b => b.id === bookingId)
          payment.verifyPayment.mutate({
            bookingId,
            recurringGroupId: booking?.recurring_group_id || undefined,
          })
        }}
        onRequestRefund={(bookingId) => {
          const booking = bookings.find(b => b.id === bookingId)
          payment.requestRefund.mutate({
            bookingId,
            recurringGroupId: booking?.recurring_group_id || undefined,
          })
        }}
        onCompleteRefund={(bookingId) => {
          const booking = bookings.find(b => b.id === bookingId)
          payment.completeRefund.mutate({
            bookingId,
            recurringGroupId: booking?.recurring_group_id || undefined,
          })
        }}
        onCancelRefund={(bookingId) => {
          const booking = bookings.find(b => b.id === bookingId)
          payment.cancelRefund.mutate({
            bookingId,
            recurringGroupId: booking?.recurring_group_id || undefined,
          })
        }}
        getStatusBadge={getStatusBadge}
        getPaymentStatusBadge={getPaymentStatusBadge}
        getAvailableStatuses={getAvailableStatuses}
        getStatusLabel={getStatusLabel}
        // Edit booking modal
        isBookingEditOpen={state.activeModal === 'bookingEdit'}
        isEditBookingAvailabilityOpen={state.isEditBookingAvailabilityOpen}
        selectedBooking={state.selectedBooking}
        onCloseEditBooking={() => dispatch({ type: 'CLOSE_EDIT_BOOKING' })}
        onEditBookingSuccess={() => refetchBookings()}
        editBookingForm={editBookingForm}
        editBookingAssignmentType={state.editBookingAssignmentType}
        onEditAssignmentTypeChange={(t) => dispatch({ type: 'SET_EDIT_ASSIGNMENT_TYPE', payload: t })}
        editPackageSelection={state.editPackageSelection}
        setEditPackageSelection={(s) => dispatch({ type: 'SET_EDIT_PACKAGE_SELECTION', payload: s })}
        selectedEditStaffId={state.selectedEditStaffId}
        selectedEditTeamId={state.selectedEditTeamId}
        // Edit availability modal
        editFormData={state.editFormData}
        onOpenEditAvailability={() => dispatch({ type: 'SET_EDIT_AVAILABILITY_MODAL', payload: true })}
        onBeforeOpenEditAvailability={(formData) => dispatch({ type: 'SET_EDIT_FORM_DATA', payload: formData })}
        onCloseEditAvailability={() => dispatch({ type: 'SET_EDIT_AVAILABILITY_MODAL', payload: false })}
        onSelectEditStaff={(staffId) => {
          dispatch({ type: 'SET_EDIT_STAFF_ID', payload: staffId })
          dispatch({ type: 'SET_EDIT_TEAM_ID', payload: '' })
          dispatch({ type: 'SET_EDIT_ASSIGNMENT_TYPE', payload: 'staff' })
          dispatch({ type: 'SET_EDIT_AVAILABILITY_MODAL', payload: false })
          toast({ title: 'Staff Selected', description: 'Staff member has been assigned to the booking' })
        }}
        onSelectEditTeam={(teamId) => {
          dispatch({ type: 'SET_EDIT_TEAM_ID', payload: teamId })
          dispatch({ type: 'SET_EDIT_STAFF_ID', payload: '' })
          dispatch({ type: 'SET_EDIT_ASSIGNMENT_TYPE', payload: 'team' })
          dispatch({ type: 'SET_EDIT_AVAILABILITY_MODAL', payload: false })
          toast({ title: 'Team Selected', description: 'Team has been assigned to the booking' })
        }}
        editBookingFormState={state.editBookingFormState}
        // Status confirm dialog
        showStatusConfirmDialog={showStatusConfirmDialog}
        pendingStatusChange={pendingStatusChange}
        getStatusTransitionMessage={getStatusTransitionMessage}
        confirmStatusChange={confirmStatusChange}
        cancelStatusChange={cancelStatusChange}
      />
    </div>
  )
}
