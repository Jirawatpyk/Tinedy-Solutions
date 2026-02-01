import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { queryKeys } from '@/lib/query-keys'
import { useToast } from '@/hooks/use-toast'
import { useAuth } from '@/contexts/auth-context'
import { mapErrorToUserMessage } from '@/lib/error-messages'
import { useBookingStatusManager } from '@/hooks/useBookingStatusManager'
import type { ServicePackageV2WithTiers, PackagePricingTier } from '@/types'
import { PricingModel } from '@/types'

// UI Components
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { PackageFormV2 } from '@/components/service-packages/PackageFormV2'

// Icons
import { ArrowLeft, XCircle } from 'lucide-react'

// Package Detail Sub-Components
import {
  PackageHeader,
  PackageInfoCard,
  PackageStatsCards,
  PackagePricingCard,
  PackageBookingsCard,
  type PackageStats,
  type BookingWithRelations,
} from '@/components/packages/detail'

export default function AdminPackageDetail() {
  const { packageId } = useParams<{ packageId: string }>()
  const navigate = useNavigate()
  const { toast } = useToast()
  const { user } = useAuth()
  const queryClient = useQueryClient()

  // Both admin and manager use /admin routes
  const basePath = '/admin'

  // Main data
  const [packageData, setPackageData] = useState<ServicePackageV2WithTiers | null>(null)
  const [packageSource, setPackageSource] = useState<'v1' | 'v2'>('v2')
  const [stats, setStats] = useState<PackageStats>({
    total_bookings: 0,
    completed_bookings: 0,
    pending_bookings: 0,
    cancelled_bookings: 0,
    total_revenue: 0,
    last_booking_date: null,
  })
  const [bookings, setBookings] = useState<BookingWithRelations[]>([])

  // UI state
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [toggling, setToggling] = useState(false)
  const [bookingsPage, setBookingsPage] = useState(1)
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const BOOKINGS_PER_PAGE = 10

  // Ref for cleanup on unmount
  const isMountedRef = useRef(true)

  // Use booking status manager for badge rendering
  const { getStatusBadge } = useBookingStatusManager({
    selectedBooking: null,
    setSelectedBooking: () => {},
    onSuccess: () => {},
  })

  // Reset to page 1 when status filter changes
  useEffect(() => {
    setBookingsPage(1)
  }, [statusFilter])

  useEffect(() => {
    isMountedRef.current = true

    if (packageId) {
      fetchPackageDetails()
    }

    return () => {
      isMountedRef.current = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [packageId])

  const fetchPackageDetails = async () => {
    if (!packageId) return

    try {
      setLoading(true)
      setError(null)

      // Fetch package data (try V2 first, then V1)
      // Use maybeSingle() to return null instead of error when not found
      const { data: v2Package, error: v2Error } = await supabase
        .from('service_packages_v2')
        .select(`
          *,
          tiers:package_pricing_tiers(*)
        `)
        .eq('id', packageId)
        .maybeSingle()

      if (v2Error) {
        throw v2Error
      }

      let pkgData: ServicePackageV2WithTiers | null = null

      if (v2Package) {
        // V2 package found
        const tiers = v2Package.tiers || []
        pkgData = {
          ...v2Package,
          tiers,
          tier_count: tiers.length,
          min_price: tiers.length > 0 ? Math.min(...tiers.map((t: PackagePricingTier) => t.price_1_time)) : v2Package.base_price,
          max_price: tiers.length > 0 ? Math.max(...tiers.map((t: PackagePricingTier) => t.price_1_time)) : v2Package.base_price,
        }
        setPackageSource('v2')
      } else {
        // Try V1 package
        const { data: v1Package, error: v1Error } = await supabase
          .from('service_packages')
          .select('*')
          .eq('id', packageId)
          .single()

        if (v1Error) {
          throw v1Error
        }

        // Convert V1 to V2 format
        pkgData = {
          id: v1Package.id,
          name: v1Package.name,
          description: v1Package.description,
          service_type: v1Package.service_type,
          category: null,
          pricing_model: PricingModel.Fixed,
          duration_minutes: v1Package.duration_minutes,
          base_price: Number(v1Package.price),
          is_active: v1Package.is_active,
          created_at: v1Package.created_at,
          updated_at: v1Package.created_at,
          tiers: [],
          tier_count: 0,
          min_price: Number(v1Package.price),
          max_price: Number(v1Package.price),
        }
        setPackageSource('v1')
      }

      // Only update state if component is still mounted
      if (!isMountedRef.current) return

      setPackageData(pkgData)

      // Fetch statistics and bookings
      await Promise.all([
        fetchPackageStats(packageId),
        fetchPackageBookings(packageId),
      ])
    } catch (err) {
      console.error('Error fetching package details:', err)
      if (!isMountedRef.current) return
      const errorMsg = mapErrorToUserMessage(err, 'general')
      setError(errorMsg.description)
    } finally {
      if (isMountedRef.current) {
        setLoading(false)
      }
    }
  }

  const fetchPackageStats = async (pkgId: string) => {
    try {
      // Get all bookings for this package (V1 or V2)
      const { data: bookingsData, error } = await supabase
        .from('bookings')
        .select('status, total_price, booking_date')
        .or(`service_package_id.eq.${pkgId},package_v2_id.eq.${pkgId}`)

      if (error) throw error

      if (!bookingsData) {
        return
      }

      // Calculate statistics
      const total = bookingsData.length
      const completed = bookingsData.filter(b => b.status === 'completed').length
      const pending = bookingsData.filter(b => b.status === 'pending').length
      const cancelled = bookingsData.filter(b => b.status === 'cancelled').length
      const revenue = bookingsData
        .filter(b => b.status === 'completed')
        .reduce((sum, b) => sum + Number(b.total_price), 0)

      // Find last booking date
      const dates = bookingsData.map(b => new Date(b.booking_date))
      const lastDate = dates.length > 0 ? new Date(Math.max(...dates.map(d => d.getTime()))) : null

      setStats({
        total_bookings: total,
        completed_bookings: completed,
        pending_bookings: pending,
        cancelled_bookings: cancelled,
        total_revenue: revenue,
        last_booking_date: lastDate ? lastDate.toISOString() : null,
      })
    } catch (err) {
      console.error('Error fetching package stats:', err)
      toast({
        title: 'Warning',
        description: 'Could not load package statistics',
        variant: 'destructive',
      })
    }
  }

  const fetchPackageBookings = async (pkgId: string) => {
    try {
      const { data, error } = await supabase
        .from('bookings')
        .select(`
          id,
          booking_date,
          start_time,
          end_time,
          status,
          total_price,
          customers (id, full_name, phone),
          profiles!bookings_staff_id_fkey (full_name),
          teams (name)
        `)
        .or(`service_package_id.eq.${pkgId},package_v2_id.eq.${pkgId}`)
        .order('created_at', { ascending: false })
        .limit(20)

      if (error) throw error

      setBookings((data as unknown as BookingWithRelations[]) || [])
    } catch (err) {
      console.error('Error fetching package bookings:', err)
      toast({
        title: 'Warning',
        description: 'Could not load bookings history',
        variant: 'destructive',
      })
    }
  }

  const handleToggleActive = async () => {
    if (!packageData || toggling) return

    try {
      setToggling(true)
      // Use correct table based on package source
      const tableName = packageSource === 'v1' ? 'service_packages' : 'service_packages_v2'
      const { error } = await supabase
        .from(tableName)
        .update({ is_active: !packageData.is_active })
        .eq('id', packageData.id)

      if (error) throw error

      setPackageData({
        ...packageData,
        is_active: !packageData.is_active,
      })

      // ลบ cache ของ packages ทั้งหมด (v1, v2, unified) เพื่อบังคับให้ refetch ใหม่เมื่อกลับไปหน้า list
      queryClient.removeQueries({
        predicate: (query) =>
          Array.isArray(query.queryKey) && query.queryKey[0] === 'packages',
      })

      toast({
        title: 'Success',
        description: `Package ${packageData.is_active ? 'deactivated' : 'activated'} successfully`,
      })
    } catch (err) {
      const errorMsg = mapErrorToUserMessage(err, 'general')
      toast({
        title: errorMsg.title,
        description: errorMsg.description,
        variant: 'destructive',
      })
    } finally {
      setToggling(false)
    }
  }

  const handleDelete = async () => {
    if (!packageData) return

    // Check if package has bookings (extra safety check)
    if (stats.total_bookings > 0) {
      toast({
        title: 'Cannot Delete',
        description: `This package has ${stats.total_bookings} booking(s). Cannot delete packages with existing bookings.`,
        variant: 'destructive',
      })
      return
    }

    try {
      // Delete tiers first if V2 tiered
      if (packageSource === 'v2' && packageData.pricing_model === PricingModel.Tiered && packageData.tiers && packageData.tiers.length > 0) {
        const { error: tiersError } = await supabase
          .from('package_pricing_tiers')
          .delete()
          .eq('package_id', packageData.id)

        if (tiersError) throw tiersError
      }

      // Delete package from correct table
      const tableName = packageSource === 'v1' ? 'service_packages' : 'service_packages_v2'
      const { error } = await supabase
        .from(tableName)
        .delete()
        .eq('id', packageData.id)

      if (error) throw error

      // ลบ cache ของ packages เพื่อบังคับให้ refetch ใหม่เมื่อกลับไปหน้า list
      queryClient.removeQueries({
        queryKey: queryKeys.packages.all,
      })

      toast({
        title: 'Success',
        description: 'Package deleted successfully',
      })

      // Navigate back to packages list
      navigate(`${basePath}/packages`)
    } catch (err) {
      const errorMsg = mapErrorToUserMessage(err, 'general')
      toast({
        title: errorMsg.title,
        description: errorMsg.description,
        variant: 'destructive',
      })
    }
  }

  const handleArchive = async () => {
    if (!packageData) return

    // Check if package has bookings (extra safety check)
    if (stats.total_bookings > 0) {
      toast({
        title: 'Cannot Archive',
        description: `This package has ${stats.total_bookings} booking(s). Cannot archive packages with existing bookings.`,
        variant: 'destructive',
      })
      return
    }

    try {
      // Soft delete - update deleted_at and deleted_by
      const tableName = packageSource === 'v1' ? 'service_packages' : 'service_packages_v2'
      const { error } = await supabase
        .from(tableName)
        .update({
          deleted_at: new Date().toISOString(),
          deleted_by: user?.id,
        })
        .eq('id', packageData.id)

      if (error) throw error

      // ลบ cache ของ packages เพื่อบังคับให้ refetch ใหม่เมื่อกลับไปหน้า list
      queryClient.removeQueries({
        queryKey: queryKeys.packages.all,
      })

      toast({
        title: 'Success',
        description: 'Package archived successfully',
      })

      // Navigate back to packages list
      navigate(`${basePath}/packages`)
    } catch (err) {
      const errorMsg = mapErrorToUserMessage(err, 'general')
      toast({
        title: errorMsg.title,
        description: errorMsg.description,
        variant: 'destructive',
      })
    }
  }

  // Loading state
  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-6 sm:h-8 w-36 sm:w-48 mb-4 sm:mb-6" />
        <Skeleton className="h-48 sm:h-64 w-full mb-4 sm:mb-6" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-4 sm:mb-6">
          <Skeleton className="h-28 sm:h-32" />
          <Skeleton className="h-28 sm:h-32" />
          <Skeleton className="h-28 sm:h-32" />
          <Skeleton className="h-28 sm:h-32" />
        </div>
        <Skeleton className="h-96 w-full" />
      </div>
    )
  }

  // Error state
  if (error || !packageData) {
    return (
      <div className="space-y-6">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <XCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
              <h2 className="text-xl font-semibold mb-2">Error Loading Package</h2>
              <p className="text-muted-foreground mb-4">{error || 'Package not found'}</p>
              <Button onClick={() => navigate(`${basePath}/packages`)}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Packages
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <PackageHeader
        packageData={packageData}
        packageSource={packageSource}
        stats={{ total_bookings: stats.total_bookings }}
        toggling={toggling}
        onBack={() => navigate(-1)}
        onToggleActive={handleToggleActive}
        onEdit={() => setIsEditDialogOpen(true)}
        onDelete={handleDelete}
        onArchive={handleArchive}
      />

      {/* Main Content */}
      <div className="space-y-6">
        {/* Package Information Card */}
        <PackageInfoCard packageData={packageData} />

        {/* Statistics Cards */}
        <PackageStatsCards stats={stats} />

        {/* Pricing Information */}
        <PackagePricingCard packageData={packageData} />

        {/* Recent Bookings */}
        <PackageBookingsCard
          bookings={bookings}
          statusFilter={statusFilter}
          onStatusFilterChange={setStatusFilter}
          bookingsPage={bookingsPage}
          onPageChange={setBookingsPage}
          getStatusBadge={getStatusBadge}
          BOOKINGS_PER_PAGE={BOOKINGS_PER_PAGE}
        />
      </div>

      {/* Edit Package Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-[95vw] sm:max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Package</DialogTitle>
            <DialogDescription>
              Update package information and pricing tiers
            </DialogDescription>
          </DialogHeader>
          <PackageFormV2
            package={packageData}
            packageSource={packageSource}
            onSuccess={() => {
              setIsEditDialogOpen(false)
              fetchPackageDetails() // Refresh package data
            }}
            onCancel={() => setIsEditDialogOpen(false)}
            showCancel={true}
          />
        </DialogContent>
      </Dialog>
    </div>
  )
}
