/**
 * Route Utilities
 *
 * Helper functions for type-safe routing and navigation.
 */

import { type NavigateFunction } from 'react-router-dom'
import {
  ADMIN_ROUTES,
  STAFF_ROUTES,
  findRouteByPath,
  getRoute,
  type RouteKey,
  type RouteConfig,
} from '@/config/routes'
import { UserRole } from '@/types/common'

/**
 * Page Metadata
 */
export interface PageMetadata {
  title: string
  description?: string
  breadcrumbs: string[]
  allowedRoles: UserRole[]
}

/**
 * Build route path with parameters
 *
 * @param key - Route key from route config
 * @param params - Route parameters (e.g., { id: '123' })
 * @returns Complete path string
 *
 * @example
 * ```typescript
 * getRoutePath('CUSTOMER_DETAIL', { id: '123' })
 * // Returns: '/admin/customers/123'
 *
 * getRoutePath('DASHBOARD')
 * // Returns: '/admin'
 * ```
 */
export function getRoutePath(
  key: RouteKey,
  params?: Record<string, string | number>
): string {
  const route = getRoute(key)
  let path = route.path

  // Replace parameters in path
  if (params) {
    Object.entries(params).forEach(([paramKey, value]) => {
      path = path.replace(`:${paramKey}`, String(value))
    })
  }

  return path
}

/**
 * Type-safe navigation helper
 *
 * @param navigate - React Router navigate function
 * @param key - Route key
 * @param params - Route parameters
 * @param options - Navigation options
 *
 * @example
 * ```typescript
 * const navigate = useNavigate()
 *
 * // Navigate to customer detail
 * navigateToRoute(navigate, 'CUSTOMER_DETAIL', { id: '123' })
 *
 * // Navigate with replace
 * navigateToRoute(navigate, 'DASHBOARD', undefined, { replace: true })
 * ```
 */
export function navigateToRoute(
  navigate: NavigateFunction,
  key: RouteKey,
  params?: Record<string, string | number>,
  options?: { replace?: boolean; state?: unknown }
): void {
  const path = getRoutePath(key, params)
  navigate(path, options)
}

/**
 * Get page metadata from pathname
 *
 * @param pathname - Current pathname
 * @returns Page metadata including title, breadcrumbs
 *
 * @example
 * ```typescript
 * const metadata = getPageMetadata('/admin/customers/123')
 * // Returns: {
 * //   title: 'Customer Details',
 * //   description: 'รายละเอียดลูกค้า',
 * //   breadcrumbs: ['Dashboard', 'Customers', 'Details'],
 * //   allowedRoles: ['admin', 'manager']
 * // }
 * ```
 */
export function getPageMetadata(pathname: string): PageMetadata {
  const route = findRouteByPath(pathname)

  if (!route) {
    return {
      title: 'Tinedy CRM',
      breadcrumbs: [],
      allowedRoles: [],
    }
  }

  return {
    title: route.title,
    description: route.description,
    breadcrumbs: route.breadcrumbs || [route.title],
    allowedRoles: route.allowedRoles,
  }
}

/**
 * Check if user can access route
 *
 * @param routeKey - Route key
 * @param role - User role
 * @returns True if user can access route
 *
 * @example
 * ```typescript
 * canAccessRoute('SETTINGS', 'admin') // true
 * canAccessRoute('SETTINGS', 'staff') // false
 * ```
 */
export function canAccessRoute(routeKey: RouteKey, role: UserRole | null): boolean {
  if (!role) return false

  const route = getRoute(routeKey)
  return route.allowedRoles.includes(role)
}

/**
 * Get default dashboard route for role
 *
 * @param role - User role
 * @returns Dashboard route key
 *
 * @example
 * ```typescript
 * getDefaultRoute('admin') // 'DASHBOARD' (/admin)
 * getDefaultRoute('manager') // 'DASHBOARD' (/admin)
 * getDefaultRoute('staff') // 'DASHBOARD' (/staff)
 * ```
 */
export function getDefaultRoute(role: UserRole | null): RouteKey {
  switch (role) {
    case UserRole.Admin:
    case UserRole.Manager:
      return 'ADMIN_DASHBOARD'
    case UserRole.Staff:
      return 'STAFF_DASHBOARD'
    default:
      return 'LOGIN'
  }
}

/**
 * Get default path for role
 *
 * @param role - User role
 * @returns Default path string
 *
 * @example
 * ```typescript
 * getDefaultPath('admin') // '/admin'
 * getDefaultPath('manager') // '/admin'
 * getDefaultPath('staff') // '/staff'
 * ```
 */
export function getDefaultPath(role: UserRole | null): string {
  switch (role) {
    case UserRole.Admin:
    case UserRole.Manager:
      return '/admin'
    case UserRole.Staff:
      return '/staff'
    default:
      return '/login'
  }
}

