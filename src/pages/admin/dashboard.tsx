import { useEffect, useState } from 'react'
import { useToast } from '@/hooks/use-toast'
import { useServicePackages } from '@/hooks/useServicePackages'
import { useStaffList } from '@/hooks/useStaff'
import { supabase } from '@/lib/supabase'
import { calculateEndTime } from '@/lib/dashboard-utils'
import { getStatusBadge, getPaymentStatusBadge, getAvailableStatuses, getStatusLabel } from '@/lib/booking-badges'

// Hooks
import { useDashboardStats, useDashboardActions, useBookingModal } from '@/hooks/dashboard'

// Components
import { DashboardStats, QuickInsights, DashboardCharts, TodayAppointmentsList } from '@/components/dashboard/admin'
import { BookingDetailModal } from './booking-detail-modal'
import { BookingEditModal } from '@/components/booking'
import { StaffAvailabilityModal } from '@/components/booking/staff-availability-modal'

// Types
import type { Team, TodayBooking } from '@/types/dashboard'
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
  const [teams, setTeams] = useState<Team[]>([])

  // Edit Modal State
  const [isEditAvailabilityOpen, setIsEditAvailabilityOpen] = useState(false)
  const [editAssignmentType, setEditAssignmentType] = useState<'staff' | 'team' | 'none'>('none')
  const [editFormData, setEditFormData] = useState<BookingFormState>({})
  const [editPackageSelection, setEditPackageSelection] = useState<PackageSelectionData | null>(null)

  // Load teams
  useEffect(() => {
    fetchTeams()
  }, [])

  const fetchTeams = async () => {
    try {
      const { data, error } = await supabase
        .from('teams')
        .select('id, name')
        .eq('is_active', true)
        .order('name')

      if (error) throw error
      setTeams(data || [])
    } catch (error) {
      console.error('Error fetching teams:', error)
    }
  }

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
        loading={dashboardData.loading}
      />

      {/* Quick Insights */}
      <QuickInsights miniStats={dashboardData.miniStats} loading={dashboardData.loading} />

      {/* Charts Row */}
      <DashboardCharts
        bookingsByStatus={dashboardData.bookingsByStatus}
        dailyRevenue={dashboardData.dailyRevenue}
        loading={dashboardData.loading}
      />

      {/* Today's Appointments */}
      <TodayAppointmentsList
        bookings={dashboardData.todayBookings}
        onBookingClick={modal.openDetail}
        loading={dashboardData.loading}
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
    </div>
  )
}
