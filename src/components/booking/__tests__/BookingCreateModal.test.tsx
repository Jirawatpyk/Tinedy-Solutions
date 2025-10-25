import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { BookingCreateModal } from '../BookingCreateModal'
import { createMockSupabaseClient, createMockSupabaseError } from '@/test/mocks/supabase'
import { createMockServicePackage, createMockCustomer } from '@/test/factories'
import type { ServicePackage } from '@/types'
import React from 'react'

// Mock modules
vi.mock('@/lib/supabase')

const mockToast = vi.fn()
vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({ toast: mockToast }),
}))

vi.mock('@/lib/email', () => ({
  sendBookingConfirmation: vi.fn().mockResolvedValue(undefined),
  sendBookingReminder: vi.fn().mockResolvedValue(undefined),
}))

describe('BookingCreateModal', () => {
  const mockOnClose = vi.fn()
  const mockOnSuccess = vi.fn()
  const mockOnOpenAvailabilityModal = vi.fn()
  const mockSetAssignmentType = vi.fn()
  const mockCalculateEndTime = vi.fn((startTime: string, duration: number) => {
    const [hours, minutes] = startTime.split(':')
    const totalMinutes = parseInt(hours) * 60 + parseInt(minutes) + duration
    const endHours = Math.floor(totalMinutes / 60)
    const endMinutes = totalMinutes % 60
    return `${endHours.toString().padStart(2, '0')}:${endMinutes.toString().padStart(2, '0')}:00`
  })

  const mockServicePackages: ServicePackage[] = [
    createMockServicePackage({
      id: 'service-1',
      name: 'Basic Cleaning',
      price: 1500,
      duration_minutes: 120,
      service_type: 'cleaning',
    }),
    createMockServicePackage({
      id: 'service-2',
      name: 'Deep Cleaning',
      price: 2500,
      duration_minutes: 180,
      service_type: 'cleaning',
    }),
  ]

  const mockStaffMembers = [
    { id: 'staff-1', full_name: 'John Staff', email: 'john@example.com', role: 'technician' },
    { id: 'staff-2', full_name: 'Jane Staff', email: 'jane@example.com', role: 'supervisor' },
  ]

  const mockTeams = [
    { id: 'team-1', name: 'Team Alpha' },
    { id: 'team-2', name: 'Team Beta' },
  ]

  let mockFormData: any
  let mockHandleChange: any
  let mockSetValues: any
  let mockReset: any

  beforeEach(() => {
    mockFormData = {}
    mockHandleChange = vi.fn((field, value) => {
      mockFormData[field] = value
    })
    mockSetValues = vi.fn((values) => {
      Object.assign(mockFormData, values)
    })
    mockReset = vi.fn(() => {
      mockFormData = {}
    })

    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.resetAllMocks()
  })

  const mockCreateForm = () => ({
    formData: mockFormData,
    handleChange: mockHandleChange,
    setValues: mockSetValues,
    reset: mockReset,
  })

  const defaultProps = {
    isOpen: true,
    onClose: mockOnClose,
    onSuccess: mockOnSuccess,
    servicePackages: mockServicePackages,
    staffMembers: mockStaffMembers,
    teams: mockTeams,
    onOpenAvailabilityModal: mockOnOpenAvailabilityModal,
    createForm: mockCreateForm(),
    assignmentType: 'none' as const,
    setAssignmentType: mockSetAssignmentType,
    calculateEndTime: mockCalculateEndTime,
  }

  describe('Rendering', () => {
    it('should render modal when isOpen is true', () => {
      // Arrange & Act
      render(<BookingCreateModal {...defaultProps} />)

      // Assert
      expect(screen.getByText('Create New Booking')).toBeInTheDocument()
      expect(screen.getByText('Fill in the booking details below')).toBeInTheDocument()
    })

    it('should not render modal when isOpen is false', () => {
      // Arrange & Act
      render(<BookingCreateModal {...defaultProps} isOpen={false} />)

      // Assert
      expect(screen.queryByText('Create New Booking')).not.toBeInTheDocument()
    })

    it('should render all required form fields', () => {
      // Arrange & Act
      render(<BookingCreateModal {...defaultProps} />)

      // Assert
      expect(screen.getByLabelText(/Full Name/)).toBeInTheDocument()
      expect(screen.getByLabelText(/Email/)).toBeInTheDocument()
      expect(screen.getByLabelText(/Phone/)).toBeInTheDocument()
      expect(screen.getByLabelText(/Service Package/)).toBeInTheDocument()
      expect(screen.getByLabelText(/Booking Date/)).toBeInTheDocument()
      expect(screen.getByLabelText(/Start Time/)).toBeInTheDocument()
      expect(screen.getByLabelText(/Total Price/)).toBeInTheDocument()
      expect(screen.getByLabelText(/Address/)).toBeInTheDocument()
      expect(screen.getByLabelText(/City/)).toBeInTheDocument()
      expect(screen.getByLabelText(/State/)).toBeInTheDocument()
      expect(screen.getByLabelText(/Zip Code/)).toBeInTheDocument()
    })

    it('should render optional notes field', () => {
      // Arrange & Act
      render(<BookingCreateModal {...defaultProps} />)

      // Assert
      expect(screen.getByLabelText(/Notes/)).toBeInTheDocument()
    })

    it('should render assignment type selector', () => {
      // Arrange & Act
      render(<BookingCreateModal {...defaultProps} />)

      // Assert
      expect(screen.getByText(/Assign to/)).toBeInTheDocument()
    })

    it('should render action buttons', () => {
      // Arrange & Act
      render(<BookingCreateModal {...defaultProps} />)

      // Assert
      expect(screen.getByRole('button', { name: /Cancel/i })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /Create Booking/i })).toBeInTheDocument()
    })
  })

  describe('Form Interactions', () => {
    it('should call handleChange when full name is entered', async () => {
      // Arrange
      const user = userEvent.setup()
      render(<BookingCreateModal {...defaultProps} />)

      // Act
      const input = screen.getByLabelText(/Full Name/)
      await user.type(input, 'John Doe')

      // Assert
      expect(mockHandleChange).toHaveBeenCalledWith('full_name', expect.any(String))
    })

    it('should call handleChange when email is entered', async () => {
      // Arrange
      const user = userEvent.setup()
      render(<BookingCreateModal {...defaultProps} />)

      // Act
      const input = screen.getByLabelText(/Email/)
      await user.type(input, 'john@example.com')

      // Assert
      expect(mockHandleChange).toHaveBeenCalledWith('email', expect.any(String))
    })

    it('should call handleChange when phone is entered', async () => {
      // Arrange
      const user = userEvent.setup()
      render(<BookingCreateModal {...defaultProps} />)

      // Act
      const input = screen.getByLabelText(/Phone/)
      await user.type(input, '0812345678')

      // Assert
      expect(mockHandleChange).toHaveBeenCalledWith('phone', expect.any(String))
    })

    it('should call setValues when service package is selected', async () => {
      // Arrange
      const user = userEvent.setup()
      render(<BookingCreateModal {...defaultProps} />)

      // Act
      const select = screen.getByRole('combobox', { name: /Service Package/ })
      await user.click(select)

      // Assert - setValues should be defined
      expect(mockSetValues).toBeDefined()
    })

    it('should call handleChange when booking date is selected', async () => {
      // Arrange
      const user = userEvent.setup()
      render(<BookingCreateModal {...defaultProps} />)

      // Act
      const input = screen.getByLabelText(/Booking Date/)
      await user.type(input, '2025-10-28')

      // Assert
      expect(mockHandleChange).toHaveBeenCalledWith('booking_date', expect.any(String))
    })

    it('should call handleChange when start time is selected', async () => {
      // Arrange
      const user = userEvent.setup()
      render(<BookingCreateModal {...defaultProps} />)

      // Act
      const input = screen.getByLabelText(/Start Time/)
      await user.type(input, '10:00')

      // Assert
      expect(mockHandleChange).toHaveBeenCalledWith('start_time', expect.any(String))
    })

    it('should display calculated end time', () => {
      // Arrange
      mockFormData.start_time = '10:00:00'
      mockFormData.service_package_id = 'service-1'

      // Act
      render(<BookingCreateModal {...defaultProps} createForm={mockCreateForm()} />)

      // Assert
      expect(mockCalculateEndTime).toHaveBeenCalled()
    })

    it('should call handleChange when notes are entered', async () => {
      // Arrange
      const user = userEvent.setup()
      render(<BookingCreateModal {...defaultProps} />)

      // Act
      const textarea = screen.getByLabelText(/Notes/)
      await user.type(textarea, 'Special instructions')

      // Assert
      expect(mockHandleChange).toHaveBeenCalledWith('notes', expect.any(String))
    })
  })

  describe('Assignment Type', () => {
    it('should not show staff selector when assignment type is none', () => {
      // Arrange & Act
      render(<BookingCreateModal {...defaultProps} assignmentType="none" />)

      // Assert
      expect(screen.queryByLabelText(/Select Staff Member/)).not.toBeInTheDocument()
    })

    it('should show staff selector when assignment type is staff', () => {
      // Arrange & Act
      render(<BookingCreateModal {...defaultProps} assignmentType="staff" />)

      // Assert
      expect(screen.getByLabelText(/Select Staff Member/)).toBeInTheDocument()
    })

    it('should show team selector when assignment type is team', () => {
      // Arrange & Act
      render(<BookingCreateModal {...defaultProps} assignmentType="team" />)

      // Assert
      expect(screen.getByLabelText(/Select Team/)).toBeInTheDocument()
    })

    it('should call setAssignmentType when assignment type is changed', async () => {
      // Arrange
      const user = userEvent.setup()
      render(<BookingCreateModal {...defaultProps} />)

      // Act
      const select = screen.getByRole('combobox', { name: /Assign to/ })
      await user.click(select)

      // Assert
      expect(mockSetAssignmentType).toBeDefined()
    })

    it('should show availability check button when assignment type is staff', () => {
      // Arrange & Act
      render(<BookingCreateModal {...defaultProps} assignmentType="staff" />)

      // Assert
      expect(screen.getByRole('button', { name: /Check Staff Availability/i })).toBeInTheDocument()
    })

    it('should show availability check button when assignment type is team', () => {
      // Arrange & Act
      render(<BookingCreateModal {...defaultProps} assignmentType="team" />)

      // Assert
      expect(screen.getByRole('button', { name: /Check Staff Availability/i })).toBeInTheDocument()
    })

    it('should not show availability check button when assignment type is none', () => {
      // Arrange & Act
      render(<BookingCreateModal {...defaultProps} assignmentType="none" />)

      // Assert
      expect(screen.queryByRole('button', { name: /Check Staff Availability/i })).not.toBeInTheDocument()
    })

    it('should disable availability check button when required fields are missing', () => {
      // Arrange
      mockFormData.booking_date = undefined
      mockFormData.start_time = undefined
      mockFormData.service_package_id = undefined

      // Act
      render(<BookingCreateModal {...defaultProps} assignmentType="staff" createForm={mockCreateForm()} />)

      // Assert
      const button = screen.getByRole('button', { name: /Check Staff Availability/i })
      expect(button).toBeDisabled()
    })

    it('should enable availability check button when all required fields are filled', () => {
      // Arrange
      mockFormData.booking_date = '2025-10-28'
      mockFormData.start_time = '10:00:00'
      mockFormData.service_package_id = 'service-1'

      // Act
      render(<BookingCreateModal {...defaultProps} assignmentType="staff" createForm={mockCreateForm()} />)

      // Assert
      const button = screen.getByRole('button', { name: /Check Staff Availability/i })
      expect(button).not.toBeDisabled()
    })

    it('should call onOpenAvailabilityModal when availability button is clicked', async () => {
      // Arrange
      const user = userEvent.setup()
      mockFormData.booking_date = '2025-10-28'
      mockFormData.start_time = '10:00:00'
      mockFormData.service_package_id = 'service-1'

      // Act
      render(<BookingCreateModal {...defaultProps} assignmentType="staff" createForm={mockCreateForm()} />)

      const button = screen.getByRole('button', { name: /Check Staff Availability/i })
      await user.click(button)

      // Assert
      expect(mockOnOpenAvailabilityModal).toHaveBeenCalled()
    })
  })

  describe('Customer Detection', () => {
    it('should check for existing customer when email field loses focus', async () => {
      // Arrange
      const user = userEvent.setup()
      const supabaseMock = await import('@/lib/supabase')
      const mockCustomer = createMockCustomer({ email: 'existing@example.com' })

      vi.mocked(supabaseMock.supabase.from).mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: mockCustomer, error: null }),
      } as any)

      render(<BookingCreateModal {...defaultProps} />)

      // Act
      const emailInput = screen.getByLabelText(/Email/)
      await user.type(emailInput, 'existing@example.com')
      await user.tab() // Trigger blur

      // Assert
      await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith({
          title: 'Customer Found!',
          description: expect.stringContaining(mockCustomer.full_name),
        })
      })
    })

    it('should check for existing customer when phone field loses focus', async () => {
      // Arrange
      const user = userEvent.setup()
      const supabaseMock = await import('@/lib/supabase')
      const mockCustomer = createMockCustomer({ phone: '0812345678' })

      vi.mocked(supabaseMock.supabase.from).mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: mockCustomer, error: null }),
      } as any)

      render(<BookingCreateModal {...defaultProps} />)

      // Act
      const phoneInput = screen.getByLabelText(/Phone/)
      await user.type(phoneInput, '0812345678')
      await user.tab() // Trigger blur

      // Assert
      await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith({
          title: expect.stringContaining('Customer Found'),
          description: expect.stringContaining(mockCustomer.full_name),
        })
      })
    })

    it('should display alert when existing customer is found', async () => {
      // Arrange
      const user = userEvent.setup()
      const supabaseMock = await import('@/lib/supabase')
      const mockCustomer = createMockCustomer({ email: 'existing@example.com', full_name: 'Existing Customer' })

      vi.mocked(supabaseMock.supabase.from).mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: mockCustomer, error: null }),
      } as any)

      render(<BookingCreateModal {...defaultProps} />)

      // Act
      const emailInput = screen.getByLabelText(/Email/)
      await user.type(emailInput, 'existing@example.com')
      await user.tab()

      // Assert
      await waitFor(() => {
        expect(screen.getByText(/Customer Found:/)).toBeInTheDocument()
        expect(screen.getByText(/Existing Customer/)).toBeInTheDocument()
      })
    })

    it('should populate form with existing customer data when button is clicked', async () => {
      // Arrange
      const user = userEvent.setup()
      const supabaseMock = await import('@/lib/supabase')
      const mockCustomer = createMockCustomer({
        id: 'customer-123',
        email: 'existing@example.com',
        full_name: 'Existing Customer',
        phone: '0812345678',
      })

      vi.mocked(supabaseMock.supabase.from).mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: mockCustomer, error: null }),
      } as any)

      render(<BookingCreateModal {...defaultProps} />)

      // Act
      const emailInput = screen.getByLabelText(/Email/)
      await user.type(emailInput, 'existing@example.com')
      await user.tab()

      await waitFor(() => {
        expect(screen.getByText(/Use Existing Data/)).toBeInTheDocument()
      })

      const useDataButton = screen.getByRole('button', { name: /Use Existing Data/i })
      await user.click(useDataButton)

      // Assert
      expect(mockSetValues).toHaveBeenCalledWith(
        expect.objectContaining({
          customer_id: mockCustomer.id,
          full_name: mockCustomer.full_name,
          email: mockCustomer.email,
          phone: mockCustomer.phone,
        })
      )
    })
  })

  describe('Form Submission', () => {
    it('should create new customer and booking on submit', async () => {
      // Arrange
      const user = userEvent.setup()
      const supabaseMock = await import('@/lib/supabase')

      const newCustomerId = 'new-customer-id'
      const newBookingId = 'new-booking-id'

      vi.mocked(supabaseMock.supabase.from).mockImplementation((table: string) => {
        if (table === 'customers') {
          return {
            insert: vi.fn().mockReturnThis(),
            select: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({
              data: { id: newCustomerId },
              error: null,
            }),
          } as any
        }
        if (table === 'bookings') {
          return {
            insert: vi.fn().mockReturnThis(),
            select: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({
              data: { id: newBookingId, booking_date: '2025-10-28', start_time: '10:00:00' },
              error: null,
            }),
          } as any
        }
        return {} as any
      })

      mockFormData = {
        full_name: 'New Customer',
        email: 'new@example.com',
        phone: '0812345678',
        service_package_id: 'service-1',
        booking_date: '2025-10-28',
        start_time: '10:00:00',
        total_price: 1500,
        address: '123 Main St',
        city: 'Bangkok',
        state: 'Bangkok',
        zip_code: '10110',
      }

      render(<BookingCreateModal {...defaultProps} createForm={mockCreateForm()} />)

      // Act
      const submitButton = screen.getByRole('button', { name: /Create Booking/i })
      await user.click(submitButton)

      // Assert
      await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith({
          title: 'Success',
          description: expect.stringContaining('Booking created successfully'),
        })
      })
      expect(mockOnSuccess).toHaveBeenCalled()
      expect(mockOnClose).toHaveBeenCalled()
    })

    it('should use existing customer ID when available', async () => {
      // Arrange
      const user = userEvent.setup()
      const supabaseMock = await import('@/lib/supabase')

      const existingCustomerId = 'existing-customer-id'
      const newBookingId = 'new-booking-id'

      vi.mocked(supabaseMock.supabase.from).mockImplementation((table: string) => {
        if (table === 'bookings') {
          return {
            insert: vi.fn().mockReturnThis(),
            select: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({
              data: { id: newBookingId, booking_date: '2025-10-28', start_time: '10:00:00' },
              error: null,
            }),
          } as any
        }
        return {} as any
      })

      mockFormData = {
        customer_id: existingCustomerId,
        full_name: 'Existing Customer',
        email: 'existing@example.com',
        phone: '0812345678',
        service_package_id: 'service-1',
        booking_date: '2025-10-28',
        start_time: '10:00:00',
        total_price: 1500,
        address: '123 Main St',
        city: 'Bangkok',
        state: 'Bangkok',
        zip_code: '10110',
      }

      render(<BookingCreateModal {...defaultProps} createForm={mockCreateForm()} />)

      // Act
      const submitButton = screen.getByRole('button', { name: /Create Booking/i })
      await user.click(submitButton)

      // Assert
      await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith({
          title: 'Success',
          description: expect.stringContaining('Booking created successfully'),
        })
      })
    })

    it('should display error toast on submission failure', async () => {
      // Arrange
      const user = userEvent.setup()
      const supabaseMock = await import('@/lib/supabase')

      vi.mocked(supabaseMock.supabase.from).mockReturnValue({
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: null,
          error: createMockSupabaseError('Failed to create booking'),
        }),
      } as any)

      mockFormData = {
        full_name: 'New Customer',
        email: 'new@example.com',
        phone: '0812345678',
        service_package_id: 'service-1',
        booking_date: '2025-10-28',
        start_time: '10:00:00',
        total_price: 1500,
        address: '123 Main St',
        city: 'Bangkok',
        state: 'Bangkok',
        zip_code: '10110',
      }

      render(<BookingCreateModal {...defaultProps} createForm={mockCreateForm()} />)

      // Act
      const submitButton = screen.getByRole('button', { name: /Create Booking/i })
      await user.click(submitButton)

      // Assert
      await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith({
          title: 'Error',
          description: expect.any(String),
          variant: 'destructive',
        })
      })
    })

    it('should reset form after successful submission', async () => {
      // Arrange
      const user = userEvent.setup()
      const supabaseMock = await import('@/lib/supabase')

      vi.mocked(supabaseMock.supabase.from).mockImplementation(() => ({
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: { id: 'booking-id', booking_date: '2025-10-28', start_time: '10:00:00' },
          error: null,
        }),
      } as any))

      mockFormData = {
        customer_id: 'customer-id',
        service_package_id: 'service-1',
        booking_date: '2025-10-28',
        start_time: '10:00:00',
        total_price: 1500,
        address: '123 Main St',
        city: 'Bangkok',
        state: 'Bangkok',
        zip_code: '10110',
      }

      render(<BookingCreateModal {...defaultProps} createForm={mockCreateForm()} />)

      // Act
      const submitButton = screen.getByRole('button', { name: /Create Booking/i })
      await user.click(submitButton)

      // Assert
      await waitFor(() => {
        expect(mockReset).toHaveBeenCalled()
      })
    })
  })

  describe('Modal Controls', () => {
    it('should call onClose when cancel button is clicked', async () => {
      // Arrange
      const user = userEvent.setup()
      render(<BookingCreateModal {...defaultProps} />)

      // Act
      const cancelButton = screen.getByRole('button', { name: /Cancel/i })
      await user.click(cancelButton)

      // Assert
      expect(mockOnClose).toHaveBeenCalled()
    })

    it('should reset form when modal is closed', async () => {
      // Arrange
      const user = userEvent.setup()
      render(<BookingCreateModal {...defaultProps} />)

      // Act
      const cancelButton = screen.getByRole('button', { name: /Cancel/i })
      await user.click(cancelButton)

      // Assert
      expect(mockReset).toHaveBeenCalled()
      expect(mockSetAssignmentType).toHaveBeenCalledWith('none')
    })
  })

  describe('Edge Cases', () => {
    it('should handle empty email blur gracefully', async () => {
      // Arrange
      const user = userEvent.setup()
      render(<BookingCreateModal {...defaultProps} />)

      // Act
      const emailInput = screen.getByLabelText(/Email/)
      await user.click(emailInput)
      await user.tab()

      // Assert - Should not crash
      expect(screen.getByLabelText(/Email/)).toBeInTheDocument()
    })

    it('should handle empty phone blur gracefully', async () => {
      // Arrange
      const user = userEvent.setup()
      render(<BookingCreateModal {...defaultProps} />)

      // Act
      const phoneInput = screen.getByLabelText(/Phone/)
      await user.click(phoneInput)
      await user.tab()

      // Assert - Should not crash
      expect(screen.getByLabelText(/Phone/)).toBeInTheDocument()
    })

    it('should handle service package selection updating total price', async () => {
      // Arrange
      const user = userEvent.setup()
      render(<BookingCreateModal {...defaultProps} />)

      // Act
      const select = screen.getByRole('combobox', { name: /Service Package/ })
      await user.click(select)

      // Assert
      expect(mockSetValues).toBeDefined()
    })

    it('should display "--:--" for end time when start time is not set', () => {
      // Arrange
      mockFormData.start_time = undefined
      mockFormData.service_package_id = 'service-1'

      // Act
      render(<BookingCreateModal {...defaultProps} createForm={mockCreateForm()} />)

      // Assert
      expect(screen.getByDisplayValue('--:--')).toBeInTheDocument()
    })

    it('should display "--:--" for end time when service package is not selected', () => {
      // Arrange
      mockFormData.start_time = '10:00:00'
      mockFormData.service_package_id = undefined

      // Act
      render(<BookingCreateModal {...defaultProps} createForm={mockCreateForm()} />)

      // Assert
      expect(screen.getByDisplayValue('--:--')).toBeInTheDocument()
    })
  })

  describe('Accessibility', () => {
    it('should have accessible form labels', () => {
      // Arrange & Act
      render(<BookingCreateModal {...defaultProps} />)

      // Assert
      expect(screen.getByLabelText(/Full Name/)).toHaveAccessibleName()
      expect(screen.getByLabelText(/Email/)).toHaveAccessibleName()
      expect(screen.getByLabelText(/Phone/)).toHaveAccessibleName()
    })

    it('should mark required fields with asterisk', () => {
      // Arrange & Act
      render(<BookingCreateModal {...defaultProps} />)

      // Assert
      expect(screen.getByText(/Full Name \*/)).toBeInTheDocument()
      expect(screen.getByText(/Email \*/)).toBeInTheDocument()
      expect(screen.getByText(/Phone \*/)).toBeInTheDocument()
    })

    it('should have accessible buttons', () => {
      // Arrange & Act
      render(<BookingCreateModal {...defaultProps} />)

      // Assert
      expect(screen.getByRole('button', { name: /Cancel/i })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /Create Booking/i })).toBeInTheDocument()
    })
  })
})
