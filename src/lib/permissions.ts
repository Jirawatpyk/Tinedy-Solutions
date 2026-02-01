/**
 * Permission System
 *
 * Centralized permission checking utilities and constants
 * for role-based access control (RBAC)
 */

import { UserRole, type PermissionAction, type PermissionResource, type PermissionMap } from '@/types/common'

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
  [UserRole.Admin]: {
    bookings: { create: true, read: true, update: true, delete: true, export: true },
    customers: { create: true, read: true, update: true, delete: true, export: true },
    staff: { create: true, read: true, update: true, delete: true, export: true },
    teams: { create: true, read: true, update: true, delete: true, export: true },
    reports: { create: false, read: true, update: false, delete: false, export: true },
    settings: { create: false, read: true, update: true, delete: false, export: false },
    users: { create: true, read: true, update: true, delete: true, export: false },
    service_packages: { create: true, read: true, update: true, delete: true, export: true },
  },
  [UserRole.Manager]: {
    bookings: { create: true, read: true, update: true, delete: false, export: true },
    customers: { create: true, read: true, update: true, delete: false, export: true },
    staff: { create: false, read: true, update: true, delete: false, export: false },
    teams: { create: true, read: true, update: true, delete: false, export: false },
    reports: { create: false, read: true, update: false, delete: false, export: true },
    settings: { create: false, read: false, update: false, delete: false, export: false },
    users: { create: false, read: false, update: false, delete: false, export: false },
    service_packages: { create: false, read: true, update: false, delete: false, export: false },
  },
  [UserRole.Staff]: {
    bookings: { create: false, read: true, update: true, delete: false, export: false },
    customers: { create: false, read: true, update: false, delete: false, export: false },
    staff: { create: false, read: true, update: true, delete: false, export: false }, // Own profile only
    teams: { create: false, read: true, update: false, delete: false, export: false },
    reports: { create: false, read: false, update: false, delete: false, export: false },
    settings: { create: false, read: false, update: false, delete: false, export: false },
    users: { create: false, read: false, update: false, delete: false, export: false },
    service_packages: { create: false, read: true, update: false, delete: false, export: false },
  },
  [UserRole.Customer]: {
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
  '/admin': [UserRole.Admin, UserRole.Manager],
  '/admin/bookings': [UserRole.Admin, UserRole.Manager],
  '/admin/customers': [UserRole.Admin, UserRole.Manager],
  '/admin/staff': [UserRole.Admin, UserRole.Manager],
  '/admin/teams': [UserRole.Admin, UserRole.Manager],
  '/admin/reports': [UserRole.Admin, UserRole.Manager],
  '/admin/calendar': [UserRole.Admin, UserRole.Manager],
  '/admin/weekly-schedule': [UserRole.Admin, UserRole.Manager],
  '/admin/chat': [UserRole.Admin, UserRole.Manager],
  '/admin/packages': [UserRole.Admin, UserRole.Manager],
  '/admin/settings': [UserRole.Admin],
  '/admin/profile': [UserRole.Admin, UserRole.Manager],

  // Staff routes
  '/staff': [UserRole.Admin, UserRole.Manager, UserRole.Staff],
  '/staff/calendar': [UserRole.Admin, UserRole.Manager, UserRole.Staff],
  '/staff/chat': [UserRole.Admin, UserRole.Manager, UserRole.Staff],
  '/staff/profile': [UserRole.Admin, UserRole.Manager, UserRole.Staff],
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
  return role === UserRole.Admin
}

/**
 * Check if a role is manager or admin
 *
 * @param role - User's role
 * @returns True if role is manager or admin
 */
export function isManagerOrAdmin(role: UserRole | undefined | null): boolean {
  return role === UserRole.Admin || role === UserRole.Manager
}

/**
 * Check if a role is staff
 *
 * @param role - User's role
 * @returns True if role is staff
 */
export function isStaff(role: UserRole | undefined | null): boolean {
  return role === UserRole.Staff
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
  return role === UserRole.Admin || role === UserRole.Manager
}

/**
 * Check if a role can restore soft deleted items
 *
 * @param role - User's role
 * @returns True if restore permission granted
 */
export function canRestore(role: UserRole | undefined | null): boolean {
  if (!role) return false
  return role === UserRole.Admin || role === UserRole.Manager
}

/**
 * Check if a role can permanently delete
 * Only admin can permanently delete
 *
 * @param role - User's role
 * @returns True if permanent delete permission granted
 */
export function canPermanentlyDelete(role: UserRole | undefined | null): boolean {
  return role === UserRole.Admin
}

// ============================================================================
// FEATURE FLAGS
// ============================================================================

/**
 * Check if a role can access a specific feature
 * Used for feature gating
 */
export const FEATURE_FLAGS: Record<string, UserRole[]> = {
  view_financial_reports: [UserRole.Admin],
  manage_user_roles: [UserRole.Admin],
  view_audit_logs: [UserRole.Admin],
  export_data: [UserRole.Admin, UserRole.Manager],
  manage_settings: [UserRole.Admin],
  create_staff: [UserRole.Admin],
  delete_records: [UserRole.Admin],
  view_all_data: [UserRole.Admin, UserRole.Manager],
  manage_teams: [UserRole.Admin, UserRole.Manager],
  assign_staff: [UserRole.Admin, UserRole.Manager],
  view_archived: [UserRole.Admin], // Only admin can view archived/soft-deleted records
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
