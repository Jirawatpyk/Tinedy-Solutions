import { useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { useToast } from '@/hooks/use-toast'

type SoftDeleteTable = 'bookings' | 'customers' | 'teams' | 'service_packages'

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
 */
export function useSoftDelete(table: SoftDeleteTable) {
  const { toast } = useToast()

  /**
   * Soft delete a record (archive)
   * Uses the soft_delete_record RPC function
   */
  const softDelete = useCallback(async (id: string) => {
    try {
      const { error } = await supabase
        .rpc('soft_delete_record', {
          table_name: table,
          record_id: id
        })

      if (error) throw error

      toast({
        title: 'Success',
        description: 'Item archived successfully',
      })

      return { success: true }
    } catch (error) {
      console.error('Soft delete error:', error)
      toast({
        title: 'Error',
        description: 'Failed to archive item',
        variant: 'destructive',
      })
      return { success: false, error }
    }
  }, [table, toast])

  /**
   * Restore a soft-deleted record
   * Clears the deleted_at timestamp
   */
  const restore = useCallback(async (id: string) => {
    try {
      const { error } = await supabase
        .from(table)
        .update({ deleted_at: null })
        .eq('id', id)

      if (error) throw error

      toast({
        title: 'Success',
        description: 'Item restored successfully',
      })

      return { success: true }
    } catch (error) {
      console.error('Restore error:', error)
      toast({
        title: 'Error',
        description: 'Failed to restore item',
        variant: 'destructive',
      })
      return { success: false, error }
    }
  }, [table, toast])

  /**
   * Permanently delete a record
   * Uses the permanent_delete_record RPC function (admin only)
   */
  const permanentDelete = useCallback(async (id: string) => {
    try {
      const { error } = await supabase
        .rpc('permanent_delete_record', {
          table_name: table,
          record_id: id
        })

      if (error) throw error

      toast({
        title: 'Success',
        description: 'Item permanently deleted',
      })

      return { success: true }
    } catch (error) {
      console.error('Permanent delete error:', error)
      toast({
        title: 'Error',
        description: 'Failed to delete item',
        variant: 'destructive',
      })
      return { success: false, error }
    }
  }, [table, toast])

  return {
    softDelete,
    restore,
    permanentDelete,
  }
}
