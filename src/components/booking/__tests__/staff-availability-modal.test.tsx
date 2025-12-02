import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { StaffAvailabilityModal } from '../staff-availability-modal'
import { useStaffAvailabilityCheck } from '@/hooks/use-staff-availability-check'
import type { StaffAvailabilityResult, TeamAvailabilityResult } from '@/hooks/use-staff-availability-check'

// Mock the hook
vi.mock('@/hooks/use-staff-availability-check')

describe('StaffAvailabilityModal', () => {
  const mockOnClose = vi.fn()
  const mockOnSelectStaff = vi.fn()
  const mockOnSelectTeam = vi.fn()

  const defaultProps = {
    isOpen: true,
    onClose: mockOnClose,
    assignmentType: 'individual' as const,
    onSelectStaff: mockOnSelectStaff,
    onSelectTeam: mockOnSelectTeam,
    date: '2025-02-15',
    startTime: '10:00',
    endTime: '12:00',
    servicePackageId: 'service-1',
    servicePackageName: 'Deep Cleaning',
    currentAssignedStaffId: undefined,
    currentAssignedTeamId: undefined,
    excludeBookingId: undefined,
  }

  const mockStaffResult: StaffAvailabilityResult = {
    staffId: 'staff-1',
    staffNumber: 'S001',
    fullName: 'John Doe',
    skills: ['Cleaning', 'Deep Cleaning'],
    rating: 4.5,
    isAvailable: true,
    conflicts: [],
    unavailabilityReasons: [],
    score: 85,
    skillMatch: 80,
    jobsToday: 2,
  }

  const mockTeamResult: TeamAvailabilityResult = {
    teamId: 'team-1',
    teamName: 'Team Alpha',
    totalMembers: 3,
    availableMembers: 3,
    members: [
      {
        staffId: 'staff-1',
        fullName: 'John Doe',
        isAvailable: true,
        conflicts: [],
      },
      {
        staffId: 'staff-2',
        fullName: 'Jane Smith',
        isAvailable: true,
        conflicts: [],
      },
      {
        staffId: 'staff-3',
        fullName: 'Bob Johnson',
        isAvailable: true,
        conflicts: [],
      },
    ],
    isFullyAvailable: true,
    score: 90,
    teamMatch: 75,
  }

  beforeEach(() => {
    vi.clearAllMocks()
    // Default mock implementation
    vi.mocked(useStaffAvailabilityCheck).mockReturnValue({
      loading: false,
      staffResults: [],
      teamResults: [],
      serviceType: 'cleaning',
      error: null,
    })
  })

  describe('Rendering Tests', () => {
    it('should render modal when isOpen is true', () => {
      render(<StaffAvailabilityModal {...defaultProps} />)
      expect(screen.getByText(/Check Staff Availability/i)).toBeInTheDocument()
    })

    it('should not render modal when isOpen is false', () => {
      render(<StaffAvailabilityModal {...defaultProps} isOpen={false} />)
      expect(screen.queryByText('Check Staff Availability')).not.toBeInTheDocument()
    })

    it('should display context information correctly', () => {
      render(<StaffAvailabilityModal {...defaultProps} />)
      expect(screen.getByText(/Deep Cleaning/i)).toBeInTheDocument()
      expect(screen.getByText(/10:00/i)).toBeInTheDocument()
      expect(screen.getByText(/12:00/i)).toBeInTheDocument()
    })

    it('should show correct title for individual assignment', () => {
      render(<StaffAvailabilityModal {...defaultProps} assignmentType="individual" />)
      expect(screen.getByText(/Check Staff Availability/i)).toBeInTheDocument()
    })

    it('should show correct title for team assignment', () => {
      render(<StaffAvailabilityModal {...defaultProps} assignmentType="team" />)
      expect(screen.getByText(/Check Team Availability/i)).toBeInTheDocument()
    })

    it('should display service package name when provided', () => {
      render(<StaffAvailabilityModal {...defaultProps} servicePackageName="Premium Cleaning" />)
      expect(screen.getByText(/Premium Cleaning/i)).toBeInTheDocument()
    })

    it('should fallback to service type when service package name not provided', () => {
      vi.mocked(useStaffAvailabilityCheck).mockReturnValue({
        loading: false,
        staffResults: [],
        teamResults: [],
        serviceType: 'training',
        error: null,
      })

      render(<StaffAvailabilityModal {...defaultProps} servicePackageName="" />)
      expect(screen.getByText(/training/i)).toBeInTheDocument()
    })
  })

  describe('Loading State Tests', () => {
    it('should show loading skeletons when loading is true', () => {
      vi.mocked(useStaffAvailabilityCheck).mockReturnValue({
        loading: true,
        staffResults: [],
        teamResults: [],
        serviceType: 'cleaning',
        error: null,
      })

      render(<StaffAvailabilityModal {...defaultProps} />)
      // Skeletons have className h-32, we can check by testing rendering structure
      const skeletons = document.querySelectorAll('.h-32')
      expect(skeletons.length).toBe(3)
    })

    it('should hide loading skeletons when loading is false', () => {
      render(<StaffAvailabilityModal {...defaultProps} />)
      const skeletons = document.querySelectorAll('.h-32')
      expect(skeletons.length).toBe(0)
    })
  })

  describe('Staff Availability Display Tests', () => {
    it('should display available staff in recommended section', () => {
      vi.mocked(useStaffAvailabilityCheck).mockReturnValue({
        loading: false,
        staffResults: [mockStaffResult],
        teamResults: [],
        serviceType: 'cleaning',
        error: null,
      })

      render(<StaffAvailabilityModal {...defaultProps} />)
      expect(screen.getByText(/Recommended \(1\)/i)).toBeInTheDocument()
      expect(screen.getByText('John Doe')).toBeInTheDocument()
      expect(screen.getByText('S001')).toBeInTheDocument()
    })

    it('should display staff with conflicts in partially available section', () => {
      const staffWithConflict: StaffAvailabilityResult = {
        ...mockStaffResult,
        isAvailable: false,
        conflicts: [
          {
            id: 'booking-1',
            bookingDate: '2025-02-15',
            startTime: '10:00',
            endTime: '11:00',
            serviceName: 'Basic Cleaning',
            customerName: 'Alice Brown',
          },
        ],
      }

      vi.mocked(useStaffAvailabilityCheck).mockReturnValue({
        loading: false,
        staffResults: [staffWithConflict],
        teamResults: [],
        serviceType: 'cleaning',
        error: null,
      })

      render(<StaffAvailabilityModal {...defaultProps} />)
      expect(screen.getByText(/Partially Available \(1\)/i)).toBeInTheDocument()
      expect(screen.getByText(/Booking Conflicts \(1\)/i)).toBeInTheDocument()
    })

    it('should display unavailable staff in unavailable section', () => {
      const unavailableStaff: StaffAvailabilityResult = {
        ...mockStaffResult,
        isAvailable: false,
        unavailabilityReasons: [
          {
            reason: 'Day Off',
            startTime: null,
            endTime: null,
            notes: 'Scheduled vacation',
          },
        ],
      }

      vi.mocked(useStaffAvailabilityCheck).mockReturnValue({
        loading: false,
        staffResults: [unavailableStaff],
        teamResults: [],
        serviceType: 'cleaning',
        error: null,
      })

      render(<StaffAvailabilityModal {...defaultProps} />)
      expect(screen.getByText(/Unavailable \(1\)/i)).toBeInTheDocument()
      expect(screen.getByText(/Day Off/i)).toBeInTheDocument()
    })

    it('should display staff skills correctly', () => {
      vi.mocked(useStaffAvailabilityCheck).mockReturnValue({
        loading: false,
        staffResults: [mockStaffResult],
        teamResults: [],
        serviceType: 'cleaning',
        error: null,
      })

      render(<StaffAvailabilityModal {...defaultProps} />)
      const skillBadges = screen.getAllByText(/Cleaning|Deep Cleaning/)
      expect(skillBadges.length).toBeGreaterThan(0)
    })

    it('should display staff rating correctly', () => {
      vi.mocked(useStaffAvailabilityCheck).mockReturnValue({
        loading: false,
        staffResults: [mockStaffResult],
        teamResults: [],
        serviceType: 'cleaning',
        error: null,
      })

      render(<StaffAvailabilityModal {...defaultProps} />)
      expect(screen.getByText('4.5/5')).toBeInTheDocument()
    })

    it('should display "No ratings yet" for staff with zero rating', () => {
      const staffWithNoRating: StaffAvailabilityResult = {
        ...mockStaffResult,
        rating: 0,
      }

      vi.mocked(useStaffAvailabilityCheck).mockReturnValue({
        loading: false,
        staffResults: [staffWithNoRating],
        teamResults: [],
        serviceType: 'cleaning',
        error: null,
      })

      render(<StaffAvailabilityModal {...defaultProps} />)
      expect(screen.getByText('No ratings yet')).toBeInTheDocument()
    })

    it('should display staff score correctly', () => {
      vi.mocked(useStaffAvailabilityCheck).mockReturnValue({
        loading: false,
        staffResults: [mockStaffResult],
        teamResults: [],
        serviceType: 'cleaning',
        error: null,
      })

      render(<StaffAvailabilityModal {...defaultProps} />)
      expect(screen.getByText('85')).toBeInTheDocument()
    })

    it('should display skill match percentage', () => {
      vi.mocked(useStaffAvailabilityCheck).mockReturnValue({
        loading: false,
        staffResults: [mockStaffResult],
        teamResults: [],
        serviceType: 'cleaning',
        error: null,
      })

      render(<StaffAvailabilityModal {...defaultProps} />)
      expect(screen.getByText('80%')).toBeInTheDocument()
    })

    it('should display jobs today count', () => {
      vi.mocked(useStaffAvailabilityCheck).mockReturnValue({
        loading: false,
        staffResults: [mockStaffResult],
        teamResults: [],
        serviceType: 'cleaning',
        error: null,
      })

      render(<StaffAvailabilityModal {...defaultProps} />)
      expect(screen.getByText('2')).toBeInTheDocument()
    })
  })

  describe('Team Availability Display Tests', () => {
    it('should display available teams in recommended section', () => {
      vi.mocked(useStaffAvailabilityCheck).mockReturnValue({
        loading: false,
        staffResults: [],
        teamResults: [mockTeamResult],
        serviceType: 'cleaning',
        error: null,
      })

      render(<StaffAvailabilityModal {...defaultProps} assignmentType="team" />)
      expect(screen.getByText(/Recommended \(1\)/i)).toBeInTheDocument()
      expect(screen.getByText('Team Alpha')).toBeInTheDocument()
    })

    it('should display team member count', () => {
      vi.mocked(useStaffAvailabilityCheck).mockReturnValue({
        loading: false,
        staffResults: [],
        teamResults: [mockTeamResult],
        serviceType: 'cleaning',
        error: null,
      })

      render(<StaffAvailabilityModal {...defaultProps} assignmentType="team" />)
      expect(screen.getByText('3 members')).toBeInTheDocument()
    })

    it('should display team members with availability status', () => {
      vi.mocked(useStaffAvailabilityCheck).mockReturnValue({
        loading: false,
        staffResults: [],
        teamResults: [mockTeamResult],
        serviceType: 'cleaning',
        error: null,
      })

      render(<StaffAvailabilityModal {...defaultProps} assignmentType="team" />)
      expect(screen.getByText('John Doe')).toBeInTheDocument()
      expect(screen.getByText('Jane Smith')).toBeInTheDocument()
      expect(screen.getByText('Bob Johnson')).toBeInTheDocument()
    })

    it('should display partially available teams correctly', () => {
      const partialTeam: TeamAvailabilityResult = {
        ...mockTeamResult,
        availableMembers: 2,
        isFullyAvailable: false,
        members: [
          {
            staffId: 'staff-1',
            fullName: 'John Doe',
            isAvailable: true,
            conflicts: [],
          },
          {
            staffId: 'staff-2',
            fullName: 'Jane Smith',
            isAvailable: true,
            conflicts: [],
          },
          {
            staffId: 'staff-3',
            fullName: 'Bob Johnson',
            isAvailable: false,
            conflicts: [
              {
                id: 'booking-1',
                bookingDate: '2025-02-15',
                startTime: '10:00',
                endTime: '11:00',
                serviceName: 'Training',
                customerName: 'Client X',
              },
            ],
          },
        ],
      }

      vi.mocked(useStaffAvailabilityCheck).mockReturnValue({
        loading: false,
        staffResults: [],
        teamResults: [partialTeam],
        serviceType: 'cleaning',
        error: null,
      })

      render(<StaffAvailabilityModal {...defaultProps} assignmentType="team" />)
      expect(screen.getByText(/Partially Available \(1\)/i)).toBeInTheDocument()
      expect(screen.getByText(/Available Members \(2\/3\)/i)).toBeInTheDocument()
    })

    it('should display team match percentage', () => {
      vi.mocked(useStaffAvailabilityCheck).mockReturnValue({
        loading: false,
        staffResults: [],
        teamResults: [mockTeamResult],
        serviceType: 'cleaning',
        error: null,
      })

      render(<StaffAvailabilityModal {...defaultProps} assignmentType="team" />)
      expect(screen.getByText('75%')).toBeInTheDocument()
    })
  })

  describe('Staff Selection Tests', () => {
    it('should call onSelectStaff when available staff is selected', async () => {
      const user = userEvent.setup()

      vi.mocked(useStaffAvailabilityCheck).mockReturnValue({
        loading: false,
        staffResults: [mockStaffResult],
        teamResults: [],
        serviceType: 'cleaning',
        error: null,
      })

      render(<StaffAvailabilityModal {...defaultProps} />)

      const selectButton = screen.getByRole('button', { name: /select/i })
      await user.click(selectButton)

      expect(mockOnSelectStaff).toHaveBeenCalledWith('staff-1')
      expect(mockOnClose).toHaveBeenCalled()
    })

    it('should show conflict warning when selecting staff with conflicts', async () => {
      const user = userEvent.setup()

      const staffWithConflict: StaffAvailabilityResult = {
        ...mockStaffResult,
        isAvailable: false,
        conflicts: [
          {
            id: 'booking-1',
            bookingDate: '2025-02-15',
            startTime: '10:00',
            endTime: '11:00',
            serviceName: 'Basic Cleaning',
            customerName: 'Alice Brown',
          },
        ],
      }

      vi.mocked(useStaffAvailabilityCheck).mockReturnValue({
        loading: false,
        staffResults: [staffWithConflict],
        teamResults: [],
        serviceType: 'cleaning',
        error: null,
      })

      render(<StaffAvailabilityModal {...defaultProps} />)

      const selectButton = screen.getByRole('button', { name: /select/i })
      await user.click(selectButton)

      await waitFor(() => {
        expect(screen.getByText(/Scheduling Conflict Detected/i)).toBeInTheDocument()
      })
    })

    it('should display conflict details in warning dialog', async () => {
      const user = userEvent.setup()

      const staffWithConflict: StaffAvailabilityResult = {
        ...mockStaffResult,
        isAvailable: false,
        conflicts: [
          {
            id: 'booking-1',
            bookingDate: '2025-02-15',
            startTime: '10:00',
            endTime: '11:00',
            serviceName: 'Basic Cleaning',
            customerName: 'Alice Brown',
          },
        ],
      }

      vi.mocked(useStaffAvailabilityCheck).mockReturnValue({
        loading: false,
        staffResults: [staffWithConflict],
        teamResults: [],
        serviceType: 'cleaning',
        error: null,
      })

      render(<StaffAvailabilityModal {...defaultProps} />)

      const selectButton = screen.getByRole('button', { name: /select/i })
      await user.click(selectButton)

      await waitFor(() => {
        expect(screen.getByText(/Basic Cleaning - Alice Brown/i)).toBeInTheDocument()
      })
    })

    it('should allow continuing despite conflicts', async () => {
      const user = userEvent.setup()

      const staffWithConflict: StaffAvailabilityResult = {
        ...mockStaffResult,
        fullName: 'John Doe',
        isAvailable: false,
        conflicts: [
          {
            id: 'booking-1',
            bookingDate: '2025-02-15',
            startTime: '10:00',
            endTime: '11:00',
            serviceName: 'Basic Cleaning',
            customerName: 'Alice Brown',
          },
        ],
      }

      vi.mocked(useStaffAvailabilityCheck).mockReturnValue({
        loading: false,
        staffResults: [staffWithConflict],
        teamResults: [],
        serviceType: 'cleaning',
        error: null,
      })

      render(<StaffAvailabilityModal {...defaultProps} />)

      const selectButton = screen.getByRole('button', { name: /select/i })
      await user.click(selectButton)

      // Wait for conflict dialog to appear
      await waitFor(() => {
        expect(screen.getByText(/Scheduling Conflict Detected/i)).toBeInTheDocument()
      }, { timeout: 3000 })

      // Find and click the "Continue Anyway" button
      const continueButton = await screen.findByRole('button', { name: /continue anyway/i })
      await user.click(continueButton)

      // Verify the selection was made
      await waitFor(() => {
        expect(mockOnSelectStaff).toHaveBeenCalledWith('staff-1')
        expect(mockOnClose).toHaveBeenCalled()
      })
    })

    it('should allow canceling conflict warning', async () => {
      const user = userEvent.setup()

      const staffWithConflict: StaffAvailabilityResult = {
        ...mockStaffResult,
        isAvailable: false,
        conflicts: [
          {
            id: 'booking-1',
            bookingDate: '2025-02-15',
            startTime: '10:00',
            endTime: '11:00',
            serviceName: 'Basic Cleaning',
            customerName: 'Alice Brown',
          },
        ],
      }

      vi.mocked(useStaffAvailabilityCheck).mockReturnValue({
        loading: false,
        staffResults: [staffWithConflict],
        teamResults: [],
        serviceType: 'cleaning',
        error: null,
      })

      render(<StaffAvailabilityModal {...defaultProps} />)

      const selectButton = screen.getByRole('button', { name: /select/i })
      await user.click(selectButton)

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument()
      })

      const cancelButtons = screen.getAllByRole('button', { name: /cancel/i })
      await user.click(cancelButtons[0])

      expect(mockOnSelectStaff).not.toHaveBeenCalled()
      expect(mockOnClose).not.toHaveBeenCalled()
    })

    it('should show unavailable staff in unavailable section', () => {
      const unavailableStaff: StaffAvailabilityResult = {
        ...mockStaffResult,
        isAvailable: false,
        unavailabilityReasons: [
          {
            reason: 'Day Off',
            startTime: null,
            endTime: null,
            notes: null,
          },
        ],
      }

      vi.mocked(useStaffAvailabilityCheck).mockReturnValue({
        loading: false,
        staffResults: [unavailableStaff],
        teamResults: [],
        serviceType: 'cleaning',
        error: null,
      })

      render(<StaffAvailabilityModal {...defaultProps} />)

      // Unavailable staff should be shown in the "Unavailable" section header
      expect(screen.getByRole('heading', { name: /Unavailable/ })).toBeInTheDocument()
    })

    it('should highlight currently assigned staff', () => {
      vi.mocked(useStaffAvailabilityCheck).mockReturnValue({
        loading: false,
        staffResults: [mockStaffResult],
        teamResults: [],
        serviceType: 'cleaning',
        error: null,
      })

      render(<StaffAvailabilityModal {...defaultProps} currentAssignedStaffId="staff-1" />)

      expect(screen.getByText('Currently Assigned')).toBeInTheDocument()
    })
  })

  describe('Team Selection Tests', () => {
    it('should call onSelectTeam when available team is selected', async () => {
      const user = userEvent.setup()

      vi.mocked(useStaffAvailabilityCheck).mockReturnValue({
        loading: false,
        staffResults: [],
        teamResults: [mockTeamResult],
        serviceType: 'cleaning',
        error: null,
      })

      render(<StaffAvailabilityModal {...defaultProps} assignmentType="team" />)

      const selectButton = screen.getByRole('button', { name: /select/i })
      await user.click(selectButton)

      expect(mockOnSelectTeam).toHaveBeenCalledWith('team-1')
      expect(mockOnClose).toHaveBeenCalled()
    })

    it('should highlight currently assigned team', () => {
      vi.mocked(useStaffAvailabilityCheck).mockReturnValue({
        loading: false,
        staffResults: [],
        teamResults: [mockTeamResult],
        serviceType: 'cleaning',
        error: null,
      })

      render(<StaffAvailabilityModal {...defaultProps} assignmentType="team" currentAssignedTeamId="team-1" />)

      expect(screen.getByText('Currently Assigned')).toBeInTheDocument()
    })
  })

  describe('Empty State Tests', () => {
    it('should show empty state when no staff found', () => {
      vi.mocked(useStaffAvailabilityCheck).mockReturnValue({
        loading: false,
        staffResults: [],
        teamResults: [],
        serviceType: 'cleaning',
        error: null,
      })

      render(<StaffAvailabilityModal {...defaultProps} />)
      expect(screen.getByText(/No staff found/i)).toBeInTheDocument()
    })

    it('should show empty state when no teams found', () => {
      vi.mocked(useStaffAvailabilityCheck).mockReturnValue({
        loading: false,
        staffResults: [],
        teamResults: [],
        serviceType: 'cleaning',
        error: null,
      })

      render(<StaffAvailabilityModal {...defaultProps} assignmentType="team" />)
      expect(screen.getByText(/No teams found/i)).toBeInTheDocument()
    })
  })
})
