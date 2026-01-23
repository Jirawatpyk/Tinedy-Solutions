/**
 * Test Suite: Booking Status Constants
 *
 * Tests for the booking-status.ts constants file.
 * Ensures that BOOKING_STATUS and PAYMENT_STATUS labels and colors are properly defined
 * and consistent across the application.
 *
 * Coverage Target: 100% (constants validation)
 */

import { describe, it, expect } from 'vitest'
import {
  BOOKING_STATUS_COLORS,
  BOOKING_STATUS_DOTS,
  BOOKING_STATUS_COLORS_TIMELINE,
  BOOKING_STATUS_LABELS,
  PAYMENT_STATUS_COLORS,
  PAYMENT_STATUS_DOTS,
  PAYMENT_STATUS_LABELS,
  STATUS_COLORS,
  STATUS_DOTS,
  STATUS_COLORS_TIMELINE,
  STATUS_LABELS,
  type BookingStatus,
  type PaymentStatus,
} from '../booking-status'

describe('booking-status constants', () => {
  describe('BOOKING_STATUS_LABELS', () => {
    it('should have all required booking statuses', () => {
      // Assert - all booking statuses should be defined
      expect(BOOKING_STATUS_LABELS).toHaveProperty('pending')
      expect(BOOKING_STATUS_LABELS).toHaveProperty('confirmed')
      expect(BOOKING_STATUS_LABELS).toHaveProperty('in_progress')
      expect(BOOKING_STATUS_LABELS).toHaveProperty('completed')
      expect(BOOKING_STATUS_LABELS).toHaveProperty('cancelled')
      expect(BOOKING_STATUS_LABELS).toHaveProperty('no_show')
    })

    it('should have correct label values', () => {
      // Assert - labels should be human-readable
      expect(BOOKING_STATUS_LABELS.pending).toBe('Pending')
      expect(BOOKING_STATUS_LABELS.confirmed).toBe('Confirmed')
      expect(BOOKING_STATUS_LABELS.in_progress).toBe('In Progress')
      expect(BOOKING_STATUS_LABELS.completed).toBe('Completed')
      expect(BOOKING_STATUS_LABELS.cancelled).toBe('Cancelled')
      expect(BOOKING_STATUS_LABELS.no_show).toBe('No Show')
    })

    it('should have exactly 6 booking statuses', () => {
      // Assert - ensure no extra or missing statuses
      const statusCount = Object.keys(BOOKING_STATUS_LABELS).length
      expect(statusCount).toBe(6)
    })
  })

  describe('PAYMENT_STATUS_LABELS', () => {
    it('should have all required payment statuses', () => {
      // Assert - all payment statuses should be defined
      expect(PAYMENT_STATUS_LABELS).toHaveProperty('unpaid')
      expect(PAYMENT_STATUS_LABELS).toHaveProperty('paid')
      expect(PAYMENT_STATUS_LABELS).toHaveProperty('pending_verification')
      expect(PAYMENT_STATUS_LABELS).toHaveProperty('refund_pending')
      expect(PAYMENT_STATUS_LABELS).toHaveProperty('refunded')
    })

    it('should have correct label values', () => {
      // Assert - labels should be human-readable
      expect(PAYMENT_STATUS_LABELS.unpaid).toBe('Unpaid')
      expect(PAYMENT_STATUS_LABELS.paid).toBe('Paid')
      expect(PAYMENT_STATUS_LABELS.pending_verification).toBe('Verifying')
      expect(PAYMENT_STATUS_LABELS.refund_pending).toBe('Refunding')
      expect(PAYMENT_STATUS_LABELS.refunded).toBe('Refunded')
    })

    it('should have exactly 5 payment statuses', () => {
      // Assert - ensure no extra or missing statuses
      const statusCount = Object.keys(PAYMENT_STATUS_LABELS).length
      expect(statusCount).toBe(5)
    })
  })

  describe('BOOKING_STATUS_COLORS', () => {
    it('should have color classes for all booking statuses', () => {
      // Assert - all booking statuses should have color classes
      Object.keys(BOOKING_STATUS_LABELS).forEach((status) => {
        expect(BOOKING_STATUS_COLORS[status as BookingStatus]).toBeDefined()
        expect(typeof BOOKING_STATUS_COLORS[status as BookingStatus]).toBe('string')
      })
    })

    it('should contain Tailwind CSS color classes', () => {
      // Assert - colors should be Tailwind classes
      Object.values(BOOKING_STATUS_COLORS).forEach((colorClass) => {
        expect(colorClass).toMatch(/bg-\w+-\d+/)
        expect(colorClass).toMatch(/text-\w+-\d+/)
        expect(colorClass).toMatch(/border-\w+-\d+/)
      })
    })

    it('should have unique colors for each status', () => {
      // Assert - each status should be visually distinct
      const colors = Object.values(BOOKING_STATUS_COLORS)
      const uniqueColors = new Set(colors)
      expect(uniqueColors.size).toBe(colors.length)
    })
  })

  describe('BOOKING_STATUS_DOTS', () => {
    it('should have dot colors for all booking statuses', () => {
      // Assert - all booking statuses should have dot colors
      Object.keys(BOOKING_STATUS_LABELS).forEach((status) => {
        expect(BOOKING_STATUS_DOTS[status as BookingStatus]).toBeDefined()
        expect(typeof BOOKING_STATUS_DOTS[status as BookingStatus]).toBe('string')
      })
    })

    it('should contain Tailwind background color classes', () => {
      // Assert - dots should be Tailwind background classes
      Object.values(BOOKING_STATUS_DOTS).forEach((dotClass) => {
        expect(dotClass).toMatch(/^bg-\w+-\d+$/)
      })
    })
  })

  describe('BOOKING_STATUS_COLORS_TIMELINE', () => {
    it('should have timeline colors for all booking statuses', () => {
      // Assert - all booking statuses should have timeline colors
      Object.keys(BOOKING_STATUS_LABELS).forEach((status) => {
        expect(BOOKING_STATUS_COLORS_TIMELINE[status as BookingStatus]).toBeDefined()
      })
    })

    it('should contain hover state classes', () => {
      // Assert - timeline colors should include hover states
      Object.values(BOOKING_STATUS_COLORS_TIMELINE).forEach((colorClass) => {
        expect(colorClass).toMatch(/hover:bg-/)
      })
    })
  })

  describe('PAYMENT_STATUS_COLORS', () => {
    it('should have color classes for all payment statuses', () => {
      // Assert - all payment statuses should have color classes
      Object.keys(PAYMENT_STATUS_LABELS).forEach((status) => {
        expect(PAYMENT_STATUS_COLORS[status as PaymentStatus]).toBeDefined()
        expect(typeof PAYMENT_STATUS_COLORS[status as PaymentStatus]).toBe('string')
      })
    })

    it('should contain Tailwind CSS color classes', () => {
      // Assert - colors should be Tailwind classes
      Object.values(PAYMENT_STATUS_COLORS).forEach((colorClass) => {
        expect(colorClass).toMatch(/bg-\w+-\d+/)
        expect(colorClass).toMatch(/text-\w+-\d+/)
        expect(colorClass).toMatch(/border-\w+-\d+/)
      })
    })

    it('should have unique colors for each status', () => {
      // Assert - each status should be visually distinct
      const colors = Object.values(PAYMENT_STATUS_COLORS)
      const uniqueColors = new Set(colors)
      expect(uniqueColors.size).toBe(colors.length)
    })
  })

  describe('PAYMENT_STATUS_DOTS', () => {
    it('should have dot colors for all payment statuses', () => {
      // Assert - all payment statuses should have dot colors
      Object.keys(PAYMENT_STATUS_LABELS).forEach((status) => {
        expect(PAYMENT_STATUS_DOTS[status as PaymentStatus]).toBeDefined()
        expect(typeof PAYMENT_STATUS_DOTS[status as PaymentStatus]).toBe('string')
      })
    })

    it('should contain Tailwind background color classes', () => {
      // Assert - dots should be Tailwind background classes
      Object.values(PAYMENT_STATUS_DOTS).forEach((dotClass) => {
        expect(dotClass).toMatch(/^bg-\w+-\d+$/)
      })
    })
  })

  describe('Legacy/Combined STATUS_* exports', () => {
    it('STATUS_COLORS should contain all booking and payment status colors', () => {
      // Assert - combined export should have all statuses
      Object.keys(BOOKING_STATUS_COLORS).forEach((status) => {
        expect(STATUS_COLORS[status as keyof typeof STATUS_COLORS]).toBeDefined()
      })
      Object.keys(PAYMENT_STATUS_COLORS).forEach((status) => {
        expect(STATUS_COLORS[status as keyof typeof STATUS_COLORS]).toBeDefined()
      })
    })

    it('STATUS_DOTS should contain all booking and payment status dots', () => {
      // Assert - combined export should have all dots
      Object.keys(BOOKING_STATUS_DOTS).forEach((status) => {
        expect(STATUS_DOTS[status as keyof typeof STATUS_DOTS]).toBeDefined()
      })
      Object.keys(PAYMENT_STATUS_DOTS).forEach((status) => {
        expect(STATUS_DOTS[status as keyof typeof STATUS_DOTS]).toBeDefined()
      })
    })

    it('STATUS_LABELS should contain all booking and payment status labels', () => {
      // Assert - combined export should have all labels
      Object.keys(BOOKING_STATUS_LABELS).forEach((status) => {
        expect(STATUS_LABELS[status as keyof typeof STATUS_LABELS]).toBeDefined()
      })
      Object.keys(PAYMENT_STATUS_LABELS).forEach((status) => {
        expect(STATUS_LABELS[status as keyof typeof STATUS_LABELS]).toBeDefined()
      })
    })

    it('STATUS_COLORS_TIMELINE should contain both booking and payment timeline colors', () => {
      // Assert - timeline should include payment statuses too
      expect(STATUS_COLORS_TIMELINE).toHaveProperty('pending')
      expect(STATUS_COLORS_TIMELINE).toHaveProperty('completed')
      expect(STATUS_COLORS_TIMELINE).toHaveProperty('unpaid')
      expect(STATUS_COLORS_TIMELINE).toHaveProperty('paid')
    })
  })

  describe('Type Exports', () => {
    it('BookingStatus type should match BOOKING_STATUS_COLORS keys', () => {
      // This is a compile-time check - if it compiles, the test passes
      const validStatuses: BookingStatus[] = [
        'pending',
        'confirmed',
        'in_progress',
        'completed',
        'cancelled',
        'no_show',
      ]
      validStatuses.forEach((status) => {
        expect(BOOKING_STATUS_COLORS[status]).toBeDefined()
      })
    })

    it('PaymentStatus type should match PAYMENT_STATUS_COLORS keys', () => {
      // This is a compile-time check - if it compiles, the test passes
      const validStatuses: PaymentStatus[] = ['unpaid', 'paid']
      validStatuses.forEach((status) => {
        expect(PAYMENT_STATUS_COLORS[status]).toBeDefined()
      })
    })
  })

  describe('Consistency Checks', () => {
    it('BOOKING_STATUS keys should be identical across all BOOKING_STATUS_* objects', () => {
      // Arrange
      const labelsKeys = Object.keys(BOOKING_STATUS_LABELS).sort()
      const colorsKeys = Object.keys(BOOKING_STATUS_COLORS).sort()
      const dotsKeys = Object.keys(BOOKING_STATUS_DOTS).sort()
      const timelineKeys = Object.keys(BOOKING_STATUS_COLORS_TIMELINE).sort()

      // Assert
      expect(labelsKeys).toEqual(colorsKeys)
      expect(labelsKeys).toEqual(dotsKeys)
      expect(labelsKeys).toEqual(timelineKeys)
    })

    it('PAYMENT_STATUS keys should be identical across all PAYMENT_STATUS_* objects', () => {
      // Arrange
      const labelsKeys = Object.keys(PAYMENT_STATUS_LABELS).sort()
      const colorsKeys = Object.keys(PAYMENT_STATUS_COLORS).sort()
      const dotsKeys = Object.keys(PAYMENT_STATUS_DOTS).sort()

      // Assert
      expect(labelsKeys).toEqual(colorsKeys)
      expect(labelsKeys).toEqual(dotsKeys)
    })

    it('should not have overlapping keys between booking and payment statuses', () => {
      // Arrange
      const bookingKeys = Object.keys(BOOKING_STATUS_LABELS)
      const paymentKeys = Object.keys(PAYMENT_STATUS_LABELS)

      // Assert - no overlap should exist
      const overlap = bookingKeys.filter((key) => paymentKeys.includes(key))
      expect(overlap).toEqual([])
    })
  })

  describe('Filter Dropdown Usage', () => {
    it('BOOKING_STATUS_LABELS entries should be usable in Select dropdown', () => {
      // Simulate how the labels are used in Select components
      const entries = Object.entries(BOOKING_STATUS_LABELS)

      // Assert
      expect(entries.length).toBeGreaterThan(0)
      entries.forEach(([value, label]) => {
        expect(typeof value).toBe('string')
        expect(typeof label).toBe('string')
        expect(value.length).toBeGreaterThan(0)
        expect(label.length).toBeGreaterThan(0)
      })
    })

    it('PAYMENT_STATUS_LABELS entries should be usable in Select dropdown', () => {
      // Simulate how the labels are used in Select components
      const entries = Object.entries(PAYMENT_STATUS_LABELS)

      // Assert
      expect(entries.length).toBeGreaterThan(0)
      entries.forEach(([value, label]) => {
        expect(typeof value).toBe('string')
        expect(typeof label).toBe('string')
        expect(value.length).toBeGreaterThan(0)
        expect(label.length).toBeGreaterThan(0)
      })
    })
  })
})
