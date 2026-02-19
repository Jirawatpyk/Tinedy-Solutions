import { describe, it, expect } from 'vitest'
import {
  formatDateRange,
  getDatesBetween,
  bookingOverlapsDate,
  bookingOverlapsRange,
  bookingDurationDays,
} from '../date-range-utils'

describe('formatDateRange', () => {
  it('single day (null end_date)', () => {
    expect(formatDateRange('2026-02-19', null)).toBe('19 Feb')
  })

  it('single day (same end_date as start)', () => {
    expect(formatDateRange('2026-02-19', '2026-02-19')).toBe('19 Feb')
  })

  it('same-month range', () => {
    expect(formatDateRange('2026-02-19', '2026-02-20')).toBe('19–20 Feb')
  })

  it('cross-month same-year range', () => {
    expect(formatDateRange('2026-02-28', '2026-03-02')).toBe('28 Feb – 2 Mar')
  })

  it('cross-year range shows year on end date', () => {
    expect(formatDateRange('2026-12-31', '2027-01-01')).toBe('31 Dec – 1 Jan 2027')
  })

  it('undefined end_date treated as single day', () => {
    expect(formatDateRange('2026-02-19', undefined)).toBe('19 Feb')
  })
})

describe('getDatesBetween', () => {
  it('single day returns one date', () => {
    expect(getDatesBetween('2026-02-19', '2026-02-19')).toEqual(['2026-02-19'])
  })

  it('two consecutive days', () => {
    expect(getDatesBetween('2026-02-19', '2026-02-20')).toEqual([
      '2026-02-19',
      '2026-02-20',
    ])
  })

  it('three days', () => {
    expect(getDatesBetween('2026-02-19', '2026-02-21')).toEqual([
      '2026-02-19',
      '2026-02-20',
      '2026-02-21',
    ])
  })

  it('cross-month', () => {
    const dates = getDatesBetween('2026-02-27', '2026-03-01')
    expect(dates).toEqual(['2026-02-27', '2026-02-28', '2026-03-01'])
  })
})

describe('bookingOverlapsDate', () => {
  it('single-day booking matches its date', () => {
    expect(bookingOverlapsDate({ booking_date: '2026-02-19', end_date: null }, '2026-02-19')).toBe(true)
  })

  it('single-day booking does not match other dates', () => {
    expect(bookingOverlapsDate({ booking_date: '2026-02-19', end_date: null }, '2026-02-20')).toBe(false)
  })

  it('multi-day booking matches middle date', () => {
    expect(bookingOverlapsDate({ booking_date: '2026-02-19', end_date: '2026-02-21' }, '2026-02-20')).toBe(true)
  })

  it('multi-day booking matches start date', () => {
    expect(bookingOverlapsDate({ booking_date: '2026-02-19', end_date: '2026-02-21' }, '2026-02-19')).toBe(true)
  })

  it('multi-day booking matches end date', () => {
    expect(bookingOverlapsDate({ booking_date: '2026-02-19', end_date: '2026-02-21' }, '2026-02-21')).toBe(true)
  })

  it('multi-day booking does not match before start', () => {
    expect(bookingOverlapsDate({ booking_date: '2026-02-19', end_date: '2026-02-21' }, '2026-02-18')).toBe(false)
  })

  it('multi-day booking does not match after end', () => {
    expect(bookingOverlapsDate({ booking_date: '2026-02-19', end_date: '2026-02-21' }, '2026-02-22')).toBe(false)
  })
})

describe('bookingOverlapsRange', () => {
  it('single-day booking overlaps its own date range', () => {
    expect(bookingOverlapsRange({ booking_date: '2026-02-19', end_date: null }, '2026-02-19', '2026-02-19')).toBe(true)
  })

  it('booking inside range', () => {
    expect(bookingOverlapsRange({ booking_date: '2026-02-20', end_date: null }, '2026-02-19', '2026-02-25')).toBe(true)
  })

  it('booking that spans into range', () => {
    expect(bookingOverlapsRange({ booking_date: '2026-02-17', end_date: '2026-02-21' }, '2026-02-19', '2026-02-25')).toBe(true)
  })

  it('booking that starts in range and extends beyond', () => {
    expect(bookingOverlapsRange({ booking_date: '2026-02-23', end_date: '2026-02-28' }, '2026-02-19', '2026-02-25')).toBe(true)
  })

  it('booking that fully wraps range', () => {
    expect(bookingOverlapsRange({ booking_date: '2026-02-17', end_date: '2026-02-28' }, '2026-02-19', '2026-02-25')).toBe(true)
  })

  it('booking completely before range', () => {
    expect(bookingOverlapsRange({ booking_date: '2026-02-10', end_date: '2026-02-15' }, '2026-02-19', '2026-02-25')).toBe(false)
  })

  it('booking completely after range', () => {
    expect(bookingOverlapsRange({ booking_date: '2026-02-28', end_date: null }, '2026-02-19', '2026-02-25')).toBe(false)
  })

  // A14 Fix: Adjacent bookings MUST NOT conflict
  it('adjacent booking (ends Feb 19, range starts Feb 20) does not conflict', () => {
    expect(bookingOverlapsRange(
      { booking_date: '2026-02-18', end_date: '2026-02-19' },
      '2026-02-20', '2026-02-21'
    )).toBe(false)
  })

  it('adjacent single-day booking does not conflict', () => {
    expect(bookingOverlapsRange(
      { booking_date: '2026-02-18', end_date: null },
      '2026-02-19', '2026-02-21'
    )).toBe(false)
  })
})

describe('bookingDurationDays', () => {
  it('single day (null end_date)', () => {
    expect(bookingDurationDays({ booking_date: '2026-02-19', end_date: null })).toBe(1)
  })

  it('single day (same end_date)', () => {
    expect(bookingDurationDays({ booking_date: '2026-02-19', end_date: '2026-02-19' })).toBe(1)
  })

  it('two days', () => {
    expect(bookingDurationDays({ booking_date: '2026-02-19', end_date: '2026-02-20' })).toBe(2)
  })

  it('three days', () => {
    expect(bookingDurationDays({ booking_date: '2026-02-19', end_date: '2026-02-21' })).toBe(3)
  })
})
