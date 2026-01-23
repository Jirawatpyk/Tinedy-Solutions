/**
 * Test User Fixtures for E2E Tests
 *
 * Story: 3.3 - Setup Playwright for E2E Testing (Re-opened)
 *
 * Provides known test users with credentials for E2E authentication.
 * These users match the mock data in src/mocks/data/staff.ts.
 *
 * Usage in E2E tests:
 * ```ts
 * import { testUsers } from '@/tests/fixtures/users'
 *
 * await page.fill('[name="email"]', testUsers.admin.email)
 * await page.fill('[name="password"]', testUsers.admin.password)
 * ```
 */

/**
 * Test user credentials
 *
 * IMPORTANT: These are test-only credentials, never use in production
 */
export const testUsers = {
  /**
   * Admin user with full system access
   */
  admin: {
    id: 'admin-001',
    email: 'admin@tinedy.com',
    password: 'TestAdmin123!',
    full_name: 'ผู้ดูแลระบบ',
    role: 'admin' as const,
    staff_number: 'ADM0001',
  },

  /**
   * Manager user with operational access
   */
  manager: {
    id: 'manager-001',
    email: 'manager@tinedy.com',
    password: 'TestManager123!',
    full_name: 'ผู้จัดการประจำ',
    role: 'manager' as const,
    staff_number: 'MGR0001',
  },

  /**
   * Staff member #1 - experienced staff
   */
  staff1: {
    id: 'staff-001',
    email: 'staff001@tinedy.com',
    password: 'TestStaff123!',
    full_name: 'สมหญิง ขยัน',
    role: 'staff' as const,
    staff_number: 'STF0001',
    rating: 4.8,
  },

  /**
   * Staff member #2 - newer staff
   */
  staff2: {
    id: 'staff-002',
    email: 'staff002@tinedy.com',
    password: 'TestStaff123!',
    full_name: 'สมชาย รวดเร็ว',
    role: 'staff' as const,
    staff_number: 'STF0002',
    rating: 4.5,
  },

  /**
   * Staff member #3 - no rating yet (new)
   */
  staff3: {
    id: 'staff-003',
    email: 'staff003@tinedy.com',
    password: 'TestStaff123!',
    full_name: 'นงนุช สุภาพ',
    role: 'staff' as const,
    staff_number: 'STF0003',
    rating: null,
  },
} as const

/**
 * Helper: Get user by role
 */
export function getUserByRole(role: 'admin' | 'manager' | 'staff') {
  switch (role) {
    case 'admin':
      return testUsers.admin
    case 'manager':
      return testUsers.manager
    case 'staff':
      return testUsers.staff1
  }
}

/**
 * Helper: Get all staff users
 */
export function getAllStaff() {
  return [testUsers.staff1, testUsers.staff2, testUsers.staff3]
}

/**
 * Type: Test user credentials
 */
export type TestUser = (typeof testUsers)[keyof typeof testUsers]
