import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useCustomers } from '../use-customers'
import { supabase } from '@/lib/supabase'
import type { CustomerRecord } from '@/types/customer'
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

// Mock customer data
const mockCustomers: CustomerRecord[] = [
  {
    id: '1',
    full_name: 'John Doe',
    email: 'john@example.com',
    phone: '08123456789',
    line_id: null,
    address: '123 Main St',
    city: 'Bangkok',
    state: 'Bangkok',
    zip_code: '10100',
    relationship_level: 'new',
    preferred_contact_method: 'phone',
    tags: null,
    source: null,
    source_other: null,
    birthday: null,
    company_name: null,
    tax_id: null,
    notes: null,
    created_at: '2025-01-01T00:00:00Z',
    updated_at: '2025-01-01T00:00:00Z',
    deleted_at: null,
    booking_count: 0,
    bookings: undefined,
  } as any,
  {
    id: '2',
    full_name: 'Jane Smith',
    email: 'jane@example.com',
    phone: '08987654321',
    line_id: null,
    address: '456 Second St',
    city: 'Chiang Mai',
    state: 'Chiang Mai',
    zip_code: '50000',
    relationship_level: 'vip',
    preferred_contact_method: 'email',
    tags: ['VIP'],
    source: null,
    source_other: null,
    birthday: null,
    company_name: null,
    tax_id: null,
    notes: 'VIP customer',
    created_at: '2025-01-02T00:00:00Z',
    updated_at: '2025-01-02T00:00:00Z',
    deleted_at: null,
    booking_count: 0,
    bookings: undefined,
  } as any,
]

