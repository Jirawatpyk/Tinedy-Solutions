/**
 * usePermissions Hook Tests
 *
 * Tests for the usePermissions hook and all permission-checking functions
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook } from '@testing-library/react'
import { usePermissions, usePermission, useIsAdmin, useIsManagerOrAdmin, useCanDelete, useCanSoftDelete } from '../use-permissions'
import * as authContext from '@/contexts/auth-context'

// Mock auth context
vi.mock('@/contexts/auth-context', () => ({
  useAuth: vi.fn(),
}))

describe('usePermissions', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Admin Role', () => {
    beforeEach(() => {
      vi.mocked(authContext.useAuth).mockReturnValue({
        profile: { role: 'admin', id: 'admin-1', full_name: 'Admin User' },
        loading: false,
      } as ReturnType<typeof authContext.useAuth>)
    })

    it('should return admin as true', () => {
      const { result } = renderHook(() => usePermissions())
      expect(result.current.isAdmin).toBe(true)
      expect(result.current.isManagerOrAdmin).toBe(true)
      expect(result.current.isStaff).toBe(false)
      expect(result.current.role).toBe('admin')
    })

    it('should allow admin to create bookings', () => {
      const { result } = renderHook(() => usePermissions())
      expect(result.current.can('create', 'bookings')).toBe(true)
    })

    it('should allow admin to delete bookings', () => {
      const { result } = renderHook(() => usePermissions())
      expect(result.current.can('delete', 'bookings')).toBe(true)
      expect(result.current.canDelete('bookings')).toBe(true)
    })

    it('should allow admin to soft delete bookings', () => {
      const { result } = renderHook(() => usePermissions())
      expect(result.current.canSoftDelete('bookings')).toBe(true)
    })

    it('should allow admin to restore deleted items', () => {
      const { result } = renderHook(() => usePermissions())
      expect(result.current.canRestore()).toBe(true)
    })

    it('should allow admin to permanently delete', () => {
      const { result } = renderHook(() => usePermissions())
      expect(result.current.canPermanentlyDelete()).toBe(true)
    })

    it('should allow admin to access settings', () => {
      const { result } = renderHook(() => usePermissions())
      expect(result.current.can('read', 'settings')).toBe(true)
      expect(result.current.can('update', 'settings')).toBe(true)
    })

    it('should allow admin to create/delete staff', () => {
      const { result } = renderHook(() => usePermissions())
      expect(result.current.can('create', 'staff')).toBe(true)
      expect(result.current.can('delete', 'staff')).toBe(true)
    })

    it('should allow admin to export data', () => {
      const { result } = renderHook(() => usePermissions())
      expect(result.current.can('export', 'bookings')).toBe(true)
      expect(result.current.can('export', 'customers')).toBe(true)
      expect(result.current.can('export', 'reports')).toBe(true)
    })

    it('should allow admin to access all routes', () => {
      const { result } = renderHook(() => usePermissions())
      expect(result.current.canAccessRoute('/admin')).toBe(true)
      expect(result.current.canAccessRoute('/admin/settings')).toBe(true)
      expect(result.current.canAccessRoute('/manager')).toBe(true)
    })

    it('should return complete permissions object', () => {
      const { result } = renderHook(() => usePermissions())
      expect(result.current.permissions).toBeDefined()
      expect(result.current.permissions.bookings).toBeDefined()
      expect(result.current.permissions.customers).toBeDefined()
      expect(result.current.permissions.staff).toBeDefined()
    })
  })

  describe('Manager Role', () => {
    beforeEach(() => {
      vi.mocked(authContext.useAuth).mockReturnValue({
        profile: { role: 'manager', id: 'manager-1', full_name: 'Manager User' },
        loading: false,
      } as ReturnType<typeof authContext.useAuth>)
    })

    it('should return manager as true', () => {
      const { result } = renderHook(() => usePermissions())
      expect(result.current.isAdmin).toBe(false)
      expect(result.current.isManagerOrAdmin).toBe(true)
      expect(result.current.isStaff).toBe(false)
      expect(result.current.role).toBe('manager')
    })

    it('should allow manager to create bookings', () => {
      const { result } = renderHook(() => usePermissions())
      expect(result.current.can('create', 'bookings')).toBe(true)
    })

    it('should NOT allow manager to delete bookings (hard delete)', () => {
      const { result } = renderHook(() => usePermissions())
      expect(result.current.can('delete', 'bookings')).toBe(false)
      expect(result.current.canDelete('bookings')).toBe(false)
    })

    it('should allow manager to soft delete bookings', () => {
      const { result } = renderHook(() => usePermissions())
      expect(result.current.canSoftDelete('bookings')).toBe(true)
    })

    it('should allow manager to restore deleted items', () => {
      const { result } = renderHook(() => usePermissions())
      expect(result.current.canRestore()).toBe(true)
    })

    it('should NOT allow manager to permanently delete', () => {
      const { result } = renderHook(() => usePermissions())
      expect(result.current.canPermanentlyDelete()).toBe(false)
    })

    it('should NOT allow manager to access settings', () => {
      const { result } = renderHook(() => usePermissions())
      expect(result.current.can('read', 'settings')).toBe(false)
      expect(result.current.can('update', 'settings')).toBe(false)
    })

    it('should NOT allow manager to create/delete staff', () => {
      const { result } = renderHook(() => usePermissions())
      expect(result.current.can('create', 'staff')).toBe(false)
      expect(result.current.can('delete', 'staff')).toBe(false)
    })

    it('should allow manager to read and update staff', () => {
      const { result } = renderHook(() => usePermissions())
      expect(result.current.can('read', 'staff')).toBe(true)
      expect(result.current.can('update', 'staff')).toBe(true)
    })

    it('should allow manager to export some data', () => {
      const { result } = renderHook(() => usePermissions())
      expect(result.current.can('export', 'bookings')).toBe(true)
      expect(result.current.can('export', 'customers')).toBe(true)
      expect(result.current.can('export', 'reports')).toBe(true)
    })

    it('should allow manager to create and update service packages', () => {
      const { result } = renderHook(() => usePermissions())
      expect(result.current.can('create', 'service_packages')).toBe(true)
      expect(result.current.can('read', 'service_packages')).toBe(true)
      expect(result.current.can('update', 'service_packages')).toBe(true)
    })

    it('should NOT allow manager to hard delete service packages', () => {
      const { result } = renderHook(() => usePermissions())
      expect(result.current.can('delete', 'service_packages')).toBe(false)
    })

    it('should allow manager to access manager routes', () => {
      const { result } = renderHook(() => usePermissions())
      expect(result.current.canAccessRoute('/manager')).toBe(true)
      expect(result.current.canAccessRoute('/manager/bookings')).toBe(true)
    })

    it('should allow manager to access most admin routes except settings', () => {
      // Note: Current implementation allows admin + manager to access most /admin routes
      // But /admin/settings is restricted to admin only
      const { result } = renderHook(() => usePermissions())
      expect(result.current.canAccessRoute('/admin')).toBe(true)
      expect(result.current.canAccessRoute('/admin/settings')).toBe(false) // Settings is admin-only
    })

    it('should NOT allow manager to delete customers', () => {
      const { result } = renderHook(() => usePermissions())
      expect(result.current.can('delete', 'customers')).toBe(false)
      expect(result.current.canDelete('customers')).toBe(false)
    })

    it('should allow manager to create/update customers', () => {
      const { result } = renderHook(() => usePermissions())
      expect(result.current.can('create', 'customers')).toBe(true)
      expect(result.current.can('update', 'customers')).toBe(true)
    })

    it('should allow manager to create/update teams', () => {
      const { result } = renderHook(() => usePermissions())
      expect(result.current.can('create', 'teams')).toBe(true)
      expect(result.current.can('update', 'teams')).toBe(true)
    })

    it('should NOT allow manager to delete teams', () => {
      const { result } = renderHook(() => usePermissions())
      expect(result.current.can('delete', 'teams')).toBe(false)
    })
  })

  describe('Staff Role', () => {
    beforeEach(() => {
      vi.mocked(authContext.useAuth).mockReturnValue({
        profile: { role: 'staff', id: 'staff-1', full_name: 'Staff User' },
        loading: false,
      } as ReturnType<typeof authContext.useAuth>)
    })

    it('should return staff as true', () => {
      const { result } = renderHook(() => usePermissions())
      expect(result.current.isAdmin).toBe(false)
      expect(result.current.isManagerOrAdmin).toBe(false)
      expect(result.current.isStaff).toBe(true)
      expect(result.current.role).toBe('staff')
    })

    it('should NOT allow staff to create bookings', () => {
      const { result } = renderHook(() => usePermissions())
      expect(result.current.can('create', 'bookings')).toBe(false)
    })

    it('should allow staff to read bookings', () => {
      const { result } = renderHook(() => usePermissions())
      expect(result.current.can('read', 'bookings')).toBe(true)
    })

    it('should allow staff to update bookings (own only)', () => {
      const { result } = renderHook(() => usePermissions())
      expect(result.current.can('update', 'bookings')).toBe(true)
    })

    it('should NOT allow staff to delete bookings', () => {
      const { result } = renderHook(() => usePermissions())
      expect(result.current.can('delete', 'bookings')).toBe(false)
      expect(result.current.canDelete('bookings')).toBe(false)
    })

    it('should NOT allow staff to soft delete', () => {
      const { result } = renderHook(() => usePermissions())
      expect(result.current.canSoftDelete('bookings')).toBe(false)
    })

    it('should NOT allow staff to restore deleted items', () => {
      const { result } = renderHook(() => usePermissions())
      expect(result.current.canRestore()).toBe(false)
    })

    it('should NOT allow staff to export data', () => {
      const { result } = renderHook(() => usePermissions())
      expect(result.current.can('export', 'bookings')).toBe(false)
      expect(result.current.can('export', 'customers')).toBe(false)
    })

    it('should NOT allow staff to create customers', () => {
      const { result } = renderHook(() => usePermissions())
      expect(result.current.can('create', 'customers')).toBe(false)
    })

    it('should allow staff to read customers (assigned only)', () => {
      const { result } = renderHook(() => usePermissions())
      expect(result.current.can('read', 'customers')).toBe(true)
    })

    it('should allow staff to update own profile', () => {
      const { result } = renderHook(() => usePermissions())
      expect(result.current.can('update', 'staff')).toBe(true)
    })

    it('should NOT allow staff to access reports', () => {
      const { result } = renderHook(() => usePermissions())
      expect(result.current.can('read', 'reports')).toBe(false)
    })

    it('should allow staff to access staff routes', () => {
      const { result } = renderHook(() => usePermissions())
      expect(result.current.canAccessRoute('/staff')).toBe(true)
      expect(result.current.canAccessRoute('/staff/calendar')).toBe(true)
    })

    it('should allow staff to access manager routes (not in ROUTE_PERMISSIONS)', () => {
      // Note: /manager routes are not explicitly in ROUTE_PERMISSIONS
      // Routes not defined are treated as public (no restrictions)
      const { result } = renderHook(() => usePermissions())
      expect(result.current.canAccessRoute('/manager')).toBe(true)
    })

    it('should NOT allow staff to access admin routes', () => {
      const { result } = renderHook(() => usePermissions())
      expect(result.current.canAccessRoute('/admin')).toBe(false)
    })
  })

  describe('No Role (Not Logged In)', () => {
    beforeEach(() => {
      vi.mocked(authContext.useAuth).mockReturnValue({
        profile: null,
        loading: false,
      } as ReturnType<typeof authContext.useAuth>)
    })

    it('should return null role', () => {
      const { result } = renderHook(() => usePermissions())
      expect(result.current.role).toBe(null)
      expect(result.current.isAdmin).toBe(false)
      expect(result.current.isManagerOrAdmin).toBe(false)
      expect(result.current.isStaff).toBe(false)
    })

    it('should deny all permissions', () => {
      const { result } = renderHook(() => usePermissions())
      expect(result.current.can('create', 'bookings')).toBe(false)
      expect(result.current.can('read', 'bookings')).toBe(false)
      expect(result.current.canDelete('bookings')).toBe(false)
      expect(result.current.canSoftDelete('bookings')).toBe(false)
      expect(result.current.canRestore()).toBe(false)
      expect(result.current.canPermanentlyDelete()).toBe(false)
    })

    it('should deny all route access', () => {
      const { result } = renderHook(() => usePermissions())
      expect(result.current.canAccessRoute('/admin')).toBe(false)
      expect(result.current.canAccessRoute('/manager')).toBe(false)
      expect(result.current.canAccessRoute('/staff')).toBe(false)
    })

    it('should return empty permissions object', () => {
      const { result } = renderHook(() => usePermissions())
      expect(result.current.permissions).toEqual({})
    })
  })

  describe('Loading State', () => {
    it('should reflect loading state from auth context', () => {
      vi.mocked(authContext.useAuth).mockReturnValue({
        profile: null,
        loading: true,
      } as ReturnType<typeof authContext.useAuth>)

      const { result } = renderHook(() => usePermissions())
      expect(result.current.loading).toBe(true)
    })
  })
})

// ============================================================================
// Convenience Hooks Tests
// ============================================================================

describe('usePermission', () => {
  it('should check specific permission for admin', () => {
    vi.mocked(authContext.useAuth).mockReturnValue({
      profile: { role: 'admin', id: 'admin-1', full_name: 'Admin User' },
      loading: false,
    } as ReturnType<typeof authContext.useAuth>)

    const { result } = renderHook(() => usePermission('delete', 'bookings'))
    expect(result.current).toBe(true)
  })

  it('should check specific permission for manager', () => {
    vi.mocked(authContext.useAuth).mockReturnValue({
      profile: { role: 'manager', id: 'manager-1', full_name: 'Manager User' },
      loading: false,
    } as ReturnType<typeof authContext.useAuth>)

    const { result } = renderHook(() => usePermission('delete', 'bookings'))
    expect(result.current).toBe(false)
  })
})

describe('useIsAdmin', () => {
  it('should return true for admin', () => {
    vi.mocked(authContext.useAuth).mockReturnValue({
      profile: { role: 'admin', id: 'admin-1', full_name: 'Admin User' },
      loading: false,
    } as ReturnType<typeof authContext.useAuth>)

    const { result } = renderHook(() => useIsAdmin())
    expect(result.current).toBe(true)
  })

  it('should return false for manager', () => {
    vi.mocked(authContext.useAuth).mockReturnValue({
      profile: { role: 'manager', id: 'manager-1', full_name: 'Manager User' },
      loading: false,
    } as ReturnType<typeof authContext.useAuth>)

    const { result } = renderHook(() => useIsAdmin())
    expect(result.current).toBe(false)
  })
})

describe('useIsManagerOrAdmin', () => {
  it('should return true for admin', () => {
    vi.mocked(authContext.useAuth).mockReturnValue({
      profile: { role: 'admin', id: 'admin-1', full_name: 'Admin User' },
      loading: false,
    } as ReturnType<typeof authContext.useAuth>)

    const { result } = renderHook(() => useIsManagerOrAdmin())
    expect(result.current).toBe(true)
  })

  it('should return true for manager', () => {
    vi.mocked(authContext.useAuth).mockReturnValue({
      profile: { role: 'manager', id: 'manager-1', full_name: 'Manager User' },
      loading: false,
    } as ReturnType<typeof authContext.useAuth>)

    const { result } = renderHook(() => useIsManagerOrAdmin())
    expect(result.current).toBe(true)
  })

  it('should return false for staff', () => {
    vi.mocked(authContext.useAuth).mockReturnValue({
      profile: { role: 'staff', id: 'staff-1', full_name: 'Staff User' },
      loading: false,
    } as ReturnType<typeof authContext.useAuth>)

    const { result } = renderHook(() => useIsManagerOrAdmin())
    expect(result.current).toBe(false)
  })
})

describe('useCanDelete', () => {
  it('should return true for admin', () => {
    vi.mocked(authContext.useAuth).mockReturnValue({
      profile: { role: 'admin', id: 'admin-1', full_name: 'Admin User' },
      loading: false,
    } as ReturnType<typeof authContext.useAuth>)

    const { result } = renderHook(() => useCanDelete('bookings'))
    expect(result.current).toBe(true)
  })

  it('should return false for manager', () => {
    vi.mocked(authContext.useAuth).mockReturnValue({
      profile: { role: 'manager', id: 'manager-1', full_name: 'Manager User' },
      loading: false,
    } as ReturnType<typeof authContext.useAuth>)

    const { result } = renderHook(() => useCanDelete('bookings'))
    expect(result.current).toBe(false)
  })
})

describe('useCanSoftDelete', () => {
  it('should return true for admin', () => {
    vi.mocked(authContext.useAuth).mockReturnValue({
      profile: { role: 'admin', id: 'admin-1', full_name: 'Admin User' },
      loading: false,
    } as ReturnType<typeof authContext.useAuth>)

    const { result } = renderHook(() => useCanSoftDelete('bookings'))
    expect(result.current).toBe(true)
  })

  it('should return true for manager', () => {
    vi.mocked(authContext.useAuth).mockReturnValue({
      profile: { role: 'manager', id: 'manager-1', full_name: 'Manager User' },
      loading: false,
    } as ReturnType<typeof authContext.useAuth>)

    const { result } = renderHook(() => useCanSoftDelete('bookings'))
    expect(result.current).toBe(true)
  })

  it('should return false for staff', () => {
    vi.mocked(authContext.useAuth).mockReturnValue({
      profile: { role: 'staff', id: 'staff-1', full_name: 'Staff User' },
      loading: false,
    } as ReturnType<typeof authContext.useAuth>)

    const { result } = renderHook(() => useCanSoftDelete('bookings'))
    expect(result.current).toBe(false)
  })
})
