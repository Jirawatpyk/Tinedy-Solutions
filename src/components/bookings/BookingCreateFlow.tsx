/**
 * BookingCreateFlow Component
 *
 * Extracted create booking modal flow from bookings.tsx
 * Contains BookingCreateModal and StaffAvailabilityModal for create mode
 *
 * @module components/bookings/BookingCreateFlow
 */

import { memo, useCallback } from 'react'
import { BookingCreateModal } from '@/components/booking/BookingCreateModal'
import { StaffAvailabilityModal } from '@/components/booking/staff-availability-modal'
import type { BookingForm } from '@/hooks/useBookingForm'
import type { UnifiedServicePackage } from '@/hooks/useServicePackages'
import type { PackageSelectionData } from '@/components/service-packages'
import type { RecurringPattern } from '@/types/recurring-booking'
import { RecurringPattern as Pattern } from '@/types/recurring-booking'

/**
 * Staff member interface
 */
interface StaffMember {
  id: string
  full_name: string
  role: string
}

/**
 * Team interface
 */
interface Team {
  id: string
  name: string
}

/**
 * Toast function type
 */
interface ToastFn {
  (options: {
    title: string
    description: string
    variant?: 'default' | 'destructive'
  }): void
}

/**
 * Props for BookingCreateFlow component
 */
interface BookingCreateFlowProps {
  // Dialog state
  isDialogOpen: boolean
  onCloseDialog: () => void
  onSuccess: () => void

  // Data dependencies
  servicePackages: UnifiedServicePackage[]
  staffList: StaffMember[]
  teams: Team[]

  // Create form state (from useBookingForm hook)
  createForm: BookingForm

  // Assignment type state
  createAssignmentType: 'staff' | 'team' | 'none'
  setCreateAssignmentType: (type: 'staff' | 'team' | 'none') => void

  // Package selection state
  createPackageSelection: PackageSelectionData | null
  setCreatePackageSelection: (selection: PackageSelectionData | null) => void

  // Recurring state
  createRecurringDates: string[]
  setCreateRecurringDates: React.Dispatch<React.SetStateAction<string[]>>
  createRecurringPattern: RecurringPattern
  setCreateRecurringPattern: React.Dispatch<React.SetStateAction<RecurringPattern>>

  // Availability modal state
  isAvailabilityModalOpen: boolean
  onCloseAvailability: () => void
  onOpenAvailability: () => void
  onReopenDialog: () => void

  // Utilities
  calculateEndTime: (startTime: string, durationMinutes: number) => string
  toast: ToastFn
}

/**
 * BookingCreateFlow Component
 *
 * Handles the complete create booking flow including:
 * - BookingCreateModal for entering booking details
 * - StaffAvailabilityModal for checking and selecting available staff/teams
 *
 * Wrapped with React.memo for performance optimization
 */
