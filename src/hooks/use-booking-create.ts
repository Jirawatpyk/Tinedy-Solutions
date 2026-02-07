import { useState, useEffect, useCallback } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { supabase } from '@/lib/supabase'
import { useToast } from '@/hooks/use-toast'
import { mapErrorToUserMessage, getValidationErrorMessage, getRecurringBookingError } from '@/lib/error-messages'
import type { CustomerRecord } from '@/types/customer'
import { sendBookingConfirmation, sendBookingReminder, sendRecurringBookingConfirmation, type PaymentEmailData, type RecurringBookingEmailData } from '@/lib/email'
import type { PackageSelectionData } from '@/components/service-packages'
import type { UnifiedServicePackage } from '@/hooks/use-service-packages'
import { RecurringPattern as Pattern } from '@/types/recurring-booking'
import type { RecurringPattern } from '@/types/recurring-booking'
import type { BookingFrequency } from '@/types/service-package-v2'
import { createRecurringGroup } from '@/lib/recurring-booking-service'
import { logger } from '@/lib/logger'
import {
  bookingCreateSchema,
  type BookingCreateFormData,
} from '@/schemas'
import { BookingStatus } from '@/types/booking'

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
  customers?: { full_name: string; email: string }
  service_packages?: { name: string }
  service_packages_v2?: { name: string }
  profiles?: { full_name: string }
}

interface StaffMember {
  id: string
  full_name: string
  role: string
}

interface UseBookingCreateOptions {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  servicePackages: UnifiedServicePackage[]
  staffMembers: StaffMember[]
  assignmentType: 'staff' | 'team' | 'none'
  setAssignmentType: (type: 'staff' | 'team' | 'none') => void
  calculateEndTime: (startTime: string, durationMinutes: number) => string
  packageSelection: PackageSelectionData | null
  setPackageSelection: (selection: PackageSelectionData | null) => void
  // Default values
  defaultDate?: string
  defaultStartTime?: string
  defaultEndTime?: string
  defaultStaffId?: string
  defaultTeamId?: string
  defaultCustomerId?: string
  defaultFullName?: string
  defaultEmail?: string
  defaultPhone?: string
  defaultAddress?: string
  defaultCity?: string
  defaultState?: string
  defaultZipCode?: string
  // Recurring bookings (lifted to parent)
  parentRecurringDates?: string[]
  parentSetRecurringDates?: React.Dispatch<React.SetStateAction<string[]>>
  parentRecurringPattern?: RecurringPattern
  parentSetRecurringPattern?: React.Dispatch<React.SetStateAction<RecurringPattern>>
}

