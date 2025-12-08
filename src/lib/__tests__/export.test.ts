import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import {
  exportRevenueAllToExcel,
  exportCustomersToExcel,
  exportStaffToExcel,
  exportTeamsToExcel,
} from '../export'

// Mock xlsx library
vi.mock('xlsx', () => ({
  utils: {
    book_new: vi.fn(() => ({ SheetNames: [], Sheets: {} })),
    json_to_sheet: vi.fn(() => ({})),
    book_append_sheet: vi.fn(),
  },
  writeFile: vi.fn(),
}))

// Mock data interfaces
interface BookingForExport {
  id: string
  booking_date: string
  start_time?: string
  total_price: number
  status: string
  created_at: string
  service_packages?: {
    name: string
    service_type: string
  } | null
}

interface CustomerForExport {
  id: string
  full_name: string
  email: string
  phone?: string
  created_at: string
}

interface TopCustomerForExport {
  name: string
  email: string
  totalBookings: number
  totalRevenue: number
  lastBooking?: string
}

interface StaffPerformanceForExport {
  name: string
  totalJobs: number
  completedJobs: number
  revenue: number
  completionRate: number
  avgJobValue: number
  utilizationRate: number
}

interface TeamForExport {
  name: string
  bookings: Array<{
    status: string
    total_price: number
  }>
  team_members: unknown[]
}

// Mock factory functions
const createMockBooking = (overrides: Partial<BookingForExport> = {}): BookingForExport => ({
  id: 'booking-123',
  booking_date: '2025-10-26T10:00:00Z',
  start_time: '10:00',
  total_price: 1000,
  status: 'completed',
  created_at: '2025-10-20T10:00:00Z',
  service_packages: {
    name: 'Basic Cleaning',
    service_type: 'Cleaning',
  },
  ...overrides,
})

const createMockCustomer = (overrides: Partial<CustomerForExport> = {}): CustomerForExport => ({
  id: 'customer-123',
  full_name: 'John Doe',
  email: 'john@example.com',
  phone: '0812345678',
  created_at: '2025-01-15T10:00:00Z',
  ...overrides,
})

const createMockTopCustomer = (overrides: Partial<TopCustomerForExport> = {}): TopCustomerForExport => ({
  name: 'John Doe',
  email: 'john@example.com',
  totalBookings: 10,
  totalRevenue: 15000,
  lastBooking: '2025-10-26T10:00:00Z',
  ...overrides,
})

const createMockStaffPerformance = (overrides: Partial<StaffPerformanceForExport> = {}): StaffPerformanceForExport => ({
  name: 'Jane Smith',
  totalJobs: 50,
  completedJobs: 45,
  revenue: 100000,
  completionRate: 90,
  avgJobValue: 2000,
  utilizationRate: 85,
  ...overrides,
})

const createMockTeam = (overrides: Partial<TeamForExport> = {}): TeamForExport => ({
  name: 'Team Alpha',
  bookings: [
    { status: 'completed', total_price: 2000 },
    { status: 'completed', total_price: 3000 },
    { status: 'in_progress', total_price: 1500 },
  ],
  team_members: [{}, {}, {}],
  ...overrides,
})

