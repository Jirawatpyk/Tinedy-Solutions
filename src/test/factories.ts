/**
 * Test Data Factories
 *
 * This module provides factory functions for generating realistic test data
 * using @faker-js/faker. These factories ensure consistent, isolated test data
 * and make tests more maintainable.
 *
 * @module test/factories
 */

import { faker } from '@faker-js/faker'
import type { BookingRecord, BookingWithRelations, BookingStatus, PaymentStatus, PaymentMethod } from '@/types/booking'
import type { CustomerRecord } from '@/types/customer'
import type { ServicePackage } from '@/types/service-package'

/**
 * Creates a mock customer record for testing
 *
 * @param overrides - Partial customer data to override defaults
 * @returns A complete CustomerRecord with realistic fake data
 */
export const createMockCustomer = (overrides: Partial<CustomerRecord> = {}): CustomerRecord => ({
  id: faker.string.uuid(),
  full_name: faker.person.fullName(),
  email: faker.internet.email(),
  phone: faker.helpers.fromRegExp(/08[0-9]{8}/),
  line_id: faker.datatype.boolean() ? faker.string.alphanumeric(10) : null,
  address: faker.location.streetAddress(),
  city: faker.location.city(),
  state: faker.location.state(),
  zip_code: faker.location.zipCode(),
  relationship_level: faker.helpers.arrayElement(['new', 'regular', 'vip', 'inactive'] as const),
  preferred_contact_method: faker.helpers.arrayElement(['phone', 'email', 'line', 'sms'] as const),
  tags: faker.datatype.boolean() ? faker.helpers.arrayElements(['VIP', 'Regular', 'New'], { min: 1, max: 3 }) : null,
  source: faker.helpers.arrayElement(['facebook', 'instagram', 'google', 'website', 'referral', 'walk-in', 'other'] as const),
  birthday: faker.date.past({ years: 30 }).toISOString().split('T')[0],
  company_name: faker.datatype.boolean() ? faker.company.name() : null,
  tax_id: faker.datatype.boolean() ? faker.string.numeric(13) : null,
  notes: faker.datatype.boolean() ? faker.lorem.sentence() : null,
  created_at: faker.date.past().toISOString(),
  updated_at: faker.date.recent().toISOString(),
  ...overrides,
})

/**
 * Creates a mock service package record for testing
 *
 * @param overrides - Partial service package data to override defaults
 * @returns A complete ServicePackage with realistic fake data
 */
export const createMockServicePackage = (overrides: Partial<ServicePackage> = {}): ServicePackage => ({
  id: faker.string.uuid(),
  name: faker.helpers.arrayElement([
    'Basic Cleaning',
    'Deep Cleaning',
    'Premium Cleaning',
    'Basic Training',
    'Advanced Training',
    'Elite Training',
  ]),
  description: faker.lorem.paragraph(),
  service_type: faker.helpers.arrayElement(['cleaning', 'training'] as const),
  duration_minutes: faker.helpers.arrayElement([60, 90, 120, 180, 240]),
  price: faker.number.int({ min: 500, max: 5000 }),
  is_active: faker.datatype.boolean({ probability: 0.9 }),
  created_at: faker.date.past().toISOString(),
  ...overrides,
})

/**
 * Creates a mock staff member record for testing
 *
 * @param overrides - Partial staff data to override defaults
 * @returns A staff profile object
 */
export const createMockStaff = (overrides: Partial<{ id: string; full_name: string; staff_number: string }> = {}) => ({
  id: faker.string.uuid(),
  full_name: faker.person.fullName(),
  staff_number: `S${faker.string.numeric(4)}`,
  ...overrides,
})

/**
 * Creates a mock team record for testing
 *
 * @param overrides - Partial team data to override defaults
 * @returns A team object
 */
export const createMockTeam = (overrides: Partial<{ id: string; name: string }> = {}) => ({
  id: faker.string.uuid(),
  name: faker.helpers.arrayElement(['Team Alpha', 'Team Beta', 'Team Gamma', 'Team Delta']),
  ...overrides,
})

/**
 * Creates a mock booking record for testing
 *
 * @param overrides - Partial booking data to override defaults
 * @returns A complete BookingRecord with realistic fake data
 */
