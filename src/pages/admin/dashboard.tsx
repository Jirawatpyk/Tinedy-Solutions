import { useState } from 'react'
import { useToast } from '@/hooks/use-toast'
import { useServicePackages } from '@/hooks/useServicePackages'
import { useStaffList } from '@/hooks/useStaff'
import { useTeamsList } from '@/hooks/useTeams'
import { calculateEndTime } from '@/lib/dashboard-utils'
import { getStatusBadge, getPaymentStatusBadge, getAvailableStatuses, getStatusLabel } from '@/lib/booking-badges'

// Hooks
import { useDashboardStats, useDashboardActions, useBookingModal } from '@/hooks/dashboard'

// Components
import { DashboardStats, QuickInsights, DashboardCharts, TodayAppointmentsList } from '@/components/dashboard/admin'
import { BookingDetailModal } from './booking-detail-modal'
import { BookingEditModal } from '@/components/booking'
import { StaffAvailabilityModal } from '@/components/booking/staff-availability-modal'
import { ConfirmDialog } from '@/components/common/ConfirmDialog/ConfirmDialog'

// Types
import type { TodayBooking } from '@/types/dashboard'
import type { BookingFormState } from '@/hooks/useBookingForm'
import type { PackageSelectionData } from '@/components/service-packages'

