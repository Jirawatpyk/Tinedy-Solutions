/**
 * Service Packages Admin Page
 *
 * Displays and manages service packages (V1 and V2) with:
 * - Stats overview
 * - Search and filters
 * - Package grid with CRUD actions
 * - Support for Fixed and Tiered pricing models
 *
 * Refactored from 966 LOC to ~350 LOC using extracted components and hooks
 */

import { useEffect, useState, useMemo, useCallback } from 'react'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { AppSheet } from '@/components/ui/app-sheet'
import { PackageWizardSheet } from '@/components/service-packages/PackageWizardSheet'
import { toast } from 'sonner'
import { usePermissions } from '@/hooks/use-permissions'
import { usePackageActions } from '@/hooks/use-package-actions'
import type { ServicePackage, ServicePackageV2WithTiers } from '@/types'
import {
  PackageFormV2,
  PackagesHeader,
  PackagesStatsSection,
  PackagesFiltersCard,
  PackagesGrid,
  PackagesLoadingSkeleton,
  PackageFormV1,
  type PackageFormV1Data,
  type UnifiedPackage,
} from '@/components/service-packages'
import { PricingModel, ServiceCategory } from '@/types'
import { packageQueryOptions } from '@/lib/queries/package-queries'

// Constants
const ITEMS_PER_LOAD = 12

