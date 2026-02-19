import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useBookings, useBookingsByDateRange, useBookingsByCustomer } from '../use-bookings'
import { supabase } from '@/lib/supabase'
import type { ReactNode } from 'react'

// Mock Supabase
vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: vi.fn(),
    channel: vi.fn(() => ({
      on: vi.fn().mockReturnThis(),
      subscribe: vi.fn().mockReturnThis(),
    })),
    removeChannel: vi.fn(),
  },
}))

// Mock booking-queries to bypass complex Supabase query chain
const mockFetchBookings = vi.fn()
const mockFetchBookingsByDateRange = vi.fn()
const mockFetchBookingsByCustomer = vi.fn()

vi.mock('@/lib/queries/booking-queries', () => ({
  bookingQueryOptions: {
    list: (showArchived: boolean) => ({
      queryKey: ['bookings', 'list', showArchived],
      queryFn: () => mockFetchBookings(showArchived),
      staleTime: 3 * 60 * 1000,
    }),
    byDateRange: (startDate: string, endDate: string, filters?: unknown) => ({
      queryKey: ['bookings', 'dateRange', startDate, endDate, filters],
      queryFn: () => mockFetchBookingsByDateRange(startDate, endDate, filters),
      staleTime: 30 * 1000,
    }),
    byCustomer: (customerId: string, showArchived: boolean) => ({
      queryKey: ['bookings', 'customer', customerId, showArchived],
      queryFn: () => mockFetchBookingsByCustomer(customerId, showArchived),
      staleTime: 3 * 60 * 1000,
    }),
  },
}))

// Test wrapper with React Query
const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,
      },
    },
  })

  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  )
}

// Mock booking data
const mockBookings = [
  {
    id: '1',
    customer_id: 'cust-1',
    booking_date: '2025-12-01',
    start_time: '10:00',
    end_time: '12:00',
    status: 'confirmed',
    total_price: 1500,
    address: '123 Main St',
    city: 'Bangkok',
    created_at: '2025-01-01T00:00:00Z',
    updated_at: '2025-01-01T00:00:00Z',
    deleted_at: null,
    customers: { id: 'cust-1', full_name: 'John Doe', email: 'john@example.com' },
    service_packages: { name: 'Basic', service_type: 'cleaning' },
    profiles: { full_name: 'Staff 1' },
    teams: null,
  },
  {
    id: '2',
    customer_id: 'cust-2',
    booking_date: '2025-12-02',
    start_time: '14:00',
    end_time: '16:00',
    status: 'pending',
    total_price: 2000,
    address: '456 Second St',
    city: 'Chiang Mai',
    created_at: '2025-01-02T00:00:00Z',
    updated_at: '2025-01-02T00:00:00Z',
    deleted_at: null,
    customers: { id: 'cust-2', full_name: 'Jane Doe', email: 'jane@example.com' },
    service_packages: { name: 'Premium', service_type: 'cleaning' },
    profiles: { full_name: 'Staff 2' },
    teams: null,
  },
]

describe('useBookings', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('Loading State', () => {
    it('should start with loading state', () => {
      // Arrange - Never resolves
      mockFetchBookings.mockReturnValue(new Promise(() => {}))

      // Act
      const { result } = renderHook(() => useBookings(), {
        wrapper: createWrapper(),
      })

      // Assert
      expect(result.current.loading).toBe(true)
      expect(result.current.bookings).toEqual([])
      expect(result.current.error).toBe(null)
    })
  })

  describe('Success State', () => {
    it('should load bookings successfully', async () => {
      // Arrange
      mockFetchBookings.mockResolvedValue(mockBookings)

      // Act
      const { result } = renderHook(() => useBookings(), {
        wrapper: createWrapper(),
      })

      // Assert
      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      expect(result.current.bookings.length).toBe(2)
      expect(result.current.bookings[0].id).toBe('1')
      expect(result.current.bookings[1].id).toBe('2')
      expect(result.current.error).toBe(null)
    })

    it('should return empty array when no bookings', async () => {
      // Arrange
      mockFetchBookings.mockResolvedValue([])

      // Act
      const { result } = renderHook(() => useBookings(), {
        wrapper: createWrapper(),
      })

      // Assert
      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      expect(result.current.bookings).toEqual([])
      expect(result.current.error).toBe(null)
    })
  })

  describe('Error State', () => {
    it('should handle fetch error', async () => {
      // Arrange
      mockFetchBookings.mockRejectedValue(new Error('Failed to fetch bookings'))

      // Act
      const { result } = renderHook(() => useBookings(), {
        wrapper: createWrapper(),
      })

      // Assert
      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      expect(result.current.error).toBe('Failed to fetch bookings')
      expect(result.current.bookings).toEqual([])
    })
  })

  // NOTE: Realtime subscription tests removed - now handled by BookingRealtimeProvider

  describe('Refresh', () => {
    it('should have refresh function', async () => {
      // Arrange
      mockFetchBookings.mockResolvedValue(mockBookings)

      // Act
      const { result } = renderHook(() => useBookings(), {
        wrapper: createWrapper(),
      })

      // Assert
      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      expect(typeof result.current.refresh).toBe('function')
    })
  })
})

