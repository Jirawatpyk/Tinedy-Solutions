/**
 * User Role Constants
 * Centralized role colors, labels, and display names
 */

import type { UserRole } from '@/types/common'

/** Badge colors for role display */
export const ROLE_COLORS: Record<UserRole, string> = {
  admin: 'bg-red-100 text-red-800 border-red-300',
  manager: 'bg-blue-100 text-blue-800 border-blue-300',
  staff: 'bg-green-100 text-green-800 border-green-300',
  customer: 'bg-tinedy-off-white text-tinedy-dark border-tinedy-dark/20',
} as const

/** Short labels for role display (matches formatRole() output) */
export const ROLE_LABELS: Record<UserRole, string> = {
  admin: 'Super Admin',
  manager: 'Admin',
  staff: 'Staff',
  customer: 'Customer',
} as const

/** Full display names in Thai */
export const ROLE_DISPLAY_NAMES: Record<UserRole, string> = {
  admin: 'ผู้ดูแลระบบสูงสุด',
  manager: 'ผู้จัดการ',
  staff: 'พนักงาน',
  customer: 'ลูกค้า',
} as const

/** Icons for roles */
export const ROLE_ICONS: Record<UserRole, string> = {
  admin: '👑',
  manager: '🔑',
  staff: '👤',
  customer: '🧑',
} as const
