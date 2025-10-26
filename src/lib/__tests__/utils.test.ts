import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { cn, formatDate, formatDateTime, formatCurrency } from '../utils'

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
})
