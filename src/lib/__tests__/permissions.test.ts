/**
 * Permission Utilities Tests
 *
 * Tests for permission utility functions and constants
 */

import { describe, it, expect } from 'vitest'
import {
  PERMISSION_MATRIX,
  ROUTE_PERMISSIONS,
  SOFT_DELETE_RESOURCES,
  FEATURE_FLAGS,
  checkPermission,
  canDelete,
  canAccessRoute,
  getPermissionsForRole,
  isAdmin,
  isManagerOrAdmin,
  isStaff,
  supportsSoftDelete,
  canSoftDelete,
  canRestore,
  canPermanentlyDelete,
  hasFeature,
} from '../permissions'
import type { UserRole, PermissionAction, PermissionResource } from '@/types/common'

// ============================================================================
// PERMISSION MATRIX TESTS
// ============================================================================

describe('PERMISSION_MATRIX', () => {
  it('should have permissions for all roles', () => {
    expect(PERMISSION_MATRIX.admin).toBeDefined()
    expect(PERMISSION_MATRIX.manager).toBeDefined()
    expect(PERMISSION_MATRIX.staff).toBeDefined()
    expect(PERMISSION_MATRIX.customer).toBeDefined()
  })

  it('should define permissions for all resources', () => {
    const resources: PermissionResource[] = [
      'bookings',
      'customers',
      'staff',
      'teams',
      'reports',
      'settings',
      'users',
      'service_packages',
    ]

    resources.forEach((resource) => {
      expect(PERMISSION_MATRIX.admin[resource]).toBeDefined()
      expect(PERMISSION_MATRIX.manager[resource]).toBeDefined()
      expect(PERMISSION_MATRIX.staff[resource]).toBeDefined()
    })
  })

  it('should have all permission actions for each resource', () => {
    const actions: PermissionAction[] = ['create', 'read', 'update', 'delete', 'export']

    actions.forEach((action) => {
      expect(PERMISSION_MATRIX.admin.bookings![action]).toBeDefined()
      expect(PERMISSION_MATRIX.manager.bookings![action]).toBeDefined()
      expect(PERMISSION_MATRIX.staff.bookings![action]).toBeDefined()
    })
  })
})

// ============================================================================
// checkPermission TESTS
// ============================================================================

