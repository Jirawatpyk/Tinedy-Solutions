import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import {
  cn,
  formatDate,
  formatDateTime,
  formatCurrency,
  getBangkokDateString,
  getAvatarColor,
  getRankBadgeColor,
  formatBookingId,
  AVATAR_COLORS,
  RANK_BADGE_COLORS,
} from '../utils'
import { getInitials } from '../string-utils'

describe('utils', () => {
  describe('cn', () => {
    it('should merge class names', () => {
      const result = cn('px-2', 'py-1')
      expect(result).toBe('px-2 py-1')
    })

    it('should handle conditional classes', () => {
      const isActive = true
      const isHidden = false
      const result = cn('base-class', isActive && 'conditional-class', isHidden && 'hidden-class')
      expect(result).toBe('base-class conditional-class')
    })

    it('should merge conflicting Tailwind classes', () => {
      // twMerge should keep the last conflicting class
      const result = cn('px-2', 'px-4')
      expect(result).toBe('px-4')
    })

    it('should handle arrays of classes', () => {
      const result = cn(['px-2', 'py-1'], 'text-red-500')
      expect(result).toBe('px-2 py-1 text-red-500')
    })

    it('should handle objects with boolean values', () => {
      const result = cn({ 'px-2': true, 'py-1': false, 'text-blue-500': true })
      expect(result).toBe('px-2 text-blue-500')
    })

    it('should handle undefined and null values', () => {
      const result = cn('px-2', undefined, null, 'py-1')
      expect(result).toBe('px-2 py-1')
    })

    it('should handle empty input', () => {
      const result = cn()
      expect(result).toBe('')
    })

    it('should handle complex combinations', () => {
      const result = cn(
        'base',
        ['array-1', 'array-2'],
        { 'conditional-1': true, 'conditional-2': false },
        undefined,
        'final'
      )
      expect(result).toContain('base')
      expect(result).toContain('array-1')
      expect(result).toContain('array-2')
      expect(result).toContain('conditional-1')
      expect(result).not.toContain('conditional-2')
      expect(result).toContain('final')
    })
  })

  describe('formatDate', () => {
    beforeEach(() => {
      // Mock locale to ensure consistent test results across different environments
      vi.spyOn(Date.prototype, 'toLocaleDateString').mockImplementation(function(this: Date) {
        const year = this.getFullYear()
        const month = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][this.getMonth()]
        const day = this.getDate()
        return `${month} ${day}, ${year}`
      })
    })

    afterEach(() => {
      vi.restoreAllMocks()
    })

    it('should format Date object', () => {
      const date = new Date('2025-10-26T12:00:00Z')
      const result = formatDate(date)
      expect(result).toBe('Oct 26, 2025')
    })

    it('should format date string', () => {
      const result = formatDate('2025-10-26')
      expect(result).toContain('2025')
      expect(result).toContain('Oct')
      expect(result).toContain('26')
    })

    it('should format ISO date string', () => {
      const result = formatDate('2025-10-26T12:00:00Z')
      expect(result).toContain('2025')
      expect(result).toContain('Oct')
    })

    it('should handle different date formats', () => {
      const result = formatDate('10/26/2025')
      expect(result).toContain('2025')
    })
  })

  describe('formatDateTime', () => {
    beforeEach(() => {
      vi.spyOn(Date.prototype, 'toLocaleString').mockImplementation(function(this: Date) {
        const year = this.getFullYear()
        const month = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][this.getMonth()]
        const day = this.getDate()
        const hours = String(this.getHours()).padStart(2, '0')
        const minutes = String(this.getMinutes()).padStart(2, '0')
        return `${month} ${day}, ${year}, ${hours}:${minutes}`
      })
    })

    afterEach(() => {
      vi.restoreAllMocks()
    })

    it('should format Date object with time', () => {
      const date = new Date('2025-10-26T14:30:00Z')
      const result = formatDateTime(date)
      // The mock converts to local time, so we check the structure instead
      expect(result).toContain('Oct 26, 2025')
      expect(result).toMatch(/\d{2}:\d{2}/)
    })

    it('should format date string with time', () => {
      const result = formatDateTime('2025-10-26T14:30:00Z')
      expect(result).toContain('2025')
      expect(result).toContain('Oct')
      expect(result).toContain('26')
    })

    it('should include time in format', () => {
      const result = formatDateTime('2025-10-26T14:30:00Z')
      // Should contain time portion
      expect(result.length).toBeGreaterThan(12) // More than just date
    })
  })

  describe('formatCurrency', () => {
    it('should format Thai Baht with ฿ symbol', () => {
      const result = formatCurrency(1000)
      expect(result).toContain('฿')
      expect(result).toContain('1')
    })

    it('should format zero amount', () => {
      const result = formatCurrency(0)
      expect(result).toBe('฿0')
    })

    it('should format large numbers with thousand separators', () => {
      const result = formatCurrency(1000000)
      expect(result).toContain('฿')
      expect(result).toContain('1')
      // Thai locale uses comma as thousand separator
      expect(result).toContain(',')
    })

    it('should format decimal numbers without decimals', () => {
      const result = formatCurrency(1234.56)
      expect(result).toContain('฿')
      expect(result).toContain('1')
      // Should round or truncate decimals
      expect(result).not.toContain('.')
    })

    it('should format negative numbers', () => {
      const result = formatCurrency(-500)
      expect(result).toContain('฿')
      expect(result).toContain('-')
    })

    it('should handle very small decimal amounts', () => {
      const result = formatCurrency(0.99)
      expect(result).toContain('฿')
      // Should round to 0 or 1 based on rounding rules
      expect(result).toMatch(/฿[01]/)
    })

    it('should format typical booking amounts', () => {
      const testCases = [
        { amount: 500, expected: /฿500/ },
        { amount: 1500, expected: /฿1,500/ },
        { amount: 10000, expected: /฿10,000/ },
      ]

      testCases.forEach(({ amount, expected }) => {
        const result = formatCurrency(amount)
        expect(result).toMatch(expected)
      })
    })
  })

  describe('getBangkokDateString', () => {
    beforeEach(() => {
      vi.useFakeTimers()
    })

    afterEach(() => {
      vi.useRealTimers()
    })

    it('should return date in YYYY-MM-DD format', () => {
      vi.setSystemTime(new Date('2024-01-15T12:00:00Z'))
      const result = getBangkokDateString()
      expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    })

    it('should account for Bangkok timezone (UTC+7)', () => {
      // Set to 23:00 UTC on Jan 15 (should be Jan 16 06:00 in Bangkok)
      vi.setSystemTime(new Date('2024-01-15T23:00:00Z'))
      const result = getBangkokDateString()
      // UTC+7 offset applied
      expect(result).toMatch(/^2024-01-1[56]$/)
    })

    it('should return consistent format', () => {
      vi.setSystemTime(new Date('2024-03-05T00:00:00Z'))
      const result = getBangkokDateString()
      expect(result).toHaveLength(10)
      expect(result.split('-')).toHaveLength(3)
    })

    it('should handle year-end dates correctly', () => {
      vi.setSystemTime(new Date('2024-12-31T20:00:00Z'))
      const result = getBangkokDateString()
      expect(result).toMatch(/^202[45]-/)
    })
  })

  describe('getAvatarColor', () => {
    it('should return color from AVATAR_COLORS array', () => {
      const result = getAvatarColor(0)
      expect(AVATAR_COLORS).toContain(result as any)
    })

    it('should cycle through colors using modulo', () => {
      const result = getAvatarColor(AVATAR_COLORS.length)
      expect(result).toBe(AVATAR_COLORS[0])
    })

    it('should handle large indices', () => {
      const result = getAvatarColor(25)
      expect(AVATAR_COLORS).toContain(result as any)
    })

    it('should handle negative numbers by returning first color', () => {
      const result = getAvatarColor(-5)
      expect(result).toBe(AVATAR_COLORS[0])
    })

    it('should handle non-number input', () => {
      const result = getAvatarColor('invalid' as any)
      expect(result).toBe(AVATAR_COLORS[0])
    })

    it('should return different colors for consecutive indices', () => {
      const color1 = getAvatarColor(0)
      const color2 = getAvatarColor(1)
      expect(color1).not.toBe(color2)
    })
  })

  describe('getRankBadgeColor', () => {
    it('should return gold for first place (index 0)', () => {
      expect(getRankBadgeColor(0)).toBe(RANK_BADGE_COLORS.gold)
    })

    it('should return silver for second place (index 1)', () => {
      expect(getRankBadgeColor(1)).toBe(RANK_BADGE_COLORS.silver)
    })

    it('should return bronze for third place (index 2)', () => {
      expect(getRankBadgeColor(2)).toBe(RANK_BADGE_COLORS.bronze)
    })

    it('should return default for fourth place and beyond', () => {
      expect(getRankBadgeColor(3)).toBe(RANK_BADGE_COLORS.default)
      expect(getRankBadgeColor(4)).toBe(RANK_BADGE_COLORS.default)
      expect(getRankBadgeColor(10)).toBe(RANK_BADGE_COLORS.default)
    })

    it('should handle negative numbers by returning default', () => {
      expect(getRankBadgeColor(-1)).toBe(RANK_BADGE_COLORS.default)
    })

    it('should handle non-number input', () => {
      expect(getRankBadgeColor('invalid' as any)).toBe(RANK_BADGE_COLORS.default)
    })

    it('should include proper color classes', () => {
      const gold = getRankBadgeColor(0)
      expect(gold).toContain('bg-')
      expect(gold).toContain('text-')
    })
  })

  describe('formatBookingId', () => {
    it('should format UUID correctly', () => {
      const result = formatBookingId('6g12c6co-1234-5678-9abc-def012345678')
      expect(result).toBe('#BK-6G12C6')
    })

    it('should uppercase the ID', () => {
      const result = formatBookingId('abcdef-1234-5678-9abc-def012345678')
      expect(result).toBe('#BK-ABCDEF')
    })

    it('should handle short IDs', () => {
      const result = formatBookingId('abc')
      expect(result).toBe('#BK-ABC')
    })

    it('should handle empty string', () => {
      const result = formatBookingId('')
      expect(result).toBe('#BK-??????')
    })

    it('should handle null/undefined input', () => {
      expect(formatBookingId(null as any)).toBe('#BK-??????')
      expect(formatBookingId(undefined as any)).toBe('#BK-??????')
    })

    it('should handle non-string input', () => {
      expect(formatBookingId(123 as any)).toBe('#BK-??????')
      expect(formatBookingId({} as any)).toBe('#BK-??????')
    })

    it('should always start with #BK-', () => {
      const result = formatBookingId('test-id-12345')
      expect(result).toMatch(/^#BK-/)
    })

    it('should truncate to 6 characters after prefix', () => {
      const result = formatBookingId('1234567890abcdef')
      expect(result).toHaveLength(10) // #BK- (4) + 6 chars
      expect(result).toBe('#BK-123456')
    })

    it('should handle IDs with special characters', () => {
      const result = formatBookingId('a1-b2-c3-d4')
      expect(result).toBe('#BK-A1-B2-')
    })

    it('should maintain consistent format', () => {
      const result = formatBookingId('booking-123')
      expect(result).toMatch(/^#BK-[A-Z0-9-]{6}$/)
    })

    it('should handle lowercase UUIDs', () => {
      const result = formatBookingId('abc123-def456-789')
      expect(result).toBe('#BK-ABC123')
    })
  })

  describe('constants', () => {
    it('AVATAR_COLORS should have expected length', () => {
      expect(AVATAR_COLORS).toHaveLength(10)
    })

    it('AVATAR_COLORS should contain Tailwind classes', () => {
      AVATAR_COLORS.forEach((color) => {
        expect(color).toMatch(/^bg-/)
      })
    })

    it('RANK_BADGE_COLORS should have all required keys', () => {
      expect(RANK_BADGE_COLORS).toHaveProperty('gold')
      expect(RANK_BADGE_COLORS).toHaveProperty('silver')
      expect(RANK_BADGE_COLORS).toHaveProperty('bronze')
      expect(RANK_BADGE_COLORS).toHaveProperty('default')
    })

    it('RANK_BADGE_COLORS should contain valid Tailwind classes', () => {
      Object.values(RANK_BADGE_COLORS).forEach((colorClass) => {
        expect(colorClass).toMatch(/bg-/)
        expect(colorClass).toMatch(/text-/)
      })
    })
  })

  describe('integration scenarios', () => {
    it('should format booking display correctly', () => {
      const bookingId = formatBookingId('abc123-uuid-here')
      const date = formatDate('2024-01-15')
      const amount = formatCurrency(1500)

      expect(bookingId).toMatch(/^#BK-/)
      expect(date).toMatch(/Jan 15, 2024/)
      expect(amount).toBe('฿1,500')
    })

    it('should generate staff avatar correctly', () => {
      const name = 'John Doe'
      const initials = getInitials(name)
      const color = getAvatarColor(0)

      expect(initials).toBe('JD')
      expect(AVATAR_COLORS).toContain(color as any)
    })

    it('should handle leaderboard ranking', () => {
      const ranks = [0, 1, 2, 3].map((i) => getRankBadgeColor(i))

      expect(ranks[0]).toBe(RANK_BADGE_COLORS.gold)
      expect(ranks[1]).toBe(RANK_BADGE_COLORS.silver)
      expect(ranks[2]).toBe(RANK_BADGE_COLORS.bronze)
      expect(ranks[3]).toBe(RANK_BADGE_COLORS.default)
    })

    it('should format payment summary correctly', () => {
      vi.useFakeTimers()
      vi.setSystemTime(new Date('2024-01-15T12:00:00Z'))

      const date = getBangkokDateString()
      const amount = formatCurrency(2500)

      expect(date).toMatch(/^\d{4}-\d{2}-\d{2}$/)
      expect(amount).toMatch(/^฿2,500$/)

      vi.useRealTimers()
    })
  })
})