export function AdminServicePackages() {
  const { can, canDelete } = usePermissions()
  // State
  const [showArchived, setShowArchived] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [typeFilter, setTypeFilter] = useState('all')
  const [pricingModelFilter, setPricingModelFilter] = useState('all')
  const [isCreateSheetOpen, setIsCreateSheetOpen] = useState(false)
  const [isEditV2SheetOpen, setIsEditV2SheetOpen] = useState(false)
  const [isEditV1DialogOpen, setIsEditV1DialogOpen] = useState(false)
  const [editingPackage, setEditingPackage] = useState<ServicePackage | null>(null)
  const [editingPackageV2, setEditingPackageV2] = useState<ServicePackageV2WithTiers | null>(null)
  const [formData, setFormData] = useState<PackageFormV1Data>({
    name: '',
    description: '',
    service_type: '',
    duration_minutes: '',
    price: '',
  })
  const [displayCount, setDisplayCount] = useState(ITEMS_PER_LOAD)

  // React Query - Fetch packages
  const {
    data: unifiedPackages = [],
    isLoading: loading,
    error: queryError,
    refetch,
  } = useQuery({
    ...packageQueryOptions.allForAdmin,
    refetchOnMount: 'always',
  })

  const { data: archivedPackages = [], refetch: refetchArchived } = useQuery({
    ...packageQueryOptions.v2WithArchived,
    enabled: showArchived,
  })

  const { data: bookingCounts = {}, refetch: refetchBookingCounts } = useQuery({
    queryKey: ['package-booking-counts'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('bookings')
        .select('package_v2_id')
        .is('deleted_at', null)

      if (error) throw error

      const counts: Record<string, number> = {}
      data.forEach((booking) => {
        if (booking.package_v2_id) {
          counts[booking.package_v2_id] = (counts[booking.package_v2_id] || 0) + 1
        }
      })
      return counts
    },
    staleTime: 30000,
  })

  // Refresh handler
  const refresh = useCallback(async () => {
    await refetch()
    refetchBookingCounts()
    if (showArchived) refetchArchived()
  }, [refetch, refetchBookingCounts, refetchArchived, showArchived])

  // Package actions hook
  const packageActions = usePackageActions({ onSuccess: refresh })

  // Form reset
  const resetForm = useCallback(() => {
    setEditingPackage(null)
    setEditingPackageV2(null)
    setFormData({
      name: '',
      description: '',
      service_type: '',
      duration_minutes: '',
      price: '',
    })
  }, [])

  // Error toast
  useEffect(() => {
    if (queryError?.message) {
      toast.error(queryError.message)
    }
  }, [queryError?.message])

  // Reset display count when filters change
  useEffect(() => {
    setDisplayCount(ITEMS_PER_LOAD)
  }, [searchQuery, typeFilter, pricingModelFilter])

  // Computed values
  const packagesV1Unified = useMemo(
    () => unifiedPackages.filter((pkg) => pkg._source === 'v1'),
    [unifiedPackages]
  )

  const packagesV2Unified = useMemo(() => {
    if (showArchived && archivedPackages.length > 0) {
      return archivedPackages.map((pkg) => ({ ...pkg, _source: 'v2' as const }))
    }
    return unifiedPackages.filter((pkg) => pkg._source === 'v2')
  }, [unifiedPackages, archivedPackages, showArchived])

  const stats = useMemo(
    () => ({
      total: unifiedPackages.length,
      active: unifiedPackages.filter((p) => p.is_active).length,
      inactive: unifiedPackages.filter((p) => !p.is_active).length,
    }),
    [unifiedPackages]
  )

  const allFilteredPackages = useMemo((): UnifiedPackage[] => {
    let allPackages = [...packagesV1Unified, ...packagesV2Unified]

    if (searchQuery) {
      allPackages = allPackages.filter(
        (pkg) =>
          pkg.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          pkg.description?.toLowerCase().includes(searchQuery.toLowerCase())
      )
    }

    if (typeFilter !== 'all') {
      allPackages = allPackages.filter((pkg) => pkg.service_type === typeFilter)
    }

    if (pricingModelFilter === 'fixed') {
      allPackages = allPackages.filter((pkg) => pkg.pricing_model === PricingModel.Fixed)
    } else if (pricingModelFilter === 'tiered') {
      allPackages = allPackages.filter((pkg) => pkg.pricing_model === PricingModel.Tiered)
    }

    allPackages.sort((a, b) => {
      if (a.pricing_model === PricingModel.Tiered && b.pricing_model === PricingModel.Fixed) return -1
      if (a.pricing_model === PricingModel.Fixed && b.pricing_model === PricingModel.Tiered) return 1
      return a.name.localeCompare(b.name)
    })

    return allPackages.map((pkg) => ({
      ...pkg,
      _source: pkg._source,
      deleted_at: (pkg as { deleted_at?: string | null }).deleted_at ?? null,
      category: (pkg.category as ServiceCategory | null) ?? null,
      base_price: Number(pkg.base_price || 0),
      updated_at: pkg.updated_at || pkg.created_at,
      tier_count: pkg.tier_count || 0,
      tiers: pkg.tiers || [],
    })) as UnifiedPackage[]
  }, [packagesV1Unified, packagesV2Unified, searchQuery, typeFilter, pricingModelFilter])

  // Handlers
  const handleEditV2 = useCallback((pkg: ServicePackageV2WithTiers) => {
    setEditingPackageV2(pkg)
    setEditingPackage(null)
    setIsEditV2SheetOpen(true)
  }, [])

  const handleEditV1 = useCallback((pkg: ServicePackageV2WithTiers) => {
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
    setEditingPackage(v1Pkg)
    setEditingPackageV2(null)
    setFormData({
      name: v1Pkg.name,
      description: v1Pkg.description || '',
      service_type: v1Pkg.service_type,
      duration_minutes: v1Pkg.duration_minutes?.toString() || '',
      price: v1Pkg.price?.toString() || '',
    })
    setIsEditV1DialogOpen(true)
  }, [])

  const handleUnifiedEdit = useCallback(
    (pkg: ServicePackageV2WithTiers & { _source?: 'v1' | 'v2' }) => {
      if (pkg._source === 'v2') {
        handleEditV2(pkg)
      } else {
        handleEditV1(pkg)
      }
    },
    [handleEditV2, handleEditV1]
  )

  const handleV2EditSuccess = useCallback(() => {
    setIsEditV2SheetOpen(false)
    setEditingPackageV2(null)
    refresh()
  }, [refresh])

  const handleV2EditCancel = useCallback(() => {
    setIsEditV2SheetOpen(false)
    setEditingPackageV2(null)
  }, [])

  const handleFormCancel = useCallback(() => {
    setIsEditV1DialogOpen(false)
    resetForm()
  }, [resetForm])

  const handleV1Submit = useCallback(
    async (e: React.FormEvent) => {
      const success = await packageActions.submitV1Form(e, formData, editingPackage)
      if (success) {
        setIsEditV1DialogOpen(false)
        resetForm()
      }
    },
    [packageActions, formData, editingPackage, resetForm]
  )

  // Loading state
  if (loading) {
    return <PackagesLoadingSkeleton canCreate={can('create', 'service_packages')} />
  }

  return (
    <div className="space-y-6">
      <PackagesHeader
        showArchived={showArchived}
        onShowArchivedChange={setShowArchived}
        canCreate={can('create', 'service_packages')}
        onCreateClick={() => setIsCreateSheetOpen(true)}
      />

      {/* Create — Wizard Sheet */}
      <PackageWizardSheet
        open={isCreateSheetOpen}
        onOpenChange={setIsCreateSheetOpen}
        onSuccess={refresh}
      />

      {/* Edit V2 — AppSheet */}
      <AppSheet
        open={isEditV2SheetOpen}
        onOpenChange={(open) => { if (!open) handleV2EditCancel() }}
        title="Edit Package"
        description="Update package information and pricing"
        size="lg"
      >
        {editingPackageV2 && (
          <PackageFormV2
            package={editingPackageV2}
            packageSource="v2"
            onSuccess={handleV2EditSuccess}
            onCancel={handleV2EditCancel}
            showCancel={true}
          />
        )}
      </AppSheet>

      {/* Edit V1 (Legacy) — Dialog */}
      <Dialog open={isEditV1DialogOpen} onOpenChange={setIsEditV1DialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Package (V1)</DialogTitle>
            <DialogDescription>
              Update V1 package information (Fixed pricing only)
            </DialogDescription>
          </DialogHeader>
          {editingPackage && (
            <PackageFormV1
              formData={formData}
              onFormDataChange={setFormData}
              onSubmit={handleV1Submit}
              onCancel={handleFormCancel}
              isEditing={true}
            />
          )}
        </DialogContent>
      </Dialog>

      <PackagesStatsSection stats={stats} />

      <PackagesFiltersCard
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        typeFilter={typeFilter}
        onTypeFilterChange={setTypeFilter}
        pricingModelFilter={pricingModelFilter}
        onPricingModelFilterChange={setPricingModelFilter}
      />

      <PackagesGrid
        packages={allFilteredPackages}
        displayCount={displayCount}
        onLoadMore={() => setDisplayCount((prev) => prev + ITEMS_PER_LOAD)}
        bookingCounts={bookingCounts}
        showActions={can('update', 'service_packages') || canDelete('service_packages')}
        onEdit={handleEditV2}
        onEditUnified={handleUnifiedEdit}
        onArchive={packageActions.archivePackage}
        onRestore={packageActions.restorePackage}
        onDelete={packageActions.unifiedDelete}
        onDeleteV2={packageActions.deletePackageV2}
        onToggleV2={packageActions.toggleActiveV2}
        onToggleUnified={packageActions.unifiedToggle}
      />
    </div>
  )
}