describe('useCustomers', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('Loading State', () => {
    it('should start with loading state', () => {
      // Arrange
      const mockFrom = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          is: vi.fn().mockReturnValue({
            order: vi.fn().mockReturnValue(new Promise(() => {})), // Never resolves
          }),
        }),
      })
      vi.mocked(supabase.from).mockImplementation(mockFrom)

      // Act
      const { result } = renderHook(() => useCustomers({ enableRealtime: false }), {
        wrapper: createWrapper(),
      })

      // Assert
      expect(result.current.loading).toBe(true)
      expect(result.current.customers).toEqual([])
      expect(result.current.error).toBe(null)
    })
  })

  describe('Success State', () => {
    it('should load customers successfully', async () => {
      // Arrange
      const mockFrom = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          is: vi.fn().mockReturnValue({
            order: vi.fn().mockResolvedValue({ data: mockCustomers, error: null }),
          }),
        }),
      })
      vi.mocked(supabase.from).mockImplementation(mockFrom)

      // Act
      const { result } = renderHook(() => useCustomers({ enableRealtime: false }), {
        wrapper: createWrapper(),
      })

      // Assert
      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      expect(result.current.customers).toEqual(mockCustomers)
      expect(result.current.error).toBe(null)
    })

    it('should return empty array when no customers', async () => {
      // Arrange
      const mockFrom = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          is: vi.fn().mockReturnValue({
            order: vi.fn().mockResolvedValue({ data: [], error: null }),
          }),
        }),
      })
      vi.mocked(supabase.from).mockImplementation(mockFrom)

      // Act
      const { result } = renderHook(() => useCustomers({ enableRealtime: false }), {
        wrapper: createWrapper(),
      })

      // Assert
      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      expect(result.current.customers).toEqual([])
      expect(result.current.error).toBe(null)
    })
  })

  describe('Error State', () => {
    it('should handle fetch error', async () => {
      // Arrange
      const mockError = new Error('Failed to fetch customers')
      const mockFrom = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          is: vi.fn().mockReturnValue({
            order: vi.fn().mockRejectedValue(mockError),
          }),
        }),
      })
      vi.mocked(supabase.from).mockImplementation(mockFrom)

      // Act
      const { result } = renderHook(() => useCustomers({ enableRealtime: false }), {
        wrapper: createWrapper(),
      })

      // Assert
      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      expect(result.current.error).toBe('Failed to fetch customers')
      expect(result.current.customers).toEqual([])
    })

    it('should handle Supabase error response', async () => {
      // Arrange
      const mockFrom = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          is: vi.fn().mockReturnValue({
            order: vi.fn().mockResolvedValue({
              data: null,
              error: { message: 'Database connection error' },
            }),
          }),
        }),
      })
      vi.mocked(supabase.from).mockImplementation(mockFrom)

      // Act
      const { result } = renderHook(() => useCustomers({ enableRealtime: false }), {
        wrapper: createWrapper(),
      })

      // Assert
      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      expect(result.current.error).toBeTruthy()
    })
  })

  describe('Options', () => {
    it('should filter archived customers by default', async () => {
      // Arrange
      const mockOrder = vi.fn().mockResolvedValue({ data: mockCustomers, error: null })
      const mockIs = vi.fn().mockReturnValue({ order: mockOrder })
      const mockSelect = vi.fn().mockReturnValue({ is: mockIs })
      const mockFrom = vi.fn().mockReturnValue({ select: mockSelect })
      vi.mocked(supabase.from).mockImplementation(mockFrom)

      // Act
      renderHook(() => useCustomers({ enableRealtime: false }), {
        wrapper: createWrapper(),
      })

      // Assert
      await waitFor(() => {
        expect(mockIs).toHaveBeenCalledWith('deleted_at', null)
      })
    })

    it('should include archived customers when showArchived is true', async () => {
      // Arrange
      const mockOrder = vi.fn().mockResolvedValue({ data: mockCustomers, error: null })
      const mockSelect = vi.fn().mockReturnValue({ order: mockOrder })
      const mockFrom = vi.fn().mockReturnValue({ select: mockSelect })
      vi.mocked(supabase.from).mockImplementation(mockFrom)

      // Act
      renderHook(() => useCustomers({ showArchived: true, enableRealtime: false }), {
        wrapper: createWrapper(),
      })

      // Assert
      await waitFor(() => {
        expect(mockFrom).toHaveBeenCalledWith('customers')
      })
    })
  })

  describe('Refresh', () => {
    it('should have refresh function', async () => {
      // Arrange
      const mockFrom = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          is: vi.fn().mockReturnValue({
            order: vi.fn().mockResolvedValue({ data: mockCustomers, error: null }),
          }),
        }),
      })
      vi.mocked(supabase.from).mockImplementation(mockFrom)

      // Act
      const { result } = renderHook(() => useCustomers({ enableRealtime: false }), {
        wrapper: createWrapper(),
      })

      // Assert
      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      expect(typeof result.current.refresh).toBe('function')
    })
  })

  describe('Realtime Subscription', () => {
    it('should set up realtime subscription when enabled', () => {
      // Arrange
      const mockFrom = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          is: vi.fn().mockReturnValue({
            order: vi.fn().mockResolvedValue({ data: mockCustomers, error: null }),
          }),
        }),
      })
      vi.mocked(supabase.from).mockImplementation(mockFrom)

      // Act
      renderHook(() => useCustomers({ enableRealtime: true }), {
        wrapper: createWrapper(),
      })

      // Assert
      expect(supabase.channel).toHaveBeenCalledWith('customers-realtime')
    })

    it('should not set up realtime subscription when disabled', () => {
      // Arrange
      const mockFrom = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          is: vi.fn().mockReturnValue({
            order: vi.fn().mockResolvedValue({ data: mockCustomers, error: null }),
          }),
        }),
      })
      vi.mocked(supabase.from).mockImplementation(mockFrom)

      // Act
      renderHook(() => useCustomers({ enableRealtime: false }), {
        wrapper: createWrapper(),
      })

      // Assert
      expect(supabase.channel).not.toHaveBeenCalled()
    })
  })
})
