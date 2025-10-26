import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { useStaffAvailabilityCheck } from '../use-staff-availability-check'
import { supabase } from '@/lib/supabase'

// Mock Supabase
vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: vi.fn(),
  },
}))

// Mock error utils
vi.mock('@/lib/error-utils', () => ({
  getSupabaseErrorMessage: vi.fn((err) => err?.message || 'Database error'),
}))

describe('useStaffAvailabilityCheck', () => {
  // Mock data
  const mockService = {
    id: 'service-1',
    service_type: 'Cleaning',
  }

  const mockStaff = [
    {
      id: 'staff-1',
      full_name: 'John Doe',
      staff_number: 'S001',
      skills: ['Cleaning', 'Deep Cleaning'],
      reviews: [{ rating: 5 }, { rating: 4 }],
    },
    {
      id: 'staff-2',
      full_name: 'Jane Smith',
      staff_number: 'S002',
      skills: ['Plumbing'],
      reviews: [],
    },
  ]

  const mockTeams = [
    {
      id: 'team-1',
      name: 'Team Alpha',
      is_active: true,
      team_members: [
        {
          staff_id: 'staff-1',
          profiles: {
            id: 'staff-1',
            full_name: 'John Doe',
            skills: ['Cleaning'],
          },
        },
      ],
    },
  ]

  const mockBookings = [
    {
      id: 'booking-1',
      booking_date: '2025-10-26',
      start_time: '10:00',
      end_time: '12:00',
      staff_id: 'staff-1',
      team_id: null,
      status: 'confirmed',
      service_packages: { name: 'Basic Cleaning' },
      customers: { full_name: 'Customer A' },
    },
  ]

  // Helper to create mock chain with proper typing
  const createMockChain = (data: unknown) => ({
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    neq: vi.fn().mockReturnThis(),
    in: vi.fn().mockReturnThis(),
    or: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({ data, error: null }),
    then: vi.fn((callback: (value: { data: unknown; error: null }) => unknown) =>
      Promise.resolve({ data, error: null }).then(callback)
    ),
  })

  beforeEach(() => {
    vi.clearAllMocks()

    // Default mock implementation with proper typing
    vi.mocked(supabase.from).mockImplementation((table: string) => {
      if (table === 'service_packages') {
        return createMockChain(mockService) as unknown as ReturnType<typeof supabase.from>
      }
      if (table === 'profiles') {
        return {
          ...createMockChain(mockStaff),
          single: undefined,
        } as unknown as ReturnType<typeof supabase.from>
      }
      if (table === 'teams') {
        return {
          ...createMockChain(mockTeams),
          single: undefined,
        } as unknown as ReturnType<typeof supabase.from>
      }
      if (table === 'bookings' || table === 'team_members' || table === 'staff_availability' || table === 'reviews') {
        return createMockChain([]) as unknown as ReturnType<typeof supabase.from>
      }
      return createMockChain(null) as unknown as ReturnType<typeof supabase.from>
    })
  })

  describe('Initialization & Parameter Validation', () => {
    it('should initialize with default state', () => {
      // Act
      const { result } = renderHook(() =>
        useStaffAvailabilityCheck({
          date: '',
          startTime: '',
          endTime: '',
          servicePackageId: '',
          assignmentType: 'individual',
        })
      )

      // Assert
      expect(result.current.loading).toBe(false)
      expect(result.current.staffResults).toEqual([])
      expect(result.current.teamResults).toEqual([])
      expect(result.current.error).toBeNull()
    })

    it('should not fetch when required parameters are missing', () => {
      // Arrange
      const fromSpy = vi.spyOn(supabase, 'from')

      // Act
      renderHook(() =>
        useStaffAvailabilityCheck({
          date: '',
          startTime: '10:00',
          endTime: '12:00',
          servicePackageId: 'service-1',
          assignmentType: 'individual',
        })
      )

      // Assert
      expect(fromSpy).not.toHaveBeenCalled()
    })

    it('should not fetch when date is missing', () => {
      // Arrange
      const fromSpy = vi.spyOn(supabase, 'from')

      // Act
      renderHook(() =>
        useStaffAvailabilityCheck({
          date: '',
          startTime: '10:00',
          endTime: '12:00',
          servicePackageId: 'service-1',
          assignmentType: 'individual',
        })
      )

      // Assert
      expect(fromSpy).not.toHaveBeenCalled()
    })

    it('should not fetch when startTime is missing', () => {
      // Arrange
      const fromSpy = vi.spyOn(supabase, 'from')

      // Act
      renderHook(() =>
        useStaffAvailabilityCheck({
          date: '2025-10-26',
          startTime: '',
          endTime: '12:00',
          servicePackageId: 'service-1',
          assignmentType: 'individual',
        })
      )

      // Assert
      expect(fromSpy).not.toHaveBeenCalled()
    })

    it('should not fetch when endTime is missing', () => {
      // Arrange
      const fromSpy = vi.spyOn(supabase, 'from')

      // Act
      renderHook(() =>
        useStaffAvailabilityCheck({
          date: '2025-10-26',
          startTime: '10:00',
          endTime: '',
          servicePackageId: 'service-1',
          assignmentType: 'individual',
        })
      )

      // Assert
      expect(fromSpy).not.toHaveBeenCalled()
    })

    it('should not fetch when servicePackageId is missing', () => {
      // Arrange
      const fromSpy = vi.spyOn(supabase, 'from')

      // Act
      renderHook(() =>
        useStaffAvailabilityCheck({
          date: '2025-10-26',
          startTime: '10:00',
          endTime: '12:00',
          servicePackageId: '',
          assignmentType: 'individual',
        })
      )

      // Assert
      expect(fromSpy).not.toHaveBeenCalled()
    })

    it('should fetch staff when all parameters are provided', async () => {
      // Act
      const { result } = renderHook(() =>
        useStaffAvailabilityCheck({
          date: '2025-10-26',
          startTime: '14:00',
          endTime: '16:00',
          servicePackageId: 'service-1',
          assignmentType: 'individual',
        })
      )

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      // Assert
      expect(supabase.from).toHaveBeenCalledWith('service_packages')
      expect(supabase.from).toHaveBeenCalledWith('profiles')
      expect(result.current.serviceType).toBe('Cleaning')
    })

    it('should fetch teams when assignment type is team', async () => {
      // Act
      const { result } = renderHook(() =>
        useStaffAvailabilityCheck({
          date: '2025-10-26',
          startTime: '14:00',
          endTime: '16:00',
          servicePackageId: 'service-1',
          assignmentType: 'team',
        })
      )

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      // Assert
      expect(supabase.from).toHaveBeenCalledWith('teams')
    })

    it('should handle excludeBookingId parameter', async () => {
      // Act
      const { result } = renderHook(() =>
        useStaffAvailabilityCheck({
          date: '2025-10-26',
          startTime: '14:00',
          endTime: '16:00',
          servicePackageId: 'service-1',
          assignmentType: 'individual',
          excludeBookingId: 'booking-to-exclude',
        })
      )

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      // Assert - Hook should execute successfully with exclude parameter
      expect(result.current.error).toBeNull()
      expect(result.current.staffResults).toBeDefined()
    })
  })

  describe('Staff Availability - No Conflicts', () => {
    it('should return all staff as available when no conflicts exist', async () => {
      // Act
      const { result } = renderHook(() =>
        useStaffAvailabilityCheck({
          date: '2025-10-26',
          startTime: '14:00',
          endTime: '16:00',
          servicePackageId: 'service-1',
          assignmentType: 'individual',
        })
      )

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      // Assert
      expect(result.current.staffResults).toHaveLength(2)
      expect(result.current.staffResults[0].isAvailable).toBe(true)
      expect(result.current.staffResults[0].conflicts).toEqual([])
    })

    it('should calculate skill match score for exact match', async () => {
      // Act
      const { result } = renderHook(() =>
        useStaffAvailabilityCheck({
          date: '2025-10-26',
          startTime: '14:00',
          endTime: '16:00',
          servicePackageId: 'service-1',
          assignmentType: 'individual',
        })
      )

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      // Assert - Staff 1 has exact 'Cleaning' skill match
      const staff1 = result.current.staffResults.find((s) => s.staffId === 'staff-1')
      expect(staff1?.skillMatch).toBe(80)
    })

    it('should calculate skill match score for no match', async () => {
      // Act
      const { result } = renderHook(() =>
        useStaffAvailabilityCheck({
          date: '2025-10-26',
          startTime: '14:00',
          endTime: '16:00',
          servicePackageId: 'service-1',
          assignmentType: 'individual',
        })
      )

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      // Assert - Staff 2 has 'Plumbing' which doesn't match 'Cleaning'
      const staff2 = result.current.staffResults.find((s) => s.staffId === 'staff-2')
      expect(staff2?.skillMatch).toBe(0)
    })

    it('should calculate average rating correctly', async () => {
      // Act
      const { result } = renderHook(() =>
        useStaffAvailabilityCheck({
          date: '2025-10-26',
          startTime: '14:00',
          endTime: '16:00',
          servicePackageId: 'service-1',
          assignmentType: 'individual',
        })
      )

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      // Assert - Staff 1 has ratings [5, 4] = avg 4.5
      const staff1 = result.current.staffResults.find((s) => s.staffId === 'staff-1')
      expect(staff1?.rating).toBe(4.5)
    })

    it('should return 0 rating for staff with no reviews', async () => {
      // Act
      const { result } = renderHook(() =>
        useStaffAvailabilityCheck({
          date: '2025-10-26',
          startTime: '14:00',
          endTime: '16:00',
          servicePackageId: 'service-1',
          assignmentType: 'individual',
        })
      )

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      // Assert - Staff 2 has no reviews
      const staff2 = result.current.staffResults.find((s) => s.staffId === 'staff-2')
      expect(staff2?.rating).toBe(0)
    })

    it('should include all staff info in results', async () => {
      // Act
      const { result } = renderHook(() =>
        useStaffAvailabilityCheck({
          date: '2025-10-26',
          startTime: '14:00',
          endTime: '16:00',
          servicePackageId: 'service-1',
          assignmentType: 'individual',
        })
      )

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      // Assert
      const staff1 = result.current.staffResults.find((s) => s.staffId === 'staff-1')
      expect(staff1).toMatchObject({
        staffId: 'staff-1',
        staffNumber: 'S001',
        fullName: 'John Doe',
        skills: ['Cleaning', 'Deep Cleaning'],
      })
    })
  })

  describe('Staff Availability - Booking Conflicts', () => {
    beforeEach(() => {
      // Setup booking conflicts
      vi.mocked(supabase.from).mockImplementation((table: string) => {
        if (table === 'service_packages') {
          return createMockChain(mockService) as unknown as ReturnType<typeof supabase.from>
        }
        if (table === 'profiles') {
          return {
            ...createMockChain(mockStaff),
            single: undefined,
          } as unknown as ReturnType<typeof supabase.from>
        }
        if (table === 'bookings') {
          return createMockChain(mockBookings) as unknown as ReturnType<typeof supabase.from>
        }
        return createMockChain([]) as unknown as ReturnType<typeof supabase.from>
      })
    })

    it('should detect time overlap conflicts', async () => {
      // Act - Query time 11:00-13:00 overlaps with booking 10:00-12:00
      const { result } = renderHook(() =>
        useStaffAvailabilityCheck({
          date: '2025-10-26',
          startTime: '11:00',
          endTime: '13:00',
          servicePackageId: 'service-1',
          assignmentType: 'individual',
        })
      )

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      // Assert
      const staff1 = result.current.staffResults.find((s) => s.staffId === 'staff-1')
      expect(staff1?.isAvailable).toBe(false)
      expect(staff1?.conflicts).toHaveLength(1)
    })

    it('should not detect conflicts when times do not overlap', async () => {
      // Act - Query time 14:00-16:00 does not overlap with booking 10:00-12:00
      const { result } = renderHook(() =>
        useStaffAvailabilityCheck({
          date: '2025-10-26',
          startTime: '14:00',
          endTime: '16:00',
          servicePackageId: 'service-1',
          assignmentType: 'individual',
        })
      )

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      // Assert
      const staff1 = result.current.staffResults.find((s) => s.staffId === 'staff-1')
      expect(staff1?.isAvailable).toBe(true)
      expect(staff1?.conflicts).toEqual([])
    })

    it('should include conflict details in results', async () => {
      // Act
      const { result } = renderHook(() =>
        useStaffAvailabilityCheck({
          date: '2025-10-26',
          startTime: '11:00',
          endTime: '13:00',
          servicePackageId: 'service-1',
          assignmentType: 'individual',
        })
      )

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      // Assert
      const staff1 = result.current.staffResults.find((s) => s.staffId === 'staff-1')
      expect(staff1?.conflicts[0]).toMatchObject({
        id: 'booking-1',
        bookingDate: '2025-10-26',
        startTime: '10:00',
        endTime: '12:00',
        serviceName: 'Basic Cleaning',
        customerName: 'Customer A',
      })
    })

    it('should handle edge case: exact same start time', async () => {
      // Act - Same start time 10:00
      const { result } = renderHook(() =>
        useStaffAvailabilityCheck({
          date: '2025-10-26',
          startTime: '10:00',
          endTime: '11:00',
          servicePackageId: 'service-1',
          assignmentType: 'individual',
        })
      )

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      // Assert - Should have conflict
      const staff1 = result.current.staffResults.find((s) => s.staffId === 'staff-1')
      expect(staff1?.isAvailable).toBe(false)
    })

    it('should handle edge case: booking ends when new starts', async () => {
      // Act - Start at 12:00 when booking ends at 12:00
      const { result } = renderHook(() =>
        useStaffAvailabilityCheck({
          date: '2025-10-26',
          startTime: '12:00',
          endTime: '14:00',
          servicePackageId: 'service-1',
          assignmentType: 'individual',
        })
      )

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      // Assert - No overlap when one ends and another starts
      const staff1 = result.current.staffResults.find((s) => s.staffId === 'staff-1')
      expect(staff1?.isAvailable).toBe(true)
    })
  })

  describe('Staff Availability - Unavailability Periods', () => {
    beforeEach(() => {
      const mockUnavailability = [
        {
          staff_id: 'staff-1',
          unavailable_date: '2025-10-26',
          reason: 'Sick Leave',
          start_time: '09:00',
          end_time: '17:00',
          notes: 'Doctor appointment',
          is_available: false,
        },
      ]

      vi.mocked(supabase.from).mockImplementation((table: string) => {
        if (table === 'service_packages') {
          return createMockChain(mockService) as unknown as ReturnType<typeof supabase.from>
        }
        if (table === 'profiles') {
          return {
            ...createMockChain(mockStaff),
            single: undefined,
          } as unknown as ReturnType<typeof supabase.from>
        }
        if (table === 'staff_availability') {
          return createMockChain(mockUnavailability) as unknown as ReturnType<typeof supabase.from>
        }
        return createMockChain([]) as unknown as ReturnType<typeof supabase.from>
      })
    })

    it('should mark staff unavailable during unavailability periods', async () => {
      // Act
      const { result } = renderHook(() =>
        useStaffAvailabilityCheck({
          date: '2025-10-26',
          startTime: '10:00',
          endTime: '12:00',
          servicePackageId: 'service-1',
          assignmentType: 'individual',
        })
      )

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      // Assert
      const staff1 = result.current.staffResults.find((s) => s.staffId === 'staff-1')
      expect(staff1?.isAvailable).toBe(false)
      expect(staff1?.unavailabilityReasons).toHaveLength(1)
    })

    it('should include unavailability reason details', async () => {
      // Act
      const { result } = renderHook(() =>
        useStaffAvailabilityCheck({
          date: '2025-10-26',
          startTime: '10:00',
          endTime: '12:00',
          servicePackageId: 'service-1',
          assignmentType: 'individual',
        })
      )

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      // Assert
      const staff1 = result.current.staffResults.find((s) => s.staffId === 'staff-1')
      expect(staff1?.unavailabilityReasons[0]).toMatchObject({
        reason: 'Sick Leave',
        startTime: '09:00',
        endTime: '17:00',
        notes: 'Doctor appointment',
      })
    })

    it('should handle all-day unavailability without time range', async () => {
      // Arrange - All-day unavailability (no start/end time)
      const mockAllDayUnavailable = [
        {
          reason: 'Day Off',
          start_time: null,
          end_time: null,
          notes: null,
        },
      ]

      vi.mocked(supabase.from).mockImplementation((table: string) => {
        if (table === 'service_packages') {
          return createMockChain(mockService) as unknown as ReturnType<typeof supabase.from>
        }
        if (table === 'profiles') {
          return {
            ...createMockChain(mockStaff),
            single: undefined,
          } as unknown as ReturnType<typeof supabase.from>
        }
        if (table === 'staff_availability') {
          return createMockChain(mockAllDayUnavailable) as unknown as ReturnType<typeof supabase.from>
        }
        return createMockChain([]) as unknown as ReturnType<typeof supabase.from>
      })

      // Act
      const { result } = renderHook(() =>
        useStaffAvailabilityCheck({
          date: '2025-10-26',
          startTime: '10:00',
          endTime: '12:00',
          servicePackageId: 'service-1',
          assignmentType: 'individual',
        })
      )

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      // Assert - Should still show as unavailable
      const staff1 = result.current.staffResults.find((s) => s.staffId === 'staff-1')
      expect(staff1?.unavailabilityReasons).toHaveLength(1)
    })
  })

  describe('Score Calculation & Sorting', () => {
    it('should calculate total score within valid range', async () => {
      // Act
      const { result } = renderHook(() =>
        useStaffAvailabilityCheck({
          date: '2025-10-26',
          startTime: '14:00',
          endTime: '16:00',
          servicePackageId: 'service-1',
          assignmentType: 'individual',
        })
      )

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      // Assert - Score should be between 0-100
      const staff1 = result.current.staffResults.find((s) => s.staffId === 'staff-1')
      expect(staff1?.score).toBeGreaterThanOrEqual(0)
      expect(staff1?.score).toBeLessThanOrEqual(100)
    })

    it('should sort staff by score in descending order', async () => {
      // Act
      const { result } = renderHook(() =>
        useStaffAvailabilityCheck({
          date: '2025-10-26',
          startTime: '14:00',
          endTime: '16:00',
          servicePackageId: 'service-1',
          assignmentType: 'individual',
        })
      )

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      // Assert - Results should be sorted by score (highest first)
      const scores = result.current.staffResults.map((s) => s.score)
      const sortedScores = [...scores].sort((a, b) => b - a)
      expect(scores).toEqual(sortedScores)
    })

    it('should give higher score to staff with matching skills', async () => {
      // Act
      const { result } = renderHook(() =>
        useStaffAvailabilityCheck({
          date: '2025-10-26',
          startTime: '14:00',
          endTime: '16:00',
          servicePackageId: 'service-1',
          assignmentType: 'individual',
        })
      )

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      // Assert - Staff 1 (Cleaning skill) should have higher score than Staff 2 (Plumbing)
      const staff1 = result.current.staffResults.find((s) => s.staffId === 'staff-1')
      const staff2 = result.current.staffResults.find((s) => s.staffId === 'staff-2')
      expect(staff1!.score).toBeGreaterThan(staff2!.score)
    })

    it('should include jobsToday count in results', async () => {
      // Act
      const { result } = renderHook(() =>
        useStaffAvailabilityCheck({
          date: '2025-10-26',
          startTime: '14:00',
          endTime: '16:00',
          servicePackageId: 'service-1',
          assignmentType: 'individual',
        })
      )

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      // Assert
      const staff1 = result.current.staffResults.find((s) => s.staffId === 'staff-1')
      expect(staff1?.jobsToday).toBeDefined()
      expect(typeof staff1?.jobsToday).toBe('number')
    })
  })

  describe('Team Availability', () => {
    it('should fetch team availability when assignment type is team', async () => {
      // Act
      const { result } = renderHook(() =>
        useStaffAvailabilityCheck({
          date: '2025-10-26',
          startTime: '14:00',
          endTime: '16:00',
          servicePackageId: 'service-1',
          assignmentType: 'team',
        })
      )

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      // Assert
      expect(result.current.teamResults).toBeDefined()
      expect(result.current.teamResults.length).toBeGreaterThan(0)
    })

    it('should calculate team member counts', async () => {
      // Act
      const { result } = renderHook(() =>
        useStaffAvailabilityCheck({
          date: '2025-10-26',
          startTime: '14:00',
          endTime: '16:00',
          servicePackageId: 'service-1',
          assignmentType: 'team',
        })
      )

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      // Assert
      const team1 = result.current.teamResults.find((t) => t.teamId === 'team-1')
      expect(team1?.totalMembers).toBe(1)
      expect(team1?.availableMembers).toBeDefined()
    })

    it('should include team member details', async () => {
      // Act
      const { result } = renderHook(() =>
        useStaffAvailabilityCheck({
          date: '2025-10-26',
          startTime: '14:00',
          endTime: '16:00',
          servicePackageId: 'service-1',
          assignmentType: 'team',
        })
      )

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      // Assert
      const team1 = result.current.teamResults.find((t) => t.teamId === 'team-1')
      expect(team1?.members).toBeDefined()
      expect(team1?.members.length).toBeGreaterThan(0)
    })

    it('should calculate team skill match score', async () => {
      // Act
      const { result } = renderHook(() =>
        useStaffAvailabilityCheck({
          date: '2025-10-26',
          startTime: '14:00',
          endTime: '16:00',
          servicePackageId: 'service-1',
          assignmentType: 'team',
        })
      )

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      // Assert
      const team1 = result.current.teamResults.find((t) => t.teamId === 'team-1')
      expect(team1?.teamMatch).toBeGreaterThanOrEqual(0)
      expect(team1?.teamMatch).toBeLessThanOrEqual(80)
    })

    it('should include isFullyAvailable flag for teams', async () => {
      // Act
      const { result } = renderHook(() =>
        useStaffAvailabilityCheck({
          date: '2025-10-26',
          startTime: '14:00',
          endTime: '16:00',
          servicePackageId: 'service-1',
          assignmentType: 'team',
        })
      )

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      // Assert
      const team1 = result.current.teamResults.find((t) => t.teamId === 'team-1')
      expect(typeof team1?.isFullyAvailable).toBe('boolean')
    })
  })

  describe('Error Handling', () => {
    it('should handle service package not found', async () => {
      // Arrange - Return null for service package
      vi.mocked(supabase.from).mockImplementation(() => createMockChain(null) as unknown as ReturnType<typeof supabase.from>)

      // Act
      const { result } = renderHook(() =>
        useStaffAvailabilityCheck({
          date: '2025-10-26',
          startTime: '14:00',
          endTime: '16:00',
          servicePackageId: 'invalid-service',
          assignmentType: 'individual',
        })
      )

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      // Assert - Should return empty results when service not found
      expect(result.current.staffResults).toEqual([])
    })

    it('should handle database errors gracefully', async () => {
      // Arrange
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

      vi.mocked(supabase.from).mockImplementation(() => {
        throw new Error('Database connection failed')
      })

      // Act
      const { result } = renderHook(() =>
        useStaffAvailabilityCheck({
          date: '2025-10-26',
          startTime: '14:00',
          endTime: '16:00',
          servicePackageId: 'service-1',
          assignmentType: 'individual',
        })
      )

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      // Assert
      expect(result.current.error).toBeDefined()
      expect(result.current.staffResults).toEqual([])

      consoleErrorSpy.mockRestore()
    })

    it('should clear results on error', async () => {
      // Arrange
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

      vi.mocked(supabase.from).mockImplementation(() => {
        throw new Error('Network error')
      })

      // Act
      const { result } = renderHook(() =>
        useStaffAvailabilityCheck({
          date: '2025-10-26',
          startTime: '14:00',
          endTime: '16:00',
          servicePackageId: 'service-1',
          assignmentType: 'individual',
        })
      )

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      // Assert - Both results should be cleared
      expect(result.current.staffResults).toEqual([])
      expect(result.current.teamResults).toEqual([])

      consoleErrorSpy.mockRestore()
    })
  })

  describe('Parameter Changes & Re-fetching', () => {
    it('should re-fetch when date changes', async () => {
      // Arrange
      const { result, rerender } = renderHook(
        ({ date }) =>
          useStaffAvailabilityCheck({
            date,
            startTime: '14:00',
            endTime: '16:00',
            servicePackageId: 'service-1',
            assignmentType: 'individual',
          }),
        { initialProps: { date: '2025-10-26' } }
      )

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      const firstCallCount = vi.mocked(supabase.from).mock.calls.length

      // Act - Change date
      rerender({ date: '2025-10-27' })

      await waitFor(() => {
        expect(vi.mocked(supabase.from).mock.calls.length).toBeGreaterThan(firstCallCount)
      })
    })

    it('should re-fetch when service package changes', async () => {
      // Arrange
      const { result, rerender } = renderHook(
        ({ servicePackageId }) =>
          useStaffAvailabilityCheck({
            date: '2025-10-26',
            startTime: '14:00',
            endTime: '16:00',
            servicePackageId,
            assignmentType: 'individual',
          }),
        { initialProps: { servicePackageId: 'service-1' } }
      )

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      vi.clearAllMocks()

      // Act - Change service package
      rerender({ servicePackageId: 'service-2' })

      await waitFor(() => {
        expect(supabase.from).toHaveBeenCalled()
      })
    })

    it('should switch between staff and team modes', async () => {
      // Arrange
      const { result, rerender } = renderHook(
        ({ assignmentType }: { assignmentType: 'individual' | 'team' }) =>
          useStaffAvailabilityCheck({
            date: '2025-10-26',
            startTime: '14:00',
            endTime: '16:00',
            servicePackageId: 'service-1',
            assignmentType,
          }),
        { initialProps: { assignmentType: 'individual' as 'individual' | 'team' } }
      )

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      expect(result.current.staffResults.length).toBeGreaterThan(0)

      // Act - Switch to team mode
      rerender({ assignmentType: 'team' as 'individual' | 'team' })

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      // Assert
      expect(result.current.teamResults).toBeDefined()
    })
  })
})
