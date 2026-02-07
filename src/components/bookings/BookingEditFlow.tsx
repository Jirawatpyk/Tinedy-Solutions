/**
 * BookingEditFlow Component
 *
 * Extracted from src/pages/admin/bookings.tsx to create a reusable edit booking flow.
 * This component handles the edit booking modal and the staff availability modal for editing.
 *
 * @module components/bookings/BookingEditFlow
 */

import { memo } from 'react'
import { BookingEditModal } from '@/components/booking/BookingEditModal'
import { StaffAvailabilityModal } from '@/components/booking/staff-availability-modal'
import type { Booking } from '@/types/booking'
import type { ServicePackage } from '@/types'
import type { UnifiedServicePackage } from '@/hooks/use-service-packages'
import type { UseBookingFormReturn } from '@/hooks/use-booking-form'
import { toBookingForm } from '@/hooks/use-booking-form'
import type { PackageSelectionData } from '@/components/service-packages'

/**
 * Staff member interface for assignment selection
 */
interface StaffMember {
  id: string
  full_name: string
  email: string
  role: string
}

/**
 * Team interface for assignment selection
 */
interface Team {
  id: string
  name: string
}

/**
 * Toast notification interface
 */
interface ToastFn {
  (options: { title: string; description: string; variant?: 'default' | 'destructive' }): void
}

/**
 * Props for BookingEditFlow component
 */
interface BookingEditFlowProps {
  /** Whether the edit modal is open */
  isEditOpen: boolean
  /** Callback to close the edit modal */
  onCloseEdit: () => void
  /** Callback when booking is successfully updated */
  onSuccess: () => void
  /** The booking being edited (null if none) */
  selectedBooking: Booking | null
  /** Available service packages */
  servicePackages: ServicePackage[] | UnifiedServicePackage[]
  /** Available staff members for assignment */
  staffList: StaffMember[]
  /** Available teams for assignment */
  teams: Team[]
  /** Edit form state from useBookingForm hook */
  editForm: UseBookingFormReturn
  /** Current assignment type for edit form */
  editAssignmentType: 'staff' | 'team' | 'none'
  /** Callback to change edit assignment type */
  setEditAssignmentType: (type: 'staff' | 'team' | 'none') => void
  /** Current package selection for edit form */
  editPackageSelection: PackageSelectionData | null
  /** Callback to change edit package selection */
  setEditPackageSelection: (selection: PackageSelectionData | null) => void
  /** Whether the staff availability modal is open for edit */
  isEditAvailabilityModalOpen: boolean
  /** Callback to close the staff availability modal */
  onCloseEditAvailability: () => void
  /** Callback to open the staff availability modal */
  onOpenEditAvailability: () => void
  /** Function to calculate end time from start time and duration */
  calculateEndTime: (startTime: string, durationMinutes: number) => string
  /** Toast notification function */
  toast: ToastFn
}

/**
 * BookingEditFlow - Handles the edit booking modal flow
 *
 * This component extracts the edit booking logic from the main bookings page,
 * including the BookingEditModal and StaffAvailabilityModal for editing.
 *
 * @param props - Component props
 * @returns React component
 */
