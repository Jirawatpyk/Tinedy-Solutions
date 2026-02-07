/**
 * Role Utilities
 *
 * Helper functions สำหรับจัดการ user roles
 * ใช้ตาม Best Practice เพื่อ Maintainability และ Consistency
 */

import { UserRole } from '@/types/common'

// Re-export UserRole for backwards compatibility
export { UserRole }

/**
 * แปลง role code เป็นชื่อที่แสดงผล (Display Name)
 *
 * @param role - User role ('admin' | 'manager' | 'staff') หรือ string ทั่วไป
 * @returns Display name สำหรับแสดงใน UI
 *
 * @example
 * formatRole('admin') // Returns: 'Super admin'
 * formatRole('manager') // Returns: 'Admin'
 * formatRole('staff') // Returns: 'Staff'
 */
export function formatRole(role: string | null | undefined): string {
  const roleMap: Record<string, string> = {
    admin: 'Super admin',
    manager: 'Admin',
    staff: 'Staff',
  }

  return roleMap[role || ''] || 'Unknown'
}

/**
 * ตรวจสอบว่า role มีสิทธิ์ระดับ admin หรือไม่
 *
 * @param role - User role
 * @returns true ถ้าเป็น admin
 */
export function isAdmin(role: UserRole): boolean {
  return role === UserRole.Admin
}

/**
 * ตรวจสอบว่า role มีสิทธิ์ระดับ manager ขึ้นไปหรือไม่
 *
 * @param role - User role
 * @returns true ถ้าเป็น admin หรือ manager
 */
export function isManagerOrAbove(role: UserRole): boolean {
  return role === UserRole.Admin || role === UserRole.Manager
}

/**
 * เรียงลำดับ roles ตามความสำคัญ (admin > manager > staff)
 *
 * @param role - User role
 * @returns ค่าลำดับ (ยิ่งน้อยยิ่งสำคัญ)
 */
export function getRolePriority(role: UserRole): number {
  const priorityMap: Partial<Record<UserRole, number>> = {
    [UserRole.Admin]: 1,
    [UserRole.Manager]: 2,
    [UserRole.Staff]: 3,
  }

  return priorityMap[role] || 999
}
