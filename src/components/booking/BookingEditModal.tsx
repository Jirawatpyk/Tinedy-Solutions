import { useToast } from '@/hooks/use-toast'
import { supabase } from '@/lib/supabase'
import { mapErrorToUserMessage } from '@/lib/error-messages'
import { useConflictDetection } from '@/hooks/useConflictDetection'
import { useState } from 'react'
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
import type { Booking } from '@/types/booking'
import type { ServicePackage } from '@/types'
import { PackageSelector, type PackageSelectionData } from '@/components/service-packages'
import type { BookingForm } from '@/hooks/useBookingForm'
import type { UnifiedServicePackage } from '@/hooks/useServicePackages'
import type { ServicePackageV2WithTiers } from '@/types'

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
  editForm: BookingForm
  assignmentType: 'staff' | 'team' | 'none'
  onAssignmentTypeChange: (type: 'staff' | 'team' | 'none') => void
  calculateEndTime: (startTime: string, duration: number) => string
  packageSelection: PackageSelectionData | null
  setPackageSelection: (selection: PackageSelectionData | null) => void
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
  editForm,
  assignmentType,
  onAssignmentTypeChange,
  calculateEndTime,
  packageSelection,
  setPackageSelection,
}: BookingEditModalProps) {
  const { toast } = useToast()
  const {
    checkConflicts,
    clearConflicts,
  } = useConflictDetection()

  const [conflictOverride, setConflictOverride] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      // Use existing end_time from form (เก็บเวลาเดิมที่ผู้ใช้ตั้งไว้)
      let endTime = editForm.formData.end_time || ''

      // Only calculate end_time if not set (ไม่มีค่า end_time)
      if (!endTime && editForm.formData.start_time) {
        const selectedPackage = servicePackages.find(pkg => pkg.id === editForm.formData.service_package_id || pkg.id === editForm.formData.package_v2_id)

        if (selectedPackage && selectedPackage.duration_minutes) {
          // Package with fixed duration
          endTime = calculateEndTime(editForm.formData.start_time || '', selectedPackage.duration_minutes)
        } else if (packageSelection?.requiredStaff) {
          // Tiered package - estimate duration
          const estimatedHours = packageSelection.requiredStaff <= 2 ? 2 : packageSelection.requiredStaff <= 4 ? 3 : 4
          endTime = calculateEndTime(editForm.formData.start_time || '', estimatedHours * 60)
        }
      }

      // Store booking_id separately (not in editForm.formData)
      const bookingId = booking?.id || ''

      const updateData = {
        service_package_id: editForm.formData.service_package_id || null,
        booking_date: editForm.formData.booking_date,
        start_time: editForm.formData.start_time,
        end_time: endTime,
        address: editForm.formData.address,
        city: editForm.formData.city,
        state: editForm.formData.state,
        zip_code: editForm.formData.zip_code,
        notes: editForm.formData.notes,
        total_price: editForm.formData.total_price,
        staff_id: editForm.formData.staff_id || null,
        team_id: editForm.formData.team_id || null,
        status: editForm.formData.status,
        // V2 Tiered Pricing Fields
        area_sqm: editForm.formData.area_sqm || null,
        frequency: editForm.formData.frequency || null,
        calculated_price: editForm.formData.calculated_price || null,
        package_v2_id: editForm.formData.package_v2_id || null,
      }

      // Check for conflicts (unless user has already confirmed override)
      if (!conflictOverride) {
        const detectedConflicts = await checkConflicts({
          staffId: updateData.staff_id,
          teamId: updateData.team_id,
          bookingDate: updateData.booking_date || '',
          startTime: updateData.start_time || '',
          endTime: endTime,
          excludeBookingId: bookingId // Exclude current booking from conflict check
        })

        if (detectedConflicts.length > 0) {
          // Conflicts detected - show error toast
          toast({
            title: 'Scheduling Conflict',
            description: 'This booking conflicts with existing bookings. Please choose a different time or staff member.',
            variant: 'destructive',
          })
          return // Stop submission
        }
      }

      // No conflicts or user confirmed override - proceed with update
      const { error } = await supabase
        .from('bookings')
        .update(updateData)
        .eq('id', bookingId)

      if (error) throw error

      toast({
        title: 'Success',
        description: conflictOverride ? 'Booking updated successfully (conflict overridden)' : 'Booking updated successfully',
      })
      onClose()
      setConflictOverride(false)
      clearConflicts()
      onSuccess()
    } catch (error) {
      const errorMsg = mapErrorToUserMessage(error, 'booking')
      toast({
        title: errorMsg.title,
        description: errorMsg.description,
        variant: 'destructive',
      })
    }
  }

  const handleClose = () => {
    onClose()
    clearConflicts()
    setConflictOverride(false)
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
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Package Selector V2 - รองรับทั้ง Fixed และ Tiered Pricing */}
            <div className="space-y-2 sm:col-span-2">
              <PackageSelector
                serviceType="cleaning"
                packages={servicePackages as unknown as ServicePackageV2WithTiers[]} // ส่ง unified packages
                value={packageSelection}
                onChange={(selection) => {
                  setPackageSelection(selection)
                  if (selection) {
                    if (selection.pricingModel === 'fixed') {
                      editForm.setValues({
                        service_package_id: selection.packageId,
                        total_price: selection.price,
                        package_v2_id: selection.packageId,
                        area_sqm: null,
                        frequency: null,
                        calculated_price: null,
                      })
                    } else {
                      // Tiered pricing
                      editForm.setValues({
                        service_package_id: '',
                        package_v2_id: selection.packageId,
                        area_sqm: selection.areaSqm,
                        frequency: selection.frequency,
                        calculated_price: selection.price,
                        total_price: selection.price,
                      })
                    }

                    // Auto-calculate End Time if Start Time is set
                    if (editForm.formData.start_time && selection.estimatedHours) {
                      const durationMinutes = Math.round(selection.estimatedHours * 60)
                      const endTime = calculateEndTime(editForm.formData.start_time, durationMinutes)
                      editForm.handleChange('end_time', endTime)
                    }
                  } else {
                    editForm.setValues({
                      service_package_id: '',
                      package_v2_id: undefined,
                      area_sqm: null,
                      frequency: null,
                      calculated_price: null,
                      total_price: 0,
                    })
                  }
                }}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit_date">Booking Date *</Label>
              <Input
                id="edit_date"
                type="date"
                value={editForm.formData.booking_date || ''}
                onChange={(e) =>
                  editForm.handleChange('booking_date', e.target.value)
                }
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit_start_time">Start Time *</Label>
              <Input
                id="edit_start_time"
                type="time"
                value={editForm.formData.start_time || ''}
                onChange={(e) => {
                  const newStartTime = e.target.value
                  editForm.handleChange('start_time', newStartTime)

                  // Auto-calculate End Time when Start Time changes
                  if (newStartTime && packageSelection?.estimatedHours) {
                    const durationMinutes = Math.round(packageSelection.estimatedHours * 60)
                    const endTime = calculateEndTime(newStartTime, durationMinutes)
                    editForm.handleChange('end_time', endTime)
                  }
                }}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit_end_time">End Time (Auto-calculated) *</Label>
              <Input
                id="edit_end_time"
                type="time"
                value={editForm.formData.end_time || ''}
                onChange={(e) =>
                  editForm.handleChange('end_time', e.target.value)
                }
                placeholder="คำนวณอัตโนมัติจากแพ็คเก็จ"
                disabled={!!packageSelection?.estimatedHours}
              />
              <p className="text-xs text-muted-foreground">
                {packageSelection?.estimatedHours
                  ? `คำนวณจากระยะเวลา ${packageSelection.estimatedHours} ชม.`
                  : 'ระยะเวลาคำนวณจากพื้นที่และจำนวนพนักงาน'}
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit_status">Status *</Label>
              <Select
                value={editForm.formData.status || ''}
                onValueChange={(value) =>
                  editForm.handleChange('status', value)
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="confirmed">Confirmed</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit_price">Total Price (Auto-calculated) *</Label>
              <Input
                id="edit_price"
                type="number"
                step="0.01"
                value={editForm.formData.total_price || 0}
                onChange={(e) =>
                  editForm.handleChange('total_price', parseFloat(e.target.value))
                }
                required
                disabled
                className="bg-muted"
              />
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
                  editForm.setValues({ staff_id: '', team_id: '' })
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
                <Select
                  value={editForm.formData.staff_id || ''}
                  onValueChange={(value) =>
                    editForm.handleChange('staff_id', value)
                  }
                  required
                >
                  <SelectTrigger>
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
              </div>
            )}

            {/* Team Selector - Conditional */}
            {assignmentType === 'team' && (
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="edit_team_id">Select Team *</Label>
                <Select
                  value={editForm.formData.team_id || ''}
                  onValueChange={(value) =>
                    editForm.handleChange('team_id', value)
                  }
                  required
                >
                  <SelectTrigger>
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
              </div>
            )}

            {/* Check Availability Button */}
            {assignmentType !== 'none' && (
              <div className="space-y-2 sm:col-span-2">
                <Button
                  type="button"
                  variant="outline"
                  className="w-full bg-gradient-to-r from-tinedy-blue/10 to-tinedy-green/10 hover:from-tinedy-blue/20 hover:to-tinedy-green/20 border-tinedy-blue/30"
                  onClick={onOpenAvailabilityModal}
                  disabled={
                    !editForm.formData.booking_date ||
                    !editForm.formData.start_time ||
                    !packageSelection
                  }
                >
                  <Sparkles className="h-4 w-4 mr-2 text-tinedy-blue" />
                  Check Staff Availability
                </Button>
                {(!editForm.formData.booking_date || !editForm.formData.start_time || !packageSelection) && (
                  <p className="text-xs text-muted-foreground text-center">
                    Please select date, time, and service package first
                  </p>
                )}
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit_address">Address *</Label>
            <Input
              id="edit_address"
              value={editForm.formData.address || ''}
              onChange={(e) =>
                editForm.handleChange('address', e.target.value)
              }
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="edit_city">City *</Label>
              <Input
                id="edit_city"
                value={editForm.formData.city || ''}
                onChange={(e) =>
                  editForm.handleChange('city', e.target.value)
                }
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit_state">State *</Label>
              <Input
                id="edit_state"
                value={editForm.formData.state || ''}
                onChange={(e) =>
                  editForm.handleChange('state', e.target.value)
                }
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit_zip_code">Zip Code *</Label>
              <Input
                id="edit_zip_code"
                value={editForm.formData.zip_code || ''}
                onChange={(e) =>
                  editForm.handleChange('zip_code', e.target.value)
                }
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit_notes">Notes</Label>
            <Input
              id="edit_notes"
              value={editForm.formData.notes || ''}
              onChange={(e) =>
                editForm.handleChange('notes', e.target.value)
              }
            />
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
    </Dialog>
  )
}
