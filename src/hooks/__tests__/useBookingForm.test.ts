import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import { useBookingForm } from '../useBookingForm'
import type { BookingFormState } from '../useBookingForm'

describe('useBookingForm', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Initialization', () => {
    it('should initialize with empty form data', () => {
      // Act
      const { result } = renderHook(() => useBookingForm())

      // Assert
      expect(result.current.formData).toEqual({})
      expect(result.current.errors).toEqual({})
      expect(result.current.isSubmitting).toBe(false)
    })

    it('should initialize with provided initial data', () => {
      // Arrange
      const initialData: Partial<BookingFormState> = {
        full_name: 'John Doe',
        email: 'john@example.com',
        phone: '08123456789',
      }

      // Act
      const { result } = renderHook(() => useBookingForm({ initialData }))

      // Assert
      expect(result.current.formData).toEqual(initialData)
    })

    it('should provide all required functions', () => {
      // Act
      const { result } = renderHook(() => useBookingForm())

      // Assert
      expect(typeof result.current.handleChange).toBe('function')
      expect(typeof result.current.handleSubmit).toBe('function')
      expect(typeof result.current.validate).toBe('function')
      expect(typeof result.current.reset).toBe('function')
      expect(typeof result.current.setValues).toBe('function')
      expect(typeof result.current.setErrors).toBe('function')
    })
  })

  describe('Form Field Updates', () => {
    it('should update a single field', () => {
      // Arrange
      const { result } = renderHook(() => useBookingForm())

      // Act
      act(() => {
        result.current.handleChange('full_name', 'Jane Doe')
      })

      // Assert
      expect(result.current.formData.full_name).toBe('Jane Doe')
    })

    it('should clear error when field is updated', () => {
      // Arrange
      const { result } = renderHook(() => useBookingForm())

      // Set an error manually
      act(() => {
        result.current.setErrors({ full_name: 'Name is required' })
      })

      expect(result.current.errors.full_name).toBe('Name is required')

      // Act - Update the field
      act(() => {
        result.current.handleChange('full_name', 'Jane Doe')
      })

      // Assert
      expect(result.current.errors.full_name).toBeUndefined()
    })

    it('should preserve other errors when clearing one', () => {
      // Arrange
      const { result } = renderHook(() => useBookingForm())

      act(() => {
        result.current.setErrors({
          full_name: 'Name is required',
          email: 'Email is required',
        })
      })

      // Act
      act(() => {
        result.current.handleChange('full_name', 'Jane Doe')
      })

      // Assert
      expect(result.current.errors.full_name).toBeUndefined()
      expect(result.current.errors.email).toBe('Email is required')
    })

    it('should update multiple fields independently', () => {
      // Arrange
      const { result } = renderHook(() => useBookingForm())

      // Act
      act(() => {
        result.current.handleChange('full_name', 'John Doe')
        result.current.handleChange('email', 'john@example.com')
        result.current.handleChange('phone', '08123456789')
      })

      // Assert
      expect(result.current.formData).toEqual({
        full_name: 'John Doe',
        email: 'john@example.com',
        phone: '08123456789',
      })
    })
  })

  describe('Bulk Value Updates', () => {
    it('should set multiple values at once', () => {
      // Arrange
      const { result } = renderHook(() => useBookingForm())

      // Act
      act(() => {
        result.current.setValues({
          full_name: 'Jane Smith',
          email: 'jane@example.com',
          phone: '08987654321',
        })
      })

      // Assert
      expect(result.current.formData).toEqual({
        full_name: 'Jane Smith',
        email: 'jane@example.com',
        phone: '08987654321',
      })
    })

    it('should merge values with existing data', () => {
      // Arrange
      const { result } = renderHook(() =>
        useBookingForm({
          initialData: { full_name: 'John Doe' },
        })
      )

      // Act
      act(() => {
        result.current.setValues({
          email: 'john@example.com',
          phone: '08123456789',
        })
      })

      // Assert
      expect(result.current.formData).toEqual({
        full_name: 'John Doe',
        email: 'john@example.com',
        phone: '08123456789',
      })
    })

    it('should overwrite existing values', () => {
      // Arrange
      const { result } = renderHook(() =>
        useBookingForm({
          initialData: { full_name: 'John Doe', email: 'old@example.com' },
        })
      )

      // Act
      act(() => {
        result.current.setValues({ email: 'new@example.com' })
      })

      // Assert
      expect(result.current.formData.email).toBe('new@example.com')
      expect(result.current.formData.full_name).toBe('John Doe')
    })
  })

  describe('Customer Validation', () => {
    it('should require customer name when no customer_id', () => {
      // Arrange
      const { result } = renderHook(() => useBookingForm())

      // Act
      act(() => {
        result.current.validate()
      })

      // Assert
      expect(result.current.errors.full_name).toBe('Customer name is required')
    })

    it('should require customer email when no customer_id', () => {
      // Arrange
      const { result } = renderHook(() => useBookingForm())

      // Act
      act(() => {
        result.current.validate()
      })

      // Assert
      expect(result.current.errors.email).toBe('Customer email is required')
    })

    it('should require customer phone when no customer_id', () => {
      // Arrange
      const { result } = renderHook(() => useBookingForm())

      // Act
      act(() => {
        result.current.validate()
      })

      // Assert
      expect(result.current.errors.phone).toBe('Customer phone is required')
    })

    it('should not require customer details when customer_id exists', () => {
      // Arrange
      const { result } = renderHook(() =>
        useBookingForm({
          initialData: {
            customer_id: 'existing-customer',
            service_package_id: 'pkg-1',
            booking_date: '2025-12-01',
            start_time: '10:00',
            address: '123 Main St',
            city: 'Bangkok',
            total_price: 1000,
          },
        })
      )

      // Act
      act(() => {
        result.current.validate()
      })

      // Assert
      expect(result.current.errors.full_name).toBeUndefined()
      expect(result.current.errors.email).toBeUndefined()
      expect(result.current.errors.phone).toBeUndefined()
    })

    it('should validate email format', () => {
      // Arrange
      const { result } = renderHook(() =>
        useBookingForm({
          initialData: {
            email: 'invalid-email',
          },
        })
      )

      // Act
      act(() => {
        result.current.validate()
      })

      // Assert
      expect(result.current.errors.email).toBe('Invalid email format')
    })

    it('should accept valid email format', () => {
      // Arrange
      const { result } = renderHook(() =>
        useBookingForm({
          initialData: {
            full_name: 'John Doe',
            email: 'valid@example.com',
            phone: '08123456789',
            service_package_id: 'pkg-1',
            booking_date: '2025-12-01',
            start_time: '10:00',
            address: '123 Main St',
            city: 'Bangkok',
            total_price: 1000,
          },
        })
      )

      // Act
      act(() => result.current.validate())

      // Assert
      expect(result.current.errors.email).toBeUndefined()
    })

    it('should validate complex email formats', () => {
      // Arrange
      const validEmails = [
        'user@example.com',
        'user.name@example.com',
        'user+tag@example.co.uk',
        'user123@test-domain.com',
      ]

      validEmails.forEach((email) => {
        const { result } = renderHook(() =>
          useBookingForm({
            initialData: {
              full_name: 'Test User',
              email,
              phone: '08123456789',
              service_package_id: 'pkg-1',
              booking_date: '2025-12-01',
              start_time: '10:00',
              address: '123 Main St',
              city: 'Bangkok',
              total_price: 1000,
            },
          })
        )

        // Act
        act(() => {
          result.current.validate()
        })

        // Assert
        expect(result.current.errors.email).toBeUndefined()
      })
    })

    it('should reject invalid email formats', () => {
      // Arrange
      const invalidEmails = [
        'notanemail',
        '@example.com',
        'user@',
        'user @example.com',
        'user@.com',
      ]

      invalidEmails.forEach((email) => {
        const { result } = renderHook(() =>
          useBookingForm({
            initialData: { email },
          })
        )

        // Act
        act(() => {
          result.current.validate()
        })

        // Assert
        expect(result.current.errors.email).toBe('Invalid email format')
      })
    })
  })

  describe('Service Package Validation', () => {
    it('should require service package', () => {
      // Arrange
      const { result } = renderHook(() => useBookingForm())

      // Act
      act(() => {
        result.current.validate()
      })

      // Assert
      expect(result.current.errors.service_package_id).toBe('Service package is required')
    })

    it('should accept valid service package', () => {
      // Arrange
      const { result } = renderHook(() =>
        useBookingForm({
          initialData: {
            customer_id: 'cust-1',
            service_package_id: 'pkg-1',
            booking_date: '2025-12-01',
            start_time: '10:00',
            address: '123 Main St',
            city: 'Bangkok',
            total_price: 1000,
          },
        })
      )

      // Act
      act(() => {
        result.current.validate()
      })

      // Assert
      expect(result.current.errors.service_package_id).toBeUndefined()
    })
  })

  describe('Date and Time Validation', () => {
    it('should require booking date', () => {
      // Arrange
      const { result } = renderHook(() => useBookingForm())

      // Act
      act(() => {
        result.current.validate()
      })

      // Assert
      expect(result.current.errors.booking_date).toBe('Booking date is required')
    })

    it('should require start time', () => {
      // Arrange
      const { result } = renderHook(() => useBookingForm())

      // Act
      act(() => {
        result.current.validate()
      })

      // Assert
      expect(result.current.errors.start_time).toBe('Start time is required')
    })

    it('should accept valid date and time', () => {
      // Arrange
      const { result } = renderHook(() =>
        useBookingForm({
          initialData: {
            customer_id: 'cust-1',
            service_package_id: 'pkg-1',
            booking_date: '2025-12-01',
            start_time: '10:00',
            address: '123 Main St',
            city: 'Bangkok',
            total_price: 1000,
          },
        })
      )

      // Act
      act(() => {
        result.current.validate()
      })

      // Assert
      expect(result.current.errors.booking_date).toBeUndefined()
      expect(result.current.errors.start_time).toBeUndefined()
    })
  })

  describe('Location Validation', () => {
    it('should require address', () => {
      // Arrange
      const { result } = renderHook(() => useBookingForm())

      // Act
      act(() => {
        result.current.validate()
      })

      // Assert
      expect(result.current.errors.address).toBe('Address is required')
    })

    it('should require city', () => {
      // Arrange
      const { result } = renderHook(() => useBookingForm())

      // Act
      act(() => {
        result.current.validate()
      })

      // Assert
      expect(result.current.errors.city).toBe('City is required')
    })

    it('should not require state', () => {
      // Arrange
      const { result } = renderHook(() =>
        useBookingForm({
          initialData: {
            customer_id: 'cust-1',
            service_package_id: 'pkg-1',
            booking_date: '2025-12-01',
            start_time: '10:00',
            address: '123 Main St',
            city: 'Bangkok',
            total_price: 1000,
          },
        })
      )

      // Act
      act(() => {
        result.current.validate()
      })

      // Assert
      expect(result.current.errors.state).toBeUndefined()
    })

    it('should not require zip_code', () => {
      // Arrange
      const { result } = renderHook(() =>
        useBookingForm({
          initialData: {
            customer_id: 'cust-1',
            service_package_id: 'pkg-1',
            booking_date: '2025-12-01',
            start_time: '10:00',
            address: '123 Main St',
            city: 'Bangkok',
            total_price: 1000,
          },
        })
      )

      // Act
      act(() => {
        result.current.validate()
      })

      // Assert
      expect(result.current.errors.zip_code).toBeUndefined()
    })
  })

  describe('Price Validation', () => {
    it('should require total price', () => {
      // Arrange
      const { result } = renderHook(() => useBookingForm())

      // Act
      act(() => {
        result.current.validate()
      })

      // Assert
      expect(result.current.errors.total_price).toBe('Total price is required')
    })

    it('should reject zero price', () => {
      // Arrange
      const { result } = renderHook(() =>
        useBookingForm({
          initialData: { total_price: 0 },
        })
      )

      // Act
      act(() => {
        result.current.validate()
      })

      // Assert
      expect(result.current.errors.total_price).toBe('Total price must be greater than zero')
    })

    it('should reject negative price', () => {
      // Arrange
      const { result } = renderHook(() =>
        useBookingForm({
          initialData: { total_price: -100 },
        })
      )

      // Act
      act(() => {
        result.current.validate()
      })

      // Assert
      expect(result.current.errors.total_price).toBe('Total price must be greater than zero')
    })

    it('should accept valid positive price', () => {
      // Arrange
      const { result } = renderHook(() =>
        useBookingForm({
          initialData: {
            customer_id: 'cust-1',
            service_package_id: 'pkg-1',
            booking_date: '2025-12-01',
            start_time: '10:00',
            address: '123 Main St',
            city: 'Bangkok',
            total_price: 1000,
          },
        })
      )

      // Act
      act(() => {
        result.current.validate()
      })

      // Assert
      expect(result.current.errors.total_price).toBeUndefined()
    })

    it('should accept decimal prices', () => {
      // Arrange
      const { result } = renderHook(() =>
        useBookingForm({
          initialData: {
            customer_id: 'cust-1',
            service_package_id: 'pkg-1',
            booking_date: '2025-12-01',
            start_time: '10:00',
            address: '123 Main St',
            city: 'Bangkok',
            total_price: 1299.99,
          },
        })
      )

      // Act
      act(() => {
        result.current.validate()
      })

      // Assert
      expect(result.current.errors.total_price).toBeUndefined()
    })
  })

  describe('Status Validation', () => {
    it('should accept valid booking status', () => {
      // Arrange
      const validStatuses = ['pending', 'confirmed', 'in_progress', 'completed', 'cancelled', 'no_show']

      validStatuses.forEach((status) => {
        const { result } = renderHook(() =>
          useBookingForm({
            initialData: {
              customer_id: 'cust-1',
              service_package_id: 'pkg-1',
              booking_date: '2025-12-01',
              start_time: '10:00',
              address: '123 Main St',
              city: 'Bangkok',
              total_price: 1000,
              status,
            },
          })
        )

        // Act
        act(() => {
          result.current.validate()
        })

        // Assert
        expect(result.current.errors.status).toBeUndefined()
      })
    })

    it('should reject invalid booking status', () => {
      // Arrange
      const { result } = renderHook(() =>
        useBookingForm({
          initialData: {
            status: 'invalid_status',
          },
        })
      )

      // Act
      act(() => {
        result.current.validate()
      })

      // Assert
      expect(result.current.errors.status).toBe('Invalid booking status')
    })

    it('should allow missing status', () => {
      // Arrange
      const { result } = renderHook(() =>
        useBookingForm({
          initialData: {
            customer_id: 'cust-1',
            service_package_id: 'pkg-1',
            booking_date: '2025-12-01',
            start_time: '10:00',
            address: '123 Main St',
            city: 'Bangkok',
            total_price: 1000,
          },
        })
      )

      // Act
      act(() => {
        result.current.validate()
      })

      // Assert
      expect(result.current.errors.status).toBeUndefined()
    })
  })

  describe('Form Submission', () => {
    it('should not submit if validation fails', async () => {
      // Arrange
      const onSubmit = vi.fn()
      const { result } = renderHook(() => useBookingForm({ onSubmit }))

      // Act
      await act(async () => {
        await result.current.handleSubmit()
      })

      // Assert
      expect(onSubmit).not.toHaveBeenCalled()
      expect(Object.keys(result.current.errors).length).toBeGreaterThan(0)
    })

    it('should submit valid form data', async () => {
      // Arrange
      const onSubmit = vi.fn()
      const formData = {
        customer_id: 'cust-1',
        service_package_id: 'pkg-1',
        booking_date: '2025-12-01',
        start_time: '10:00',
        address: '123 Main St',
        city: 'Bangkok',
        total_price: 1000,
      }

      const { result } = renderHook(() =>
        useBookingForm({
          initialData: formData,
          onSubmit,
        })
      )

      // Act
      await act(async () => {
        await result.current.handleSubmit()
      })

      // Assert
      expect(onSubmit).toHaveBeenCalledWith(formData)
    })

    it('should set isSubmitting during submission', async () => {
      // Arrange
      let resolveSubmission: () => void
      const submissionPromise = new Promise<void>((resolve) => {
        resolveSubmission = resolve
      })

      const onSubmit = vi.fn().mockImplementation(() => submissionPromise)

      const formData = {
        customer_id: 'cust-1',
        service_package_id: 'pkg-1',
        booking_date: '2025-12-01',
        start_time: '10:00',
        address: '123 Main St',
        city: 'Bangkok',
        total_price: 1000,
      }

      const { result } = renderHook(() =>
        useBookingForm({
          initialData: formData,
          onSubmit,
        })
      )

      // Act - Start submission without awaiting
      act(() => {
        result.current.handleSubmit()
      })

      // Assert - Should be submitting
      await waitFor(() => {
        expect(result.current.isSubmitting).toBe(true)
      })

      // Complete submission
      act(() => {
        resolveSubmission!()
      })

      // Assert - Should be done
      await waitFor(() => {
        expect(result.current.isSubmitting).toBe(false)
      })
    })

    it('should handle submission errors', async () => {
      // Arrange
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

      const error = new Error('Submission failed')
      const onSubmit = vi.fn().mockRejectedValue(error)

      const formData = {
        customer_id: 'cust-1',
        service_package_id: 'pkg-1',
        booking_date: '2025-12-01',
        start_time: '10:00',
        address: '123 Main St',
        city: 'Bangkok',
        total_price: 1000,
      }

      const { result } = renderHook(() =>
        useBookingForm({
          initialData: formData,
          onSubmit,
        })
      )

      // Act
      await act(async () => {
        await result.current.handleSubmit()
      })

      // Assert
      expect(result.current.errors.submit).toBe('Submission failed')
      expect(result.current.isSubmitting).toBe(false)

      consoleErrorSpy.mockRestore()
    })

    it('should handle non-Error submission failures', async () => {
      // Arrange
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

      const onSubmit = vi.fn().mockRejectedValue('String error')

      const formData = {
        customer_id: 'cust-1',
        service_package_id: 'pkg-1',
        booking_date: '2025-12-01',
        start_time: '10:00',
        address: '123 Main St',
        city: 'Bangkok',
        total_price: 1000,
      }

      const { result } = renderHook(() =>
        useBookingForm({
          initialData: formData,
          onSubmit,
        })
      )

      // Act
      await act(async () => {
        await result.current.handleSubmit()
      })

      // Assert
      expect(result.current.errors.submit).toBe('Submission failed')

      consoleErrorSpy.mockRestore()
    })
  })

  describe('Form Reset', () => {
    it('should reset to empty state', () => {
      // Arrange
      const { result } = renderHook(() => useBookingForm())

      act(() => {
        result.current.setValues({
          full_name: 'John Doe',
          email: 'john@example.com',
        })
        result.current.setErrors({ full_name: 'Error' })
      })

      // Act
      act(() => {
        result.current.reset()
      })

      // Assert
      expect(result.current.formData).toEqual({})
      expect(result.current.errors).toEqual({})
      expect(result.current.isSubmitting).toBe(false)
    })

    it('should reset to initial data', () => {
      // Arrange
      const initialData = {
        full_name: 'Jane Doe',
        email: 'jane@example.com',
      }

      const { result } = renderHook(() =>
        useBookingForm({ initialData })
      )

      act(() => {
        result.current.setValues({ full_name: 'Different Name' })
      })

      // Act
      act(() => {
        result.current.reset()
      })

      // Assert
      expect(result.current.formData).toEqual(initialData)
    })
  })

  describe('Manual Error Setting', () => {
    it('should allow setting errors manually', () => {
      // Arrange
      const { result } = renderHook(() => useBookingForm())

      // Act
      act(() => {
        result.current.setErrors({
          custom_field: 'Custom error message',
        })
      })

      // Assert
      expect(result.current.errors.custom_field).toBe('Custom error message')
    })

    it('should overwrite existing errors', () => {
      // Arrange
      const { result } = renderHook(() => useBookingForm())

      act(() => {
        result.current.setErrors({ field1: 'Error 1' })
      })

      // Act
      act(() => {
        result.current.setErrors({ field2: 'Error 2' })
      })

      // Assert
      expect(result.current.errors).toEqual({ field2: 'Error 2' })
    })
  })

  describe('Complete Form Flow', () => {
    it('should handle complete booking creation flow', async () => {
      // Arrange
      const onSubmit = vi.fn()
      const { result } = renderHook(() => useBookingForm({ onSubmit }))

      // Act - Fill in all required fields
      act(() => {
        result.current.setValues({
          full_name: 'John Doe',
          email: 'john@example.com',
          phone: '08123456789',
          service_package_id: 'pkg-1',
          booking_date: '2025-12-01',
          start_time: '10:00',
          address: '123 Main St',
          city: 'Bangkok',
          state: 'Bangkok',
          zip_code: '10100',
          total_price: 1500,
        })
      })

      // Validate
      act(() => result.current.validate())

      // Submit
      await act(async () => {
        await result.current.handleSubmit()
      })

      // Assert
      expect(Object.keys(result.current.errors).length).toBe(0)
      expect(onSubmit).toHaveBeenCalled()
    })
  })
})
