import { describe, it, expect } from 'vitest'
import { formatRole, isAdmin, isManagerOrAbove, getRolePriority } from '../role-utils'
import type { UserRole } from '../role-utils'

describe('role-utils', () => {
  describe('formatRole', () => {
    it('should format admin role correctly', () => {
      expect(formatRole('admin')).toBe('Super admin')
    })

    it('should format manager role correctly', () => {
      expect(formatRole('manager')).toBe('Admin')
    })

    it('should format staff role correctly', () => {
      expect(formatRole('staff')).toBe('Staff')
    })

    it('should return "Unknown" for invalid role', () => {
      expect(formatRole('invalid')).toBe('Unknown')
    })

    it('should return "Unknown" for null role', () => {
      expect(formatRole(null)).toBe('Unknown')
    })

    it('should return "Unknown" for undefined role', () => {
      expect(formatRole(undefined)).toBe('Unknown')
    })

    it('should return "Unknown" for empty string', () => {
      expect(formatRole('')).toBe('Unknown')
    })
  })

  describe('isAdmin', () => {
    it('should return true for admin role', () => {
      expect(isAdmin('admin' as UserRole)).toBe(true)
    })

    it('should return false for manager role', () => {
      expect(isAdmin('manager' as UserRole)).toBe(false)
    })

    it('should return false for staff role', () => {
      expect(isAdmin('staff' as UserRole)).toBe(false)
    })
  })

  describe('isManagerOrAbove', () => {
    it('should return true for admin role', () => {
      expect(isManagerOrAbove('admin' as UserRole)).toBe(true)
    })

    it('should return true for manager role', () => {
      expect(isManagerOrAbove('manager' as UserRole)).toBe(true)
    })

    it('should return false for staff role', () => {
      expect(isManagerOrAbove('staff' as UserRole)).toBe(false)
    })
  })

  describe('getRolePriority', () => {
    it('should return 1 for admin (highest priority)', () => {
      expect(getRolePriority('admin' as UserRole)).toBe(1)
    })

    it('should return 2 for manager', () => {
      expect(getRolePriority('manager' as UserRole)).toBe(2)
    })

    it('should return 3 for staff (lowest priority)', () => {
      expect(getRolePriority('staff' as UserRole)).toBe(3)
    })

    it('should prioritize admin > manager > staff', () => {
      const adminPriority = getRolePriority('admin' as UserRole)
      const managerPriority = getRolePriority('manager' as UserRole)
      const staffPriority = getRolePriority('staff' as UserRole)

      expect(adminPriority).toBeLessThan(managerPriority)
      expect(managerPriority).toBeLessThan(staffPriority)
    })

    it('should return 999 for invalid role (fallback)', () => {
      // @ts-expect-error - Testing invalid input
      expect(getRolePriority('invalid')).toBe(999)
    })
  })

  describe('integration: role hierarchy', () => {
    it('should correctly identify role hierarchy', () => {
      const roles: UserRole[] = ['admin', 'manager', 'staff']

      // Admin has highest privileges
      expect(isAdmin(roles[0])).toBe(true)
      expect(isManagerOrAbove(roles[0])).toBe(true)
      expect(getRolePriority(roles[0])).toBe(1)

      // Manager has medium privileges
      expect(isAdmin(roles[1])).toBe(false)
      expect(isManagerOrAbove(roles[1])).toBe(true)
      expect(getRolePriority(roles[1])).toBe(2)

      // Staff has lowest privileges
      expect(isAdmin(roles[2])).toBe(false)
      expect(isManagerOrAbove(roles[2])).toBe(false)
      expect(getRolePriority(roles[2])).toBe(3)
    })

    it('should format all roles consistently', () => {
      expect(formatRole('admin')).toBe('Super admin')
      expect(formatRole('manager')).toBe('Admin')
      expect(formatRole('staff')).toBe('Staff')
    })

    it('should sort roles by priority', () => {
      const unsortedRoles: UserRole[] = ['staff', 'admin', 'manager']
      const sortedRoles = unsortedRoles.sort(
        (a, b) => getRolePriority(a) - getRolePriority(b)
      )

      expect(sortedRoles).toEqual(['admin', 'manager', 'staff'])
    })
  })
})
