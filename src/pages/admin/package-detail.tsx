import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { queryKeys } from '@/lib/query-keys'
import { useToast } from '@/hooks/use-toast'
import { useAuth } from '@/contexts/auth-context'
import { mapErrorToUserMessage } from '@/lib/error-messages'
import { PermissionGuard } from '@/components/auth/permission-guard'
import { PermissionAwareDeleteButton } from '@/components/common/PermissionAwareDeleteButton'
import { formatCurrency, formatDate } from '@/lib/utils'
import { formatTime, getAllStatusOptions } from '@/lib/booking-utils'
import { useBookingStatusManager } from '@/hooks/useBookingStatusManager'
import type { ServicePackageV2WithTiers, PackagePricingTier } from '@/types'
import { PricingModel } from '@/types'

// UI Components
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { PackageFormV2 } from '@/components/service-packages/PackageFormV2'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

// Icons
import {
  ArrowLeft,
  Edit,
  Package as PackageIcon,
  DollarSign,
  Clock,
  CheckCircle,
  XCircle,
  Calendar,
  BarChart3,
  FileText,
} from 'lucide-react'
import { SimpleTooltip } from '@/components/ui/simple-tooltip'

interface PackageStats {
  total_bookings: number
  completed_bookings: number
  pending_bookings: number
  cancelled_bookings: number
  total_revenue: number
  last_booking_date: string | null
}