describe('useBookingsByDateRange', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('Date Range Query', () => {
    it('should not fetch when enabled is false', async () => {
      // Arrange - should not be called
      mockFetchBookingsByDateRange.mockResolvedValue(mockBookings)

      // Act
      const { result } = renderHook(
        () =>
          useBookingsByDateRange({
            dateRange: { start: '2025-12-01', end: '2025-12-31' },
            enabled: false,
          }),
        { wrapper: createWrapper() }
      )

      // Assert
      expect(result.current.isLoading).toBe(false)
      expect(mockFetchBookingsByDateRange).not.toHaveBeenCalled()
    })

    it('should fetch bookings within date range', async () => {
      // Arrange
      mockFetchBookingsByDateRange.mockResolvedValue(mockBookings)

      // Act
      const { result } = renderHook(
        () =>
          useBookingsByDateRange({
            dateRange: { start: '2025-12-01', end: '2025-12-31' },
          }),
        { wrapper: createWrapper() }
      )

      // Assert
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      expect(result.current.bookings.length).toBe(2)
      expect(result.current.error).toBe(null)
    })
  })

  // NOTE: Realtime subscription tests removed - now handled by BookingRealtimeProvider
})

describe('useBookingsByCustomer', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('Customer Bookings Query', () => {
    it('should not fetch when enabled is false', () => {
      // Arrange
      mockFetchBookingsByCustomer.mockResolvedValue(mockBookings)

      // Act
      const { result } = renderHook(
        () =>
          useBookingsByCustomer({
            customerId: 'cust-1',
            enabled: false,
          }),
        { wrapper: createWrapper() }
      )

      // Assert
      expect(result.current.isLoading).toBe(false)
      expect(mockFetchBookingsByCustomer).not.toHaveBeenCalled()
    })

    it('should fetch bookings for specific customer', async () => {
      // Arrange
      const customerBookings = mockBookings.filter((b) => b.customer_id === 'cust-1')
      mockFetchBookingsByCustomer.mockResolvedValue(customerBookings)

      // Act
      const { result } = renderHook(
        () =>
          useBookingsByCustomer({
            customerId: 'cust-1',
          }),
        { wrapper: createWrapper() }
      )

      // Assert
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      expect(result.current.bookings.length).toBe(1)
      expect(result.current.bookings[0].customer_id).toBe('cust-1')
      expect(result.current.error).toBe(null)
    })
  })

  describe('Realtime Subscription', () => {
    it('should set up realtime subscription for customer bookings', () => {
      // Arrange
      mockFetchBookingsByCustomer.mockResolvedValue(mockBookings)

      // Act
      renderHook(
        () =>
          useBookingsByCustomer({
            customerId: 'cust-1',
          }),
        { wrapper: createWrapper() }
      )

      // Assert
      expect(supabase.channel).toHaveBeenCalledWith('bookings-customer-realtime')
    })
  })

  describe('Options', () => {
    it('should call fetch with correct customer ID', async () => {
      // Arrange
      mockFetchBookingsByCustomer.mockResolvedValue(mockBookings)

      // Act
      renderHook(
        () =>
          useBookingsByCustomer({
            customerId: 'cust-1',
          }),
        { wrapper: createWrapper() }
      )

      // Assert
      await waitFor(() => {
        expect(mockFetchBookingsByCustomer).toHaveBeenCalledWith('cust-1', false)
      })
    })

    it('should pass showArchived option correctly', async () => {
      // Arrange
      mockFetchBookingsByCustomer.mockResolvedValue(mockBookings)

      // Act
      renderHook(
        () =>
          useBookingsByCustomer({
            customerId: 'cust-1',
            showArchived: true,
          }),
        { wrapper: createWrapper() }
      )

      // Assert
      await waitFor(() => {
        expect(mockFetchBookingsByCustomer).toHaveBeenCalledWith('cust-1', true)
      })
    })
  })
})
