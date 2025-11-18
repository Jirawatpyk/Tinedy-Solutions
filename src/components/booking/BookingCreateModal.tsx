import { useState, useEffect, startTransition } from 'react'
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
import { Alert, AlertDescription } from '@/components/ui/alert'
import { mapErrorToUserMessage, getValidationErrorMessage, getRecurringBookingError } from '@/lib/error-messages'
import type { BookingForm } from '@/hooks/useBookingForm'
import type { CustomerRecord } from '@/types/customer'
import { sendBookingConfirmation, sendBookingReminder, sendRecurringBookingConfirmation, type PaymentEmailData, type RecurringBookingEmailData } from '@/lib/email'
import { PackageSelector, type PackageSelectionData } from '@/components/service-packages'
import type { UnifiedServicePackage } from '@/hooks/useServicePackages'
import type { ServicePackageV2WithTiers } from '@/types'
import { RecurringScheduleSelector } from './RecurringScheduleSelector'
import { RecurringPattern as Pattern } from '@/types/recurring-booking'
import type { RecurringPattern } from '@/types/recurring-booking'
import type { BookingFrequency } from '@/types/service-package-v2'
import { createRecurringGroup } from '@/lib/recurring-booking-service'
import { Checkbox } from '@/components/ui/checkbox'
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

interface BookingWithRelations {
  id: string
  booking_date: string
  start_time: string
  end_time: string
  total_price: number
  address?: string
  city?: string
  state?: string
  zip_code?: string
  notes?: string
  customers?: {
    full_name: string
    email: string
  }
  service_packages?: {
    name: string
  }
  service_packages_v2?: {
    name: string
  }
  profiles?: {
    full_name: string
  }
}

// BookingForm and BookingFormState interfaces imported from @/hooks/useBookingForm

