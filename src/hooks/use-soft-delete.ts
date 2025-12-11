/**
 * useSoftDelete Hook
 *
 * Centralized hook for soft delete operations
 * Now powered by useOptimisticDelete for instant UI updates!
 *
 * ✨ Refactored to use optimistic updates internally while maintaining the same external API
 */

import { useCallback } from 'react'
import { useOptimisticDelete, type SoftDeleteTable as OptimisticSoftDeleteTable } from '@/hooks/optimistic'

// Re-export type for backwards compatibility
export type SoftDeleteTable = OptimisticSoftDeleteTable | 'service_packages'

interface SoftDeleteResult {
  success: boolean
  error?: unknown
}

/**
 * Hook for managing soft delete operations
 *
 * Provides centralized functions for:
 * - Soft delete (archive) - Sets deleted_at timestamp
 * - Restore - Clears deleted_at timestamp
 * - Permanent delete - Removes record from database (admin only)
 *
 * @param table - The database table to operate on
 * @returns Object with softDelete, restore, and permanentDelete functions
 *
 * @example
 * ```tsx
 * const { softDelete, restore } = useSoftDelete('bookings')
 *
 * // Archive a booking
 * const result = await softDelete('booking-id')
 * if (result.success) {
 *   // Handle success
 * }
 * ```
 */
export function useSoftDelete(table: SoftDeleteTable) {
  // Use optimistic delete for supported tables
  const isSupportedTable = (t: SoftDeleteTable): t is OptimisticSoftDeleteTable => {
    return t !== 'service_packages'
  }

  // For supported tables, use optimistic delete
  const deleteOps = isSupportedTable(table)
    ? useOptimisticDelete({
        table,
        onSuccess: () => {}, // No-op, caller handles refetch
      })
    : null

  /**
   * Soft delete a record (archive)
   * Uses optimistic updates for instant UI feedback
   */
  const softDelete = useCallback(
    async (id: string): Promise<SoftDeleteResult> => {
      if (deleteOps) {
        try {
          await deleteOps.softDelete.mutate({ id })
          return { success: true }
        } catch (error) {
          return { success: false, error }
        }
      }

      // Fallback for unsupported tables (service_packages)
      // This maintains backwards compatibility
      return { success: false, error: 'Table not supported for optimistic updates' }
    },
    [deleteOps]
  )

  /**
   * Restore a soft-deleted record
   * Uses optimistic updates for instant UI feedback
   */
  const restore = useCallback(
    async (id: string): Promise<SoftDeleteResult> => {
      if (deleteOps) {
        try {
          await deleteOps.restore.mutate({ id })
          return { success: true }
        } catch (error) {
          return { success: false, error }
        }
      }

      // Fallback for unsupported tables
      return { success: false, error: 'Table not supported for optimistic updates' }
    },
    [deleteOps]
  )

  /**
   * Permanently delete a record
   * Uses optimistic updates for instant UI feedback
   * Admin only operation
   */
  const permanentDelete = useCallback(
    async (id: string): Promise<SoftDeleteResult> => {
      if (deleteOps) {
        try {
          await deleteOps.permanentDelete.mutate({ id })
          return { success: true }
        } catch (error) {
          return { success: false, error }
        }
      }

      // Fallback for unsupported tables
      return { success: false, error: 'Table not supported for optimistic updates' }
    },
    [deleteOps]
  )

  return {
    softDelete,
    restore,
    permanentDelete,
  }
}
