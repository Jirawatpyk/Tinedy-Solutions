import { useToast } from '@/hooks/use-toast'
import { supabase } from '@/lib/supabase'
import { mapErrorToUserMessage } from '@/lib/error-messages'
import { useConflictDetection } from '@/hooks/use-conflict-detection'
import { formatTime } from '@/lib/booking-utils'
import { logger } from '@/lib/logger'
import { useState, useEffect, useRef } from 'react'
import { ConfirmDialog } from '@/components/common/ConfirmDialog/ConfirmDialog'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Sparkles } from 'lucide-react'
import { BookingStatus } from '@/types/booking'
import type { Booking } from '@/types/booking'
import type { ServicePackage } from '@/types'
import { PackageSelector, type PackageSelectionData } from '@/components/service-packages'
import type { BookingForm } from '@/hooks/use-booking-form'
import type { UnifiedServicePackage } from '@/hooks/use-service-packages'
import type { ServicePackageV2WithTiers } from '@/types'
import {
  bookingUpdateSchema,
  type BookingUpdateFormData,
} from '@/schemas'

interface StaffMember {
  id: string
  full_name: string
  email: string
  role: string
}

interface Team {
  id: string
  name: string
}

// BookingForm and BookingFormState interfaces imported from @/hooks/useBookingForm

interface BookingEditModalProps {
  isOpen: boolean
  onClose: () => void
  booking: Booking | null
  onSuccess: () => void
  servicePackages: ServicePackage[] | UnifiedServicePackage[]
  staffMembers: StaffMember[]
  teams: Team[]
  onOpenAvailabilityModal: () => void
  onBeforeOpenAvailability?: (formData: BookingUpdateFormData) => void
  editForm: BookingForm
  assignmentType: 'staff' | 'team' | 'none'
  onAssignmentTypeChange: (type: 'staff' | 'team' | 'none') => void
  calculateEndTime: (startTime: string, duration: number) => string
  packageSelection: PackageSelectionData | null
  setPackageSelection: (selection: PackageSelectionData | null) => void
  // Default values from parent state (for syncing selected staff/team)
  defaultStaffId?: string
  defaultTeamId?: string
}

