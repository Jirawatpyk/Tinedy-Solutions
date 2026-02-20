import { useParams } from 'react-router-dom'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { SimpleTooltip } from '@/components/ui/simple-tooltip'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Edit } from 'lucide-react'
import { PermissionAwareDeleteButton } from '@/components/common/PermissionAwareDeleteButton'
import { PageHeader } from '@/components/common/PageHeader'
import { useCustomerDetail } from '@/hooks/use-customer-detail'
import { toast } from 'sonner'
import type { Booking } from '@/types/booking'

import {
  CustomerProfileHeader,
  CustomerMetricsSection,
  CustomerIntelligenceCard,
  CustomerNotesCard,
  BookingActivityChart,
  BookingHistorySection,
  BookingModalsContainer,
} from '@/components/customer-detail'

export function AdminCustomerDetail() {
  const { id } = useParams<{ id: string }>()
  const {
    state,
    dispatch,
    bookings,
    bookingsLoading,
    refetchBookings,
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
    exportToExcel,
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
          toast('LINE ID Copied', { description: `"${customer.line_id}" copied to clipboard. Search in LINE app to start chat.` })
        }}
      />

      {/* Customer Metrics */}
      <CustomerMetricsSection
        stats={stats}
        customerCreatedAt={customer.created_at}
      />

      {/* Customer Intelligence */}
      <CustomerIntelligenceCard customer={customer} stats={stats} />

      {/* Notes & Activity */}
      <CustomerNotesCard
        notes={customer.notes}
        onAddNote={() => dispatch({ type: 'OPEN_MODAL', modal: 'note' })}
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
        // Create booking modal
        isBookingDialogOpen={state.activeModal === 'booking'}
        onCloseBookingDialog={() => dispatch({ type: 'CLOSE_MODAL' })}
        onBookingSuccess={() => {
          dispatch({ type: 'CLOSE_MODAL' })
          refetchBookings()
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
        onEditBooking={handleEditBooking}
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
        selectedBooking={state.selectedBooking}
        onCloseEditBooking={() => dispatch({ type: 'CLOSE_EDIT_BOOKING' })}
        onEditBookingSuccess={refetchBookings}
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
