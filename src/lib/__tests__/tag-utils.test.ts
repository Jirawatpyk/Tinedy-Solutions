import { describe, it, expect } from 'vitest'
import { getTagColor } from '../tag-utils'

describe('tag-utils', () => {
  describe('getTagColor', () => {
    describe('Behavior tags', () => {
      it('should return amber color for "vip" tag', () => {
        const color = getTagColor('vip')
        expect(color).toBe('bg-amber-100 text-amber-700 border-amber-300')
      })

      it('should return amber color for "VIP" tag (case insensitive)', () => {
        const color = getTagColor('VIP')
        expect(color).toBe('bg-amber-100 text-amber-700 border-amber-300')
      })

      it('should return amber color for "returner" tag', () => {
        const color = getTagColor('returner')
        expect(color).toBe('bg-amber-100 text-amber-700 border-amber-300')
      })

      it('should return green color for "regular" tag', () => {
        const color = getTagColor('regular')
        expect(color).toBe('bg-green-100 text-green-700 border-green-300')
      })

      it('should return blue color for "first-timer" tag', () => {
        const color = getTagColor('first-timer')
        expect(color).toBe('bg-blue-100 text-blue-700 border-blue-300')
      })
    })

    describe('Type tags', () => {
      it('should return indigo color for "corporate" tag', () => {
        const color = getTagColor('corporate')
        expect(color).toBe('bg-indigo-100 text-indigo-700 border-indigo-300')
      })

      it('should return slate color for "individual" tag', () => {
        const color = getTagColor('individual')
        expect(color).toBe('bg-slate-100 text-slate-700 border-slate-300')
      })

      it('should return slate color for "walk-in" tag', () => {
        const color = getTagColor('walk-in')
        expect(color).toBe('bg-slate-100 text-slate-700 border-slate-300')
      })
    })

    describe('Marketing tags', () => {
      it('should return purple color for "newsletter" tag', () => {
        const color = getTagColor('newsletter')
        expect(color).toBe('bg-purple-100 text-purple-700 border-purple-300')
      })

      it('should return purple color for "promotion" tag', () => {
        const color = getTagColor('promotion')
        expect(color).toBe('bg-purple-100 text-purple-700 border-purple-300')
      })

      it('should return purple color for "birthday-reminder" tag', () => {
        const color = getTagColor('birthday-reminder')
        expect(color).toBe('bg-purple-100 text-purple-700 border-purple-300')
      })
    })

    describe('Notes tags', () => {
      it('should return cyan color for "special-needs" tag', () => {
        const color = getTagColor('special-needs')
        expect(color).toBe('bg-cyan-100 text-cyan-700 border-cyan-300')
      })

      it('should return red color for "payment-issue" tag', () => {
        const color = getTagColor('payment-issue')
        expect(color).toBe('bg-red-100 text-red-700 border-red-300')
      })

      it('should return red color for "complaint" tag', () => {
        const color = getTagColor('complaint')
        expect(color).toBe('bg-red-100 text-red-700 border-red-300')
      })
    })

    describe('Value tags', () => {
      it('should return emerald color for "high-value" tag', () => {
        const color = getTagColor('high-value')
        expect(color).toBe('bg-emerald-100 text-emerald-700 border-emerald-300')
      })

      it('should return yellow color for "medium-value" tag', () => {
        const color = getTagColor('medium-value')
        expect(color).toBe('bg-yellow-100 text-yellow-700 border-yellow-300')
      })

      it('should return orange color for "low-value" tag', () => {
        const color = getTagColor('low-value')
        expect(color).toBe('bg-orange-100 text-orange-700 border-orange-300')
      })
    })

    describe('Default and edge cases', () => {
      it('should return gray color for unknown tag', () => {
        const color = getTagColor('unknown-tag')
        expect(color).toBe('bg-gray-100 text-gray-700 border-gray-300')
      })

      it('should return gray color for empty string', () => {
        const color = getTagColor('')
        expect(color).toBe('bg-gray-100 text-gray-700 border-gray-300')
      })

      it('should handle mixed case tags correctly', () => {
        const color = getTagColor('ReGuLaR')
        expect(color).toBe('bg-green-100 text-green-700 border-green-300')
      })

      it('should handle uppercase tags correctly', () => {
        const color = getTagColor('CORPORATE')
        expect(color).toBe('bg-indigo-100 text-indigo-700 border-indigo-300')
      })
    })
  })
})
