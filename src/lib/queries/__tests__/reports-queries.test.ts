import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  fetchReportsBookings,
  fetchReportsCustomers,
  fetchReportsStaff,
  fetchReportsTeams,
  reportsQueryOptions,
  type BookingWithService,
} from '../reports-queries'
import type { Staff, Team, BookingForAnalytics } from '@/lib/analytics'

// Mock supabase
vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: vi.fn(),
  },
}))

import { supabase } from '@/lib/supabase'

// ============================================================================
// MOCK DATA FACTORIES
// ============================================================================

const createMockBooking = (overrides: Partial<BookingWithService> = {}): BookingWithService => ({
  id: 'booking-1',
  booking_date: '2025-10-26T10:00:00Z',
  start_time: '10:00:00',
  total_price: 1500,
  status: 'completed',
  payment_status: 'paid',
  payment_date: '2025-10-26T10:00:00Z',
  created_at: '2025-10-20T10:00:00Z',
  customer_id: 'customer-1',
  staff_id: 'staff-1',
  service_package_id: 'package-1',
  package_v2_id: null,
  recurring_group_id: null,
  recurring_sequence: undefined,
  recurring_total: undefined,
  recurring_pattern: null,
  is_recurring: false,
  parent_booking_id: null,
  service_packages: { name: 'Basic Cleaning', service_type: 'Cleaning' },
  ...overrides,
})

const createMockCustomer = (overrides: any = {}): any => ({
  id: 'customer-1',
  full_name: 'John Doe',
  email: 'john@example.com',
  phone: '0812345678',
  address: null,
  city: null,
  state: null,
  zip_code: null,
  tags: [],
  created_at: '2025-01-15T10:00:00Z',
  updated_at: '2025-01-15T10:00:00Z',
  deleted_at: null,
  deleted_by: null,
  ...overrides,
})

const createMockBookingForAnalytics = (overrides: Partial<BookingForAnalytics> = {}): BookingForAnalytics => ({
  id: 'booking-1',
  booking_date: '2025-10-26',
  total_price: 1500,
  status: 'completed',
  payment_status: 'paid',
  payment_date: '2025-10-26',
  created_at: '2025-10-20T10:00:00Z',
  customer_id: 'customer-1',
  staff_id: 'staff-1',
  ...overrides,
})

const createMockStaff = (overrides: Partial<Staff> = {}): Staff => ({
  id: 'staff-1',
  full_name: 'Jane Smith',
  email: 'jane@example.com',
  role: 'staff',
  created_at: '2025-01-01T00:00:00Z',
  ...overrides,
})

const createMockTeam = (overrides: Partial<Team> = {}): Team => ({
  id: 'team-1',
  name: 'Team Alpha',
  is_active: true,
  created_at: '2025-01-01T00:00:00Z',
  ...overrides,
})

// ============================================================================
// TESTS
// ============================================================================