describe('checkPermission', () => {
  describe('Admin Permissions', () => {
    const role: UserRole = 'admin'

    it('should allow admin to perform all actions on bookings', () => {
      expect(checkPermission(role, 'create', 'bookings')).toBe(true)
      expect(checkPermission(role, 'read', 'bookings')).toBe(true)
      expect(checkPermission(role, 'update', 'bookings')).toBe(true)
      expect(checkPermission(role, 'delete', 'bookings')).toBe(true)
      expect(checkPermission(role, 'export', 'bookings')).toBe(true)
    })

    it('should allow admin to manage customers', () => {
      expect(checkPermission(role, 'create', 'customers')).toBe(true)
      expect(checkPermission(role, 'delete', 'customers')).toBe(true)
    })

    it('should allow admin to manage staff', () => {
      expect(checkPermission(role, 'create', 'staff')).toBe(true)
      expect(checkPermission(role, 'delete', 'staff')).toBe(true)
    })

    it('should allow admin to access settings', () => {
      expect(checkPermission(role, 'read', 'settings')).toBe(true)
      expect(checkPermission(role, 'update', 'settings')).toBe(true)
    })

    it('should allow admin to manage service packages', () => {
      expect(checkPermission(role, 'create', 'service_packages')).toBe(true)
      expect(checkPermission(role, 'update', 'service_packages')).toBe(true)
      expect(checkPermission(role, 'delete', 'service_packages')).toBe(true)
    })
  })

  describe('Manager Permissions', () => {
    const role: UserRole = 'manager'

    it('should allow manager to create and update bookings', () => {
      expect(checkPermission(role, 'create', 'bookings')).toBe(true)
      expect(checkPermission(role, 'read', 'bookings')).toBe(true)
      expect(checkPermission(role, 'update', 'bookings')).toBe(true)
    })

    it('should NOT allow manager to delete bookings', () => {
      expect(checkPermission(role, 'delete', 'bookings')).toBe(false)
    })

    it('should allow manager to export bookings', () => {
      expect(checkPermission(role, 'export', 'bookings')).toBe(true)
    })

    it('should allow manager to manage customers except delete', () => {
      expect(checkPermission(role, 'create', 'customers')).toBe(true)
      expect(checkPermission(role, 'read', 'customers')).toBe(true)
      expect(checkPermission(role, 'update', 'customers')).toBe(true)
      expect(checkPermission(role, 'delete', 'customers')).toBe(false)
    })

    it('should NOT allow manager to create/delete staff', () => {
      expect(checkPermission(role, 'create', 'staff')).toBe(false)
      expect(checkPermission(role, 'delete', 'staff')).toBe(false)
    })

    it('should allow manager to read and update staff', () => {
      expect(checkPermission(role, 'read', 'staff')).toBe(true)
      expect(checkPermission(role, 'update', 'staff')).toBe(true)
    })

    it('should NOT allow manager to access settings', () => {
      expect(checkPermission(role, 'read', 'settings')).toBe(false)
      expect(checkPermission(role, 'update', 'settings')).toBe(false)
    })

    it('should NOT allow manager to manage service packages', () => {
      expect(checkPermission(role, 'create', 'service_packages')).toBe(false)
      expect(checkPermission(role, 'update', 'service_packages')).toBe(false)
      expect(checkPermission(role, 'delete', 'service_packages')).toBe(false)
    })

    it('should allow manager to read service packages', () => {
      expect(checkPermission(role, 'read', 'service_packages')).toBe(true)
    })

    it('should allow manager to manage teams except delete', () => {
      expect(checkPermission(role, 'create', 'teams')).toBe(true)
      expect(checkPermission(role, 'update', 'teams')).toBe(true)
      expect(checkPermission(role, 'delete', 'teams')).toBe(false)
    })
  })

  describe('Staff Permissions', () => {
    const role: UserRole = 'staff'

    it('should NOT allow staff to create bookings', () => {
      expect(checkPermission(role, 'create', 'bookings')).toBe(false)
    })

    it('should allow staff to read bookings', () => {
      expect(checkPermission(role, 'read', 'bookings')).toBe(true)
    })

    it('should allow staff to update bookings (own only)', () => {
      expect(checkPermission(role, 'update', 'bookings')).toBe(true)
    })

    it('should NOT allow staff to delete bookings', () => {
      expect(checkPermission(role, 'delete', 'bookings')).toBe(false)
    })

    it('should NOT allow staff to export bookings', () => {
      expect(checkPermission(role, 'export', 'bookings')).toBe(false)
    })

    it('should NOT allow staff to create customers', () => {
      expect(checkPermission(role, 'create', 'customers')).toBe(false)
    })

    it('should allow staff to read customers', () => {
      expect(checkPermission(role, 'read', 'customers')).toBe(true)
    })

    it('should NOT allow staff to access reports', () => {
      expect(checkPermission(role, 'read', 'reports')).toBe(false)
    })

    it('should allow staff to update own profile', () => {
      expect(checkPermission(role, 'update', 'staff')).toBe(true)
    })
  })

  describe('Null/Undefined Role', () => {
    it('should deny all permissions for null role', () => {
      expect(checkPermission(null, 'read', 'bookings')).toBe(false)
      expect(checkPermission(null, 'create', 'bookings')).toBe(false)
      expect(checkPermission(null, 'delete', 'bookings')).toBe(false)
    })

    it('should deny all permissions for undefined role', () => {
      expect(checkPermission(undefined, 'read', 'bookings')).toBe(false)
      expect(checkPermission(undefined, 'create', 'bookings')).toBe(false)
    })
  })
})

// ============================================================================
// canDelete TESTS
// ============================================================================

describe('canDelete', () => {
  it('should allow admin to delete all resources', () => {
    expect(canDelete('admin', 'bookings')).toBe(true)
    expect(canDelete('admin', 'customers')).toBe(true)
    expect(canDelete('admin', 'staff')).toBe(true)
    expect(canDelete('admin', 'teams')).toBe(true)
    expect(canDelete('admin', 'service_packages')).toBe(true)
  })

  it('should NOT allow manager to delete any resources', () => {
    expect(canDelete('manager', 'bookings')).toBe(false)
    expect(canDelete('manager', 'customers')).toBe(false)
    expect(canDelete('manager', 'staff')).toBe(false)
    expect(canDelete('manager', 'teams')).toBe(false)
  })

  it('should NOT allow staff to delete any resources', () => {
    expect(canDelete('staff', 'bookings')).toBe(false)
    expect(canDelete('staff', 'customers')).toBe(false)
  })

  it('should return false for null role', () => {
    expect(canDelete(null, 'bookings')).toBe(false)
  })
})

// ============================================================================
// canAccessRoute TESTS
// ============================================================================

