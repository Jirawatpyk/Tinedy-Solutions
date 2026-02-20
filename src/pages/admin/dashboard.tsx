import { useEffect, useRef } from 'react'

// Hooks
import { useDashboardStats, useDashboardActions, useBookingModal } from '@/hooks/dashboard'

// Components
import { DashboardStats, QuickInsights, DashboardCharts, TodayAppointmentsList } from '@/components/dashboard/admin'
import { PageHeader } from '@/components/common/PageHeader'
import { BookingDetailSheet } from '@/components/booking/BookingDetailSheet'
import { BookingEditModal } from '@/components/booking'
import { ConfirmDialog } from '@/components/common/ConfirmDialog/ConfirmDialog'

// Types
import { BookingStatus } from '@/types/booking'
import type { Booking } from '@/types/booking'

export function AdminDashboard() {
  // Dashboard Data Hooks
  const dashboardData = useDashboardStats()
  const modal = useBookingModal()
  const actions = useDashboardActions(
    dashboardData.refresh,
    modal.selectedBooking,
    modal.setSelectedBooking
  )

  // Sync selectedBooking with todayBookings when data updates (realtime)
  // Optimized to prevent flickering by comparing only important fields
  const lastSyncedBooking = useRef<Booking | null>(null)

  useEffect(() => {
    // Only sync if modal is open and booking is selected
    if (!modal.selectedBooking || !modal.isDetailOpen) {
      lastSyncedBooking.current = null
      return
    }

    if (dashboardData.todayBookings.length === 0) return

    const updatedBooking = dashboardData.todayBookings.find(
      (b) => b.id === modal.selectedBooking?.id
    )

    if (!updatedBooking) return

    // Compare only important fields that might change via realtime
    const prev = lastSyncedBooking.current
    const hasImportantChanges = !prev ||
      updatedBooking.status !== prev.status ||
      updatedBooking.payment_status !== prev.payment_status ||
      updatedBooking.payment_method !== prev.payment_method ||
      updatedBooking.payment_date !== prev.payment_date

    if (hasImportantChanges) {
      lastSyncedBooking.current = updatedBooking
      modal.updateSelectedBooking(updatedBooking)
    }
    // Note: We only use specific modal properties, not the entire modal object
    // to prevent unnecessary re-renders and infinite loops
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dashboardData.todayBookings, modal.selectedBooking?.id, modal.isDetailOpen, modal.updateSelectedBooking])

  const handleEditBooking = (booking: Booking) => {
    modal.setSelectedBooking(booking)
    modal.setIsEditOpen(true)
    modal.setIsDetailOpen(false)
  }

  // Error state
  if (dashboardData.error) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Dashboard"
          subtitle="Welcome back! Here's what's happening today."
        />

        {/* Error Card */}
        <div className="rounded-lg border border-red-200 bg-red-50 p-6">
          <div className="flex items-start gap-3">
            <div className="rounded-full bg-red-100 p-2">
              <svg className="h-5 w-5 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-red-900">Failed to Load Dashboard</h3>
              <p className="mt-1 text-sm text-red-700">{dashboardData.error}</p>
              <button
                type="button"
                onClick={() => dashboardData.refresh()}
                className="mt-3 inline-flex items-center gap-2 rounded-md bg-red-600 px-3 py-2 text-sm font-medium text-white hover:bg-red-700"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Retry
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Dashboard"
        subtitle="Welcome back! Here's what's happening today."
      />

      {/* Stats Cards */}
      <DashboardStats
        stats={dashboardData.stats}
        statsChange={dashboardData.statsChange}
        loading={dashboardData.loadingStates.stats || dashboardData.loadingStates.todayStats}
      />

      {/* Quick Insights */}
      <QuickInsights
        miniStats={dashboardData.miniStats}
        loading={dashboardData.loadingStates.miniStats}
      />

      {/* Charts Row */}
      <DashboardCharts
        bookingsByStatus={dashboardData.bookingsByStatus}
        dailyRevenue={dashboardData.dailyRevenue}
        loading={dashboardData.loadingStates.byStatus || dashboardData.loadingStates.revenue}
      />

      {/* Today's Appointments */}
      <TodayAppointmentsList
        bookings={dashboardData.todayBookings}
        onBookingClick={modal.openDetail}
        loading={dashboardData.loadingStates.todayBookings}
      />

      {/* Booking Detail Modal */}
      <BookingDetailSheet
        booking={modal.selectedBooking}
        isOpen={modal.isDetailOpen}
        onClose={modal.closeDetail}
        onEdit={() => modal.selectedBooking && handleEditBooking(modal.selectedBooking)}
        onCancel={actions.archiveBooking}
        onDelete={actions.deleteBooking}
        onStatusChange={actions.handleStatusChange}
        onMarkAsPaid={actions.markAsPaid}
        onVerifyPayment={actions.verifyPayment}
        onRequestRefund={actions.requestRefund}
        onCompleteRefund={actions.completeRefund}
        onCancelRefund={actions.cancelRefund}
        getStatusBadge={actions.getStatusBadge}
        getPaymentStatusBadge={actions.getPaymentStatusBadge}
        getAvailableStatuses={actions.getAvailableStatuses}
        getStatusLabel={actions.getStatusLabel}
        actionLoading={{
          statusChange: actions.actionLoading.statusChange,
          delete: actions.actionLoading.delete,
          markAsPaid: actions.actionLoading.markAsPaid,
        }}
      />

      {/* Edit Booking Modal */}
      {modal.selectedBooking && (
        <BookingEditModal
          open={modal.isEditOpen}
          onOpenChange={(open) => { if (!open) modal.setIsEditOpen(false) }}
          booking={modal.selectedBooking}
          onSuccess={dashboardData.refresh}
        />
      )}

      {/* Delete Booking Confirmation Dialog */}
      <ConfirmDialog
        open={actions.deleteConfirm.show}
        onOpenChange={(open) => !open && actions.cancelDeleteBooking()}
        title="Delete Booking"
        description="Are you sure you want to delete this booking? This action cannot be undone."
        variant="danger"
        confirmLabel="Delete"
        cancelLabel="Cancel"
        onConfirm={actions.confirmDeleteBooking}
        isLoading={actions.actionLoading.delete}
      />

      {/* Status Change Confirmation Dialog */}
      {actions.statusChangeConfirm.currentStatus && actions.statusChangeConfirm.newStatus && (
        <ConfirmDialog
          open={actions.statusChangeConfirm.show}
          onOpenChange={(open) => !open && actions.cancelStatusChange()}
          title="Confirm Status Change"
          description={actions.getStatusTransitionMessage(
            actions.statusChangeConfirm.currentStatus,
            actions.statusChangeConfirm.newStatus
          )}
          confirmLabel="Confirm"
          cancelLabel="Cancel"
          onConfirm={actions.confirmStatusChange}
          variant={([BookingStatus.Cancelled, BookingStatus.NoShow] as string[]).includes(actions.statusChangeConfirm.newStatus) ? 'destructive' : 'default'}
          isLoading={actions.actionLoading.statusChange}
        />
      )}
    </div>
  )
}
