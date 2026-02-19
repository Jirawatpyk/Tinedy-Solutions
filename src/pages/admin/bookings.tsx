import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Switch } from '@/components/ui/switch'
import { AdminOnly } from '@/components/auth/permission-guard'
import { PageHeader } from '@/components/common/PageHeader'
import { Plus } from 'lucide-react'
import { BookingFiltersPanel } from '@/components/booking/BookingFiltersPanel'
import { BookingDetailModal } from './booking-detail-modal'
import { ConfirmDialog } from '@/components/common/ConfirmDialog/ConfirmDialog'
import {
  BookingCreateFlow,
  BookingEditFlow,
  BookingListContainer,
  RecurringBookingManager,
} from '@/components/bookings'
import { useBookingsPage } from '@/hooks/use-bookings-page'
import { calculateEndTime, formatTime } from '@/lib/booking-utils'

export function AdminBookings() {
  const {
    state,
    dispatch,
    loading,
    refresh,
    servicePackages,
    staffList,
    teams,
    filters,
    updateFilter,
    resetFilters,
    hasActiveFilters,
    getActiveFilterCount,
    setQuickFilter,
    filteredBookings,
    paginatedCombinedItems,
    currentPage,
    totalPages,
    nextPage,
    prevPage,
    goToFirst,
    goToLast,
    goToPage,
    metadata,
    editForm,
    createForm,
    conflicts,
    proceedWithConflictOverride,
    cancelConflictOverride,
    bulkActions,
    statusManager,
    paymentActions,
    deleteBooking,
    archiveBooking,
    restoreBooking,
    restoreRecurringGroup,
    archiveRecurringGroup,
    deleteRecurringGroup,
    handleRecurringDelete,
    handleRecurringArchive,
    handleVerifyRecurringGroup,
    openBookingDetail,
    openEditBooking,
    setCreateRecurringDates,
    setCreateRecurringPattern,
    toast,
  } = useBookingsPage()

  if (loading) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Bookings"
          subtitle="Manage all service bookings"
          actions={
            <>
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-10 w-36" />
            </>
          }
        />

        {/* Filters skeleton */}
        <Card>
          <CardContent className="py-3 px-4 sm:px-6 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex flex-wrap items-center gap-2">
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-8 w-16" />
                <Skeleton className="h-8 w-20 hidden sm:block" />
                <Skeleton className="h-8 w-24 hidden sm:block" />
              </div>
              <Skeleton className="h-8 w-28" />
            </div>
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-2">
              <Skeleton className="h-9 flex-1" />
              <div className="grid grid-cols-2 sm:flex gap-2">
                <Skeleton className="h-9 sm:w-[150px]" />
                <Skeleton className="h-9 sm:w-[150px]" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Bookings list skeleton */}
        <Card>
          <CardHeader className="px-4 sm:px-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <Skeleton className="h-4 w-4 rounded" />
                <Skeleton className="h-6 w-40" />
              </div>
            </div>
          </CardHeader>
          <CardContent className="px-4 sm:px-6 pt-0">
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-4 pb-4 border-b">
                <div className="flex items-center gap-2">
                  <Skeleton className="h-4 w-12" />
                  <Skeleton className="h-10 w-20" />
                  <Skeleton className="h-4 w-16 hidden sm:block" />
                </div>
                <Skeleton className="h-4 w-52" />
              </div>
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex items-start gap-2 sm:gap-3 p-3 sm:p-4 border rounded-lg">
                  <Skeleton className="h-4 w-4 mt-0.5 sm:mt-1 rounded flex-shrink-0" />
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between flex-1 gap-3 sm:gap-4 min-w-0">
                    <div className="space-y-1.5 sm:space-y-2 flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5 sm:gap-2">
                            <Skeleton className="h-5 w-36" />
                            <Skeleton className="h-4 w-16" />
                          </div>
                          <Skeleton className="h-4 w-44 mt-1" />
                        </div>
                        <Skeleton className="h-5 w-20 rounded-full sm:hidden" />
                      </div>
                      <div className="flex items-center gap-1.5 sm:gap-2">
                        <Skeleton className="h-5 w-16 rounded-full" />
                        <Skeleton className="h-4 w-32" />
                      </div>
                      <Skeleton className="h-4 w-56" />
                    </div>
                    <div className="hidden sm:flex sm:flex-col items-end gap-3 sm:gap-4 flex-shrink-0">
                      <Skeleton className="h-6 w-20" />
                      <div className="flex gap-2">
                        <Skeleton className="h-5 w-20 rounded-full" />
                        <Skeleton className="h-5 w-16 rounded-full" />
                      </div>
                      <div className="flex gap-1.5 sm:gap-2">
                        <Skeleton className="h-8 w-28" />
                        <Skeleton className="h-8 w-8" />
                      </div>
                    </div>
                    {/* Mobile: Price + Payment + Actions */}
                    <div className="sm:hidden flex items-center justify-between mt-2 pt-2 border-t">
                      <Skeleton className="h-5 w-16" />
                      <div className="flex items-center gap-2">
                        <Skeleton className="h-5 w-14 rounded-full" />
                        <Skeleton className="h-7 w-20" />
                        <Skeleton className="h-7 w-7" />
                      </div>
                    </div>
                  </div>
                </div>
              ))}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-4 pt-4 border-t">
                <Skeleton className="h-4 w-28" />
                <div className="flex items-center gap-2">
                  <Skeleton className="h-9 w-14" />
                  <Skeleton className="h-9 w-24" />
                  <Skeleton className="h-9 w-16" />
                  <Skeleton className="h-9 w-12" />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Bookings"
        subtitle="Manage all service bookings"
        actions={
          <>
            <AdminOnly>
              <div className="flex items-center gap-2">
                <Switch
                  id="show-archived-bookings"
                  checked={state.showArchived}
                  onCheckedChange={(checked) => dispatch({ type: 'SET_SHOW_ARCHIVED', payload: checked })}
                />
                <label
                  htmlFor="show-archived-bookings"
                  className="text-sm font-medium cursor-pointer"
                >
                  Show archived
                </label>
              </div>
            </AdminOnly>
            <Button className="bg-tinedy-blue hover:bg-tinedy-blue/90" onClick={() => dispatch({ type: 'SET_DIALOG_OPEN', payload: true })}>
              <Plus className="h-4 w-4 mr-2" />
              New Booking
            </Button>
          </>
        }
      />

      {/* Create Booking Flow */}
      <BookingCreateFlow
        isDialogOpen={state.isDialogOpen}
        onCloseDialog={() => dispatch({ type: 'SET_DIALOG_OPEN', payload: false })}
        onSuccess={refresh}
      />

      {/* Filters */}
      <BookingFiltersPanel
        filters={filters}
        updateFilter={updateFilter}
        resetFilters={resetFilters}
        hasActiveFilters={hasActiveFilters}
        getActiveFilterCount={getActiveFilterCount}
        setQuickFilter={setQuickFilter}
        staffMembers={staffList}
        teams={teams}
      />

      {/* Booking Detail Modal */}
      <BookingDetailModal
        booking={state.selectedBooking}
        isOpen={state.isDetailOpen}
        onClose={() => dispatch({ type: 'CLOSE_DETAIL' })}
        onEdit={openEditBooking}
        onDelete={deleteBooking}
        onCancel={archiveBooking}
        onStatusChange={statusManager.handleStatusChange}
        onMarkAsPaid={statusManager.markAsPaid}
        onVerifyPayment={paymentActions.verifyPayment}
        onRequestRefund={paymentActions.requestRefund}
        onCompleteRefund={paymentActions.completeRefund}
        onCancelRefund={paymentActions.cancelRefund}
        getStatusBadge={statusManager.getStatusBadge}
        getPaymentStatusBadge={statusManager.getPaymentStatusBadge}
        getAvailableStatuses={statusManager.getAvailableStatuses}
        getStatusLabel={statusManager.getStatusLabel}
        actionLoading={{
          statusChange: false,
          delete: false,
          markAsPaid: paymentActions.isLoading.markAsPaid,
        }}
      />

      {/* Edit Booking Flow */}
      <BookingEditFlow
        isEditOpen={state.isEditOpen}
        onCloseEdit={() => dispatch({ type: 'SET_EDIT_OPEN', payload: false })}
        onSuccess={refresh}
        selectedBooking={state.selectedBooking}
      />

      {/* Status Change Confirmation Dialog */}
      {statusManager.pendingStatusChange && (
        <ConfirmDialog
          open={statusManager.showStatusConfirmDialog}
          onOpenChange={(open) => !open && statusManager.cancelStatusChange()}
          title="Confirm Status Change"
          description={statusManager.getStatusTransitionMessage(
            statusManager.pendingStatusChange.currentStatus,
            statusManager.pendingStatusChange.newStatus
          )}
          confirmLabel="Confirm"
          cancelLabel="Cancel"
          onConfirm={statusManager.confirmStatusChange}
          variant={['cancelled', 'no_show'].includes(statusManager.pendingStatusChange.newStatus) ? 'destructive' : 'default'}
        />
      )}

      {/* Recurring/Conflict/Bulk Delete Dialogs */}
      <RecurringBookingManager
        showRecurringEditDialog={state.showRecurringEditDialog}
        setShowRecurringEditDialog={(show) => show ? undefined : dispatch({ type: 'CLOSE_RECURRING_DIALOG' })}
        recurringEditAction={state.recurringEditAction}
        pendingRecurringBooking={state.pendingRecurringBooking}
        handleRecurringArchive={handleRecurringArchive}
        handleRecurringDelete={handleRecurringDelete}
        showConflictDialog={state.showConflictDialog}
        cancelConflictOverride={cancelConflictOverride}
        proceedWithConflictOverride={proceedWithConflictOverride}
        conflicts={conflicts}
        showDeleteConfirm={bulkActions.showDeleteConfirm}
        setShowDeleteConfirm={bulkActions.setShowDeleteConfirm}
        confirmBulkDelete={bulkActions.confirmBulkDelete}
        isDeleting={bulkActions.isDeleting}
        selectedBookingsCount={bulkActions.selectedBookings.length}
        getStatusBadge={statusManager.getStatusBadge}
        formatTime={formatTime}
      />

      {/* Bookings list */}
      <BookingListContainer
        combinedItems={paginatedCombinedItems}
        filteredBookings={filteredBookings}
        selectedBookings={bulkActions.selectedBookings}
        currentPage={currentPage}
        totalPages={totalPages}
        itemsPerPage={state.itemsPerPage}
        metadata={metadata}
        onItemsPerPageChange={(value) => {
          dispatch({ type: 'SET_ITEMS_PER_PAGE', payload: value })
          goToPage(1)
        }}
        goToFirst={goToFirst}
        prevPage={prevPage}
        nextPage={nextPage}
        goToLast={goToLast}
        bulkStatus={bulkActions.bulkStatus}
        setBulkStatus={bulkActions.setBulkStatus}
        toggleSelectAll={bulkActions.toggleSelectAll}
        toggleSelectBooking={bulkActions.toggleSelectBooking}
        handleBulkStatusUpdate={bulkActions.handleBulkStatusUpdate}
        handleBulkExport={bulkActions.handleBulkExport}
        handleBulkDelete={bulkActions.handleBulkDelete}
        openBookingDetail={openBookingDetail}
        deleteBooking={deleteBooking}
        archiveBooking={archiveBooking}
        restoreBooking={restoreBooking}
        deleteRecurringGroup={deleteRecurringGroup}
        archiveRecurringGroup={archiveRecurringGroup}
        restoreRecurringGroup={restoreRecurringGroup}
        handleVerifyPayment={paymentActions.verifyPayment}
        handleVerifyRecurringGroup={handleVerifyRecurringGroup}
        showArchived={state.showArchived}
        handleStatusChange={statusManager.handleStatusChange}
        getStatusBadge={statusManager.getStatusBadge}
        getPaymentStatusBadge={statusManager.getPaymentStatusBadge}
        getAvailableStatuses={statusManager.getAvailableStatuses}
        getStatusLabel={statusManager.getStatusLabel}
        formatTime={formatTime}
      />
    </div>
  )
}
