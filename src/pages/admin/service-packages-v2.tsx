/**
 * Service Packages Management Page (V2)
 *
 * Hybrid management page supporting both V1 (Fixed) and V2 (Tiered) pricing models
 */

import { useEffect, useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/auth-context'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import { Skeleton } from '@/components/ui/skeleton'
import { StatCard } from '@/components/common/StatCard/StatCard'
import { EmptyState } from '@/components/common/EmptyState'
import { ManagerOrAdmin } from '@/components/auth/permission-guard'
import { AppSheet } from '@/components/ui/app-sheet'
import { PackageWizardSheet } from '@/components/service-packages/PackageWizardSheet'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { toast } from 'sonner'
import { Package, Plus, Layers, TrendingUp, DollarSign } from 'lucide-react'
import type { ServicePackageV2WithTiers } from '@/types'
import { PackageCard, PackageFormV2 } from '@/components/service-packages'
import { PricingModel } from '@/types'
import { useServicePackages } from '@/hooks/use-service-packages'
import { packageQueryOptions } from '@/lib/queries/package-queries'
import { PageHeader } from '@/components/common/PageHeader'

export function AdminServicePackagesV2() {
  const { user } = useAuth()

  // React Query - Fetch packages (V1 + V2 unified)
  const { packages: unifiedPackages, loading, error, refresh } = useServicePackages()

  // Filter state
  const [searchQuery, setSearchQuery] = useState('')
  const [typeFilter, setTypeFilter] = useState('all')
  const [pricingModelFilter, setPricingModelFilter] = useState('all')
  const [showArchived, setShowArchived] = useState(false)
  const [isCreateSheetOpen, setIsCreateSheetOpen] = useState(false)
  const [isEditSheetOpen, setIsEditSheetOpen] = useState(false)
  const [editingPackage, setEditingPackage] = useState<ServicePackageV2WithTiers | null>(null)

  // Fetch archived packages (Admin only)
  const {
    data: archivedPackages = [],
    refetch: refetchArchived,
  } = useQuery({
    ...packageQueryOptions.v2WithArchived,
    enabled: showArchived, // Only fetch when checkbox is checked
  })

  // Filter to V2 packages only (Tiered pricing model)
  // When showArchived is true, use archivedPackages (includes all), otherwise use normal packages
  const packagesV2 = useMemo(() => {
    if (showArchived && archivedPackages.length > 0) {
      return archivedPackages.filter(pkg =>
        pkg.pricing_model === PricingModel.Tiered
      ) as ServicePackageV2WithTiers[]
    }
    return unifiedPackages.filter(pkg =>
      pkg.pricing_model === PricingModel.Tiered
    ) as unknown as ServicePackageV2WithTiers[]
  }, [unifiedPackages, archivedPackages, showArchived])

  // Show error toast
  useEffect(() => {
    if (error) {
      toast.error(error)
    }
  }, [error])

  // Calculate statistics (useMemo)
  const stats = useMemo(() => {
    const total = packagesV2.length
    const active = packagesV2.filter((p) => p.is_active).length
    const inactive = total - active
    const tiered = packagesV2.filter((p) => p.pricing_model === PricingModel.Tiered).length

    return { total, active, inactive, tiered }
  }, [packagesV2])

  // Filter packages (useMemo)
  const filteredPackagesV2 = useMemo(() => {
    let filtered = packagesV2

    // Search filter
    if (searchQuery) {
      filtered = filtered.filter((pkg) =>
        pkg.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        pkg.description?.toLowerCase().includes(searchQuery.toLowerCase())
      )
    }

    // Service type filter
    if (typeFilter !== 'all') {
      filtered = filtered.filter((pkg) => pkg.service_type === typeFilter)
    }

    // Pricing model filter
    if (pricingModelFilter === 'fixed') {
      filtered = filtered.filter((pkg) => pkg.pricing_model === PricingModel.Fixed)
    } else if (pricingModelFilter === 'tiered') {
      filtered = filtered.filter((pkg) => pkg.pricing_model === PricingModel.Tiered)
    }

    return filtered
  }, [packagesV2, searchQuery, typeFilter, pricingModelFilter])

  /**
   * Handle Create Package
   */
  const handleCreatePackage = () => {
    setIsCreateSheetOpen(true)
  }

  /**
   * Handle Edit Package
   */
  const handleEditPackage = (pkg: ServicePackageV2WithTiers) => {
    setEditingPackage(pkg)
    setIsEditSheetOpen(true)
  }

  /**
   * Handle Delete Package
   */
  const handleDeletePackage = async (id: string) => {
    try {
      // Delete tiers first
      const { error: tiersError } = await supabase
        .from('package_pricing_tiers')
        .delete()
        .eq('package_id', id)

      if (tiersError) throw tiersError

      // Delete package
      const { error: packageError } = await supabase
        .from('service_packages_v2')
        .delete()
        .eq('id', id)

      if (packageError) throw packageError

      toast.success('Package deleted successfully')

      refresh()
    } catch (error) {
      console.error('Error deleting package:', error)
      const dbError = error as { code?: string }
      if (dbError.code === '23503') {
        toast.error('Cannot delete package that has existing bookings')
      } else {
        toast.error('Failed to delete package')
      }
    }
  }

  /**
   * Handle Toggle Active
   */
  const handleToggleActive = async (pkg: ServicePackageV2WithTiers) => {
    try {
      const { error } = await supabase
        .from('service_packages_v2')
        .update({ is_active: !pkg.is_active })
        .eq('id', pkg.id)

      if (error) throw error

      toast.success(`Package ${!pkg.is_active ? 'activated' : 'deactivated'}`)

      refresh()
    } catch (error) {
      console.error('Toggle active error:', error)
      toast.error('Failed to update package status')
    }
  }

  /**
   * Handle Archive Package (Soft Delete - Manager)
   */
  const handleArchivePackage = async (pkg: ServicePackageV2WithTiers) => {
    try {
      const { error } = await supabase
        .from('service_packages_v2')
        .update({
          deleted_at: new Date().toISOString(),
          deleted_by: user?.id,
        })
        .eq('id', pkg.id)

      if (error) throw error

      toast.success('Package archived successfully')

      refresh()
      if (showArchived) {
        refetchArchived()
      }
    } catch (error) {
      console.error('Archive package error:', error)
      toast.error('Failed to archive package')
    }
  }

  const handleEditSuccess = () => {
    setIsEditSheetOpen(false)
    setEditingPackage(null)
    refresh()
  }

  const handleEditCancel = () => {
    setIsEditSheetOpen(false)
    setEditingPackage(null)
  }

  if (loading) {
    return (
      <div className="space-y-6">
        {/* Header */}
        <PageHeader
          title="Tiered Packages"
          subtitle="Manage cleaning service packages with tiered pricing"
          actions={
            <Button className="bg-tinedy-blue hover:bg-tinedy-blue/90" disabled>
              <Plus className="h-4 w-4 mr-2" />
              New Package
            </Button>
          }
        />

        {/* Stats Skeleton */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <StatCard
              key={i}
              title=""
              value={0}
              isLoading={true}
            />
          ))}
        </div>

        {/* Filters Skeleton */}
        <Card>
          <CardContent className="py-3">
            <div className="flex flex-col sm:flex-row gap-3">
              <Skeleton className="h-8 flex-1" />
              <Skeleton className="h-8 w-full sm:w-48" />
              <Skeleton className="h-8 w-full sm:w-48" />
            </div>
          </CardContent>
        </Card>

        {/* Packages Skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-6 w-48" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-20 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <PageHeader
        title="Tiered Packages"
        subtitle="Manage cleaning service packages with tiered pricing"
        actions={
          <>
            {/* Show Archived - Admin & Manager */}
            <ManagerOrAdmin>
              <div className="flex items-center gap-2">
                <Checkbox
                  id="showArchived"
                  checked={showArchived}
                  onCheckedChange={(checked) => setShowArchived(checked === true)}
                />
                <label
                  htmlFor="showArchived"
                  className="text-xs sm:text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                >
                  Show archived
                </label>
              </div>
            </ManagerOrAdmin>
            <Button
              className="bg-tinedy-blue hover:bg-tinedy-blue/90"
              onClick={handleCreatePackage}
            >
              <Plus className="h-4 w-4 mr-2" />
              New Package
            </Button>
          </>
        }
      />

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Packages"
          value={stats.total}
          icon={Package}
        />

        <StatCard
          title="Active"
          value={stats.active}
          icon={TrendingUp}
          iconColor="text-green-600"
        />

        <StatCard
          title="Inactive"
          value={stats.inactive}
          icon={DollarSign}
          iconColor="text-muted-foreground"
        />

        <StatCard
          title="Tiered Pricing"
          value={stats.tiered}
          icon={Layers}
          iconColor="text-blue-600"
        />
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="py-3">
          <div className="flex flex-col sm:flex-row gap-3">
            {/* Search */}
            <Input
              placeholder="Search packages..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex-1 h-8 text-xs"
            />

            {/* Service Type Filter */}
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-full sm:w-48 h-8 text-xs">
                <SelectValue placeholder="All Types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="cleaning">Cleaning</SelectItem>
                <SelectItem value="training">Training</SelectItem>
              </SelectContent>
            </Select>

            {/* Pricing Model Filter */}
            <Select value={pricingModelFilter} onValueChange={setPricingModelFilter}>
              <SelectTrigger className="w-full sm:w-48 h-8 text-xs">
                <SelectValue placeholder="All Pricing" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Pricing</SelectItem>
                <SelectItem value="fixed">Fixed Price</SelectItem>
                <SelectItem value="tiered">Tiered Price</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Packages Grid */}
      {filteredPackagesV2.length === 0 ? (
        <Card>
          <CardContent>
            <EmptyState
              icon={Package}
              title="No packages found"
              description="Create your first package to get started."
              action={{
                label: 'Create Package',
                onClick: handleCreatePackage,
                icon: Plus,
              }}
            />
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredPackagesV2.map((pkg) => (
            <PackageCard
              key={pkg.id}
              package={pkg}
              onEdit={handleEditPackage}
              onArchive={handleArchivePackage}
              onDelete={handleDeletePackage}
              onToggleActive={handleToggleActive}
              showActions={true}
              isArchived={!!pkg.deleted_at}
            />
          ))}
        </div>
      )}

      {/* Create Package — Wizard Sheet */}
      <PackageWizardSheet
        open={isCreateSheetOpen}
        onOpenChange={setIsCreateSheetOpen}
        onSuccess={refresh}
      />

      {/* Edit Package — AppSheet */}
      <AppSheet
        open={isEditSheetOpen}
        onOpenChange={(open) => {
          if (!open) handleEditCancel()
        }}
        title="Edit Package"
        description="Update package information and pricing"
        size="lg"
      >
        {editingPackage && (
          <PackageFormV2
            package={editingPackage}
            packageSource="v2"
            onSuccess={handleEditSuccess}
            onCancel={handleEditCancel}
            showCancel={true}
          />
        )}
      </AppSheet>
    </div>
  )
}
