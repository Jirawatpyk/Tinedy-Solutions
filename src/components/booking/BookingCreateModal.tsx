import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import type { PackageSelectionData } from '@/components/service-packages'
import type { UnifiedServicePackage } from '@/hooks/use-service-packages'
import type { RecurringPattern } from '@/types/recurring-booking'
import { useBookingCreate } from '@/hooks/use-booking-create'

// Extracted sub-components
import {
  CustomerInfoSection,
  BookingScheduleSection,
  AssignmentSection,
} from './create-modal'
import AddressSection from './create-modal/AddressSection'

interface StaffMember {
  id: string
  full_name: string
  role: string
}

interface Team {
  id: string
  name: string
}

interface BookingCreateModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  servicePackages: UnifiedServicePackage[]
  staffMembers: StaffMember[]
  teams: Team[]
  onOpenAvailabilityModal: () => void
  onBeforeOpenAvailability?: (formData: import('@/schemas').BookingCreateFormData) => void
  assignmentType: 'staff' | 'team' | 'none'
  setAssignmentType: (type: 'staff' | 'team' | 'none') => void
  calculateEndTime: (startTime: string, durationMinutes: number) => string
  packageSelection: PackageSelectionData | null
  setPackageSelection: (selection: PackageSelectionData | null) => void
  // Default values for pre-filling (from Calendar click or Quick Availability Check)
  defaultDate?: string
  defaultStartTime?: string
  defaultEndTime?: string
  defaultStaffId?: string
  defaultTeamId?: string
  // Default customer data (from Customer Details page)
  defaultCustomerId?: string
  defaultFullName?: string
  defaultEmail?: string
  defaultPhone?: string
  defaultAddress?: string
  defaultCity?: string
  defaultState?: string
  defaultZipCode?: string
  // Recurring bookings props (lifted to parent for StaffAvailabilityModal)
  recurringDates?: string[]
  setRecurringDates?: React.Dispatch<React.SetStateAction<string[]>>
  recurringPattern?: RecurringPattern
  setRecurringPattern?: React.Dispatch<React.SetStateAction<RecurringPattern>>
}

export function BookingCreateModal({
  isOpen,
  onClose,
  onSuccess,
  servicePackages,
  staffMembers,
  teams,
  onOpenAvailabilityModal,
  onBeforeOpenAvailability,
  assignmentType,
  setAssignmentType,
  calculateEndTime,
  packageSelection,
  setPackageSelection,
  defaultDate,
  defaultStartTime,
  defaultEndTime,
  defaultStaffId,
  defaultTeamId,
  defaultCustomerId,
  defaultFullName,
  defaultEmail,
  defaultPhone,
  defaultAddress,
  defaultCity,
  defaultState,
  defaultZipCode,
  recurringDates: parentRecurringDates,
  setRecurringDates: parentSetRecurringDates,
  recurringPattern: parentRecurringPattern,
  setRecurringPattern: parentSetRecurringPattern,
}: BookingCreateModalProps) {
  const {
    form,
    existingCustomer,
    checkingCustomer,
    recurringDates,
    setRecurringDates,
    recurringPattern,
    setRecurringPattern,
    watchedBookingDate,
    watchedStartTime,
    handleEmailBlur,
    handlePhoneBlur,
    useExistingCustomer,
    onSubmit,
    handleClose,
  } = useBookingCreate({
    isOpen,
    onClose,
    onSuccess,
    servicePackages,
    staffMembers,
    assignmentType,
    setAssignmentType,
    calculateEndTime,
    packageSelection,
    setPackageSelection,
    defaultDate,
    defaultStartTime,
    defaultEndTime,
    defaultStaffId,
    defaultTeamId,
    defaultCustomerId,
    defaultFullName,
    defaultEmail,
    defaultPhone,
    defaultAddress,
    defaultCity,
    defaultState,
    defaultZipCode,
    parentRecurringDates,
    parentSetRecurringDates,
    parentRecurringPattern,
    parentSetRecurringPattern,
  })

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle>Create New Booking</DialogTitle>
          <DialogDescription>
            Fill in the booking details below
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} className="flex flex-col flex-1 overflow-hidden">
          <div className="space-y-4 overflow-y-auto flex-1 pl-1 pr-3">
          {/* Customer Information */}
          <CustomerInfoSection
            form={form}
            existingCustomer={existingCustomer}
            checkingCustomer={checkingCustomer}
            handleEmailBlur={handleEmailBlur}
            handlePhoneBlur={handlePhoneBlur}
            useExistingCustomer={useExistingCustomer}
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Schedule Section - Package, Recurring, Date/Time, Price */}
            <BookingScheduleSection
              form={form}
              servicePackages={servicePackages}
              packageSelection={packageSelection}
              setPackageSelection={setPackageSelection}
              recurringDates={recurringDates}
              setRecurringDates={setRecurringDates}
              recurringPattern={recurringPattern}
              setRecurringPattern={setRecurringPattern}
              calculateEndTime={calculateEndTime}
            />

            {/* Assignment Section - Staff/Team Selection, Check Availability */}
            <AssignmentSection
              form={form}
              assignmentType={assignmentType}
              setAssignmentType={setAssignmentType}
              staffMembers={staffMembers}
              teams={teams}
              packageSelection={packageSelection}
              recurringDates={recurringDates}
              watchedBookingDate={watchedBookingDate}
              watchedStartTime={watchedStartTime}
              onBeforeOpenAvailability={onBeforeOpenAvailability}
              onOpenAvailabilityModal={onOpenAvailabilityModal}
            />

            {/* Address Section - Address, City, Province, Zip, Notes */}
            <AddressSection form={form} />
          </div>
          </div>

          <div className="flex justify-end gap-2 flex-shrink-0 border-t pt-4 mt-4">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
            >
              Cancel
            </Button>
            <Button type="submit" className="bg-tinedy-blue">
              Create Booking
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