describe('canAccessRoute', () => {
  describe('Admin Routes', () => {
    it('should allow only admin to access admin routes', () => {
      expect(canAccessRoute('admin', '/admin')).toBe(true)
      expect(canAccessRoute('admin', '/admin/settings')).toBe(true)
      expect(canAccessRoute('manager', '/admin')).toBe(false)
      expect(canAccessRoute('staff', '/admin')).toBe(false)
    })
  })

  describe('Manager Routes', () => {
    it('should allow admin and manager to access manager routes', () => {
      expect(canAccessRoute('admin', '/manager')).toBe(true)
      expect(canAccessRoute('manager', '/manager')).toBe(true)
      expect(canAccessRoute('staff', '/manager')).toBe(false)
    })

    it('should allow admin and manager to access manager/bookings', () => {
      expect(canAccessRoute('admin', '/manager/bookings')).toBe(true)
      expect(canAccessRoute('manager', '/manager/bookings')).toBe(true)
      expect(canAccessRoute('staff', '/manager/bookings')).toBe(false)
    })
  })

  describe('Staff Routes', () => {
    it('should allow all roles to access staff routes', () => {
      expect(canAccessRoute('admin', '/staff')).toBe(true)
      expect(canAccessRoute('manager', '/staff')).toBe(true)
      expect(canAccessRoute('staff', '/staff')).toBe(true)
    })
  })

  describe('Public Routes', () => {
    it('should allow access to routes not in permissions map', () => {
      expect(canAccessRoute('admin', '/public-page')).toBe(true)
      expect(canAccessRoute('manager', '/some-other-route')).toBe(true)
      expect(canAccessRoute('staff', '/unknown')).toBe(true)
    })
  })

  describe('Null Role', () => {
    it('should deny access to protected routes for null role', () => {
      expect(canAccessRoute(null, '/admin')).toBe(false)
      expect(canAccessRoute(null, '/manager')).toBe(false)
      expect(canAccessRoute(null, '/staff')).toBe(false)
    })

    it('should deny access even to public routes for null role', () => {
      // Note: canAccessRoute returns false for null role regardless of route
      // This is intentional - unauthenticated users should not access any routes
      expect(canAccessRoute(null, '/public-page')).toBe(false)
    })
  })
})

// ============================================================================
// getPermissionsForRole TESTS
// ============================================================================

describe('getPermissionsForRole', () => {
  it('should return admin permissions', () => {
    const permissions = getPermissionsForRole('admin')
    expect(permissions.bookings).toBeDefined()
    expect(permissions.bookings?.delete).toBe(true)
  })

  it('should return manager permissions', () => {
    const permissions = getPermissionsForRole('manager')
    expect(permissions.bookings).toBeDefined()
    expect(permissions.bookings?.delete).toBe(false)
    expect(permissions.bookings?.create).toBe(true)
  })

  it('should return staff permissions', () => {
    const permissions = getPermissionsForRole('staff')
    expect(permissions.bookings).toBeDefined()
    expect(permissions.bookings?.create).toBe(false)
    expect(permissions.bookings?.read).toBe(true)
  })
})

// ============================================================================
// Role Check Functions TESTS
// ============================================================================

describe('Role Check Functions', () => {
  describe('isAdmin', () => {
    it('should return true for admin role', () => {
      expect(isAdmin('admin')).toBe(true)
    })

    it('should return false for non-admin roles', () => {
      expect(isAdmin('manager')).toBe(false)
      expect(isAdmin('staff')).toBe(false)
      expect(isAdmin(null)).toBe(false)
      expect(isAdmin(undefined)).toBe(false)
    })
  })

  describe('isManagerOrAdmin', () => {
    it('should return true for admin', () => {
      expect(isManagerOrAdmin('admin')).toBe(true)
    })

    it('should return true for manager', () => {
      expect(isManagerOrAdmin('manager')).toBe(true)
    })

    it('should return false for staff', () => {
      expect(isManagerOrAdmin('staff')).toBe(false)
    })

    it('should return false for null/undefined', () => {
      expect(isManagerOrAdmin(null)).toBe(false)
      expect(isManagerOrAdmin(undefined)).toBe(false)
    })
  })

  describe('isStaff', () => {
    it('should return true for staff role', () => {
      expect(isStaff('staff')).toBe(true)
    })

    it('should return false for non-staff roles', () => {
      expect(isStaff('admin')).toBe(false)
      expect(isStaff('manager')).toBe(false)
      expect(isStaff(null)).toBe(false)
    })
  })
})

// ============================================================================
// Soft Delete Functions TESTS
// ============================================================================

