import { describe, it, expect, beforeEach, vi } from 'vitest'
import { fetchCustomers, fetchCustomerDetail } from '../customer-queries'
import { supabase } from '@/lib/supabase'

// Mock Supabase client
vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: vi.fn(),
  },
}))

describe('customer-queries', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  const createMockCustomer = (overrides = {}) => ({
    id: 'customer-1',
    full_name: 'John Doe',
    email: 'john@example.com',
    phone: '0812345678',
    address: '123 Main St',
    created_at: '2025-01-01T00:00:00Z',
    deleted_at: null,
    ...overrides,
  })

  describe('fetchCustomers', () => {
    it('should fetch customers excluding archived by default', async () => {
      const mockCustomers = [
        { ...createMockCustomer(), bookings: [{ count: 5 }] },
        { ...createMockCustomer({ id: 'customer-2', full_name: 'Jane Smith' }), bookings: [{ count: 3 }] },
      ]

      const mockChain = {
        select: vi.fn().mockReturnThis(),
        is: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: mockCustomers, error: null }),
      }

      vi.mocked(supabase.from).mockReturnValue(mockChain as any)

      const result = await fetchCustomers(false)

      expect(supabase.from).toHaveBeenCalledWith('customers')
      expect(mockChain.select).toHaveBeenCalledWith(expect.stringContaining('bookings:bookings(count)'))
      expect(mockChain.is).toHaveBeenCalledWith('deleted_at', null)
      expect(mockChain.order).toHaveBeenCalledWith('created_at', { ascending: false })
      expect(result).toHaveLength(2)
      expect(result[0].booking_count).toBe(5)
      expect(result[1].booking_count).toBe(3)
    })

    it('should fetch customers including archived when showArchived=true', async () => {
      const mockCustomers = [
        { ...createMockCustomer(), bookings: [{ count: 2 }] },
        { ...createMockCustomer({ id: 'customer-2', deleted_at: '2025-01-15' }), bookings: [{ count: 1 }] },
      ]

      const mockChain = {
        select: vi.fn().mockReturnThis(),
        is: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: mockCustomers, error: null }),
      }

      vi.mocked(supabase.from).mockReturnValue(mockChain as any)

      const result = await fetchCustomers(true)

      expect(mockChain.is).not.toHaveBeenCalled()
      expect(result).toHaveLength(2)
      expect(result[0].booking_count).toBe(2)
      expect(result[1].booking_count).toBe(1)
    })

    it('should transform booking count correctly', async () => {
      const mockCustomers = [
        { ...createMockCustomer(), bookings: [{ count: 10 }] },
      ]

      const mockChain = {
        select: vi.fn().mockReturnThis(),
        is: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: mockCustomers, error: null }),
      }

      vi.mocked(supabase.from).mockReturnValue(mockChain as any)

      const result = await fetchCustomers()

      expect(result[0].booking_count).toBe(10)
      // bookings property removed from type after transformation
    })

    it('should default booking count to 0 when no bookings', async () => {
      const mockCustomers = [
        { ...createMockCustomer(), bookings: [] },
        { ...createMockCustomer({ id: 'customer-2' }), bookings: null },
      ]

      const mockChain = {
        select: vi.fn().mockReturnThis(),
        is: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: mockCustomers, error: null }),
      }

      vi.mocked(supabase.from).mockReturnValue(mockChain as any)

      const result = await fetchCustomers()

      expect(result[0].booking_count).toBe(0)
      expect(result[1].booking_count).toBe(0)
    })

    it('should handle empty customer list', async () => {
      const mockChain = {
        select: vi.fn().mockReturnThis(),
        is: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: [], error: null }),
      }

      vi.mocked(supabase.from).mockReturnValue(mockChain as any)

      const result = await fetchCustomers()

      expect(result).toEqual([])
    })

    it('should handle null data from database', async () => {
      const mockChain = {
        select: vi.fn().mockReturnThis(),
        is: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: null, error: null }),
      }

      vi.mocked(supabase.from).mockReturnValue(mockChain as any)

      const result = await fetchCustomers()

      expect(result).toEqual([])
    })

    it('should throw error when database query fails', async () => {
      const mockChain = {
        select: vi.fn().mockReturnThis(),
        is: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: null, error: { message: 'Database error' } }),
      }

      vi.mocked(supabase.from).mockReturnValue(mockChain as any)

      await expect(fetchCustomers()).rejects.toThrow('Failed to fetch customers: Database error')
    })
  })

  describe('fetchCustomerDetail', () => {
    it('should fetch single customer by ID', async () => {
      const mockCustomer = createMockCustomer()

      const mockChain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: mockCustomer, error: null }),
      }

      vi.mocked(supabase.from).mockReturnValue(mockChain as any)

      const result = await fetchCustomerDetail('customer-1')

      expect(supabase.from).toHaveBeenCalledWith('customers')
      expect(mockChain.select).toHaveBeenCalledWith('*')
      expect(mockChain.eq).toHaveBeenCalledWith('id', 'customer-1')
      expect(mockChain.single).toHaveBeenCalled()
      expect(result).toEqual(mockCustomer)
    })

    it('should throw error when customer not found', async () => {
      const mockChain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: null, error: { message: 'Not found' } }),
      }

      vi.mocked(supabase.from).mockReturnValue(mockChain as any)

      await expect(fetchCustomerDetail('invalid-id')).rejects.toThrow('Failed to fetch customer detail: Not found')
    })

    it('should fetch customer with all fields', async () => {
      const mockCustomer = createMockCustomer({
        city: 'Bangkok',
        state: 'Bangkok',
        zip_code: '10110',
        notes: 'VIP customer',
      })

      const mockChain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: mockCustomer, error: null }),
      }

      vi.mocked(supabase.from).mockReturnValue(mockChain as any)

      const result = await fetchCustomerDetail('customer-1')

      expect(result.city).toBe('Bangkok')
      expect(result.notes).toBe('VIP customer')
    })
  })
})
