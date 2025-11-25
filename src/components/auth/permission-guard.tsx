/**
 * PermissionGuard Component
 *
 * Declarative permission wrapper สำหรับ UI elements และ routes
 * รองรับ permission checking แบบละเอียด, feature flags, และ role-based access
 *
 * Features:
 * - ✅ Type-safe with TypeScript
 * - ✅ Multiple permission modes (action-based, role-based, feature-based, route-based)
 * - ✅ Customizable fallback UI
 * - ✅ Loading state handling
 * - ✅ Performance optimized (React.memo)
 * - ✅ Accessibility support
 * - ✅ Error boundary integration
 *
 * @example
 * ```tsx
 * // Basic role-based guard
 * <AdminOnly>
 *   <DeleteButton />
 * </AdminOnly>
 *
 * // Action-based permission
 * <PermissionGuard requires={{ mode: 'action', action: 'create', resource: 'bookings' }}>
 *   <CreateBookingButton />
 * </PermissionGuard>
 *
 * // Multiple permissions (OR logic)
 * <PermissionGuard requires={[
 *   { mode: 'role', roles: ['admin'] },
 *   { mode: 'role', roles: ['manager'] }
 * ]}>
 *   <AdminFeature />
 * </PermissionGuard>
 * ```
 */

import { memo, type ReactNode } from 'react'
import { usePermissions } from '@/hooks/use-permissions'
import type { PermissionAction, PermissionResource, UserRole } from '@/types/common'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { ShieldAlert } from 'lucide-react'
import { logger } from '@/lib/logger'

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

/**
 * Permission check mode
 */
export type PermissionMode =
  | 'action'      // Check specific action on resource
  | 'role'        // Check user role
  | 'feature'     // Check feature flag
  | 'route'       // Check route access
  | 'delete'      // Check delete permission
  | 'softDelete'  // Check soft delete permission
  | 'custom'      // Custom check function

/**
 * Permission check configuration
 */
export interface PermissionCheck {
  /** Permission check mode */
  mode: PermissionMode

  // For 'action' mode
  /** Action to check (e.g., 'create', 'read', 'update', 'delete') */
  action?: PermissionAction
  /** Resource to check (e.g., 'bookings', 'customers', 'teams') */
  resource?: PermissionResource

  // For 'role' mode
  /** Required roles (OR logic by default) */
  roles?: UserRole[]
  /** Require all roles (AND logic) vs any role (OR logic). Default: false */
  requireAll?: boolean

  // For 'feature' mode
  /** Feature flag name */
  feature?: string

  // For 'route' mode
  /** Route path to check */
  route?: string

  // For 'custom' mode
  /** Custom check function */
  check?: (permissions: ReturnType<typeof usePermissions>) => boolean
}

/**
 * Fallback type
 */
export type FallbackType = ReactNode | 'hidden' | 'message' | 'alert'

/**
 * PermissionGuard props
 */
export interface PermissionGuardProps {
  /**
   * Children to render when permission is granted
   */
  children: ReactNode

  /**
   * Permission check configuration
   * Can be single check or array of checks (treated as OR by default)
   */
  requires: PermissionCheck | PermissionCheck[]

  /**
   * Combine multiple checks with AND logic
   * @default false (OR logic)
   */
  requireAll?: boolean

  /**
   * Fallback UI when permission denied
   * - ReactNode: Custom UI
   * - 'hidden': Render nothing (default)
   * - 'message': Show default message
   * - 'alert': Show alert component
   * @default 'hidden'
   */
  fallback?: FallbackType

  /**
   * Custom message for fallback
   */
  fallbackMessage?: string

  /**
   * Render while loading permissions
   */
  loadingFallback?: ReactNode

  /**
   * Accessibility label for fallback
   */
  ariaLabel?: string