function BookingCreateFlowComponent({
  // Dialog state
  isDialogOpen,
  onCloseDialog,
  onSuccess,

  // Data dependencies
  servicePackages,
  staffList,
  teams,

  // Create form state
  createForm,

  // Assignment type state
  createAssignmentType,
  setCreateAssignmentType,

  // Package selection state
  createPackageSelection,
  setCreatePackageSelection,

  // Recurring state
  createRecurringDates,
  setCreateRecurringDates,
  createRecurringPattern,
  setCreateRecurringPattern,

  // Availability modal state
  isAvailabilityModalOpen,
  onCloseAvailability,
  onOpenAvailability,
  onReopenDialog,

  // Utilities
  calculateEndTime,
  toast,
}: BookingCreateFlowProps) {
  /**
   * Handle close dialog - reset form and close modal
   */
  const handleCloseDialog = useCallback(() => {
    onCloseDialog()
    setCreatePackageSelection(null)
    createForm.reset()
    setCreateRecurringDates([])
    setCreateRecurringPattern(Pattern.AutoMonthly)
  }, [
    onCloseDialog,
    setCreatePackageSelection,
    createForm,
    setCreateRecurringDates,
    setCreateRecurringPattern,
  ])

  /**
   * Handle success - reset form and trigger success callback
   */
  const handleSuccess = useCallback(() => {
    // Realtime subscription will update the list automatically
    onSuccess()
    setCreatePackageSelection(null)
    createForm.reset()
    setCreateRecurringDates([])
    setCreateRecurringPattern(Pattern.AutoMonthly)
  }, [
    onSuccess,
    setCreatePackageSelection,
    createForm,
    setCreateRecurringDates,
    setCreateRecurringPattern,
  ])

  /**
   * Handle opening availability modal
   */
  const handleOpenAvailabilityModal = useCallback(() => {
    onCloseDialog()
    onOpenAvailability()
  }, [onCloseDialog, onOpenAvailability])

  /**
   * Sync form data before opening availability modal
   */
  const handleBeforeOpenAvailability = useCallback(
    (formData: {
      booking_date?: string
      start_time?: string
      end_time?: string
      service_package_id?: string
      package_v2_id?: string
      staff_id?: string
      team_id?: string
      total_price?: number
      area_sqm?: number | null
      frequency?: number | null
    }) => {
      // Calculate end_time if not set (fallback)
      let endTime = formData.end_time || ''
      if (!endTime && formData.start_time && createPackageSelection?.estimatedHours) {
        const durationMinutes = Math.round(createPackageSelection.estimatedHours * 60)
        endTime = calculateEndTime(formData.start_time, durationMinutes)
      }

      // Sync form data from BookingCreateModal to createForm before opening availability modal
      createForm.setValues({
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
    },
    [createForm, createPackageSelection?.estimatedHours, calculateEndTime]
  )

  /**
   * Handle closing availability modal - reopen create dialog
   */
  const handleCloseAvailabilityModal = useCallback(() => {
    onCloseAvailability()
    onReopenDialog()
  }, [onCloseAvailability, onReopenDialog])

  /**
   * Handle staff selection from availability modal
   */
  const handleSelectStaff = useCallback(
    (staffId: string) => {
      createForm.handleChange('staff_id', staffId)
      createForm.handleChange('team_id', '') // Clear team when staff is selected
      onCloseAvailability()
      onReopenDialog()
      toast({
        title: 'Staff Selected',
        description: 'Staff member has been assigned to the booking',
      })
    },
    [createForm, onCloseAvailability, onReopenDialog, toast]
  )

  /**
   * Handle team selection from availability modal
   */
  const handleSelectTeam = useCallback(
    (teamId: string) => {
      createForm.handleChange('team_id', teamId)
      createForm.handleChange('staff_id', '') // Clear staff when team is selected
      onCloseAvailability()
      onReopenDialog()
      toast({
        title: 'Team Selected',
        description: 'Team has been assigned to the booking',
      })
    },
    [createForm, onCloseAvailability, onReopenDialog, toast]
  )

  // Determine if staff availability modal should be shown
  const shouldShowAvailabilityModal =
    (createForm.formData.service_package_id || createForm.formData.package_v2_id) &&
    // Must have date (recurring or single booking) and start time
    (createRecurringDates.length > 0 || createForm.formData.booking_date) &&
    createForm.formData.start_time

  // Get service package name for availability modal
  const servicePackageName = createForm.formData.service_package_id
    ? servicePackages.find((pkg) => pkg.id === createForm.formData.service_package_id)?.name
    : 'Service Package'

  return (
    <>
      {/* Booking Create Modal */}
      <BookingCreateModal
        isOpen={isDialogOpen}
        onClose={handleCloseDialog}
        onSuccess={handleSuccess}
        servicePackages={servicePackages}
        staffMembers={staffList}
        teams={teams}
        onOpenAvailabilityModal={handleOpenAvailabilityModal}
        onBeforeOpenAvailability={handleBeforeOpenAvailability}
        assignmentType={createAssignmentType}
        setAssignmentType={setCreateAssignmentType}
        calculateEndTime={calculateEndTime}
        packageSelection={createPackageSelection}
        setPackageSelection={setCreatePackageSelection}
        defaultDate={createForm.formData.booking_date}
        defaultStartTime={createForm.formData.start_time}
        defaultEndTime={createForm.formData.end_time}
        defaultStaffId={createForm.formData.staff_id}
        defaultTeamId={createForm.formData.team_id}
        recurringDates={createRecurringDates}
        setRecurringDates={setCreateRecurringDates}
        recurringPattern={createRecurringPattern}
        setRecurringPattern={setCreateRecurringPattern}
      />

      {/* Staff Availability Modal - Create Form */}
      {shouldShowAvailabilityModal && (
        <StaffAvailabilityModal
          isOpen={isAvailabilityModalOpen}
          onClose={handleCloseAvailabilityModal}
          assignmentType={createAssignmentType === 'staff' ? 'individual' : 'team'}
          onSelectStaff={handleSelectStaff}
          onSelectTeam={handleSelectTeam}
          // Recurring: send dates array, Non-recurring: send single date
          date={createRecurringDates.length === 0 ? createForm.formData.booking_date : undefined}
          dates={createRecurringDates.length > 0 ? createRecurringDates : undefined}
          startTime={createForm.formData.start_time || ''}
          endTime={createForm.formData.end_time || ''}
          servicePackageId={
            createForm.formData.service_package_id || createForm.formData.package_v2_id || ''
          }
          servicePackageName={servicePackageName}
        />
      )}
    </>
  )
}

// Export memoized component with named function
export const BookingCreateFlow = memo(BookingCreateFlowComponent)
BookingCreateFlow.displayName = 'BookingCreateFlow'
