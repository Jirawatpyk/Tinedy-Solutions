/**
 * useOptimisticDelete Hook
 *
 * Wrapper hook สำหรับ delete operations พร้อม optimistic updates
 * รองรับ soft delete, restore, และ permanent delete
 *
 * Operations:
 * - softDelete: Archive record (set deleted_at)
 * - restore: Restore archived record (clear deleted_at)
 * - permanentDelete: Hard delete from database
 */

import { useOptimisticMutation } from './use-optimistic-mutation'
import { useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '@/lib/query-keys'
import { supabase } from '@/lib/supabase'

// ===== Types =====

export type SoftDeleteTable = 'bookings' | 'customers' | 'teams' | 'staff' | 'service_packages_v2'

interface DeleteVariables {
  id: string
  table?: SoftDeleteTable
}

interface UseOptimisticDeleteOptions {
  table: SoftDeleteTable
  onSuccess?: () => void | Promise<void>
}

interface DeleteOperation {
  mutate: (variables: DeleteVariables) => Promise<void>
  mutateAsync: (variables: DeleteVariables) => Promise<void>
  isLoading: boolean
  error: unknown | null
  reset: () => void
}

export interface UseOptimisticDeleteReturn {
  softDelete: DeleteOperation
  restore: DeleteOperation
  permanentDelete: DeleteOperation
}

// ===== Helper Functions =====

/**
 * Get query key for table
 */
function getQueryKeyForTable(table: SoftDeleteTable): readonly unknown[] {
  switch (table) {
    case 'bookings':
      return queryKeys.bookings.all
    case 'customers':
      return queryKeys.customers.all
    case 'teams':
      return queryKeys.teams.all
    case 'staff':
      return queryKeys.staff.all
    case 'service_packages_v2':
      return queryKeys.packages.all
    default:
      return [table]
  }
}

/**
 * Remove item from cache (for soft delete)
 */
function removeItemFromCache<T extends { id: string }>(
  oldData: T[] | undefined,
  id: string
): T[] | undefined {
  if (!oldData || !Array.isArray(oldData)) return oldData
  return oldData.filter((item) => item.id !== id)
}

// ===== Main Hook =====

/**
 * Wrapper hook สำหรับ delete operations พร้อม optimistic updates
 *
 * @example
 * ```tsx
 * const deleteOps = useOptimisticDelete({
 *   table: 'bookings',
 *   onSuccess: refetchBookings
 * })
 *
 * // Soft delete (archive)
 * await deleteOps.softDelete.mutate({ id: 'xxx' })
 *
 * // Restore
 * await deleteOps.restore.mutate({ id: 'xxx' })
 *
 * // Permanent delete
 * await deleteOps.permanentDelete.mutate({ id: 'xxx' })
 * ```
 */
export function useOptimisticDelete(
  options: UseOptimisticDeleteOptions
): UseOptimisticDeleteReturn {
  const { table, onSuccess } = options
  const queryClient = useQueryClient()

  // ===== Soft Delete (Archive) =====

  const softDelete = useOptimisticMutation<unknown[], DeleteVariables>({
    mutationFn: async ({ id }) => {
      // Call Supabase RPC function for soft delete
      const { error } = await supabase.rpc('soft_delete_record', {
        table_name: table,
        record_id: id,
      })
      if (error) throw error
      return { success: true }
    },
    optimisticUpdate: {
      queryKeys: [getQueryKeyForTable(table)],
      updater: (oldData, variables) => {
        // Remove item from list immediately (optimistic)
        return removeItemFromCache(oldData as { id: string }[], variables.id)
      },
    },
    toast: {
      successTitle: 'Success',
      successDescription: `${table.slice(0, -1).charAt(0).toUpperCase() + table.slice(1, -1)} archived successfully`,
      errorContext: table === 'bookings' ? 'booking' : table === 'customers' ? 'customer' : 'general',
    },
    onSuccess,
  })

  // ===== Restore =====

  const restore = useOptimisticMutation<unknown[], DeleteVariables>({
    mutationFn: async ({ id }) => {
      // Call Supabase to restore (clear deleted_at)
      const { data, error } = await supabase
        .from(table)
        .update({ deleted_at: null, deleted_by: null })
        .eq('id', id)
        .select()
        .single()

      if (error) throw error
      return data
    },
    optimisticUpdate: {
      queryKeys: [getQueryKeyForTable(table)],
      updater: (oldData, _variables) => {
        // Note: We can't add item back optimistically because we don't have the full data
        // Just keep the old data and let refetch handle it
        return oldData
      },
    },
    toast: {
      successTitle: 'Success',
      successDescription: `${table.slice(0, -1).charAt(0).toUpperCase() + table.slice(1, -1)} restored successfully`,
      errorContext: table === 'bookings' ? 'booking' : table === 'customers' ? 'customer' : 'general',
    },
    onSuccess: async () => {
      // Invalidate + refetch ทุก queries ของ table นี้
      // ใช้ refetchType: 'all' เพื่อ refetch ทุก queries (ไม่ใช่แค่ที่ mount)
      await queryClient.invalidateQueries({
        queryKey: getQueryKeyForTable(table),
        refetchType: 'all',
      })
      // เรียก onSuccess callback ที่ user ส่งมา (ถ้ามี)
      if (onSuccess) await onSuccess()
    },
  })

  // ===== Permanent Delete =====

  const permanentDelete = useOptimisticMutation<unknown[], DeleteVariables>({
    mutationFn: async ({ id }) => {
      // Hard delete from database
      const { error } = await supabase.from(table).delete().eq('id', id)
      if (error) throw error
      return { success: true }
    },
    optimisticUpdate: {
      queryKeys: [getQueryKeyForTable(table)],
      updater: (oldData, variables) => {
        // Remove item from list immediately (optimistic)
        return removeItemFromCache(oldData as { id: string }[], variables.id)
      },
    },
    toast: {
      successTitle: 'Success',
      successDescription: `${table.slice(0, -1).charAt(0).toUpperCase() + table.slice(1, -1)} permanently deleted`,
      errorContext: table === 'bookings' ? 'booking' : table === 'customers' ? 'customer' : 'general',
    },
    onSuccess,
  })

  return {
    softDelete,
    restore,
    permanentDelete,
  }
}