describe('Excel Export Functions', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2025-10-26T12:00:00Z'))
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.clearAllMocks()
  })

  describe('exportRevenueAllToExcel', () => {
    it('should export revenue data to Excel with multiple sheets', () => {
      // Arrange
      const bookings = [
        createMockBooking({ booking_date: '2025-10-26T10:00:00Z', status: 'completed', total_price: 1000 }),
        createMockBooking({ booking_date: '2025-10-26T14:00:00Z', status: 'completed', total_price: 2000 }),
        createMockBooking({ booking_date: '2025-10-26T16:00:00Z', status: 'pending', total_price: 3000 }),
      ]

      // Act
      const result = exportRevenueAllToExcel(bookings, 'thisMonth', 'admin')

      // Assert
      expect(result).toBe(true)
    })

    it('should return false when no bookings in date range', () => {
      // Arrange
      const bookings = [
        createMockBooking({ booking_date: '2024-01-01T10:00:00Z' }), // Out of range
      ]

      // Act
      const result = exportRevenueAllToExcel(bookings, 'today', 'admin')

      // Assert
      expect(result).toBe(false)
    })

    it('should handle empty bookings array', () => {
      // Arrange
      const bookings: BookingForExport[] = []

      // Act
      const result = exportRevenueAllToExcel(bookings, 'thisMonth', 'admin')

      // Assert
      expect(result).toBe(false)
    })
  })

  describe('exportCustomersToExcel', () => {
    it('should export customers data to Excel', () => {
      // Arrange
      const customers = [
        createMockCustomer({ id: '1', full_name: 'John Doe' }),
        createMockCustomer({ id: '2', full_name: 'Jane Smith' }),
      ]
      const topCustomers = [
        createMockTopCustomer({ name: 'John Doe', totalRevenue: 50000 }),
      ]

      // Act
      const result = exportCustomersToExcel(customers, topCustomers)

      // Assert
      expect(result).toBe(true)
    })

    it('should return false when no customers', () => {
      // Arrange
      const customers: CustomerForExport[] = []
      const topCustomers: TopCustomerForExport[] = []

      // Act
      const result = exportCustomersToExcel(customers, topCustomers)

      // Assert
      expect(result).toBe(false)
    })

    it('should handle customers without phone', () => {
      // Arrange
      const customers = [createMockCustomer({ phone: undefined })]
      const topCustomers: TopCustomerForExport[] = []

      // Act
      const result = exportCustomersToExcel(customers, topCustomers)

      // Assert
      expect(result).toBe(true)
    })

    it('should handle top customers without last booking', () => {
      // Arrange
      const customers = [createMockCustomer()]
      const topCustomers = [createMockTopCustomer({ lastBooking: undefined })]

      // Act
      const result = exportCustomersToExcel(customers, topCustomers)

      // Assert
      expect(result).toBe(true)
    })
  })

  describe('exportStaffToExcel', () => {
    it('should export staff performance data to Excel', () => {
      // Arrange
      const staffPerformance = [
        createMockStaffPerformance({ name: 'Jane Smith', revenue: 100000 }),
        createMockStaffPerformance({ name: 'John Doe', revenue: 80000 }),
      ]

      // Act
      const result = exportStaffToExcel(staffPerformance, 'admin')

      // Assert
      expect(result).toBe(true)
    })

    it('should return false when no staff data', () => {
      // Arrange
      const staffPerformance: StaffPerformanceForExport[] = []

      // Act
      const result = exportStaffToExcel(staffPerformance, 'admin')

      // Assert
      expect(result).toBe(false)
    })

    it('should export without revenue for non-admin roles', () => {
      // Arrange
      const staffPerformance = [createMockStaffPerformance()]

      // Act
      const result = exportStaffToExcel(staffPerformance, 'staff')

      // Assert
      expect(result).toBe(true)
    })
  })

  describe('exportTeamsToExcel', () => {
    it('should export team performance data to Excel', () => {
      // Arrange
      const teams = [
        createMockTeam({ name: 'Team Alpha' }),
        createMockTeam({ name: 'Team Beta' }),
      ]

      // Act
      const result = exportTeamsToExcel(teams, 'admin')

      // Assert
      expect(result).toBe(true)
    })

    it('should return false when no teams data', () => {
      // Arrange
      const teams: TeamForExport[] = []

      // Act
      const result = exportTeamsToExcel(teams, 'admin')

      // Assert
      expect(result).toBe(false)
    })

    it('should handle teams with no bookings', () => {
      // Arrange
      const teams = [
        createMockTeam({
          name: 'Team Empty',
          bookings: [],
          team_members: [{}, {}],
        }),
      ]

      // Act
      const result = exportTeamsToExcel(teams, 'admin')

      // Assert
      expect(result).toBe(true)
    })

    it('should calculate team metrics correctly', () => {
      // Arrange
      const teams = [
        createMockTeam({
          name: 'Team Alpha',
          bookings: [
            { status: 'completed', total_price: 2000 },
            { status: 'completed', total_price: 3000 },
            { status: 'in_progress', total_price: 1500 },
            { status: 'pending', total_price: 1000 },
          ],
          team_members: [{}, {}, {}],
        }),
      ]

      // Act
      const result = exportTeamsToExcel(teams, 'admin')

      // Assert
      expect(result).toBe(true)
    })

    it('should export without revenue for non-admin roles', () => {
      // Arrange
      const teams = [createMockTeam()]

      // Act
      const result = exportTeamsToExcel(teams, 'manager')

      // Assert
      expect(result).toBe(true)
    })
  })
})
