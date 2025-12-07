import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { verifyPayment, markAsPaid } from '../payment-service'

// Mock supabase
vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: vi.fn(() => ({
      update: vi.fn(() => ({
        eq: vi.fn(() => Promise.resolve({ error: null })),
      })),
      select: vi.fn(() => ({
        eq: vi.fn(() => Promise.resolve({ count: 1 })),
      })),
    })),
    functions: {
      invoke: vi.fn(() => Promise.resolve({ data: null, error: null })),
    },
  },
}))

// Mock getBangkokDateString
vi.mock('@/lib/utils', () => ({
  getBangkokDateString: vi.fn(() => '2024-01-15'),
}))

describe('payment-service', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('verifyPayment', () => {
    it('should verify payment for single booking', async () => {
      const { supabase } = await import('@/lib/supabase')
      const mockEq = vi.fn(() => Promise.resolve({ error: null }))
      const mockUpdate = vi.fn(() => ({ eq: mockEq }))
      vi.mocked(supabase.from).mockReturnValue({
        update: mockUpdate,
        select: vi.fn(),
      } as never)

      const result = await verifyPayment({
        bookingId: 'booking-123',
        sendEmail: false,
      })

      expect(result.success).toBe(true)
      expect(result.count).toBe(1)
      expect(supabase.from).toHaveBeenCalledWith('bookings')
      expect(mockUpdate).toHaveBeenCalledWith({
        payment_status: 'paid',
        payment_date: '2024-01-15',
      })
      expect(mockEq).toHaveBeenCalledWith('id', 'booking-123')
    })

    it('should verify payment for recurring booking group', async () => {
      const { supabase } = await import('@/lib/supabase')
      const mockEqRecurring = vi.fn(() => Promise.resolve({ error: null }))
      const mockUpdate = vi.fn(() => ({ eq: mockEqRecurring }))
      const mockCountEq = vi.fn(() => Promise.resolve({ count: 4 }))
      const mockSelect = vi.fn(() => ({ eq: mockCountEq }))

      vi.mocked(supabase.from).mockReturnValue({
        update: mockUpdate,
        select: mockSelect,
      } as never)

      const result = await verifyPayment({
        bookingId: 'booking-123',
        recurringGroupId: 'group-456',
        sendEmail: false,
      })

      expect(result.success).toBe(true)
      expect(result.count).toBe(4)
      expect(mockEqRecurring).toHaveBeenCalledWith('recurring_group_id', 'group-456')
    })

    it('should return error on failure', async () => {
      const { supabase } = await import('@/lib/supabase')
      const mockEq = vi.fn(() => Promise.resolve({ error: { message: 'Database error' } }))
      const mockUpdate = vi.fn(() => ({ eq: mockEq }))
      vi.mocked(supabase.from).mockReturnValue({
        update: mockUpdate,
        select: vi.fn(),
      } as never)

      const result = await verifyPayment({
        bookingId: 'booking-123',
        sendEmail: false,
      })

      expect(result.success).toBe(false)
      expect(result.count).toBe(0)
      expect(result.error).toBe('Database error')
    })

    it('should send email by default', async () => {
      const { supabase } = await import('@/lib/supabase')
      const mockEq = vi.fn(() => Promise.resolve({ error: null }))
      const mockUpdate = vi.fn(() => ({ eq: mockEq }))
      vi.mocked(supabase.from).mockReturnValue({
        update: mockUpdate,
        select: vi.fn(),
      } as never)

      await verifyPayment({
        bookingId: 'booking-123',
      })

      expect(supabase.functions.invoke).toHaveBeenCalledWith('send-payment-confirmation', {
        body: { bookingId: 'booking-123' },
      })
    })

    it('should skip email when sendEmail is false', async () => {
      const { supabase } = await import('@/lib/supabase')
      const mockEq = vi.fn(() => Promise.resolve({ error: null }))
      const mockUpdate = vi.fn(() => ({ eq: mockEq }))
      vi.mocked(supabase.from).mockReturnValue({
        update: mockUpdate,
        select: vi.fn(),
      } as never)

      await verifyPayment({
        bookingId: 'booking-123',
        sendEmail: false,
      })

      expect(supabase.functions.invoke).not.toHaveBeenCalled()
    })
  })

  describe('markAsPaid', () => {
    it('should mark single booking as paid with default cash method', async () => {
      const { supabase } = await import('@/lib/supabase')
      const mockEq = vi.fn(() => Promise.resolve({ error: null }))
      const mockUpdate = vi.fn(() => ({ eq: mockEq }))
      vi.mocked(supabase.from).mockReturnValue({
        update: mockUpdate,
        select: vi.fn(),
      } as never)

      const result = await markAsPaid({
        bookingId: 'booking-123',
        sendEmail: false,
      })

      expect(result.success).toBe(true)
      expect(result.count).toBe(1)
      expect(mockUpdate).toHaveBeenCalledWith({
        payment_status: 'paid',
        payment_method: 'cash',
        payment_date: '2024-01-15',
      })
    })

    it('should mark booking as paid with transfer method and amount', async () => {
      const { supabase } = await import('@/lib/supabase')
      const mockEq = vi.fn(() => Promise.resolve({ error: null }))
      const mockUpdate = vi.fn(() => ({ eq: mockEq }))
      vi.mocked(supabase.from).mockReturnValue({
        update: mockUpdate,
        select: vi.fn(),
      } as never)

      const result = await markAsPaid({
        bookingId: 'booking-123',
        paymentMethod: 'transfer',
        amount: 1500,
        sendEmail: false,
      })

      expect(result.success).toBe(true)
      expect(mockUpdate).toHaveBeenCalledWith({
        payment_status: 'paid',
        payment_method: 'transfer',
        payment_date: '2024-01-15',
        amount_paid: 1500,
      })
    })

    it('should mark recurring bookings as paid', async () => {
      const { supabase } = await import('@/lib/supabase')
      const mockEqRecurring = vi.fn(() => Promise.resolve({ error: null }))
      const mockUpdate = vi.fn(() => ({ eq: mockEqRecurring }))
      const mockCountEq = vi.fn(() => Promise.resolve({ count: 3 }))
      const mockSelect = vi.fn(() => ({ eq: mockCountEq }))

      vi.mocked(supabase.from).mockReturnValue({
        update: mockUpdate,
        select: mockSelect,
      } as never)

      const result = await markAsPaid({
        bookingId: 'booking-123',
        recurringGroupId: 'group-789',
        sendEmail: false,
      })

      expect(result.success).toBe(true)
      expect(result.count).toBe(3)
      expect(mockEqRecurring).toHaveBeenCalledWith('recurring_group_id', 'group-789')
    })

    it('should return error on failure', async () => {
      const { supabase } = await import('@/lib/supabase')
      const mockEq = vi.fn(() => Promise.resolve({ error: { message: 'Update failed' } }))
      const mockUpdate = vi.fn(() => ({ eq: mockEq }))
      vi.mocked(supabase.from).mockReturnValue({
        update: mockUpdate,
        select: vi.fn(),
      } as never)

      const result = await markAsPaid({
        bookingId: 'booking-123',
        sendEmail: false,
      })

      expect(result.success).toBe(false)
      expect(result.count).toBe(0)
      expect(result.error).toBe('Update failed')
    })
  })
})