interface BookingCreateModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  servicePackages: UnifiedServicePackage[]
  staffMembers: StaffMember[]
  teams: Team[]
  onOpenAvailabilityModal: () => void
  createForm: BookingForm
  assignmentType: 'staff' | 'team' | 'none'
  setAssignmentType: (type: 'staff' | 'team' | 'none') => void
  calculateEndTime: (startTime: string, durationMinutes: number) => string
  packageSelection: PackageSelectionData | null
  setPackageSelection: (selection: PackageSelectionData | null) => void
  // Recurring bookings props (lifted to parent for StaffAvailabilityModal)
  recurringDates?: string[]
  setRecurringDates?: (dates: string[]) => void
  enableRecurring?: boolean
  setEnableRecurring?: (enabled: boolean) => void
  recurringPattern?: RecurringPattern
  setRecurringPattern?: (pattern: RecurringPattern) => void
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
  packageSelection,
  setPackageSelection,
  recurringDates: parentRecurringDates,
  setRecurringDates: parentSetRecurringDates,
  enableRecurring: parentEnableRecurring,
  setEnableRecurring: parentSetEnableRecurring,
  recurringPattern: parentRecurringPattern,
  setRecurringPattern: parentSetRecurringPattern,
}: BookingCreateModalProps) {
  const { toast } = useToast()
  const [existingCustomer, setExistingCustomer] = useState<CustomerRecord | null>(null)
  const [checkingCustomer, setCheckingCustomer] = useState(false)

  // Recurring Bookings State - use parent state if provided, otherwise use local state
  const [localEnableRecurring, localSetEnableRecurring] = useState(false)
  const [localRecurringDates, localSetRecurringDates] = useState<string[]>([])
  const [localRecurringPattern, localSetRecurringPattern] = useState<RecurringPattern>(Pattern.AutoMonthly)

  const enableRecurring = parentEnableRecurring !== undefined ? parentEnableRecurring : localEnableRecurring
  const setEnableRecurring = parentSetEnableRecurring || localSetEnableRecurring
  const recurringDates = parentRecurringDates !== undefined ? parentRecurringDates : localRecurringDates
  const recurringPattern = parentRecurringPattern !== undefined ? parentRecurringPattern : localRecurringPattern
  const setRecurringPattern = parentSetRecurringPattern || localSetRecurringPattern
  const setRecurringDates = parentSetRecurringDates || localSetRecurringDates

  // Track modal open/close and packageSelection prop
  useEffect(() => {
    if (isOpen) {
      logger.debug('BookingCreateModal opened', { packageSelection }, { context: 'BookingCreateModal' })
    } else {
      logger.debug('BookingCreateModal closed', { packageSelection }, { context: 'BookingCreateModal' })
    }
  }, [isOpen, packageSelection])

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
      let calculatedEndTime = createForm.formData.end_time || ''

      if (selectedPackage && selectedPackage.duration_minutes) {
        calculatedEndTime = calculateEndTime(createForm.formData.start_time || '', selectedPackage.duration_minutes)
      } else if (packageSelection?.estimatedHours && createForm.formData.start_time) {
        calculatedEndTime = calculateEndTime(createForm.formData.start_time || '', packageSelection.estimatedHours * 60)
      }

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

      // Validation: ต้องมี service_package_id หรือ package_v2_id
      const servicePackageId = createForm.formData.service_package_id || createForm.formData.package_v2_id
      if (!servicePackageId) {
        const validationError = getValidationErrorMessage()
        toast({
          title: validationError.title,
          description: 'Please select a service package before creating a booking.',
          variant: 'destructive',
        })
        return
      }

      // Build base booking data
      const baseBookingData = {
        customer_id: customerId!,
        service_package_id: createForm.formData.service_package_id || null,
        start_time: createForm.formData.start_time || '',
        end_time: calculatedEndTime || null,
        total_price: createForm.formData.total_price || 0,
        address: createForm.formData.address || '',
        city: createForm.formData.city || '',
        state: createForm.formData.state || null,
        zip_code: createForm.formData.zip_code || null,
        notes: createForm.formData.notes || null,
        status: 'pending' as const,
        payment_status: 'unpaid' as const,
        staff_id: assignmentType === 'staff' ? (createForm.formData.staff_id || null) : null,
        team_id: assignmentType === 'team' ? (createForm.formData.team_id || null) : null,
        area_sqm: createForm.formData.area_sqm || null,
        frequency: createForm.formData.frequency || null,
        calculated_price: createForm.formData.calculated_price || null,
        package_v2_id: createForm.formData.package_v2_id || null,
      }

      // Validation สำหรับ recurring bookings
      if (enableRecurring && recurringDates.length > 0 && packageSelection?.frequency) {
        // ตรวจสอบว่าเลือกวันครบตามความถี่หรือยัง
        if (recurringDates.length !== packageSelection.frequency) {
          const validationError = getValidationErrorMessage()
          toast({
            title: validationError.title,
            description: `Please select ${packageSelection.frequency} dates for recurring bookings. You have selected ${recurringDates.length} date(s) so far.`,
            variant: 'destructive',
          })
          return
        }

        // ตรวจสอบว่าทุก field ที่จำเป็นมีค่า
        if (!customerId) throw new Error('Customer ID is required')
        if (!baseBookingData.start_time) throw new Error('Start time is required')
        if (!baseBookingData.address) throw new Error('Address is required')
        if (!baseBookingData.city) throw new Error('City is required')

        // ✅ คำนวณราคาต่อ booking (หารด้วย frequency)
        const pricePerBooking = baseBookingData.total_price / packageSelection.frequency

        // Log base booking data for recurring group
        logger.debug('Creating recurring booking group', {
          customer_id: baseBookingData.customer_id,
          service_package_id: baseBookingData.service_package_id,
          package_v2_id: baseBookingData.package_v2_id,
          staff_id: baseBookingData.staff_id,
          team_id: baseBookingData.team_id,
          start_time: baseBookingData.start_time,
          total_price_original: baseBookingData.total_price,
          total_price_per_booking: pricePerBooking,
          frequency: packageSelection.frequency
        }, { context: 'BookingCreateModal' })

        // Create recurring group with adjusted price
        const result = await createRecurringGroup({
          baseBooking: {
            ...baseBookingData,
            total_price: pricePerBooking  // ✅ ใช้ราคาต่อ booking
          },
          dates: recurringDates,
          pattern: recurringPattern,
          totalOccurrences: packageSelection.frequency as BookingFrequency,
        })

        if (!result.success) {
          const errorMsg = getRecurringBookingError('create')
          toast({
            title: errorMsg.title,
            description: errorMsg.description,
            variant: 'destructive',
          })
          return
        }

        // ✅ ส่ง email confirmation สำหรับ recurring bookings
        if (createForm.formData.email) {
          const fullAddress = [
            baseBookingData.address,
            baseBookingData.city,
            baseBookingData.state,
            baseBookingData.zip_code
          ].filter(part => part && part.trim()).join(', ')

          // Get service name
          const selectedPackage = servicePackages.find(pkg =>
            pkg.id === baseBookingData.service_package_id ||
            pkg.id === baseBookingData.package_v2_id
          )

          // Prepare booking dates with sequence
          const bookingDatesWithSequence = recurringDates.map((date, index) => ({
            date,
            sequence: index + 1
          }))

          const recurringEmailData: RecurringBookingEmailData = {
            groupId: result.groupId,
            bookingIds: result.bookingIds,
            customerName: createForm.formData.full_name || 'Customer',
            customerEmail: createForm.formData.email,
            serviceName: selectedPackage?.name || 'Service',
            bookingDates: bookingDatesWithSequence,
            startTime: baseBookingData.start_time,
            endTime: calculatedEndTime || baseBookingData.end_time || '',
            totalPrice: baseBookingData.total_price, // ราคาเดิมก่อนหาร
            pricePerBooking: pricePerBooking,
            location: fullAddress,
            paymentLink: `${window.location.origin}/payment/${result.bookingIds[0]}`, // parent booking
            staffName: assignmentType === 'staff' ? staffMembers.find(s => s.id === baseBookingData.staff_id)?.full_name : undefined,
            notes: baseBookingData.notes || undefined,
            frequency: packageSelection.frequency
          }

          // ส่ง email (don't await to avoid blocking)
          sendRecurringBookingConfirmation(recurringEmailData).catch(err => {
            logger.error('Failed to send recurring booking confirmation', { error: err }, { context: 'BookingCreateModal' })
          })
        }

        toast({
          title: 'Success',
          description: `Created ${result.bookingIds.length} recurring bookings successfully! Confirmation email sent.`,
        })
      } else {
        // Create single booking (original flow)
        const { data: newBooking, error: bookingError } = await supabase
          .from('bookings')
          .insert({
            ...baseBookingData,
            booking_date: createForm.formData.booking_date,
          })
          .select(`
            *,
            customers (full_name, email),
            service_packages (name),
            service_packages_v2 (name),
            profiles!bookings_staff_id_fkey (full_name)
          `)
          .single()

        if (bookingError) throw bookingError

        // Send booking confirmation email
        if (newBooking && createForm.formData.email) {
          const paymentLink = `${window.location.origin}/payment/${newBooking.id}`
          const fullAddress = [
            newBooking.address,
            newBooking.city,
            newBooking.state,
            newBooking.zip_code
          ].filter(part => part && part.trim()).join(', ')

          const bookingWithRelations = newBooking as BookingWithRelations
          const emailData: PaymentEmailData = {
            bookingId: bookingWithRelations.id,
            customerName: createForm.formData.full_name || 'Customer',
            customerEmail: createForm.formData.email,
            serviceName: bookingWithRelations.service_packages?.name || bookingWithRelations.service_packages_v2?.name || 'Service',
            bookingDate: bookingWithRelations.booking_date,
            startTime: bookingWithRelations.start_time,
            endTime: bookingWithRelations.end_time,
            totalPrice: Number(bookingWithRelations.total_price),
            location: fullAddress || undefined,
            notes: bookingWithRelations.notes || undefined,
            staffName: bookingWithRelations.profiles?.full_name || undefined,
            paymentLink,
          }

          sendBookingConfirmation(emailData).catch(err => {
            logger.error('Failed to send booking confirmation', { error: err }, { context: 'BookingCreateModal' })
          })

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
            logger.error('Failed to schedule booking reminder', { error: err }, { context: 'BookingCreateModal' })
          })
        }

        toast({
          title: 'Success',
          description: 'Booking created successfully. Confirmation email sent!',
        })
      }

      // Reset and close
      resetForm()
      onClose()
      onSuccess()
    } catch (error) {
      logger.error('Error creating booking', { error }, { context: 'BookingCreateModal' })
      const errorMsg = mapErrorToUserMessage(error, 'booking')
      toast({
        title: errorMsg.title,
        description: errorMsg.description,
        variant: 'destructive',
      })
    }
  }

  const resetForm = () => {
    createForm.reset()
    setAssignmentType('none')
    setExistingCustomer(null)
    setPackageSelection(null)
    setEnableRecurring(false)
    setRecurringDates([])
    setRecurringPattern(Pattern.AutoMonthly)
  }

  const handleClose = () => {
    resetForm()
    onClose()
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle>Create New Booking</DialogTitle>
          <DialogDescription>
            Fill in the booking details below
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
          <div className="space-y-4 overflow-y-auto flex-1 pl-1 pr-3">
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

            {/* Package Selector V2 - รองรับทั้ง Fixed และ Tiered Pricing */}
            <div className="space-y-2 sm:col-span-2">
              <PackageSelector
                serviceType="cleaning"
                packages={servicePackages as unknown as ServicePackageV2WithTiers[]} // ส่ง unified packages
                value={packageSelection}
                onChange={(selection) => {
                  logger.debug('Package selection changed', { selection }, { context: 'BookingCreateModal' })

                  // ใช้ startTransition เพื่อ batch updates แบบ non-blocking
                  startTransition(() => {
                    // Update parent state
                    logger.debug('Updating package selection state', { selection }, { context: 'BookingCreateModal' })
                    setPackageSelection(selection)

                    if (selection) {
                      // Update form data with package selection
                      const formUpdates: Record<string, unknown> = {}

                      // ตรวจสอบว่า package เป็น V1 หรือ V2 จาก _source field
                      const selectedPkg = servicePackages.find(pkg => pkg.id === selection.packageId)
                      const isV1Package = selectedPkg?._source === 'v1'

                      if (selection.pricingModel === 'fixed') {
                        logger.debug('Setting fixed price', {
                          price: selection.price,
                          version: selectedPkg?._source
                        }, { context: 'BookingCreateModal' })

                        // FIX: ตั้งค่าตาม version ของ package (ต้องมีเพียงหนึ่งตัว)
                        if (isV1Package) {
                          formUpdates.service_package_id = selection.packageId
                          formUpdates.package_v2_id = null
                        } else {
                          formUpdates.service_package_id = null
                          formUpdates.package_v2_id = selection.packageId
                        }

                        formUpdates.total_price = selection.price
                        formUpdates.area_sqm = null
                        formUpdates.frequency = null
                        formUpdates.calculated_price = null
                      } else {
                        // Tiered pricing - ต้องเป็น V2 แน่นอน
                        logger.debug('Setting tiered price', {
                          price: selection.price,
                          areaSqm: selection.areaSqm,
                          frequency: selection.frequency
                        }, { context: 'BookingCreateModal' })
                        formUpdates.service_package_id = null
                        formUpdates.package_v2_id = selection.packageId
                        formUpdates.area_sqm = selection.areaSqm
                        formUpdates.frequency = selection.frequency
                        formUpdates.calculated_price = selection.price
                        formUpdates.total_price = selection.price
                      }

                      // Auto-calculate End Time if Start Time is set
                      if (createForm.formData.start_time && selection.estimatedHours) {
                        const durationMinutes = Math.round(selection.estimatedHours * 60)
                        const endTime = calculateEndTime(createForm.formData.start_time, durationMinutes)
                        logger.debug('Auto-calculated end time', {
                          endTime,
                          estimatedHours: selection.estimatedHours,
                          startTime: createForm.formData.start_time
                        }, { context: 'BookingCreateModal' })
                        formUpdates.end_time = endTime
                      }

                      // Update form ครั้งเดียวด้วย batch updates
                      createForm.setValues(formUpdates)
                    } else {
                      // Clear selection
                      logger.debug('Clearing package selection', undefined, { context: 'BookingCreateModal' })
                      createForm.setValues({
                        service_package_id: '',
                        package_v2_id: undefined,
                        area_sqm: null,
                        frequency: null,
                        calculated_price: null,
                        total_price: 0,
                      })
                    }
                  })
                }}
              />
            </div>

            {/* Recurring Bookings Checkbox - แสดงเฉพาะเมื่อ frequency > 1 */}
            {packageSelection?.frequency && packageSelection.frequency > 1 && (
              <div className="space-y-2 sm:col-span-2">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="enable_recurring"
                    checked={enableRecurring}
                    onCheckedChange={(checked) => setEnableRecurring(checked as boolean)}
                  />
                  <Label
                    htmlFor="enable_recurring"
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                  >
                    Create Recurring Bookings ({packageSelection.frequency} times)
                  </Label>
                </div>
              </div>
            )}

            {/* Recurring Schedule Selector */}
            {enableRecurring && packageSelection?.frequency && (
              <div className="space-y-2 sm:col-span-2">
                <RecurringScheduleSelector
                  frequency={packageSelection.frequency as BookingFrequency}
                  selectedDates={recurringDates}
                  onDatesChange={setRecurringDates}
                  pattern={recurringPattern}
                  onPatternChange={setRecurringPattern}
                />
              </div>
            )}

            {/* Date/Time Fields - 3 columns when not recurring, 2 columns when recurring */}
            <div className={`sm:col-span-2 grid gap-3 ${!enableRecurring ? 'grid-cols-3' : 'grid-cols-2'}`}>
              {/* Booking Date - แสดงเฉพาะเมื่อไม่ recurring */}
              {!enableRecurring && (
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
              )}

              {/* Start Time */}
              <div className="space-y-2">
                <Label htmlFor="start_time">Start Time *</Label>
                <Input
                  id="start_time"
                  type="time"
                  value={createForm.formData.start_time || ''}
                  onChange={(e) => {
                    const newStartTime = e.target.value
                    createForm.handleChange('start_time', newStartTime)

                    // Auto-calculate End Time when Start Time changes
                    if (newStartTime && packageSelection?.estimatedHours) {
                      const durationMinutes = Math.round(packageSelection.estimatedHours * 60)
                      const endTime = calculateEndTime(newStartTime, durationMinutes)
                      logger.debug('Auto-recalculated end time on start time change', {
                        newStartTime,
                        endTime,
                        estimatedHours: packageSelection.estimatedHours
                      }, { context: 'BookingCreateModal' })
                      createForm.handleChange('end_time', endTime)
                    }
                  }}
                  required
                />
              </div>

              {/* End Time */}
              <div className="space-y-2">
                <Label htmlFor="end_time">End Time *</Label>
                <Input
                  id="end_time"
                  type="time"
                  value={createForm.formData.end_time || ''}
                  onChange={(e) =>
                    createForm.handleChange('end_time', e.target.value)
                  }
                  disabled={!!packageSelection?.estimatedHours}
                />
              </div>
            </div>

            {/* Price Display - For fixed pricing only */}
            {packageSelection?.pricingModel === 'fixed' && (
              <div className="space-y-2">
                <Label htmlFor="total_price">Total Price (Auto-calculated) *</Label>
                <Input
                  id="total_price"
                  type="number"
                  step="0.01"
                  value={createForm.formData.total_price || 0}
                  onChange={(e) =>
                    createForm.handleChange('total_price', parseFloat(e.target.value))
                  }
                  required
                  disabled
                  className="bg-muted"
                />
                <p className="text-xs text-muted-foreground">
                  Price is calculated from package selection
                </p>
              </div>
            )}

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
                  onClick={() => {
                    logger.debug('Check availability button clicked', {
                      assignmentType,
                      hasRecurringDates: enableRecurring ? recurringDates.length : null,
                      hasBookingDate: !enableRecurring ? !!createForm.formData.booking_date : null,
                      hasStartTime: !!createForm.formData.start_time,
                      hasPackageSelection: !!packageSelection
                    }, { context: 'BookingCreateModal' })
                    onOpenAvailabilityModal()
                  }}
                  disabled={
                    // ถ้าเป็น recurring ต้องเช็ค recurringDates, ถ้าไม่ใช่ต้องเช็ค booking_date
                    (enableRecurring ? recurringDates.length === 0 : !createForm.formData.booking_date) ||
                    !createForm.formData.start_time ||
                    !packageSelection
                  }
                >
                  <Sparkles className="h-4 w-4 mr-2 text-tinedy-blue" />
                  Check Staff Availability
                </Button>
                {((enableRecurring ? recurringDates.length === 0 : !createForm.formData.booking_date) || !createForm.formData.start_time || !packageSelection) && (
                  <p className="text-xs text-muted-foreground text-center">
                    {enableRecurring
                      ? 'Please select dates, time, and service package first'
                      : 'Please select date, time, and service package first'
                    }
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

            <div className="sm:col-span-2 grid grid-cols-3 gap-3">
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
