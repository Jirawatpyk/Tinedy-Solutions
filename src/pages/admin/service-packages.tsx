import { useEffect, useState, useMemo } from 'react'
import { supabase } from '@/lib/supabase'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
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
import { usePermissions } from '@/hooks/use-permissions'
import { Package, Plus, CheckCircle, XCircle } from 'lucide-react'
import type { ServicePackage, ServicePackageV2WithTiers } from '@/types'
import { PackageCard, PackageFormV2 } from '@/components/service-packages'
import { PricingModel, ServiceCategory } from '@/types'
import { useServicePackages } from '@/hooks/useServicePackages'

export function AdminServicePackages() {
  // Permission checks
  const { can, canDelete } = usePermissions()

  // React Query - Fetch packages (V1 + V2 unified)
  const { packages: unifiedPackages, loading, error, refresh } = useServicePackages()

  // Separate V1 and V2 packages (keep as UnifiedServicePackage for type safety)
  const packagesV1Unified = useMemo(() => {
    return unifiedPackages.filter(pkg => pkg.pricing_model === PricingModel.Fixed)
  }, [unifiedPackages])

  const packagesV2Unified = useMemo(() => {
    return unifiedPackages.filter(pkg => pkg.pricing_model === PricingModel.Tiered)
  }, [unifiedPackages])

  // Filter state
  const [searchQuery, setSearchQuery] = useState('')
  const [typeFilter, setTypeFilter] = useState('all')
  const [pricingModelFilter, setPricingModelFilter] = useState('all') // 'all', 'fixed', 'tiered'
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingPackage, setEditingPackage] = useState<ServicePackage | null>(null)
  const [editingPackageV2, setEditingPackageV2] = useState<ServicePackageV2WithTiers | null>(null)
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    service_type: '',
    duration_minutes: '',
    price: '',
  })

  // Pagination
  const [displayCount, setDisplayCount] = useState(12)
  const ITEMS_PER_LOAD = 12

  const { toast } = useToast()

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

  // Calculate stats (moved to useMemo for better performance)
  const stats = useMemo(() => {
    const total = unifiedPackages.length
    const active = unifiedPackages.filter((p) => p.is_active).length
    const inactive = total - active

    return { total, active, inactive }
  }, [unifiedPackages])

  // Filter packages (moved to useMemo)
  const { filteredPackages, filteredPackagesV2 } = useMemo(() => {
    // Filter V1 Packages
    let filteredV1 = packagesV1Unified

    if (searchQuery) {
      filteredV1 = filteredV1.filter((pkg) =>
        pkg.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        pkg.description?.toLowerCase().includes(searchQuery.toLowerCase())
      )
    }

    if (typeFilter !== 'all') {
      filteredV1 = filteredV1.filter((pkg) => pkg.service_type === typeFilter)
    }

    // V1 packages are all "fixed" pricing
    if (pricingModelFilter === 'tiered') {
      filteredV1 = [] // Hide V1 when filtering for tiered only
    }

    // Filter V2 Packages
    let filteredV2 = packagesV2Unified

    if (searchQuery) {
      filteredV2 = filteredV2.filter((pkg) =>
        pkg.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        pkg.description?.toLowerCase().includes(searchQuery.toLowerCase())
      )
    }

    if (typeFilter !== 'all') {
      filteredV2 = filteredV2.filter((pkg) => pkg.service_type === typeFilter)
    }

    if (pricingModelFilter === 'fixed') {
      filteredV2 = filteredV2.filter((pkg) => pkg.pricing_model === PricingModel.Fixed)
    } else if (pricingModelFilter === 'tiered') {
      filteredV2 = filteredV2.filter((pkg) => pkg.pricing_model === PricingModel.Tiered)
    }

    return { filteredPackages: filteredV1, filteredPackagesV2: filteredV2 }
  }, [packagesV1Unified, packagesV2Unified, searchQuery, typeFilter, pricingModelFilter])

  // Reset display count when filters change
  useEffect(() => {
    setDisplayCount(ITEMS_PER_LOAD)
  }, [searchQuery, typeFilter, pricingModelFilter, ITEMS_PER_LOAD])

  const handleSubmit = async (e: React.FormEvent) => {
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

        toast({
          title: 'Success',
          description: 'Package updated successfully',
        })
      } else {
        const { error } = await supabase
          .from('service_packages')
          .insert(packageData)

        if (error) throw error

        toast({
          title: 'Success',
          description: 'Package created successfully',
        })
      }

      setIsDialogOpen(false)
      resetForm()
      refresh()
    } catch {
      toast({
        title: 'Error',
        description: 'Failed to save package',
        variant: 'destructive',
      })
    }
  }

  // V1 handleEdit removed - using handleUnifiedEdit instead

  const toggleActive = async (pkg: ServicePackage) => {
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
      refresh()
    } catch {
      toast({
        title: 'Error',
        description: 'Failed to update package status',
        variant: 'destructive',
      })
    }
  }

  const deletePackage = async (id: string) => {
    try {
      const { error } = await supabase
        .from('service_packages')
        .delete()
        .eq('id', id)

      if (error) throw error

      toast({
        title: 'Success',
        description: 'Package deleted successfully',
      })
      refresh()
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
  }

  const resetForm = () => {
    setEditingPackage(null)
    setEditingPackageV2(null)
    setFormData({
      name: '',
      description: '',
      service_type: '',
      duration_minutes: '',
      price: '',
    })
  }

  /**
   * Handle Edit V2 Package
   */
  const handleEditV2 = (pkg: ServicePackageV2WithTiers) => {
    setEditingPackageV2(pkg)
    setEditingPackage(null) // Clear V1 editing
    setIsDialogOpen(true)
  }

  /**
   * Handle Delete V2 Package
   */
  const deletePackageV2 = async (id: string) => {
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
  }

  /**
   * Handle Toggle Active V2 Package
   */
  const toggleActiveV2 = async (pkg: ServicePackageV2WithTiers) => {
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
    } catch {
      toast({
        title: 'Error',
        description: 'Failed to update package status',
        variant: 'destructive',
      })
    }
  }

  /**
   * Unified handlers for PackageCard (handles both V1 and V2)
   */
  const handleUnifiedEdit = (pkg: ServicePackageV2WithTiers) => {
    if (pkg.pricing_model === PricingModel.Fixed && 'price' in pkg) {
      // It's actually a V1 package converted to V2 format - shouldn't happen
      // But if it does, just open V2 edit mode with the data
      handleEditV2(pkg)
    } else {
      handleEditV2(pkg)
    }
  }

  const handleUnifiedDelete = async (id: string) => {
    // Try V2 first (check if it exists in V2)
    const { data: v2Pkg } = await supabase
      .from('service_packages_v2')
      .select('id')
      .eq('id', id)
      .single()

    if (v2Pkg) {
      await deletePackageV2(id)
    } else {
      await deletePackage(id)
    }
  }

  const handleUnifiedToggle = (pkg: ServicePackageV2WithTiers) => {
    if (pkg.pricing_model === PricingModel.Tiered) {
      toggleActiveV2(pkg)
    } else {
      // Convert V2 format back to V1 for toggle
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
      toggleActive(v1Pkg)
    }
  }

  /**
   * Handle Form Success (for V2 form)
   */
  const handleFormSuccess = () => {
    setIsDialogOpen(false)
    resetForm()
    refresh()
  }

  /**
   * Handle Form Cancel (for V2 form)
   */
  const handleFormCancel = () => {
    setIsDialogOpen(false)
    resetForm()
  }

  if (loading) {
    return (
      <div className="space-y-6">
        {/* Page header - Always show */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <p className="text-sm text-muted-foreground">
            Manage cleaning and training service packages
          </p>
          {can('create', 'service_packages') && (
            <Button className="bg-tinedy-blue hover:bg-tinedy-blue/90" disabled>
              <Plus className="h-4 w-4 mr-2" />
              New Package
            </Button>
          )}
        </div>

        {/* Stats cards skeleton */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <StatCard
              key={i}
              title=""
              value={0}
              isLoading={true}
            />
          ))}
        </div>

        {/* Filters skeleton */}
        <Card>
          <CardContent className="py-3">
            <div className="flex flex-col sm:flex-row gap-3">
              <Skeleton className="h-8 flex-1" />
              <Skeleton className="h-8 w-full sm:w-48" />
              <Skeleton className="h-8 w-full sm:w-48" />
            </div>
          </CardContent>
        </Card>

        {/* Package cards skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-5 w-40" />
                    <div className="flex items-center gap-2">
                      <Skeleton className="h-5 w-20 rounded-full" />
                      <Skeleton className="h-5 w-16 rounded-full" />
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <Skeleton className="h-10 w-full" />
                <div className="flex items-center gap-4">
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-4 w-16" />
                </div>
                <div className="flex gap-2 pt-2">
                  <Skeleton className="h-8 flex-1" />
                  <Skeleton className="h-8 w-8" />
                  <Skeleton className="h-8 w-8" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 min-h-[40px]">
        <p className="text-sm text-muted-foreground">
          Manage cleaning and training service packages
        </p>
        {can('create', 'service_packages') && (
          <Button
            className="bg-tinedy-blue hover:bg-tinedy-blue/90"
            onClick={() => {
              resetForm()
              setIsDialogOpen(true)
            }}
          >
            <Plus className="h-4 w-4 mr-2" />
            New Package
          </Button>
        )}
      </div>

      {/* Create/Edit Dialog with V2 Form */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingPackageV2 ? 'Edit Package' : editingPackage ? 'Edit Package (V1)' : 'Create New Package'}
            </DialogTitle>
            <DialogDescription>
              {editingPackageV2
                ? 'Update package information and pricing'
                : editingPackage
                  ? 'Update V1 package information (Fixed pricing only)'
                  : 'Create a new service package with tiered pricing'}
            </DialogDescription>
          </DialogHeader>

          {/* Use V2 Form for new packages and V2 editing */}
          {(editingPackageV2 || !editingPackage) && (
            <PackageFormV2
              package={editingPackageV2}
              onSuccess={handleFormSuccess}
              onCancel={handleFormCancel}
              showCancel={true}
            />
          )}

          {/* Use old V1 Form for editing V1 packages */}
          {editingPackage && !editingPackageV2 && (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="name">Package Name *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) =>
                      setFormData({ ...formData, name: e.target.value })
                    }
                    placeholder="e.g., Basic House Cleaning"
                    required
                  />
                </div>

                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="description">Description</Label>
                  <textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) =>
                      setFormData({ ...formData, description: e.target.value })
                    }
                    placeholder="Package details..."
                    className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="service_type">Service Type *</Label>
                  <Select
                    value={formData.service_type}
                    onValueChange={(value) =>
                      setFormData({ ...formData, service_type: value })
                    }
                    required
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="cleaning">Cleaning</SelectItem>
                      <SelectItem value="training">Training</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="duration_minutes">Duration (minutes) *</Label>
                  <Input
                    id="duration_minutes"
                    type="number"
                    min="1"
                    value={formData.duration_minutes}
                    onChange={(e) =>
                      setFormData({ ...formData, duration_minutes: e.target.value })
                    }
                    placeholder="e.g., 120"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="price">Price (฿) *</Label>
                  <Input
                    id="price"
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.price}
                    onChange={(e) =>
                      setFormData({ ...formData, price: e.target.value })
                    }
                    placeholder="e.g., 99.99"
                    required
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" className="bg-tinedy-blue">
                  {editingPackage ? 'Update Package' : 'Create Package'}
                </Button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <StatCard
          title="Total Packages"
          value={stats.total}
          icon={Package}
          iconColor="text-tinedy-blue"
        />

        <StatCard
          title="Active"
          value={stats.active}
          icon={CheckCircle}
          iconColor="text-green-500"
        />

        <StatCard
          title="Inactive"
          value={stats.inactive}
          icon={XCircle}
          iconColor="text-gray-400"
        />
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="py-3">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1">
              <Input
                placeholder="Search packages..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-8 text-xs"
              />
            </div>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-full sm:w-48 h-8 text-xs">
                <SelectValue placeholder="Filter by type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="cleaning">Cleaning</SelectItem>
                <SelectItem value="training">Training</SelectItem>
              </SelectContent>
            </Select>
            <Select value={pricingModelFilter} onValueChange={setPricingModelFilter}>
              <SelectTrigger className="w-full sm:w-48 h-8 text-xs">
                <SelectValue placeholder="Filter by pricing" />
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
      {filteredPackages.length === 0 && filteredPackagesV2.length === 0 ? (
        <Card>
          <CardContent className="py-12">
            <div className="text-center">
              <Package className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No packages found</p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* V2 Packages - Display using PackageCard component */}
            {filteredPackagesV2.slice(0, displayCount).map((pkg) => {
              // Convert UnifiedServicePackage to ServicePackageV2WithTiers
              const pkgV2: ServicePackageV2WithTiers = {
                id: pkg.id,
                name: pkg.name,
                description: pkg.description,
                service_type: pkg.service_type,
                category: pkg.category as ServiceCategory | null,
                pricing_model: pkg.pricing_model,
                duration_minutes: pkg.duration_minutes,
                base_price: Number(pkg.base_price || 0),
                is_active: pkg.is_active,
                created_at: pkg.created_at,
                updated_at: pkg.updated_at,
                tier_count: pkg.tier_count || 0,
                min_price: pkg.min_price,
                max_price: pkg.max_price,
                tiers: pkg.tiers || [],
              }
              return (
                <PackageCard
                  key={pkg.id}
                  package={pkgV2}
                  onEdit={handleEditV2}
                  onDelete={deletePackageV2}
                  onToggleActive={toggleActiveV2}
                  showActions={can('update', 'service_packages') || canDelete('service_packages')}
                />
              )
            })}

            {/* V1 Packages - Convert to V2 format for PackageCard */}
            {filteredPackages.slice(0, Math.max(0, displayCount - filteredPackagesV2.length)).map((pkg) => {
              // Convert V1 to V2 format for PackageCard
              const v1AsV2: ServicePackageV2WithTiers = {
                id: pkg.id,
                name: pkg.name,
                description: pkg.description,
                service_type: pkg.service_type,
                category: null,
                pricing_model: PricingModel.Fixed,
                duration_minutes: pkg.duration_minutes,
                base_price: Number(pkg.base_price || 0),
                is_active: pkg.is_active,
                created_at: pkg.created_at,
                updated_at: pkg.created_at, // V1 doesn't have updated_at, use created_at
                tier_count: pkg.tier_count || 0,
                min_price: pkg.min_price,
                max_price: pkg.max_price,
                tiers: pkg.tiers || [],
              }
              return (
                <PackageCard
                  key={pkg.id}
                  package={v1AsV2}
                  onEdit={handleUnifiedEdit}
                  onDelete={handleUnifiedDelete}
                  onToggleActive={handleUnifiedToggle}
                  showActions={can('update', 'service_packages') || canDelete('service_packages')}
                />
              )
            })}
          </div>

          {/* Load More Button */}
          {displayCount < (filteredPackages.length + filteredPackagesV2.length) && (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-6">
                <p className="text-sm text-muted-foreground mb-4">
                  Showing {Math.min(displayCount, filteredPackages.length + filteredPackagesV2.length)} of {filteredPackages.length + filteredPackagesV2.length} packages
                </p>
                <Button
                  variant="outline"
                  onClick={() => setDisplayCount(prev => prev + ITEMS_PER_LOAD)}
                  className="gap-2"
                >
                  <Plus className="h-4 w-4" />
                  Load More Packages
                </Button>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  )
}