describe('Reports Query Functions', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('fetchReportsBookings', () => {
    it('should fetch bookings with service packages', async () => {
      // Arrange
      const mockBookings = [
        createMockBooking({ id: 'b1', service_packages: { name: 'Package 1', service_type: 'Cleaning' } }),
        createMockBooking({ id: 'b2', service_packages: { name: 'Package 2', service_type: 'Maintenance' } }),
      ]

      const mockSupabaseChain = {
        select: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: mockBookings, error: null }),
      }

      vi.mocked(supabase.from).mockReturnValue(mockSupabaseChain as any)

      // Act
      const result = await fetchReportsBookings()

      // Assert
      expect(supabase.from).toHaveBeenCalledWith('bookings')
      expect(mockSupabaseChain.select).toHaveBeenCalled()
      expect(mockSupabaseChain.order).toHaveBeenCalledWith('booking_date', { ascending: true })
      expect(result).toHaveLength(2)
      expect(result[0].id).toBe('b1')
      expect(result[0].service_packages?.name).toBe('Package 1')
    })

    it('should transform array service_packages to single object', async () => {
      // Arrange - Supabase returns service_packages as array
      const mockBookings = [
        {
          ...createMockBooking({ id: 'b1' }),
          service_packages: [{ name: 'Package 1', service_type: 'Cleaning' }], // Array format
        },
      ]

      const mockSupabaseChain = {
        select: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: mockBookings, error: null }),
      }

      vi.mocked(supabase.from).mockReturnValue(mockSupabaseChain as any)

      // Act
      const result = await fetchReportsBookings()

      // Assert
      expect(result[0].service_packages).toEqual({ name: 'Package 1', service_type: 'Cleaning' })
      expect(Array.isArray(result[0].service_packages)).toBe(false)
    })

    it('should handle null service_packages', async () => {
      // Arrange
      const mockBookings = [
        createMockBooking({ id: 'b1', service_packages: null }),
      ]

      const mockSupabaseChain = {
        select: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: mockBookings, error: null }),
      }

      vi.mocked(supabase.from).mockReturnValue(mockSupabaseChain as any)

      // Act
      const result = await fetchReportsBookings()

      // Assert
      // Transformation returns undefined when both service_packages and service_packages_v2 are null
      expect(result[0].service_packages).toBeUndefined()
    })

    it('should prefer service_packages_v2 if service_packages is null', async () => {
      // Arrange - V2 package
      const mockBookings = [
        {
          ...createMockBooking({ id: 'b1' }),
          service_packages: null,
          service_packages_v2: { name: 'V2 Package', service_type: 'Deep Cleaning' },
        },
      ]

      const mockSupabaseChain = {
        select: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: mockBookings, error: null }),
      }

      vi.mocked(supabase.from).mockReturnValue(mockSupabaseChain as any)

      // Act
      const result = await fetchReportsBookings()

      // Assert
      expect(result[0].service_packages?.name).toBe('V2 Package')
      expect(result[0].service_packages?.service_type).toBe('Deep Cleaning')
    })

    it('should throw error when fetch fails', async () => {
      // Arrange
      const mockSupabaseChain = {
        select: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: null, error: { message: 'Database error' } }),
      }

      vi.mocked(supabase.from).mockReturnValue(mockSupabaseChain as any)

      // Act & Assert
      await expect(fetchReportsBookings()).rejects.toThrow('Failed to fetch reports bookings: Database error')
    })

    it('should handle empty bookings array', async () => {
      // Arrange
      const mockSupabaseChain = {
        select: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: [], error: null }),
      }

      vi.mocked(supabase.from).mockReturnValue(mockSupabaseChain as any)

      // Act
      const result = await fetchReportsBookings()

      // Assert
      expect(result).toEqual([])
    })

    it('should handle empty service_packages array and fallback to null', async () => {
      // Arrange - Empty array should fallback to null (covers line 132)
      const mockBookings = [
        {
          ...createMockBooking({ id: 'b1' }),
          service_packages: [], // Empty array
        },
      ]

      const mockSupabaseChain = {
        select: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: mockBookings, error: null }),
      }

      vi.mocked(supabase.from).mockReturnValue(mockSupabaseChain as any)

      // Act
      const result = await fetchReportsBookings()

      // Assert
      expect(result[0].service_packages).toBeNull()
    })
  })

  describe('fetchReportsCustomers', () => {
    it('should fetch customers and group bookings by customer', async () => {
      // Arrange
      const mockCustomers = [
        createMockCustomer({ id: 'c1', full_name: 'John Doe' }),
        createMockCustomer({ id: 'c2', full_name: 'Jane Smith' }),
      ]

      const mockBookings = [
        createMockBookingForAnalytics({ id: 'b1', customer_id: 'c1' }),
        createMockBookingForAnalytics({ id: 'b2', customer_id: 'c1' }),
        createMockBookingForAnalytics({ id: 'b3', customer_id: 'c2' }),
      ]

      const mockCustomersChain = {
        select: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: mockCustomers, error: null }),
      }

      const mockBookingsChain = {
        select: vi.fn().mockResolvedValue({ data: mockBookings, error: null }),
      }

      vi.mocked(supabase.from)
        .mockReturnValueOnce(mockCustomersChain as any)
        .mockReturnValueOnce(mockBookingsChain as any)

      // Act
      const result = await fetchReportsCustomers()

      // Assert
      expect(result.customers).toHaveLength(2)
      expect(result.customersWithBookings).toHaveLength(2)
      expect(result.customersWithBookings[0].bookings).toHaveLength(2) // c1 has 2 bookings
      expect(result.customersWithBookings[1].bookings).toHaveLength(1) // c2 has 1 booking
    })

    it('should handle customers with no bookings', async () => {
      // Arrange
      const mockCustomers = [
        createMockCustomer({ id: 'c1', full_name: 'John Doe' }),
      ]

      const mockCustomersChain = {
        select: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: mockCustomers, error: null }),
      }

      const mockBookingsChain = {
        select: vi.fn().mockResolvedValue({ data: [], error: null }),
      }

      vi.mocked(supabase.from)
        .mockReturnValueOnce(mockCustomersChain as any)
        .mockReturnValueOnce(mockBookingsChain as any)

      // Act
      const result = await fetchReportsCustomers()

      // Assert
      expect(result.customersWithBookings[0].bookings).toEqual([])
    })

    it('should throw error when customers fetch fails', async () => {
      // Arrange
      const mockCustomersChain = {
        select: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: null, error: { message: 'Customer error' } }),
      }

      vi.mocked(supabase.from).mockReturnValue(mockCustomersChain as any)

      // Act & Assert
      await expect(fetchReportsCustomers()).rejects.toThrow('Failed to fetch customers: Customer error')
    })

    it('should throw error when bookings fetch fails', async () => {
      // Arrange
      const mockCustomers = [createMockCustomer()]

      const mockCustomersChain = {
        select: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: mockCustomers, error: null }),
      }

      const mockBookingsChain = {
        select: vi.fn().mockResolvedValue({ data: null, error: { message: 'Booking error' } }),
      }

      vi.mocked(supabase.from)
        .mockReturnValueOnce(mockCustomersChain as any)
        .mockReturnValueOnce(mockBookingsChain as any)

      // Act & Assert
      await expect(fetchReportsCustomers()).rejects.toThrow('Failed to fetch customer bookings: Booking error')
    })

    it('should handle empty customers and bookings', async () => {
      // Arrange
      const mockCustomersChain = {
        select: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: [], error: null }),
      }

      const mockBookingsChain = {
        select: vi.fn().mockResolvedValue({ data: [], error: null }),
      }

      vi.mocked(supabase.from)
        .mockReturnValueOnce(mockCustomersChain as any)
        .mockReturnValueOnce(mockBookingsChain as any)

      // Act
      const result = await fetchReportsCustomers()

      // Assert
      expect(result.customers).toEqual([])
      expect(result.customersWithBookings).toEqual([])
    })
  })

  describe('fetchReportsStaff', () => {
    it('should fetch staff with individual bookings', async () => {
      // Arrange
      const mockStaff = [createMockStaff({ id: 's1' })]
      const mockStaffBookings = [
        createMockBookingForAnalytics({ id: 'b1', staff_id: 's1' }),
        createMockBookingForAnalytics({ id: 'b2', staff_id: 's1' }),
      ]

      const mockStaffChain = {
        select: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: mockStaff, error: null }),
      }

      const mockStaffBookingsChain = {
        select: vi.fn().mockReturnThis(),
        not: vi.fn().mockResolvedValue({ data: mockStaffBookings, error: null }),
      }

      const mockTeamMembersChain = {
        select: vi.fn().mockResolvedValue({ data: [], error: null }),
      }

      const mockTeamBookingsChain = {
        select: vi.fn().mockReturnThis(),
        not: vi.fn().mockResolvedValue({ data: [], error: null }),
      }

      vi.mocked(supabase.from)
        .mockReturnValueOnce(mockStaffChain as any)
        .mockReturnValueOnce(mockStaffBookingsChain as any)
        .mockReturnValueOnce(mockTeamMembersChain as any)
        .mockReturnValueOnce(mockTeamBookingsChain as any)

      // Act
      const result = await fetchReportsStaff()

      // Assert
      expect(result.staff).toHaveLength(1)
      expect(result.staffWithBookings).toHaveLength(1)
      expect(result.staffWithBookings[0].bookings).toHaveLength(2)
    })

    it('should divide team booking revenue by team member count', async () => {
      // Arrange
      const mockStaff = [
        createMockStaff({ id: 's1' }),
        createMockStaff({ id: 's2' }),
      ]

      const mockTeamMembers = [
        { team_id: 't1', staff_id: 's1', joined_at: '2025-01-01T00:00:00Z', left_at: null },
        { team_id: 't1', staff_id: 's2', joined_at: '2025-01-01T00:00:00Z', left_at: null },
      ]

      const mockTeamBookings = [
        {
          ...createMockBookingForAnalytics({ id: 'b1', total_price: 3000 }),
          team_id: 't1',
          team_member_count: 2,
        },
      ]

      const mockStaffChain = {
        select: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: mockStaff, error: null }),
      }

      const mockStaffBookingsChain = {
        select: vi.fn().mockReturnThis(),
        not: vi.fn().mockResolvedValue({ data: [], error: null }),
      }

      const mockTeamMembersChain = {
        select: vi.fn().mockResolvedValue({ data: mockTeamMembers, error: null }),
      }

      const mockTeamBookingsChain = {
        select: vi.fn().mockReturnThis(),
        not: vi.fn().mockResolvedValue({ data: mockTeamBookings, error: null }),
      }

      vi.mocked(supabase.from)
        .mockReturnValueOnce(mockStaffChain as any)
        .mockReturnValueOnce(mockStaffBookingsChain as any)
        .mockReturnValueOnce(mockTeamMembersChain as any)
        .mockReturnValueOnce(mockTeamBookingsChain as any)

      // Act
      const result = await fetchReportsStaff()

      // Assert
      // Each staff member should get 3000 / 2 = 1500
      expect(result.staffWithBookings[0].bookings[0].total_price).toBe(1500)
      expect(result.staffWithBookings[1].bookings[0].total_price).toBe(1500)
    })

    it('should filter team bookings by membership period (joined_at)', async () => {
      // Arrange
      const mockStaff = [createMockStaff({ id: 's1' })]

      const mockTeamMembers = [
        { team_id: 't1', staff_id: 's1', joined_at: '2025-05-01T00:00:00Z', left_at: null },
      ]

      const mockTeamBookings = [
        {
          ...createMockBookingForAnalytics({ id: 'b1' }),
          team_id: 't1',
          team_member_count: 1,
          created_at: '2025-04-01T00:00:00Z', // BEFORE joined_at
        },
        {
          ...createMockBookingForAnalytics({ id: 'b2' }),
          team_id: 't1',
          team_member_count: 1,
          created_at: '2025-06-01T00:00:00Z', // AFTER joined_at
        },
      ]

      const mockStaffChain = {
        select: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: mockStaff, error: null }),
      }

      const mockStaffBookingsChain = {
        select: vi.fn().mockReturnThis(),
        not: vi.fn().mockResolvedValue({ data: [], error: null }),
      }

      const mockTeamMembersChain = {
        select: vi.fn().mockResolvedValue({ data: mockTeamMembers, error: null }),
      }

      const mockTeamBookingsChain = {
        select: vi.fn().mockReturnThis(),
        not: vi.fn().mockResolvedValue({ data: mockTeamBookings, error: null }),
      }

      vi.mocked(supabase.from)
        .mockReturnValueOnce(mockStaffChain as any)
        .mockReturnValueOnce(mockStaffBookingsChain as any)
        .mockReturnValueOnce(mockTeamMembersChain as any)
        .mockReturnValueOnce(mockTeamBookingsChain as any)

      // Act
      const result = await fetchReportsStaff()

      // Assert
      // Should only include b2 (created after joined_at)
      expect(result.staffWithBookings[0].bookings).toHaveLength(1)
      expect(result.staffWithBookings[0].bookings[0].id).toBe('b2')
    })

    it('should filter team bookings by membership period (left_at)', async () => {
      // Arrange
      const mockStaff = [createMockStaff({ id: 's1' })]

      const mockTeamMembers = [
        { team_id: 't1', staff_id: 's1', joined_at: '2025-01-01T00:00:00Z', left_at: '2025-06-01T00:00:00Z' },
      ]

      const mockTeamBookings = [
        {
          ...createMockBookingForAnalytics({ id: 'b1' }),
          team_id: 't1',
          team_member_count: 1,
          created_at: '2025-05-01T00:00:00Z', // BEFORE left_at
        },
        {
          ...createMockBookingForAnalytics({ id: 'b2' }),
          team_id: 't1',
          team_member_count: 1,
          created_at: '2025-07-01T00:00:00Z', // AFTER left_at
        },
      ]

      const mockStaffChain = {
        select: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: mockStaff, error: null }),
      }

      const mockStaffBookingsChain = {
        select: vi.fn().mockReturnThis(),
        not: vi.fn().mockResolvedValue({ data: [], error: null }),
      }

      const mockTeamMembersChain = {
        select: vi.fn().mockResolvedValue({ data: mockTeamMembers, error: null }),
      }

      const mockTeamBookingsChain = {
        select: vi.fn().mockReturnThis(),
        not: vi.fn().mockResolvedValue({ data: mockTeamBookings, error: null }),
      }

      vi.mocked(supabase.from)
        .mockReturnValueOnce(mockStaffChain as any)
        .mockReturnValueOnce(mockStaffBookingsChain as any)
        .mockReturnValueOnce(mockTeamMembersChain as any)
        .mockReturnValueOnce(mockTeamBookingsChain as any)

      // Act
      const result = await fetchReportsStaff()

      // Assert
      // Should only include b1 (created before left_at)
      expect(result.staffWithBookings[0].bookings).toHaveLength(1)
      expect(result.staffWithBookings[0].bookings[0].id).toBe('b1')
    })

    it('should throw error when staff fetch fails', async () => {
      // Arrange - Must mock all 4 queries in Promise.all
      const mockStaffChain = {
        select: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: null, error: { message: 'Staff error' } }),
      }

      const mockStaffBookingsChain = {
        select: vi.fn().mockReturnThis(),
        not: vi.fn().mockResolvedValue({ data: [], error: null }),
      }

      const mockTeamMembersChain = {
        select: vi.fn().mockResolvedValue({ data: [], error: null }),
      }

      const mockTeamBookingsChain = {
        select: vi.fn().mockReturnThis(),
        not: vi.fn().mockResolvedValue({ data: [], error: null }),
      }

      vi.mocked(supabase.from)
        .mockReturnValueOnce(mockStaffChain as any)
        .mockReturnValueOnce(mockStaffBookingsChain as any)
        .mockReturnValueOnce(mockTeamMembersChain as any)
        .mockReturnValueOnce(mockTeamBookingsChain as any)

      // Act & Assert
      await expect(fetchReportsStaff()).rejects.toThrow('Failed to fetch staff: Staff error')
    })

    it('should throw error when team bookings fetch fails', async () => {
      // Arrange - Covers line 235
      const mockStaff = [createMockStaff()]

      const mockStaffChain = {
        select: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: mockStaff, error: null }),
      }

      const mockStaffBookingsChain = {
        select: vi.fn().mockReturnThis(),
        not: vi.fn().mockResolvedValue({ data: [], error: null }),
      }

      const mockTeamMembersChain = {
        select: vi.fn().mockResolvedValue({ data: [], error: null }),
      }

      const mockTeamBookingsChain = {
        select: vi.fn().mockReturnThis(),
        not: vi.fn().mockResolvedValue({ data: null, error: { message: 'Team bookings error' } }),
      }

      vi.mocked(supabase.from)
        .mockReturnValueOnce(mockStaffChain as any)
        .mockReturnValueOnce(mockStaffBookingsChain as any)
        .mockReturnValueOnce(mockTeamMembersChain as any)
        .mockReturnValueOnce(mockTeamBookingsChain as any)

      // Act & Assert
      await expect(fetchReportsStaff()).rejects.toThrow('Failed to fetch team bookings: Team bookings error')
    })

    it('should handle staff with no bookings', async () => {
      // Arrange
      const mockStaff = [createMockStaff({ id: 's1' })]

      const mockStaffChain = {
        select: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: mockStaff, error: null }),
      }

      const mockStaffBookingsChain = {
        select: vi.fn().mockReturnThis(),
        not: vi.fn().mockResolvedValue({ data: [], error: null }),
      }

      const mockTeamMembersChain = {
        select: vi.fn().mockResolvedValue({ data: [], error: null }),
      }

      const mockTeamBookingsChain = {
        select: vi.fn().mockReturnThis(),
        not: vi.fn().mockResolvedValue({ data: [], error: null }),
      }

      vi.mocked(supabase.from)
        .mockReturnValueOnce(mockStaffChain as any)
        .mockReturnValueOnce(mockStaffBookingsChain as any)
        .mockReturnValueOnce(mockTeamMembersChain as any)
        .mockReturnValueOnce(mockTeamBookingsChain as any)

      // Act
      const result = await fetchReportsStaff()

      // Assert
      expect(result.staffWithBookings[0].bookings).toEqual([])
    })
  })

  describe('fetchReportsTeams', () => {
    it('should fetch teams with bookings', async () => {
      // Arrange
      const mockTeams = [createMockTeam({ id: 't1' })]

      const mockTeamsWithMembers = [
        {
          ...createMockTeam({ id: 't1' }),
          team_members: [{ id: 'tm1', left_at: null }, { id: 'tm2', left_at: null }],
        },
      ]

      const mockBookings = [
        createMockBookingForAnalytics({ id: 'b1', team_id: 't1' as any }),
        createMockBookingForAnalytics({ id: 'b2', team_id: 't1' as any }),
      ]

      const mockTeamsChain = {
        select: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: mockTeams, error: null }),
      }

      const mockTeamsWithMembersChain = {
        select: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: mockTeamsWithMembers, error: null }),
      }

      const mockBookingsChain = {
        select: vi.fn().mockReturnThis(),
        not: vi.fn().mockResolvedValue({ data: mockBookings, error: null }),
      }

      vi.mocked(supabase.from)
        .mockReturnValueOnce(mockTeamsChain as any)
        .mockReturnValueOnce(mockTeamsWithMembersChain as any)
        .mockReturnValueOnce(mockBookingsChain as any)

      // Act
      const result = await fetchReportsTeams()

      // Assert
      expect(result.teams).toHaveLength(1)
      expect(result.teamsWithBookings).toHaveLength(1)
      expect(result.teamsWithBookings[0].bookings).toHaveLength(2)
      expect(result.teamsWithBookings[0].team_members).toHaveLength(2)
    })

    it('should filter out left team members', async () => {
      // Arrange
      const mockTeams = [createMockTeam({ id: 't1' })]

      const mockTeamsWithMembers = [
        {
          ...createMockTeam({ id: 't1' }),
          team_members: [
            { id: 'tm1', left_at: null }, // Active
            { id: 'tm2', left_at: '2025-06-01T00:00:00Z' }, // Left
          ],
        },
      ]

      const mockTeamsChain = {
        select: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: mockTeams, error: null }),
      }

      const mockTeamsWithMembersChain = {
        select: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: mockTeamsWithMembers, error: null }),
      }

      const mockBookingsChain = {
        select: vi.fn().mockReturnThis(),
        not: vi.fn().mockResolvedValue({ data: [], error: null }),
      }

      vi.mocked(supabase.from)
        .mockReturnValueOnce(mockTeamsChain as any)
        .mockReturnValueOnce(mockTeamsWithMembersChain as any)
        .mockReturnValueOnce(mockBookingsChain as any)

      // Act
      const result = await fetchReportsTeams()

      // Assert
      // Should only include active member (tm1)
      expect(result.teamsWithBookings[0].team_members).toHaveLength(1)
      expect(result.teamsWithBookings[0].team_members[0].id).toBe('tm1')
    })

    it('should throw error when teams fetch fails', async () => {
      // Arrange - Must mock all 3 queries in Promise.all
      const mockTeamsChain = {
        select: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: null, error: { message: 'Teams error' } }),
      }

      const mockTeamsWithMembersChain = {
        select: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: [], error: null }),
      }

      const mockBookingsChain = {
        select: vi.fn().mockReturnThis(),
        not: vi.fn().mockResolvedValue({ data: [], error: null }),
      }

      vi.mocked(supabase.from)
        .mockReturnValueOnce(mockTeamsChain as any)
        .mockReturnValueOnce(mockTeamsWithMembersChain as any)
        .mockReturnValueOnce(mockBookingsChain as any)

      // Act & Assert
      await expect(fetchReportsTeams()).rejects.toThrow('Failed to fetch teams: Teams error')
    })

    it('should handle teams with no members', async () => {
      // Arrange
      const mockTeams = [createMockTeam({ id: 't1' })]

      const mockTeamsWithMembers = [
        {
          ...createMockTeam({ id: 't1' }),
          team_members: [],
        },
      ]

      const mockTeamsChain = {
        select: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: mockTeams, error: null }),
      }

      const mockTeamsWithMembersChain = {
        select: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: mockTeamsWithMembers, error: null }),
      }

      const mockBookingsChain = {
        select: vi.fn().mockReturnThis(),
        not: vi.fn().mockResolvedValue({ data: [], error: null }),
      }

      vi.mocked(supabase.from)
        .mockReturnValueOnce(mockTeamsChain as any)
        .mockReturnValueOnce(mockTeamsWithMembersChain as any)
        .mockReturnValueOnce(mockBookingsChain as any)

      // Act
      const result = await fetchReportsTeams()

      // Assert
      expect(result.teamsWithBookings[0].team_members).toEqual([])
    })

    it('should throw error when teams with members fetch fails', async () => {
      // Arrange - Covers line 390
      const mockTeams = [createMockTeam()]

      const mockTeamsChain = {
        select: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: mockTeams, error: null }),
      }

      const mockTeamsWithMembersChain = {
        select: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: null, error: { message: 'Teams with members error' } }),
      }

      const mockBookingsChain = {
        select: vi.fn().mockReturnThis(),
        not: vi.fn().mockResolvedValue({ data: [], error: null }),
      }

      vi.mocked(supabase.from)
        .mockReturnValueOnce(mockTeamsChain as any)
        .mockReturnValueOnce(mockTeamsWithMembersChain as any)
        .mockReturnValueOnce(mockBookingsChain as any)

      // Act & Assert
      await expect(fetchReportsTeams()).rejects.toThrow('Failed to fetch teams with members: Teams with members error')
    })

    it('should throw error when team bookings fetch fails', async () => {
      // Arrange - Covers line 393
      const mockTeams = [createMockTeam()]

      const mockTeamsWithMembers = [
        {
          ...createMockTeam(),
          team_members: [],
        },
      ]

      const mockTeamsChain = {
        select: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: mockTeams, error: null }),
      }

      const mockTeamsWithMembersChain = {
        select: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: mockTeamsWithMembers, error: null }),
      }

      const mockBookingsChain = {
        select: vi.fn().mockReturnThis(),
        not: vi.fn().mockResolvedValue({ data: null, error: { message: 'Team bookings error' } }),
      }

      vi.mocked(supabase.from)
        .mockReturnValueOnce(mockTeamsChain as any)
        .mockReturnValueOnce(mockTeamsWithMembersChain as any)
        .mockReturnValueOnce(mockBookingsChain as any)

      // Act & Assert
      await expect(fetchReportsTeams()).rejects.toThrow('Failed to fetch team bookings: Team bookings error')
    })

    it('should handle teams with no bookings', async () => {
      // Arrange
      const mockTeams = [createMockTeam({ id: 't1' })]

      const mockTeamsWithMembers = [
        {
          ...createMockTeam({ id: 't1' }),
          team_members: [{ id: 'tm1', left_at: null }],
        },
      ]

      const mockTeamsChain = {
        select: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: mockTeams, error: null }),
      }

      const mockTeamsWithMembersChain = {
        select: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: mockTeamsWithMembers, error: null }),
      }

      const mockBookingsChain = {
        select: vi.fn().mockReturnThis(),
        not: vi.fn().mockResolvedValue({ data: [], error: null }),
      }

      vi.mocked(supabase.from)
        .mockReturnValueOnce(mockTeamsChain as any)
        .mockReturnValueOnce(mockTeamsWithMembersChain as any)
        .mockReturnValueOnce(mockBookingsChain as any)

      // Act
      const result = await fetchReportsTeams()

      // Assert
      expect(result.teamsWithBookings[0].bookings).toEqual([])
    })
  })

  describe('reportsQueryOptions', () => {
    it('should have correct query options for bookings', () => {
      expect(reportsQueryOptions.bookings.queryFn).toBe(fetchReportsBookings)
      expect(reportsQueryOptions.bookings.staleTime).toBe(2 * 60 * 1000)
      expect(reportsQueryOptions.bookings.refetchOnMount).toBe('always')
      expect(reportsQueryOptions.bookings.refetchOnWindowFocus).toBe(true)
    })

    it('should have correct query options for customers', () => {
      expect(reportsQueryOptions.customers.queryFn).toBe(fetchReportsCustomers)
      expect(reportsQueryOptions.customers.staleTime).toBe(3 * 60 * 1000)
      expect(reportsQueryOptions.customers.refetchOnMount).toBe('always')
      expect(reportsQueryOptions.customers.refetchOnWindowFocus).toBe(true)
    })

    it('should have correct query options for staff', () => {
      expect(reportsQueryOptions.staff.queryFn).toBe(fetchReportsStaff)
      expect(reportsQueryOptions.staff.staleTime).toBe(3 * 60 * 1000)
      expect(reportsQueryOptions.staff.refetchOnMount).toBe('always')
      expect(reportsQueryOptions.staff.refetchOnWindowFocus).toBe(true)
    })

    it('should have correct query options for teams', () => {
      expect(reportsQueryOptions.teams.queryFn).toBe(fetchReportsTeams)
      expect(reportsQueryOptions.teams.staleTime).toBe(3 * 60 * 1000)
      expect(reportsQueryOptions.teams.refetchOnMount).toBe('always')
      expect(reportsQueryOptions.teams.refetchOnWindowFocus).toBe(true)
    })
  })
})
