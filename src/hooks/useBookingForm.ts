/**
 * useBookingForm Hook
 *
 * Custom React hook for managing booking form state, validation, and submission.
 * This hook consolidates all form-related logic extracted from bookings.tsx,
 * providing a reusable interface for create/edit booking forms.
 *
 * @module hooks/useBookingForm
 *
 * @example
 * ```tsx
 * const {
 *   formData,
 *   errors,
 *   isSubmitting,
 *   handleChange,
 *   handleSubmit,
 *   reset
 * } = useBookingForm({
 *   initialData: existingBooking,
 *   onSubmit: async (data) => {
 *     await saveBooking(data)
 *   }
 * })
 *
 * return (
 *   <form onSubmit={(e) => { e.preventDefault(); handleSubmit(); }}>
 *     <Input
 *       value={formData.full_name}
 *       onChange={(e) => handleChange('full_name', e.target.value)}
 *     />
 *     {errors.full_name && <span>{errors.full_name}</span>}
 *   </form>
 * )
 * ```
 */

import { useState, useCallback } from 'react'
import type { BookingFormData } from '@/types/booking'
import { BookingStatus } from '@/types/booking'

/**
 * Form data structure for booking creation
 * Extends BookingFormData with additional customer fields for new customer creation
 *
 * @interface BookingFormState
 * @extends {Partial<BookingFormData>}
 */
export interface BookingFormState extends Partial<BookingFormData> {
  /** Customer's full name (for new customer creation) */
  full_name?: string
  /** Customer's email address (for new customer creation) */
  email?: string
  /** Customer's phone number (for new customer creation) */
  phone?: string
  /** Current booking status */
  status?: string
  /** V2 service package ID (for tiered pricing packages) */
  package_v2_id?: string
  /** Area in square meters (for V2 tiered pricing) */
  area_sqm?: number | null
  /** Booking frequency/package size (1, 2, 4, 8 times) */
  frequency?: number | null
  /** Calculated price from V2 pricing calculation */
  calculated_price?: number | null
}

/**
 * Configuration options for the useBookingForm hook
 *
 * @interface UseBookingFormOptions
 */
export interface UseBookingFormOptions {
  /** Initial form data to populate the form (e.g., for edit mode) */
  initialData?: Partial<BookingFormState>
  /** Callback function executed on successful form submission */
  onSubmit?: (data: BookingFormState) => Promise<void> | void
}

/**
 * Validation error messages keyed by field name
 *
 * @interface BookingFormErrors
 */
export interface BookingFormErrors {
  /** Error message for a specific form field */
  [key: string]: string
}

/**
 * Return value of the useBookingForm hook
 *
 * @interface UseBookingFormReturn
 */
export interface UseBookingFormReturn {
  /** Current form data state */
  formData: BookingFormState
  /** Current validation errors */
  errors: BookingFormErrors
  /** Whether the form is currently submitting */
  isSubmitting: boolean
  /** Update a single form field value */
  handleChange: <K extends keyof BookingFormState>(
    field: K,
    value: BookingFormState[K]
  ) => void
  /** Submit the form (validates and calls onSubmit) */
  handleSubmit: () => Promise<void>
  /** Validate the form and return whether it's valid */
  validate: () => boolean
  /** Reset the form to initial state */
  reset: () => void
  /** Set multiple form values at once */
  setValues: (values: Partial<BookingFormState>) => void
  /** Manually set validation errors */
  setErrors: (errors: BookingFormErrors) => void
}

/**
 * Simplified form interface compatible with modal components
 * This is the subset of UseBookingFormReturn that modal components expect
 *
 * @interface BookingForm
 */
export interface BookingForm {
  /** Current form data state */
  formData: BookingFormState
  /** Update a single form field value */
  handleChange: <K extends keyof BookingFormState>(
    field: K,
    value: BookingFormState[K]
  ) => void
  /** Set multiple form values at once */
  setValues: (values: Partial<BookingFormState>) => void
  /** Reset the form to initial state */
  reset: () => void
}

/**
 * Extract only the properties needed for modal components from UseBookingFormReturn
 * This creates a compatible BookingForm object from the full hook return
 *
 * @param {UseBookingFormReturn} form - Full form object from useBookingForm hook
 * @returns {BookingForm} Simplified form object for modal components
 *
 * @example
 * const fullForm = useBookingForm({ ... })
 * const modalForm = toBookingForm(fullForm)
 * <BookingCreateModal createForm={modalForm} ... />
 */
export function toBookingForm(form: UseBookingFormReturn): BookingForm {
  return {
    formData: form.formData,
    handleChange: form.handleChange,
    setValues: form.setValues,
    reset: form.reset,
  }
}

/**
 * Custom hook for managing booking form state and operations
 *
 * This hook handles:
 * - Form state management (formData)
 * - Field-level validation with real-time error clearing
 * - Form submission with loading state
 * - Form reset functionality
 * - Bulk value updates
 *
 * @param {UseBookingFormOptions} options - Configuration options
 * @returns {UseBookingFormReturn} Form state and handlers
 *
 * @example
 * // Create new booking
 * const form = useBookingForm({
 *   onSubmit: async (data) => {
 *     await createBooking(data)
 *   }
 * })
 *
 * @example
 * // Edit existing booking
 * const form = useBookingForm({
 *   initialData: booking,
 *   onSubmit: async (data) => {
 *     await updateBooking(booking.id, data)
 *   }
 * })
 */