export function BookingEditModal({
  isOpen,
  onClose,
  booking,
  onSuccess,
  servicePackages,
  staffMembers,
  teams,
  onOpenAvailabilityModal,
  onBeforeOpenAvailability,
  assignmentType,
  onAssignmentTypeChange,
  calculateEndTime,
  packageSelection,
  setPackageSelection,
  defaultStaffId,
  defaultTeamId,
}: BookingEditModalProps) {
  const { toast } = useToast()
  const {
    checkConflicts,
    clearConflicts,
  } = useConflictDetection()

  const [showConflictDialog, setShowConflictDialog] = useState(false)
  const [pendingUpdateData, setPendingUpdateData] = useState<Record<string, unknown> | null>(null)
  const [bookingDuration, setBookingDuration] = useState<number | null>(null)

  // Track if form has been initialized for current booking to prevent re-reset
  const lastInitializedBookingId = useRef<string | null>(null)

  // React Hook Form with Zod validation
  const form = useForm<BookingUpdateFormData>({
    resolver: zodResolver(bookingUpdateSchema),
    defaultValues: {
      booking_date: '',
      start_time: '',
      end_time: '',
      package_v2_id: '',
      total_price: 0,
      area_sqm: undefined,
      frequency: undefined,
      address: '',
      city: '',
      state: '',
      zip_code: '',
      staff_id: '',
      team_id: '',
      notes: '',
      status: BookingStatus.Pending,
    },
  })

  // Sync form data when booking changes (only once per booking to prevent overwriting user changes)
  useEffect(() => {
    if (booking && isOpen) {
      // Only reset if this is a new booking or first time opening
      if (lastInitializedBookingId.current !== booking.id) {
        // Calculate duration from existing booking times
        try {
          const startTime = new Date(`1970-01-01T${booking.start_time}`)
          const endTime = new Date(`1970-01-01T${booking.end_time}`)
          const durationMs = endTime.getTime() - startTime.getTime()
          const durationMinutes = Math.round(durationMs / (1000 * 60))

          if (durationMinutes > 0) {
            setBookingDuration(durationMinutes)
          }
        } catch (error) {
          logger.error('Error calculating duration in BookingEditModal', { error })
          setBookingDuration(null)
        }

        form.reset({
          booking_date: booking.booking_date || '',
          start_time: formatTime(booking.start_time || ''),
          end_time: formatTime(booking.end_time || ''),
          package_v2_id: booking.package_v2_id || '',
          total_price: booking.total_price || 0,
          area_sqm: booking.area_sqm || undefined,
          frequency: booking.frequency || undefined,
          address: booking.address || '',
          city: booking.city || '',
          state: booking.state || '',
          zip_code: booking.zip_code || '',
          staff_id: booking.staff_id || '',
          team_id: booking.team_id || '',
          notes: booking.notes || '',
          status: (booking.status || BookingStatus.Pending) as 'pending' | 'confirmed' | 'in_progress' | 'cancelled' | 'completed' | 'no_show',
        })
        lastInitializedBookingId.current = booking.id
      }
    }

    // Reset tracking when modal closes
    if (!isOpen) {
      lastInitializedBookingId.current = null
      setBookingDuration(null)
    }
  }, [booking, isOpen, form])

  // Sync defaultStaffId and defaultTeamId when they change (after selecting from StaffAvailabilityModal)
  useEffect(() => {
    if (!isOpen) return // Only sync when modal is open

    if (defaultStaffId) {
      form.setValue('staff_id', defaultStaffId)
      form.setValue('team_id', '') // Clear team when staff is selected
    }
    if (defaultTeamId) {
      form.setValue('team_id', defaultTeamId)
      form.setValue('staff_id', '') // Clear staff when team is selected
    }
  }, [isOpen, defaultStaffId, defaultTeamId, form])

  const onSubmit = async (data: BookingUpdateFormData) => {
    try {
      // Use existing end_time from form (เก็บเวลาเดิมที่ผู้ใช้ตั้งไว้)
      let endTime = data.end_time || ''

      // Only calculate end_time if not set (ไม่มีค่า end_time)
      if (!endTime && data.start_time) {
        const selectedPackage = servicePackages.find(pkg => pkg.id === data.package_v2_id)

        if (selectedPackage && selectedPackage.duration_minutes) {
          // Package with fixed duration
          endTime = calculateEndTime(data.start_time, selectedPackage.duration_minutes)
        } else if (packageSelection?.requiredStaff) {
          // Tiered package - estimate duration
          const estimatedHours = packageSelection.requiredStaff <= 2 ? 2 : packageSelection.requiredStaff <= 4 ? 3 : 4
          endTime = calculateEndTime(data.start_time, estimatedHours * 60)
        }
      }

      // Store booking_id separately
      const bookingId = booking?.id || ''

      // Determine package type (tiered only in V2)
      const hasTieredPackage = data.package_v2_id && data.package_v2_id.trim()

      // Get team member count if team is assigned (for earnings calculation)
      // IMPORTANT: Only update team_member_count if team actually changed
      // to preserve the original count from when booking was created
      let teamMemberCount: number | null = null
      const newTeamId = data.team_id && data.team_id.trim() ? data.team_id : null
      const originalTeamId = booking?.team_id || null

      if (newTeamId) {
        if (newTeamId === originalTeamId) {
          // Team unchanged - preserve existing team_member_count
          teamMemberCount = (booking as { team_member_count?: number | null })?.team_member_count ?? null
          logger.debug('Team unchanged, preserving team_member_count', { teamId: newTeamId, count: teamMemberCount }, { context: 'BookingEditModal' })
        } else {
          // Team changed - get new member count
          const { data: members } = await supabase
            .rpc('get_team_members_by_team_id', { p_team_id: newTeamId })
          teamMemberCount = members?.length || 1
          logger.debug('Team changed, new team_member_count', { oldTeamId: originalTeamId, newTeamId, count: teamMemberCount }, { context: 'BookingEditModal' })
        }
      }
      // If team_id is cleared (switching to staff or unassigned), teamMemberCount stays null

      // Base update data (common fields)
      const updateData: {
        booking_date: string
        start_time: string
        end_time: string
        address: string | null
        city: string | null
        state: string | null
        zip_code: string | null
        notes: string | null
        total_price: number
        staff_id: string | null
        team_id: string | null
        team_member_count: number | null
        status: string
        package_v2_id?: string | null
        area_sqm?: number | null
        frequency?: number | null
      } = {
        booking_date: data.booking_date,
        start_time: data.start_time,
        end_time: endTime,
        address: data.address && data.address.trim() ? data.address : null,
        city: data.city && data.city.trim() ? data.city : null,
        state: data.state && data.state.trim() ? data.state : null,
        zip_code: data.zip_code && data.zip_code.trim() ? data.zip_code : null,
        notes: data.notes && data.notes.trim() ? data.notes : null,
        total_price: data.total_price,
        staff_id: data.staff_id && data.staff_id.trim() ? data.staff_id : null,
        team_id: newTeamId,
        team_member_count: teamMemberCount,
        status: data.status || BookingStatus.Pending,
      }

      // Add package-specific fields based on package type
      if (hasTieredPackage) {
        // Tiered pricing package (V2)
        updateData.package_v2_id = data.package_v2_id
        updateData.area_sqm = data.area_sqm || null
        updateData.frequency = data.frequency || null
      } else {
        // No package selected
        updateData.package_v2_id = null
        updateData.area_sqm = null
        updateData.frequency = null
      }

      // Check for conflicts
      const detectedConflicts = await checkConflicts({
        staffId: updateData.staff_id,
        teamId: updateData.team_id,
        bookingDate: updateData.booking_date || '',
        startTime: updateData.start_time || '',
        endTime: endTime,
        excludeBookingId: bookingId // Exclude current booking from conflict check
      })

      // If conflicts detected, show confirmation dialog
      if (detectedConflicts.length > 0) {
        setPendingUpdateData({ ...updateData, bookingId })
        setShowConflictDialog(true)
        return // Stop submission until user confirms
      }

      // No conflicts - proceed with update
      await performUpdate(updateData, bookingId)
    } catch (error) {
      logger.error('Error in BookingEditModal submission', { error })
      const errorMsg = mapErrorToUserMessage(error, 'booking')
      toast({
        title: errorMsg.title,
        description: errorMsg.description,
        variant: 'destructive',
      })
    }
  }

  // Perform the actual database update
  const performUpdate = async (updateData: Record<string, unknown>, bookingId: string, isOverride = false) => {
    try {
      const { error } = await supabase
        .from('bookings')
        .update(updateData)
        .eq('id', bookingId)
        .select()

      if (error) {
        logger.error('Error updating booking in BookingEditModal', { bookingId, error })
        throw error
      }

      toast({
        title: 'Success',
        description: isOverride ? 'Booking updated successfully (conflict overridden)' : 'Booking updated successfully',
      })
      handleClose()
      onSuccess()
    } catch (error) {
      logger.error('Error in BookingEditModal submission', { error })
      const errorMsg = mapErrorToUserMessage(error, 'booking')
      toast({
        title: errorMsg.title,
        description: errorMsg.description,
        variant: 'destructive',
      })
    }
  }

  // Handle conflict override confirmation
  const handleConflictConfirm = async () => {
    if (!pendingUpdateData) return
    const { bookingId, ...updateData } = pendingUpdateData
    await performUpdate(updateData, bookingId as string, true)
    setShowConflictDialog(false)
  }

  const handleClose = () => {
    onClose()
    clearConflicts()
    setPendingUpdateData(null)
    setShowConflictDialog(false)
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Booking</DialogTitle>
          <DialogDescription>
            Update booking information
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Package Selector V2 - รองรับทั้ง Fixed และ Tiered Pricing */}
            <div className="space-y-2 sm:col-span-2">
              <PackageSelector
                serviceType="cleaning"
                packages={servicePackages as unknown as ServicePackageV2WithTiers[]} // ส่ง unified packages
                value={packageSelection}
                disabled={true}
                onChange={(selection) => {
                  setPackageSelection(selection)
                  if (selection) {
                    if (selection.pricingModel === 'fixed') {
                      // Fixed pricing (legacy V1 path — set as package_v2_id for now)
                      form.setValue('package_v2_id', selection.packageId)
                      form.setValue('total_price', selection.price)
                      form.setValue('area_sqm', undefined)
                      form.setValue('frequency', undefined)
                    } else {
                      // Tiered pricing - V2 package
                      form.setValue('package_v2_id', selection.packageId)
                      form.setValue('area_sqm', selection.areaSqm)
                      form.setValue('frequency', selection.frequency as 1 | 2 | 4 | 8)
                      form.setValue('total_price', selection.price)
                    }

                    // Auto-calculate End Time if Start Time is set
                    const currentStartTime = form.getValues('start_time')
                    if (currentStartTime && selection.estimatedHours) {
                      const durationMinutes = Math.round(selection.estimatedHours * 60)
                      const endTime = calculateEndTime(currentStartTime, durationMinutes)
                      form.setValue('end_time', endTime)
                    }
                  } else {
                    form.setValue('package_v2_id', '')
                    form.setValue('area_sqm', undefined)
                    form.setValue('frequency', undefined)
                    form.setValue('total_price', 0)
                  }
                }}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit_date">Booking Date *</Label>
              <Input
                id="edit_date"
                type="date"
                {...form.register('booking_date')}
                required
                aria-invalid={!!form.formState.errors.booking_date}
              />
              {form.formState.errors.booking_date && (
                <p className="text-sm text-destructive">
                  {form.formState.errors.booking_date.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit_start_time">Start Time *</Label>
              <Input
                id="edit_start_time"
                type="time"
                {...form.register('start_time', {
                  onChange: (e) => {
                    const newStartTime = e.target.value

                    // Auto-calculate End Time when Start Time changes
                    // Priority: 1. bookingDuration (from existing booking), 2. packageSelection.estimatedHours
                    const durationMinutes = bookingDuration ??
                      (packageSelection?.estimatedHours ? Math.round(packageSelection.estimatedHours * 60) : null)

                    if (newStartTime && durationMinutes) {
                      const endTime = calculateEndTime(newStartTime, durationMinutes)
                      form.setValue('end_time', endTime)
                    }
                  }
                })}
                required
                aria-invalid={!!form.formState.errors.start_time}
              />
              {form.formState.errors.start_time && (
                <p className="text-sm text-destructive">
                  {form.formState.errors.start_time.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit_end_time">End Time (Auto-calculated) *</Label>
              <Input
                id="edit_end_time"
                type="time"
                {...form.register('end_time')}
                placeholder="Auto-calculated from package"
                disabled={true}
                className="bg-muted"
                aria-invalid={!!form.formState.errors.end_time}
              />
              {form.formState.errors.end_time && (
                <p className="text-sm text-destructive">
                  {form.formState.errors.end_time.message}
                </p>
              )}
              <p className="text-xs text-muted-foreground">
                {packageSelection?.estimatedHours
                  ? `Calculated from ${packageSelection.estimatedHours} hrs duration`
                  : 'Duration calculated from area and staff count'}
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit_status">Status *</Label>
              <Controller
                name="status"
                control={form.control}
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger aria-invalid={!!form.formState.errors.status}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="confirmed">Confirmed</SelectItem>
                      <SelectItem value="in_progress">In Progress</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                      <SelectItem value="cancelled">Cancelled</SelectItem>
                      <SelectItem value="no_show">No Show</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
              {form.formState.errors.status && (
                <p className="text-sm text-destructive">
                  {form.formState.errors.status.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit_price">Total Price (Auto-calculated) *</Label>
              <Input
                id="edit_price"
                type="number"
                step="0.01"
                {...form.register('total_price', {
                  valueAsNumber: true,
                })}
                required
                disabled
                className="bg-muted"
                aria-invalid={!!form.formState.errors.total_price}
              />
              {form.formState.errors.total_price && (
                <p className="text-sm text-destructive">
                  {form.formState.errors.total_price.message}
                </p>
              )}
              <p className="text-xs text-muted-foreground">
                Price is calculated from package selection
              </p>
            </div>

            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="edit_assign_to">Assign to</Label>
              <Select
                value={assignmentType}
                onValueChange={(value: 'staff' | 'team' | 'none') => {
                  onAssignmentTypeChange(value)
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
                <Label htmlFor="edit_staff_id">Select Staff Member *</Label>
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
                <Label htmlFor="edit_team_id">Select Team *</Label>
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

                    // Sync form data to parent before opening availability modal
                    if (onBeforeOpenAvailability) {
                      onBeforeOpenAvailability(currentFormData)
                    }

                    onOpenAvailabilityModal()
                  }}
                  disabled={
                    !form.getValues('booking_date') ||
                    !form.getValues('start_time') ||
                    !packageSelection
                  }
                >
                  <Sparkles className="h-4 w-4 mr-2 text-tinedy-blue" />
                  Check Staff Availability
                </Button>
                {(!form.getValues('booking_date') || !form.getValues('start_time') || !packageSelection) && (
                  <p className="text-xs text-muted-foreground text-center">
                    Please select date, time, and service package first
                  </p>
                )}
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit_address">Address</Label>
            <Input
              id="edit_address"
              {...form.register('address')}
              aria-invalid={!!form.formState.errors.address}
            />
            {form.formState.errors.address && (
              <p className="text-sm text-destructive">
                {form.formState.errors.address.message}
              </p>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="edit_city">City</Label>
              <Input
                id="edit_city"
                {...form.register('city')}
                aria-invalid={!!form.formState.errors.city}
              />
              {form.formState.errors.city && (
                <p className="text-sm text-destructive">
                  {form.formState.errors.city.message}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit_state">Province</Label>
              <Input
                id="edit_state"
                {...form.register('state')}
                aria-invalid={!!form.formState.errors.state}
              />
              {form.formState.errors.state && (
                <p className="text-sm text-destructive">
                  {form.formState.errors.state.message}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit_zip_code">Zip Code</Label>
              <Input
                id="edit_zip_code"
                {...form.register('zip_code')}
                aria-invalid={!!form.formState.errors.zip_code}
              />
              {form.formState.errors.zip_code && (
                <p className="text-sm text-destructive">
                  {form.formState.errors.zip_code.message}
                </p>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit_notes">Notes</Label>
            <Input
              id="edit_notes"
              {...form.register('notes')}
              aria-invalid={!!form.formState.errors.notes}
            />
            {form.formState.errors.notes && (
              <p className="text-sm text-destructive">
                {form.formState.errors.notes.message}
              </p>
            )}
          </div>

          <div className="flex gap-2 justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
            >
              Cancel
            </Button>
            <Button type="submit">
              Update Booking
            </Button>
          </div>
        </form>
      </DialogContent>

      {/* Conflict Confirmation Dialog */}
      <ConfirmDialog
        open={showConflictDialog}
        onOpenChange={setShowConflictDialog}
        title="Scheduling Conflict"
        description="This booking conflicts with existing bookings. Are you sure you want to proceed anyway?"
        variant="default"
        confirmLabel="Proceed Anyway"
        cancelLabel="Cancel"
        onConfirm={handleConflictConfirm}
      />
    </Dialog>
  )
}