function BookingEditFlowComponent({
  isEditOpen,
  onCloseEdit,
  onSuccess,
  selectedBooking,
  servicePackages,
  staffList,
  teams,
  editForm,
  editAssignmentType,
  setEditAssignmentType,
  editPackageSelection,
  setEditPackageSelection,
  isEditAvailabilityModalOpen,
  onCloseEditAvailability,
  onOpenEditAvailability,
  calculateEndTime,
  toast,
}: BookingEditFlowProps) {
  /**
   * Handle opening the availability modal
   * Closes the edit modal first
   */
  const handleOpenAvailabilityModal = () => {
    onCloseEdit()
    onOpenEditAvailability()
  }

  /**
   * Handle staff selection from availability modal
   */
  const handleSelectStaff = (staffId: string) => {
    editForm.handleChange('staff_id', staffId)
    onCloseEditAvailability()
    // Re-open edit modal after selection
    // Note: The parent component should handle this via onCloseEditAvailability
    toast({
      title: 'Staff Selected',
      description: 'Staff member has been assigned to the booking',
    })
  }

  /**
   * Handle team selection from availability modal
   */
  const handleSelectTeam = (teamId: string) => {
    editForm.handleChange('team_id', teamId)
    onCloseEditAvailability()
    // Re-open edit modal after selection
    // Note: The parent component should handle this via onCloseEditAvailability
    toast({
      title: 'Team Selected',
      description: 'Team has been assigned to the booking',
    })
  }

  /**
   * Get service package name by ID
   */
  const getServicePackageName = () => {
    if (editForm.formData.service_package_id) {
      const pkg = servicePackages.find(
        (p) => p.id === editForm.formData.service_package_id
      )
      return pkg?.name
    }
    return 'Service Package'
  }

  /**
   * Check if we can show the availability modal
   * Requires service package, date, and start time
   */
  const canShowAvailabilityModal =
    (editForm.formData.service_package_id || editForm.formData.package_v2_id) &&
    editForm.formData.booking_date &&
    editForm.formData.start_time

  return (
    <>
      {/* Edit Booking Modal */}
      <BookingEditModal
        isOpen={isEditOpen}
        onClose={onCloseEdit}
        booking={selectedBooking}
        onSuccess={onSuccess}
        servicePackages={servicePackages}
        staffMembers={staffList}
        teams={teams}
        onOpenAvailabilityModal={handleOpenAvailabilityModal}
        onBeforeOpenAvailability={(formData) => {
          // Calculate end_time if not set (fallback)
          let endTime = formData.end_time || ''
          if (!endTime && formData.start_time && editPackageSelection?.estimatedHours) {
            const durationMinutes = Math.round(editPackageSelection.estimatedHours * 60)
            endTime = calculateEndTime(formData.start_time, durationMinutes)
          }

          // Sync form data from BookingEditModal to editForm before opening availability modal
          editForm.setValues({
            booking_date: formData.booking_date || '',
            start_time: formData.start_time || '',
            end_time: endTime,
            service_package_id: formData.service_package_id || '',
            package_v2_id: formData.package_v2_id || '',
            staff_id: formData.staff_id || '',
            team_id: formData.team_id || '',
            total_price: formData.total_price || 0,
            area_sqm: formData.area_sqm || null,
            frequency: formData.frequency || null,
          })
        }}
        editForm={toBookingForm(editForm)}
        assignmentType={editAssignmentType}
        onAssignmentTypeChange={setEditAssignmentType}
        calculateEndTime={calculateEndTime}
        packageSelection={editPackageSelection}
        setPackageSelection={setEditPackageSelection}
        defaultStaffId={editForm.formData.staff_id}
        defaultTeamId={editForm.formData.team_id}
      />

      {/* Staff Availability Modal - Edit Form */}
      {canShowAvailabilityModal && (
        <StaffAvailabilityModal
          isOpen={isEditAvailabilityModalOpen}
          onClose={() => {
            onCloseEditAvailability()
            // Note: Parent should re-open edit modal in onCloseEditAvailability callback
          }}
          assignmentType={editAssignmentType === 'staff' ? 'individual' : 'team'}
          onSelectStaff={handleSelectStaff}
          onSelectTeam={handleSelectTeam}
          date={editForm.formData.booking_date}
          startTime={editForm.formData.start_time || ''}
          endTime={editForm.formData.end_time || ''}
          servicePackageId={
            editForm.formData.service_package_id ||
            editForm.formData.package_v2_id ||
            ''
          }
          servicePackageName={getServicePackageName()}
          currentAssignedStaffId={editForm.formData.staff_id}
          currentAssignedTeamId={editForm.formData.team_id}
          excludeBookingId={selectedBooking?.id}
        />
      )}
    </>
  )
}

// Export memoized component for performance optimization
export const BookingEditFlow = memo(BookingEditFlowComponent)

BookingEditFlow.displayName = 'BookingEditFlow'

// Also export for named import
export default BookingEditFlow
