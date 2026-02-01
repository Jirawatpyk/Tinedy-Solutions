/**
 * User Role Constants
 * Centralized role colors, labels, and display names
 */

// Badge colors for role display
export const ROLE_COLORS = {
  admin: 'bg-red-100 text-red-800 border-red-300',
  manager: 'bg-blue-100 text-blue-800 border-blue-300',
  staff: 'bg-green-100 text-green-800 border-green-300',
  customer: 'bg-gray-100 text-gray-800 border-gray-300',
} as const

// Short labels
export const ROLE_LABELS = {
  admin: 'Super Admin',
  manager: 'Admin',
  staff: 'Staff',
  customer: 'Customer',
} as const

// Full display names (Thai)
export const ROLE_DISPLAY_NAMES = {
  admin: 'ผู้ดูแลระบบสูงสุด',
  manager: 'ผู้จัดการ',
  staff: 'พนักงาน',
  customer: 'ลูกค้า',
} as const

// Icons for roles
export const ROLE_ICONS = {
  admin: '👑',
  manager: '🔑',
  staff: '👤',
  customer: '🧑',
} as const

export type RoleKey = keyof typeof ROLE_COLORS