export const createMockBooking = (overrides: Partial<BookingRecord> = {}): BookingRecord => {
  const bookingDate = faker.date.soon({ days: 30 })
  const startHour = faker.number.int({ min: 8, max: 17 })
  const startMinute = faker.helpers.arrayElement([0, 30])
  const startTime = `${startHour.toString().padStart(2, '0')}:${startMinute.toString().padStart(2, '0')}:00`

  const durationMinutes = faker.helpers.arrayElement([60, 90, 120, 180])
  const endDate = new Date(bookingDate)
  endDate.setHours(startHour)
  endDate.setMinutes(startMinute + durationMinutes)
  const endTime = `${endDate.getHours().toString().padStart(2, '0')}:${endDate.getMinutes().toString().padStart(2, '0')}:00`

  const hasStaff = faker.datatype.boolean({ probability: 0.7 })

  return {
    id: faker.string.uuid(),
    booking_date: bookingDate.toISOString().split('T')[0],
    start_time: startTime,
    end_time: endTime,
    customer_id: faker.string.uuid(),
    staff_id: hasStaff ? faker.string.uuid() : null,
    team_id: !hasStaff ? faker.string.uuid() : null,
    service_package_id: faker.string.uuid(),
    total_price: faker.number.int({ min: 500, max: 5000 }),
    status: faker.helpers.arrayElement(['pending', 'confirmed', 'in_progress', 'completed', 'cancelled', 'no_show'] as BookingStatus[]),
    payment_status: faker.helpers.arrayElement(['unpaid', 'paid', 'partial', 'refunded'] as PaymentStatus[]),
    payment_method: faker.helpers.arrayElement(['cash', 'transfer', 'credit_card', 'promptpay', null] as (PaymentMethod | null)[]),
    address: faker.location.streetAddress(),
    city: faker.location.city(),
    state: faker.location.state(),
    zip_code: faker.location.zipCode(),
    notes: faker.datatype.boolean() ? faker.lorem.sentence() : null,
    created_at: faker.date.past().toISOString(),
    updated_at: faker.date.recent().toISOString(),
    ...overrides,
  }
}

/**
 * Creates a mock booking with full relations for testing
 *
 * @param overrides - Partial booking data to override defaults
 * @returns A complete BookingWithRelations with all related entities
 */
export const createMockBookingWithRelations = (
  overrides: Partial<BookingWithRelations> = {}
): BookingWithRelations => {
  const booking = createMockBooking(overrides)
  const customer = createMockCustomer({ id: booking.customer_id })
  const servicePackage = createMockServicePackage({ id: booking.service_package_id })

  let staff = null
  let team = null

  if (booking.staff_id) {
    staff = createMockStaff({ id: booking.staff_id })
  }

  if (booking.team_id) {
    team = createMockTeam({ id: booking.team_id })
  }

  return {
    ...booking,
    customer: {
      id: customer.id,
      full_name: customer.full_name,
      email: customer.email,
      phone: customer.phone,
    },
    staff: staff ? {
      id: staff.id,
      full_name: staff.full_name,
      staff_number: staff.staff_number,
    } : null,
    team: team ? {
      id: team.id,
      name: team.name,
    } : null,
    service_packages: {
      id: servicePackage.id,
      name: servicePackage.name,
      service_type: servicePackage.service_type,
      price: servicePackage.price,
      duration: servicePackage.duration_minutes,
    },
    ...overrides,
  }
}

/**
 * Creates multiple mock bookings for testing list scenarios
 *
 * @param count - Number of bookings to create
 * @param overrides - Partial booking data to apply to all bookings
 * @returns Array of BookingRecord objects
 */
export const createMockBookings = (count: number, overrides: Partial<BookingRecord> = {}): BookingRecord[] => {
  return Array.from({ length: count }, () => createMockBooking(overrides))
}

/**
 * Creates multiple mock bookings with relations for testing
 *
 * @param count - Number of bookings to create
 * @param overrides - Partial booking data to apply to all bookings
 * @returns Array of BookingWithRelations objects
 */
export const createMockBookingsWithRelations = (
  count: number,
  overrides: Partial<BookingWithRelations> = {}
): BookingWithRelations[] => {
  return Array.from({ length: count }, () => createMockBookingWithRelations(overrides))
}

/**
 * Creates a specific booking scenario for conflict testing
 *
 * @param date - The booking date
 * @param startTime - The start time (HH:MM:SS format)
 * @param endTime - The end time (HH:MM:SS format)
 * @param staffId - The staff member ID
 * @param overrides - Additional overrides
 * @returns A BookingRecord configured for the scenario
 */
export const createBookingForTimeSlot = (
  date: string,
  startTime: string,
  endTime: string,
  staffId: string,
  overrides: Partial<BookingRecord> = {}
): BookingRecord => {
  return createMockBooking({
    booking_date: date,
    start_time: startTime,
    end_time: endTime,
    staff_id: staffId,
    status: 'confirmed',
    ...overrides,
  })
}