interface BookingWithRelations {
  id: string
  booking_date: string
  start_time: string
  end_time: string
  status: string
  total_price: number
  payment_status?: string
  customers: {
    id: string
    full_name: string
    phone: string
  } | null
  profiles: {
    full_name: string
  } | null
  teams: {
    name: string
  } | null
}

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

  // Filter bookings by booking status
  const filteredBookings = bookings.filter(b => {
    return statusFilter === 'all' || b.status === statusFilter
  })

  const paginatedBookings = filteredBookings.slice(
    (bookingsPage - 1) * BOOKINGS_PER_PAGE,
    bookingsPage * BOOKINGS_PER_PAGE
  )
  const totalPages = Math.ceil(filteredBookings.length / BOOKINGS_PER_PAGE)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3 sm:gap-4 w-full sm:w-auto">
          <SimpleTooltip content="Back">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate(-1)}
              className="h-8 w-8 sm:h-10 sm:w-10"
              aria-label="Go back to packages list"
            >
              <ArrowLeft className="h-4 w-4 sm:h-5 sm:w-5" />
            </Button>
          </SimpleTooltip>
          <div className="min-w-0">
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-display font-bold text-tinedy-dark truncate">
              {packageData.name}
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground truncate">Package Details</p>
          </div>
        </div>

        {/* Action Buttons - Based on permissions.ts */}
        <PermissionGuard requires={{ mode: 'action', action: 'update', resource: 'service_packages' }}>
          <div className="flex gap-1 sm:gap-2 w-full sm:w-auto justify-end">
            {/* Toggle Active - Mobile: icon with tooltip, Desktop: full button */}
            <SimpleTooltip content={packageData.is_active ? 'Deactivate' : 'Activate'}>
              <Button
                variant="outline"
                size="icon"
                onClick={handleToggleActive}
                disabled={toggling}
                className="h-8 w-8 sm:hidden"
              >
                {packageData.is_active ? (
                  <XCircle className="h-3.5 w-3.5" />
                ) : (
                  <CheckCircle className="h-3.5 w-3.5" />
                )}
              </Button>
            </SimpleTooltip>
            <Button
              variant="outline"
              size="sm"
              onClick={handleToggleActive}
              disabled={toggling}
              className="hidden sm:flex h-9"
            >
              {packageData.is_active ? (
                <>
                  <XCircle className="h-4 w-4 mr-2" />
                  Deactivate
                </>
              ) : (
                <>
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Activate
                </>
              )}
            </Button>

            {/* Edit - Mobile: icon with tooltip, Desktop: full button */}
            <SimpleTooltip content="Edit">
              <Button
                variant="outline"
                size="icon"
                onClick={() => setIsEditDialogOpen(true)}
                className="h-8 w-8 sm:hidden"
              >
                <Edit className="h-3.5 w-3.5" />
              </Button>
            </SimpleTooltip>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsEditDialogOpen(true)}
              className="hidden sm:flex h-9"
            >
              <Edit className="h-4 w-4 mr-2" />
              Edit
            </Button>

            {/* Archive/Delete - responsive: icon on mobile, full button on desktop */}
            <PermissionAwareDeleteButton
              resource="service_packages"
              itemName={packageData.name}
              onDelete={handleDelete}
              onCancel={handleArchive}
              cancelText="Archive"
              buttonVariant="outline"
              responsive
              disabled={stats.total_bookings > 0}
              disabledReason={stats.total_bookings > 0 ? `Cannot delete/archive: Package has ${stats.total_bookings} booking(s)` : undefined}
            />
          </div>
        </PermissionGuard>
      </div>

      {/* Main Content */}
      <div className="space-y-6">
        {/* Package Information Card */}
        <Card>
          <CardHeader className="p-4 sm:p-6">
            <div className="flex flex-col lg:flex-row items-start justify-between gap-4 lg:gap-0">
              <div className="space-y-1 sm:space-y-2">
                <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                  <PackageIcon className="h-4 w-4 sm:h-5 sm:w-5" />
                  Package Information
                </CardTitle>
                <CardDescription className="text-xs sm:text-sm">
                  Detailed information about this service package
                </CardDescription>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Badge className="capitalize text-xs sm:text-sm">{packageData.service_type}</Badge>
                <Badge className={`text-xs sm:text-sm ${packageData.pricing_model === PricingModel.Fixed ? 'bg-blue-100 text-blue-800' : 'bg-purple-100 text-purple-800'}`}>
                  {packageData.pricing_model === PricingModel.Fixed ? 'Fixed Price' : 'Tiered Price'}
                </Badge>
                {packageData.category && (
                  <Badge variant="outline" className="capitalize text-xs sm:text-sm">{packageData.category}</Badge>
                )}
                <Badge className={`text-xs sm:text-sm ${packageData.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                  {packageData.is_active ? 'Active' : 'Inactive'}
                </Badge>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-3 sm:space-y-4 p-4 sm:p-6 pt-0">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
              <div>
                <label className="text-xs sm:text-sm font-medium text-muted-foreground">Description</label>
                <p className="mt-1 text-xs sm:text-sm">{packageData.description || 'No description provided'}</p>
              </div>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs sm:text-sm font-medium text-muted-foreground">Created:</span>
                  <span className="text-xs sm:text-sm">{formatDate(packageData.created_at)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs sm:text-sm font-medium text-muted-foreground">Last Updated:</span>
                  <span className="text-xs sm:text-sm">{formatDate(packageData.updated_at)}</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground">
                Total Bookings
              </CardTitle>
              <BarChart3 className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-blue-500" />
            </CardHeader>
            <CardContent>
              <div className="text-xl sm:text-2xl font-bold">{stats.total_bookings}</div>
              <p className="text-[10px] sm:text-xs text-muted-foreground mt-1">
                All-time bookings
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground">
                Completed
              </CardTitle>
              <CheckCircle className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-xl sm:text-2xl font-bold text-green-600">{stats.completed_bookings}</div>
              <p className="text-[10px] sm:text-xs text-muted-foreground mt-1">
                Successfully completed
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground">
                Total Revenue
              </CardTitle>
              <DollarSign className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-tinedy-yellow" />
            </CardHeader>
            <CardContent>
              <div className="text-xl sm:text-2xl font-bold text-tinedy-dark">
                {formatCurrency(stats.total_revenue)}
              </div>
              <p className="text-[10px] sm:text-xs text-muted-foreground mt-1">
                From completed bookings
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground">
                Last Booking
              </CardTitle>
              <Calendar className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-purple-500" />
            </CardHeader>
            <CardContent>
              <div className="text-base sm:text-lg font-bold">
                {stats.last_booking_date ? formatDate(stats.last_booking_date) : 'N/A'}
              </div>
              <p className="text-[10px] sm:text-xs text-muted-foreground mt-1">
                Most recent booking
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Pricing Information */}
        <Card>
          <CardHeader className="p-4 sm:p-6">
            <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
              <DollarSign className="h-4 w-4 sm:h-5 sm:w-5" />
              Pricing Information
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 sm:p-6 pt-0">
            {packageData.pricing_model === PricingModel.Fixed ? (
              /* Fixed Pricing */
              <div className="space-y-3 sm:space-y-4">
                <div className="flex items-center justify-between py-2 sm:py-3 border-b">
                  <span className="text-xs sm:text-sm font-medium">Base Price:</span>
                  <span className="text-base sm:text-lg font-bold text-tinedy-dark">
                    {formatCurrency(packageData.base_price || 0)}
                  </span>
                </div>
                {packageData.duration_minutes && (
                  <div className="flex items-center justify-between py-2 sm:py-3 border-b">
                    <span className="text-xs sm:text-sm font-medium flex items-center gap-2">
                      <Clock className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                      Duration:
                    </span>
                    <span className="text-base sm:text-lg font-semibold">
                      {packageData.duration_minutes} minutes
                    </span>
                  </div>
                )}
              </div>
            ) : (
              /* Tiered Pricing */
              <div className="space-y-3 sm:space-y-4">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-0 mb-4">
                  <div>
                    <p className="text-xs sm:text-sm font-medium">Price Range</p>
                    <p className="text-xl sm:text-2xl font-bold text-tinedy-dark">
                      {formatCurrency(packageData.min_price || 0)} - {formatCurrency(packageData.max_price || 0)}
                    </p>
                  </div>
                  <div className="text-left sm:text-right">
                    <p className="text-xs sm:text-sm font-medium text-muted-foreground">Total Tiers</p>
                    <p className="text-lg sm:text-xl font-bold">{packageData.tier_count}</p>
                  </div>
                </div>

                {/* Tiers - Mobile Card View */}
                {packageData.tiers && packageData.tiers.length > 0 && (
                  <>
                    {/* Mobile: Card View */}
                    <div className="sm:hidden space-y-3">
                      {packageData.tiers.map((tier) => (
                        <div key={tier.id} className="border rounded-lg p-3 bg-gray-50/50">
                          <div className="mb-2">
                            <span className="font-semibold text-sm">{tier.area_min} - {tier.area_max} sqm</span>
                          </div>
                          <div className="grid grid-cols-2 gap-2 text-xs">
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">1 Time:</span>
                              <span className="font-medium">{formatCurrency(tier.price_1_time)}</span>
                            </div>
                            {tier.price_2_times && (
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">2 Times:</span>
                                <span className="font-medium">{formatCurrency(tier.price_2_times)}</span>
                              </div>
                            )}
                            {tier.price_4_times && (
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">4 Times:</span>
                                <span className="font-medium">{formatCurrency(tier.price_4_times)}</span>
                              </div>
                            )}
                            {tier.price_8_times && (
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">8 Times:</span>
                                <span className="font-medium">{formatCurrency(tier.price_8_times)}</span>
                              </div>
                            )}
                          </div>
                          {tier.estimated_hours && (
                            <div className="flex items-center gap-1 mt-2 pt-2 border-t text-xs text-muted-foreground">
                              <Clock className="h-3 w-3" />
                              Est. {tier.estimated_hours}h
                            </div>
                          )}
                        </div>
                      ))}
                    </div>

                    {/* Desktop: Table View */}
                    <div className="hidden sm:block overflow-x-auto">
                      <div className="border rounded-lg overflow-hidden">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead className="text-xs sm:text-sm whitespace-nowrap">Area Range (sqm)</TableHead>
                              <TableHead className="text-right text-xs sm:text-sm whitespace-nowrap">1 Time</TableHead>
                              <TableHead className="text-right text-xs sm:text-sm whitespace-nowrap">2 Times</TableHead>
                              <TableHead className="text-right text-xs sm:text-sm whitespace-nowrap">4 Times</TableHead>
                              <TableHead className="text-right text-xs sm:text-sm whitespace-nowrap">8 Times</TableHead>
                              <TableHead className="text-right text-xs sm:text-sm whitespace-nowrap">Est. Hours</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {packageData.tiers.map((tier) => (
                              <TableRow key={tier.id}>
                                <TableCell className="font-medium text-xs sm:text-sm whitespace-nowrap">
                                  {tier.area_min} - {tier.area_max}
                                </TableCell>
                                <TableCell className="text-right font-medium text-xs sm:text-sm whitespace-nowrap">
                                  {formatCurrency(tier.price_1_time)}
                                </TableCell>
                                <TableCell className="text-right text-xs sm:text-sm whitespace-nowrap">
                                  {tier.price_2_times ? formatCurrency(tier.price_2_times) : '-'}
                                </TableCell>
                                <TableCell className="text-right text-xs sm:text-sm whitespace-nowrap">
                                  {tier.price_4_times ? formatCurrency(tier.price_4_times) : '-'}
                                </TableCell>
                                <TableCell className="text-right text-xs sm:text-sm whitespace-nowrap">
                                  {tier.price_8_times ? formatCurrency(tier.price_8_times) : '-'}
                                </TableCell>
                                <TableCell className="text-right text-muted-foreground text-xs sm:text-sm whitespace-nowrap">
                                  {tier.estimated_hours ? `${tier.estimated_hours}h` : '-'}
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    </div>
                  </>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Bookings */}
        <Card>
          <CardHeader className="p-4 sm:p-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div>
                <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                  <FileText className="h-4 w-4 sm:h-5 sm:w-5" />
                  Recent Bookings
                </CardTitle>
                <CardDescription className="mt-1 text-xs sm:text-sm">
                  Recent bookings using this package
                </CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="h-8 w-[140px] text-xs">
                    <SelectValue placeholder="Booking" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Booking</SelectItem>
                    {getAllStatusOptions().map(([value, label]) => (
                      <SelectItem key={value} value={value}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Badge variant="outline" className="text-xs sm:text-sm">{filteredBookings.length} total</Badge>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-4 sm:p-6 pt-0">
            {bookings.length === 0 ? (
              <div className="text-center py-8 sm:py-12">
                <FileText className="h-10 w-10 sm:h-12 sm:w-12 text-muted-foreground mx-auto mb-3 sm:mb-4" />
                <p className="text-sm sm:text-base text-muted-foreground">No bookings found for this package</p>
              </div>
            ) : (
              <>
                {/* Mobile: Card View */}
                <div className="sm:hidden space-y-3">
                  {paginatedBookings.map((booking) => (
                    <div key={booking.id} className="border rounded-lg p-3 bg-gray-50/50">
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div className="min-w-0">
                          <p className="font-semibold text-sm truncate">{booking.customers?.full_name || 'N/A'}</p>
                          <p className="text-xs text-muted-foreground">{booking.customers?.phone || ''}</p>
                        </div>
                        {getStatusBadge(booking.status)}
                      </div>
                      <div className="space-y-1.5 text-xs">
                        <div className="flex items-center justify-between">
                          <span className="text-muted-foreground">Date:</span>
                          <span className="font-medium">{formatDate(booking.booking_date)}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-muted-foreground">Time:</span>
                          <span>{formatTime(booking.start_time)} - {formatTime(booking.end_time)}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-muted-foreground">Assigned:</span>
                          <span>{booking.teams?.name || booking.profiles?.full_name || 'Unassigned'}</span>
                        </div>
                      </div>
                      <div className="flex items-center justify-end mt-2 pt-2 border-t">
                        <span className="font-semibold text-sm">{formatCurrency(booking.total_price)}</span>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Desktop: Table View */}
                <div className="hidden sm:block overflow-x-auto">
                  <div className="border rounded-lg overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="text-xs sm:text-sm whitespace-nowrap">Customer</TableHead>
                          <TableHead className="text-xs sm:text-sm whitespace-nowrap">Date & Time</TableHead>
                          <TableHead className="text-xs sm:text-sm whitespace-nowrap">Assigned To</TableHead>
                          <TableHead className="text-xs sm:text-sm whitespace-nowrap">Amount</TableHead>
                          <TableHead className="text-xs sm:text-sm whitespace-nowrap">Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {paginatedBookings.map((booking) => (
                          <TableRow key={booking.id}>
                            <TableCell className="whitespace-nowrap">
                              <div>
                                <p className="font-medium text-xs sm:text-sm">{booking.customers?.full_name || 'N/A'}</p>
                                <p className="text-[10px] sm:text-xs text-muted-foreground">{booking.customers?.phone || ''}</p>
                              </div>
                            </TableCell>
                            <TableCell className="whitespace-nowrap">
                              <div>
                                <p className="font-medium text-xs sm:text-sm">{formatDate(booking.booking_date)}</p>
                                <p className="text-[10px] sm:text-xs text-muted-foreground">
                                  {formatTime(booking.start_time)} - {formatTime(booking.end_time)}
                                </p>
                              </div>
                            </TableCell>
                            <TableCell className="text-xs sm:text-sm whitespace-nowrap">
                              {booking.teams?.name || booking.profiles?.full_name || 'Unassigned'}
                            </TableCell>
                            <TableCell className="font-medium text-xs sm:text-sm whitespace-nowrap">
                              {formatCurrency(booking.total_price)}
                            </TableCell>
                            <TableCell className="whitespace-nowrap">{getStatusBadge(booking.status)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-3 sm:gap-0 mt-4">
                    <p className="text-xs sm:text-sm text-muted-foreground">
                      Showing {(bookingsPage - 1) * BOOKINGS_PER_PAGE + 1} to{' '}
                      {Math.min(bookingsPage * BOOKINGS_PER_PAGE, filteredBookings.length)} of {filteredBookings.length}
                    </p>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setBookingsPage(p => Math.max(1, p - 1))}
                        disabled={bookingsPage === 1}
                        className="h-8 sm:h-9"
                      >
                        <span className="text-xs sm:text-sm">Previous</span>
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setBookingsPage(p => Math.min(totalPages, p + 1))}
                        disabled={bookingsPage === totalPages}
                        className="h-8 sm:h-9"
                      >
                        <span className="text-xs sm:text-sm">Next</span>
                      </Button>
                    </div>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
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
