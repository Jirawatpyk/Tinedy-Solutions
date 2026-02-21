import { describe, it, expect } from 'vitest'
import { computeDashboardSubtitle } from '../dashboard'
import type { TodayBooking } from '@/types/dashboard'

function makeBooking(overrides: Partial<TodayBooking> = {}): TodayBooking {
  return {
    id: crypto.randomUUID(),
    booking_date: '2026-02-21',
    start_time: '10:00:00',
    end_time: '12:00:00',
    status: 'confirmed',
    total_price: 1000,
    address: '123 Test St',
    city: 'Bangkok',
    state: 'Bangkok',
    zip_code: '10110',
    staff_id: null,
    team_id: null,
    notes: null,
    payment_status: 'unpaid',
    customers: { id: 'c1', full_name: 'Test User', phone: '080', email: 'test@test.com' },
    service_packages: null,
    profiles: null,
    teams: null,
    ...overrides,
  }
}

describe('computeDashboardSubtitle', () => {
  it('returns "No bookings scheduled today" when list is empty', () => {
    expect(computeDashboardSubtitle([])).toBe('No bookings scheduled today')
  })

  it('returns count + revenue when bookings exist with revenue > 0', () => {
    const bookings = [
      makeBooking({ total_price: 1500 }),
      makeBooking({ total_price: 500 }),
    ]
    const result = computeDashboardSubtitle(bookings)
    expect(result).toContain('2 bookings today')
    expect(result).toContain('฿2,000')
    expect(result).toContain('revenue')
  })

  it('uses singular "booking" for count = 1', () => {
    const bookings = [makeBooking({ total_price: 800 })]
    const result = computeDashboardSubtitle(bookings)
    expect(result).toMatch(/^1 booking today/)
    expect(result).not.toContain('1 bookings')
  })

  it('returns count only when all bookings have total_price = 0', () => {
    const bookings = [makeBooking({ total_price: 0 }), makeBooking({ total_price: 0 })]
    const result = computeDashboardSubtitle(bookings)
    expect(result).toBe('2 bookings today')
  })

  it('excludes cancelled bookings from revenue calculation', () => {
    const bookings = [
      makeBooking({ total_price: 2000, status: 'confirmed' }),
      makeBooking({ total_price: 1000, status: 'cancelled' }),
    ]
    const result = computeDashboardSubtitle(bookings)
    // Count = 2 (cancelled still counted), revenue = 2000 (cancelled excluded)
    expect(result).toContain('2 bookings today')
    expect(result).toContain('฿2,000')
  })

  it('shows count-only string when only cancelled bookings remain (revenue = 0)', () => {
    const bookings = [makeBooking({ total_price: 1000, status: 'cancelled' })]
    const result = computeDashboardSubtitle(bookings)
    expect(result).toBe('1 booking today')
  })
})
