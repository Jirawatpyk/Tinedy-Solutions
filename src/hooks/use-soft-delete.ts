/**
 * useSoftDelete Hook
 *
 * Centralized hook for soft delete operations
 * Now powered by useOptimisticDelete for instant UI updates!
 *
 * ✨ Refactored to use optimistic updates internally while maintaining the same external API
 */

import { useCallback, useMemo } from 'react'
import { useOptimisticDelete, type SoftDeleteTable as OptimisticSoftDeleteTable } from '@/hooks/optimistic'

// Re-export type for backwards compatibility
export type SoftDeleteTable = OptimisticSoftDeleteTable | 'service_packages'

interface SoftDeleteResult {
  success: boolean
  error?: unknown
}

// Default table for useOptimisticDelete when table is not supported
const DEFAULT_TABLE: OptimisticSoftDeleteTable = 'bookings'

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
  // Check if table is supported for optimistic updates
  const isSupportedTable = table !== 'service_packages'

  // Get the table to use for useOptimisticDelete (always call hook unconditionally)
  const optimisticTable: OptimisticSoftDeleteTable = isSupportedTable
    ? (table as OptimisticSoftDeleteTable)
    : DEFAULT_TABLE

  // Always call hook unconditionally (React Hooks rule)
  const deleteOps = useOptimisticDelete({
    table: optimisticTable,
    onSuccess: () => {}, // No-op, caller handles refetch
  })

  // Memoize whether we should use deleteOps
  const shouldUseOptimistic = useMemo(() => isSupportedTable, [isSupportedTable])

  /**
   * Soft delete a record (archive)
   * Uses optimistic updates for instant UI feedback
   */
  const softDelete = useCallback(
    async (id: string): Promise<SoftDeleteResult> => {
      if (shouldUseOptimistic) {
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
    [deleteOps, shouldUseOptimistic]
  )

  /**
   * Restore a soft-deleted record
   * Uses optimistic updates for instant UI feedback
   */
  const restore = useCallback(
    async (id: string): Promise<SoftDeleteResult> => {
      if (shouldUseOptimistic) {
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
    [deleteOps, shouldUseOptimistic]
  )

  /**
   * Permanently delete a record
   * Uses optimistic updates for instant UI feedback
   * Admin only operation
   */
  const permanentDelete = useCallback(
    async (id: string): Promise<SoftDeleteResult> => {
      if (shouldUseOptimistic) {
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
    [deleteOps, shouldUseOptimistic]
  )

  return {
    softDelete,
    restore,
    permanentDelete,
  }
}