describe('Soft Delete Functions', () => {
  describe('supportsSoftDelete', () => {
    it('should return true for resources that support soft delete', () => {
      expect(supportsSoftDelete('bookings')).toBe(true)
      expect(supportsSoftDelete('customers')).toBe(true)
      expect(supportsSoftDelete('teams')).toBe(true)
      expect(supportsSoftDelete('service_packages')).toBe(true)
    })

    it('should return false for resources that do not support soft delete', () => {
      expect(supportsSoftDelete('settings')).toBe(false)
      expect(supportsSoftDelete('reports')).toBe(false)
    })
  })

  describe('canSoftDelete', () => {
    it('should allow admin to soft delete', () => {
      expect(canSoftDelete('admin', 'bookings')).toBe(true)
      expect(canSoftDelete('admin', 'customers')).toBe(true)
    })

    it('should allow manager to soft delete', () => {
      expect(canSoftDelete('manager', 'bookings')).toBe(true)
      expect(canSoftDelete('manager', 'customers')).toBe(true)
    })

    it('should NOT allow staff to soft delete', () => {
      expect(canSoftDelete('staff', 'bookings')).toBe(false)
      expect(canSoftDelete('staff', 'customers')).toBe(false)
    })

    it('should return false for resources that do not support soft delete', () => {
      expect(canSoftDelete('admin', 'settings')).toBe(false)
      expect(canSoftDelete('manager', 'reports')).toBe(false)
    })

    it('should return false for null role', () => {
      expect(canSoftDelete(null, 'bookings')).toBe(false)
    })
  })

  describe('canRestore', () => {
    it('should allow admin to restore', () => {
      expect(canRestore('admin')).toBe(true)
    })

    it('should allow manager to restore', () => {
      expect(canRestore('manager')).toBe(true)
    })

    it('should NOT allow staff to restore', () => {
      expect(canRestore('staff')).toBe(false)
    })

    it('should return false for null role', () => {
      expect(canRestore(null)).toBe(false)
    })
  })

  describe('canPermanentlyDelete', () => {
    it('should allow only admin to permanently delete', () => {
      expect(canPermanentlyDelete('admin')).toBe(true)
      expect(canPermanentlyDelete('manager')).toBe(false)
      expect(canPermanentlyDelete('staff')).toBe(false)
      expect(canPermanentlyDelete(null)).toBe(false)
    })
  })
})

// ============================================================================
// Feature Flags TESTS
// ============================================================================

describe('Feature Flags', () => {
  describe('hasFeature', () => {
    it('should allow admin to access admin-only features', () => {
      expect(hasFeature('admin', 'view_financial_reports')).toBe(true)
      expect(hasFeature('admin', 'manage_user_roles')).toBe(true)
      expect(hasFeature('admin', 'manage_settings')).toBe(true)
      expect(hasFeature('admin', 'create_staff')).toBe(true)
      expect(hasFeature('admin', 'delete_records')).toBe(true)
    })

    it('should NOT allow manager to access admin-only features', () => {
      expect(hasFeature('manager', 'manage_user_roles')).toBe(false)
      expect(hasFeature('manager', 'manage_settings')).toBe(false)
      expect(hasFeature('manager', 'create_staff')).toBe(false)
      expect(hasFeature('manager', 'delete_records')).toBe(false)
    })

    it('should allow both admin and manager to export data', () => {
      expect(hasFeature('admin', 'export_data')).toBe(true)
      expect(hasFeature('manager', 'export_data')).toBe(true)
      expect(hasFeature('staff', 'export_data')).toBe(false)
    })

    it('should allow both admin and manager to view all data', () => {
      expect(hasFeature('admin', 'view_all_data')).toBe(true)
      expect(hasFeature('manager', 'view_all_data')).toBe(true)
      expect(hasFeature('staff', 'view_all_data')).toBe(false)
    })

    it('should allow both admin and manager to manage teams', () => {
      expect(hasFeature('admin', 'manage_teams')).toBe(true)
      expect(hasFeature('manager', 'manage_teams')).toBe(true)
      expect(hasFeature('staff', 'manage_teams')).toBe(false)
    })

    it('should return false for unknown features', () => {
      expect(hasFeature('admin', 'unknown_feature' as keyof typeof FEATURE_FLAGS)).toBe(false)
    })

    it('should return false for null role', () => {
      expect(hasFeature(null, 'export_data')).toBe(false)
    })
  })
})

// ============================================================================
// Constants Validation TESTS
// ============================================================================

describe('Constants Validation', () => {
  it('should have consistent route permissions', () => {
    Object.keys(ROUTE_PERMISSIONS).forEach((route) => {
      const allowedRoles = ROUTE_PERMISSIONS[route]
      expect(Array.isArray(allowedRoles)).toBe(true)
      expect(allowedRoles.length).toBeGreaterThan(0)
    })
  })

  it('should have all soft delete resources in array', () => {
    expect(SOFT_DELETE_RESOURCES).toContain('bookings')
    expect(SOFT_DELETE_RESOURCES).toContain('customers')
    expect(SOFT_DELETE_RESOURCES).toContain('teams')
    expect(SOFT_DELETE_RESOURCES).toContain('service_packages')
  })

  it('should have feature flags for all key features', () => {
    expect(FEATURE_FLAGS.view_financial_reports).toBeDefined()
    expect(FEATURE_FLAGS.manage_user_roles).toBeDefined()
    expect(FEATURE_FLAGS.export_data).toBeDefined()
    expect(FEATURE_FLAGS.delete_records).toBeDefined()
  })
})