  /**
   * Additional CSS classes
   */
  className?: string
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Check single permission
 */
function checkPermission(
  check: PermissionCheck,
  permissions: ReturnType<typeof usePermissions>
): boolean {
  switch (check.mode) {
    case 'action':
      if (!check.action || !check.resource) {
        if (process.env.NODE_ENV === 'development') {
          logger.error('[PermissionGuard] Missing action or resource for action mode', check)
        }
        return false
      }
      return permissions.can(check.action, check.resource)

    case 'role':
      if (!check.roles || check.roles.length === 0) {
        if (process.env.NODE_ENV === 'development') {
          logger.error('[PermissionGuard] Missing roles for role mode', check)
        }
        return false
      }
      if (!permissions.role) {
        return false
      }
      if (check.requireAll) {
        // AND logic: user must have ALL specified roles (edge case, rarely used)
        return check.roles.every(role => permissions.role === role)
      } else {
        // OR logic: user must have ANY of the specified roles
        return check.roles.includes(permissions.role)
      }

    case 'feature':
      if (!check.feature) {
        if (process.env.NODE_ENV === 'development') {
          logger.error('[PermissionGuard] Missing feature for feature mode', check)
        }
        return false
      }
      return permissions.hasFeature(check.feature)

    case 'route':
      if (!check.route) {
        if (process.env.NODE_ENV === 'development') {
          logger.error('[PermissionGuard] Missing route for route mode', check)
        }
        return false
      }
      return permissions.canAccessRoute(check.route)

    case 'delete':
      if (!check.resource) {
        if (process.env.NODE_ENV === 'development') {
          logger.error('[PermissionGuard] Missing resource for delete mode', check)
        }
        return false
      }
      return permissions.canDelete(check.resource)

    case 'softDelete':
      if (!check.resource) {
        if (process.env.NODE_ENV === 'development') {
          logger.error('[PermissionGuard] Missing resource for softDelete mode', check)
        }
        return false
      }
      return permissions.canSoftDelete(check.resource)

    case 'custom':
      if (!check.check) {
        if (process.env.NODE_ENV === 'development') {
          logger.error('[PermissionGuard] Missing check function for custom mode', check)
        }
        return false
      }
      return check.check(permissions)

    default:
      if (process.env.NODE_ENV === 'development') {
        logger.error('[PermissionGuard] Unknown permission mode:', (check as PermissionCheck).mode)
      }
      return false
  }
}

/**
 * Check multiple permissions with AND/OR logic
 */
function checkPermissions(
  checks: PermissionCheck | PermissionCheck[],
  permissions: ReturnType<typeof usePermissions>,
  requireAll: boolean
): boolean {
  const checksArray = Array.isArray(checks) ? checks : [checks]

  if (requireAll) {
    // AND logic: all checks must pass
    return checksArray.every(check => checkPermission(check, permissions))
  } else {
    // OR logic: at least one check must pass
    return checksArray.some(check => checkPermission(check, permissions))
  }
}

// ============================================================================
// COMPONENT
// ============================================================================

/**
 * PermissionGuard Component (Memoized)
 *
 * Wraps children with permission checking logic. Only renders children if user has required permissions.
 *
 * @example
 * ```tsx
 * <PermissionGuard
 *   requires={{ mode: 'role', roles: ['admin'] }}
 *   fallback="alert"
 *   fallbackMessage="Admin access required"
 * >
 *   <AdminPanel />
 * </PermissionGuard>
 * ```
 */
export const PermissionGuard = memo(function PermissionGuard({
  children,
  requires,
  requireAll = false,
  fallback = 'hidden',
  fallbackMessage,
  loadingFallback,
  ariaLabel,
  className,
}: PermissionGuardProps) {
  const permissions = usePermissions()

  // Handle loading state
  if (permissions.loading) {
    if (loadingFallback) {
      return <>{loadingFallback}</>
    }
    return null
  }

  // Check permissions
  const hasPermission = checkPermissions(requires, permissions, requireAll)

  // Grant access
  if (hasPermission) {
    return <>{children}</>
  }

  // Deny access - render fallback
  if (fallback === 'hidden') {
    return null
  }

  if (fallback === 'message') {
    return (
      <div
        className={className}
        role="alert"
        aria-label={ariaLabel || 'Permission denied'}
      >
        <p className="text-sm text-muted-foreground">
          {fallbackMessage || 'You do not have permission to view this content.'}
        </p>
      </div>
    )
  }

  if (fallback === 'alert') {
    return (
      <Alert variant="destructive" className={className}>
        <ShieldAlert className="h-4 w-4" />
        <AlertDescription>
          {fallbackMessage || 'You do not have permission to access this feature.'}
        </AlertDescription>
      </Alert>
    )
  }

  // Custom fallback
  return <>{fallback}</>
})

// ============================================================================
// CONVENIENCE WRAPPERS
// ============================================================================

/**
 * AdminOnly - สำหรับ features ที่ admin only
 *
 * @example
 * ```tsx
 * <AdminOnly>
 *   <DeleteAllButton />
 * </AdminOnly>
 * ```
 */
export function AdminOnly({
  children,
  fallback = 'hidden',
  ...props
}: Omit<PermissionGuardProps, 'requires'>) {
  return (
    <PermissionGuard
      requires={{ mode: 'role', roles: ['admin'] }}
      fallback={fallback}
      {...props}
    >
      {children}
    </PermissionGuard>
  )
}

/**
 * ManagerOrAdmin - สำหรับ features ที่ manager + admin ใช้ได้
 *
 * @example
 * ```tsx
 * <ManagerOrAdmin>
 *   <ViewReportsButton />
 * </ManagerOrAdmin>
 * ```
 */
export function ManagerOrAdmin({
  children,
  fallback = 'hidden',
  ...props
}: Omit<PermissionGuardProps, 'requires'>) {
  return (
    <PermissionGuard
      requires={{ mode: 'role', roles: ['admin', 'manager'] }}
      fallback={fallback}
      {...props}
    >
      {children}
    </PermissionGuard>
  )
}

/**
 * StaffOnly - สำหรับ features ที่ staff only
 *
 * @example
 * ```tsx
 * <StaffOnly>
 *   <MyScheduleView />
 * </StaffOnly>
 * ```
 */
export function StaffOnly({
  children,
  fallback = 'hidden',
  ...props
}: Omit<PermissionGuardProps, 'requires'>) {
  return (
    <PermissionGuard
      requires={{ mode: 'role', roles: ['staff'] }}
      fallback={fallback}
      {...props}
    >
      {children}
    </PermissionGuard>
  )
}

/**
 * CanDelete - สำหรับ delete buttons/features
 *
 * @example
 * ```tsx
 * <CanDelete resource="bookings">
 *   <DeleteBookingButton />
 * </CanDelete>
 * ```
 */
export function CanDelete({
  resource,
  children,
  fallback = 'hidden',
  ...props
}: Omit<PermissionGuardProps, 'requires'> & { resource: PermissionResource }) {
  return (
    <PermissionGuard
      requires={{ mode: 'delete', resource }}
      fallback={fallback}
      {...props}
    >
      {children}
    </PermissionGuard>
  )
}

/**
 * CanSoftDelete - สำหรับ soft delete/cancel buttons
 *
 * @example
 * ```tsx
 * <CanSoftDelete resource="bookings">
 *   <CancelBookingButton />
 * </CanSoftDelete>
 * ```
 */
export function CanSoftDelete({
  resource,
  children,
  fallback = 'hidden',
  ...props
}: Omit<PermissionGuardProps, 'requires'> & { resource: PermissionResource }) {
  return (
    <PermissionGuard
      requires={{ mode: 'softDelete', resource }}
      fallback={fallback}
      {...props}
    >
      {children}
    </PermissionGuard>
  )
}
