/**
 * PermissionGuard Component Tests
 *
 * Tests all permission modes, fallback behaviors, and edge cases
 */

import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import {
  PermissionGuard,
  AdminOnly,
  ManagerOrAdmin,
  StaffOnly,
  CanDelete,
  CanSoftDelete,
} from '../permission-guard'
import * as usePermissionsHook from '@/hooks/use-permissions'

// Mock the usePermissions hook
vi.mock('@/hooks/use-permissions')

// Helper to create mock permissions
const createMockPermissions = (overrides = {}) => ({
  can: vi.fn().mockReturnValue(false),
  canDelete: vi.fn().mockReturnValue(false),
  canSoftDelete: vi.fn().mockReturnValue(false),
  canRestore: vi.fn().mockReturnValue(false),
  canPermanentlyDelete: vi.fn().mockReturnValue(false),
  canAccessRoute: vi.fn().mockReturnValue(false),
  hasFeature: vi.fn().mockReturnValue(false),
  isAdmin: false,
  isManagerOrAdmin: false,
  isStaff: false,
  role: null,
  permissions: {},
  loading: false,
  ...overrides,
})

describe('PermissionGuard', () => {
  describe('Role-based permissions', () => {
    it('should render children for matching role', () => {
      vi.mocked(usePermissionsHook.usePermissions).mockReturnValue(
        createMockPermissions({ role: 'admin', isAdmin: true })
      )

      render(
        <PermissionGuard requires={{ mode: 'role', roles: ['admin'] }}>
          <div>Admin Content</div>
        </PermissionGuard>
      )

      expect(screen.getByText('Admin Content')).toBeInTheDocument()
    })

    it('should hide children for non-matching role', () => {
      vi.mocked(usePermissionsHook.usePermissions).mockReturnValue(
        createMockPermissions({ role: 'staff', isStaff: true })
      )

      render(
        <PermissionGuard requires={{ mode: 'role', roles: ['admin'] }}>
          <div>Admin Content</div>
        </PermissionGuard>
      )

      expect(screen.queryByText('Admin Content')).not.toBeInTheDocument()
    })

    it('should support multiple roles (OR logic)', () => {
      vi.mocked(usePermissionsHook.usePermissions).mockReturnValue(
        createMockPermissions({ role: 'manager', isManagerOrAdmin: true })
      )

      render(
        <PermissionGuard requires={{ mode: 'role', roles: ['admin', 'manager'] }}>
          <div>Manager Content</div>
        </PermissionGuard>
      )

      expect(screen.getByText('Manager Content')).toBeInTheDocument()
    })
  })

  describe('Action-based permissions', () => {
    it('should render children when user can perform action', () => {
      const mockPermissions = createMockPermissions()
      mockPermissions.can = vi.fn().mockReturnValue(true)
      vi.mocked(usePermissionsHook.usePermissions).mockReturnValue(mockPermissions)

      render(
        <PermissionGuard requires={{ mode: 'action', action: 'create', resource: 'bookings' }}>
          <div>Create Booking</div>
        </PermissionGuard>
      )

      expect(screen.getByText('Create Booking')).toBeInTheDocument()
      expect(mockPermissions.can).toHaveBeenCalledWith('create', 'bookings')
    })

    it('should hide children when user cannot perform action', () => {
      const mockPermissions = createMockPermissions()
      mockPermissions.can = vi.fn().mockReturnValue(false)
      vi.mocked(usePermissionsHook.usePermissions).mockReturnValue(mockPermissions)

      render(
        <PermissionGuard requires={{ mode: 'action', action: 'delete', resource: 'bookings' }}>
          <div>Delete Booking</div>
        </PermissionGuard>
      )

      expect(screen.queryByText('Delete Booking')).not.toBeInTheDocument()
    })
  })

  describe('Delete permissions', () => {
    it('should render children when user can delete', () => {
      const mockPermissions = createMockPermissions()
      mockPermissions.canDelete = vi.fn().mockReturnValue(true)
      vi.mocked(usePermissionsHook.usePermissions).mockReturnValue(mockPermissions)

      render(
        <PermissionGuard requires={{ mode: 'delete', resource: 'customers' }}>
          <div>Delete Button</div>
        </PermissionGuard>
      )

      expect(screen.getByText('Delete Button')).toBeInTheDocument()
      expect(mockPermissions.canDelete).toHaveBeenCalledWith('customers')
    })

    it('should render children when user can soft delete', () => {
      const mockPermissions = createMockPermissions()
      mockPermissions.canSoftDelete = vi.fn().mockReturnValue(true)
      vi.mocked(usePermissionsHook.usePermissions).mockReturnValue(mockPermissions)

      render(
        <PermissionGuard requires={{ mode: 'softDelete', resource: 'bookings' }}>
          <div>Cancel Button</div>
        </PermissionGuard>
      )

      expect(screen.getByText('Cancel Button')).toBeInTheDocument()
      expect(mockPermissions.canSoftDelete).toHaveBeenCalledWith('bookings')
    })
  })

  describe('Feature flag permissions', () => {
    it('should render children when feature is enabled', () => {
      const mockPermissions = createMockPermissions()
      mockPermissions.hasFeature = vi.fn().mockReturnValue(true)
      vi.mocked(usePermissionsHook.usePermissions).mockReturnValue(mockPermissions)

      render(
        <PermissionGuard requires={{ mode: 'feature', feature: 'export_data' }}>
          <div>Export Button</div>
        </PermissionGuard>
      )

      expect(screen.getByText('Export Button')).toBeInTheDocument()
      expect(mockPermissions.hasFeature).toHaveBeenCalledWith('export_data')
    })
  })

  describe('Route permissions', () => {
    it('should render children when user can access route', () => {
      const mockPermissions = createMockPermissions()
      mockPermissions.canAccessRoute = vi.fn().mockReturnValue(true)
      vi.mocked(usePermissionsHook.usePermissions).mockReturnValue(mockPermissions)

      render(
        <PermissionGuard requires={{ mode: 'route', route: '/admin/settings' }}>
          <div>Settings Content</div>
        </PermissionGuard>
      )

      expect(screen.getByText('Settings Content')).toBeInTheDocument()
      expect(mockPermissions.canAccessRoute).toHaveBeenCalledWith('/admin/settings')
    })
  })

  describe('Custom check', () => {
    it('should render children when custom check returns true', () => {
      const mockPermissions = createMockPermissions({ role: 'admin', isAdmin: true })
      vi.mocked(usePermissionsHook.usePermissions).mockReturnValue(mockPermissions)

      const customCheck = vi.fn().mockReturnValue(true)

      render(
        <PermissionGuard requires={{ mode: 'custom', check: customCheck }}>
          <div>Custom Content</div>
        </PermissionGuard>
      )

      expect(screen.getByText('Custom Content')).toBeInTheDocument()
      expect(customCheck).toHaveBeenCalledWith(mockPermissions)
    })
  })

  describe('Multiple permissions', () => {
    it('should use OR logic by default', () => {
      vi.mocked(usePermissionsHook.usePermissions).mockReturnValue(
        createMockPermissions({ role: 'manager', isManagerOrAdmin: true })
      )

      render(
        <PermissionGuard
          requires={[
            { mode: 'role', roles: ['admin'] },
            { mode: 'role', roles: ['manager'] },
          ]}
        >
          <div>Manager or Admin</div>
        </PermissionGuard>
      )

      expect(screen.getByText('Manager or Admin')).toBeInTheDocument()
    })

    it('should use AND logic when requireAll=true', () => {
      const mockPermissions = createMockPermissions({ role: 'admin', isAdmin: true })
      mockPermissions.hasFeature = vi.fn().mockReturnValue(true)
      vi.mocked(usePermissionsHook.usePermissions).mockReturnValue(mockPermissions)

      render(
        <PermissionGuard
          requires={[
            { mode: 'role', roles: ['admin'] },
            { mode: 'feature', feature: 'delete_records' },
          ]}
          requireAll={true}
        >
          <div>Admin with Feature</div>
        </PermissionGuard>
      )

      expect(screen.getByText('Admin with Feature')).toBeInTheDocument()
    })

    it('should hide when AND logic fails', () => {
      const mockPermissions = createMockPermissions({ role: 'admin', isAdmin: true })
      mockPermissions.hasFeature = vi.fn().mockReturnValue(false)
      vi.mocked(usePermissionsHook.usePermissions).mockReturnValue(mockPermissions)

      render(
        <PermissionGuard
          requires={[
            { mode: 'role', roles: ['admin'] },
            { mode: 'feature', feature: 'delete_records' },
          ]}
          requireAll={true}
        >
          <div>Admin with Feature</div>
        </PermissionGuard>
      )

      expect(screen.queryByText('Admin with Feature')).not.toBeInTheDocument()
    })
  })

  describe('Fallback behaviors', () => {
    it('should render nothing when fallback="hidden"', () => {
      vi.mocked(usePermissionsHook.usePermissions).mockReturnValue(
        createMockPermissions({ role: 'staff' })
      )

      const { container } = render(
        <PermissionGuard requires={{ mode: 'role', roles: ['admin'] }} fallback="hidden">
          <div>Admin Content</div>
        </PermissionGuard>
      )

      expect(container.firstChild).toBeNull()
    })

    it('should render message when fallback="message"', () => {
      vi.mocked(usePermissionsHook.usePermissions).mockReturnValue(
        createMockPermissions({ role: 'staff' })
      )

      render(
        <PermissionGuard
          requires={{ mode: 'role', roles: ['admin'] }}
          fallback="message"
          fallbackMessage="You need admin access"
        >
          <div>Admin Content</div>
        </PermissionGuard>
      )

      expect(screen.getByText('You need admin access')).toBeInTheDocument()
    })

    it('should render alert when fallback="alert"', () => {
      vi.mocked(usePermissionsHook.usePermissions).mockReturnValue(
        createMockPermissions({ role: 'staff' })
      )

      render(
        <PermissionGuard
          requires={{ mode: 'role', roles: ['admin'] }}
          fallback="alert"
          fallbackMessage="Access denied"
        >
          <div>Admin Content</div>
        </PermissionGuard>
      )

      expect(screen.getByText('Access denied')).toBeInTheDocument()
    })

    it('should render custom fallback', () => {
      vi.mocked(usePermissionsHook.usePermissions).mockReturnValue(
        createMockPermissions({ role: 'staff' })
      )

      render(
        <PermissionGuard
          requires={{ mode: 'role', roles: ['admin'] }}
          fallback={<div>Custom Fallback</div>}
        >
          <div>Admin Content</div>
        </PermissionGuard>
      )

      expect(screen.getByText('Custom Fallback')).toBeInTheDocument()
    })
  })

  describe('Loading state', () => {
    it('should render loadingFallback while loading', () => {
      vi.mocked(usePermissionsHook.usePermissions).mockReturnValue(
        createMockPermissions({ loading: true })
      )

      render(
        <PermissionGuard
          requires={{ mode: 'role', roles: ['admin'] }}
          loadingFallback={<div>Loading...</div>}
        >
          <div>Admin Content</div>
        </PermissionGuard>
      )

      expect(screen.getByText('Loading...')).toBeInTheDocument()
      expect(screen.queryByText('Admin Content')).not.toBeInTheDocument()
    })

    it('should render null when loading without loadingFallback', () => {
      vi.mocked(usePermissionsHook.usePermissions).mockReturnValue(
        createMockPermissions({ loading: true })
      )

      const { container } = render(
        <PermissionGuard requires={{ mode: 'role', roles: ['admin'] }}>
          <div>Admin Content</div>
        </PermissionGuard>
      )

      expect(container.firstChild).toBeNull()
    })
  })

  describe('Convenience wrappers', () => {
    it('AdminOnly should work for admin role', () => {
      vi.mocked(usePermissionsHook.usePermissions).mockReturnValue(
        createMockPermissions({ role: 'admin', isAdmin: true })
      )

      render(
        <AdminOnly>
          <div>Admin Only Content</div>
        </AdminOnly>
      )

      expect(screen.getByText('Admin Only Content')).toBeInTheDocument()
    })

    it('ManagerOrAdmin should work for manager role', () => {
      vi.mocked(usePermissionsHook.usePermissions).mockReturnValue(
        createMockPermissions({ role: 'manager', isManagerOrAdmin: true })
      )

      render(
        <ManagerOrAdmin>
          <div>Manager Content</div>
        </ManagerOrAdmin>
      )

      expect(screen.getByText('Manager Content')).toBeInTheDocument()
    })

    it('StaffOnly should work for staff role', () => {
      vi.mocked(usePermissionsHook.usePermissions).mockReturnValue(
        createMockPermissions({ role: 'staff', isStaff: true })
      )

      render(
        <StaffOnly>
          <div>Staff Content</div>
        </StaffOnly>
      )

      expect(screen.getByText('Staff Content')).toBeInTheDocument()
    })

    it('CanDelete should check delete permission', () => {
      const mockPermissions = createMockPermissions()
      mockPermissions.canDelete = vi.fn().mockReturnValue(true)
      vi.mocked(usePermissionsHook.usePermissions).mockReturnValue(mockPermissions)

      render(
        <CanDelete resource="bookings">
          <div>Delete Button</div>
        </CanDelete>
      )

      expect(screen.getByText('Delete Button')).toBeInTheDocument()
      expect(mockPermissions.canDelete).toHaveBeenCalledWith('bookings')
    })

    it('CanSoftDelete should check soft delete permission', () => {
      const mockPermissions = createMockPermissions()
      mockPermissions.canSoftDelete = vi.fn().mockReturnValue(true)
      vi.mocked(usePermissionsHook.usePermissions).mockReturnValue(mockPermissions)

      render(
        <CanSoftDelete resource="customers">
          <div>Archive Button</div>
        </CanSoftDelete>
      )

      expect(screen.getByText('Archive Button')).toBeInTheDocument()
      expect(mockPermissions.canSoftDelete).toHaveBeenCalledWith('customers')
    })
  })

  describe('Accessibility', () => {
    it('should have proper ARIA labels for message fallback', () => {
      vi.mocked(usePermissionsHook.usePermissions).mockReturnValue(
        createMockPermissions({ role: 'staff' })
      )

      render(
        <PermissionGuard
          requires={{ mode: 'role', roles: ['admin'] }}
          fallback="message"
          ariaLabel="Admin access required"
        >
          <div>Admin Content</div>
        </PermissionGuard>
      )

      const fallbackElement = screen.getByRole('alert')
      expect(fallbackElement).toHaveAttribute('aria-label', 'Admin access required')
    })
  })
})
