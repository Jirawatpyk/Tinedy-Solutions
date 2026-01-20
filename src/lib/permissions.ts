/**
 * Permission System
 *
 * Centralized permission checking utilities and constants
 * for role-based access control (RBAC)
 */

import type { UserRole, PermissionAction, PermissionResource, PermissionMap } from '@/types/common'

// ============================================================================
// PERMISSION MATRIX
// ============================================================================

/**
 * Complete permission matrix for all roles and resources
 *
 * This defines what each role can do with each resource.
 * Keep this in sync with database role_permissions table.
 */
export const PERMISSION_MATRIX: Record<UserRole, Partial<PermissionMap>> = {
  admin: {
    bookings: { create: true, read: true, update: true, delete: true, export: true },
    customers: { create: true, read: true, update: true, delete: true, export: true },
    staff: { create: true, read: true, update: true, delete: true, export: true },
    teams: { create: true, read: true, update: true, delete: true, export: true },
    reports: { create: false, read: true, update: false, delete: false, export: true },
    settings: { create: false, read: true, update: true, delete: false, export: false },
    users: { create: true, read: true, update: true, delete: true, export: false },
    service_packages: { create: true, read: true, update: true, delete: true, export: true },
  },
  manager: {
    bookings: { create: true, read: true, update: true, delete: false, export: true },
    customers: { create: true, read: true, update: true, delete: false, export: true },
    staff: { create: false, read: true, update: true, delete: false, export: false },
    teams: { create: true, read: true, update: true, delete: false, export: false },
    reports: { create: false, read: true, update: false, delete: false, export: true },
    settings: { create: false, read: false, update: false, delete: false, export: false },
    users: { create: false, read: false, update: false, delete: false, export: false },
    service_packages: { create: true, read: true, update: true, delete: false, export: false },
  },
  staff: {
    bookings: { create: false, read: true, update: true, delete: false, export: false },
    customers: { create: false, read: true, update: false, delete: false, export: false },
    staff: { create: false, read: true, update: true, delete: false, export: false }, // Own profile only
    teams: { create: false, read: true, update: false, delete: false, export: false },
    reports: { create: false, read: false, update: false, delete: false, export: false },
    settings: { create: false, read: false, update: false, delete: false, export: false },
    users: { create: false, read: false, update: false, delete: false, export: false },
    service_packages: { create: false, read: true, update: false, delete: false, export: false },
  },
  customer: {
    // Customer portal not yet implemented
    bookings: { create: false, read: true, update: false, delete: false, export: false },
    customers: { create: false, read: true, update: true, delete: false, export: false }, // Own profile
    staff: { create: false, read: false, update: false, delete: false, export: false },
    teams: { create: false, read: false, update: false, delete: false, export: false },
    reports: { create: false, read: false, update: false, delete: false, export: false },
    settings: { create: false, read: false, update: false, delete: false, export: false },
    users: { create: false, read: false, update: false, delete: false, export: false },
    service_packages: { create: false, read: true, update: false, delete: false, export: false },
  },
}

// ============================================================================
// ROUTE PERMISSIONS
// ============================================================================

/**
 * Map of routes to required roles
 * Used for route protection and navigation
 */
export const ROUTE_PERMISSIONS: Record<string, UserRole[]> = {
  // Admin routes (shared with manager - both use /admin paths)
  '/admin': ['admin', 'manager'],
  '/admin/bookings': ['admin', 'manager'],
  '/admin/customers': ['admin', 'manager'],
  '/admin/staff': ['admin', 'manager'],
  '/admin/teams': ['admin', 'manager'],
  '/admin/reports': ['admin', 'manager'],
  '/admin/calendar': ['admin', 'manager'],
  '/admin/weekly-schedule': ['admin', 'manager'],
  '/admin/chat': ['admin', 'manager'],
  '/admin/packages': ['admin', 'manager'],
  '/admin/settings': ['admin'],
  '/admin/profile': ['admin', 'manager'],

  // Staff routes
  '/staff': ['admin', 'manager', 'staff'],
  '/staff/calendar': ['admin', 'manager', 'staff'],
  '/staff/chat': ['admin', 'manager', 'staff'],
  '/staff/profile': ['admin', 'manager', 'staff'],
}

// ============================================================================
// PERMISSION CHECKING FUNCTIONS
// ============================================================================

/**
 * Check if a role has permission to perform an action on a resource
 *
 * @param role - User's role
 * @param action - Action to perform (create, read, update, delete, export)
 * @param resource - Resource to access
 * @returns True if permission granted, false otherwise
 *
 * @example
 * checkPermission('manager', 'delete', 'bookings') // false
 * checkPermission('admin', 'delete', 'bookings')   // true
 * checkPermission('manager', 'update', 'bookings') // true
 */