/**
 * Match dynamic route and extract parameters
 *
 * @param pathname - Current pathname
 * @returns Matched route and extracted parameters
 *
 * @example
 * ```typescript
 * matchRoute('/admin/customers/123')
 * // Returns: {
 * //   route: { ... customer detail route config ... },
 * //   params: { id: '123' }
 * // }
 * ```
 */
export function matchRoute(pathname: string): {
  route: RouteConfig | undefined
  params: Record<string, string>
} {
  const route = findRouteByPath(pathname)

  if (!route || !route.params || route.params.length === 0) {
    return { route, params: {} }
  }

  // Extract parameter values
  const paramNames = route.params
  const pathSegments = pathname.split('/').filter(Boolean)
  const routeSegments = route.path.split('/').filter(Boolean)

  const params: Record<string, string> = {}

  routeSegments.forEach((segment, index) => {
    if (segment.startsWith(':')) {
      const paramName = segment.slice(1)
      if (paramNames.includes(paramName)) {
        params[paramName] = pathSegments[index]
      }
    }
  })

  return { route, params }
}

/**
 * Get base path for role (for search, navigation helpers)
 *
 * @param role - User role
 * @returns Base path for the role
 *
 * @example
 * ```typescript
 * getBasePath('admin') // '/admin'
 * getBasePath('manager') // '/admin'
 * getBasePath('staff') // '/staff'
 * ```
 */
export function getBasePath(role: UserRole | null): string {
  return getDefaultPath(role)
}

/**
 * Build customer detail path
 *
 * @param customerId - Customer ID
 * @param role - User role (for base path)
 * @returns Full customer detail path
 *
 * @example
 * ```typescript
 * getCustomerPath('123', 'admin') // '/admin/customers/123'
 * ```
 */
export function getCustomerPath(customerId: string, role: UserRole = UserRole.Admin): string {
  const basePath = getBasePath(role)
  return `${basePath}/customers/${customerId}`
}

/**
 * Build staff detail path
 *
 * @param staffId - Staff ID
 * @param role - User role (for base path)
 * @returns Full staff detail path
 *
 * @example
 * ```typescript
 * getStaffPath('456', 'admin') // '/admin/staff/456'
 * ```
 */
export function getStaffPath(staffId: string, role: UserRole = UserRole.Admin): string {
  const basePath = getBasePath(role)
  return `${basePath}/staff/${staffId}`
}

/**
 * Build team detail path
 *
 * @param teamId - Team ID
 * @param role - User role (for base path)
 * @returns Full team detail path
 *
 * @example
 * ```typescript
 * getTeamPath('789', 'admin') // '/admin/teams/789'
 * ```
 */
export function getTeamPath(teamId: string, role: UserRole = UserRole.Admin): string {
  const basePath = getBasePath(role)
  return `${basePath}/teams/${teamId}`
}

/**
 * Build package detail path
 *
 * @param packageId - Package ID
 * @param role - User role (for base path)
 * @returns Full package detail path
 *
 * @example
 * ```typescript
 * getPackagePath('pkg-1', 'admin') // '/admin/packages/pkg-1'
 * ```
 */
export function getPackagePath(packageId: string, role: UserRole = UserRole.Admin): string {
  const basePath = getBasePath(role)
  return `${basePath}/packages/${packageId}`
}

/**
 * Check if current path matches route
 *
 * @param pathname - Current pathname
 * @param routeKey - Route key to check
 * @returns True if current path matches the route
 *
 * @example
 * ```typescript
 * isCurrentRoute('/admin/customers', 'CUSTOMERS') // true
 * isCurrentRoute('/admin/customers/123', 'CUSTOMER_DETAIL') // true
 * ```
 */
export function isCurrentRoute(pathname: string, routeKey: RouteKey): boolean {
  const route = getRoute(routeKey)

  // Exact match
  if (pathname === route.path) return true

  // Dynamic route match
  if (route.params && route.params.length > 0) {
    const pattern = route.path.replace(/:[^/]+/g, '[^/]+')
    const regex = new RegExp(`^${pattern}$`)
    return regex.test(pathname)
  }

  return false
}

/**
 * Get navigation routes for role (only routes with showInNav = true)
 *
 * Helper function specific to navigation menus
 *
 * @param role - User role
 * @returns Array of navigation route configs
 */
export function getNavigationRoutes(role: UserRole | null): RouteConfig[] {
  if (!role) return []

  // Get routes based on role
  const routes = role === UserRole.Staff ? Object.values(STAFF_ROUTES) : Object.values(ADMIN_ROUTES)

  // Filter only navigation routes
  return routes.filter(route => route.showInNav)
}
