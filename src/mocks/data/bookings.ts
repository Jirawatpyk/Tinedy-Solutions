/**
 * Mock Booking Data for MSW Handlers
 *
 * Story: 3.2 - Create Mock Handlers for Core Entities
 *
 * This file provides mock booking data and factory functions for testing.
 * Data follows the bookings table schema with realistic relationships.
 */

/** Mock booking record matching raw database row shape for PostgREST simulation */
export interface MockBooking {
  id: string
  customer_id: string
  staff_id: string | null
  team_id: string | null
  booking_date: string
  end_date: string | null
  start_time: string
  end_time: string
  status: string
  address: string
  city: string
  state: string
  zip_code: string
  notes: string | null
  price: number
  total_price?: number
  payment_status: string
  payment_method: string | null
  payment_slip_url: string | null
  created_at: string
  updated_at: string
  deleted_at: string | null
  deleted_by: string | null
  // V2 pricing fields
  package_v2_id?: string | null
  job_name?: string | null
  custom_price?: number | null
  price_override?: boolean
  [key: string]: unknown
}

/**
 * Mock booking records with realistic data
 *
 * Key patterns:
 * - Uses Thai Baht (฿) for pricing
 * - Includes soft delete fields (deleted_at, deleted_by)
 * - Assignment: staff_id OR team_id (never both)
 * - Time format: HH:MM:SS (display as HH:MM in UI)
 * - Full address pattern: address, city, state, zip_code
 */
export const mockBookings: MockBooking[] = [
  // Today's booking - pending
  {
    id: 'booking-001',
    customer_id: 'customer-001',
    package_v2_id: 'pkg-v2-001',
    staff_id: 'staff-001',
    team_id: null,
    booking_date: new Date().toISOString().split('T')[0],
    end_date: null,
    start_time: '09:00:00',
    end_time: '11:00:00',
    status: 'pending',
    address: '123 ถนนสุขุมวิท',
    city: 'กรุงเทพมหานคร',
    state: 'กรุงเทพมหานคร',
    zip_code: '10110',
    notes: 'ต้องการทำความสะอาดละเอียด',
    price: 1500,
    payment_status: 'pending',
    payment_method: null,
    payment_slip_url: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    deleted_at: null,
    deleted_by: null,
  },
  // Today's booking - confirmed (team assigned)
  {
    id: 'booking-002',
    customer_id: 'customer-002',
    package_v2_id: 'pkg-v2-002',
    staff_id: null,
    team_id: 'team-001',
    booking_date: new Date().toISOString().split('T')[0],
    end_date: null,
    start_time: '14:00:00',
    end_time: '16:00:00',
    status: 'confirmed',
    address: '456 ถนนรามคำแหง',
    city: 'กรุงเทพมหานคร',
    state: 'กรุงเทพมหานคร',
    zip_code: '10240',
    notes: 'บ้าน 2 ชั้น มีสัตว์เลี้ยง',
    price: 2500,
    payment_status: 'paid',
    payment_method: 'promptpay',
    payment_slip_url: 'https://example.com/slip-002.jpg',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    deleted_at: null,
    deleted_by: null,
  },
  // Tomorrow's booking - confirmed
  {
    id: 'booking-003',
    customer_id: 'customer-001',
    package_v2_id: 'pkg-v2-001',
    staff_id: 'staff-002',
    team_id: null,
    booking_date: new Date(Date.now() + 86400000).toISOString().split('T')[0], // +1 day
    end_date: null,
    start_time: '10:00:00',
    end_time: '12:00:00',
    status: 'confirmed',
    address: '789 ถนนพระราม 9',
    city: 'กรุงเทพมหานคร',
    state: 'กรุงเทพมหานคร',
    zip_code: '10310',
    notes: null,
    price: 1800,
    payment_status: 'pending',
    payment_method: null,
    payment_slip_url: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    deleted_at: null,
    deleted_by: null,
  },
  // Completed booking - last week
  {
    id: 'booking-004',
    customer_id: 'customer-003',
    package_v2_id: 'pkg-v2-001',
    staff_id: 'staff-001',
    team_id: null,
    booking_date: new Date(Date.now() - 604800000).toISOString().split('T')[0], // -7 days
    end_date: null,
    start_time: '13:00:00',
    end_time: '15:00:00',
    status: 'completed',
    address: '321 ถนนเพชรบุรี',
    city: 'กรุงเทพมหานคร',
    state: 'กรุงเทพมหานคร',
    zip_code: '10400',
    notes: 'ลูกค้าประจำ',
    price: 2000,
    payment_status: 'paid',
    payment_method: 'cash',
    payment_slip_url: null,
    created_at: new Date(Date.now() - 604800000).toISOString(),
    updated_at: new Date(Date.now() - 604800000).toISOString(),
    deleted_at: null,
    deleted_by: null,
  },
  // Soft deleted booking (archived)
  {
    id: 'booking-005',
    customer_id: 'customer-002',
    package_v2_id: 'pkg-v2-001',
    staff_id: 'staff-002',
    team_id: null,
    booking_date: '2025-01-10',
    end_date: null,
    start_time: '11:00:00',
    end_time: '13:00:00',
    status: 'cancelled',
    address: '555 ถนนสาทร',
    city: 'กรุงเทพมหานคร',
    state: 'กรุงเทพมหานคร',
    zip_code: '10120',
    notes: 'ยกเลิกโดยลูกค้า',
    price: 1500,
    payment_status: 'refunded',
    payment_method: 'promptpay',
    payment_slip_url: null,
    created_at: '2025-01-08T10:00:00Z',
    updated_at: '2025-01-09T15:30:00Z',
    deleted_at: '2025-01-09T15:30:00Z',
    deleted_by: 'admin-001',
  },
]