export function useBookingForm(
  options: UseBookingFormOptions = {}
): UseBookingFormReturn {
  const { initialData, onSubmit } = options

  // Form data state
  const [formData, setFormData] = useState<BookingFormState>(
    initialData || {}
  )

  // Validation errors
  const [errors, setErrors] = useState<BookingFormErrors>({})

  // Submission state
  const [isSubmitting, setIsSubmitting] = useState(false)

  /**
   * Update a single form field
   * Automatically clears the validation error for that field when the user starts typing
   *
   * @param {K} field - The field name to update
   * @param {BookingFormState[K]} value - The new value for the field
   */
  const handleChange = useCallback(
    <K extends keyof BookingFormState>(
      field: K,
      value: BookingFormState[K]
    ) => {
      setFormData((prev) => ({
        ...prev,
        [field]: value,
      }))

      // Clear error for this field when user starts typing
      if (errors[field as string]) {
        setErrors((prev) => {
          const next = { ...prev }
          delete next[field as string]
          return next
        })
      }
    },
    [errors]
  )

  /**
   * Validate form data
   *
   * Validates all required fields for booking creation:
   * - Customer information (name, email, phone) OR customer_id
   * - Service package selection
   * - Booking date and start time
   * - Location information (address, city, state, zip code)
   *
   * @returns {boolean} True if form is valid, false otherwise
   */
  const validate = useCallback((): boolean => {
    const newErrors: BookingFormErrors = {}

    // Customer validation - either customer_id OR full customer details
    if (!formData.customer_id) {
      if (!formData.full_name) {
        newErrors.full_name = 'Customer name is required'
      }
      if (!formData.email) {
        newErrors.email = 'Customer email is required'
      } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
        newErrors.email = 'Invalid email format'
      }
      if (!formData.phone) {
        newErrors.phone = 'Customer phone is required'
      }
    }

    // Service package validation (V1 or V2)
    if (!formData.service_package_id && !formData.package_v2_id) {
      newErrors.service_package_id = 'Service package is required'
    }

    // Date and time validation
    if (!formData.booking_date) {
      newErrors.booking_date = 'Booking date is required'
    }
    if (!formData.start_time) {
      newErrors.start_time = 'Start time is required'
    }

    // Location validation
    // Note: address and city are required, but state and zip_code are optional
    // to support international bookings where these fields may not apply
    if (!formData.address) {
      newErrors.address = 'Address is required'
    }
    if (!formData.city) {
      newErrors.city = 'City is required'
    }
    // State and zip_code are optional - no validation required

    // Price validation
    if (formData.total_price === undefined || formData.total_price === null) {
      newErrors.total_price = 'Total price is required'
    } else if (formData.total_price <= 0) {
      newErrors.total_price = 'Total price must be greater than zero'
    }

    // Status validation - if status is provided, ensure it's valid
    if (formData.status) {
      const validStatuses = Object.values(BookingStatus)
      if (!validStatuses.includes(formData.status as typeof BookingStatus[keyof typeof BookingStatus])) {
        newErrors.status = 'Invalid booking status'
      }
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }, [formData])

  /**
   * Handle form submission
   *
   * Validates the form data and calls the onSubmit callback if validation passes.
   * Manages submission loading state and error handling.
   *
   * @returns {Promise<void>}
   *
   * @throws Will catch and log any errors during submission, setting a generic error message
   */
  const handleSubmit = useCallback(async (): Promise<void> => {
    if (!validate()) {
      return
    }

    setIsSubmitting(true)
    try {
      if (onSubmit) {
        await onSubmit(formData)
      }
    } catch (error) {
      console.error('Form submission error:', error)
      setErrors({
        submit: error instanceof Error ? error.message : 'Submission failed',
      })
    } finally {
      setIsSubmitting(false)
    }
  }, [formData, onSubmit, validate])

  /**
   * Reset form to initial state
   *
   * Clears all form data, errors, and submission state.
   * If initialData was provided, resets to those values.
   */
  const reset = useCallback(() => {
    setFormData(initialData || {})
    setErrors({})
    setIsSubmitting(false)
  }, [initialData])

  /**
   * Set multiple form values at once
   *
   * Useful for bulk updates like loading existing customer data
   * or applying default values.
   *
   * @param {Partial<BookingFormState>} values - Object with field-value pairs to update
   *
   * @example
   * setValues({
   *   full_name: 'John Doe',
   *   email: 'john@example.com',
   *   phone: '555-1234'
   * })
   */
  const setValues = useCallback((values: Partial<BookingFormState>) => {
    setFormData((prev) => ({
      ...prev,
      ...values,
    }))
  }, [])

  return {
    formData,
    errors,
    isSubmitting,
    handleChange,
    handleSubmit,
    validate,
    reset,
    setValues,
    setErrors,
  }
}
