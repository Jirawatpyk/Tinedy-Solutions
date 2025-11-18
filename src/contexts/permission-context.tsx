/**
 * Permission Context
 *
 * Provides centralized permission context definition and types.
 * The actual provider implementation is in permission-context-provider.tsx
 */

import { createContext } from 'react'
import type { PermissionMap, UserRole } from '@/types/common'

// Re-export types for convenience
export type { PermissionAction, PermissionResource } from '@/types/common'
import type { PermissionAction, PermissionResource } from '@/types/common'

// ============================================================================
// TYPES
// ============================================================================

export interface PermissionContextType {
  can: (action: PermissionAction, resource: PermissionResource) => boolean
  canDelete: (resource: PermissionResource) => boolean
  canSoftDelete: (resource: PermissionResource) => boolean
  canRestore: () => boolean
  canPermanentlyDelete: () => boolean
  isAdmin: boolean
  isManagerOrAdmin: boolean
  isStaff: boolean
  role: UserRole | null
  permissions: Partial<PermissionMap>
  loading: boolean
}

// ============================================================================
// CONTEXT
// ============================================================================

export const PermissionContext = createContext<PermissionContextType | undefined>(undefined)

// Note: PermissionProvider is exported from ./permission-context-provider.tsx
// Import it directly from there to avoid Fast Refresh issues