export function useBookingCreate({
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
}: UseBookingCreateOptions) {
  const { toast } = useToast()
  const [existingCustomer, setExistingCustomer] = useState<CustomerRecord | null>(null)
  const [checkingCustomer, setCheckingCustomer] = useState(false)

  // Recurring Bookings State - use parent state if provided, otherwise use local state
  const [localRecurringDates, localSetRecurringDates] = useState<string[]>([])
  const [localRecurringPattern, localSetRecurringPattern] = useState<RecurringPattern>(Pattern.AutoMonthly)

  const recurringDates = parentRecurringDates !== undefined ? parentRecurringDates : localRecurringDates
  const recurringPattern = parentRecurringPattern !== undefined ? parentRecurringPattern : localRecurringPattern

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

  // Watch form values for reactive updates
  const watchedBookingDate = useWatch({ control: form.control, name: 'booking_date' })
  const watchedStartTime = useWatch({ control: form.control, name: 'start_time' })

  // Track modal open/close
  useEffect(() => {
    if (isOpen) {
      logger.debug('BookingCreateModal opened', { packageSelection }, { context: 'BookingCreateModal' })
    } else {
      logger.debug('BookingCreateModal closed', { packageSelection }, { context: 'BookingCreateModal' })
    }
  }, [isOpen, packageSelection])

  // Set default values when modal opens
  useEffect(() => {
    if (!isOpen) return

    const defaults: Record<string, string | undefined> = {
      booking_date: defaultDate,
      start_time: defaultStartTime,
      end_time: defaultEndTime,
      staff_id: defaultStaffId,
      team_id: defaultTeamId,
      customer_id: defaultCustomerId,
      full_name: defaultFullName,
      email: defaultEmail,
      phone: defaultPhone,
      address: defaultAddress,
      city: defaultCity,
      state: defaultState,
      zip_code: defaultZipCode,
    }

    for (const [field, value] of Object.entries(defaults)) {
      if (value) {
        form.setValue(field as keyof BookingCreateFormData, value)
        logger.debug(`Set default ${field}`, { [field]: value }, { context: 'BookingCreateModal' })
      }
    }
  }, [
    isOpen, defaultDate, defaultStartTime, defaultEndTime, defaultStaffId, defaultTeamId,
    defaultCustomerId, defaultFullName, defaultEmail, defaultPhone,
    defaultAddress, defaultCity, defaultState, defaultZipCode, form,
  ])

  // Auto-sync booking_date with recurringDates[0] for recurring bookings
  useEffect(() => {
    const isRecurring = packageSelection?.frequency && packageSelection.frequency > 1
    if (isRecurring && recurringDates.length > 0) {
      form.setValue('booking_date', recurringDates[0])
    }
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
        .is('deleted_at', null)
        .single()

      if (data && !error) {
        setExistingCustomer(data)
        toast({ title: 'Customer Found!', description: `Found existing customer: ${data.full_name}` })
      } else {
        setExistingCustomer(null)
      }
    } catch {
      // Ignore - customer might not exist
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
      const { data, error } = await supabase
        .from('customers')
        .select('*')
        .eq('phone', phone.trim())
        .is('deleted_at', null)
        .single()

      if (data && !error) {
        setExistingCustomer(data)
        toast({ title: 'Customer Found (by Phone)!', description: `Found existing customer: ${data.full_name}` })
      }
    } catch {
      // Ignore
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

    toast({ title: 'Customer data loaded', description: 'Existing customer information has been populated' })
  }

  const resetForm = useCallback(() => {
    setRecurringDates([])
    setRecurringPattern(Pattern.AutoMonthly)
    setPackageSelection(null)
    form.reset()
    setAssignmentType('none')
    setExistingCustomer(null)
  }, [setRecurringDates, setRecurringPattern, setPackageSelection, form, setAssignmentType])

  const handleClose = useCallback(() => {
    resetForm()
    onClose()
  }, [resetForm, onClose])

  // --- Submission helpers ---

  const buildBaseBookingData = async (data: BookingCreateFormData) => {
    const selectedPkg = servicePackages.find(pkg => pkg.id === data.service_package_id || pkg.id === data.package_v2_id)
    let calculatedEndTime = data.end_time || ''

    if (selectedPkg && selectedPkg.duration_minutes) {
      calculatedEndTime = calculateEndTime(data.start_time || '', selectedPkg.duration_minutes)
    } else if (packageSelection?.estimatedHours && data.start_time) {
      calculatedEndTime = calculateEndTime(data.start_time, packageSelection.estimatedHours * 60)
    }

    let customerId = data.customer_id
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

    const servicePackageId = data.service_package_id || data.package_v2_id
    if (!servicePackageId) {
      const validationError = getValidationErrorMessage()
      toast({
        title: validationError.title,
        description: 'Please select a service package before creating a booking.',
        variant: 'destructive',
      })
      return null
    }

    let teamMemberCount: number | null = null
    if (assignmentType === 'team' && data.team_id) {
      const { data: members } = await supabase
        .rpc('get_team_members_by_team_id', { p_team_id: data.team_id })
      teamMemberCount = members?.length || 1
      logger.debug('Team member count', { teamId: data.team_id, count: teamMemberCount }, { context: 'BookingCreateModal' })
    }

    return {
      customerId: customerId!,
      calculatedEndTime,
      baseBooking: {
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
        status: BookingStatus.Pending,
        payment_status: 'unpaid' as const,
        staff_id: assignmentType === 'staff' ? (data.staff_id || null) : null,
        team_id: assignmentType === 'team' ? (data.team_id || null) : null,
        area_sqm: data.area_sqm || null,
        frequency: data.frequency || null,
        package_v2_id: data.package_v2_id || null,
        team_member_count: teamMemberCount,
      },
    }
  }

  const createRecurringBooking = async (
    data: BookingCreateFormData,
    baseBooking: NonNullable<Awaited<ReturnType<typeof buildBaseBookingData>>>,
    calculatedEndTime: string
  ) => {
    if (!baseBooking) return

    if (recurringDates.length !== packageSelection!.frequency) {
      const validationError = getValidationErrorMessage()
      toast({
        title: validationError.title,
        description: `Please select ${packageSelection!.frequency} dates for recurring bookings. You have selected ${recurringDates.length} date(s) so far.`,
        variant: 'destructive',
      })
      return
    }

    if (!baseBooking.customerId) throw new Error('Customer ID is required')
    if (!baseBooking.baseBooking.start_time) throw new Error('Start time is required')
    if (!baseBooking.baseBooking.address) throw new Error('Address is required')
    if (!baseBooking.baseBooking.city) throw new Error('City is required')

    const pricePerBooking = baseBooking.baseBooking.total_price / packageSelection!.frequency

    logger.debug('Creating recurring booking group', {
      customer_id: baseBooking.baseBooking.customer_id,
      frequency: packageSelection!.frequency,
      total_price_per_booking: pricePerBooking,
    }, { context: 'BookingCreateModal' })

    const result = await createRecurringGroup({
      baseBooking: { ...baseBooking.baseBooking, total_price: pricePerBooking },
      dates: recurringDates,
      pattern: recurringPattern,
      totalOccurrences: packageSelection!.frequency as BookingFrequency,
    })

    if (!result.success) {
      const errorMsg = getRecurringBookingError('create')
      toast({ title: errorMsg.title, description: errorMsg.description, variant: 'destructive' })
      return
    }

    // Send recurring confirmation email
    if (data.email) {
      const fullAddress = [baseBooking.baseBooking.address, baseBooking.baseBooking.city, baseBooking.baseBooking.state, baseBooking.baseBooking.zip_code]
        .filter(part => part && String(part).trim()).join(', ')

      const selectedPkg = servicePackages.find(pkg =>
        pkg.id === baseBooking.baseBooking.service_package_id || pkg.id === baseBooking.baseBooking.package_v2_id
      )

      const recurringEmailData: RecurringBookingEmailData = {
        groupId: result.groupId,
        bookingIds: result.bookingIds,
        customerName: data.full_name || 'Customer',
        customerEmail: data.email,
        serviceName: selectedPkg?.name || 'Service',
        bookingDates: recurringDates.map((date, i) => ({ date, sequence: i + 1 })),
        startTime: baseBooking.baseBooking.start_time,
        endTime: calculatedEndTime || baseBooking.baseBooking.end_time || '',
        totalPrice: baseBooking.baseBooking.total_price, // Original full price (before division by frequency)
        pricePerBooking,
        location: fullAddress,
        paymentLink: `${window.location.origin}/payment/${result.bookingIds[0]}`,
        staffName: assignmentType === 'staff' ? staffMembers.find(s => s.id === baseBooking.baseBooking.staff_id)?.full_name : undefined,
        notes: baseBooking.baseBooking.notes || undefined,
        frequency: packageSelection!.frequency,
      }

      sendRecurringBookingConfirmation(recurringEmailData).catch(err => {
        logger.error('Failed to send recurring booking confirmation', { error: err }, { context: 'BookingCreateModal' })
      })
    }

    toast({
      title: 'Success',
      description: `Created ${result.bookingIds.length} recurring bookings successfully! Confirmation email sent.`,
    })
  }

  const createSingleBooking = async (data: BookingCreateFormData, baseBooking: NonNullable<Awaited<ReturnType<typeof buildBaseBookingData>>>) => {
    const { data: newBooking, error: bookingError } = await supabase
      .from('bookings')
      .insert({ ...baseBooking.baseBooking, booking_date: data.booking_date })
      .select(`*, customers (full_name, email), service_packages (name), service_packages_v2 (name), profiles!bookings_staff_id_fkey (full_name)`)
      .single()

    if (bookingError) throw bookingError

    if (newBooking && data.email) {
      const fullAddress = [newBooking.address, newBooking.city, newBooking.state, newBooking.zip_code]
        .filter(part => part && String(part).trim()).join(', ')

      const booking = newBooking as BookingWithRelations
      const emailData: PaymentEmailData = {
        bookingId: booking.id,
        customerName: data.full_name || 'Customer',
        customerEmail: data.email,
        serviceName: booking.service_packages?.name || booking.service_packages_v2?.name || 'Service',
        bookingDate: booking.booking_date,
        startTime: booking.start_time,
        endTime: booking.end_time,
        totalPrice: Number(booking.total_price),
        location: fullAddress || undefined,
        notes: booking.notes || undefined,
        staffName: booking.profiles?.full_name || undefined,
        paymentLink: `${window.location.origin}/payment/${booking.id}`,
      }

      sendBookingConfirmation(emailData).catch(err => {
        logger.error('Failed to send booking confirmation', { error: err }, { context: 'BookingCreateModal' })
      })

      sendBookingReminder({
        bookingId: booking.id,
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

    toast({ title: 'Success', description: 'Booking created successfully. Confirmation email sent!' })
  }

  // Handle form submission
  const onSubmit = form.handleSubmit(async (data: BookingCreateFormData) => {
    try {
      const isRecurring = packageSelection?.frequency && packageSelection.frequency > 1

      // Tiered pricing validation
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

      if (isRecurring && recurringDates.length > 0 && !data.booking_date) {
        data.booking_date = recurringDates[0]
      }

      logger.debug('Form submitted', { data, isRecurring, recurringDates }, { context: 'BookingCreateModal' })

      const result = await buildBaseBookingData(data)
      if (!result) return

      if (isRecurring) {
        await createRecurringBooking(data, result, result.calculatedEndTime)
      } else {
        await createSingleBooking(data, result)
      }

      resetForm()
      onClose()
      onSuccess()
    } catch (error) {
      logger.error('Error creating booking', { error }, { context: 'BookingCreateModal' })
      const errorMsg = mapErrorToUserMessage(error, 'booking')
      toast({ title: errorMsg.title, description: errorMsg.description, variant: 'destructive' })
    }
  })

  return {
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
  }
}
