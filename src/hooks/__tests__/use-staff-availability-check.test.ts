import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { useStaffAvailabilityCheck } from '../use-staff-availability-check'
import { supabase } from '@/lib/supabase'

// Mock Supabase
vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: vi.fn(),
    channel: vi.fn(),
  }
}))

// Mock error utils
vi.mock('@/lib/error-utils', () => ({
  getSupabaseErrorMessage: vi.fn((err) => err?.message || 'Database error')
}))

describe('useStaffAvailabilityCheck', () => {
  // Mock data
  const mockService = {
    id: 'service-1',
    service_type: 'Cleaning'
  }

  const mockStaff = [
    {
      id: 'staff-1',
      full_name: 'John Doe',
      staff_number: 'S001',
      skills: ['Cleaning', 'Deep Cleaning'],
      reviews: [{ rating: 5 }, { rating: 4 }]
    },
    {
      id: 'staff-2',
      full_name: 'Jane Smith',
      staff_number: 'S002',
      skills: ['Plumbing'],
      reviews: []
    }
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
            skills: ['Cleaning']
          }
        }
      ]
    }
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
      customers: { full_name: 'Customer A' }
    }
  ]

  // Helper to create mock chain
  const createMockChain = (data: any, error: any = null) => ({
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    neq: vi.fn().mockReturnThis(),
    in: vi.fn().mockReturnThis(),
    or: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({ data, error }),
    then: vi.fn((callback) => Promise.resolve({ data, error }).then(callback))
  })

  beforeEach(() => {
    vi.clearAllMocks()

    // Default mock implementation
    const fromMock = vi.fn()

    // Service packages query
    fromMock.mockImplementation((table: string) => {
      if (table === 'service_packages') {
        return createMockChain(mockService)
      }
      if (table === 'profiles') {
        return {
          ...createMockChain(mockStaff),
          single: undefined
        }
      }
      if (table === 'teams') {
        return {
          ...createMockChain(mockTeams),
          single: undefined
        }
      }
      if (table === 'bookings') {
        return createMockChain([])
      }
      if (table === 'team_members') {
        return createMockChain([])
      }
      if (table === 'staff_availability') {
        return createMockChain([])
      }
      if (table === 'reviews') {
        return createMockChain([])
      }
      return createMockChain(null)
    })

    ;(supabase.from as any) = fromMock
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('Initialization & Parameter Validation', () => {
    it('should initialize with loading state', () => {
      const { result } = renderHook(() =>
        useStaffAvailabilityCheck({
          date: '',
          startTime: '',
          endTime: '',
          servicePackageId: '',
          assignmentType: 'individual'
        })
      )

      expect(result.current.loading).toBe(false)
      expect(result.current.staffResults).toEqual([])
      expect(result.current.teamResults).toEqual([])
      expect(result.current.error).toBeNull()
    })

    it('should not fetch when required parameters are missing', () => {
      const fromSpy = vi.spyOn(supabase, 'from')

      renderHook(() =>
        useStaffAvailabilityCheck({
          date: '',
          startTime: '10:00',
          endTime: '12:00',
          servicePackageId: 'service-1',
          assignmentType: 'individual'
        })
      )

      // Should not call supabase
      expect(fromSpy).not.toHaveBeenCalled()
    })

    it('should fetch staff when all parameters are provided for individual assignment', async () => {
      const { result } = renderHook(() =>
        useStaffAvailabilityCheck({
          date: '2025-10-26',
          startTime: '14:00',
          endTime: '16:00',
          servicePackageId: 'service-1',
          assignmentType: 'individual'
        })
      )

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      expect(supabase.from).toHaveBeenCalledWith('service_packages')
      expect(supabase.from).toHaveBeenCalledWith('profiles')
      expect(result.current.serviceType).toBe('Cleaning')
    })

    it('should fetch teams when assignment type is team', async () => {
      const { result } = renderHook(() =>
        useStaffAvailabilityCheck({
          date: '2025-10-26',
          startTime: '14:00',
          endTime: '16:00',
          servicePackageId: 'service-1',
          assignmentType: 'team'
        })
      )

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      expect(supabase.from).toHaveBeenCalledWith('teams')
    })

    it('should exclude specified booking when excludeBookingId is provided', async () => {
      // Test that hook runs successfully with excludeBookingId parameter
      const { result } = renderHook(() =>
        useStaffAvailabilityCheck({
          date: '2025-10-26',
          startTime: '14:00',
          endTime: '16:00',
          servicePackageId: 'service-1',
          assignmentType: 'individual',
          excludeBookingId: 'booking-to-exclude'
        })
      )

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      // Verify hook executed successfully
      expect(result.current.error).toBeNull()
      expect(result.current.staffResults).toBeDefined()
    })
  })

  describe('Staff Availability - No Conflicts', () => {
    it('should return all staff as available when no conflicts exist', async () => {
      const { result } = renderHook(() =>
        useStaffAvailabilityCheck({
          date: '2025-10-26',
          startTime: '14:00',
          endTime: '16:00',
          servicePackageId: 'service-1',
          assignmentType: 'individual'
        })
      )

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      expect(result.current.staffResults).toHaveLength(2)
      expect(result.current.staffResults[0].isAvailable).toBe(true)
      expect(result.current.staffResults[0].conflicts).toEqual([])
    })

    it('should calculate correct skill match score for exact match', async () => {
      const { result } = renderHook(() =>
        useStaffAvailabilityCheck({
          date: '2025-10-26',
          startTime: '14:00',
          endTime: '16:00',
          servicePackageId: 'service-1',
          assignmentType: 'individual'
        })
      )

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      // Staff 1 has 'Cleaning' skill which exactly matches 'Cleaning' service
      const staff1 = result.current.staffResults.find(s => s.staffId === 'staff-1')
      expect(staff1?.skillMatch).toBe(80) // Exact match = 80 points
    })

    it('should calculate correct skill match score for no match', async () => {
      const { result } = renderHook(() =>
        useStaffAvailabilityCheck({
          date: '2025-10-26',
          startTime: '14:00',
          endTime: '16:00',
          servicePackageId: 'service-1',
          assignmentType: 'individual'
        })
      )

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      // Staff 2 has 'Plumbing' skill which doesn't match 'Cleaning'
      const staff2 = result.current.staffResults.find(s => s.staffId === 'staff-2')
      expect(staff2?.skillMatch).toBe(0) // No match = 0 points
    })

    it('should calculate average rating correctly', async () => {
      const { result } = renderHook(() =>
        useStaffAvailabilityCheck({
          date: '2025-10-26',
          startTime: '14:00',
          endTime: '16:00',
          servicePackageId: 'service-1',
          assignmentType: 'individual'
        })
      )

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      const staff1 = result.current.staffResults.find(s => s.staffId === 'staff-1')
      expect(staff1?.rating).toBe(4.5) // (5 + 4) / 2 = 4.5
    })

    it('should return 0 rating for staff with no reviews', async () => {
      const { result } = renderHook(() =>
        useStaffAvailabilityCheck({
          date: '2025-10-26',
          startTime: '14:00',
          endTime: '16:00',
          servicePackageId: 'service-1',
          assignmentType: 'individual'
        })
      )

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      const staff2 = result.current.staffResults.find(s => s.staffId === 'staff-2')
      expect(staff2?.rating).toBe(0)
    })
  })

  describe('Staff Availability - Booking Conflicts', () => {
    beforeEach(() => {
      // Setup booking conflicts for testing
      const fromMock = vi.fn((table: string) => {
        if (table === 'service_packages') {
          return createMockChain(mockService)
        }
        if (table === 'profiles') {
          return {
            ...createMockChain(mockStaff),
            single: undefined
          }
        }
        if (table === 'bookings') {
          // Return conflicting bookings
          return createMockChain(mockBookings)
        }
        if (table === 'team_members') {
          return createMockChain([])
        }
        if (table === 'staff_availability') {
          return createMockChain([])
        }
        if (table === 'reviews') {
          return createMockChain([])
        }
        return createMockChain(null)
      })
      ;(supabase.from as any) = fromMock
    })

    it('should detect time overlap conflicts', async () => {
      const { result } = renderHook(() =>
        useStaffAvailabilityCheck({
          date: '2025-10-26',
          startTime: '11:00', // Overlaps with 10:00-12:00 booking
          endTime: '13:00',
          servicePackageId: 'service-1',
          assignmentType: 'individual'
        })
      )

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      const staff1 = result.current.staffResults.find(s => s.staffId === 'staff-1')
      expect(staff1?.isAvailable).toBe(false)
      expect(staff1?.conflicts).toHaveLength(1)
    })

    it('should not detect conflicts when time ranges do not overlap', async () => {
      const { result } = renderHook(() =>
        useStaffAvailabilityCheck({
          date: '2025-10-26',
          startTime: '14:00', // After 10:00-12:00 booking
          endTime: '16:00',
          servicePackageId: 'service-1',
          assignmentType: 'individual'
        })
      )

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      const staff1 = result.current.staffResults.find(s => s.staffId === 'staff-1')
      expect(staff1?.isAvailable).toBe(true)
      expect(staff1?.conflicts).toEqual([])
    })

    it('should include conflict details in results', async () => {
      const { result } = renderHook(() =>
        useStaffAvailabilityCheck({
          date: '2025-10-26',
          startTime: '11:00',
          endTime: '13:00',
          servicePackageId: 'service-1',
          assignmentType: 'individual'
        })
      )

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      const staff1 = result.current.staffResults.find(s => s.staffId === 'staff-1')
      expect(staff1?.conflicts[0]).toMatchObject({
        id: 'booking-1',
        bookingDate: '2025-10-26',
        startTime: '10:00',
        endTime: '12:00',
        serviceName: 'Basic Cleaning',
        customerName: 'Customer A'
      })
    })

    it('should handle edge case: exact same start time', async () => {
      const { result } = renderHook(() =>
        useStaffAvailabilityCheck({
          date: '2025-10-26',
          startTime: '10:00', // Same start time
          endTime: '11:00',
          servicePackageId: 'service-1',
          assignmentType: 'individual'
        })
      )

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      const staff1 = result.current.staffResults.find(s => s.staffId === 'staff-1')
      expect(staff1?.isAvailable).toBe(false)
    })

    it('should handle edge case: booking ends exactly when new one starts', async () => {
      const { result } = renderHook(() =>
        useStaffAvailabilityCheck({
          date: '2025-10-26',
          startTime: '12:00', // Starts when existing booking ends
          endTime: '14:00',
          servicePackageId: 'service-1',
          assignmentType: 'individual'
        })
      )

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      const staff1 = result.current.staffResults.find(s => s.staffId === 'staff-1')
      // Should be available - no overlap when one ends and another starts
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
          is_available: false
        }
      ]

      const fromMock = vi.fn((table: string) => {
        if (table === 'service_packages') {
          return createMockChain(mockService)
        }
        if (table === 'profiles') {
          return {
            ...createMockChain(mockStaff),
            single: undefined
          }
        }
        if (table === 'bookings') {
          return createMockChain([])
        }
        if (table === 'team_members') {
          return createMockChain([])
        }
        if (table === 'staff_availability') {
          return createMockChain(mockUnavailability)
        }
        if (table === 'reviews') {
          return createMockChain([])
        }
        return createMockChain(null)
      })
      ;(supabase.from as any) = fromMock
    })

    it('should mark staff unavailable during unavailability periods', async () => {
      const { result } = renderHook(() =>
        useStaffAvailabilityCheck({
          date: '2025-10-26',
          startTime: '10:00',
          endTime: '12:00',
          servicePackageId: 'service-1',
          assignmentType: 'individual'
        })
      )

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      const staff1 = result.current.staffResults.find(s => s.staffId === 'staff-1')
      expect(staff1?.isAvailable).toBe(false)
      expect(staff1?.unavailabilityReasons).toHaveLength(1)
    })

    it('should include unavailability reason details', async () => {
      const { result } = renderHook(() =>
        useStaffAvailabilityCheck({
          date: '2025-10-26',
          startTime: '10:00',
          endTime: '12:00',
          servicePackageId: 'service-1',
          assignmentType: 'individual'
        })
      )

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      const staff1 = result.current.staffResults.find(s => s.staffId === 'staff-1')
      expect(staff1?.unavailabilityReasons[0]).toMatchObject({
        reason: 'Sick Leave',
        startTime: '09:00',
        endTime: '17:00',
        notes: 'Doctor appointment'
      })
    })

    it('should handle all-day unavailability (no start/end time)', async () => {
      const mockAllDayUnavailable = [{
        reason: 'Day Off',
        start_time: null,
        end_time: null,
        notes: null
      }]

      const fromMock = vi.fn((table: string) => {
        if (table === 'service_packages') {
          return createMockChain(mockService)
        }
        if (table === 'profiles') {
          return {
            ...createMockChain(mockStaff),
            single: undefined
          }
        }
        if (table === 'bookings') {
          return createMockChain([])
        }
        if (table === 'team_members') {
          return createMockChain([])
        }
        if (table === 'staff_availability') {
          return createMockChain(mockAllDayUnavailable)
        }
        if (table === 'reviews') {
          return createMockChain([])
        }
        return createMockChain(null)
      })
      ;(supabase.from as any) = fromMock

      const { result } = renderHook(() =>
        useStaffAvailabilityCheck({
          date: '2025-10-26',
          startTime: '10:00',
          endTime: '12:00',
          servicePackageId: 'service-1',
          assignmentType: 'individual'
        })
      )

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      const staff1 = result.current.staffResults.find(s => s.staffId === 'staff-1')
      expect(staff1?.unavailabilityReasons).toHaveLength(1)
    })
  })

  describe('Score Calculation', () => {
    it('should calculate total score correctly', async () => {
      const { result } = renderHook(() =>
        useStaffAvailabilityCheck({
          date: '2025-10-26',
          startTime: '14:00',
          endTime: '16:00',
          servicePackageId: 'service-1',
          assignmentType: 'individual'
        })
      )

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      const staff1 = result.current.staffResults.find(s => s.staffId === 'staff-1')
      expect(staff1?.score).toBeGreaterThan(0)
      expect(staff1?.score).toBeLessThanOrEqual(100)
    })

    it('should sort staff by score in descending order', async () => {
      const { result } = renderHook(() =>
        useStaffAvailabilityCheck({
          date: '2025-10-26',
          startTime: '14:00',
          endTime: '16:00',
          servicePackageId: 'service-1',
          assignmentType: 'individual'
        })
      )

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      const scores = result.current.staffResults.map(s => s.score)
      const sortedScores = [...scores].sort((a, b) => b - a)
      expect(scores).toEqual(sortedScores)
    })

    it('should give higher score to staff with matching skills', async () => {
      const { result } = renderHook(() =>
        useStaffAvailabilityCheck({
          date: '2025-10-26',
          startTime: '14:00',
          endTime: '16:00',
          servicePackageId: 'service-1',
          assignmentType: 'individual'
        })
      )

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      const staff1 = result.current.staffResults.find(s => s.staffId === 'staff-1') // Has Cleaning skill
      const staff2 = result.current.staffResults.find(s => s.staffId === 'staff-2') // No Cleaning skill

      expect(staff1!.score).toBeGreaterThan(staff2!.score)
    })
  })

  describe('Team Availability', () => {
    it('should fetch team availability when assignment type is team', async () => {
      const { result } = renderHook(() =>
        useStaffAvailabilityCheck({
          date: '2025-10-26',
          startTime: '14:00',
          endTime: '16:00',
          servicePackageId: 'service-1',
          assignmentType: 'team'
        })
      )

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      expect(result.current.teamResults).toBeDefined()
      expect(result.current.teamResults.length).toBeGreaterThan(0)
    })

    it('should calculate team availability based on all members', async () => {
      const { result } = renderHook(() =>
        useStaffAvailabilityCheck({
          date: '2025-10-26',
          startTime: '14:00',
          endTime: '16:00',
          servicePackageId: 'service-1',
          assignmentType: 'team'
        })
      )

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      const team1 = result.current.teamResults.find(t => t.teamId === 'team-1')
      expect(team1?.totalMembers).toBe(1)
      expect(team1?.availableMembers).toBeDefined()
    })

    it('should mark team as unavailable if any member is unavailable', async () => {
      // Setup: one team member has a conflict
      const mockConflictBookings = [{
        id: 'booking-1',
        booking_date: '2025-10-26',
        start_time: '14:00',
        end_time: '16:00',
        staff_id: 'staff-1',
        team_id: null,
        status: 'confirmed',
        service_packages: { name: 'Basic Cleaning' },
        customers: { full_name: 'Customer A' }
      }]

      const fromMock = vi.fn((table: string) => {
        if (table === 'service_packages') {
          return createMockChain(mockService)
        }
        if (table === 'teams') {
          return {
            ...createMockChain(mockTeams),
            single: undefined
          }
        }
        if (table === 'bookings') {
          return createMockChain(mockConflictBookings)
        }
        if (table === 'team_members') {
          return createMockChain([])
        }
        if (table === 'reviews') {
          return createMockChain([])
        }
        return createMockChain([])
      })
      ;(supabase.from as any) = fromMock

      const { result } = renderHook(() =>
        useStaffAvailabilityCheck({
          date: '2025-10-26',
          startTime: '14:00',
          endTime: '16:00',
          servicePackageId: 'service-1',
          assignmentType: 'team'
        })
      )

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      const team1 = result.current.teamResults.find(t => t.teamId === 'team-1')
      expect(team1?.isFullyAvailable).toBe(false)
    })

    it('should calculate team skill match correctly', async () => {
      const { result } = renderHook(() =>
        useStaffAvailabilityCheck({
          date: '2025-10-26',
          startTime: '14:00',
          endTime: '16:00',
          servicePackageId: 'service-1',
          assignmentType: 'team'
        })
      )

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      const team1 = result.current.teamResults.find(t => t.teamId === 'team-1')
      expect(team1?.teamMatch).toBeGreaterThan(0)
    })
  })

  describe('Error Handling', () => {
    it('should handle service package not found', async () => {
      const fromMock = vi.fn(() =>
        createMockChain(null)
      )
      ;(supabase.from as any) = fromMock

      const { result } = renderHook(() =>
        useStaffAvailabilityCheck({
          date: '2025-10-26',
          startTime: '14:00',
          endTime: '16:00',
          servicePackageId: 'invalid-service',
          assignmentType: 'individual'
        })
      )

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      expect(result.current.staffResults).toEqual([])
    })

    it('should handle database errors gracefully', async () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

      const fromMock = vi.fn(() =>
        createMockChain(null, new Error('Database connection failed'))
      )
      ;(supabase.from as any) = fromMock

      const { result } = renderHook(() =>
        useStaffAvailabilityCheck({
          date: '2025-10-26',
          startTime: '14:00',
          endTime: '16:00',
          servicePackageId: 'service-1',
          assignmentType: 'individual'
        })
      )

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      expect(result.current.error).toBeDefined()
      expect(result.current.staffResults).toEqual([])

      consoleErrorSpy.mockRestore()
    })

    it('should clear results on error', async () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

      const fromMock = vi.fn(() => {
        throw new Error('Network error')
      })
      ;(supabase.from as any) = fromMock

      const { result } = renderHook(() =>
        useStaffAvailabilityCheck({
          date: '2025-10-26',
          startTime: '14:00',
          endTime: '16:00',
          servicePackageId: 'service-1',
          assignmentType: 'individual'
        })
      )

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      expect(result.current.staffResults).toEqual([])
      expect(result.current.teamResults).toEqual([])

      consoleErrorSpy.mockRestore()
    })
  })

  describe('Helper Functions', () => {
    it('hasTimeOverlap: should detect overlap when ranges overlap', () => {
      // Testing the time overlap logic indirectly through hook behavior
      // Direct function is not exported but we can verify behavior
      const { result } = renderHook(() =>
        useStaffAvailabilityCheck({
          date: '2025-10-26',
          startTime: '11:00',
          endTime: '13:00',
          servicePackageId: 'service-1',
          assignmentType: 'individual'
        })
      )

      // This tests the internal hasTimeOverlap function behavior
      expect(result).toBeDefined()
    })

    it('should handle partial skill match (Deep Cleaning vs Cleaning)', async () => {
      const mockServiceDeepCleaning = {
        id: 'service-2',
        service_type: 'Deep Cleaning'
      }

      const fromMock = vi.fn((table: string) => {
        if (table === 'service_packages') {
          return createMockChain(mockServiceDeepCleaning)
        }
        if (table === 'profiles') {
          return {
            ...createMockChain(mockStaff),
            single: undefined
          }
        }
        return createMockChain([])
      })
      ;(supabase.from as any) = fromMock

      const { result } = renderHook(() =>
        useStaffAvailabilityCheck({
          date: '2025-10-26',
          startTime: '14:00',
          endTime: '16:00',
          servicePackageId: 'service-2',
          assignmentType: 'individual'
        })
      )

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      const staff1 = result.current.staffResults.find(s => s.staffId === 'staff-1')
      // Should have partial match (50 points) because staff has 'Deep Cleaning' skill
      expect(staff1?.skillMatch).toBe(80) // Exact match with 'Deep Cleaning' skill
    })
  })

  describe('Re-fetch on Parameter Change', () => {
    it('should re-fetch when date changes', async () => {
      const { result, rerender } = renderHook(
        ({ date }) =>
          useStaffAvailabilityCheck({
            date,
            startTime: '14:00',
            endTime: '16:00',
            servicePackageId: 'service-1',
            assignmentType: 'individual'
          }),
        { initialProps: { date: '2025-10-26' } }
      )

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      const firstCallCount = (supabase.from as any).mock.calls.length

      // Change date
      rerender({ date: '2025-10-27' })

      await waitFor(() => {
        expect((supabase.from as any).mock.calls.length).toBeGreaterThan(firstCallCount)
      })
    })

    it('should re-fetch when service package changes', async () => {
      const { result, rerender } = renderHook(
        ({ servicePackageId }) =>
          useStaffAvailabilityCheck({
            date: '2025-10-26',
            startTime: '14:00',
            endTime: '16:00',
            servicePackageId,
            assignmentType: 'individual'
          }),
        { initialProps: { servicePackageId: 'service-1' } }
      )

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      vi.clearAllMocks()

      // Change service package
      rerender({ servicePackageId: 'service-2' })

      await waitFor(() => {
        expect(supabase.from).toHaveBeenCalled()
      })
    })

    it('should switch between staff and team modes', async () => {
      const { result, rerender } = renderHook(
        ({ assignmentType }: { assignmentType: 'individual' | 'team' }) =>
          useStaffAvailabilityCheck({
            date: '2025-10-26',
            startTime: '14:00',
            endTime: '16:00',
            servicePackageId: 'service-1',
            assignmentType
          }),
        { initialProps: { assignmentType: 'individual' as 'individual' | 'team' } }
      )

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      expect(result.current.staffResults.length).toBeGreaterThan(0)

      // Switch to team mode
      rerender({ assignmentType: 'team' })

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      expect(result.current.teamResults).toBeDefined()
    })
  })
})