/**
 * Factory function: Create a new mock booking with overrides
 *
 * Usage:
 * ```ts
 * const booking = createMockBooking({ status: 'confirmed', staff_id: 'staff-123' })
 * ```
 */
export function createMockBooking(overrides?: Partial<MockBooking>): MockBooking {
  const defaultBooking: MockBooking = {
    id: `booking-${Date.now()}`,
    customer_id: 'customer-001',
    package_v2_id: 'pkg-v2-001',
    staff_id: 'staff-001',
    team_id: null,
    booking_date: new Date().toISOString().split('T')[0],
    end_date: null,
    start_time: '09:00:00',
    end_time: '11:00:00',
    status: 'pending',
    address: '123 ถนนทดสอบ',
    city: 'กรุงเทพมหานคร',
    state: 'กรุงเทพมหานคร',
    zip_code: '10000',
    notes: null,
    price: 1500,
    payment_status: 'pending',
    payment_method: null,
    payment_slip_url: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    deleted_at: null,
    deleted_by: null,
    job_name: null,
    custom_price: null,
    price_override: false,
  }

  return { ...defaultBooking, ...overrides }
}

/**
 * Factory function: Create multiple mock bookings
 *
 * Usage:
 * ```ts
 * const bookings = createMockBookings(5, { status: 'confirmed' })
 * ```
 */
export function createMockBookings(
  count: number,
  overrides?: Partial<MockBooking>
): MockBooking[] {
  return Array.from({ length: count }, (_, i) =>
    createMockBooking({ id: `booking-${Date.now()}-${i}`, ...overrides })
  )
}

/**
 * Get active (non-deleted) bookings
 */
export function getActiveBookings(): MockBooking[] {
  return mockBookings.filter((b) => b.deleted_at === null)
}

/**
 * Get bookings by staff ID
 */
export function getBookingsByStaff(staffId: string): MockBooking[] {
  return getActiveBookings().filter((b) => b.staff_id === staffId)
}

/**
 * Get bookings by team ID
 */
export function getBookingsByTeam(teamId: string): MockBooking[] {
  return getActiveBookings().filter((b) => b.team_id === teamId)
}

/**
 * Get bookings by status
 */
export function getBookingsByStatus(status: string): MockBooking[] {
  return getActiveBookings().filter((b) => b.status === status)
}

/**
 * Get bookings by date range
 */
export function getBookingsByDateRange(
  startDate: string,
  endDate: string
): MockBooking[] {
  return getActiveBookings().filter(
    (b) => b.booking_date >= startDate && b.booking_date <= endDate
  )
}
