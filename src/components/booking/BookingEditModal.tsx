import { useToast } from '@/hooks/use-toast'
import { supabase } from '@/lib/supabase'
import { getErrorMessage } from '@/lib/error-utils'
import { formatCurrency } from '@/lib/utils'
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

interface FormData {
  customer_id?: string
  full_name?: string
  email?: string
  phone?: string
  address?: string
  city?: string
  state?: string
  zip_code?: string
  service_package_id?: string
  booking_date?: string
  start_time?: string
  end_time?: string
  total_price?: number
  staff_id?: string
  team_id?: string
  notes?: string
  status?: string
}

interface BookingForm {
  formData: FormData
  handleChange: <K extends keyof FormData>(field: K, value: FormData[K]) => void
  setValues: (values: Partial<FormData>) => void
  reset: () => void
}

interface BookingEditModalProps {
  isOpen: boolean
  onClose: () => void
  booking: Booking | null
  onSuccess: () => void
  servicePackages: ServicePackage[]
  staffMembers: StaffMember[]
  teams: Team[]
  onOpenAvailabilityModal: () => void
  editForm: BookingForm
  assignmentType: 'staff' | 'team' | 'none'
  onAssignmentTypeChange: (type: 'staff' | 'team' | 'none') => void
  calculateEndTime: (startTime: string, duration: number) => string
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
      // Calculate end_time
      const selectedPackage = servicePackages.find(pkg => pkg.id === editForm.formData.service_package_id)
      const endTime = selectedPackage
        ? calculateEndTime(editForm.formData.start_time || '', selectedPackage.duration_minutes)
        : editForm.formData.end_time || ''

      // Store booking_id separately (not in editForm.formData)
      const bookingId = booking?.id || ''

      const updateData = {
        service_package_id: editForm.formData.service_package_id,
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
      toast({
        title: 'Error',
        description: getErrorMessage(error),
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
            <div className="space-y-2">
              <Label htmlFor="edit_service">Service Package *</Label>
              <Select
                value={editForm.formData.service_package_id || ''}
                onValueChange={(value) => {
                  const selectedPackage = servicePackages.find(p => p.id === value)
                  editForm.setValues({
                    service_package_id: value,
                    total_price: selectedPackage?.price || 0
                  })
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select service" />
                </SelectTrigger>
                <SelectContent>
                  {servicePackages.map((pkg) => (
                    <SelectItem key={pkg.id} value={pkg.id}>
                      {pkg.name} - {formatCurrency(pkg.price)} ({pkg.duration_minutes}min)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
                onChange={(e) =>
                  editForm.handleChange('start_time', e.target.value)
                }
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit_end_time">End Time (Auto-calculated)</Label>
              <Input
                id="edit_end_time"
                type="text"
                value={
                  editForm.formData.start_time && editForm.formData.service_package_id
                    ? calculateEndTime(
                        editForm.formData.start_time,
                        servicePackages.find(pkg => pkg.id === editForm.formData.service_package_id)?.duration_minutes || 0
                      )
                    : '--:--'
                }
                disabled
                className="bg-muted"
              />
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
              <Label htmlFor="edit_price">Total Price *</Label>
              <Input
                id="edit_price"
                type="number"
                step="0.01"
                value={editForm.formData.total_price || 0}
                onChange={(e) =>
                  editForm.handleChange('total_price', parseFloat(e.target.value))
                }
                required
              />
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
                    !editForm.formData.service_package_id
                  }
                >
                  <Sparkles className="h-4 w-4 mr-2 text-tinedy-blue" />
                  Check Staff Availability
                </Button>
                {(!editForm.formData.booking_date || !editForm.formData.start_time || !editForm.formData.service_package_id) && (
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
