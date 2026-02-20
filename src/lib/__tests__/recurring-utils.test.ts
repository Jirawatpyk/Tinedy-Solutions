import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  getRecurringPatternLabel,
  generateAutoScheduleDates,
  isPatternCompatibleWithFrequency,
  generateRecurringGroupId,
  validateRecurringDates,
  getRecurringSequence,
  groupBookingsByRecurringGroup,
  sortRecurringGroup,
  isRecurringBooking,
  findParentBooking,
  countBookingsByStatus
} from '../recurring-utils'
import type { RecurringBookingBase } from '@/types/recurring-booking'

describe('recurring-utils', () => {
  // ============================================================================
  // getRecurringPatternLabel
  // ============================================================================

  describe('getRecurringPatternLabel', () => {
    it('should return label for auto-monthly', () => {
      expect(getRecurringPatternLabel('auto-monthly')).toBe('Monthly')
    })

    it('should return label for custom', () => {
      expect(getRecurringPatternLabel('custom')).toBe('Custom')
    })

    it('should return "Not specified" for null', () => {
      expect(getRecurringPatternLabel(null)).toBe('Not specified')
    })

    it('should return "Not specified" for unknown pattern', () => {
      expect(getRecurringPatternLabel('unknown' as any)).toBe('Not specified')
    })
  })

  // ============================================================================
  // generateAutoScheduleDates
  // ============================================================================

  describe('generateAutoScheduleDates', () => {
    it('should generate dates for auto-monthly pattern with frequency 1', () => {
      const dates = generateAutoScheduleDates({
        startDate: '2025-01-15',
        frequency: 1,
        pattern: 'auto-monthly'
      })

      expect(dates).toEqual(['2025-01-15'])
    })

    it('should generate dates for auto-monthly pattern with frequency 4', () => {
      const dates = generateAutoScheduleDates({
        startDate: '2025-01-15',
        frequency: 4,
        pattern: 'auto-monthly'
      })

      expect(dates).toEqual([
        '2025-01-15',
        '2025-02-15',
        '2025-03-15',
        '2025-04-15'
      ])
    })

    it('should generate dates for auto-monthly pattern with frequency 8', () => {
      const dates = generateAutoScheduleDates({
        startDate: '2025-01-15',
        frequency: 8,
        pattern: 'auto-monthly'
      })

      expect(dates).toEqual([
        '2025-01-15',
        '2025-02-15',
        '2025-03-15',
        '2025-04-15',
        '2025-05-15',
        '2025-06-15',
        '2025-07-15',
        '2025-08-15'
      ])
    })

    it('should handle month transitions correctly', () => {
      const dates = generateAutoScheduleDates({
        startDate: '2025-11-30',
        frequency: 2,
        pattern: 'auto-monthly'
      })

      // Should handle month-end dates
      expect(dates).toHaveLength(2)
      expect(dates[0]).toBe('2025-11-30')
      // JavaScript Date.setMonth handles overflow (e.g., Nov 30 + 1 month = Dec 30)
    })

    it('should throw error for custom pattern', () => {
      expect(() => {
        generateAutoScheduleDates({
          startDate: '2025-01-15',
          frequency: 4,
          pattern: 'custom'
        })
      }).toThrow('Custom pattern does not support auto-generation')
    })

    it('should throw error for unsupported pattern', () => {
      expect(() => {
        generateAutoScheduleDates({
          startDate: '2025-01-15',
          frequency: 4,
          pattern: 'unsupported' as any
        })
      }).toThrow('Unsupported pattern: unsupported')
    })
  })

  // ============================================================================
  // isPatternCompatibleWithFrequency
  // ============================================================================

  describe('isPatternCompatibleWithFrequency', () => {
    it('should return true for auto-monthly with frequency 1', () => {
      expect(isPatternCompatibleWithFrequency('auto-monthly', 1)).toBe(true)
    })

    it('should return true for auto-monthly with frequency 2', () => {
      expect(isPatternCompatibleWithFrequency('auto-monthly', 2)).toBe(true)
    })

    it('should return true for auto-monthly with frequency 4', () => {
      expect(isPatternCompatibleWithFrequency('auto-monthly', 4)).toBe(true)
    })

    it('should return true for auto-monthly with frequency 8', () => {
      expect(isPatternCompatibleWithFrequency('auto-monthly', 8)).toBe(true)
    })

    it('should return true for custom with frequency 1', () => {
      expect(isPatternCompatibleWithFrequency('custom', 1)).toBe(true)
    })

    it('should return true for custom with frequency 4', () => {
      expect(isPatternCompatibleWithFrequency('custom', 4)).toBe(true)
    })

    it('should return false for unknown pattern', () => {
      expect(isPatternCompatibleWithFrequency('unknown' as any, 4)).toBe(false)
    })

    it('should return false for invalid frequency', () => {
      expect(isPatternCompatibleWithFrequency('auto-monthly', 99 as any)).toBe(false)
    })
  })

  // ============================================================================
  // generateRecurringGroupId
  // ============================================================================

  describe('generateRecurringGroupId', () => {
    it('should generate a valid UUID format string', () => {
      const id = generateRecurringGroupId()

      // UUID v4 format: xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
      expect(id).toMatch(uuidRegex)
    })

    it('should generate unique IDs', () => {
      const id1 = generateRecurringGroupId()
      const id2 = generateRecurringGroupId()

      expect(id1).not.toBe(id2)
    })

    it('should use crypto.randomUUID if available', () => {
      // This test assumes crypto.randomUUID is available in test environment
      const id = generateRecurringGroupId()
      expect(id).toBeTruthy()
      expect(typeof id).toBe('string')
    })
  })

  // ============================================================================
  // validateRecurringDates
  // ============================================================================

  describe('validateRecurringDates', () => {
    beforeEach(() => {
      // Mock current date to 2025-01-01 for consistent testing
      vi.useFakeTimers()
      vi.setSystemTime(new Date('2025-01-01T00:00:00Z'))
    })

    afterEach(() => {
      vi.useRealTimers()
    })

    it('should validate correct dates array', () => {
      const result = validateRecurringDates(
        ['2025-01-15', '2025-02-15', '2025-03-15', '2025-04-15'],
        4
      )

      expect(result).toEqual({
        valid: true,
        errors: []
      })
    })

    it('should detect incorrect number of dates', () => {
      const result = validateRecurringDates(
        ['2025-01-15', '2025-02-15'], // Only 2 dates
        4 // Expected 4
      )

      expect(result.valid).toBe(false)
      expect(result.errors).toContain('Expected 4 dates, got 2')
    })

    it('should detect dates not in chronological order', () => {
      const result = validateRecurringDates(
        ['2025-02-15', '2025-01-15', '2025-03-15', '2025-04-15'], // Out of order
        4
      )

      expect(result.valid).toBe(false)
      expect(result.errors).toContain('Dates must be in chronological order')
    })

    it('should detect duplicate dates', () => {
      const result = validateRecurringDates(
        ['2025-01-15', '2025-02-15', '2025-02-15', '2025-04-15'], // Duplicate 2025-02-15
        4
      )

      expect(result.valid).toBe(false)
      expect(result.errors).toContain('Duplicate dates found')
    })

    it('should detect invalid date format', () => {
      const result = validateRecurringDates(
        ['2025-01-15', 'invalid-date', '2025-03-15', '2025-04-15'],
        4
      )

      expect(result.valid).toBe(false)
      expect(result.errors.some(e => e.includes('Invalid date'))).toBe(true)
    })

    it('should detect dates in the past', () => {
      const result = validateRecurringDates(
        ['2024-12-15', '2025-01-15', '2025-02-15', '2025-03-15'], // 2024-12-15 is in the past
        4
      )

      expect(result.valid).toBe(false)
      expect(result.errors.some(e => e.includes('Date in the past'))).toBe(true)
    })

    it('should accept today as valid date', () => {
      const result = validateRecurringDates(
        ['2025-01-01', '2025-02-01', '2025-03-01', '2025-04-01'],
        4
      )

      expect(result.valid).toBe(true)
      expect(result.errors).toEqual([])
    })

    it('should accumulate multiple errors', () => {
      const result = validateRecurringDates(
        ['2024-12-15', 'invalid', '2025-01-15'], // Past date, invalid date, wrong count
        4
      )

      expect(result.valid).toBe(false)
      expect(result.errors.length).toBeGreaterThan(1)
    })
  })

  // ============================================================================
  // getRecurringSequence
  // ============================================================================

  describe('getRecurringSequence', () => {
    it('should return 1 for index 0', () => {
      expect(getRecurringSequence(0)).toBe(1)
    })

    it('should return 2 for index 1', () => {
      expect(getRecurringSequence(1)).toBe(2)
    })

    it('should return 8 for index 7', () => {
      expect(getRecurringSequence(7)).toBe(8)
    })

    it('should return 100 for index 99', () => {
      expect(getRecurringSequence(99)).toBe(100)
    })
  })

  // ============================================================================
  // groupBookingsByRecurringGroup
  // ============================================================================

  describe('groupBookingsByRecurringGroup', () => {
    const createMockBooking = (overrides = {}): RecurringBookingBase => ({
      id: 'booking-1',
      booking_date: '2025-01-15',
      start_time: '10:00',
      end_time: '12:00',
      total_price: 5000,
      status: 'confirmed',
      is_recurring: true,
      recurring_group_id: 'group-1',
      recurring_sequence: 1,
      recurring_total: 4,
      recurring_pattern: 'auto-monthly',
      parent_booking_id: null,
      ...overrides,
    })

    it('should group bookings by recurring_group_id', () => {
      const bookings = [
        createMockBooking({ id: 'booking-1', recurring_group_id: 'group-1', recurring_sequence: 1 }),
        createMockBooking({ id: 'booking-2', recurring_group_id: 'group-1', recurring_sequence: 2 }),
        createMockBooking({ id: 'booking-3', recurring_group_id: 'group-2', recurring_sequence: 1 }),
      ]

      const groups = groupBookingsByRecurringGroup(bookings)

      expect(groups.size).toBe(2)
      expect(groups.get('group-1')).toHaveLength(2)
      expect(groups.get('group-2')).toHaveLength(1)
    })

    it('should handle bookings without recurring_group_id', () => {
      const bookings = [
        createMockBooking({ id: 'booking-1', recurring_group_id: null }),
        createMockBooking({ id: 'booking-2', recurring_group_id: 'group-1' }),
      ]

      const groups = groupBookingsByRecurringGroup(bookings)

      expect(groups.size).toBe(1)
      expect(groups.get('group-1')).toHaveLength(1)
    })

    it('should return empty map for empty array', () => {
      const groups = groupBookingsByRecurringGroup([])

      expect(groups.size).toBe(0)
    })

    it('should handle all bookings without recurring_group_id', () => {
      const bookings = [
        createMockBooking({ recurring_group_id: null }),
        createMockBooking({ recurring_group_id: null }),
      ]

      const groups = groupBookingsByRecurringGroup(bookings)

      expect(groups.size).toBe(0)
    })
  })

  // ============================================================================
  // sortRecurringGroup
  // ============================================================================

  describe('sortRecurringGroup', () => {
    const createMockBooking = (overrides = {}): RecurringBookingBase => ({
      id: 'booking-1',
      booking_date: '2025-01-15',
      start_time: '10:00',
      end_time: '12:00',
      total_price: 5000,
      status: 'confirmed',
      is_recurring: true,
      recurring_group_id: 'group-1',
      recurring_sequence: 1,
      recurring_total: 4,
      recurring_pattern: 'auto-monthly',
      parent_booking_id: null,
      ...overrides,
    })

    it('should sort bookings by recurring_sequence ascending', () => {
      const bookings = [
        createMockBooking({ id: 'booking-3', recurring_sequence: 3 }),
        createMockBooking({ id: 'booking-1', recurring_sequence: 1 }),
        createMockBooking({ id: 'booking-2', recurring_sequence: 2 }),
      ]

      const sorted = sortRecurringGroup(bookings)

      expect(sorted[0].recurring_sequence).toBe(1)
      expect(sorted[1].recurring_sequence).toBe(2)
      expect(sorted[2].recurring_sequence).toBe(3)
    })

    it('should handle bookings with null sequence', () => {
      const bookings = [
        createMockBooking({ id: 'booking-2', recurring_sequence: 2 }),
        createMockBooking({ id: 'booking-null', recurring_sequence: null as any }),
        createMockBooking({ id: 'booking-1', recurring_sequence: 1 }),
      ]

      const sorted = sortRecurringGroup(bookings)

      // Null should be treated as 0, so it should come first
      expect(sorted[0].recurring_sequence).toBe(null)
      expect(sorted[1].recurring_sequence).toBe(1)
      expect(sorted[2].recurring_sequence).toBe(2)
    })

    it('should not mutate original array', () => {
      const bookings = [
        createMockBooking({ id: 'booking-3', recurring_sequence: 3 }),
        createMockBooking({ id: 'booking-1', recurring_sequence: 1 }),
      ]

      const original = [...bookings]
      sortRecurringGroup(bookings)

      expect(bookings).toEqual(original) // Original unchanged
    })

    it('should handle empty array', () => {
      const sorted = sortRecurringGroup([])

      expect(sorted).toEqual([])
    })
  })

  // ============================================================================
  // isRecurringBooking
  // ============================================================================

  describe('isRecurringBooking', () => {
    it('should return true for valid recurring booking', () => {
      const booking = {
        is_recurring: true,
        recurring_group_id: 'group-1',
        recurring_sequence: 1,
        recurring_total: 4
      }

      expect(isRecurringBooking(booking)).toBe(true)
    })

    it('should return false when is_recurring is false', () => {
      const booking = {
        is_recurring: false,
        recurring_group_id: 'group-1',
        recurring_sequence: 1,
        recurring_total: 4
      }

      expect(isRecurringBooking(booking)).toBe(false)
    })

    it('should return false when recurring_group_id is null', () => {
      const booking = {
        is_recurring: true,
        recurring_group_id: null,
        recurring_sequence: 1,
        recurring_total: 4
      }

      expect(isRecurringBooking(booking)).toBe(false)
    })

    it('should return false when recurring_group_id is empty string', () => {
      const booking = {
        is_recurring: true,
        recurring_group_id: '',
        recurring_sequence: 1,
        recurring_total: 4
      }

      expect(isRecurringBooking(booking)).toBe(false)
    })

    it('should return false when missing recurring_sequence', () => {
      const booking = {
        is_recurring: true,
        recurring_group_id: 'group-1',
        recurring_total: 4
      }

      expect(isRecurringBooking(booking)).toBe(false)
    })

    it('should return false when missing recurring_total', () => {
      const booking = {
        is_recurring: true,
        recurring_group_id: 'group-1',
        recurring_sequence: 1
      }

      expect(isRecurringBooking(booking)).toBe(false)
    })

    it('should return false for null', () => {
      expect(isRecurringBooking(null)).toBe(false)
    })

    it('should return false for non-object', () => {
      expect(isRecurringBooking('string')).toBe(false)
      expect(isRecurringBooking(123)).toBe(false)
      expect(isRecurringBooking(undefined)).toBe(false)
    })
  })

  // ============================================================================
  // findParentBooking
  // ============================================================================

  describe('findParentBooking', () => {
    const createMockBooking = (overrides = {}): RecurringBookingBase => ({
      id: 'booking-1',
      booking_date: '2025-01-15',
      start_time: '10:00',
      end_time: '12:00',
      total_price: 5000,
      status: 'confirmed',
      is_recurring: true,
      recurring_group_id: 'group-1',
      recurring_sequence: 1,
      recurring_total: 4,
      recurring_pattern: 'auto-monthly',
      parent_booking_id: null,
      ...overrides,
    })

    it('should find booking with sequence 1', () => {
      const bookings = [
        createMockBooking({ id: 'booking-2', recurring_sequence: 2 }),
        createMockBooking({ id: 'booking-1', recurring_sequence: 1 }),
        createMockBooking({ id: 'booking-3', recurring_sequence: 3 }),
      ]

      const parent = findParentBooking(bookings)

      expect(parent?.id).toBe('booking-1')
      expect(parent?.recurring_sequence).toBe(1)
    })

    it('should return null when no sequence 1 found', () => {
      const bookings = [
        createMockBooking({ recurring_sequence: 2 }),
        createMockBooking({ recurring_sequence: 3 }),
      ]

      const parent = findParentBooking(bookings)

      expect(parent).toBeNull()
    })

    it('should return null for empty array', () => {
      const parent = findParentBooking([])

      expect(parent).toBeNull()
    })

    it('should return first occurrence if multiple sequence 1', () => {
      const bookings = [
        createMockBooking({ id: 'booking-1a', recurring_sequence: 1 }),
        createMockBooking({ id: 'booking-1b', recurring_sequence: 1 }),
      ]

      const parent = findParentBooking(bookings)

      expect(parent?.id).toBe('booking-1a')
    })
  })

  // ============================================================================
  // countBookingsByStatus
  // ============================================================================

  describe('countBookingsByStatus', () => {
    const createMockBooking = (overrides = {}): RecurringBookingBase => ({
      id: 'booking-1',
      booking_date: '2025-01-15',
      start_time: '10:00',
      end_time: '12:00',
      total_price: 5000,
      status: 'confirmed',
      is_recurring: true,
      recurring_group_id: 'group-1',
      recurring_sequence: 1,
      recurring_total: 4,
      recurring_pattern: 'auto-monthly',
      parent_booking_id: null,
      ...overrides,
    })

    it('should count bookings by each status', () => {
      const bookings = [
        createMockBooking({ status: 'completed' }),
        createMockBooking({ status: 'completed' }),
        createMockBooking({ status: 'confirmed' }),
        createMockBooking({ status: 'in_progress' }),
        createMockBooking({ status: 'cancelled' }),
        createMockBooking({ status: 'no_show' }),
        createMockBooking({ status: 'pending' }),
      ]

      const counts = countBookingsByStatus(bookings)

      expect(counts).toEqual({
        completed: 2,
        confirmed: 1,
        inProgress: 1,
        cancelled: 1,
        noShow: 1,
        upcoming: 1, // pending
        total: 7
      })
    })

    it('should handle empty array', () => {
      const counts = countBookingsByStatus([])

      expect(counts).toEqual({
        completed: 0,
        confirmed: 0,
        inProgress: 0,
        cancelled: 0,
        noShow: 0,
        upcoming: 0,
        total: 0
      })
    })

    it('should count upcoming for non-standard status', () => {
      const bookings = [
        createMockBooking({ status: 'pending' }),
        createMockBooking({ status: 'unknown-status' as any }),
      ]

      const counts = countBookingsByStatus(bookings)

      expect(counts.upcoming).toBe(2)
      expect(counts.total).toBe(2)
    })

    it('should handle all bookings with same status', () => {
      const bookings = [
        createMockBooking({ status: 'completed' }),
        createMockBooking({ status: 'completed' }),
        createMockBooking({ status: 'completed' }),
      ]

      const counts = countBookingsByStatus(bookings)

      expect(counts.completed).toBe(3)
      expect(counts.confirmed).toBe(0)
      expect(counts.total).toBe(3)
    })
  })
})
