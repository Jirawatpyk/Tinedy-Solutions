import { useEffect, useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/auth-context'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { Skeleton } from '@/components/ui/skeleton'
import { StatCard } from '@/components/common/StatCard/StatCard'
import { PermissionGuard } from '@/components/auth/permission-guard'
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
import { Package, Plus, CheckCircle, XCircle, Search } from 'lucide-react'
import type { ServicePackage, ServicePackageV2WithTiers } from '@/types'
import { PackageCard, PackageFormV2 } from '@/components/service-packages'
import { PricingModel, ServiceCategory } from '@/types'
import { packageQueryOptions } from '@/lib/queries/package-queries'

export function AdminServicePackages() {
  // Permission checks
  const { can, canDelete } = usePermissions()
  const { user } = useAuth()

  // Show archived state
  const [showArchived, setShowArchived] = useState(false)

  // React Query - Fetch ALL packages (V1 + V2 unified) including inactive for admin management
  const {
    data: unifiedPackages = [],
    isLoading: loading,
    error: queryError,
    refetch,
  } = useQuery({
    ...packageQueryOptions.allForAdmin,
    refetchOnMount: 'always' // Always refetch when navigating back to this page
  })

  // Fetch archived packages (Admin only)
  const {
    data: archivedPackages = [],
    refetch: refetchArchived,
  } = useQuery({
    ...packageQueryOptions.v2WithArchived,
    enabled: showArchived, // Only fetch when checkbox is checked
  })

  const error = queryError?.message || null
  const refresh = async () => {
    await refetch()
    // Also refetch booking counts
    refetchBookingCounts()
    if (showArchived) {
      refetchArchived()
    }
  }

  // Query to get booking counts per package (both V1 and V2)
  const { data: bookingCounts = {}, refetch: refetchBookingCounts } = useQuery({
    queryKey: ['package-booking-counts'],
    queryFn: async () => {
      // Fetch bookings with both V1 (service_package_id) and V2 (package_v2_id) package references
      const { data, error } = await supabase
        .from('bookings')
        .select('service_package_id, package_v2_id')
        .is('deleted_at', null) // Exclude soft-deleted bookings

      if (error) throw error

      // Count bookings per package
      const counts: Record<string, number> = {}
      data.forEach(booking => {
        // Count V1 packages (service_package_id)
        if (booking.service_package_id) {
          counts[booking.service_package_id] = (counts[booking.service_package_id] || 0) + 1
        }
        // Count V2 packages (package_v2_id)
        if (booking.package_v2_id) {
          counts[booking.package_v2_id] = (counts[booking.package_v2_id] || 0) + 1
        }
      })
      return counts
    },
    staleTime: 30000, // Cache for 30 seconds
  })

  // Separate V1 and V2 packages (keep as UnifiedServicePackage for type safety)
  // When showArchived is true, use archivedPackages for V2 (includes both Fixed and Tiered from V2 table)
  const packagesV1Unified = useMemo(() => {
    // V1 packages (from service_packages table) - always use unifiedPackages
    // Note: V1 table doesn't support soft delete, so no archived filtering needed
    return unifiedPackages.filter(pkg => pkg._source === 'v1')
  }, [unifiedPackages])

  const packagesV2Unified = useMemo(() => {
    if (showArchived && archivedPackages.length > 0) {
      // Use archived packages (includes deleted) - add _source field
      // Include ALL pricing models (both Fixed and Tiered) from V2 table
      return archivedPackages.map(pkg => ({ ...pkg, _source: 'v2' as const }))
    }
    // Normal view: only non-archived V2 packages
    return unifiedPackages.filter(pkg => pkg._source === 'v2')
  }, [unifiedPackages, archivedPackages, showArchived])

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

  // Filter and merge all packages into single array (moved to useMemo)
  const allFilteredPackages = useMemo(() => {
    // Combine V1 and V2 packages
    let allPackages = [...packagesV1Unified, ...packagesV2Unified]

    // Search filter
    if (searchQuery) {
      allPackages = allPackages.filter((pkg) =>
        pkg.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        pkg.description?.toLowerCase().includes(searchQuery.toLowerCase())
      )
    }

    // Type filter
    if (typeFilter !== 'all') {
      allPackages = allPackages.filter((pkg) => pkg.service_type === typeFilter)
    }

    // Pricing model filter
    if (pricingModelFilter === 'fixed') {
      allPackages = allPackages.filter((pkg) => pkg.pricing_model === PricingModel.Fixed)
    } else if (pricingModelFilter === 'tiered') {
      allPackages = allPackages.filter((pkg) => pkg.pricing_model === PricingModel.Tiered)
    }

    // Sort: Tiered first, then Fixed (for better UX)
    allPackages.sort((a, b) => {
      if (a.pricing_model === PricingModel.Tiered && b.pricing_model === PricingModel.Fixed) return -1
      if (a.pricing_model === PricingModel.Fixed && b.pricing_model === PricingModel.Tiered) return 1
      return a.name.localeCompare(b.name)
    })

    return allPackages
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
      // Check if package has bookings first (prevent deleting tiers if can't delete package)
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

      // Delete tiers first (ignore error - Fixed pricing packages don't have tiers)
      await supabase
        .from('package_pricing_tiers')
        .delete()
        .eq('package_id', id)

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
   * Handle Archive Package (Manager - soft delete)
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

      toast({
        title: 'Success',
        description: 'Package archived successfully',
      })

      refresh()
      if (showArchived) {
        refetchArchived()
      }
    } catch (error) {
      console.error('Archive package error:', error)
      toast({
        title: 'Error',
        description: 'Failed to archive package',
        variant: 'destructive',
      })
    }
  }

  /**
   * Handle Restore Package (Admin only - restore archived package)
   */
  const handleRestorePackage = async (pkg: ServicePackageV2WithTiers) => {
    try {
      const { error } = await supabase
        .from('service_packages_v2')
        .update({ deleted_at: null, deleted_by: null })
        .eq('id', pkg.id)

      if (error) throw error

      toast({
        title: 'Success',
        description: 'Package restored successfully',
      })

      refresh()
      if (showArchived) {
        refetchArchived()
      }
    } catch (error) {
      console.error('Restore package error:', error)
      toast({
        title: 'Error',
        description: 'Failed to restore package',
        variant: 'destructive',
      })
    }
  }

  /**
   * Handle Edit V1 Package
   */
  const handleEditV1 = (pkg: ServicePackageV2WithTiers) => {
    // Convert V2 format back to V1 for editing
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
    setEditingPackageV2(null) // Clear V2 editing
    setFormData({
      name: v1Pkg.name,
      description: v1Pkg.description || '',
      service_type: v1Pkg.service_type,
      duration_minutes: v1Pkg.duration_minutes?.toString() || '',
      price: v1Pkg.price?.toString() || '',
    })
    setIsDialogOpen(true)
  }

  /**
   * Unified handlers for PackageCard (handles both V1 and V2)
   */
  const handleUnifiedEdit = (pkg: ServicePackageV2WithTiers & { _source?: 'v1' | 'v2' }) => {
    // ใช้ _source เพื่อตัดสินใจว่าจะ edit ด้วย form ไหน
    if (pkg._source === 'v2') {
      handleEditV2(pkg)
    } else {
      // V1 package - use V1 form
      handleEditV1(pkg)
    }
  }

  const handleUnifiedDelete = async (id: string, source?: 'v1' | 'v2') => {
    // ใช้ _source เพื่อตัดสินใจว่าจะ delete จาก table ไหน
    if (source === 'v2') {
      await deletePackageV2(id)
    } else if (source === 'v1') {
      await deletePackage(id)
    } else {
      // Fallback: query database เพื่อตรวจสอบ (กรณี _source ไม่ถูกส่งมา)
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
  }

  const handleUnifiedToggle = (pkg: ServicePackageV2WithTiers & { _source?: 'v1' | 'v2' }) => {
    // ใช้ _source เพื่อตัดสินใจว่าจะ update table ไหน
    // Fixed pricing packages อาจมาจากทั้ง V1 และ V2 tables
    if (pkg._source === 'v2') {
      toggleActiveV2(pkg)
    } else {
      // V1 package - update service_packages table
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
          <p className="text-xs sm:text-sm text-muted-foreground">
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
        <p className="text-xs sm:text-sm text-muted-foreground">
          Manage cleaning and training service packages
        </p>
        <div className="flex items-center gap-4">
          {/* Show Archived - Admin only */}
          <PermissionGuard requires={{ mode: 'role', roles: ['admin'] }}>
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
          </PermissionGuard>
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
            {/* Search */}
            <div className="relative sm:flex-1">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                placeholder="Search packages..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-8 text-xs pl-8"
              />
            </div>
            {/* Type and Pricing filters - side by side on mobile, inline on desktop */}
            <div className="grid grid-cols-2 sm:flex gap-2 sm:gap-3">
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="w-full sm:w-36 h-8 text-xs">
                  <SelectValue placeholder="Filter by type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="cleaning">Cleaning</SelectItem>
                  <SelectItem value="training">Training</SelectItem>
                </SelectContent>
              </Select>
              <Select value={pricingModelFilter} onValueChange={setPricingModelFilter}>
                <SelectTrigger className="w-full sm:w-36 h-8 text-xs">
                  <SelectValue placeholder="Filter by pricing" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Pricing</SelectItem>
                  <SelectItem value="fixed">Fixed Price</SelectItem>
                  <SelectItem value="tiered">Tiered Price</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Packages Grid */}
      {allFilteredPackages.length === 0 ? (
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
            {/* All Packages - Single loop for both V1 and V2 */}
            {allFilteredPackages.slice(0, displayCount).map((pkg) => {
              // Check if package is archived (has deleted_at)
              const isArchived = !!(pkg as { deleted_at?: string | null }).deleted_at
              const isTiered = pkg.pricing_model === PricingModel.Tiered
              const isV2Source = pkg._source === 'v2'

              // Convert UnifiedServicePackage to ServicePackageV2WithTiers
              const pkgForCard: ServicePackageV2WithTiers = {
                id: pkg.id,
                name: pkg.name,
                description: pkg.description,
                service_type: pkg.service_type,
                category: (pkg.category as ServiceCategory | null) ?? null,
                pricing_model: pkg.pricing_model,
                duration_minutes: pkg.duration_minutes,
                base_price: Number(pkg.base_price || 0),
                is_active: pkg.is_active,
                created_at: pkg.created_at,
                updated_at: pkg.updated_at || pkg.created_at,
                tier_count: pkg.tier_count || 0,
                min_price: pkg.min_price,
                max_price: pkg.max_price,
                tiers: pkg.tiers || [],
              }

              // Create toggle handler with captured _source
              const handleToggle = isTiered
                ? toggleActiveV2
                : (p: ServicePackageV2WithTiers) => handleUnifiedToggle({ ...p, _source: pkg._source })

              return (
                <PackageCard
                  key={pkg.id}
                  package={pkgForCard}
                  onEdit={isTiered ? handleEditV2 : handleUnifiedEdit}
                  onArchive={isV2Source ? handleArchivePackage : undefined}
                  onRestore={isV2Source ? handleRestorePackage : undefined}
                  onDelete={isTiered ? deletePackageV2 : (id) => handleUnifiedDelete(id, pkg._source)}
                  onToggleActive={handleToggle}
                  showActions={can('update', 'service_packages') || canDelete('service_packages')}
                  bookingCount={bookingCounts[pkg.id] || 0}
                  isArchived={isArchived}
                />
              )
            })}
          </div>

          {/* Load More Button */}
          {displayCount < allFilteredPackages.length && (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-6">
                <p className="text-sm text-muted-foreground mb-4">
                  Showing {Math.min(displayCount, allFilteredPackages.length)} of {allFilteredPackages.length} packages
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
