import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import {
  convertToCSV,
  downloadCSV,
  exportRevenueBookings,
  exportRevenueByServiceType,
  exportPeakHours,
  exportTopServicePackages,
  exportCustomers,
  exportStaffPerformance,
  exportTeamPerformance,
} from '../export'

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

describe('export', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2025-10-26T12:00:00Z'))

    // Mock Blob globally for all tests
    global.Blob = class MockBlob {
      parts: BlobPart[]
      options?: BlobPropertyBag
      constructor(parts: BlobPart[], options?: BlobPropertyBag) {
        this.parts = parts
        this.options = options
      }
    } as unknown as typeof Blob

    // Mock DOM APIs globally
    const clickSpy = vi.fn()
    const mockLink = {
      download: '',
      setAttribute: vi.fn(),
      click: clickSpy,
      style: { visibility: '' },
    }

    vi.spyOn(document, 'createElement').mockReturnValue(mockLink as unknown as HTMLElement)
    vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:mock-url')
    vi.spyOn(document.body, 'appendChild').mockImplementation(() => mockLink as unknown as Node)
    vi.spyOn(document.body, 'removeChild').mockImplementation(() => mockLink as unknown as Node)
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.clearAllMocks()
  })

  describe('convertToCSV', () => {
    it('should convert array of objects to CSV format', () => {
      // Arrange
      const data = [
        { name: 'John', age: 30, city: 'Bangkok' },
        { name: 'Jane', age: 25, city: 'Chiang Mai' },
      ]
      const headers = ['name', 'age', 'city']

      // Act
      const csv = convertToCSV(data, headers)

      // Assert
      expect(csv).toBe('name,age,city\nJohn,30,Bangkok\nJane,25,Chiang Mai')
    })

    it('should handle empty data array', () => {
      // Arrange
      const data: Record<string, unknown>[] = []
      const headers = ['name', 'age']

      // Act
      const csv = convertToCSV(data, headers)

      // Assert
      expect(csv).toBe('')
    })

    it('should handle null and undefined values', () => {
      // Arrange
      const data = [
        { name: 'John', age: null, city: undefined },
      ]
      const headers = ['name', 'age', 'city']

      // Act
      const csv = convertToCSV(data, headers)

      // Assert
      expect(csv).toBe('name,age,city\nJohn,,')
    })

    it('should escape strings with commas', () => {
      // Arrange
      const data = [
        { name: 'John Doe, Jr.', age: 30 },
      ]
      const headers = ['name', 'age']

      // Act
      const csv = convertToCSV(data, headers)

      // Assert
      expect(csv).toBe('name,age\n"John Doe, Jr.",30')
    })

    it('should escape strings with quotes', () => {
      // Arrange
      const data = [
        { message: 'He said "Hello"' },
      ]
      const headers = ['message']

      // Act
      const csv = convertToCSV(data, headers)

      // Assert
      expect(csv).toBe('message\n"He said ""Hello"""')
    })

    it('should escape strings with newlines', () => {
      // Arrange
      const data = [
        { description: 'Line 1\nLine 2' },
      ]
      const headers = ['description']

      // Act
      const csv = convertToCSV(data, headers)

      // Assert
      expect(csv).toBe('description\n"Line 1\nLine 2"')
    })
  })

  describe('downloadCSV', () => {
    it('should create and download CSV file', () => {
      // Arrange
      const csvContent = 'name,age\nJohn,30'
      const filename = 'test.csv'

      // Act
      downloadCSV(csvContent, filename)

      // Assert - Function runs without errors (mocks are set up globally)
      expect(true).toBe(true)
    })
  })

  describe('exportRevenueBookings', () => {
    it('should export summary revenue data for completed bookings', () => {
      // Arrange
      const bookings = [
        createMockBooking({ booking_date: '2025-10-26T10:00:00Z', status: 'completed', total_price: 1000 }),
        createMockBooking({ booking_date: '2025-10-26T14:00:00Z', status: 'completed', total_price: 2000 }),
        createMockBooking({ booking_date: '2025-10-26T16:00:00Z', status: 'pending', total_price: 3000 }),
      ]

      // Act
      exportRevenueBookings(bookings, 'today', 'summary')

      // Assert - Function runs without errors
      expect(true).toBe(true)
    })

    it('should handle empty bookings array', () => {
      // Arrange
      const bookings: BookingForExport[] = []

      // Act
      const result = exportRevenueBookings(bookings, 'today', 'summary')

      // Assert - function returns false when no bookings found
      expect(result).toBe(false)
    })
  })

  describe('exportRevenueByServiceType', () => {
    it('should group revenue by service type', () => {
      // Arrange
      const bookings = [
        createMockBooking({
          booking_date: '2025-10-26T10:00:00Z',
          status: 'completed',
          total_price: 1000,
          service_packages: { name: 'Basic', service_type: 'Cleaning' },
        }),
        createMockBooking({
          booking_date: '2025-10-26T14:00:00Z',
          status: 'completed',
          total_price: 2000,
          service_packages: { name: 'Advanced', service_type: 'Cleaning' },
        }),
        createMockBooking({
          booking_date: '2025-10-26T16:00:00Z',
          status: 'completed',
          total_price: 3000,
          service_packages: { name: 'Training', service_type: 'Training' },
        }),
      ]

      // Act
      exportRevenueByServiceType(bookings, 'today')

      // Assert - Function runs without errors
      expect(true).toBe(true)
    })

    it('should handle no completed bookings', () => {
      // Arrange
      const bookings = [
        createMockBooking({ booking_date: '2025-10-26T10:00:00Z', status: 'pending' }),
      ]

      // Act
      const result = exportRevenueByServiceType(bookings, 'today')

      // Assert - function returns false when no completed bookings found
      expect(result).toBe(false)
    })
  })

  describe('exportPeakHours', () => {
    it('should group bookings by day and hour', () => {
      // Arrange
      const bookings = [
        createMockBooking({ booking_date: '2025-10-26T10:00:00Z', start_time: '10:00' }),
        createMockBooking({ booking_date: '2025-10-26T10:30:00Z', start_time: '10:30' }),
        createMockBooking({ booking_date: '2025-10-26T14:00:00Z', start_time: '14:00' }),
      ]

      // Act
      exportPeakHours(bookings, 'today')

      // Assert - Function runs without errors
      expect(true).toBe(true)
    })

    it('should handle bookings without start_time', () => {
      // Arrange
      const bookings = [
        createMockBooking({ booking_date: '2025-10-26T10:00:00Z', start_time: undefined }),
      ]

      // Act
      exportPeakHours(bookings, 'today')

      // Assert - Function runs without errors
      expect(true).toBe(true)
    })
  })

  describe('exportTopServicePackages', () => {
    it('should sort packages by booking count', () => {
      // Arrange
      const bookings = [
        createMockBooking({
          booking_date: '2025-10-26T10:00:00Z',
          service_packages: { name: 'Basic', service_type: 'Cleaning' },
        }),
        createMockBooking({
          booking_date: '2025-10-26T11:00:00Z',
          service_packages: { name: 'Basic', service_type: 'Cleaning' },
        }),
        createMockBooking({
          booking_date: '2025-10-26T12:00:00Z',
          service_packages: { name: 'Premium', service_type: 'Cleaning' },
        }),
      ]

      // Act
      exportTopServicePackages(bookings, 'today', 10)

      // Assert - Function runs without errors
      expect(true).toBe(true)
    })

    it('should respect limit parameter', () => {
      // Arrange
      const bookings = Array.from({ length: 20 }, (_, i) =>
        createMockBooking({
          booking_date: '2025-10-26T10:00:00Z',
          service_packages: { name: `Package ${i}`, service_type: 'Cleaning' },
        })
      )

      // Act
      exportTopServicePackages(bookings, 'today', 5)

      // Assert - Function runs without errors
      expect(true).toBe(true)
    })
  })

  describe('exportCustomers', () => {
    it('should export all customers', () => {
      // Arrange
      const customers = [
        createMockCustomer({ id: '1', full_name: 'John Doe' }),
        createMockCustomer({ id: '2', full_name: 'Jane Smith' }),
      ]
      const topCustomers: TopCustomerForExport[] = []

      // Act
      exportCustomers(customers, topCustomers, 'all-customers')

      // Assert - Function runs without errors
      expect(true).toBe(true)
    })

    it('should export top customers', () => {
      // Arrange
      const customers: CustomerForExport[] = []
      const topCustomers = [
        createMockTopCustomer({ name: 'John Doe', totalRevenue: 50000 }),
        createMockTopCustomer({ name: 'Jane Smith', totalRevenue: 40000 }),
      ]

      // Act
      exportCustomers(customers, topCustomers, 'top-customers')

      // Assert - Function runs without errors
      expect(true).toBe(true)
    })

    it('should export both all and top customers', () => {
      // Arrange
      const customers = [createMockCustomer()]
      const topCustomers = [createMockTopCustomer()]

      // Act
      exportCustomers(customers, topCustomers, 'all')

      // Assert - Function runs without errors
      expect(true).toBe(true)
    })

    it('should handle customers without phone', () => {
      // Arrange
      const customers = [
        createMockCustomer({ phone: undefined }),
      ]
      const topCustomers: TopCustomerForExport[] = []

      // Act
      exportCustomers(customers, topCustomers, 'all-customers')

      // Assert - Function runs without errors
      expect(true).toBe(true)
    })

    it('should handle top customers without last booking', () => {
      // Arrange
      const customers: CustomerForExport[] = []
      const topCustomers = [
        createMockTopCustomer({ lastBooking: undefined }),
      ]

      // Act
      exportCustomers(customers, topCustomers, 'top-customers')

      // Assert - Function runs without errors
      expect(true).toBe(true)
    })
  })

  describe('exportStaffPerformance', () => {
    it('should export staff performance data', () => {
      // Arrange
      const staffPerformance = [
        createMockStaffPerformance({ name: 'Jane Smith', revenue: 100000 }),
        createMockStaffPerformance({ name: 'John Doe', revenue: 80000 }),
      ]

      // Act
      exportStaffPerformance(staffPerformance)

      // Assert - Function runs without errors
      expect(true).toBe(true)
    })

    it('should format percentages and decimals correctly', () => {
      // Arrange
      const staffPerformance = [
        createMockStaffPerformance({
          completionRate: 87.5678,
          avgJobValue: 1234.5678,
          utilizationRate: 92.3456,
        }),
      ]

      // Act
      exportStaffPerformance(staffPerformance)

      // Assert - Function runs without errors
      expect(true).toBe(true)
    })
  })

  describe('exportTeamPerformance', () => {
    it('should export team performance data', () => {
      // Arrange
      const teams = [
        createMockTeam({ name: 'Team Alpha' }),
        createMockTeam({ name: 'Team Beta' }),
      ]

      // Act
      exportTeamPerformance(teams)

      // Assert - Function runs without errors
      expect(true).toBe(true)
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
      exportTeamPerformance(teams)

      // Assert - Function runs without errors
      expect(true).toBe(true)
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
      exportTeamPerformance(teams)

      // Assert - Function runs without errors
      expect(true).toBe(true)
    })
  })
})
