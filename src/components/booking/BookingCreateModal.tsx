import { useState, useEffect, startTransition, useCallback } from 'react'
import { useForm, Controller, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
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
import { logger } from '@/lib/logger'
import {
  bookingCreateSchema,
  type BookingCreateFormData,
} from '@/schemas'

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
  onBeforeOpenAvailability?: (formData: BookingCreateFormData) => void
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
  const { toast } = useToast()
  const [existingCustomer, setExistingCustomer] = useState<CustomerRecord | null>(null)
  const [checkingCustomer, setCheckingCustomer] = useState(false)

  // Recurring Bookings State - use parent state if provided, otherwise use local state
  const [localRecurringDates, localSetRecurringDates] = useState<string[]>([])
  const [localRecurringPattern, localSetRecurringPattern] = useState<RecurringPattern>(Pattern.AutoMonthly)

  const recurringDates = parentRecurringDates !== undefined ? parentRecurringDates : localRecurringDates
  const recurringPattern = parentRecurringPattern !== undefined ? parentRecurringPattern : localRecurringPattern

  // Stable callbacks for recurring state setters
  const setRecurringPattern = useCallback(
    (pattern: RecurringPattern | ((prev: RecurringPattern) => RecurringPattern)) => {
      if (parentSetRecurringPattern) {
        parentSetRecurringPattern(pattern)
      } else {
        localSetRecurringPattern(pattern)
      }
    },
    [parentSetRecurringPattern]
  )

  const setRecurringDates = useCallback(
    (dates: string[] | ((prev: string[]) => string[])) => {
      if (parentSetRecurringDates) {
        parentSetRecurringDates(dates)
      } else {
        localSetRecurringDates(dates)
      }
    },
    [parentSetRecurringDates]
  )

  // React Hook Form with Zod validation
  const form = useForm<BookingCreateFormData>({
    resolver: zodResolver(bookingCreateSchema),
    mode: 'onBlur',
    defaultValues: {
      customer_id: '',
      full_name: '',
      email: '',
      phone: '',
      booking_date: '',
      start_time: '',
      end_time: '',
      service_package_id: '',
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
    },
  })

  // Watch form values for reactive updates (Check Availability button)
  const watchedBookingDate = useWatch({ control: form.control, name: 'booking_date' })
  const watchedStartTime = useWatch({ control: form.control, name: 'start_time' })

  // Track modal open/close and packageSelection prop
  useEffect(() => {
    if (isOpen) {
      logger.debug('BookingCreateModal opened', { packageSelection }, { context: 'BookingCreateModal' })
    } else {
      logger.debug('BookingCreateModal closed', { packageSelection }, { context: 'BookingCreateModal' })
    }
  }, [isOpen, packageSelection])

  // Set default values when modal opens (from Calendar click, Quick Availability Check, or Customer Details)
  useEffect(() => {
    if (isOpen) {
      // Date and time defaults
      if (defaultDate) {
        form.setValue('booking_date', defaultDate)
        logger.debug('Set default booking_date', { defaultDate }, { context: 'BookingCreateModal' })
      }
      if (defaultStartTime) {
        form.setValue('start_time', defaultStartTime)
        logger.debug('Set default start_time', { defaultStartTime }, { context: 'BookingCreateModal' })
      }
      if (defaultEndTime) {
        form.setValue('end_time', defaultEndTime)
        logger.debug('Set default end_time', { defaultEndTime }, { context: 'BookingCreateModal' })
      }
      // Staff/Team defaults
      if (defaultStaffId) {
        form.setValue('staff_id', defaultStaffId)
        logger.debug('Set default staff_id', { defaultStaffId }, { context: 'BookingCreateModal' })
      }
      if (defaultTeamId) {
        form.setValue('team_id', defaultTeamId)
        logger.debug('Set default team_id', { defaultTeamId }, { context: 'BookingCreateModal' })
      }
      // Customer data defaults (from Customer Details page)
      if (defaultCustomerId) {
        form.setValue('customer_id', defaultCustomerId)
        logger.debug('Set default customer_id', { defaultCustomerId }, { context: 'BookingCreateModal' })
      }
      if (defaultFullName) {
        form.setValue('full_name', defaultFullName)
        logger.debug('Set default full_name', { defaultFullName }, { context: 'BookingCreateModal' })
      }
      if (defaultEmail) {
        form.setValue('email', defaultEmail)
        logger.debug('Set default email', { defaultEmail }, { context: 'BookingCreateModal' })
      }
      if (defaultPhone) {
        form.setValue('phone', defaultPhone)
        logger.debug('Set default phone', { defaultPhone }, { context: 'BookingCreateModal' })
      }
      if (defaultAddress) {
        form.setValue('address', defaultAddress)
        logger.debug('Set default address', { defaultAddress }, { context: 'BookingCreateModal' })
      }
      if (defaultCity) {
        form.setValue('city', defaultCity)
        logger.debug('Set default city', { defaultCity }, { context: 'BookingCreateModal' })
      }
      if (defaultState) {
        form.setValue('state', defaultState)
        logger.debug('Set default state', { defaultState }, { context: 'BookingCreateModal' })
      }
      if (defaultZipCode) {
        form.setValue('zip_code', defaultZipCode)
        logger.debug('Set default zip_code', { defaultZipCode }, { context: 'BookingCreateModal' })
      }
    }
  }, [
    isOpen,
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
    form,
  ])

  // Auto-sync booking_date with recurringDates[0] for recurring bookings
  useEffect(() => {
    const isRecurring = packageSelection?.frequency && packageSelection.frequency > 1
    if (isRecurring && recurringDates.length > 0) {
      // Set booking_date to first recurring date to pass validation
      form.setValue('booking_date', recurringDates[0])
    }
    // Note: We don't clear booking_date here to avoid interfering with defaultDate prop
  }, [recurringDates, packageSelection?.frequency, form])

  // Check existing customer by email
  const handleEmailBlur = async () => {
    const email = form.getValues('email')
    if (!email || email.trim() === '') return

    setCheckingCustomer(true)

    try {
      const { data, error } = await supabase
        .from('customers')
        .select('*')
        .eq('email', email.trim())
        .is('deleted_at', null) // Exclude archived customers
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
    const phone = form.getValues('phone')
    if (!phone || phone.trim() === '' || existingCustomer) return

    setCheckingCustomer(true)

    try {
      const { data, error} = await supabase
        .from('customers')
        .select('*')
        .eq('phone', phone.trim())
        .is('deleted_at', null) // Exclude archived customers
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

    form.setValue('customer_id', existingCustomer.id)
    form.setValue('full_name', existingCustomer.full_name)
    form.setValue('email', existingCustomer.email)
    form.setValue('phone', existingCustomer.phone)
    form.setValue('address', existingCustomer.address || '')
    form.setValue('city', existingCustomer.city || '')
    form.setValue('state', existingCustomer.state || '')
    form.setValue('zip_code', existingCustomer.zip_code || '')

    toast({
      title: 'Customer data loaded',
      description: 'Existing customer information has been populated',
    })
  }

  // Handle form submission
  const onSubmit = form.handleSubmit(async (data: BookingCreateFormData) => {
    try {
      const isRecurring = packageSelection?.frequency && packageSelection.frequency > 1

      // Validation: For tiered pricing packages, area_sqm and frequency are required
      if (packageSelection?.pricingModel === 'tiered') {
        if (!data.area_sqm || !data.frequency) {
          toast({
            title: 'Incomplete Information',
            description: 'Please specify area and frequency for tiered pricing packages',
            variant: 'destructive',
          })
          return
        }
      }

      // For recurring bookings, set booking_date from recurringDates[0] to pass validation
      if (isRecurring && recurringDates.length > 0 && !data.booking_date) {
        data.booking_date = recurringDates[0]
      }

      logger.debug('Form submitted with validated data', { data, isRecurring, recurringDates }, { context: 'BookingCreateModal' })

      // Calculate end_time from start_time and service duration
      const selectedPackage = servicePackages.find(pkg => pkg.id === data.service_package_id || pkg.id === data.package_v2_id)
      let calculatedEndTime = data.end_time || ''

      if (selectedPackage && selectedPackage.duration_minutes) {
        calculatedEndTime = calculateEndTime(data.start_time || '', selectedPackage.duration_minutes)
      } else if (packageSelection?.estimatedHours && data.start_time) {
        calculatedEndTime = calculateEndTime(data.start_time, packageSelection.estimatedHours * 60)
      }

      let customerId = data.customer_id

      // If no existing customer, create new customer first
      if (!customerId) {
        const { data: newCustomer, error: customerError } = await supabase
          .from('customers')
          .insert({
            full_name: data.full_name!,
            email: data.email!,
            phone: data.phone!,
            address: data.address || null,
            city: data.city || null,
            state: data.state || null,
            zip_code: data.zip_code || null,
          })
          .select()
          .single()

        if (customerError) throw customerError
        customerId = newCustomer.id
      }

      // Validation: ต้องมี service_package_id หรือ package_v2_id
      const servicePackageId = data.service_package_id || data.package_v2_id
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
        service_package_id: data.service_package_id || null,
        start_time: data.start_time || '',
        end_time: calculatedEndTime || null,
        total_price: data.total_price || 0,
        address: data.address || '',
        city: data.city || '',
        state: data.state || null,
        zip_code: data.zip_code || null,
        notes: data.notes || null,
        status: 'pending' as const,
        payment_status: 'unpaid' as const,
        staff_id: assignmentType === 'staff' ? (data.staff_id || null) : null,
        team_id: assignmentType === 'team' ? (data.team_id || null) : null,
        area_sqm: data.area_sqm || null,
        frequency: data.frequency || null,
        package_v2_id: data.package_v2_id || null,
      }

      // Validation สำหรับ recurring bookings (frequency > 1)
      if (packageSelection?.frequency && packageSelection.frequency > 1) {
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
        if (data.email) {
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
            customerName: data.full_name || 'Customer',
            customerEmail: data.email,
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
            booking_date: data.booking_date,
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
        if (newBooking && data.email) {
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
            customerName: data.full_name || 'Customer',
            customerEmail: data.email,
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
  })

  const resetForm = () => {
    // Clear recurring state first to prevent useEffect from re-setting booking_date
    setRecurringDates([])
    setRecurringPattern(Pattern.AutoMonthly)
    setPackageSelection(null)

    // Then reset form and other states
    form.reset()
    setAssignmentType('none')
    setExistingCustomer(null)
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
        <form onSubmit={onSubmit} className="flex flex-col flex-1 overflow-hidden">
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
                  {...form.register('full_name')}
                  required
                  aria-invalid={!!form.formState.errors.full_name}
                />
                {form.formState.errors.full_name && (
                  <p className="text-sm text-destructive">
                    {form.formState.errors.full_name.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email *</Label>
                <Input
                  id="email"
                  type="email"
                  {...form.register('email')}
                  onBlur={handleEmailBlur}
                  required
                  disabled={checkingCustomer}
                  aria-invalid={!!form.formState.errors.email}
                />
                {checkingCustomer && (
                  <p className="text-xs text-muted-foreground">Checking...</p>
                )}
                {form.formState.errors.email && (
                  <p className="text-sm text-destructive">
                    {form.formState.errors.email.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">Phone *</Label>
                <Input
                  id="phone"
                  type="tel"
                  {...form.register('phone')}
                  onBlur={handlePhoneBlur}
                  required
                  disabled={checkingCustomer}
                  aria-invalid={!!form.formState.errors.phone}
                />
                {form.formState.errors.phone && (
                  <p className="text-sm text-destructive">
                    {form.formState.errors.phone.message}
                  </p>
                )}
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
                          form.setValue('service_package_id', selection.packageId)
                          form.setValue('package_v2_id', '')
                        } else {
                          form.setValue('service_package_id', '')
                          form.setValue('package_v2_id', selection.packageId)
                        }

                        form.setValue('total_price', selection.price)
                        form.setValue('area_sqm', undefined)
                        form.setValue('frequency', undefined)
                      } else {
                        // Tiered pricing - ต้องเป็น V2 แน่นอน
                        logger.debug('Setting tiered price', {
                          price: selection.price,
                          areaSqm: selection.areaSqm,
                          frequency: selection.frequency
                        }, { context: 'BookingCreateModal' })
                        form.setValue('service_package_id', '')
                        form.setValue('package_v2_id', selection.packageId)
                        form.setValue('area_sqm', selection.areaSqm)
                        form.setValue('frequency', selection.frequency as 1 | 2 | 4 | 8)
                        form.setValue('total_price', selection.price)

                        // Clear recurring state if frequency is 1 (one-time booking)
                        if (selection.frequency === 1) {
                          setRecurringDates([])
                          setRecurringPattern(Pattern.AutoMonthly)
                        }
                      }

                      // Auto-calculate End Time if Start Time is set
                      const currentStartTime = form.getValues('start_time')
                      if (currentStartTime && selection.estimatedHours) {
                        const durationMinutes = Math.round(selection.estimatedHours * 60)
                        const endTime = calculateEndTime(currentStartTime, durationMinutes)
                        logger.debug('Auto-calculated end time', {
                          endTime,
                          estimatedHours: selection.estimatedHours,
                          startTime: currentStartTime
                        }, { context: 'BookingCreateModal' })
                        form.setValue('end_time', endTime)
                      }
                    } else {
                      // Clear selection
                      logger.debug('Clearing package selection', undefined, { context: 'BookingCreateModal' })
                      form.setValue('service_package_id', '')
                      form.setValue('package_v2_id', '')
                      form.setValue('area_sqm', undefined)
                      form.setValue('frequency', undefined)
                      form.setValue('total_price', 0)
                    }
                  })
                }}
              />
            </div>

            {/* Recurring Schedule Selector - แสดงอัตโนมัติเมื่อ frequency > 1 */}
            {packageSelection?.frequency && packageSelection.frequency > 1 && (
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
            <div className={`sm:col-span-2 grid gap-3 ${packageSelection?.frequency && packageSelection.frequency > 1 ? 'grid-cols-2' : 'grid-cols-3'}`}>
              {/* Booking Date - แสดงเฉพาะเมื่อไม่ recurring (frequency = 1) */}
              {(!packageSelection?.frequency || packageSelection.frequency === 1) && (
                <div className="space-y-2">
                  <Label htmlFor="booking_date">Booking Date *</Label>
                  <Input
                    id="booking_date"
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
              )}

              {/* Start Time */}
              <div className="space-y-2">
                <Label htmlFor="start_time">Start Time *</Label>
                <Input
                  id="start_time"
                  type="time"
                  {...form.register('start_time', {
                    onChange: (e) => {
                      const newStartTime = e.target.value

                      // Auto-calculate End Time when Start Time changes
                      if (newStartTime && packageSelection?.estimatedHours) {
                        const durationMinutes = Math.round(packageSelection.estimatedHours * 60)
                        const endTime = calculateEndTime(newStartTime, durationMinutes)
                        logger.debug('Auto-recalculated end time on start time change', {
                          newStartTime,
                          endTime,
                          estimatedHours: packageSelection.estimatedHours
                        }, { context: 'BookingCreateModal' })
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

              {/* End Time */}
              <div className="space-y-2">
                <Label htmlFor="end_time">End Time</Label>
                <Input
                  id="end_time"
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
                  {...form.register('total_price', { valueAsNumber: true })}
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
            )}

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
                    const isRecurring = packageSelection?.frequency && packageSelection.frequency > 1
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
                  disabled={
                    // ถ้าเป็น recurring ต้องเช็ค recurringDates, ถ้าไม่ใช่ต้องเช็ค booking_date
                    // ใช้ watchedBookingDate และ watchedStartTime เพื่อให้ reactive
                    ((packageSelection?.frequency && packageSelection.frequency > 1) ? recurringDates.length === 0 : !watchedBookingDate) ||
                    !watchedStartTime ||
                    !packageSelection
                  }
                >
                  <Sparkles className="h-4 w-4 mr-2 text-tinedy-blue" />
                  Check Staff Availability
                </Button>
                {(((packageSelection?.frequency && packageSelection.frequency > 1) ? recurringDates.length === 0 : !watchedBookingDate) || !watchedStartTime || !packageSelection) && (
                  <p className="text-xs text-muted-foreground text-center">
                    {(packageSelection?.frequency && packageSelection.frequency > 1)
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
                {...form.register('address')}
                required
                aria-invalid={!!form.formState.errors.address}
              />
              {form.formState.errors.address && (
                <p className="text-sm text-destructive">
                  {form.formState.errors.address.message}
                </p>
              )}
            </div>

            <div className="sm:col-span-2 grid grid-cols-3 gap-3">
              <div className="space-y-2">
                <Label htmlFor="city">City *</Label>
                <Input
                  id="city"
                  {...form.register('city')}
                  required
                  aria-invalid={!!form.formState.errors.city}
                />
                {form.formState.errors.city && (
                  <p className="text-sm text-destructive">
                    {form.formState.errors.city.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="state">State *</Label>
                <Input
                  id="state"
                  {...form.register('state')}
                  required
                  aria-invalid={!!form.formState.errors.state}
                />
                {form.formState.errors.state && (
                  <p className="text-sm text-destructive">
                    {form.formState.errors.state.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="zip_code">Zip Code *</Label>
                <Input
                  id="zip_code"
                  {...form.register('zip_code')}
                  required
                  aria-invalid={!!form.formState.errors.zip_code}
                />
                {form.formState.errors.zip_code && (
                  <p className="text-sm text-destructive">
                    {form.formState.errors.zip_code.message}
                  </p>
                )}
              </div>
            </div>

            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                {...form.register('notes')}
                rows={3}
                aria-invalid={!!form.formState.errors.notes}
              />
              {form.formState.errors.notes && (
                <p className="text-sm text-destructive">
                  {form.formState.errors.notes.message}
                </p>
              )}
            </div>
          </div>
          </div>

          {/* Form Validation Errors Summary */}
          {Object.keys(form.formState.errors).length > 0 && (
            <div className="flex-shrink-0 border-t pt-4 mt-4">
              <Alert variant="destructive">
                <AlertDescription>
                  <div className="font-medium mb-2">Please fix the following errors:</div>
                  <ul className="list-disc list-inside space-y-1 text-sm">
                    {form.formState.errors.full_name && (
                      <li>{form.formState.errors.full_name.message}</li>
                    )}
                    {form.formState.errors.email && (
                      <li>{form.formState.errors.email.message}</li>
                    )}
                    {form.formState.errors.phone && (
                      <li>{form.formState.errors.phone.message}</li>
                    )}
                    {form.formState.errors.service_package_id && (
                      <li>{form.formState.errors.service_package_id.message}</li>
                    )}
                    {form.formState.errors.package_v2_id && (
                      <li>{form.formState.errors.package_v2_id.message}</li>
                    )}
                    {form.formState.errors.booking_date && (
                      <li>{form.formState.errors.booking_date.message}</li>
                    )}
                    {form.formState.errors.start_time && (
                      <li>{form.formState.errors.start_time.message}</li>
                    )}
                    {form.formState.errors.end_time && (
                      <li>{form.formState.errors.end_time.message}</li>
                    )}
                    {form.formState.errors.total_price && (
                      <li>{form.formState.errors.total_price.message}</li>
                    )}
                    {form.formState.errors.area_sqm && (
                      <li>{form.formState.errors.area_sqm.message}</li>
                    )}
                    {form.formState.errors.address && (
                      <li>{form.formState.errors.address.message}</li>
                    )}
                    {form.formState.errors.city && (
                      <li>{form.formState.errors.city.message}</li>
                    )}
                    {form.formState.errors.state && (
                      <li>{form.formState.errors.state.message}</li>
                    )}
                    {form.formState.errors.zip_code && (
                      <li>{form.formState.errors.zip_code.message}</li>
                    )}
                    {form.formState.errors.staff_id && (
                      <li>{form.formState.errors.staff_id.message}</li>
                    )}
                    {form.formState.errors.team_id && (
                      <li>{form.formState.errors.team_id.message}</li>
                    )}
                    {form.formState.errors.notes && (
                      <li>{form.formState.errors.notes.message}</li>
                    )}
                  </ul>
                </AlertDescription>
              </Alert>
            </div>
          )}

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
