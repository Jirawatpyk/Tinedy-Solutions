import { useEffect, useRef, useState, useMemo } from 'react'
import { AlertTriangle, RefreshCw } from 'lucide-react'

// Hooks
import { useDashboardStats, useDashboardActions, useBookingModal } from '@/hooks/dashboard'

// Components
import { DashboardStats, NeedsAttention, TodayAppointmentsList, WeeklyOverview } from '@/components/dashboard/admin'
import type { AttentionFilter } from '@/components/dashboard/admin'
import { RevenueLineChart } from '@/components/charts'
import { PageHeader } from '@/components/common/PageHeader'
import { BookingDetailSheet } from '@/components/booking/BookingDetailSheet'
import { BookingEditModal } from '@/components/booking'
import { ConfirmDialog } from '@/components/common/ConfirmDialog/ConfirmDialog'

// Utils
import { computeDashboardSubtitle } from '@/lib/dashboard-utils'

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

  // Attention filter state — lifted from NeedsAttention to coordinate with TodayAppointmentsList
  const [attentionFilter, setAttentionFilter] = useState<AttentionFilter | null>(null)

  // Dynamic subtitle: computed from todayBookings (not all-time stats.totalRevenue)
  const subtitle = useMemo(
    () => computeDashboardSubtitle(dashboardData.todayBookings),
    [dashboardData.todayBookings]
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
        <PageHeader title="Dashboard" subtitle={subtitle} />

        {/* Error Card */}
        <div className="rounded-lg border border-red-200 bg-red-50 p-6">
          <div className="flex items-start gap-3">
            <div className="rounded-full bg-red-100 p-2">
              <AlertTriangle className="h-5 w-5 text-red-600" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-red-900">Failed to Load Dashboard</h3>
              <p className="mt-1 text-sm text-red-700">{dashboardData.error}</p>
              <button
                type="button"
                onClick={() => dashboardData.refresh()}
                className="mt-3 inline-flex items-center gap-2 rounded-md bg-red-600 px-3 py-2 text-sm font-medium text-white hover:bg-red-700"
              >
                <RefreshCw className="h-4 w-4" />
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
      <PageHeader title="Dashboard" subtitle={subtitle} />

      {/* Stats Cards — full width */}
      <DashboardStats
        stats={dashboardData.stats}
        statsChange={dashboardData.statsChange}
        loading={dashboardData.loadingStates.stats || dashboardData.loadingStates.todayStats}
      />

      {/* Main grid: mobile=single col, tablet=2-col, desktop=3-col */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {/* Right sidebar — NeedsAttention + PieChart; mobile: above, desktop: right */}
        <div className="flex flex-col gap-6 md:order-2 lg:order-2">
          <NeedsAttention
            todayBookings={dashboardData.todayBookings}
            onFilterSelect={setAttentionFilter}
            activeFilter={attentionFilter}
          />
          <WeeklyOverview
            days={dashboardData.weeklyBookings}
            loading={dashboardData.loadingStates.weeklyBookings}
            error={dashboardData.weeklyBookingsError}
          />
        </div>

        {/* Today's Appointments — col-span-2 on lg, left on md+ */}
        <div className="md:order-1 lg:order-1 lg:col-span-2">
          <TodayAppointmentsList
            bookings={dashboardData.todayBookings}
            onBookingClick={modal.openDetail}
            loading={dashboardData.loadingStates.todayBookings}
            attentionFilter={attentionFilter}
            onClearAttentionFilter={() => setAttentionFilter(null)}
          />
        </div>

        {/* Revenue Chart — full-width (col-span-full), below the main row */}
        <div className="col-span-full md:order-3">
          <RevenueLineChart data={dashboardData.dailyRevenue} />
        </div>
      </div>

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
