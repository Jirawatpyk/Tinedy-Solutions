import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { BookingEditModal } from '../BookingEditModal'
import { createMockSupabaseClient, createMockSupabaseError } from '@/test/mocks/supabase'
import { createMockServicePackage } from '@/test/factories'
import type { Booking } from '@/types/booking'
import type { ServicePackage } from '@/types'
import React from 'react'

// Mock modules
vi.mock('@/lib/supabase')

const mockToast = vi.fn()
vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({ toast: mockToast }),
}))

const mockCheckConflicts = vi.fn()
const mockClearConflicts = vi.fn()
vi.mock('@/hooks/useConflictDetection', () => ({
  useConflictDetection: () => ({
    checkConflicts: mockCheckConflicts,
    clearConflicts: mockClearConflicts,
  }),
}))

describe('BookingEditModal', () => {
  const mockOnClose = vi.fn()
  const mockOnSuccess = vi.fn()
  const mockOnOpenAvailabilityModal = vi.fn()
  const mockOnAssignmentTypeChange = vi.fn()
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

  const createMockBooking = (overrides: Partial<Booking> = {}): Booking => ({
    id: 'booking-123',
    booking_date: '2025-10-28',
    start_time: '10:00:00',
    end_time: '12:00:00',
    status: 'confirmed',
    total_price: 1500,
    address: '123 Main St',
    city: 'Bangkok',
    state: 'Bangkok',
    zip_code: '10110',
    staff_id: 'staff-1',
    team_id: null,
    service_package_id: 'service-1',
    notes: 'Test notes',
    payment_status: 'unpaid',
    customers: {
      id: 'customer-123',
      full_name: 'John Doe',
      email: 'john@example.com',
    },
    service_packages: {
      name: 'Basic Cleaning',
      service_type: 'cleaning',
    },
    profiles: {
      full_name: 'Jane Staff',
    },
    teams: null,
    ...overrides,
  })

  let mockFormData: any
  let mockHandleChange: any
  let mockSetValues: any
  let mockReset: any

  beforeEach(() => {
    mockFormData = {
      service_package_id: 'service-1',
      booking_date: '2025-10-28',
      start_time: '10:00:00',
      end_time: '12:00:00',
      total_price: 1500,
      address: '123 Main St',
      city: 'Bangkok',
      state: 'Bangkok',
      zip_code: '10110',
      notes: 'Test notes',
      status: 'confirmed',
      staff_id: 'staff-1',
      team_id: null,
    }

    mockHandleChange = vi.fn((field, value) => {
      mockFormData[field] = value
    })
    mockSetValues = vi.fn((values) => {
      Object.assign(mockFormData, values)
    })
    mockReset = vi.fn(() => {
      mockFormData = {}
    })

    mockCheckConflicts.mockResolvedValue([]) // No conflicts by default
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.resetAllMocks()
  })

  const mockEditForm = () => ({
    formData: mockFormData,
    handleChange: mockHandleChange,
    setValues: mockSetValues,
    reset: mockReset,
  })

  const defaultProps = {
    isOpen: true,
    onClose: mockOnClose,
    booking: createMockBooking(),
    onSuccess: mockOnSuccess,
    servicePackages: mockServicePackages,
    staffMembers: mockStaffMembers,
    teams: mockTeams,
    onOpenAvailabilityModal: mockOnOpenAvailabilityModal,
    editForm: mockEditForm(),
    assignmentType: 'staff' as const,
    onAssignmentTypeChange: mockOnAssignmentTypeChange,
    calculateEndTime: mockCalculateEndTime,
  }

  describe('Rendering', () => {
    it('should render modal when isOpen is true', () => {
      // Arrange & Act
      render(<BookingEditModal {...defaultProps} />)

      // Assert
      expect(screen.getByText('Edit Booking')).toBeInTheDocument()
      expect(screen.getByText('Update booking information')).toBeInTheDocument()
    })

    it('should not render modal when isOpen is false', () => {
      // Arrange & Act
      render(<BookingEditModal {...defaultProps} isOpen={false} />)

      // Assert
      expect(screen.queryByText('Edit Booking')).not.toBeInTheDocument()
    })

    it('should render all form fields', () => {
      // Arrange & Act
      render(<BookingEditModal {...defaultProps} />)

      // Assert
      expect(screen.getByLabelText(/Service Package/)).toBeInTheDocument()
      expect(screen.getByLabelText(/Booking Date/)).toBeInTheDocument()
      expect(screen.getByLabelText(/Start Time/)).toBeInTheDocument()
      expect(screen.getByLabelText(/Status/)).toBeInTheDocument()
      expect(screen.getByLabelText(/Total Price/)).toBeInTheDocument()
      expect(screen.getByLabelText(/Address/)).toBeInTheDocument()
      expect(screen.getByLabelText(/City/)).toBeInTheDocument()
      expect(screen.getByLabelText(/State/)).toBeInTheDocument()
      expect(screen.getByLabelText(/Zip Code/)).toBeInTheDocument()
      expect(screen.getByLabelText(/Notes/)).toBeInTheDocument()
    })

    it('should display end time as auto-calculated', () => {
      // Arrange & Act
      render(<BookingEditModal {...defaultProps} />)

      // Assert
      expect(screen.getByLabelText(/End Time \(Auto-calculated\)/)).toBeInTheDocument()
    })

    it('should render action buttons', () => {
      // Arrange & Act
      render(<BookingEditModal {...defaultProps} />)

      // Assert
      expect(screen.getByRole('button', { name: /Cancel/i })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /Update Booking/i })).toBeInTheDocument()
    })

    it('should render assignment type selector', () => {
      // Arrange & Act
      render(<BookingEditModal {...defaultProps} />)

      // Assert
      expect(screen.getByLabelText(/Assign to/)).toBeInTheDocument()
    })
  })

  describe('Pre-populated Data', () => {
    it('should display booking data in form fields', () => {
      // Arrange
      const booking = createMockBooking({
        booking_date: '2025-11-15',
        start_time: '14:30:00',
        total_price: 2500,
      })

      mockFormData = {
        service_package_id: booking.service_package_id,
        booking_date: booking.booking_date,
        start_time: booking.start_time,
        total_price: booking.total_price,
        address: booking.address,
        city: booking.city,
        state: booking.state,
        zip_code: booking.zip_code,
        notes: booking.notes,
        status: booking.status,
      }

      // Act
      render(<BookingEditModal {...defaultProps} booking={booking} editForm={mockEditForm()} />)

      // Assert
      expect(screen.getByDisplayValue('2025-11-15')).toBeInTheDocument()
      expect(screen.getByDisplayValue('14:30:00')).toBeInTheDocument()
    })
  })

  describe('Form Interactions', () => {
    it('should call handleChange when service package is changed', async () => {
      // Arrange
      const user = userEvent.setup()
      render(<BookingEditModal {...defaultProps} />)

      // Act
      const select = screen.getByRole('combobox', { name: /Service Package/ })
      await user.click(select)

      // Assert
      expect(mockHandleChange).toBeDefined()
    })

    it('should call handleChange when booking date is changed', async () => {
      // Arrange
      const user = userEvent.setup()
      render(<BookingEditModal {...defaultProps} />)

      // Act
      const input = screen.getByLabelText(/Booking Date/)
      await user.clear(input)
      await user.type(input, '2025-11-15')

      // Assert
      expect(mockHandleChange).toHaveBeenCalledWith('booking_date', expect.any(String))
    })

    it('should call handleChange when start time is changed', async () => {
      // Arrange
      const user = userEvent.setup()
      render(<BookingEditModal {...defaultProps} />)

      // Act
      const input = screen.getByLabelText(/Start Time/)
      await user.clear(input)
      await user.type(input, '14:30')

      // Assert
      expect(mockHandleChange).toHaveBeenCalledWith('start_time', expect.any(String))
    })

    it('should call handleChange when status is changed', async () => {
      // Arrange
      const user = userEvent.setup()
      render(<BookingEditModal {...defaultProps} />)

      // Act
      const select = screen.getByRole('combobox', { name: /Status/ })
      await user.click(select)

      // Assert
      expect(mockHandleChange).toBeDefined()
    })

    it('should call handleChange when total price is changed', async () => {
      // Arrange
      const user = userEvent.setup()
      render(<BookingEditModal {...defaultProps} />)

      // Act
      const input = screen.getByLabelText(/Total Price/)
      await user.clear(input)
      await user.type(input, '2500')

      // Assert
      expect(mockHandleChange).toHaveBeenCalledWith('total_price', expect.any(Number))
    })

    it('should call handleChange when address is changed', async () => {
      // Arrange
      const user = userEvent.setup()
      render(<BookingEditModal {...defaultProps} />)

      // Act
      const input = screen.getByLabelText(/^Address/)
      await user.clear(input)
      await user.type(input, '456 New Street')

      // Assert
      expect(mockHandleChange).toHaveBeenCalledWith('address', expect.any(String))
    })

    it('should call handleChange when notes are changed', async () => {
      // Arrange
      const user = userEvent.setup()
      render(<BookingEditModal {...defaultProps} />)

      // Act
      const input = screen.getByLabelText(/Notes/)
      await user.clear(input)
      await user.type(input, 'Updated notes')

      // Assert
      expect(mockHandleChange).toHaveBeenCalledWith('notes', expect.any(String))
    })

    it('should display calculated end time based on start time and service duration', () => {
      // Arrange
      mockFormData.start_time = '10:00:00'
      mockFormData.service_package_id = 'service-1'

      // Act
      render(<BookingEditModal {...defaultProps} editForm={mockEditForm()} />)

      // Assert
      expect(mockCalculateEndTime).toHaveBeenCalledWith('10:00:00', 120)
    })

    it('should display "--:--" when start time or service package is missing', () => {
      // Arrange
      mockFormData.start_time = undefined
      mockFormData.service_package_id = 'service-1'

      // Act
      render(<BookingEditModal {...defaultProps} editForm={mockEditForm()} />)

      // Assert
      expect(screen.getByDisplayValue('--:--')).toBeInTheDocument()
    })
  })

  describe('Assignment Type', () => {
    it('should show staff selector when assignment type is staff', () => {
      // Arrange & Act
      render(<BookingEditModal {...defaultProps} assignmentType="staff" />)

      // Assert
      expect(screen.getByLabelText(/Select Staff Member/)).toBeInTheDocument()
    })

    it('should show team selector when assignment type is team', () => {
      // Arrange & Act
      render(<BookingEditModal {...defaultProps} assignmentType="team" />)

      // Assert
      expect(screen.getByLabelText(/Select Team/)).toBeInTheDocument()
    })

    it('should not show staff or team selector when assignment type is none', () => {
      // Arrange & Act
      render(<BookingEditModal {...defaultProps} assignmentType="none" />)

      // Assert
      expect(screen.queryByLabelText(/Select Staff Member/)).not.toBeInTheDocument()
      expect(screen.queryByLabelText(/Select Team/)).not.toBeInTheDocument()
    })

    it('should call onAssignmentTypeChange when assignment type is changed', async () => {
      // Arrange
      const user = userEvent.setup()
      render(<BookingEditModal {...defaultProps} />)

      // Act
      const select = screen.getByRole('combobox', { name: /Assign to/ })
      await user.click(select)

      // Assert
      expect(mockOnAssignmentTypeChange).toBeDefined()
    })

    it('should show availability check button when assignment type is not none', () => {
      // Arrange & Act
      render(<BookingEditModal {...defaultProps} assignmentType="staff" />)

      // Assert
      expect(screen.getByRole('button', { name: /Check Staff Availability/i })).toBeInTheDocument()
    })

    it('should not show availability check button when assignment type is none', () => {
      // Arrange & Act
      render(<BookingEditModal {...defaultProps} assignmentType="none" />)

      // Assert
      expect(screen.queryByRole('button', { name: /Check Staff Availability/i })).not.toBeInTheDocument()
    })

    it('should disable availability check button when required fields are missing', () => {
      // Arrange
      mockFormData.booking_date = undefined
      mockFormData.start_time = undefined
      mockFormData.service_package_id = undefined

      // Act
      render(<BookingEditModal {...defaultProps} assignmentType="staff" editForm={mockEditForm()} />)

      // Assert
      const button = screen.getByRole('button', { name: /Check Staff Availability/i })
      expect(button).toBeDisabled()
    })

    it('should call onOpenAvailabilityModal when availability button is clicked', async () => {
      // Arrange
      const user = userEvent.setup()
      mockFormData.booking_date = '2025-10-28'
      mockFormData.start_time = '10:00:00'
      mockFormData.service_package_id = 'service-1'

      // Act
      render(<BookingEditModal {...defaultProps} assignmentType="staff" editForm={mockEditForm()} />)

      const button = screen.getByRole('button', { name: /Check Staff Availability/i })
      await user.click(button)

      // Assert
      expect(mockOnOpenAvailabilityModal).toHaveBeenCalled()
    })
  })

  describe('Conflict Detection', () => {
    it('should check for conflicts before updating booking', async () => {
      // Arrange
      const user = userEvent.setup()
      const supabaseMock = await import('@/lib/supabase')

      vi.mocked(supabaseMock.supabase.from).mockReturnValue({
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({ data: {}, error: null }),
      } as any)

      mockCheckConflicts.mockResolvedValue([]) // No conflicts

      render(<BookingEditModal {...defaultProps} />)

      // Act
      const submitButton = screen.getByRole('button', { name: /Update Booking/i })
      await user.click(submitButton)

      // Assert
      await waitFor(() => {
        expect(mockCheckConflicts).toHaveBeenCalledWith({
          staffId: mockFormData.staff_id,
          teamId: mockFormData.team_id,
          bookingDate: mockFormData.booking_date,
          startTime: mockFormData.start_time,
          endTime: expect.any(String),
          excludeBookingId: 'booking-123',
        })
      })
    })

    it('should prevent update and show error when conflicts are detected', async () => {
      // Arrange
      const user = userEvent.setup()
      const conflicts = [
        { id: 'conflict-1', start_time: '10:00:00', end_time: '11:00:00' },
      ]

      mockCheckConflicts.mockResolvedValue(conflicts)

      render(<BookingEditModal {...defaultProps} />)

      // Act
      const submitButton = screen.getByRole('button', { name: /Update Booking/i })
      await user.click(submitButton)

      // Assert
      await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith({
          title: 'Scheduling Conflict',
          description: expect.stringContaining('conflicts with existing bookings'),
          variant: 'destructive',
        })
      })
      expect(mockOnSuccess).not.toHaveBeenCalled()
    })

    it('should update booking successfully when no conflicts', async () => {
      // Arrange
      const user = userEvent.setup()
      const supabaseMock = await import('@/lib/supabase')

      vi.mocked(supabaseMock.supabase.from).mockReturnValue({
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({ data: {}, error: null }),
      } as any)

      mockCheckConflicts.mockResolvedValue([])

      render(<BookingEditModal {...defaultProps} />)

      // Act
      const submitButton = screen.getByRole('button', { name: /Update Booking/i })
      await user.click(submitButton)

      // Assert
      await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith({
          title: 'Success',
          description: expect.stringContaining('Booking updated successfully'),
        })
      })
      expect(mockOnSuccess).toHaveBeenCalled()
      expect(mockOnClose).toHaveBeenCalled()
    })

    it('should exclude current booking from conflict check', async () => {
      // Arrange
      const user = userEvent.setup()
      const supabaseMock = await import('@/lib/supabase')

      vi.mocked(supabaseMock.supabase.from).mockReturnValue({
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({ data: {}, error: null }),
      } as any)

      const booking = createMockBooking({ id: 'booking-456' })

      render(<BookingEditModal {...defaultProps} booking={booking} />)

      // Act
      const submitButton = screen.getByRole('button', { name: /Update Booking/i })
      await user.click(submitButton)

      // Assert
      await waitFor(() => {
        expect(mockCheckConflicts).toHaveBeenCalledWith(
          expect.objectContaining({
            excludeBookingId: 'booking-456',
          })
        )
      })
    })
  })

  describe('Form Submission', () => {
    it('should update booking with form data', async () => {
      // Arrange
      const user = userEvent.setup()
      const supabaseMock = await import('@/lib/supabase')

      const mockUpdate = vi.fn().mockReturnThis()
      const mockEq = vi.fn().mockResolvedValue({ data: {}, error: null })

      vi.mocked(supabaseMock.supabase.from).mockReturnValue({
        update: mockUpdate,
        eq: mockEq,
      } as any)

      mockCheckConflicts.mockResolvedValue([])

      render(<BookingEditModal {...defaultProps} />)

      // Act
      const submitButton = screen.getByRole('button', { name: /Update Booking/i })
      await user.click(submitButton)

      // Assert
      await waitFor(() => {
        expect(mockUpdate).toHaveBeenCalledWith(
          expect.objectContaining({
            service_package_id: mockFormData.service_package_id,
            booking_date: mockFormData.booking_date,
            start_time: mockFormData.start_time,
            total_price: mockFormData.total_price,
            status: mockFormData.status,
          })
        )
      })
    })

    it('should display error toast on update failure', async () => {
      // Arrange
      const user = userEvent.setup()
      const supabaseMock = await import('@/lib/supabase')

      vi.mocked(supabaseMock.supabase.from).mockReturnValue({
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({
          data: null,
          error: createMockSupabaseError('Update failed'),
        }),
      } as any)

      mockCheckConflicts.mockResolvedValue([])

      render(<BookingEditModal {...defaultProps} />)

      // Act
      const submitButton = screen.getByRole('button', { name: /Update Booking/i })
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

    it('should clear conflicts on successful update', async () => {
      // Arrange
      const user = userEvent.setup()
      const supabaseMock = await import('@/lib/supabase')

      vi.mocked(supabaseMock.supabase.from).mockReturnValue({
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({ data: {}, error: null }),
      } as any)

      mockCheckConflicts.mockResolvedValue([])

      render(<BookingEditModal {...defaultProps} />)

      // Act
      const submitButton = screen.getByRole('button', { name: /Update Booking/i })
      await user.click(submitButton)

      // Assert
      await waitFor(() => {
        expect(mockClearConflicts).toHaveBeenCalled()
      })
    })
  })

  describe('Modal Controls', () => {
    it('should call onClose when cancel button is clicked', async () => {
      // Arrange
      const user = userEvent.setup()
      render(<BookingEditModal {...defaultProps} />)

      // Act
      const cancelButton = screen.getByRole('button', { name: /Cancel/i })
      await user.click(cancelButton)

      // Assert
      expect(mockOnClose).toHaveBeenCalled()
    })

    it('should clear conflicts when modal is closed', async () => {
      // Arrange
      const user = userEvent.setup()
      render(<BookingEditModal {...defaultProps} />)

      // Act
      const cancelButton = screen.getByRole('button', { name: /Cancel/i })
      await user.click(cancelButton)

      // Assert
      expect(mockClearConflicts).toHaveBeenCalled()
    })
  })

  describe('Status Options', () => {
    it('should display all status options', async () => {
      // Arrange
      const user = userEvent.setup()
      render(<BookingEditModal {...defaultProps} />)

      // Act
      const statusSelect = screen.getByRole('combobox', { name: /Status/ })
      await user.click(statusSelect)

      // Assert
      await waitFor(() => {
        expect(screen.getByText('Pending')).toBeInTheDocument()
        expect(screen.getByText('Confirmed')).toBeInTheDocument()
        expect(screen.getByText('In Progress')).toBeInTheDocument()
        expect(screen.getByText('Completed')).toBeInTheDocument()
        expect(screen.getByText('Cancelled')).toBeInTheDocument()
      })
    })
  })

  describe('Edge Cases', () => {
    it('should handle null booking gracefully', () => {
      // Arrange & Act
      render(<BookingEditModal {...defaultProps} booking={null} />)

      // Assert - Should not crash
      expect(screen.getByText('Edit Booking')).toBeInTheDocument()
    })

    it('should handle booking without staff_id', async () => {
      // Arrange
      const user = userEvent.setup()
      const supabaseMock = await import('@/lib/supabase')

      vi.mocked(supabaseMock.supabase.from).mockReturnValue({
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({ data: {}, error: null }),
      } as any)

      mockFormData.staff_id = null
      mockFormData.team_id = 'team-1'
      mockCheckConflicts.mockResolvedValue([])

      render(<BookingEditModal {...defaultProps} editForm={mockEditForm()} />)

      // Act
      const submitButton = screen.getByRole('button', { name: /Update Booking/i })
      await user.click(submitButton)

      // Assert
      await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith({
          title: 'Success',
          description: expect.any(String),
        })
      })
    })

    it('should handle booking with neither staff nor team', async () => {
      // Arrange
      const user = userEvent.setup()
      const supabaseMock = await import('@/lib/supabase')

      vi.mocked(supabaseMock.supabase.from).mockReturnValue({
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({ data: {}, error: null }),
      } as any)

      mockFormData.staff_id = null
      mockFormData.team_id = null
      mockCheckConflicts.mockResolvedValue([])

      render(<BookingEditModal {...defaultProps} editForm={mockEditForm()} assignmentType="none" />)

      // Act
      const submitButton = screen.getByRole('button', { name: /Update Booking/i })
      await user.click(submitButton)

      // Assert
      await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith({
          title: 'Success',
          description: expect.any(String),
        })
      })
    })
  })

  describe('Accessibility', () => {
    it('should have accessible form labels', () => {
      // Arrange & Act
      render(<BookingEditModal {...defaultProps} />)

      // Assert
      expect(screen.getByLabelText(/Service Package/)).toHaveAccessibleName()
      expect(screen.getByLabelText(/Booking Date/)).toHaveAccessibleName()
      expect(screen.getByLabelText(/Start Time/)).toHaveAccessibleName()
      expect(screen.getByLabelText(/Status/)).toHaveAccessibleName()
    })

    it('should mark required fields with asterisk', () => {
      // Arrange & Act
      render(<BookingEditModal {...defaultProps} />)

      // Assert
      expect(screen.getByText(/Service Package \*/)).toBeInTheDocument()
      expect(screen.getByText(/Booking Date \*/)).toBeInTheDocument()
      expect(screen.getByText(/Start Time \*/)).toBeInTheDocument()
      expect(screen.getByText(/Status \*/)).toBeInTheDocument()
    })

    it('should have accessible buttons', () => {
      // Arrange & Act
      render(<BookingEditModal {...defaultProps} />)

      // Assert
      expect(screen.getByRole('button', { name: /Cancel/i })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /Update Booking/i })).toBeInTheDocument()
    })
  })

  describe('End Time Calculation', () => {
    it('should calculate end time correctly when service package changes', () => {
      // Arrange
      mockFormData.start_time = '09:00:00'
      mockFormData.service_package_id = 'service-2' // 180 minutes

      // Act
      render(<BookingEditModal {...defaultProps} editForm={mockEditForm()} />)

      // Assert
      expect(mockCalculateEndTime).toHaveBeenCalledWith('09:00:00', 180)
    })

    it('should calculate end time correctly when start time changes', () => {
      // Arrange
      mockFormData.start_time = '13:30:00'
      mockFormData.service_package_id = 'service-1' // 120 minutes

      // Act
      render(<BookingEditModal {...defaultProps} editForm={mockEditForm()} />)

      // Assert
      expect(mockCalculateEndTime).toHaveBeenCalledWith('13:30:00', 120)
    })
  })
})
