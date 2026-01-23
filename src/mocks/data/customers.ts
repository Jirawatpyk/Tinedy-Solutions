/**
 * Mock Customer Data for MSW Handlers
 *
 * Story: 3.2 - Create Mock Handlers for Core Entities
 *
 * This file provides mock customer data and factory functions for testing.
 * Data follows the customers table schema with realistic Thai customer patterns.
 */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Customer = any

/**
 * Mock customer records with realistic Thai data
 *
 * Key patterns:
 * - Thai names and addresses
 * - Phone format: 0X-XXXX-XXXX or 0XX-XXX-XXXX
 * - Email: optional
 * - Tags: JSON array (e.g., ["VIP", "ลูกค้าประจำ"])
 * - Analytics fields: total_bookings, total_spent, last_booking_date
 * - Soft delete fields: deleted_at, deleted_by
 */
export const mockCustomers: Customer[] = [
  // VIP Customer
  {
    id: 'customer-001',
    name: 'สมชาย ใจดี',
    phone: '081-234-5678',
    email: 'somchai@example.com',
    address: '123 ถนนสุขุมวิท',
    city: 'กรุงเทพมหานคร',
    state: 'กรุงเทพมหานคร',
    zip_code: '10110',
    tags: ['VIP', 'ลูกค้าประจำ'],
    notes: 'ต้องการบริการเป็นพิเศษ ชอบทีมเดิม',
    total_bookings: 15,
    total_spent: 22500,
    last_booking_date: new Date().toISOString().split('T')[0],
    avatar_url: null,
    created_at: '2024-06-15T08:00:00Z',
    updated_at: new Date().toISOString(),
    deleted_at: null,
    deleted_by: null,
  },
  // Regular Customer
  {
    id: 'customer-002',
    name: 'วิภา สวยงาม',
    phone: '092-345-6789',
    email: null,
    address: '456 ถนนรามคำแหง',
    city: 'กรุงเทพมหานคร',
    state: 'กรุงเทพมหานคร',
    zip_code: '10240',
    tags: ['ลูกค้าใหม่'],
    notes: 'มีสัตว์เลี้ยง ควรระวัง',
    total_bookings: 3,
    total_spent: 4500,
    last_booking_date: '2025-01-20',
    avatar_url: 'https://example.com/avatars/customer-002.jpg',
    created_at: '2025-01-01T10:30:00Z',
    updated_at: '2025-01-20T14:00:00Z',
    deleted_at: null,
    deleted_by: null,
  },
  // Customer with minimal info
  {
    id: 'customer-003',
    name: 'ประยุทธ์ มั่นคง',
    phone: '063-456-7890',
    email: 'prayut@example.com',
    address: '321 ถนนเพชรบุรี',
    city: 'กรุงเทพมหานคร',
    state: 'กรุงเทพมหานคร',
    zip_code: '10400',
    tags: [],
    notes: null,
    total_bookings: 1,
    total_spent: 2000,
    last_booking_date: '2025-01-15',
    avatar_url: null,
    created_at: '2025-01-10T09:00:00Z',
    updated_at: '2025-01-15T16:30:00Z',
    deleted_at: null,
    deleted_by: null,
  },
  // Customer from different province
  {
    id: 'customer-004',
    name: 'นงลักษณ์ สุขสันต์',
    phone: '082-567-8901',
    email: 'nonglak@example.com',
    address: '789 ถนนมหิดล',
    city: 'นครปฐม',
    state: 'นครปฐม',
    zip_code: '73000',
    tags: ['นอกเมือง'],
    notes: 'อยู่ต่างจังหวัด นัดล่วงหน้า 3 วัน',
    total_bookings: 5,
    total_spent: 8000,
    last_booking_date: '2025-01-18',
    avatar_url: null,
    created_at: '2024-11-20T11:00:00Z',
    updated_at: '2025-01-18T10:00:00Z',
    deleted_at: null,
    deleted_by: null,
  },
  // Soft deleted customer (archived)
  {
    id: 'customer-005',
    name: 'ลูกค้าที่ถูกลบ',
    phone: '099-999-9999',
    email: null,
    address: '999 ถนนทดสอบ',
    city: 'กรุงเทพมหานคร',
    state: 'กรุงเทพมหานคร',
    zip_code: '10000',
    tags: ['ยกเลิก'],
    notes: 'ลูกค้าขอยกเลิกบัญชี',
    total_bookings: 0,
    total_spent: 0,
    last_booking_date: null,
    avatar_url: null,
    created_at: '2024-12-01T08:00:00Z',
    updated_at: '2025-01-05T12:00:00Z',
    deleted_at: '2025-01-05T12:00:00Z',
    deleted_by: 'manager-001',
  },
]

/**
 * Factory function: Create a new mock customer with overrides
 *
 * Usage:
 * ```ts
 * const customer = createMockCustomer({ name: 'ทดสอบ ทดสอบ', tags: ['VIP'] })
 * ```
 */
export function createMockCustomer(overrides?: Partial<Customer>): Customer {
  const defaultCustomer: Customer = {
    id: `customer-${Date.now()}`,
    name: 'ลูกค้าทดสอบ',
    phone: '081-111-1111',
    email: null,
    address: '123 ถนนทดสอบ',
    city: 'กรุงเทพมหานคร',
    state: 'กรุงเทพมหานคร',
    zip_code: '10000',
    tags: [],
    notes: null,
    total_bookings: 0,
    total_spent: 0,
    last_booking_date: null,
    avatar_url: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    deleted_at: null,
    deleted_by: null,
  }

  return { ...defaultCustomer, ...overrides }
}

/**
 * Factory function: Create multiple mock customers
 *
 * Usage:
 * ```ts
 * const customers = createMockCustomers(10, { tags: ['ลูกค้าใหม่'] })
 * ```
 */
export function createMockCustomers(
  count: number,
  overrides?: Partial<Customer>
): Customer[] {
  return Array.from({ length: count }, (_, i) =>
    createMockCustomer({ id: `customer-${Date.now()}-${i}`, ...overrides })
  )
}

/**
 * Get active (non-deleted) customers
 */
export function getActiveCustomers(): Customer[] {
  return mockCustomers.filter((c) => c.deleted_at === null)
}

/**
 * Get customers by tag
 */
export function getCustomersByTag(tag: string): Customer[] {
  return getActiveCustomers().filter((c) => c.tags?.includes(tag))
}

/**
 * Get VIP customers (total_spent >= 10000)
 */
export function getVIPCustomers(): Customer[] {
  return getActiveCustomers().filter((c) => c.total_spent >= 10000)
}

/**
 * Get customers by city
 */
export function getCustomersByCity(city: string): Customer[] {
  return getActiveCustomers().filter((c) => c.city === city)
}

/**
 * Search customers by name or phone
 */
export function searchCustomers(query: string): Customer[] {
  const lowerQuery = query.toLowerCase()
  return getActiveCustomers().filter(
    (c) =>
      c.name.toLowerCase().includes(lowerQuery) ||
      c.phone.includes(lowerQuery)
  )
}