export function checkPermission(
  role: UserRole | undefined | null,
  action: PermissionAction,
  resource: PermissionResource
): boolean {
  if (!role) return false

  const rolePermissions = PERMISSION_MATRIX[role]
  const resourcePermissions = rolePermissions[resource]

  if (!resourcePermissions) return false

  return resourcePermissions[action] ?? false
}

/**
 * Check if a role can delete a specific resource
 * Shorthand for checkPermission(role, 'delete', resource)
 *
 * @param role - User's role
 * @param resource - Resource to delete
 * @returns True if delete permission granted
 */
export function canDelete(
  role: UserRole | undefined | null,
  resource: PermissionResource
): boolean {
  return checkPermission(role, 'delete', resource)
}

/**
 * Check if a role can access a specific route
 *
 * @param role - User's role
 * @param route - Route path to check
 * @returns True if route access granted
 */
export function canAccessRoute(
  role: UserRole | undefined | null,
  route: string
): boolean {
  if (!role) return false

  const allowedRoles = ROUTE_PERMISSIONS[route]
  if (!allowedRoles) {
    // If route not in permissions map, allow (public route)
    return true
  }

  return allowedRoles.includes(role)
}

/**
 * Get all permissions for a specific role
 *
 * @param role - User's role
 * @returns Permission map for the role
 */
export function getPermissionsForRole(
  role: UserRole
): Partial<PermissionMap> {
  return PERMISSION_MATRIX[role] || {}
}

/**
 * Check if a role is admin
 *
 * @param role - User's role
 * @returns True if role is admin
 */
export function isAdmin(role: UserRole | undefined | null): boolean {
  return role === 'admin'
}

/**
 * Check if a role is manager or admin
 *
 * @param role - User's role
 * @returns True if role is manager or admin
 */
export function isManagerOrAdmin(role: UserRole | undefined | null): boolean {
  return role === 'admin' || role === 'manager'
}

/**
 * Check if a role is staff
 *
 * @param role - User's role
 * @returns True if role is staff
 */
export function isStaff(role: UserRole | undefined | null): boolean {
  return role === 'staff'
}

// ============================================================================
// SOFT DELETE PERMISSIONS
// ============================================================================

/**
 * Resources that support soft delete
 */
export const SOFT_DELETE_RESOURCES: PermissionResource[] = [
  'bookings',
  'customers',
  'teams',
  'service_packages',
]

/**
 * Check if a resource supports soft delete
 *
 * @param resource - Resource to check
 * @returns True if soft delete is supported
 */
export function supportsSoftDelete(resource: PermissionResource): boolean {
  return SOFT_DELETE_RESOURCES.includes(resource)
}

/**
 * Check if a role can soft delete (cancel/archive)
 * Managers can soft delete, staff cannot
 *
 * @param role - User's role
 * @param resource - Resource to soft delete
 * @returns True if soft delete permission granted
 */
export function canSoftDelete(
  role: UserRole | undefined | null,
  resource: PermissionResource
): boolean {
  if (!role) return false
  if (!supportsSoftDelete(resource)) return false

  // Admin and Manager can soft delete
  return role === 'admin' || role === 'manager'
}

/**
 * Check if a role can restore soft deleted items
 *
 * @param role - User's role
 * @returns True if restore permission granted
 */
export function canRestore(role: UserRole | undefined | null): boolean {
  if (!role) return false
  return role === 'admin' || role === 'manager'
}

/**
 * Check if a role can permanently delete
 * Only admin can permanently delete
 *
 * @param role - User's role
 * @returns True if permanent delete permission granted
 */
export function canPermanentlyDelete(role: UserRole | undefined | null): boolean {
  return role === 'admin'
}

// ============================================================================
// FEATURE FLAGS
// ============================================================================

/**
 * Check if a role can access a specific feature
 * Used for feature gating
 */
export const FEATURE_FLAGS: Record<string, UserRole[]> = {
  view_financial_reports: ['admin'],
  manage_user_roles: ['admin'],
  view_audit_logs: ['admin'],
  export_data: ['admin', 'manager'],
  manage_settings: ['admin'],
  create_staff: ['admin'],
  delete_records: ['admin'],
  view_all_data: ['admin', 'manager'],
  manage_teams: ['admin', 'manager'],
  assign_staff: ['admin', 'manager'],
  view_archived: ['admin'], // Only admin can view archived/soft-deleted records
}

/**
 * Check if a role has access to a feature
 *
 * @param role - User's role
 * @param feature - Feature flag name
 * @returns True if feature access granted
 */
export function hasFeature(
  role: UserRole | undefined | null,
  feature: keyof typeof FEATURE_FLAGS
): boolean {
  if (!role) return false

  const allowedRoles = FEATURE_FLAGS[feature]
  if (!allowedRoles) return false

  return allowedRoles.includes(role)
}
