/**
 * Test Suite: Booking Utility Functions
 *
 * Tests for pure utility functions that handle booking-related operations.
 * These functions have no side effects and focus on data transformations.
 *
 * Coverage Target: 100% (simple utility functions)
 */

import { describe, it, expect } from 'vitest'
import { formatFullAddress, calculateEndTime, formatTime } from '../booking-utils'

describe('booking-utils', () => {
  describe('formatFullAddress', () => {
    it('should format complete address with all fields', () => {
      // Arrange
      const booking = {
        address: '123 Main St',
        city: 'Bangkok',
        state: 'BKK',
        zip_code: '10110',
      }

      // Act
      const result = formatFullAddress(booking)

      // Assert
      expect(result).toBe('123 Main St, Bangkok, BKK, 10110')
    })

    it('should filter out empty string fields', () => {
      // Arrange
      const booking = {
        address: '123 Main St',
        city: 'Bangkok',
        state: '',
        zip_code: '10110',
      }

      // Act
      const result = formatFullAddress(booking)

      // Assert
      expect(result).toBe('123 Main St, Bangkok, 10110')
    })

    it('should filter out whitespace-only fields', () => {
      // Arrange
      const booking = {
        address: '123 Main St',
        city: '   ',
        state: 'BKK',
        zip_code: '10110',
      }

      // Act
      const result = formatFullAddress(booking)

      // Assert
      expect(result).toBe('123 Main St, BKK, 10110')
    })

    it('should handle all empty fields', () => {
      // Arrange
      const booking = {
        address: '',
        city: '',
        state: '',
        zip_code: '',
      }

      // Act
      const result = formatFullAddress(booking)

      // Assert
      expect(result).toBe('')
    })

    it('should handle single field only', () => {
      // Arrange
      const booking = {
        address: '123 Main St',
        city: '',
        state: '',
        zip_code: '',
      }

      // Act
      const result = formatFullAddress(booking)

      // Assert
      expect(result).toBe('123 Main St')
    })

    it('should handle fields with leading/trailing whitespace', () => {
      // Arrange
      const booking = {
        address: '  123 Main St  ',
        city: '  Bangkok  ',
        state: '  BKK  ',
        zip_code: '  10110  ',
      }

      // Act
      const result = formatFullAddress(booking)

      // Assert
      // Function filters on trim() but doesn't trim the values themselves
      expect(result).toBe('  123 Main St  ,   Bangkok  ,   BKK  ,   10110  ')
    })
  })

  describe('calculateEndTime', () => {
    it('should calculate end time from start time and duration (HH:MM format)', () => {
      // Arrange
      const startTime = '09:00'
      const durationMinutes = 90

      // Act
      const result = calculateEndTime(startTime, durationMinutes)

      // Assert
      expect(result).toBe('10:30')
    })

    it('should calculate end time from start time and duration (HH:MM:SS format)', () => {
      // Arrange
      const startTime = '09:00:00'
      const durationMinutes = 90

      // Act
      const result = calculateEndTime(startTime, durationMinutes)

      // Assert
      expect(result).toBe('10:30')
    })

    it('should handle duration that spans into next hour', () => {
      // Arrange
      const startTime = '14:45'
      const durationMinutes = 30

      // Act
      const result = calculateEndTime(startTime, durationMinutes)

      // Assert
      expect(result).toBe('15:15')
    })

    it('should handle duration that crosses midnight', () => {
      // Arrange
      const startTime = '23:30'
      const durationMinutes = 60

      // Act
      const result = calculateEndTime(startTime, durationMinutes)

      // Assert
      expect(result).toBe('00:30')
    })

    it('should handle zero duration', () => {
      // Arrange
      const startTime = '10:00'
      const durationMinutes = 0

      // Act
      const result = calculateEndTime(startTime, durationMinutes)

      // Assert
      expect(result).toBe('10:00')
    })

    it('should handle very long duration (multiple days)', () => {
      // Arrange
      const startTime = '10:00'
      const durationMinutes = 1500 // 25 hours

      // Act
      const result = calculateEndTime(startTime, durationMinutes)

      // Assert
      // 25 hours = 1 day + 1 hour, wraps to 11:00
      expect(result).toBe('11:00')
    })

    it('should handle single-digit minutes with proper padding', () => {
      // Arrange
      const startTime = '09:05'
      const durationMinutes = 3

      // Act
      const result = calculateEndTime(startTime, durationMinutes)

      // Assert
      expect(result).toBe('09:08')
    })

    it('should handle single-digit hours with proper padding', () => {
      // Arrange
      const startTime = '01:30'
      const durationMinutes = 30

      // Act
      const result = calculateEndTime(startTime, durationMinutes)

      // Assert
      expect(result).toBe('02:00')
    })

    it('should return empty string when startTime is empty', () => {
      // Arrange
      const startTime = ''
      const durationMinutes = 60

      // Act
      const result = calculateEndTime(startTime, durationMinutes)

      // Assert
      expect(result).toBe('')
    })

    it('should handle large duration values', () => {
      // Arrange
      const startTime = '08:00'
      const durationMinutes = 480 // 8 hours

      // Act
      const result = calculateEndTime(startTime, durationMinutes)

      // Assert
      expect(result).toBe('16:00')
    })

    it('should handle afternoon times correctly', () => {
      // Arrange
      const startTime = '13:45'
      const durationMinutes = 135 // 2 hours 15 minutes

      // Act
      const result = calculateEndTime(startTime, durationMinutes)

      // Assert
      expect(result).toBe('16:00')
    })
  })

  describe('formatTime', () => {
    it('should format time by removing seconds (HH:MM:SS → HH:MM)', () => {
      // Arrange
      const time = '14:30:00'

      // Act
      const result = formatTime(time)

      // Assert
      expect(result).toBe('14:30')
    })

    it('should handle time with non-zero seconds', () => {
      // Arrange
      const time = '14:30:45'

      // Act
      const result = formatTime(time)

      // Assert
      expect(result).toBe('14:30')
    })

    it('should handle single-digit hours with leading zero', () => {
      // Arrange
      const time = '09:15:30'

      // Act
      const result = formatTime(time)

      // Assert
      expect(result).toBe('09:15')
    })

    it('should handle midnight time', () => {
      // Arrange
      const time = '00:00:00'

      // Act
      const result = formatTime(time)

      // Assert
      expect(result).toBe('00:00')
    })

    it('should handle time already in HH:MM format', () => {
      // Arrange
      const time = '14:30'

      // Act
      const result = formatTime(time)

      // Assert
      expect(result).toBe('14:30')
    })

    it('should handle afternoon times', () => {
      // Arrange
      const time = '23:59:59'

      // Act
      const result = formatTime(time)

      // Assert
      expect(result).toBe('23:59')
    })
  })
})
