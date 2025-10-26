import { describe, it, expect } from 'vitest'
import {
  getBookingStatusVariant,
  getPaymentStatusVariant,
  getBookingStatusLabel,
  getPaymentStatusLabel,
} from '../status-utils'

describe('status-utils', () => {
  describe('getBookingStatusVariant', () => {
    it('should return "success" for completed status', () => {
      const variant = getBookingStatusVariant('completed')
      expect(variant).toBe('success')
    })

    it('should return "info" for confirmed status', () => {
      const variant = getBookingStatusVariant('confirmed')
      expect(variant).toBe('info')
    })

    it('should return "warning" for pending status', () => {
      const variant = getBookingStatusVariant('pending')
      expect(variant).toBe('warning')
    })

    it('should return "danger" for cancelled status', () => {
      const variant = getBookingStatusVariant('cancelled')
      expect(variant).toBe('danger')
    })

    it('should return "purple" for in_progress status', () => {
      const variant = getBookingStatusVariant('in_progress')
      expect(variant).toBe('purple')
    })

    it('should return "danger" for no_show status', () => {
      const variant = getBookingStatusVariant('no_show')
      expect(variant).toBe('danger')
    })

    it('should return "default" for unknown status', () => {
      const variant = getBookingStatusVariant('unknown_status')
      expect(variant).toBe('default')
    })

    it('should return "default" for empty string', () => {
      const variant = getBookingStatusVariant('')
      expect(variant).toBe('default')
    })
  })

  describe('getPaymentStatusVariant', () => {
    it('should return "success" for paid status', () => {
      const variant = getPaymentStatusVariant('paid')
      expect(variant).toBe('success')
    })

    it('should return "danger" for unpaid status', () => {
      const variant = getPaymentStatusVariant('unpaid')
      expect(variant).toBe('danger')
    })

    it('should return "warning" for partial status', () => {
      const variant = getPaymentStatusVariant('partial')
      expect(variant).toBe('warning')
    })

    it('should return "purple" for refunded status', () => {
      const variant = getPaymentStatusVariant('refunded')
      expect(variant).toBe('purple')
    })

    it('should return "default" for unknown status', () => {
      const variant = getPaymentStatusVariant('unknown_status')
      expect(variant).toBe('default')
    })

    it('should return "default" for empty string', () => {
      const variant = getPaymentStatusVariant('')
      expect(variant).toBe('default')
    })
  })

  describe('getBookingStatusLabel', () => {
    it('should return "Pending" for pending status', () => {
      const label = getBookingStatusLabel('pending')
      expect(label).toBe('Pending')
    })

    it('should return "Confirmed" for confirmed status', () => {
      const label = getBookingStatusLabel('confirmed')
      expect(label).toBe('Confirmed')
    })

    it('should return "In Progress" for in_progress status', () => {
      const label = getBookingStatusLabel('in_progress')
      expect(label).toBe('In Progress')
    })

    it('should return "Completed" for completed status', () => {
      const label = getBookingStatusLabel('completed')
      expect(label).toBe('Completed')
    })

    it('should return "Cancelled" for cancelled status', () => {
      const label = getBookingStatusLabel('cancelled')
      expect(label).toBe('Cancelled')
    })

    it('should return "No Show" for no_show status', () => {
      const label = getBookingStatusLabel('no_show')
      expect(label).toBe('No Show')
    })

    it('should return original status for unknown status', () => {
      const label = getBookingStatusLabel('unknown_status')
      expect(label).toBe('unknown_status')
    })

    it('should return empty string for empty input', () => {
      const label = getBookingStatusLabel('')
      expect(label).toBe('')
    })
  })

  describe('getPaymentStatusLabel', () => {
    it('should return "Paid" for paid status', () => {
      const label = getPaymentStatusLabel('paid')
      expect(label).toBe('Paid')
    })

    it('should return "Unpaid" for unpaid status', () => {
      const label = getPaymentStatusLabel('unpaid')
      expect(label).toBe('Unpaid')
    })

    it('should return "Partial" for partial status', () => {
      const label = getPaymentStatusLabel('partial')
      expect(label).toBe('Partial')
    })

    it('should return "Refunded" for refunded status', () => {
      const label = getPaymentStatusLabel('refunded')
      expect(label).toBe('Refunded')
    })

    it('should return original status for unknown status', () => {
      const label = getPaymentStatusLabel('unknown_status')
      expect(label).toBe('unknown_status')
    })

    it('should return empty string for empty input', () => {
      const label = getPaymentStatusLabel('')
      expect(label).toBe('')
    })
  })
})
