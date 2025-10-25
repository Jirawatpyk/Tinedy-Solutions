import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useToast } from '@/hooks/use-toast'
import { Info, Sparkles } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { getErrorMessage } from '@/lib/error-utils'
import type { ServicePackage } from '@/types'
import type { CustomerRecord } from '@/types/customer'
import { sendBookingConfirmation, sendBookingReminder, type PaymentEmailData } from '@/lib/email'

interface StaffMember {
  id: string
  full_name: string
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

interface BookingCreateModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  servicePackages: ServicePackage[]
  staffMembers: StaffMember[]
  teams: Team[]
  onOpenAvailabilityModal: () => void
  createForm: BookingForm
  assignmentType: 'staff' | 'team' | 'none'
  setAssignmentType: (type: 'staff' | 'team' | 'none') => void
  calculateEndTime: (startTime: string, durationMinutes: number) => string
}

export function BookingCreateModal({
  isOpen,
  onClose,
  onSuccess,
  servicePackages,
  staffMembers,
  teams,
  onOpenAvailabilityModal,
  createForm,
  assignmentType,
  setAssignmentType,
  calculateEndTime,
}: BookingCreateModalProps) {
  const { toast } = useToast()
  const [existingCustomer, setExistingCustomer] = useState<CustomerRecord | null>(null)
  const [checkingCustomer, setCheckingCustomer] = useState(false)

  // Check existing customer by email
  const handleEmailBlur = async () => {
    if (!createForm.formData.email || createForm.formData.email.trim() === '') return

    setCheckingCustomer(true)

    try {
      const { data, error } = await supabase
        .from('customers')
        .select('*')
        .eq('email', createForm.formData.email.trim())
        .single()

      if (data && !error) {
        setExistingCustomer(data)
        toast({
          title: 'Customer Found!',
          description: `Found existing customer: ${data.full_name}`,
        })
      } else {
        setExistingCustomer(null)
      }
    } catch (err) {
      // Ignore errors, customer might not exist
    } finally {
      setCheckingCustomer(false)
    }
  }

  // Check existing customer by phone
  const handlePhoneBlur = async () => {
    if (!createForm.formData.phone || createForm.formData.phone.trim() === '' || existingCustomer) return

    setCheckingCustomer(true)

    try {
      const { data, error} = await supabase
        .from('customers')
        .select('*')
        .eq('phone', createForm.formData.phone.trim())
        .single()

      if (data && !error) {
        setExistingCustomer(data)
        toast({
          title: 'Customer Found (by Phone)!',
          description: `Found existing customer: ${data.full_name}`,
        })
      }
    } catch (err) {
      // Ignore errors
    } finally {
      setCheckingCustomer(false)
    }
  }

  // Use existing customer data
  const useExistingCustomer = () => {
    if (!existingCustomer) return

    createForm.setValues({
      customer_id: existingCustomer.id,
      full_name: existingCustomer.full_name,
      email: existingCustomer.email,
      phone: existingCustomer.phone,
      address: existingCustomer.address || '',
      city: existingCustomer.city || '',
      state: existingCustomer.state || '',
      zip_code: existingCustomer.zip_code || '',
    })

    toast({
      title: 'Customer data loaded',
      description: 'Existing customer information has been populated',
    })
  }

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    try {
      // Calculate end_time from start_time and service duration
      const selectedPackage = servicePackages.find(pkg => pkg.id === createForm.formData.service_package_id)
      const calculatedEndTime = selectedPackage
        ? calculateEndTime(createForm.formData.start_time || '', selectedPackage.duration_minutes)
        : createForm.formData.end_time || ''

      let customerId = createForm.formData.customer_id

      // If no existing customer, create new customer first
      if (!customerId) {
        const { data: newCustomer, error: customerError } = await supabase
          .from('customers')
          .insert({
            full_name: createForm.formData.full_name,
            email: createForm.formData.email,
            phone: createForm.formData.phone,
            address: createForm.formData.address || null,
            city: createForm.formData.city || null,
            state: createForm.formData.state || null,
            zip_code: createForm.formData.zip_code || null,
          })
          .select()
          .single()

        if (customerError) throw customerError
        customerId = newCustomer.id
      }

      // Create booking
      const { data: newBooking, error: bookingError } = await supabase
        .from('bookings')
        .insert({
          customer_id: customerId,
          service_package_id: createForm.formData.service_package_id,
          booking_date: createForm.formData.booking_date,
          start_time: createForm.formData.start_time,
          end_time: calculatedEndTime,
          total_price: createForm.formData.total_price,
          address: createForm.formData.address,
          city: createForm.formData.city,
          state: createForm.formData.state,
          zip_code: createForm.formData.zip_code,
          notes: createForm.formData.notes || null,
          status: 'pending',
          payment_status: 'unpaid',
          staff_id: assignmentType === 'staff' ? (createForm.formData.staff_id || null) : null,
          team_id: assignmentType === 'team' ? (createForm.formData.team_id || null) : null,
        })
        .select(`
          *,
          customers (name, email),
          services:service_packages (name),
          profiles (full_name)
        `)
        .single()

      if (bookingError) throw bookingError

      // Send booking confirmation email with payment link
      if (newBooking && createForm.formData.email) {
        const paymentLink = `${window.location.origin}/payment/${newBooking.id}`

        const emailData: PaymentEmailData = {
          bookingId: newBooking.id,
          customerName: createForm.formData.full_name || 'Customer',
          customerEmail: createForm.formData.email,
          serviceName: selectedPackage?.name || 'Service',
          bookingDate: newBooking.booking_date,
          startTime: newBooking.start_time,
          endTime: newBooking.end_time,
          totalPrice: Number(newBooking.total_price),
          location: newBooking.address || undefined,
          notes: newBooking.notes || undefined,
          staffName: newBooking.profiles?.full_name || undefined,
          paymentLink,
        }

        // Send emails (non-blocking)
        sendBookingConfirmation(emailData).catch(err => {
          console.error('Failed to send booking confirmation:', err)
        })

        // Also schedule booking reminder
        sendBookingReminder({
          bookingId: newBooking.id,
          customerName: emailData.customerName,
          customerEmail: emailData.customerEmail,
          serviceName: emailData.serviceName,
          bookingDate: emailData.bookingDate,
          startTime: emailData.startTime,
          endTime: emailData.endTime,
          totalPrice: emailData.totalPrice,
          location: emailData.location,
          notes: emailData.notes,
          staffName: emailData.staffName,
        }).catch(err => {
          console.error('Failed to schedule booking reminder:', err)
        })
      }

      toast({
        title: 'Success',
        description: 'Booking created successfully. Confirmation email sent!',
      })

      // Reset and close
      resetForm()
      onClose()
      onSuccess()
    } catch (error) {
      console.error('Error creating booking:', error)
      toast({
        title: 'Error',
        description: getErrorMessage(error),
        variant: 'destructive',
      })
    }
  }

  const resetForm = () => {
    createForm.reset()
    setAssignmentType('none')
    setExistingCustomer(null)
  }

  const handleClose = () => {
    resetForm()
    onClose()
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create New Booking</DialogTitle>
          <DialogDescription>
            Fill in the booking details below
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Customer Information */}
          <div className="space-y-4 border-b pb-4">
            <h3 className="font-medium">Customer Information</h3>

            {/* Customer Found Alert */}
            {existingCustomer && (
              <Alert className="bg-blue-50 border-blue-200">
                <Info className="h-4 w-4 text-blue-600" />
                <AlertDescription className="flex items-center justify-between">
                  <span className="text-sm">
                    <strong>Customer Found:</strong> {existingCustomer.full_name} ({existingCustomer.phone})
                  </span>
                  <Button
                    type="button"
                    size="sm"
                    onClick={useExistingCustomer}
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    Use Existing Data
                  </Button>
                </AlertDescription>
              </Alert>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="full_name">Full Name *</Label>
                <Input
                  id="full_name"
                  value={createForm.formData.full_name || ''}
                  onChange={(e) =>
                    createForm.handleChange('full_name', e.target.value)
                  }
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email *</Label>
                <Input
                  id="email"
                  type="email"
                  value={createForm.formData.email || ''}
                  onChange={(e) =>
                    createForm.handleChange('email', e.target.value)
                  }
                  onBlur={handleEmailBlur}
                  required
                  disabled={checkingCustomer}
                />
                {checkingCustomer && (
                  <p className="text-xs text-muted-foreground">Checking...</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">Phone *</Label>
                <Input
                  id="phone"
                  type="tel"
                  value={createForm.formData.phone || ''}
                  onChange={(e) =>
                    createForm.handleChange('phone', e.target.value)
                  }
                  onBlur={handlePhoneBlur}
                  required
                  disabled={checkingCustomer}
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="service_package_id">Service Package *</Label>
              <Select
                value={createForm.formData.service_package_id || ''}
                onValueChange={(value) => {
                  const selectedPackage = servicePackages.find(p => p.id === value)
                  createForm.setValues({
                    service_package_id: value,
                    total_price: selectedPackage?.price || 0
                  })
                }}
                required
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select service" />
                </SelectTrigger>
                <SelectContent>
                  {servicePackages.map((pkg) => (
                    <SelectItem key={pkg.id} value={pkg.id}>
                      {pkg.name} - {formatCurrency(pkg.price)} ({pkg.duration_minutes} min)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="booking_date">Booking Date *</Label>
              <Input
                id="booking_date"
                type="date"
                value={createForm.formData.booking_date || ''}
                onChange={(e) =>
                  createForm.handleChange('booking_date', e.target.value)
                }
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="start_time">Start Time *</Label>
              <Input
                id="start_time"
                type="time"
                value={createForm.formData.start_time || ''}
                onChange={(e) =>
                  createForm.handleChange('start_time', e.target.value)
                }
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="end_time_display">End Time (Auto-calculated)</Label>
              <Input
                id="end_time_display"
                type="text"
                value={
                  createForm.formData.start_time && createForm.formData.service_package_id
                    ? calculateEndTime(
                        createForm.formData.start_time,
                        servicePackages.find(pkg => pkg.id === createForm.formData.service_package_id)?.duration_minutes || 0
                      )
                    : '--:--'
                }
                disabled
                className="bg-muted"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="total_price">Total Price *</Label>
              <Input
                id="total_price"
                type="number"
                step="0.01"
                value={createForm.formData.total_price || 0}
                onChange={(e) =>
                  createForm.handleChange('total_price', parseFloat(e.target.value))
                }
                required
              />
            </div>

            {/* Assignment Type Selector */}
            <div className="space-y-2 sm:col-span-2">
              <Label>Assign to</Label>
              <Select
                value={assignmentType}
                onValueChange={(value: 'staff' | 'team' | 'none') => {
                  setAssignmentType(value)
                  createForm.setValues({ staff_id: '', team_id: '' })
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
                <Select
                  value={createForm.formData.staff_id || ''}
                  onValueChange={(value) =>
                    createForm.handleChange('staff_id', value)
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
                <Label htmlFor="team_id">Select Team *</Label>
                <Select
                  value={createForm.formData.team_id || ''}
                  onValueChange={(value) =>
                    createForm.handleChange('team_id', value)
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
                    !createForm.formData.booking_date ||
                    !createForm.formData.start_time ||
                    !createForm.formData.service_package_id
                  }
                >
                  <Sparkles className="h-4 w-4 mr-2 text-tinedy-blue" />
                  Check Staff Availability
                </Button>
                {(!createForm.formData.booking_date || !createForm.formData.start_time || !createForm.formData.service_package_id) && (
                  <p className="text-xs text-muted-foreground text-center">
                    Please select date, time, and service package first
                  </p>
                )}
              </div>
            )}

            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="address">Address *</Label>
              <Input
                id="address"
                value={createForm.formData.address || ''}
                onChange={(e) =>
                  createForm.handleChange('address', e.target.value)
                }
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="city">City *</Label>
              <Input
                id="city"
                value={createForm.formData.city || ''}
                onChange={(e) =>
                  createForm.handleChange('city', e.target.value)
                }
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="state">State *</Label>
              <Input
                id="state"
                value={createForm.formData.state || ''}
                onChange={(e) =>
                  createForm.handleChange('state', e.target.value)
                }
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="zip_code">Zip Code *</Label>
              <Input
                id="zip_code"
                value={createForm.formData.zip_code || ''}
                onChange={(e) =>
                  createForm.handleChange('zip_code', e.target.value)
                }
                required
              />
            </div>

            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                value={createForm.formData.notes || ''}
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                  createForm.handleChange('notes', e.target.value)
                }
                rows={3}
              />
            </div>
          </div>

          <div className="flex justify-end gap-2">
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
