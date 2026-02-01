import React from 'react'
import { Controller } from 'react-hook-form'
import type { UseFormReturn } from 'react-hook-form'
import { Sparkles } from 'lucide-react'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type { PackageSelectionData } from '@/components/service-packages'
import type { BookingCreateFormData } from '@/schemas'
import { logger } from '@/lib/logger'

interface StaffMember {
  id: string
  full_name: string
  role: string
}

interface Team {
  id: string
  name: string
}

interface AssignmentSectionProps {
  form: UseFormReturn<BookingCreateFormData>
  assignmentType: 'staff' | 'team' | 'none'
  setAssignmentType: (type: 'staff' | 'team' | 'none') => void
  staffMembers: StaffMember[]
  teams: Team[]
  packageSelection: PackageSelectionData | null
  recurringDates: string[]
  watchedBookingDate: string
  watchedStartTime: string
  onBeforeOpenAvailability?: (formData: BookingCreateFormData) => void
  onOpenAvailabilityModal: () => void
}

const AssignmentSection = React.memo(function AssignmentSection({
  form,
  assignmentType,
  setAssignmentType,
  staffMembers,
  teams,
  packageSelection,
  recurringDates,
  watchedBookingDate,
  watchedStartTime,
  onBeforeOpenAvailability,
  onOpenAvailabilityModal,
}: AssignmentSectionProps) {
  // Check if this is a recurring booking (frequency > 1)
  const isRecurring = packageSelection?.frequency && packageSelection.frequency > 1

  // Determine if the availability button should be disabled
  const isAvailabilityDisabled =
    (isRecurring ? recurringDates.length === 0 : !watchedBookingDate) ||
    !watchedStartTime ||
    !packageSelection

  return (
    <>
      {/* Assignment Type Selector */}
      <div className="space-y-2 sm:col-span-2">
        <Label>Assign to</Label>
        <Select
          value={assignmentType}
          onValueChange={(value: 'staff' | 'team' | 'none') => {
            setAssignmentType(value)
            form.setValue('staff_id', '')
            form.setValue('team_id', '')
          }}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select assignment type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">Unassigned</SelectItem>
            <SelectItem value="staff">Individual Staff</SelectItem>
            <SelectItem value="team">Team</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Staff Selector - Conditional */}
      {assignmentType === 'staff' && (
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="staff_id">Select Staff Member *</Label>
          <Controller
            name="staff_id"
            control={form.control}
            render={({ field }) => (
              <Select value={field.value} onValueChange={field.onChange} required>
                <SelectTrigger aria-invalid={!!form.formState.errors.staff_id}>
                  <SelectValue placeholder="Select staff member..." />
                </SelectTrigger>
                <SelectContent>
                  {staffMembers.map((staff) => (
                    <SelectItem key={staff.id} value={staff.id}>
                      {staff.full_name} ({staff.role})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
          {form.formState.errors.staff_id && (
            <p className="text-sm text-destructive">
              {form.formState.errors.staff_id.message}
            </p>
          )}
        </div>
      )}

      {/* Team Selector - Conditional */}
      {assignmentType === 'team' && (
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="team_id">Select Team *</Label>
          <Controller
            name="team_id"
            control={form.control}
            render={({ field }) => (
              <Select value={field.value} onValueChange={field.onChange} required>
                <SelectTrigger aria-invalid={!!form.formState.errors.team_id}>
                  <SelectValue placeholder="Select team..." />
                </SelectTrigger>
                <SelectContent>
                  {teams.map((team) => (
                    <SelectItem key={team.id} value={team.id}>
                      {team.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
          {form.formState.errors.team_id && (
            <p className="text-sm text-destructive">
              {form.formState.errors.team_id.message}
            </p>
          )}
        </div>
      )}

      {/* Check Availability Button */}
      {assignmentType !== 'none' && (
        <div className="space-y-2 sm:col-span-2">
          <Button
            type="button"
            variant="outline"
            className="w-full bg-gradient-to-r from-tinedy-blue/10 to-tinedy-green/10 hover:from-tinedy-blue/20 hover:to-tinedy-green/20 border-tinedy-blue/30"
            onClick={() => {
              const currentFormData = form.getValues()
              logger.debug('Check availability button clicked', {
                assignmentType,
                hasRecurringDates: isRecurring ? recurringDates.length : null,
                hasBookingDate: !isRecurring ? !!currentFormData.booking_date : null,
                hasStartTime: !!currentFormData.start_time,
                hasPackageSelection: !!packageSelection,
                formData: currentFormData
              }, { context: 'BookingCreateModal' })

              // Sync form data to parent before opening availability modal
              if (onBeforeOpenAvailability) {
                onBeforeOpenAvailability(currentFormData)
              }

              onOpenAvailabilityModal()
            }}
            disabled={isAvailabilityDisabled}
          >
            <Sparkles className="h-4 w-4 mr-2 text-tinedy-blue" />
            Check Staff Availability
          </Button>
          {isAvailabilityDisabled && (
            <p className="text-xs text-muted-foreground text-center">
              {isRecurring
                ? 'Please select dates, time, and service package first'
                : 'Please select date, time, and service package first'
              }
            </p>
          )}
        </div>
      )}
    </>
  )
})

AssignmentSection.displayName = 'AssignmentSection'

export { AssignmentSection }
export type { AssignmentSectionProps, StaffMember, Team }
