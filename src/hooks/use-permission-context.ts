/**
 * Permission Context Hooks
 *
 * Convenience hooks for accessing permission context
 */

import { useContext } from 'react'
import { PermissionContext } from '@/contexts/permission-context'
import type { PermissionAction, PermissionResource, PermissionContextType } from '@/contexts/permission-context'

/**
 * Hook to access permission context
 *
 * @returns Permission context
 * @throws Error if used outside PermissionProvider
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   const { can, isAdmin } = usePermissionContext()
 *
 *   return (
 *     <>
 *       {can('create', 'bookings') && <CreateButton />}
 *       {isAdmin && <AdminPanel />}
 *     </>
 *   )
 * }
 * ```
 */
export function usePermissionContext(): PermissionContextType {
  const context = useContext(PermissionContext)

  if (context === undefined) {
    throw new Error('usePermissionContext must be used within a PermissionProvider')
  }

  return context
}

// ============================================================================
// CONVENIENCE HOOKS (using context)
// ============================================================================

/**
 * Hook to check specific permission using context
 *
 * @param action - Action to check
 * @param resource - Resource to check
 * @returns True if permission granted
 */
export function useContextPermission(
  action: PermissionAction,
  resource: PermissionResource
): boolean {
  const { can } = usePermissionContext()
  return can(action, resource)
}

/**
 * Hook to check if user is admin using context
 */
export function useContextIsAdmin(): boolean {
  const { isAdmin } = usePermissionContext()
  return isAdmin
}

/**
 * Hook to check if user is manager or admin using context
 */
export function useContextIsManagerOrAdmin(): boolean {
  const { isManagerOrAdmin } = usePermissionContext()
  return isManagerOrAdmin
}

/**
 * Hook to check if user can delete using context
 */
export function useContextCanDelete(resource: PermissionResource): boolean {
  const { canDelete } = usePermissionContext()
  return canDelete(resource)
}

/**
 * Hook to check if user can soft delete using context
 */
export function useContextCanSoftDelete(resource: PermissionResource): boolean {
  const { canSoftDelete } = usePermissionContext()
  return canSoftDelete(resource)
}
