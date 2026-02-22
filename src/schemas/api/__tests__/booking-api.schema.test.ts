import { describe, it, expect } from 'vitest'
import {
  BookingCreateRequestSchema,
  RecurringBookingCreateRequestSchema,
} from '../booking-api.schema'

// Valid base data for BookingCreateRequestSchema
const validBookingBase = {
  customer_id: '550e8400-e29b-41d4-a716-446655440000',
  booking_date: '2025-03-15',
  start_time: '09:00',
  end_time: '10:00',
  package_id: '550e8400-e29b-41d4-a716-446655440001',
  package_v2_id: null,
  selected_tier_id: null,
  total_price: 1500,
  deposit_amount: 500,
  notes: null,
  special_requests: null,
  internal_notes: null,
}

// Valid base data for RecurringBookingCreateRequestSchema
const validRecurringBase = {
  customer_id: '550e8400-e29b-41d4-a716-446655440000',
  start_date: '2025-03-01',
  end_date: '2025-03-31',
  start_time: '09:00',
  end_time: '10:00',
  recurrence_pattern: 'weekly' as const,
  recurrence_days: [1, 3, 5],
  package_id: '550e8400-e29b-41d4-a716-446655440001',
  package_v2_id: null,
  selected_tier_id: null,
  total_price: 1500,
  deposit_amount: 500,
  notes: null,
  special_requests: null,
}

describe('BookingCreateRequestSchema', () => {
  describe('staff_id / team_id XOR constraint', () => {
    it('should accept staff_id only (team_id null)', () => {
      const data = {
        ...validBookingBase,
        staff_id: '550e8400-e29b-41d4-a716-446655440010',
        team_id: null,
      }
      const result = BookingCreateRequestSchema.safeParse(data)
      expect(result.success).toBe(true)
    })

    it('should accept team_id only (staff_id null)', () => {
      const data = {
        ...validBookingBase,
        staff_id: null,
        team_id: '550e8400-e29b-41d4-a716-446655440020',
      }
      const result = BookingCreateRequestSchema.safeParse(data)
      expect(result.success).toBe(true)
    })

    it('should reject both null (neither provided)', () => {
      const data = {
        ...validBookingBase,
        staff_id: null,
        team_id: null,
      }
      const result = BookingCreateRequestSchema.safeParse(data)
      expect(result.success).toBe(false)
      if (!result.success) {
        const messages = result.error.issues.map((i) => i.message)
        expect(messages).toContain('Either staff_id or team_id must be provided')
      }
    })

    it('should reject both provided simultaneously', () => {
      const data = {
        ...validBookingBase,
        staff_id: '550e8400-e29b-41d4-a716-446655440010',
        team_id: '550e8400-e29b-41d4-a716-446655440020',
      }
      const result = BookingCreateRequestSchema.safeParse(data)
      expect(result.success).toBe(false)
      if (!result.success) {
        const messages = result.error.issues.map((i) => i.message)
        expect(messages).toContain('Cannot assign to both staff_id and team_id simultaneously')
      }
    })
  })

  describe('time validation', () => {
    it('should reject end_time before start_time', () => {
      const data = {
        ...validBookingBase,
        staff_id: '550e8400-e29b-41d4-a716-446655440010',
        team_id: null,
        start_time: '14:00',
        end_time: '10:00',
      }
      const result = BookingCreateRequestSchema.safeParse(data)
      expect(result.success).toBe(false)
      if (!result.success) {
        const messages = result.error.issues.map((i) => i.message)
        expect(messages).toContain('End time must be after start time')
      }
    })

    it('should reject invalid time format (with seconds)', () => {
      const data = {
        ...validBookingBase,
        staff_id: '550e8400-e29b-41d4-a716-446655440010',
        team_id: null,
        start_time: '09:00:00',
        end_time: '10:00:00',
      }
      const result = BookingCreateRequestSchema.safeParse(data)
      expect(result.success).toBe(false)
    })

    it('should accept valid HH:MM format', () => {
      const data = {
        ...validBookingBase,
        staff_id: '550e8400-e29b-41d4-a716-446655440010',
        team_id: null,
        start_time: '09:00',
        end_time: '17:30',
      }
      const result = BookingCreateRequestSchema.safeParse(data)
      expect(result.success).toBe(true)
    })
  })
})

describe('RecurringBookingCreateRequestSchema', () => {
  describe('staff_id / team_id XOR constraint', () => {
    it('should accept staff_id only (team_id null)', () => {
      const data = {
        ...validRecurringBase,
        staff_id: '550e8400-e29b-41d4-a716-446655440010',
        team_id: null,
      }
      const result = RecurringBookingCreateRequestSchema.safeParse(data)
      expect(result.success).toBe(true)
    })

    it('should accept team_id only (staff_id null)', () => {
      const data = {
        ...validRecurringBase,
        staff_id: null,
        team_id: '550e8400-e29b-41d4-a716-446655440020',
      }
      const result = RecurringBookingCreateRequestSchema.safeParse(data)
      expect(result.success).toBe(true)
    })

    it('should reject both null (neither provided)', () => {
      const data = {
        ...validRecurringBase,
        staff_id: null,
        team_id: null,
      }
      const result = RecurringBookingCreateRequestSchema.safeParse(data)
      expect(result.success).toBe(false)
      if (!result.success) {
        const messages = result.error.issues.map((i) => i.message)
        expect(messages).toContain('Either staff_id or team_id must be provided')
      }
    })

    it('should reject both provided simultaneously', () => {
      const data = {
        ...validRecurringBase,
        staff_id: '550e8400-e29b-41d4-a716-446655440010',
        team_id: '550e8400-e29b-41d4-a716-446655440020',
      }
      const result = RecurringBookingCreateRequestSchema.safeParse(data)
      expect(result.success).toBe(false)
      if (!result.success) {
        const messages = result.error.issues.map((i) => i.message)
        expect(messages).toContain('Cannot assign to both staff_id and team_id simultaneously')
      }
    })
  })
})
