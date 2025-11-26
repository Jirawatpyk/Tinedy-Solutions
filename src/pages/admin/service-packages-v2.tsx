/**
 * Service Packages Management Page (V2)
 *
 * Hybrid management page supporting both V1 (Fixed) and V2 (Tiered) pricing models
 */

import { useEffect, useState, useMemo } from 'react'
import { supabase } from '@/lib/supabase'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { StatCard } from '@/components/common/StatCard/StatCard'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useToast } from '@/hooks/use-toast'
import { Package, Plus, Layers, TrendingUp, DollarSign } from 'lucide-react'
import type { ServicePackageV2WithTiers } from '@/types'
import { PackageCard, PackageFormV2 } from '@/components/service-packages'
import { PricingModel } from '@/types'
import { useServicePackages } from '@/hooks/useServicePackages'

export function AdminServicePackagesV2() {
  const { toast } = useToast()

  // React Query - Fetch packages (V1 + V2 unified)
  const { packages: unifiedPackages, loading, error, refresh } = useServicePackages()

  // Filter to V2 packages only (Tiered pricing model)
  const packagesV2 = useMemo(() => {
    return unifiedPackages.filter(pkg =>
      pkg.pricing_model === PricingModel.Tiered
    ) as unknown as ServicePackageV2WithTiers[]
  }, [unifiedPackages])

  // Filter state
  const [searchQuery, setSearchQuery] = useState('')
  const [typeFilter, setTypeFilter] = useState('all')
  const [pricingModelFilter, setPricingModelFilter] = useState('all')
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingPackage, setEditingPackage] = useState<ServicePackageV2WithTiers | null>(null)

  // Show error toast
  useEffect(() => {
    if (error) {
      toast({
        title: 'Error',
        description: error,
        variant: 'destructive',
      })
    }
  }, [error, toast])

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
    setEditingPackage(null)
    setIsDialogOpen(true)
  }

  /**
   * Handle Edit Package
   */
  const handleEditPackage = (pkg: ServicePackageV2WithTiers) => {
    setEditingPackage(pkg)
    setIsDialogOpen(true)
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

      toast({
        title: 'Success',
        description: 'Package deleted successfully',
      })

      refresh()
    } catch (error) {
      console.error('Error deleting package:', error)
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
          description: 'Failed to delete package',
          variant: 'destructive',
        })
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

      toast({
        title: 'Success',
        description: `Package ${!pkg.is_active ? 'activated' : 'deactivated'}`,
      })

      refresh()
    } catch (error) {
      console.error('Toggle active error:', error)
      toast({
        title: 'Error',
        description: 'Failed to update package status',
        variant: 'destructive',
      })
    }
  }

  /**
   * Handle Form Success
   */
  const handleFormSuccess = () => {
    setIsDialogOpen(false)
    setEditingPackage(null)
    refresh()
  }

  /**
   * Handle Form Cancel
   */
  const handleFormCancel = () => {
    setIsDialogOpen(false)
    setEditingPackage(null)
  }

  if (loading) {
    return (
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <p className="text-sm text-muted-foreground">
            Manage cleaning service packages with tiered pricing
          </p>
          <Button className="bg-tinedy-blue hover:bg-tinedy-blue/90" disabled>
            <Plus className="h-4 w-4 mr-2" />
            New Package
          </Button>
        </div>

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
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 min-h-[40px]">
        <p className="text-sm text-muted-foreground">
          Manage cleaning service packages with tiered pricing
        </p>
        <Button
          className="bg-tinedy-blue hover:bg-tinedy-blue/90"
          onClick={handleCreatePackage}
        >
          <Plus className="h-4 w-4 mr-2" />
          New Package
        </Button>
      </div>

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
          iconColor="text-gray-400"
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
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <Package className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground mb-4">
              No packages found. Create your first package to get started.
            </p>
            <Button variant="outline" onClick={handleCreatePackage}>
              <Plus className="h-4 w-4 mr-2" />
              Create Package
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredPackagesV2.map((pkg) => (
            <PackageCard
              key={pkg.id}
              package={pkg}
              onEdit={handleEditPackage}
              onDelete={handleDeletePackage}
              onToggleActive={handleToggleActive}
              showActions={true}
            />
          ))}
        </div>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingPackage ? 'Edit Package' : 'Create New Package'}
            </DialogTitle>
            <DialogDescription>
              {editingPackage
                ? 'Update package information and pricing'
                : 'Create a new service package with tiered pricing'}
            </DialogDescription>
          </DialogHeader>

          <PackageFormV2
            package={editingPackage}
            onSuccess={handleFormSuccess}
            onCancel={handleFormCancel}
            showCancel={true}
          />
        </DialogContent>
      </Dialog>
    </div>
  )
}
