/**
 * usePackageActions Hook
 *
 * Centralized hook for service package CRUD operations.
 * Handles both V1 and V2 package actions including:
 * - Create/Update packages
 * - Toggle active status
 * - Delete packages (with booking count check)
 * - Archive/Restore (soft delete for V2 only)
 *
 * @module hooks/use-package-actions
 */

import { useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { useToast } from '@/hooks/use-toast'
import { useAuth } from '@/contexts/auth-context'
import type { ServicePackage, ServicePackageV2WithTiers } from '@/types'
import type { PackageFormV1Data } from '@/components/service-packages'

interface UsePackageActionsOptions {
  onSuccess?: () => void
}

interface UsePackageActionsReturn {
  // V1 Actions
  submitV1Form: (
    e: React.FormEvent,
    formData: PackageFormV1Data,
    editingPackage: ServicePackage | null
  ) => Promise<boolean>
  toggleActiveV1: (pkg: ServicePackage) => Promise<void>
  deletePackageV1: (id: string) => Promise<void>

  // V2 Actions
  toggleActiveV2: (pkg: ServicePackageV2WithTiers) => Promise<void>
  deletePackageV2: (id: string) => Promise<void>
  archivePackage: (pkg: ServicePackageV2WithTiers) => Promise<void>
  restorePackage: (pkg: ServicePackageV2WithTiers) => Promise<void>

  // Unified Actions
  unifiedDelete: (id: string, source?: 'v1' | 'v2') => Promise<void>
  unifiedToggle: (pkg: ServicePackageV2WithTiers & { _source?: 'v1' | 'v2' }) => Promise<void>
}

/**
 * Hook for managing service package CRUD operations
 */
export function usePackageActions(options: UsePackageActionsOptions = {}): UsePackageActionsReturn {
  const { onSuccess } = options
  const { toast } = useToast()
  const { user } = useAuth()

  // V1 Form Submit
  const submitV1Form = useCallback(
    async (
      e: React.FormEvent,
      formData: PackageFormV1Data,
      editingPackage: ServicePackage | null
    ): Promise<boolean> => {
      e.preventDefault()

      try {
        const packageData = {
          name: formData.name,
          description: formData.description || null,
          service_type: formData.service_type,
          duration_minutes: parseInt(formData.duration_minutes),
          price: parseFloat(formData.price),
          is_active: true,
        }

        if (editingPackage) {
          const { error } = await supabase
            .from('service_packages')
            .update(packageData)
            .eq('id', editingPackage.id)

          if (error) throw error
          toast({ title: 'Success', description: 'Package updated successfully' })
        } else {
          const { error } = await supabase.from('service_packages').insert(packageData)
          if (error) throw error
          toast({ title: 'Success', description: 'Package created successfully' })
        }

        onSuccess?.()
        return true
      } catch {
        toast({
          title: 'Error',
          description: 'Failed to save package',
          variant: 'destructive',
        })
        return false
      }
    },
    [toast, onSuccess]
  )

  // V1 Toggle Active
  const toggleActiveV1 = useCallback(
    async (pkg: ServicePackage) => {
      try {
        const { error } = await supabase
          .from('service_packages')
          .update({ is_active: !pkg.is_active })
          .eq('id', pkg.id)

        if (error) throw error
        toast({
          title: 'Success',
          description: `Package ${!pkg.is_active ? 'activated' : 'deactivated'}`,
        })
        onSuccess?.()
      } catch {
        toast({
          title: 'Error',
          description: 'Failed to update package status',
          variant: 'destructive',
        })
      }
    },
    [toast, onSuccess]
  )

  // V1 Delete
  const deletePackageV1 = useCallback(
    async (id: string) => {
      try {
        const { error } = await supabase.from('service_packages').delete().eq('id', id)
        if (error) throw error
        toast({ title: 'Success', description: 'Package deleted successfully' })
        onSuccess?.()
      } catch (error) {
        console.error('Delete package error:', error)
        const dbError = error as { code?: string }
        if (dbError.code === '23503') {
          toast({
            title: 'Error',
            description: 'Cannot delete package that has existing bookings',
            variant: 'destructive',
          })
        } else {
          toast({
            title: 'Error',
            description: error instanceof Error ? error.message : 'Failed to delete package',
            variant: 'destructive',
          })
        }
      }
    },
    [toast, onSuccess]
  )

  // V2 Toggle Active
  const toggleActiveV2 = useCallback(
    async (pkg: ServicePackageV2WithTiers) => {
      try {
        const { error } = await supabase
          .from('service_packages_v2')
          .update({ is_active: !pkg.is_active })
          .eq('id', pkg.id)

        if (error) throw error
        toast({
          title: 'Success',
          description: `Package ${!pkg.is_active ? 'activated' : 'deactivated'}`,
        })
        onSuccess?.()
      } catch {
        toast({
          title: 'Error',
          description: 'Failed to update package status',
          variant: 'destructive',
        })
      }
    },
    [toast, onSuccess]
  )

  // V2 Delete
  const deletePackageV2 = useCallback(
    async (id: string) => {
      try {
        const { count: bookingCount, error: countError } = await supabase
          .from('bookings')
          .select('*', { count: 'exact', head: true })
          .eq('package_v2_id', id)

        if (countError) throw countError

        if (bookingCount && bookingCount > 0) {
          toast({
            title: 'Cannot Delete',
            description: `This package has ${bookingCount} booking(s). Cannot delete packages with existing bookings.`,
            variant: 'destructive',
          })
          return
        }

        await supabase.from('package_pricing_tiers').delete().eq('package_id', id)
        const { error: packageError } = await supabase
          .from('service_packages_v2')
          .delete()
          .eq('id', id)

        if (packageError) throw packageError
        toast({ title: 'Success', description: 'Package deleted successfully' })
        onSuccess?.()
      } catch (error) {
        console.error('Delete V2 package error:', error)
        const dbError = error as { code?: string }
        if (dbError.code === '23503') {
          toast({
            title: 'Error',
            description: 'Cannot delete package that has existing bookings',
            variant: 'destructive',
          })
        } else {
          toast({
            title: 'Error',
            description: error instanceof Error ? error.message : 'Failed to delete package',
            variant: 'destructive',
          })
        }
      }
    },
    [toast, onSuccess]
  )

  // Archive (soft delete)
  const archivePackage = useCallback(
    async (pkg: ServicePackageV2WithTiers) => {
      try {
        const { error } = await supabase
          .from('service_packages_v2')
          .update({
            deleted_at: new Date().toISOString(),
            deleted_by: user?.id,
          })
          .eq('id', pkg.id)

        if (error) throw error
        toast({ title: 'Success', description: 'Package archived successfully' })
        onSuccess?.()
      } catch (error) {
        console.error('Archive package error:', error)
        toast({
          title: 'Error',
          description: 'Failed to archive package',
          variant: 'destructive',
        })
      }
    },
    [toast, onSuccess, user?.id]
  )

  // Restore
  const restorePackage = useCallback(
    async (pkg: ServicePackageV2WithTiers) => {
      try {
        const { error } = await supabase
          .from('service_packages_v2')
          .update({ deleted_at: null, deleted_by: null })
          .eq('id', pkg.id)

        if (error) throw error
        toast({ title: 'Success', description: 'Package restored successfully' })
        onSuccess?.()
      } catch (error) {
        console.error('Restore package error:', error)
        toast({
          title: 'Error',
          description: 'Failed to restore package',
          variant: 'destructive',
        })
      }
    },
    [toast, onSuccess]
  )

  // Unified Delete
  const unifiedDelete = useCallback(
    async (id: string, source?: 'v1' | 'v2') => {
      if (source === 'v2') {
        await deletePackageV2(id)
      } else if (source === 'v1') {
        await deletePackageV1(id)
      } else {
        const { data: v2Pkg } = await supabase
          .from('service_packages_v2')
          .select('id')
          .eq('id', id)
          .single()

        if (v2Pkg) {
          await deletePackageV2(id)
        } else {
          await deletePackageV1(id)
        }
      }
    },
    [deletePackageV2, deletePackageV1]
  )

  // Unified Toggle
  const unifiedToggle = useCallback(
    async (pkg: ServicePackageV2WithTiers & { _source?: 'v1' | 'v2' }) => {
      if (pkg._source === 'v2') {
        await toggleActiveV2(pkg)
      } else {
        const v1Pkg: ServicePackage = {
          id: pkg.id,
          name: pkg.name,
          description: pkg.description || '',
          service_type: pkg.service_type,
          duration_minutes: pkg.duration_minutes || 0,
          price: pkg.base_price || 0,
          is_active: pkg.is_active,
          created_at: pkg.created_at,
        }
        await toggleActiveV1(v1Pkg)
      }
    },
    [toggleActiveV2, toggleActiveV1]
  )

  return {
    submitV1Form,
    toggleActiveV1,
    deletePackageV1,
    toggleActiveV2,
    deletePackageV2,
    archivePackage,
    restorePackage,
    unifiedDelete,
    unifiedToggle,
  }
}
