/**
 * Booking Test Fixture Factory (V2)
 *
 * A1 Fix: All booking tests MUST use this factory instead of inline mock objects.
 * This ensures all new fields (end_date, job_name, custom_price, price_override)
 * are included by default, preventing stale mock objects in tests.
 *
 * Usage:
 * ```ts
 * const booking = createBookingFixture({ status: 'confirmed' })
 * const multiDay = createMultiDayBookingFixture(3)
 * const custom = createCustomJobBookingFixture()
 * ```
 */

import { format, addDays, parseISO } from 'date-fns'
import type { BookingRecord } from '@/types/booking'
import { BookingStatus, PaymentStatus, PriceMode } from '@/types/booking'

/**
 * Create a standard booking fixture with all V2 fields set to defaults.
 * Pass overrides to customize specific fields.
 */
export const createBookingFixture = (
  overrides?: Partial<BookingRecord & { price_mode?: string }>
): BookingRecord => ({
  id: 'test-booking-id',
  booking_date: '2026-02-19',
  end_date: null,           // V2: null = single-day
  start_time: '09:00:00',
  end_time: '13:00:00',
  customer_id: 'test-customer-id',
  staff_id: 'test-staff-id',
  team_id: null,
  total_price: 2400,
  status: BookingStatus.Confirmed,
  payment_status: PaymentStatus.Unpaid,
  payment_method: null,
  address: '123 ถนนสุขุมวิท',
  city: 'กรุงเทพมหานคร',
  state: 'กรุงเทพมหานคร',
  zip_code: '10110',
  notes: null,
  updated_at: new Date().toISOString(),
  created_at: new Date().toISOString(),
  deleted_at: null,
  // V2 pricing fields
  job_name: null,
  custom_price: null,
  price_override: false,
  package_v2_id: 'test-package-v2-id',
  area_sqm: 50,
  frequency: 1,
  ...overrides,
})

/**
 * Create a multi-day booking fixture.
 *
 * @param days - Number of days the booking spans (minimum 2)
 * @param overrides - Additional field overrides
 */
export const createMultiDayBookingFixture = (
  days = 2,
  overrides?: Partial<BookingRecord>
): BookingRecord =>
  createBookingFixture({
    end_date: format(
      addDays(parseISO('2026-02-19'), days - 1),
      'yyyy-MM-dd'
    ),
    ...overrides,
  })

/**
 * Create a custom job booking fixture (no package, manual price).
 *
 * @param overrides - Additional field overrides
 */
export const createCustomJobBookingFixture = (
  overrides?: Partial<BookingRecord>
): BookingRecord =>
  createBookingFixture({
    package_v2_id: null,
    job_name: 'โรงงาน ABC',
    custom_price: 18000,
    total_price: 18000,
    price_override: false,
    ...overrides,
  })

/**
 * Create an override-priced booking fixture (has package, price manually changed).
 *
 * @param overrides - Additional field overrides
 */
export const createOverrideBookingFixture = (
  overrides?: Partial<BookingRecord>
): BookingRecord =>
  createBookingFixture({
    custom_price: 2000,
    total_price: 2000,
    price_override: true,
    ...overrides,
  })

// Re-export PriceMode for convenience in tests
export { PriceMode }
