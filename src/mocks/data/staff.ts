/**
 * Mock Staff Data (Profiles) for MSW Handlers
 *
 * Story: 3.2 - Create Mock Handlers for Core Entities
 *
 * This file provides mock staff/profile data and factory functions for testing.
 * Data follows the profiles table schema with realistic role-based patterns.
 */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Profile = any

/**
 * Mock profile records with realistic staff data
 *
 * Key patterns:
 * - Roles: 'admin', 'manager', 'staff'
 * - Staff numbers: STF0001, STF0002, etc. (auto-generated)
 * - Skills: JSON array (e.g., ["ทำความสะอาด", "ซักรีด"])
 * - Phone format: 0X-XXXX-XXXX
 * - Rating: 0-5 (nullable for new staff)
 * - Soft delete fields: deleted_at, deleted_by
 */
export const mockProfiles: Profile[] = [
  // Admin user
  {
    id: 'admin-001',
    email: 'admin@tinedy.com',
    full_name: 'ผู้ดูแลระบบ',
    phone: '081-000-0001',
    role: 'admin',
    staff_number: 'ADM0001',
    skills: ['บริหารระบบ', 'จัดการทีม'],
    rating: null,
    avatar_url: null,
    created_at: '2024-01-01T08:00:00Z',
    updated_at: new Date().toISOString(),
    deleted_at: null,
    deleted_by: null,
  },
  // Manager user
  {
    id: 'manager-001',
    email: 'manager@tinedy.com',
    full_name: 'ผู้จัดการประจำ',
    phone: '082-000-0001',
    role: 'manager',
    staff_number: 'MGR0001',
    skills: ['จัดการงาน', 'ประสานงานทีม'],
    rating: null,
    avatar_url: 'https://example.com/avatars/manager-001.jpg',
    created_at: '2024-01-15T09:00:00Z',
    updated_at: '2025-01-20T10:00:00Z',
    deleted_at: null,
    deleted_by: null,
  },
  // Staff member #1 (experienced)
  {
    id: 'staff-001',
    email: 'staff001@tinedy.com',
    full_name: 'สมหญิง ขยัน',
    phone: '091-111-1111',
    role: 'staff',
    staff_number: 'STF0001',
    skills: ['ทำความสะอาดบ้าน', 'ซักรีด', 'ทำอาหาร'],
    rating: 4.8,
    avatar_url: null,
    created_at: '2024-03-01T10:00:00Z',
    updated_at: '2025-01-22T08:30:00Z',
    deleted_at: null,
    deleted_by: null,
  },
  // Staff member #2 (new)
  {
    id: 'staff-002',
    email: 'staff002@tinedy.com',
    full_name: 'สมชาย รวดเร็ว',
    phone: '092-222-2222',
    role: 'staff',
    staff_number: 'STF0002',
    skills: ['ทำความสะอาดคอนโด', 'ดูแลสวน'],
    rating: 4.5,
    avatar_url: 'https://example.com/avatars/staff-002.jpg',
    created_at: '2024-06-15T11:00:00Z',
    updated_at: '2025-01-21T14:00:00Z',
    deleted_at: null,
    deleted_by: null,
  },
  // Staff member #3 (no rating yet)
  {
    id: 'staff-003',
    email: 'staff003@tinedy.com',
    full_name: 'นงนุช สุภาพ',
    phone: '093-333-3333',
    role: 'staff',
    staff_number: 'STF0003',
    skills: ['ทำความสะอาดออฟฟิศ'],
    rating: null,
    avatar_url: null,
    created_at: '2025-01-10T09:00:00Z',
    updated_at: '2025-01-10T09:00:00Z',
    deleted_at: null,
    deleted_by: null,
  },
  // Soft deleted staff (resigned)
  {
    id: 'staff-004',
    email: 'staff004@tinedy.com',
    full_name: 'พนักงานที่ลาออก',
    phone: '094-444-4444',
    role: 'staff',
    staff_number: 'STF0004',
    skills: ['ทำความสะอาด'],
    rating: 4.2,
    avatar_url: null,
    created_at: '2024-08-01T08:00:00Z',
    updated_at: '2025-01-15T16:00:00Z',
    deleted_at: '2025-01-15T16:00:00Z',
    deleted_by: 'admin-001',
  },
]

/**
 * Factory function: Create a new mock profile with overrides
 *
 * Usage:
 * ```ts
 * const staff = createMockProfile({ role: 'staff', full_name: 'ทดสอบ' })
 * ```
 */
export function createMockProfile(overrides?: Partial<Profile>): Profile {
  const timestamp = Date.now()
  const defaultProfile: Profile = {
    id: `profile-${timestamp}`,
    email: `user-${timestamp}@tinedy.com`,
    full_name: 'ผู้ใช้ทดสอบ',
    phone: '081-999-9999',
    role: 'staff',
    staff_number: `STF${String(timestamp).slice(-4).padStart(4, '0')}`,
    skills: [],
    rating: null,
    avatar_url: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    deleted_at: null,
    deleted_by: null,
  }

  return { ...defaultProfile, ...overrides }
}

/**
 * Factory function: Create multiple mock profiles
 *
 * Usage:
 * ```ts
 * const staffList = createMockProfiles(5, { role: 'staff' })
 * ```
 */
export function createMockProfiles(
  count: number,
  overrides?: Partial<Profile>
): Profile[] {
  return Array.from({ length: count }, (_, i) =>
    createMockProfile({
      id: `profile-${Date.now()}-${i}`,
      email: `user-${Date.now()}-${i}@tinedy.com`,
      ...overrides,
    })
  )
}

/**
 * Get active (non-deleted) profiles
 */
export function getActiveProfiles(): Profile[] {
  return mockProfiles.filter((p) => p.deleted_at === null)
}

/**
 * Get profiles by role
 */
export function getProfilesByRole(role: Profile['role']): Profile[] {
  return getActiveProfiles().filter((p) => p.role === role)
}

/**
 * Get staff members only (excludes admin/manager)
 */
export function getStaffMembers(): Profile[] {
  return getProfilesByRole('staff')
}

/**
 * Get profiles with rating above threshold
 */
export function getTopRatedStaff(minRating: number = 4.5): Profile[] {
  return getActiveProfiles().filter(
    (p) => p.role === 'staff' && p.rating !== null && p.rating >= minRating
  )
}

/**
 * Get profiles by skill
 */
export function getProfilesBySkill(skill: string): Profile[] {
  return getActiveProfiles().filter((p) => p.skills?.includes(skill))
}

/**
 * Search profiles by name or email
 */
export function searchProfiles(query: string): Profile[] {
  const lowerQuery = query.toLowerCase()
  return getActiveProfiles().filter(
    (p) =>
      p.full_name?.toLowerCase().includes(lowerQuery) ||
      p.email.toLowerCase().includes(lowerQuery)
  )
}
