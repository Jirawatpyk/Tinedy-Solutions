/**
 * Permission Provider Component
 *
 * Wraps the application to provide permission checking throughout the component tree.
 * Caches permission calculations for better performance.
 */

import React, { useMemo } from 'react'
import { useAuth } from './auth-context'
import {
  checkPermission,
  canDelete as canDeleteResource,
  canSoftDelete as canSoftDeleteResource,
  canRestore as canRestoreResource,
  canPermanentlyDelete as canPermanentlyDeleteResource,
  isAdmin as isAdminRole,
  isManagerOrAdmin as isManagerOrAdminRole,
  isStaff as isStaffRole,
  getPermissionsForRole,
} from '@/lib/permissions'
import { PermissionContext } from './permission-context'
import type { PermissionContextType, PermissionAction, PermissionResource } from './permission-context'

interface PermissionProviderProps {
  children: React.ReactNode
}

/**
 * Permission Provider Component
 *
 * Wraps the application to provide permission checking throughout the component tree.
 * Caches permission calculations for better performance.
 *
 * @example
 * ```tsx
 * function App() {
 *   return (
 *     <AuthProvider>
 *       <PermissionProvider>
 *         <YourApp />
 *       </PermissionProvider>
 *     </AuthProvider>
 *   )
 * }
 * ```
 */
export function PermissionProvider({ children }: PermissionProviderProps) {
  const { profile, loading } = useAuth()
  const role = profile?.role ?? null

  // Memoize all permission checking functions to avoid recalculating on every render
  const value = useMemo<PermissionContextType>(() => {
    // Get all permissions for the role (cached)
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

    // Role checks (cached)
    const isAdmin = isAdminRole(role)
    const isManagerOrAdmin = isManagerOrAdminRole(role)
    const isStaff = isStaffRole(role)

    return {
      can,
      canDelete,
      canSoftDelete,
      canRestore,
      canPermanentlyDelete,
      isAdmin,
      isManagerOrAdmin,
      isStaff,
      role,
      permissions,
      loading,
    }
  }, [role, loading])

  return <PermissionContext.Provider value={value}>{children}</PermissionContext.Provider>
}
