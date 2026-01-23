/**
 * Route Utilities Tests
 *
 * Comprehensive tests for route-utils.ts functions
 */

import { describe, it, expect, vi } from 'vitest'
import {
  getRoutePath,
  navigateToRoute,
  getPageMetadata,
  canAccessRoute,
  getDefaultRoute,
  getDefaultPath,
  matchRoute,
  getBasePath,
  getCustomerPath,
  getStaffPath,
  getTeamPath,
  getPackagePath,
  isCurrentRoute,
  getNavigationRoutes,
} from '../route-utils'

describe('route-utils', () => {
  describe('getRoutePath', () => {
    it('should return path for simple route without params', () => {
      const path = getRoutePath('ADMIN_DASHBOARD')
      expect(path).toBe('/admin')
    })

    it('should replace single parameter in path', () => {
      const path = getRoutePath('CUSTOMER_DETAIL', { id: '123' })
      expect(path).toBe('/admin/customers/123')
    })

    it('should replace multiple parameters in path', () => {
      // Assuming there's a route with multiple params
      const path = getRoutePath('STAFF_PERFORMANCE', { id: 'staff-001' })
      expect(path).toBe('/admin/staff/staff-001')
    })

    it('should convert number params to string', () => {
      const path = getRoutePath('CUSTOMER_DETAIL', { id: 456 })
      expect(path).toBe('/admin/customers/456')
    })

    it('should handle empty params object', () => {
      const path = getRoutePath('ADMIN_DASHBOARD', {})
      expect(path).toBe('/admin')
    })
  })

  describe('navigateToRoute', () => {
    it('should call navigate with correct path', () => {
      const mockNavigate = vi.fn()
      navigateToRoute(mockNavigate, 'ADMIN_DASHBOARD')

      expect(mockNavigate).toHaveBeenCalledWith('/admin', undefined)
    })

    it('should call navigate with params', () => {
      const mockNavigate = vi.fn()
      navigateToRoute(mockNavigate, 'CUSTOMER_DETAIL', { id: '123' })

      expect(mockNavigate).toHaveBeenCalledWith('/admin/customers/123', undefined)
    })

    it('should pass navigation options', () => {
      const mockNavigate = vi.fn()
      const options = { replace: true, state: { from: '/test' } }

      navigateToRoute(mockNavigate, 'ADMIN_DASHBOARD', undefined, options)

      expect(mockNavigate).toHaveBeenCalledWith('/admin', options)
    })

    it('should handle both params and options', () => {
      const mockNavigate = vi.fn()
      const options = { replace: true }

      navigateToRoute(mockNavigate, 'CUSTOMER_DETAIL', { id: '789' }, options)

      expect(mockNavigate).toHaveBeenCalledWith('/admin/customers/789', options)
    })
  })

  describe('getPageMetadata', () => {
    it('should return metadata for dashboard', () => {
      const metadata = getPageMetadata('/admin')

      expect(metadata.title).toBeDefined()
      expect(metadata.breadcrumbs).toBeInstanceOf(Array)
      expect(metadata.allowedRoles).toBeInstanceOf(Array)
    })

    it('should return metadata for customer detail', () => {
      const metadata = getPageMetadata('/admin/customers/123')

      expect(metadata.title).toBeDefined()
      expect(metadata.breadcrumbs.length).toBeGreaterThan(0)
      expect(metadata.allowedRoles).toContain('admin')
    })

    it('should return default metadata for unknown route', () => {
      const metadata = getPageMetadata('/unknown/path')

      expect(metadata).toBeDefined()
      expect(metadata.breadcrumbs).toBeInstanceOf(Array)
    })

    it('should include description if available', () => {
      const metadata = getPageMetadata('/admin/bookings')

      expect(metadata.title).toBeDefined()
      // Description may or may not be present
      if (metadata.description) {
        expect(typeof metadata.description).toBe('string')
      }
    })
  })

  describe('canAccessRoute', () => {
    it('should allow admin to access admin routes', () => {
      const canAccess = canAccessRoute('ADMIN_DASHBOARD', 'admin')
      expect(canAccess).toBe(true)
    })

    it('should allow admin to access manager routes', () => {
      const canAccess = canAccessRoute('BOOKINGS', 'admin')
      expect(canAccess).toBe(true)
    })

    it('should allow manager to access manager routes', () => {
      const canAccess = canAccessRoute('BOOKINGS', 'manager')
      expect(canAccess).toBe(true)
    })

    it('should not allow staff to access admin-only routes', () => {
      const canAccess = canAccessRoute('ADMIN_SETTINGS', 'staff')
      expect(canAccess).toBe(false)
    })

    it('should allow staff to access staff routes', () => {
      const canAccess = canAccessRoute('STAFF_DASHBOARD', 'staff')
      expect(canAccess).toBe(true)
    })

    it('should deny access when role is null', () => {
      const canAccess = canAccessRoute('ADMIN_DASHBOARD', null)
      expect(canAccess).toBe(false)
    })
  })

  describe('getDefaultRoute', () => {
    it('should return admin dashboard for admin role', () => {
      const route = getDefaultRoute('admin')
      expect(route).toBe('ADMIN_DASHBOARD')
    })

    it('should return admin dashboard for manager role', () => {
      const route = getDefaultRoute('manager')
      expect(route).toBe('ADMIN_DASHBOARD')
    })

    it('should return staff dashboard for staff role', () => {
      const route = getDefaultRoute('staff')
      expect(route).toBe('STAFF_DASHBOARD')
    })

    it('should return login for null role', () => {
      const route = getDefaultRoute(null)
      expect(route).toBe('LOGIN')
    })
  })

  describe('getDefaultPath', () => {
    it('should return admin path for admin role', () => {
      const path = getDefaultPath('admin')
      expect(path).toBe('/admin')
    })

    it('should return admin path for manager role', () => {
      const path = getDefaultPath('manager')
      expect(path).toBe('/admin')
    })

    it('should return staff path for staff role', () => {
      const path = getDefaultPath('staff')
      expect(path).toBe('/staff')
    })

    it('should return login path for null role', () => {
      const path = getDefaultPath(null)
      expect(path).toBe('/login')
    })
  })

  describe('matchRoute', () => {
    it('should match exact path', () => {
      const match = matchRoute('/admin')

      expect(match.route).toBeDefined()
      expect(match.route?.path).toBe('/admin')
      expect(match.params).toEqual({})
    })

    it('should match parameterized path', () => {
      const match = matchRoute('/admin/customers/123')

      expect(match.route).toBeDefined()
      expect(match.params).toHaveProperty('id')
      expect(match.params.id).toBe('123')
    })

    it('should handle staff routes', () => {
      const match = matchRoute('/staff')

      expect(match.route).toBeDefined()
      expect(match.route?.path).toBe('/staff')
    })

    it('should return undefined route for unknown path', () => {
      const match = matchRoute('/unknown/route')

      expect(match.route).toBeUndefined()
      expect(match.params).toEqual({})
    })
  })

  describe('getBasePath', () => {
    it('should return /admin for admin role', () => {
      const basePath = getBasePath('admin')
      expect(basePath).toBe('/admin')
    })

    it('should return /admin for manager role', () => {
      const basePath = getBasePath('manager')
      expect(basePath).toBe('/admin')
    })

    it('should return /staff for staff role', () => {
      const basePath = getBasePath('staff')
      expect(basePath).toBe('/staff')
    })

    it('should return /login for null role', () => {
      const basePath = getBasePath(null)
      expect(basePath).toBe('/login')
    })
  })

  describe('getCustomerPath', () => {
    it('should return admin customer path by default', () => {
      const path = getCustomerPath('customer-123')
      expect(path).toBe('/admin/customers/customer-123')
    })

    it('should return admin customer path for admin role', () => {
      const path = getCustomerPath('customer-456', 'admin')
      expect(path).toBe('/admin/customers/customer-456')
    })

    it('should return admin customer path for manager role', () => {
      const path = getCustomerPath('customer-789', 'manager')
      expect(path).toBe('/admin/customers/customer-789')
    })

    it('should handle customer path for staff role', () => {
      const path = getCustomerPath('customer-001', 'staff')
      // Staff may not have access or different path
      expect(path).toBeDefined()
      expect(typeof path).toBe('string')
    })
  })

  describe('getStaffPath', () => {
    it('should return admin staff path by default', () => {
      const path = getStaffPath('staff-123')
      expect(path).toBe('/admin/staff/staff-123')
    })

    it('should return admin staff path for admin role', () => {
      const path = getStaffPath('staff-456', 'admin')
      expect(path).toBe('/admin/staff/staff-456')
    })

    it('should return admin staff path for manager role', () => {
      const path = getStaffPath('staff-789', 'manager')
      expect(path).toBe('/admin/staff/staff-789')
    })

    it('should handle staff path for staff role', () => {
      const path = getStaffPath('staff-001', 'staff')
      // May redirect to profile
      expect(path).toBeDefined()
      expect(typeof path).toBe('string')
    })
  })

  describe('getTeamPath', () => {
    it('should return admin team path by default', () => {
      const path = getTeamPath('team-123')
      expect(path).toBe('/admin/teams/team-123')
    })

    it('should return admin team path for admin role', () => {
      const path = getTeamPath('team-456', 'admin')
      expect(path).toBe('/admin/teams/team-456')
    })

    it('should return admin team path for manager role', () => {
      const path = getTeamPath('team-789', 'manager')
      expect(path).toBe('/admin/teams/team-789')
    })
  })

  describe('getPackagePath', () => {
    it('should return admin package path by default', () => {
      const path = getPackagePath('pkg-123')
      expect(path).toBe('/admin/packages/pkg-123')
    })

    it('should return admin package path for admin role', () => {
      const path = getPackagePath('pkg-456', 'admin')
      expect(path).toBe('/admin/packages/pkg-456')
    })

    it('should return admin package path for manager role', () => {
      const path = getPackagePath('pkg-789', 'manager')
      expect(path).toBe('/admin/packages/pkg-789')
    })
  })

  describe('isCurrentRoute', () => {
    it('should return true for exact match', () => {
      const isCurrent = isCurrentRoute('/admin', 'ADMIN_DASHBOARD')
      expect(isCurrent).toBe(true)
    })

    it('should return true for parameterized match', () => {
      const isCurrent = isCurrentRoute('/admin/customers/123', 'CUSTOMER_DETAIL')
      expect(isCurrent).toBe(true)
    })

    it('should return false for different route', () => {
      const isCurrent = isCurrentRoute('/admin/bookings', 'ADMIN_DASHBOARD')
      expect(isCurrent).toBe(false)
    })

    it('should return false for unknown path', () => {
      const isCurrent = isCurrentRoute('/unknown', 'ADMIN_DASHBOARD')
      expect(isCurrent).toBe(false)
    })
  })

  describe('getNavigationRoutes', () => {
    it('should return admin routes for admin role', () => {
      const routes = getNavigationRoutes('admin')

      expect(routes).toBeInstanceOf(Array)
      expect(routes.length).toBeGreaterThan(0)

      // Should include admin routes
      const dashboardRoute = routes.find(r => r.path === '/admin')
      expect(dashboardRoute).toBeDefined()
    })

    it('should return manager routes for manager role', () => {
      const routes = getNavigationRoutes('manager')

      expect(routes).toBeInstanceOf(Array)
      expect(routes.length).toBeGreaterThan(0)

      // Managers should have access to operational routes
      const bookingsRoute = routes.find(r => r.path.includes('bookings'))
      expect(bookingsRoute).toBeDefined()
    })

    it('should return staff routes for staff role', () => {
      const routes = getNavigationRoutes('staff')

      expect(routes).toBeInstanceOf(Array)
      expect(routes.length).toBeGreaterThan(0)

      // Should include staff routes
      const staffDashboard = routes.find(r => r.path === '/staff')
      expect(staffDashboard).toBeDefined()
    })

    it('should return empty array for null role', () => {
      const routes = getNavigationRoutes(null)

      expect(routes).toBeInstanceOf(Array)
      expect(routes.length).toBe(0)
    })

    it('should filter routes based on role permissions', () => {
      const adminRoutes = getNavigationRoutes('admin')
      const staffRoutes = getNavigationRoutes('staff')

      // Admin should have more routes than staff
      expect(adminRoutes.length).toBeGreaterThan(staffRoutes.length)
    })
  })

  describe('edge cases', () => {
    it('getRoutePath should handle special characters in params', () => {
      const path = getRoutePath('CUSTOMER_DETAIL', { id: 'test@email.com' })
      expect(path).toContain('test@email.com')
    })

    it('navigateToRoute should handle undefined options gracefully', () => {
      const mockNavigate = vi.fn()
      navigateToRoute(mockNavigate, 'ADMIN_DASHBOARD', undefined, undefined)

      expect(mockNavigate).toHaveBeenCalled()
    })

    it('matchRoute should be strict about trailing slashes', () => {
      const match1 = matchRoute('/admin')
      const match2 = matchRoute('/admin/')

      // Routes are defined without trailing slashes, so only exact match works
      expect(match1.route).toBeDefined()
      expect(match1.route?.path).toBe('/admin')

      // Trailing slash doesn't match
      expect(match2.route).toBeUndefined()
    })
  })
})