export function AdminDashboard() {
  const { toast } = useToast()

  // Dashboard Data Hooks
  const dashboardData = useDashboardStats()
  const modal = useBookingModal()
  const actions = useDashboardActions(
    dashboardData.refresh,
    modal.selectedBooking,
    modal.updateSelectedBooking
  )

  // Service Packages & Staff/Team Data
  const { packages: servicePackages } = useServicePackages()
  const { staffList } = useStaffList({ role: 'staff', enableRealtime: false })
  const { teamsList: teams } = useTeamsList({ enableRealtime: true })

  // Edit Modal State
  const [isEditAvailabilityOpen, setIsEditAvailabilityOpen] = useState(false)
  const [editAssignmentType, setEditAssignmentType] = useState<'staff' | 'team' | 'none'>('none')
  const [editFormData, setEditFormData] = useState<BookingFormState>({})
  const [editPackageSelection, setEditPackageSelection] = useState<PackageSelectionData | null>(null)

  // Edit Form Helpers
  const editForm = {
    formData: editFormData,
    handleChange: <K extends keyof BookingFormState>(field: K, value: BookingFormState[K]) => {
      setEditFormData((prev) => ({ ...prev, [field]: value }))
    },
    setValues: (values: Partial<BookingFormState>) => {
      setEditFormData((prev) => ({ ...prev, ...values }))
    },
    reset: () => {
      setEditFormData({})
      setEditAssignmentType('none')
    },
  }

  const handleEditBooking = (booking: TodayBooking) => {
    // Populate edit form with booking data
    setEditFormData({
      service_package_id: booking.service_package_id,
      package_v2_id: booking.package_v2_id || undefined,
      booking_date: booking.booking_date,
      start_time: booking.start_time,
      end_time: booking.end_time,
      address: booking.address,
      city: booking.city,
      state: booking.state,
      zip_code: booking.zip_code,
      notes: booking.notes || undefined,
      total_price: booking.total_price,
      staff_id: booking.staff_id || '',
      team_id: booking.team_id || '',
      status: booking.status,
      area_sqm: booking.area_sqm || undefined,
      frequency: booking.frequency || undefined,
    })

    // Set assignment type based on booking data
    if (booking.staff_id) {
      setEditAssignmentType('staff')
    } else if (booking.team_id) {
      setEditAssignmentType('team')
    } else {
      setEditAssignmentType('none')
    }

    // Set package selection for PackageSelector component
    const packageId = booking.package_v2_id || booking.service_package_id

    if (packageId) {
      const pkg = servicePackages.find((p) => p.id === packageId)

      if (pkg) {
        // Check if it's V2 Tiered or V1 Fixed
        if (pkg.pricing_model === 'tiered' && booking.area_sqm && booking.frequency) {
          // V2 Tiered package
          setEditPackageSelection({
            packageId: pkg.id,
            pricingModel: 'tiered',
            areaSqm: booking.area_sqm,
            frequency: booking.frequency,
            price: Number(booking.total_price || 0),
            requiredStaff: 1,
            packageName: pkg.name,
          })
        } else {
          // V1 Fixed package
          const basePrice = 'base_price' in pkg ? pkg.base_price : (pkg as Record<string, unknown>).price || 0
          setEditPackageSelection({
            packageId: pkg.id,
            pricingModel: 'fixed',
            price: Number(basePrice || booking.total_price || 0),
            requiredStaff: 1,
            packageName: pkg.name,
            estimatedHours: pkg.duration_minutes ? pkg.duration_minutes / 60 : undefined,
          })
        }
      }
    }

    modal.setSelectedBooking(booking)
    modal.setIsEditOpen(true)
    modal.setIsDetailOpen(false)
  }

  // Error state
  if (dashboardData.error) {
    return (
      <div className="space-y-6">
        {/* Page Header */}
        <div>
          <h1 className="text-3xl font-display font-bold text-tinedy-dark">Dashboard</h1>
          <p className="text-muted-foreground mt-1">
            Welcome back! Here's what's happening today.
          </p>
        </div>

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
      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-display font-bold text-tinedy-dark">Dashboard</h1>
        <p className="text-muted-foreground mt-1">
          Welcome back! Here's what's happening today.
        </p>
      </div>

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
      <BookingDetailModal
        booking={modal.selectedBooking}
        isOpen={modal.isDetailOpen}
        onClose={modal.closeDetail}
        onEdit={() => modal.selectedBooking && handleEditBooking(modal.selectedBooking)}
        onCancel={actions.archiveBooking}
        onDelete={actions.deleteBooking}
        onStatusChange={actions.handleStatusChange}
        onMarkAsPaid={actions.markAsPaid}
        onVerifyPayment={actions.verifyPayment}
        getStatusBadge={getStatusBadge}
        getPaymentStatusBadge={getPaymentStatusBadge}
        getAvailableStatuses={getAvailableStatuses}
        getStatusLabel={getStatusLabel}
        actionLoading={actions.actionLoading}
      />

      {/* Edit Booking Modal */}
      {modal.selectedBooking && (
        <BookingEditModal
          isOpen={modal.isEditOpen && !isEditAvailabilityOpen}
          onClose={() => {
            modal.setIsEditOpen(false)
            editForm.reset()
          }}
          booking={modal.selectedBooking}
          onSuccess={() => {
            dashboardData.refresh()
          }}
          servicePackages={servicePackages}
          staffMembers={staffList}
          teams={teams}
          onOpenAvailabilityModal={() => {
            setIsEditAvailabilityOpen(true)
          }}
          onBeforeOpenAvailability={(formData) => {
            // Sync form data from BookingEditModal to editForm before opening availability modal
            editForm.setValues({
              booking_date: formData.booking_date || '',
              start_time: formData.start_time || '',
              end_time: formData.end_time || '',
              service_package_id: formData.service_package_id || '',
              package_v2_id: formData.package_v2_id || '',
              staff_id: formData.staff_id || '',
              team_id: formData.team_id || '',
              total_price: formData.total_price || 0,
              area_sqm: formData.area_sqm || null,
              frequency: formData.frequency || null,
            })
          }}
          editForm={editForm}
          assignmentType={editAssignmentType}
          onAssignmentTypeChange={setEditAssignmentType}
          calculateEndTime={calculateEndTime}
          packageSelection={editPackageSelection}
          setPackageSelection={setEditPackageSelection}
          defaultStaffId={editForm.formData.staff_id}
          defaultTeamId={editForm.formData.team_id}
        />
      )}

      {/* Staff Availability Modal - Edit */}
      {(editFormData.service_package_id || editFormData.package_v2_id) && editFormData.booking_date && editFormData.start_time && (
        <StaffAvailabilityModal
          isOpen={isEditAvailabilityOpen}
          onClose={() => {
            setIsEditAvailabilityOpen(false)
          }}
          assignmentType={editAssignmentType === 'staff' ? 'individual' : 'team'}
          onSelectStaff={(staffId) => {
            editForm.handleChange('staff_id', staffId)
            editForm.handleChange('team_id', '') // Clear team when staff is selected
            setIsEditAvailabilityOpen(false)
            toast({
              title: 'Staff Selected',
              description: 'Staff member has been assigned to the booking',
            })
          }}
          onSelectTeam={(teamId) => {
            editForm.handleChange('team_id', teamId)
            editForm.handleChange('staff_id', '') // Clear staff when team is selected
            setIsEditAvailabilityOpen(false)
            toast({
              title: 'Team Selected',
              description: 'Team has been assigned to the booking',
            })
          }}
          date={editFormData.booking_date || ''}
          startTime={editFormData.start_time || ''}
          endTime={
            (editFormData.service_package_id || editFormData.package_v2_id) && editFormData.start_time
              ? calculateEndTime(
                  editFormData.start_time,
                  servicePackages.find((pkg) => pkg.id === (editFormData.service_package_id || editFormData.package_v2_id))
                    ?.duration_minutes || 0
                )
              : editFormData.end_time || ''
          }
          servicePackageId={editFormData.service_package_id || editFormData.package_v2_id || ''}
          servicePackageName={
            servicePackages.find((pkg) => pkg.id === (editFormData.service_package_id || editFormData.package_v2_id))?.name
          }
          currentAssignedStaffId={editFormData.staff_id}
          currentAssignedTeamId={editFormData.team_id}
          excludeBookingId={modal.selectedBooking?.id}
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
    </div>
  )
}
