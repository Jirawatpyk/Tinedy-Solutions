import { useState, useEffect, useCallback } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { useToast } from '@/hooks/use-toast'
import { mapErrorToUserMessage, getValidationErrorMessage, getRecurringBookingError } from '@/lib/error-messages'
import type { CustomerRecord } from '@/types/customer'
import { sendBookingConfirmation, sendBookingReminder, sendRecurringBookingConfirmation, type PaymentEmailData, type RecurringBookingEmailData } from '@/lib/email'
import type { PackageSelectionData } from '@/components/service-packages'
import type { UnifiedServicePackage } from '@/hooks/useServicePackages'
import { RecurringPattern as Pattern } from '@/types/recurring-booking'
import type { RecurringPattern } from '@/types/recurring-booking'
import type { BookingFrequency } from '@/types/service-package-v2'
import { createRecurringGroup } from '@/lib/recurring-booking-service'
import { logger } from '@/lib/logger'
import {
  bookingCreateSchema,
  type BookingCreateFormData,
} from '@/schemas'
// Extracted sub-components
import {
  CustomerInfoSection,
  BookingScheduleSection,
  AssignmentSection,
  AddressSection,
} from './create-modal'

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

      // Get team member count if team is assigned (for earnings calculation)
      let teamMemberCount: number | null = null
      if (assignmentType === 'team' && data.team_id) {
        const { data: members } = await supabase
          .rpc('get_team_members_by_team_id', { p_team_id: data.team_id })
        teamMemberCount = members?.length || 1
        logger.debug('Team member count for booking', { teamId: data.team_id, count: teamMemberCount }, { context: 'BookingCreateModal' })
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
        team_member_count: teamMemberCount,
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
