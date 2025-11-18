/**
 * usePermissions Hook
 *
 * React hook for checking user permissions based on their role.
 * Provides convenient methods to check permissions in components.
 *
 * @example
 * ```tsx
 * function BookingActions() {
 *   const { can, canDelete, canSoftDelete, isAdmin } = usePermissions()
 *
 *   return (
 *     <>
 *       {can('update', 'bookings') && <EditButton />}
 *       {canDelete('bookings') && <DeleteButton />}
 *       {canSoftDelete('bookings') && <CancelButton />}
 *       {isAdmin && <AdminPanel />}
 *     </>
 *   )
 * }
 * ```
 */

import { useAuth } from '@/contexts/auth-context'
import {
  checkPermission,
  canDelete as canDeleteResource,
  canAccessRoute as canAccessRouteUtil,
  canSoftDelete as canSoftDeleteResource,
  canRestore as canRestoreResource,
  canPermanentlyDelete as canPermanentlyDeleteResource,
  isAdmin as isAdminRole,
  isManagerOrAdmin as isManagerOrAdminRole,
  isStaff as isStaffRole,
  hasFeature as hasFeatureFlag,
  getPermissionsForRole,
} from '@/lib/permissions'
import type { PermissionAction, PermissionResource, PermissionMap } from '@/types/common'

export interface UsePermissionsReturn {
  /**
   * Check if current user has permission to perform an action on a resource
   *
   * @param action - Action to check (create, read, update, delete, export)
   * @param resource - Resource to check
   * @returns True if permission granted
   *
   * @example
   * can('create', 'bookings') // Check if user can create bookings
   * can('delete', 'customers') // Check if user can delete customers
   */
  can: (action: PermissionAction, resource: PermissionResource) => boolean

  /**
   * Check if current user can hard delete a resource
   * Only admin can hard delete
   *
   * @param resource - Resource to check
   * @returns True if delete permission granted
   */
  canDelete: (resource: PermissionResource) => boolean

  /**
   * Check if current user can soft delete (cancel/archive) a resource
   * Admin and Manager can soft delete
   *
   * @param resource - Resource to check
   * @returns True if soft delete permission granted
   */
  canSoftDelete: (resource: PermissionResource) => boolean

  /**
   * Check if current user can restore soft deleted items
   * Admin and Manager can restore
   *
   * @returns True if restore permission granted
   */
  canRestore: () => boolean

  /**
   * Check if current user can permanently delete items
   * Only admin can permanently delete
   *
   * @returns True if permanent delete permission granted
   */
  canPermanentlyDelete: () => boolean

  /**
   * Check if current user can access a specific route
   *
   * @param route - Route path to check
   * @returns True if route access granted
   */
  canAccessRoute: (route: string) => boolean

  /**
   * Check if current user has access to a feature flag
   *
   * @param feature - Feature flag name
   * @returns True if feature access granted
   */
  hasFeature: (feature: string) => boolean

  /**
   * Check if current user is admin
   */
  isAdmin: boolean

  /**
   * Check if current user is manager or admin
   */
  isManagerOrAdmin: boolean

  /**
   * Check if current user is staff
   */
  isStaff: boolean

  /**
   * Current user's role
   */
  role: 'admin' | 'manager' | 'staff' | null

  /**
   * Get all permissions for current user's role
   */
  permissions: Partial<PermissionMap>

  /**
   * Loading state from auth context
   */
  loading: boolean
}

/**
 * Hook to check user permissions
 *
 * @returns Permission checking utilities
 */
export function usePermissions(): UsePermissionsReturn {
  const { profile, loading } = useAuth()
  const role = profile?.role ?? null

  // Get all permissions for the role
  const permissions = role ? getPermissionsForRole(role) : {}

  // Permission checking function
  const can = (action: PermissionAction, resource: PermissionResource): boolean => {
    return checkPermission(role, action, resource)
  }

  // Delete permission (hard delete)
  const canDelete = (resource: PermissionResource): boolean => {
    return canDeleteResource(role, resource)
  }

  // Soft delete permission
  const canSoftDelete = (resource: PermissionResource): boolean => {
    return canSoftDeleteResource(role, resource)
  }

  // Restore permission
  const canRestore = (): boolean => {
    return canRestoreResource(role)
  }

  // Permanent delete permission
  const canPermanentlyDelete = (): boolean => {
    return canPermanentlyDeleteResource(role)
  }

  // Route access permission
  const canAccessRoute = (route: string): boolean => {
    return canAccessRouteUtil(role, route)
  }

  // Feature flag check
  const hasFeature = (feature: string): boolean => {
    return hasFeatureFlag(role, feature as unknown as never)
  }

  // Role checks
  const isAdmin = isAdminRole(role)
  const isManagerOrAdmin = isManagerOrAdminRole(role)
  const isStaff = isStaffRole(role)

  return {
    can,
    canDelete,
    canSoftDelete,
    canRestore,
    canPermanentlyDelete,
    canAccessRoute,
    hasFeature,
    isAdmin,
    isManagerOrAdmin,
    isStaff,
    role,
    permissions,
    loading,
  }
}

/**
 * Hook to check specific permission
 * Convenience hook for when you only need to check one permission
 *
 * @param action - Action to check
 * @param resource - Resource to check
 * @returns True if permission granted
 *
 * @example
 * ```tsx
 * function CreateBookingButton() {
 *   const canCreate = usePermission('create', 'bookings')
 *
 *   if (!canCreate) return null
 *
 *   return <Button>Create Booking</Button>
 * }
 * ```
 */
export function usePermission(
  action: PermissionAction,
  resource: PermissionResource
): boolean {
  const { can } = usePermissions()
  return can(action, resource)
}

/**
 * Hook to check if user is admin
 * Convenience hook for admin-only components
 *
 * @returns True if user is admin
 *
 * @example
 * ```tsx
 * function AdminSettings() {
 *   const isAdmin = useIsAdmin()
 *
 *   if (!isAdmin) return <Navigate to="/unauthorized" />
 *
 *   return <SettingsPanel />
 * }
 * ```
 */
export function useIsAdmin(): boolean {
  const { isAdmin } = usePermissions()
  return isAdmin
}

/**
 * Hook to check if user is manager or admin
 * Convenience hook for manager/admin components
 *
 * @returns True if user is manager or admin
 */
export function useIsManagerOrAdmin(): boolean {
  const { isManagerOrAdmin } = usePermissions()
  return isManagerOrAdmin
}

/**
 * Hook to check if user can delete a resource
 * Convenience hook for delete buttons
 *
 * @param resource - Resource to check
 * @returns True if delete permission granted
 *
 * @example
 * ```tsx
 * function DeleteBookingButton({ bookingId }: { bookingId: string }) {
 *   const canDeleteBooking = useCanDelete('bookings')
 *
 *   if (!canDeleteBooking) return null
 *
 *   return (
 *     <Button variant="destructive" onClick={() => handleDelete(bookingId)}>
 *       Delete
 *     </Button>
 *   )
 * }
 * ```
 */
export function useCanDelete(resource: PermissionResource): boolean {
  const { canDelete } = usePermissions()
  return canDelete(resource)
}

/**
 * Hook to check if user can soft delete a resource
 * Convenience hook for cancel/archive buttons
 *
 * @param resource - Resource to check
 * @returns True if soft delete permission granted
 */
export function useCanSoftDelete(resource: PermissionResource): boolean {
  const { canSoftDelete } = usePermissions()
  return canSoftDelete(resource)
}
