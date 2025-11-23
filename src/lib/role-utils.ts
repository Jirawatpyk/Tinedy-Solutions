/**
 * Role Utilities
 *
 * Helper functions สำหรับจัดการ user roles
 * ใช้ตาม Best Practice เพื่อ Maintainability และ Consistency
 */

type UserRole = 'admin' | 'manager' | 'staff'

/**
 * แปลง role code เป็นชื่อที่แสดงผล (Display Name)
 *
 * @param role - User role ('admin' | 'manager' | 'staff')
 * @returns Display name สำหรับแสดงใน UI
 *
 * @example
 * formatRole('admin') // Returns: 'Admin'
 * formatRole('manager') // Returns: 'Manager'
 * formatRole('staff') // Returns: 'Staff'
 */
export function formatRole(role: UserRole): string {
  const roleMap: Record<UserRole, string> = {
    admin: 'Admin',
    manager: 'Manager',
    staff: 'Staff',
  }

  return roleMap[role] || 'Unknown'
}

/**
 * ตรวจสอบว่า role มีสิทธิ์ระดับ admin หรือไม่
 *
 * @param role - User role
 * @returns true ถ้าเป็น admin
 */
export function isAdmin(role: UserRole): boolean {
  return role === 'admin'
}

/**
 * ตรวจสอบว่า role มีสิทธิ์ระดับ manager ขึ้นไปหรือไม่
 *
 * @param role - User role
 * @returns true ถ้าเป็น admin หรือ manager
 */
export function isManagerOrAbove(role: UserRole): boolean {
  return role === 'admin' || role === 'manager'
}

/**
 * เรียงลำดับ roles ตามความสำคัญ (admin > manager > staff)
 *
 * @param role - User role
 * @returns ค่าลำดับ (ยิ่งน้อยยิ่งสำคัญ)
 */
export function getRolePriority(role: UserRole): number {
  const priorityMap: Record<UserRole, number> = {
    admin: 1,
    manager: 2,
    staff: 3,
  }

  return priorityMap[role] || 999
}
